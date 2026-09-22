import { GoogleGenAI } from "@google/genai"

let aiClient: GoogleGenAI | null = null

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY
    aiClient = new GoogleGenAI({ apiKey })
  }
  return aiClient
}

/**
 * POST /api/chat
 *
 * Route handler using @google/genai to stream AI responses.
 * Receives messages and optional image data from the frontend.
 */
export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid request: messages array required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        "Please provide a GEMINI_API_KEY in your environment to chat with the AI assistant.",
        {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        },
      )
    }

    const contents: Array<{
      role: "user" | "model"
      parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }>
    }> = []

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i]
      const role = msg.role === "assistant" ? "model" : "user"
      const parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = []

      if (msg.imageData && typeof msg.imageData === "string" && msg.imageData.startsWith("data:image/")) {
        const commaIndex = msg.imageData.indexOf(",")
        if (commaIndex !== -1) {
          const mimeMatch = msg.imageData.substring(0, commaIndex).match(/data:(.*?);/)
          const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg"
          const base64Data = msg.imageData.substring(commaIndex + 1)
          parts.push({
            inlineData: {
              data: base64Data,
              mimeType,
            },
          })
        }
      }

      if (msg.content && typeof msg.content === "string" && msg.content.trim()) {
        parts.push({ text: msg.content })
      } else if (parts.length === 0) {
        continue
      }

      const prev = contents[contents.length - 1]
      if (prev && prev.role === role) {
        prev.parts.push(...parts)
      } else {
        contents.push({ role, parts })
      }
    }

    if (contents.length === 0) {
      return new Response(JSON.stringify({ error: "No valid messages to process" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Ensure first message is from user
    if (contents[0].role === "model") {
      contents.unshift({
        role: "user",
        parts: [{ text: "Hello" }],
      })
    }

    const systemInstruction = `  You are a helpful, friendly AI assistant. You provide clear, concise, and accurate responses.
When explaining code or technical concepts, use markdown formatting with code blocks where appropriate.
Be conversational but professional. If you're unsure about something, say so honestly.
When analyzing images, describe them in detail and answer any questions about them.     `

    const ai = getGenAI()

    let responseStream
    try {
      responseStream = await ai.models.generateContentStream({
        model: "gemini-3.6-flash",
        contents,
        config: {
          systemInstruction,
        },
      })
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.warn("Primary model error, attempting fallback:", errMsg)
      responseStream = await ai.models.generateContentStream({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction,
        },
      })
    }

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const text = chunk.text
            if (text) {
              controller.enqueue(encoder.encode(text))
            }
          }
          controller.close()
        } catch (streamErr) {
          console.error("Streaming error:", streamErr)
          controller.error(streamErr)
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    })
  } catch (error) {
    console.error("Chat API error:", error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
}

