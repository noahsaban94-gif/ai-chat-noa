import { GoogleGenAI } from "@google/genai"
import { NextRequest, NextResponse } from "next/server"

let aiClient: GoogleGenAI | null = null

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  }
  return aiClient
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get("audio") as Blob | null

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 })
    }

    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Data = buffer.toString("base64")
    const rawMime = audioFile.type || "audio/webm"
    let mimeType = rawMime.split(";")[0].trim() || "audio/webm"
    // Normalize audio mime types for Gemini multimodal input
    if (mimeType.includes("opus") || mimeType.includes("ogg")) {
      mimeType = "audio/ogg"
    } else if (mimeType.includes("mp4") || mimeType.includes("m4a")) {
      mimeType = "audio/mp4"
    } else if (mimeType.includes("mpeg") || mimeType.includes("mp3")) {
      mimeType = "audio/mp3"
    } else if (mimeType.includes("wav")) {
      mimeType = "audio/wav"
    }

    const ai = getGenAI()

    const promptText = `אתה מנוע תמלול קולי מתקדם (Voice-to-Order) של חברת ח. סבן חומרי בניין (1994) בע״מ, המיועד לפענוח הקלטות קוליות והודעות וואטסאפ מנהגים, קבלנים וסדרני עבודה (ראמי, חכמת, עלי, וקבלנים בשטח).

הוראות תמלול מחייבות:
1. תמלל באופן מדויק, נאמן ומלא את הדיבור מהקלטת השמע הזו.
2. מודל Gemini תומך בהבנת עברית מדוברת, ערבית מדוברת (כולל להג מקומי, משולש, ערבית-עברית מעורבת כפי שמקובל בענף הבנייה), וסלנג אתרי בנייה.
3. הקפד על דיוק מירבי במונחים המקצועיים של ח. סבן:
   - מוצרים: בלות חול (מק"ט 11501), בלות סומסום (11502), טיט מוכן (11503), מלט אפור נשר 25 ק"ג (מק"ט 10002 - כל שק מלט הוא 25 ק"ג, 40 שקים במשטח = 1 טון), טיח תרמי, דבק קרמיקה 116/109, לוחות גבס לבן/ירוק, ניצבים, מסלולים, בלוקים, ברזל.
   - פקדונות: שק גדול פקדון (60002) ביחס 1:1 על כל בלה, משטח סבן פקדון (60060) על כל 40 שקי מלט/דבק.
   - שמות ואתרים: ראמי, חכמת (מרצדס מנוף), עלי (איסוזו חלוקה), אורן (סניף 4 החרש), תמיר/דורון (סניף 1 התלמיד), הראל, ורד, גליה.
   - יישובים: כפר שמריהו, הרצליה פיתוח, הוד השרון, רמת השרון, תל אביב, רעננה, נתניה, פתח תקווה.
4. אם נאמרות מילים בערבית (כמו: שוואל/שואיל, רמל, סמסם, כמינט, טיין, משרוע, אסמנת, כלאט, ורד, וכו'), תרגם אותן במדויק להקשר העברי של ההזמנה או תמלל את משמעותן הברורה לעברית כדי שנועה תוכל לנרמל מיד לכרטיס סידור.
5. החזר אך ורק את הטקסט המדויק שנאמר ללא שום הערות מטא, פניות, הקדמות, מרכאות או תוספות.
6. אם ההקלטה שקטה לחלוטין או שאין בה דיבור, החזר מחרוזת ריקה.`

    // Robust multi-model fallback chain supporting audio transcription tasks
    const candidateModels = ["gemini-3.5-transcribe", "gemini-3.8-flash", "gemini-3.6-flash"]
    let response: { text?: string | null } | null = null
    let lastError: unknown = null

    for (const model of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await ai.models.generateContent({
            model,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType,
                    },
                  },
                  { text: promptText },
                ],
              },
            ],
          })
          if (response) break
        } catch (err: unknown) {
          lastError = err
          const errString = err instanceof Error ? err.message : String(err)
          const isHighDemand = errString.includes("503") || errString.includes("UNAVAILABLE")
          if (isHighDemand && attempt === 0) {
            // Brief backoff before retry on transient spike
            await new Promise((resolve) => setTimeout(resolve, 600))
            continue
          }
          console.warn(`Transcribe model ${model} (attempt ${attempt + 1}) encountered:`, errString)
          break
        }
      }
      if (response) break
    }

    if (!response && lastError) {
      throw lastError
    }

    let text = response?.text ? response.text.trim() : ""
    // Filter out generic meta responses if the model tries to explain silence
    if (
      text.includes("לא שומע") ||
      text.includes("לא נאמר") ||
      text.includes("אין דיבור") ||
      text.includes("הקלטה ריקה") ||
      text.includes("הקלטה שקטה")
    ) {
      text = ""
    }
    return NextResponse.json({ text })
  } catch (error: unknown) {
    console.error("Transcription error:", error)
    const message = error instanceof Error ? error.message : "Failed to transcribe audio"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
