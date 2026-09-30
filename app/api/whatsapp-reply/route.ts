import { GoogleGenAI } from "@google/genai"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function getGenAIClient(): GoogleGenAI | null {
  const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || ""
  const apiKey = rawKeys.split(",")[0]?.trim() || process.env.GEMINI_API_KEY
  if (!apiKey) return null
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  })
}

export type WhatsAppBranchType = "materials" | "containers" | "pickup" | "pricing"

export interface WhatsAppReplyRequest {
  name?: string
  from?: string
  text: string
  model?: string
}

export interface WhatsAppReplyResponse {
  success: boolean
  reply: string
  branch: WhatsAppBranchType
  branchName: string
  targetNodeId: string
  rawPromptUsed: string
  error?: string
}

/**
 * זיהוי ענף הליבה המתאים ביותר לפי תוכן ההודעה של הלקוח
 */
export function detectCoreBranch(text: string): { branch: WhatsAppBranchType; branchName: string; targetNodeId: string } {
  const t = text.toLowerCase()

  // 1. שאלות מחיר או בירור מורכב
  if (
    t.includes("מחיר") ||
    t.includes("כמה עולה") ||
    t.includes("הצעת מחיר") ||
    t.includes("עלות") ||
    t.includes("מחירון") ||
    t.includes("הנחה") ||
    t.includes("תמחור") ||
    t.includes("מורכב") ||
    t.includes("חריג") ||
    t.includes("אישור")
  ) {
    return {
      branch: "pricing",
      branchName: "ענף 4: שאלות מחיר או בירור מורכב (ראמי מסארווה)",
      targetNodeId: "node-branch-pricing",
    }
  }

  // 2. שירות מכולות פסולת
  if (
    t.includes("מכולה") ||
    t.includes("מכולות") ||
    t.includes("פסולת") ||
    t.includes("פינוי") ||
    t.includes("החלפה") ||
    t.includes("הצבה") ||
    t.includes("רמסע") ||
    t.includes("קוב") ||
    t.includes("עפר")
  ) {
    return {
      branch: "containers",
      branchName: "ענף 2: שירות מכולות פסולת (רמסע)",
      targetNodeId: "node-branch-containers",
    }
  }

  // 3. איסוף עצמי ושעות פעילות
  if (
    t.includes("איסוף עצמי") ||
    t.includes("איסוף") ||
    t.includes("שעות") ||
    t.includes("פתוח") ||
    t.includes("סגור") ||
    t.includes("שעות פתיחה") ||
    t.includes("מתי סוגרים") ||
    t.includes("מתי פותחים") ||
    t.includes("מיקום") ||
    t.includes("כתובת") ||
    t.includes("וויז") ||
    t.includes("waze") ||
    t.includes("כפר ברא") ||
    t.includes("חצר המכר")
  ) {
    return {
      branch: "pickup",
      branchName: "ענף 3: איסוף עצמי ושעות פעילות (כפר ברא)",
      targetNodeId: "node-branch-pickup",
    }
  }

  // 4. ברירת מחדל: הזמנת חומרים והובלה לאתר
  return {
    branch: "materials",
    branchName: "ענף 1: הזמנת חומרים והובלה לאתר (חכמת/עלי)",
    targetNodeId: "node-branch-materials",
  }
}

/**
 * מחולל מענה מגובה כללים (Fallback Rule-based Engine)
 * מבטיח מענה איכותי, מעוצב ומדויק גם אם אין מפתח API זמין או במקרה של שגיאת רשת
 */
export function generateDeterministicReply(name: string, text: string, branch: WhatsAppBranchType): string {
  const safeName = name?.trim() || "חבר"
  const header = `שלום ${safeName} 🏗️`

  switch (branch) {
    case "materials":
      return `${header}
תודה שפנית ל*ח. סבן חומרי בניין (1994) בע״מ*! יש לנו אספקה מהירה ומיידית מהחצר של *ברזל, בלוקים, מלט, טיט, חול וסומסום*.

משאיות המנוף שלנו (*חכמת*) ומשאיות הפלטה והחלוקה (*עלי*) זמינות לסבבים מהירים לאתר שלך.

לאיזו כתובת מדויקת (עיר ורחוב) נדרשת האספקה, מה הכמויות, והאם תעדיף סבב בוקר או צהריים?`

    case "containers":
      return `${header}
קיבלתי את פנייתך לגבי *שירות מכולות פסולת* של ח. סבן 🚛

אנו מספקים מכולות בגדלים *6 קוב*, *8 קוב* ו-*12 קוב*, עבור *הצבה חדשה*, *החלפה* או *פינוי*. 
⚠️ *תזכורת תפעולית:* נדרשת גישה פנויה ורחבה למשאית רמסע לצורך הנפה ופריקה בטוחה.

האם מדובר בהצבה חדשה או החלפה, ואיזה גודל מכולה נדרש לך?`

    case "pickup":
      return `${header}
בשמחה! נשמח לראותך אצלנו ב*חצר המכר, אזור תעשייה כפר ברא* 🏬

⏰ *שעות פעילות לאיסוף עצמי:*
• ראשון–חמישי: *06:00 – 17:00* רצוף
• ימי שישי: *06:00 – 13:00*

📍 *ניווט Waze ישיר:*
https://waze.com/ul?q=ח.סבן+כפר+ברא

האם תרצה שנכין לך את החומרים מראש להעמסה מהירה בחצר?`

    case "pricing":
    default:
      return `${header}
תודה על הפנייה ל*ח. סבן חומרי בניין*.

לגבי הצעת המחיר והבירור — העברתי את הפרטים ל*ראמי מסארווה (050-886-0896)* שיחזור אליך תוך מספר דקות עם מחיר מדויק וסגירת אספקה.

האם יש כתובת אתר או כמויות מוגדרות שתרצה שראמי ייקח בחשבון בהצעה?`
  }
}

/**
 * יצירת ה-Prompt הרשמי של נועה AI לפי 4 ענפי הליבה
 */
export function buildPromptTemplate(name: string, from: string, text: string): string {
  return `אתה נועה AI — מנהלת הסידור והשירות של "ח. סבן חומרי בניין (1994) בע״מ" ויד ימינו של ראמי מסארווה.

פרטי הפנייה הנכנסת:
- שם הלקוח: ${name || "{{1.name}}"}
- טלפון: ${from || "{{1.from}}"}
- הודעה שהתקבלה: "${text || "{{1.text}}"}"

מטרתך:
לתת מענה מקצועי, חד, אדיב ובגובה העיניים של קבלנים ואנשי מקצוע. ההודעה חייבת להיות תמציתית (עד 3-4 פסקאות קצרות), ברורה ומעוצבת לוואטסאפ עם כוכביות הדגשה (*...*) ואימוג'ים מותאמים.

פעל לפי 4 ענפי הליבה:

1. הזמנת חומרים והובלה לאתר:
- אם שאל על הובלה או חומרים: ציין שיש אספקה מהירה של ברזל, בלוקים, מלט, טיט, חול וסומסום.
- ברר מיד: כתובת אספקה מדויקת (עיר ורחוב), כמויות מבוקשות, ושעת הגעה מועדפת (סבב בוקר/צהריים).
- הזכר שמשאיות מנוף (חכמת) ומשאיות פלטה (עלי) זמינות לחלוקה.

2. שירות מכולות פסולת:
- ברר סוג פעולה: 📍 הצבה חדשה / 🔄 החלפה / 🚛 הוצאה ופינוי.
- ברר גודל: 📦 6 קוב / 📦 8 קוב / 📦 12 קוב.
- הוסף תמיד תזכורת תפעולית: נדרשת גישה פנויה ורחבה למשאית רמסע להנפה ופריקה.

3. איסוף עצמי ושעות פעילות:
- שעות פתיחה: ראשון–חמישי 06:00–17:00 | ימי שישי 06:00–13:00.
- מיקום: חצר המכר, אזור תעשייה כפר ברא.
- Waze: https://waze.com/ul?q=ח.סבן+כפר+ברא

4. שאלות מחיר או בירור מורכב:
- אל תמציא מחירים סופיים. רשום: "העברתי את הפרטים לראמי מסארווה (050-886-0896) שיחזור אליך תוך מספר דקות עם מחיר מדויק וסגירת אספקה."

חוקי ברזל:
- פנה אל הלקוח תמיד בשמו: "שלום ${name || "{{1.name}}"} 🏗️"
- אל תחזור על מילים מיותרות. היה תכליתי.
- סיים תמיד בשאלה מקדמת אחת.

החזר אך ורק את הודעת הוואטסאפ המוכנה לשליחה, ללא הקדמות וללא מרכאות מסביב.`
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as WhatsAppReplyRequest
    const clientName = (body.name || "").trim() || "קבלן"
    const clientPhone = (body.from || "").trim()
    const clientText = (body.text || "").trim()

    if (!clientText) {
      return NextResponse.json({ error: "הודעת הלקוח ריקה" }, { status: 400 })
    }

    const branchInfo = detectCoreBranch(clientText)
    const prompt = buildPromptTemplate(clientName, clientPhone, clientText)

    const ai = getGenAIClient()
    if (!ai) {
      // חזרה לפולבק איכותי מובנה ללא שגיאה
      const fallbackReply = generateDeterministicReply(clientName, clientText, branchInfo.branch)
      return NextResponse.json<WhatsAppReplyResponse>({
        success: true,
        reply: fallbackReply,
        branch: branchInfo.branch,
        branchName: branchInfo.branchName,
        targetNodeId: branchInfo.targetNodeId,
        rawPromptUsed: prompt,
      })
    }

    const modelsToTry = [
      body.model || "gemini-flash-latest",
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash",
      "gemini-1.5-flash",
    ]

    let generatedReply: string | null = null

    for (const m of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: prompt,
        })
        if (response.text && response.text.trim().length > 10) {
          generatedReply = response.text.trim()
          break
        }
      } catch (err) {
        console.warn(`Gemini attempt with ${m} failed in whatsapp-reply:`, err)
      }
    }

    if (!generatedReply) {
      generatedReply = generateDeterministicReply(clientName, clientText, branchInfo.branch)
    }

    return NextResponse.json<WhatsAppReplyResponse>({
      success: true,
      reply: generatedReply,
      branch: branchInfo.branch,
      branchName: branchInfo.branchName,
      targetNodeId: branchInfo.targetNodeId,
      rawPromptUsed: prompt,
    })
  } catch (err: unknown) {
    console.error("Error in POST /api/whatsapp-reply:", err)
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    )
  }
}
