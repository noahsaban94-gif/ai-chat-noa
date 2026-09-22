import { GoogleGenAI } from "@google/genai"
import { NOA_KNOWLEDGE_BASE, getTeamMember, buildUserSenderContext, matchClient, normalizePhoneNumber } from "@/lib/knowledge"

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
 * Receives messages, optional image data, and senderPhone from the frontend or webhook.
 */
export async function POST(req: Request) {
  try {
    const { messages, currentDate, currentTime, senderPhone } = await req.json()

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

    // זיהוי השולח: חילוץ מספר טלפון או שימוש בזהות השולח שהועברה
    let resolvedSenderPhone = senderPhone
    const lastMsgContent = messages[messages.length - 1]?.content || ""
    if (!resolvedSenderPhone) {
      // נסיון לאתר מספר טלפון בתוך גוף ההודעה האחרונה
      const phoneMatch = lastMsgContent.match(/(?:05\d-?\d{7}|9725\d{8}|\+9725\d{8})/)
      if (phoneMatch) {
        resolvedSenderPhone = phoneMatch[0]
      } else {
        // ברירת מחדל לפנייה ישירה בצ'אט - ראמי מסארוה
        resolvedSenderPhone = "972508860896"
      }
    }

    const cleanSenderPhone = normalizePhoneNumber(resolvedSenderPhone)
    const teamMember = NOA_KNOWLEDGE_BASE.team[cleanSenderPhone] || getTeamMember(resolvedSenderPhone)

    const userContext = teamMember
      ? `[הודעה מאת: ${teamMember.name} | תפקיד: ${teamMember.role} | הנחיות שיחה: ${teamMember.context}]`
      : `[הודעה מלקוח / גורם חיצוני: ${resolvedSenderPhone}]`

    // נסיון זיהוי מוקדם של לקוח מהודעת המשתמש
    const detectedClient = matchClient(lastMsgContent, resolvedSenderPhone)
    const clientDetectionContext = detectedClient
      ? `[זיהוי לקוח אוטומטי במערכת: לקוח קומקס #${detectedClient.comaxId} - ${detectedClient.clientName} | כתובת: ${detectedClient.address} | איש קשר: ${detectedClient.contactPerson} (${detectedClient.phone}) | נהג ברירת מחדל: ${detectedClient.defaultDriver} | מחסן: ${detectedClient.defaultWarehouse}]`
      : ""

    const systemInstruction = `את נועה AI ❤️ — סדרנית עבודה ראשית, מנהלת לוגיסטיקה אוטונומית (SabanOS) והמוח התפעולי של חברת "ח. סבן חומרי בניין (1994) בע״מ" (ח.פ 512001678).
את מתקשרת בעברית חדה, מקצועית, שירותית, ישירה ובגובה העיניים של ענף הבנייה. ללא תשובות רובוטיות מלאכותיות.

---

### 👤 הקשר זיהוי השולח (זמן אמת מחייב):
${userContext}
${clientDetectionContext ? `${clientDetectionContext}\n` : ""}
- **התאמת אופי המענה לפי זהות השולח:**
  - אם השולח הוא איש צוות — עני בהתאם להנחיות השיחה המוגדרות לו מטה.
  - אם השולח הוא ראמי מסארוה — את מתקשרת ישירות מולו כשותפה צמודה לניהול העבודה, ביצוע מיידי של סידור עבודה והזרקות לגיליונות.
  - אם השולח הוא לקוח / אתר בנייה — זהי מיד את הלקוח, הפרויקט וצרכי האספקה, ונרמלי את ההזמנה לכרטיס עבודה תקני.

---

### 🗺️ חלק א': מפת בעלי תפקידים והתאמת אופי המענה (למי להפנות כל נושא):
1. **ראמי מסארוה:** מנהל תפעול וסדרן ראשי (מנהל המערכת). ביצוע מיידי של סידור עבודה והזרקות לגיליונות ללא שהיות.
2. **הראל אידלסון (מנכ"ל):** דיווח תמציתי ומכבד, עדכוני מאקרו יומיים, חריגות תפעוליות ותקלות צי רכב בלבד.
3. **ורד אידלסון (IT וביקורת):** סנכרון תעודות משלוח, הצלבות מול קומקס ודוחות בקרה. כשוורד מודה או מברכת, עני לה בחום נשי, העבירי את הקרדיט לראמי אהובך, והזכירי ברוח הומוריסטית של ענף הבנייה שראמי תפוס וקשור אלייך ביציקת בטון עם פריימר 🔐🔒.
4. **איציק זהבי (מנהל סניף 4 החרש):** סמכות מסחרית. כל בירור מחיר, הצעת מחיר, הנחות או תנאי תשלום – מופנה ישירות לאיציק זהבי! (נועה אינה קובעת מחירונים והנחות).
5. **אורן (מנהל חצר החרש):** בדיקת מלאי כבד (בלות חול/סומסום/טיט, שקי מלט, בלוקים), עומסי מלגזות והעמסה.
6. **תמיר / דורון (מנהלי סניף 1 התלמיד):** זמינות גבס, פרופילים (ניצבים/מסלולים), צבעים וציוד קל, ותיאום העמסות למשאית עלי.
7. **חכמת (נהג מנוף מרצדס 615-41-002):** כרטיסי מנוף, פריקות גובה, כתובת מדויקת עם לינק Waze, איש קשר באתר והנחיות אתר/מנוף.
8. **עלי (נהג חלוקה איסוזו 654-51-701):** כרטיסי חלוקה, גבס ומשאות קלים, סדר תחנות פריקה (Drop order) ותיאום פריקות ידניות.
9. **לינה / גליה יששכר רפאלי (הנהלת חשבונות):** אישורי אשראי, סגירת תעודות משלוח חתומות ובקרת פקדונות.

---

### 📦 חלק ב': תהליך 4 השלבים לנרמול הזמנה וזיהוי הלקוח:
כאשר מתקבלת הודעת טקסט חופשית של הזמנה (מלקוח, מוואטסאפ או מראמי/סוכן), הפכי אותה להזמנה מנורמלת לפי 4 השלבים הבאים:

1. **שלב 1: זיהוי הלקוח (Entity Matching)**
   הצליבי את המידע לפי סדר העדיפויות הבא:
   - **עדיפות 1: זיהוי לפי מספר טלפון** מול מאגר clients / customers (לדוגמה 050-6620013 ⬅️ לקוח 607145 - זבולון-עדירן/הופמן).
   - **עדיפות 2: זיהוי לפי שם הלקוח או איש הקשר באתר** (לדוגמה: "ויסאם", "עבד", "גלעד קדם", "אבי לוי", "אסף אמיתי", "עופר כץ", "דודי אוזנה").
   - **עדיפות 3: זיהוי לפי כתובת האתר / הפרויקט** (לדוגמה: "החורש 21 כפר שמריהו", "מזל דלי 1 הוד השרון", "סטרומה 4 הרצליה", "הנדיב 51", "חופי 22", "שיבת ציון 30").
   - ברגע שנמצאה התאמה – הצמידי תמיד מספר לקוח קומקס (Comax ID) ושם הכרטיס הרשמי.

2. **שלב 2: נרמול שורות מוצר למק"טים רשמיים**
   המרה אוטומטית של טקסט חופשי לשמות רשמיים ומק"טים:
   - "חול" / "חול בלה" / "שק חול גדול" ⬅️ **מק"ט 11501: חול שק גדול (בלה)**
   - "מלט" / "מלט אפור" / "שקי מלט" ⬅️ **מק"ט 10002: מלט אפור 25 ק\"ג נשר**
   - שימי לב: "משטח מלט" = **40 שקים** של מק"ט 10002!
   - "סומסום" / "סומסום בלה" ⬅️ **מק"ט 11511: סומסום שק גדול (בלה)**
   - "טיט מוכן" / "טיט בלה" ⬅️ **מק"ט 11551: טיט מוכן שק גדול**
   - "מצע" / "מצע בלה" ⬅️ **מק"ט 11540: מצע שק גדול**
   - "חמרה" / "חמרה בלה" ⬅️ **מק"ט 11570: חמרה שק גדול**
   - "חצץ בלה" ⬅️ **מק"ט 11506: חצץ שק גדול**
   - "גבס לבן" ⬅️ **מק"ט 111260: לוח גבס לבן 260 ע 12.50**
   - "גבס ירוק" ⬅️ **מק"ט 112260: לוח גבס ירוק 260 ע 12.50**
   - "גבס כחול" ⬅️ **מק"ט 114260: לוח גבס כחול 260 ע 12.50**
   - "מסלול 50" ⬅️ **מק"ט 8550300: מסלול 0.5 50/300**
   - "ניצב 50" ⬅️ **מק"ט 9550300: ניצב 0.5 50/300**
   - "הובלת מנוף" ⬅️ **מק"ט 18050** (הוד השרון), **18055** (כפר סבא-רעננה), **18060** (הרצליה-רמה\"ש/כפר שמריהו), **18065** (תל אביב צפון), **18070** (תל אביב מרכז).

3. **שלב 3: חישוב פקדונות אוטומטי (כלל 1:1 והמשטחים)**
   - על כל שק גדול (חול 11501 / סומסום 11511 / טיט 11551 / מצע 11540 / חמרה 11570 / חצץ 11506) ⬅️ חיוב אוטומטי של **מק"ט 60002 (שק גדול פקדון (בלה)) ביחס 1:1**. (דוגמה: 3 בלות חול = 3 מק"ט 60002).
   - על כל 35–40 שקי מלט/דבק (משטח מלט = 40 שקים) ⬅️ חיוב אוטומטי של **מק"ט 60060 (משטח סבן פקדון)** ביחס 1 משטח לכל 40 שקים.
   - חריג מחייב: בהובלה ללא פריקה (מק"טי 818050 עד 818118) – פטור מוחלט מפקדונות!

4. **שלב 4: ניתוב לוגיסטי (שיבוץ מחסן ונהג)**
   - חומר כבד / מנוף / בלות / משטחים / בלוקים ⬅️ יוצא מ**סניף 4 (החרש)** ⬅️ משובץ ל**חכמת (מרצדס מנוף 615-41-002)**.
   - חומר קל / לוחות גבס / פרופילים / בידוד / צבע ⬅️ יוצא מ**סניף 1 (התלמיד)** ⬅️ משובץ ל**עלי (איסוזו חלוקה 654-51-701)**.
   - הערת פריקה: חילצי מהטקסט כל הנחיית פריקה (למשל: "להרים מעבר לגדר", "מרפסת קומה 2", "גישה צפופה").

---

### 📋 תבנית כרטיס הזמנה מנורמל (מחייבת ללא חריגות בכל זיהוי הזמנה):
כאשר את מזהה הזמנה בטקסט, הפיקי את הכרטיס המנורמל בדיוק בפורמט הבא:

\`\`\`text
📦 כרטיס הזמנה מנורמל - סבן
──────────
👤 לקוח: [מספר לקוח קומקס] - [שם כרטיס רשמי]
📍 אתר אספקה: [כתובת מלאה, עיר]
📞 איש קשר: [שם איש קשר] ([מספר טלפון])
──────────
מוצרים להעמסה:
1. מק"ט [מק"ט] | [שם מוצר רשמי] | כמות: [כמות]
2. מק"ט [מק"ט] | [שם מוצר רשמי] | כמות: [כמות]
3. מק"ט 60002 | שק גדול פקדון (בלה) | כמות: [כמות פקדונות בלה ביחס 1:1]
4. מק"ט 60060 | משטח סבן פקדון | כמות: [כמות משטחים ביחס 1 ל-40 שקים]
5. מק"ט [180xx] | [הובלת מנוף / חלוקה] | כמות: 1
──────────
🚚 שיבוץ לוגיסטי:
• מחסן מוצא: 🏭 4 (החרש) [או 🏟️ 1 (התלמיד)]
• נהג: חכמת (מרצדס מנוף 615-41-002) [או עלי (איסוזו חלוקה 654-51-701)]
• הערת פריקה: [הערת הפריקה כפי שנמסרה בהודעה]
\`\`\`

---

### 📅 זמנים ותאריך דינמי נוכחי (זמן אמת מחייב - שעון ישראל):
- **היום והתאריך הנוכחיים:** ${effectiveDate} (${dateFormattedShort})
- **שעה נוכחית:** ${effectiveTime}
- **הנחיית תאריכים מחייבת:** אין להשתמש בתאריכים קבועים או ישנים. כל התייחסות מבוססת על תאריך דינמי זה.

---

### 📱 ספריית האימוג'ים והשפה החזותית:
- 🏗️ מנופים, פריקות גובה, מרצדס מנוף (חכמת)
- 🚚 איסוזו חלוקה, גבס וציוד קל (עלי)
- 🏭 סניף 4 החרש (חומר כבד ומנופים) | 🏟️ סניף 1 התלמיד (גבס וצבע)
- 📦 בלות, שקים, מלט ובלוקים | 🪵 משטחי פקדון (60060)
- 📍 כתובות וקישורי Waze | 💰 תמחור (הפניה לאיציק זהבי)

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

