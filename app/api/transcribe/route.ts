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
    const mimeType = audioFile.type || "audio/webm"

    const ai = getGenAI()
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
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
החזר אך ורק את הטקסט המתומלל ללא שום הערות, הקדמות, מרכאות או תוספות.
אם נאמרים מונחים הקשורים לבנייה, הובלה או עבודה של ח. סבן חומרי בניין (כגון: בלות, טיט, מלט, שקים, עלי, חכמת, ראמי, מרצדס, איסוזו, סניף התלמיד, סניף החרש, משטחי עץ, פקדון), הקפד על איות עברי נכון ומדויק.`,
            },
          ],
        },
      ],
    })

    const text = response.text ? response.text.trim() : ""
    return NextResponse.json({ text })
  } catch (error: unknown) {
    console.error("Transcription error:", error)
    const message = error instanceof Error ? error.message : "Failed to transcribe audio"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
