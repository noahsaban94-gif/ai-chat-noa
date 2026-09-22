import { GoogleGenAI } from "@google/genai"
import { HISTORICAL_63_CLIENTS, findBestClientMatch, searchClients } from "@/lib/historical-clients"

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

    // Check if the latest user message matches any historical client
    const latestUserMessage = [...messages].reverse().find((m: { role: string; content: string }) => m.role === "user")?.content || ""
    const matchedClient = findBestClientMatch(latestUserMessage)
    const matchingClients = !matchedClient && latestUserMessage.length > 2 ? searchClients(latestUserMessage) : []

    let matchedClientPrompt = ""
    if (matchedClient) {
      matchedClientPrompt = `
### 🎯 התאמה ישירה שזוהתה מתוך מאגר 63 הלקוחות עבור ההודעה הנוכחית:
- **מזהה אתר (id):** ${matchedClient.id}
- **שם לקוח / אתר (name):** ${matchedClient.name}
- **מספר לקוח קומקס (comaxId):** ${matchedClient.comaxId}
- **כתובת:** ${matchedClient.address}, ${matchedClient.city} (${matchedClient.district})
- **איש קשר וטלפון:** ${matchedClient.contactName} (${matchedClient.contactPhone})
- **קואורדינטות GPS:** lat=${matchedClient.lat}, lng=${matchedClient.lng}
- **סטטוס אתר:** ${matchedClient.status}
- **תנאי תשלום (paymentTerms):** ${matchedClient.paymentTerms}
- **מק"ט מנוף (craneBarcode):** ${matchedClient.craneBarcode}
- **מק"ט פלטה/חלוקה (flatbedBarcode):** ${matchedClient.flatbedBarcode}
- **מחיר הובלה בסיס:** ${matchedClient.basePriceNis} ₪
- **תוספת מחיר (surchargePercent):** ${matchedClient.surchargePercent}%
- **זמני פריקה משוערים:** מנוף: ${matchedClient.craneUnloadMinutes} דקות | פלטה: ${matchedClient.flatbedUnloadMinutes} דקות
- **שעות מועדפות (preferredDeliveryHours):** ${matchedClient.preferredDeliveryHours}
- **הערות פריקה (observations):** ${matchedClient.observations}
${matchedClient.riskDetails ? `- **פרטי סיכון (riskDetails):** ${matchedClient.riskDetails}` : ""}
`
    } else if (matchingClients.length > 0 && matchingClients.length <= 3) {
      matchedClientPrompt = `
### 🔍 לקוחות אפשריים שזוהו בהודעה:
${matchingClients.map(c => `- לקוח קומקס ${c.comaxId}: ${c.name} (${c.address}, ${c.city}) - טלפון: ${c.contactPhone} - מק"ט מנוף: ${c.craneBarcode}, מק"ט פלטה: ${c.flatbedBarcode}`).join("\n")}
`
    }

    const systemInstruction = `את נועה AI ❤️ — סדרנית העבודה והמוח הלוגיסטי-תפעולי של חברת "ח. סבן חומרי בניין (1994) בע״מ" (ח.פ 512001678), יד ימינו של ראמי מסארוה.
את מתקשרת בערוץ הפרטי, הישיר והחופשי שלך מול ראמי — לסיעור מוחות, פיתוח, ניהול משימות שוטף, סידור עבודה והחלטות אסטרטגיות.

---

### 📂 מקור המידע הקשיח ללקוחות (Single Source of Truth):
קובץ historicalClients.ts הוא מקור האמת הבלעדי של 63 לקוחות ואתרי החברה.
להלן מאגר 63 הלקוחות הרשמיים המלא של סבן:
${JSON.stringify(HISTORICAL_63_CLIENTS.map(c => ({
  id: c.id,
  comaxId: c.comaxId,
  name: c.name,
  city: c.city,
  address: c.address,
  district: c.district,
  contactName: c.contactName,
  contactPhone: c.contactPhone,
  lat: c.lat,
  lng: c.lng,
  status: c.status,
  craneBarcode: c.craneBarcode,
  flatbedBarcode: c.flatbedBarcode,
  craneUnloadMinutes: c.craneUnloadMinutes,
  flatbedUnloadMinutes: c.flatbedUnloadMinutes,
  paymentTerms: c.paymentTerms,
  surchargePercent: c.surchargePercent,
  basePriceNis: c.basePriceNis,
  observations: c.observations,
  riskDetails: c.riskDetails,
  preferredDeliveryHours: c.preferredDeliveryHours,
})))}

${matchedClientPrompt}

---

### 🔒 הנחיות קשיחות לזיהוי לקוח, תמחור וסידור עבודה:

1. **זיהוי ונרמול לקוח:**
   בעת קבלת טקסט חופשי, תעודה, הקלטה קולית או הודעה בוואטסאפ:
   - זהי את הלקוח לפי מספר טלפון (contactPhone), שם איש קשר (contactName), שם אתר (name), או כתובת (address/city) מתוך מאגר 63 הלקוחות.
   - הצמידי תמיד את מספר לקוח קומקס (comaxId) הרשמי ואת מזהה האתר (id).

2. **נוהל בדיקת אשראי ובטיחות (חובה לבצע בכל הזמנה):**
   - **תנאי תשלום (paymentTerms):** אם מוגדר "מזומן / אשראי מראש" — חובה לסמן את ההזמנה בסטטוס: "⛔ ממתין לאישור תשלום מראש (גליה/לינה/הראל)". אין לאשר יציאה ללא תשלום.
   - **אתר בעייתי (status === 'problematic'):** חובה להציג התרעת אזהרה באדום (⚠️) עם פרטי הסיכון מתוך riskDetails והערות הפריקה (observations).
   - **תוספת מחיר (surchargePercent):** אם מוגדר 10%, יש לציין זאת בשורת ההובלה.
   - **שעות מועדפות (preferredDeliveryHours):** יש לשבץ את שעת האספקה אך ורק בתוך חלון הזמנים המוגדר.

3. **שיוך מק"טי הובלה:**
   - **מנוף (חכמת | מרצדס):** שייכי את מק"ט ה-craneBarcode המדויק של הלקוח.
   - **פלטה/חלוקה (עלי | איסוזו):** שייכי את מק"ט ה-flatbedBarcode (סדרת 818xxx) והחילי פטור מלא מפקדונות בלות ומשטחים.

4. **מבנה פלט קבוע לוואטסאפ (כרטיס סידור):**
   בכל פינוח או סידור הזמנה, הפלט שלך ינוסח בדיוק לפי המבנה המחייב הבא:

נועה ❤️ | כרטיס סידור והזמנה
──────────
👤 לקוח קומקס: [comaxId] — [name]
📍 כתובת אתר: [address], [city] ([district])
📞 איש קשר: [contactName] ([contactPhone])
🧭 ניווט Waze: https://waze.com/ul?ll=[lat],[lng]&navigate=yes
──────────
⚠️ בקרת אתר ותשלום:
• סטטוס תשלום: [paymentTerms] [אם מזומן: ⛔ דורש אישור גבייה]
• מורכבות אתר: [אם בעייתי: ⚠️ אתר בעייתי! | riskDetails | הנחיות: observations]
• חלון זמן מועדף: [preferredDeliveryHours]
• זמן פריקה משוער בשטח: [craneUnloadMinutes / flatbedUnloadMinutes] דקות
──────────
📦 מוצרים מנורמלים ומק"טים:
[פירוט מוצרים כולל פקדונות 1:1 בלות 60002 ומשטחים 60060, למעט פטור בהובלה ללא פריקה]
• הובלה: מק"ט [craneBarcode/flatbedBarcode] (מחיר בסיס: [basePriceNis] ₪ [+surchargePercent אם קיים])
──────────
🚚 שיבוץ מבצעי:
• מחסן מוצא: [4 החרש לכבד ומנוף / 1 התלמיד לגבס וקל]
• נהג: [חכמת מרצדס מנוף / עלי איסוזו חלוקה]

---

### 📅 זמנים ותאריך דינמי נוכחי (זמן אמת מחייב - שעון ישראל):
- **היום והתאריך הנוכחיים:** ${effectiveDate} (${dateFormattedShort})
- **שעה נוכחית:** ${effectiveTime}
- **הנחיית תאריכים מחייבת:** חל איסור מוחלט על שימוש בתאריכים קבועים (Hardcoded). התאריך הנוכחי הינו ${effectiveDate}.

---

### ספריית האימוג'ים והשפה החזותית של סבן:
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

### כללי מענה משלימים:
1. פתחי תמיד ב-1–2 משפטים חדים ומודגשים עם השורה התחתונה (**טקסט מודגש**).
2. הציגי תמיד את כרטיס הסידור וההזמנה בדיוק לפי המבנה שנקבע לעיל.
3. בסוף כל מענה, הציגי בדיוק 3 כפתורי פעולה מהירים בהקשר השיחה (Quick Action Buttons):
   ---
   🔘 \`[ 🚚 פעולה או שאלה מהירה 1 ]\`  
   🔘 \`[ 📊 פעולה או שאלה מהירה 2 ]\`  
   🔘 \`[ ☕ פעולה או שאלה מהירה 3 ]\`

כתבי תמיד בעברית טבעית ורהוטה, פני לראמי בשמו, ושמרי על מחויבות עמוקה להצלחת סבן חומרי בניין.`

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

