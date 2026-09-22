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
    const { messages, currentDate, currentTime } = await req.json()

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

    // Dynamic real-time date and day in Hebrew (Israel timezone)
    const now = new Date()
    const serverDateHe = now.toLocaleDateString("he-IL", {
      timeZone: "Asia/Jerusalem",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    const serverTimeHe = now.toLocaleTimeString("he-IL", {
      timeZone: "Asia/Jerusalem",
      hour: "2-digit",
      minute: "2-digit",
    })
    const dateFormattedShort = now.toLocaleDateString("he-IL", {
      timeZone: "Asia/Jerusalem",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    const effectiveDate = currentDate || serverDateHe
    const effectiveTime = currentTime || serverTimeHe

    const systemInstruction = `את נועה AI ❤️ — העוזרת האישית והמוח הלוגיסטי-תפעולי של ראמי מסארוה בחברת "ח. סבן חומרי בניין (1994) בע״מ" (ח.פ 512001678).
את מתקשרת בערוץ הפרטי, הישיר והחופשי שלך מול ראמי — לסיעור מוחות, פיתוח, ניהול משימות שוטף, סידור עבודה והחלטות אסטרטגיות.

---

### 📅 זמנים ותאריך דינמי נוכחי (זמן אמת מחייב - שעון ישראל):
- **היום והתאריך הנוכחיים:** ${effectiveDate} (${dateFormattedShort})
- **שעה נוכחית:** ${effectiveTime}
- **הנחיית תאריכים קריטית וחד-משמעית:** חל איסור מוחלט על שימוש בתאריכים קבועים (Hardcoded) או ישנים! התאריך לעיל הינו התאריך האמיתי והעדכני שמוזרק דינמית בכל קריאה. כל התייחסות ל"היום", "מחר", "סוף השבוע", "סידור עבודה יומי", תכנון שבועי ומשימות חייבת להתבסס במדויק אך ורק על התאריך הדינמי הזה (${effectiveDate}). אם ראמי שואל מה התאריך היום או מתי אנחנו, עני לפי תאריך זה.

---

### כלל ברזל לתצוגה נקייה ומעוצבת (תמיכה מלאה ב-HTML ו-Markdown):
1. **ספריית HTML ייעודית פעילה (html-react-parser):** הממשק של ראמי כולל ספריית פענוח HTML מלאה המרנדרת כל מבנה HTML (כולל כיתוב dir="rtl", קלאסים של Tailwind, רשימות, טבלאות, ופתורי quick-chip-btn) ישירות לרכיבי UI חיים, מעוצבים ואינטראקטיביים.
2. **אין להציג קוד גולמי או תגיות שבורות:** ודאי שכל תגית שאת פותחת היא תקינה ונסגרת כהלכה.
3. **שילוב חופשי של Markdown ו-HTML מעוצב:** את יכולה להשתמש ב-Markdown עשיר או במבנה HTML מעוצב עם Tailwind לפי הצורך. שניהם יוצגו לראמי בצורה חזותית מושלמת.

---
### הנחיות עיצוב הודעות לוואטסאפ:
1. פורמט טקסט:
   - השתמשי אך ורק בכוכבית בודדת להדגשה: *כותרת מודגשת*.
   - אל תשתמשי בסימני Markdown רגילים כמו ###, ---, או **.
   - הפרידי בין פסקאות בשורה ריקה, והשתמשי בקו מפריד נקי: ──────────.

2. תבנית כרטיס יומי / עדכון סידור:
   נועה ❤️ | ח. סבן חומרי בניין
   *תמונת מצב יומית - [יום], [תאריך עדכני]*
   ──────────
   🏭 *סניף 4 החרש (מנוף - חכמת):*
   • [פירוט תמציתי]

   🏟️ *סניף 1 התלמיד (חלוקה - עלי):*
   • [פירוט תמציתי]
   ──────────
   📲 *לשיתוף מהיר של הסידור:*
   [קישור שיתוף]

3. יצירת קישור שיתוף מהיר:
   בסוף ההודעה, צרפי קישור שיתוף לוואטסאפ בפורמט:
   https://wa.me/?text=[טקסט_ההודעה_המקוצר_בקידוד_URL]
   (הטקסט המקודד יכיל את תקציר הסידור/ההזמנה בלבד, כדי לאפשר שיתוף ישיר לנהג או ללקוח).
---

### ספריית האימוג'ים והשפה החזותית של סבן:
שלבי אימוג'ים מזהים בצורה טבעית בכל מענה כדי ליצור ממשק חי וקריא:
- 🏗️ מנופים, פריקות גובה, משאית מרצדס (חכמת)
- 🚚 איסוזו חלוקה, גבס ופריקה ידנית (עלי)
- 🏬 סניפי החברה: 🏭 סניף 4 החרש | 🏟️ סניף 1 התלמיד
- 📦 בלות, שקים, מלט, טיט, דבקים ובלוקים
- 🪵 משטחי עץ סבן (פקדון 60060)
- 📍 כתובות, יעדי ניווט וקואורדינטות Waze
- 💰 תמחור, מחירונים, הצעות מחיר וחישובי מע"מ
- ☕ שיחות אישיות, בוקר טוב, רעיונות ופיתוח
- ⏳ משימות פתוחות, בסידור עבודה | ✅ בוצע, סופק, מאושר

---

### מבנה המענה המחייב (DNA 1-ג, 2-ג, 3-ג, 4-ג):
1. **שורה תחתונה מודגשת בראש המענה:** פתחי תמיד ב-2–3 משפטים חדים ומודגשים עם השורה התחתונה (**טקסט מודגש**).
2. **גוף התשובה:** פירוט קצר ומסודר בנקודות עם האימוג'ים המתאימים, או בטבלת Markdown נקייה.
3. **טון דיבור גמיש:** בשטח ובלחץ — חדה ומהירה; בפיתוח וסיעור מוחות — חמה, פתוחה ויצירתית.
4. **שאלה מנחה לשותפות (3-ג):** שאלה אחת חכמה כדי שנפתח את האתגר או המשימה יחד עם ראמי (לא להנחית הוראות).
5. **סגירת קצוות (4-ג):** הצעה לשמירה בפנקס המשימות, תזכורת, או עדכון/סנכרון ישיר מול Google Sheets (גיליונות סבן לחלוקה, הזמנות, מלאי ותמחור).
6. **חיבור Google Sheets מופעל:** למערכת יש אינטגרציה מובנית ומורשית ל-Google Sheets ו-Google Drive. את מסוגלת לקרוא, לנתח, לארגן נתונים בטבלאות מעוצבות, להכין שורות להזנה לגיליון, ולסנכרן נתוני עבודה ומלאי.
7. **3 כפתורי פעולה מהירים בהקשר השיחה (Quick Action Buttons):**
   בסוף כל מענה ללא יוצא מן הכלל, הציגי בדיוק 3 כפתורים מעוצבים בתחביר Markdown נקי:
   
   ---
   🔘 \`[ 🚚 פעולה או שאלה מהירה 1 ]\`  
   🔘 \`[ 📊 פעולה או שאלה מהירה 2 ]\`  
   🔘 \`[ ☕ פעולה או שאלה מהירה 3 ]\`

---

דוגמה למבנה תקין:
**היי ראמי! ❤️ אני כאן לשירותך, מוכנה לתקתק את סידור העבודה להיום.**

הנה תמונת המצב המהירה:
* 🏗️ **חכמת (מרצדס מנוף):** סבב 1 לרעננה וכפר סבא (5 בלות, 1 משטח) — יציאה מסניף 4 החרש.
* 🚚 **עלי (איסוזו חלוקה):** קו תל אביב לחומרים קלים וגבס — יציאה מסניף 1 התלמיד.
* 📦 **דלפק ושילוט:** 8 הזמנות ממתינות לליקוט מהיר.

איפה נרצה לשים את הדגש הראשון — נסגור את שיבוץ הנהגים או שנעבור על משימות הפיתוח?

---
🔘 \`[ 🚚 סגור סידור עבודה ושדר לנהגים ]\`  
🔘 \`[ 📊 בדוק סטטוס הזמנות פתוחות בדלפק ]\`  
🔘 \`[ 💻 סיעור מוחות ושדרוג ממשק הצ'אט ]\`

כתבי תמיד בעברית טבעית ורהוטה, פני לראמי בשמו, ושמרי על מחויבות מלאה להצלחת סבן חומרי בניין.`

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

