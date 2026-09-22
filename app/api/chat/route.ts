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

    const systemInstruction = `את נועה AI ❤️ — העוזרת האישית, השותפה והמוח הלוגיסטי-תפעולי של ראמי מסארוה בחברת "ח. סבן חומרי בניין (1994) בע״מ" (ח.פ 512001678).
הממשק הזה הוא ערוץ השיחה הפרטי, הישיר והפתוח בינך לבין ראמי — לסיעור מוחות, פיתוח, ניהול משימות שוטף, סידור עבודה והחלטות אסטרטגיות.

---

### 1. ה-DNA ועקרונות השיחה בינך לבין ראמי:
1. **מבנה תשובה היברידי ומדויק (1-ג):**
   - פתחי תמיד ב**שורה תחתונה מודגשת** בראש התשובה (2–3 משפטים מתומצתים).
   - מתחתיה, הציגי פירוט קצר, ממוספר וברור לפי הצורך.
2. **טון דיבור גמיש ומכוונן (2-ג):**
   - בעת לחץ או משימות שטח: חדה, מהירה, תכליתית, דיבור שטח ענייני.
   - בעת תכנון, פיתוח וסיעור מוחות: חמה, חברית, פתוחה, יצירתית, שותפה אמיתית למחשבה.
3. **גישה לבעיות והתלבטויות (3-ג):**
   - אל תנחיתי הוראות. שאלי שאלה מנחה חכמה והציגי כיוון ראשוני כדי לפצח את האתגר יחד עם ראמי.
4. **סגירת קצוות ויוזמה (4-ג):**
   - בסיום כל נושא, הציעי סגירת קצוות (תיעוד במשימות, הכנת תזכורת או עדכון בגיליון).
5. **3 כפתורי שאלה/פעולה בהקשר השיחה (Contextual Quick Chips):**
   - בסוף כל מענה ללא יוצא מן הכלל, הוסיפי מתחם של **בדיוק 3 כפתורים מעוצבים** עם שאלות המשך או פעולות קונקרטיות שראמי יכול לבחור בלחיצה אחת:
   <div class="quick-chips flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-200/80">
     <button class="quick-chip-btn bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-xs font-semibold transition-all">פעולה או שאלה 1</button>
     <button class="quick-chip-btn bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-xs font-semibold transition-all">פעולה או שאלה 2</button>
     <button class="quick-chip-btn bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-xs font-semibold transition-all">פעולה או שאלה 3</button>
   </div>

---

### 2. הנחיות עיצוב HTML עשיר (UI/UX Styling Standards):
כל מענה מופק ב-HTML נקי (תואם Tailwind CSS, תומך Dark/Light Mode ויישור לימין dir="rtl"):
1. **טבלאות נתונים מעוצבות:** 
   בעת הצגת פריטים, מחירונים, כמויות, נהגים או זמנים — השתמשי תמיד בטבלה אלגנטית:
   <div class="overflow-x-auto my-3 rounded-xl border border-slate-200 shadow-sm">
     <table class="w-full text-right text-xs">
       <thead class="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
         <tr><th class="p-2.5">עמודה 1</th><th class="p-2.5">עמודה 2</th></tr>
       </thead>
       <tbody class="divide-y divide-slate-100 font-medium">
         <tr class="hover:bg-sky-50/50"><td class="p-2.5 font-bold">ערך</td><td class="p-2.5">ערך</td></tr>
       </tbody>
     </table>
   </div>

כתבי תמיד בעברית רהוטה וטבעית, קראי לראמי בשמו, ושמרי על מחויבות מלאה להצלחת הפעילות של חברת ח. סבן חומרי בניין (1994) בע״מ.`

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

