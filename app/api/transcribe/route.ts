import { GoogleGenAI } from "@google/genai"
import { NextRequest, NextResponse } from "next/server"

let aiClient: GoogleGenAI | null = null

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY
    aiClient = new GoogleGenAI({ apiKey })
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
    const mimeType = rawMime.split(";")[0].trim() || "audio/webm"

    const ai = getGenAI()
    let response
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
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
              {
                text: `תמלל באופן מדויק ונאמן למקור את הדיבור בעברית מהקלטת השמע הזו.
החזר אך ורק את הטקסט המדויק שנאמר ללא שום הערות, פניות, הקדמות, מרכאות או תוספות.
אם ההקלטה שקטה או שאין בה דיבור ברור, החזר מחרוזת ריקה לחלוטין (אל תכתוב 'אין דיבור' או 'ההקלטה שקטה').
אם נאמרים מונחים הקשורים לבנייה או עבודה של ח. סבן חומרי בניין (כגון: בלות, טיט, מלט, שקים, גבס, עלי, חכמת, ראמי, מרצדס מנוף, איסוזו חלוקה, סניף התלמיד, סניף החרש, משטחי עץ, פקדון 60060), הקפד על איות עברי נכון ומדויק.`,
              },
            ],
          },
        ],
      })
    } catch (primaryErr) {
      console.warn("Primary transcribe model failed, using fallback:", primaryErr)
      response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
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
              {
                text: `תמלל במדויק את הדיבור בעברית מהקלטת שמע זו. החזר רק את הטקסט המתומלל בלבד ללא שום הערות.`,
              },
            ],
          },
        ],
      })
    }

    let text = response.text ? response.text.trim() : ""
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
