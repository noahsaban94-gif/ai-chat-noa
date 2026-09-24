import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * שרשרת מודלי גיבוי מוגדרת לפי דרישות הארכיטקטורה:
 * gemini-1.5-pro -> gemini-1.5-flash -> gemini-1.5-flash-8b
 * בתוספת מודלי Flash פעילים לגיבוי עמיד
 */
const DEFAULT_FALLBACK_MODELS = [
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
];

// מטמון למופעי לקוח SDK כדי למנוע אתחולים חוזרים מיותרים במופעי Serverless
const clientCache = new Map<string, GoogleGenAI>();

function getGenAIClient(apiKey: string): GoogleGenAI {
  let client = clientCache.get(apiKey);
  if (!client) {
    client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    clientCache.set(apiKey, client);
  }
  return client;
}

/**
 * חילוץ וטיהור מפתחות ה-API ממשתנה הסביבה GEMINI_API_KEYS (עם תמיכה ב-GEMINI_API_KEY כגיבוי)
 * - חלוקה לפי פסיקים (Comma-separated)
 * - ניקוי רווחים וסינון ערכים ריקים
 * - הסרת כפילויות
 */
function getApiKeys(): string[] {
  const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  const parsedKeys = rawKeys
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  return Array.from(new Set(parsedKeys));
}

interface GenerateRequestBody {
  prompt?: string;
  model?: string;
  systemInstruction?: string;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
    [key: string]: unknown;
  };
}

/**
 * POST /api/gemini
 * Endpoint מנוהל לביצוע קריאות ל-Google Gemini API תוך רוטציה חכמה בין מפתחות ומודלים
 */
export async function POST(req: NextRequest) {
  try {
    // 1. מקור הנתונים ובדיקת תקינות מפתחות הסביבה
    const apiKeys = getApiKeys();
    if (apiKeys.length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid Gemini API keys configured in GEMINI_API_KEYS environment variable.",
        },
        { status: 500 }
      );
    }

    // 2. פירסור ואימות קלט הבקשה
    let body: GenerateRequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload in request body." },
        { status: 400 }
      );
    }

    const { prompt, model: requestedModel, systemInstruction, generationConfig } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Field 'prompt' is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    // 3. בניית שרשרת מודלים (המודל המבוקש ראשון, ואחריו שרשרת הגיבוי ללא כפילויות)
    const primaryModel =
      requestedModel && typeof requestedModel === "string" && requestedModel.trim()
        ? requestedModel.trim()
        : "gemini-1.5-flash";

    const modelsToTry = [
      primaryModel,
      ...DEFAULT_FALLBACK_MODELS.filter((m) => m !== primaryModel),
    ];

    // 4. בניית קונפיגורציית הבקשה ל-Gemini API
    const config: Record<string, unknown> = {};
    if (
      systemInstruction &&
      typeof systemInstruction === "string" &&
      systemInstruction.trim()
    ) {
      config.systemInstruction = systemInstruction.trim();
    }

    if (generationConfig && typeof generationConfig === "object") {
      if (typeof generationConfig.temperature === "number") {
        config.temperature = generationConfig.temperature;
      }
      if (typeof generationConfig.maxOutputTokens === "number") {
        config.maxOutputTokens = generationConfig.maxOutputTokens;
      }
      if (typeof generationConfig.topP === "number") {
        config.topP = generationConfig.topP;
      }
      if (typeof generationConfig.topK === "number") {
        config.topK = generationConfig.topK;
      }
      if (Array.isArray(generationConfig.stopSequences)) {
        config.stopSequences = generationConfig.stopSequences;
      }
    }

    // 5. אלגוריתם רוטציה חכמה דו-שלבי (Smart Failover):
    // שכבה א' - נקודת פתיחה אקראית לחלוקת עומס בין Serverless instances
    const randomStartKeyIndex = Math.floor(Math.random() * apiKeys.length);

    let totalAttempts = 0;
    const errorLog: Array<{
      attempt: number;
      model: string;
      keyIndex: number;
      error: string;
    }> = [];

    // שכבה ב' - רוטציית מודלים (Model Fallback):
    for (const currentModel of modelsToTry) {
      // שכבה א' - רוטציית מפתחות (Key Rotation):
      for (let i = 0; i < apiKeys.length; i++) {
        const keyIndex = (randomStartKeyIndex + i) % apiKeys.length;
        const currentKey = apiKeys[keyIndex];
        totalAttempts++;

        try {
          const ai = getGenAIClient(currentKey);

          const response = await ai.models.generateContent({
            model: currentModel,
            contents: prompt.trim(),
            config,
          });

          const responseText = response.text ?? "";

          // הצלחה - החזרת תוכן התשובה, המודל, אינדקס המפתח ומספר הניסיונות
          return NextResponse.json(
            {
              text: responseText,
              modelUsed: currentModel,
              keyIndex,
              attempts: totalAttempts,
            },
            { status: 200 }
          );
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          errorLog.push({
            attempt: totalAttempts,
            model: currentModel,
            keyIndex,
            error: errMsg.slice(0, 250),
          });

          // שגיאת מכסה (429/RESOURCE_EXHAUSTED) או עומס (503) -> מעבר מיידי למפתח הבא ברשימה
          continue;
        }
      }
      // אם כל המפתחות ברשימה נכשלו על currentModel -> מעבר למודל הבא בשרשרת
    }

    // 6. כישלון מוחלט (כל המפתחות וכל המודלים מוצו) -> החזרת סטטוס 429 עם פירוט תמציתי
    return NextResponse.json(
      {
        error: "All Gemini API keys and fallback models exhausted.",
        attempts: totalAttempts,
        details: errorLog.slice(0, 10),
      },
      { status: 429 }
    );
  } catch (fatalError: unknown) {
    const fatalMsg =
      fatalError instanceof Error ? fatalError.message : "Internal server error";
    return NextResponse.json({ error: fatalMsg }, { status: 500 });
  }
}
