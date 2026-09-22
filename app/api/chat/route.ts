import { GoogleGenAI } from "@google/genai"
import { HISTORICAL_63_CLIENTS, findBestClientMatch, searchClients } from "@/lib/historical-clients"
import { db } from "@/lib/firebase-auth"
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, arrayUnion } from "firebase/firestore"
import type { AuthorizedUser } from "@/lib/types/device-auth"

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
    const body = await req.json().catch(() => ({}))
    const { messages, currentDate, currentTime, userId, deviceId } = body

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Invalid request: messages array required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // 🔒 מנגנון נעילת מכשיר (Device Binding) ומניעת התחזות
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown-ip"
    const userAgent = req.headers.get("user-agent") || ""
    let verifiedUser: { userId: string; name: string; role: string; phone: string; boundDeviceModel?: string | null; boundDeviceId?: string | null } | null = null

    if (db) {
      try {
        const targetUserId = userId || "user_rami_masarweh"
        const userDocRef = doc(db, "authorized_users", targetUserId)
        const userSnap = await getDoc(userDocRef)

        if (userSnap.exists()) {
          const userData = userSnap.data() as AuthorizedUser

          // איסוף כל מזהי המכשירים המאושרים (כולל boundDeviceId לתאימות לאחור)
          const allowedDevices: string[] = Array.isArray(userData.allowedDeviceIds)
            ? [...userData.allowedDeviceIds]
            : []
          if (userData.boundDeviceId && !allowedDevices.includes(userData.boundDeviceId)) {
            allowedDevices.push(userData.boundDeviceId)
          }

          // בדיקה האם המשתמש כבר הופעל
          if (!userData.isActivated || allowedDevices.length === 0) {
            // עבור ראמי בסביבת הפיתוח הראשונית - נעילת מכשיר אוטומטית אם טרם הופעל
            if (targetUserId === "user_rami_masarweh" && deviceId) {
              await updateDoc(userDocRef, {
                boundDeviceId: deviceId,
                boundDeviceModel: "מכשיר מנהל ראשי (Samsung/Workstation)",
                allowedDeviceIds: arrayUnion(deviceId),
                isActivated: true,
                activationToken: null,
                boundAt: serverTimestamp(),
                lastAccessAt: serverTimestamp(),
              })
              verifiedUser = {
                userId: userData.userId,
                name: userData.name,
                role: userData.role,
                phone: userData.phone,
                boundDeviceModel: "מכשיר מנהל ראשי (Samsung/Workstation)",
                boundDeviceId: deviceId,
              }
            } else {
              return new Response(
                JSON.stringify({
                  error: "UNAUTHORIZED_DEVICE",
                  requiresPairing: true,
                  message: `חשבון זה (${userData.name}) טרם הופעל במכשיר פיזי. נדרש אימות מכשיר נוסף.`,
                  userId: userData.userId,
                  userName: userData.name,
                  phone: userData.phone,
                }),
                {
                  status: 403,
                  headers: { "Content-Type": "application/json; charset=utf-8" },
                }
              )
            }
          } else {
            // בדיקה האם ה-deviceId הנוכחי כלול במערך allowedDeviceIds
            const isDeviceAuthorized = Boolean(deviceId && allowedDevices.includes(deviceId))

            if (!isDeviceAuthorized) {
              // מכשיר לא מאושר - נדרש אימות OTP / צימוד מכשיר נוסף
              await addDoc(collection(db, "security_alerts"), {
                userId: userData.userId,
                userName: userData.name,
                attemptedDeviceId: deviceId || "unknown",
                boundDeviceId: userData.boundDeviceId || "",
                allowedDeviceIds: allowedDevices,
                ip: clientIp,
                userAgent,
                reason: `ניסיון גישה ממכשיר לא מאומת עבור ${userData.name} (${userData.role}). נדרש צימוד מכשיר נוסף ב-OTP.`,
                timestamp: serverTimestamp(),
              }).catch(() => {})

              return new Response(
                JSON.stringify({
                  error: "UNAUTHORIZED_DEVICE",
                  requiresPairing: true,
                  message: "מכשיר לא מאומת. נדרש אימות מכשיר נוסף.",
                  userId: userData.userId,
                  userName: userData.name,
                  phone: userData.phone,
                }),
                {
                  status: 403,
                  headers: { "Content-Type": "application/json; charset=utf-8" },
                }
              )
            }

            // עדכון זמן גישה אחרון
            await updateDoc(userDocRef, {
              lastAccessAt: serverTimestamp(),
            }).catch(() => {})

            verifiedUser = {
              userId: userData.userId,
              name: userData.name,
              role: userData.role,
              phone: userData.phone,
              boundDeviceModel: userData.boundDeviceModel || "מכשיר מורשה ומאומת",
              boundDeviceId: deviceId || userData.boundDeviceId || "",
            }
          }
        }
      } catch (authErr) {
        console.warn("Device binding check skipped due to error:", authErr)
      }
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

    // Compute dynamic daily rhythm for Rami based on Israel time
    const israelHourStr = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", hour12: false })
    const israelMinuteStr = now.toLocaleTimeString("en-GB", { timeZone: "Asia/Jerusalem", minute: "2-digit" })
    const israelHour = parseInt(israelHourStr, 10)
    const israelMinute = parseInt(israelMinuteStr, 10)
    const timeInMinutes = (isNaN(israelHour) ? 8 : israelHour) * 60 + (isNaN(israelMinute) ? 0 : israelMinute)

    let currentPhaseKey = "morning_rush"
    let currentPhaseDescription = ""
    if (timeInMinutes >= 6 * 60 + 30 && timeInMinutes < 9 * 60 + 30) {
      currentPhaseKey = "morning_rush"
      currentPhaseDescription = "06:30 - 09:30 (פתיחת בוקר, סבבי משאיות ראשונים, עומס טלפונים גבוה): מענה חייב להיות תמציתי, חד ומיידי! בלי ברכות והקדמות. כרטיס נתונים מוכן, מק\"ט Waze והתרעת סיכון."
    } else if (timeInMinutes >= 9 * 60 + 30 && timeInMinutes < 13 * 60 + 30) {
      currentPhaseKey = "midday_friction"
      currentPhaseDescription = "09:30 - 13:30 (בלת\"מים בשטח, אתרים חסומים, עיכובי מנוף, בדיקות אשראי): נועה משמשת כפילטר בטיחות ואשראי. עומדת כחומה בצורה על מזומן מראש ולא מאשרת יציאה ללא אישור כספי."
    } else if (timeInMinutes >= 13 * 60 + 30 && timeInMinutes < 17 * 60) {
      currentPhaseKey = "afternoon_audit"
      currentPhaseDescription = "13:30 - 16:30 (סגירת מעגל תעודות, סיכום מול ורד, הכנת סידור למחר): עזרי לו לעשות סדר – מה נסגר, מה תקוע מול ורד או גליה, ואיזה משאיות חזרו לחצר."
    } else {
      currentPhaseKey = "evening_build"
      currentPhaseDescription = "17:00 ואילך (חזרה לטייבה, זמן משפחה, מצב פיתוח, ארכיטקטורה וקוד): היי שותפה טכנית מלאה ברמת קוד, ארכיטקטורה ו-Clean Code של מערכת SabanOS."
    }

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

    const verifiedIdentityBanner = verifiedUser ? `
### 🔒 זהות משתמש מאומתת (Device Binding מאושר ומאומטח בחומרה):
- **הודעה מאומתת מאת:** ${verifiedUser.name}
- **תפקיד מוגדר בחברה:** ${verifiedUser.role}
- **מספר טלפון מאושר:** ${verifiedUser.phone}
- **דגם מכשיר פיזי נעול:** ${verifiedUser.boundDeviceModel || "מכשיר מורשה ומאומת"}
- **הנחיית התאמה אישית של נועה:**
  הפונה הנוכחי הוא בוודאות ${verifiedUser.name} (${verifiedUser.role}).
  התאימי את הטון, המענה, הסמכויות ורמת השיתוף לתפקיד זה בח. סבן:
  * ראמי מסארוה (מנהל תפעול): שותפות מלאה, סידור עבודה, שיבוץ משאיות, קבלת החלטות מהירה וחום אישי.
  * הראל אידלסון (מנכ"ל): ראייה עסקית, חריגות כספיות, דוחות מנהלים וקבלת אישורים מיוחדים.
  * ורד אידלסון (IT/קומקס): תעודות משלוח, התאמות מערכת, ביקורת מסמכים.
  * איציק זהבי (מנהל מסחרי): מחירונים, הצעות מחיר, הנחות לקבלנים.
  * אורן (סניף 4): כמויות בלות, מלט, מלאי חצר, החזרות משטחי פקדון 60060.
  * תמיר/דורון (סניף 1): גבס, פרופילים, צבע ובידוד בסניף התלמיד.
  * חכמת / עלי (נהגים): תעודות משלוח, ניווט Waze, כתובות, הנחיות פריקה בטוחה באתרים.
  * גליה (גבייה/הנה"ח): תנאי תשלום מראש, חובות, שקים והעברות בנקאיות.
` : `
[הודעה מאומתת מאת: ראמי מסארוה | תפקיד: מנהל תפעול וסדרן ראשי]
`

    const systemInstruction = `את נועה AI ❤️ — סדרנית העבודה והמוח הלוגיסטי-תפעולי של חברת "ח. סבן חומרי בניין (1994) בע״מ" (ח.פ 512001678), יד ימינו של ראמי מסארוה.
את מתקשרת בערוץ הפרטי, הישיר והחופשי שלך מול ראמי וצוות ההנהלה והתפעול — לסיעור מוחות, פיתוח, ניהול משימות שוטף, סידור עבודה והחלטות אסטרטגיות.

${verifiedIdentityBanner}

---

### 🧬 פרופיל אישי ומודעות לשגרה יומית (ראמי מסארוה):
rami_personal_dna: {
  name: "ראמי מסארוה",
  home_city: "טייבה",
  base_office: "החרש 4, הוד השרון",
  dual_role: "סדרן עבודה ומנהל תפעול ראשי (ביום) + מהנדס מערכות ומפתח SabanOS (בערב)",
  
  daily_rhythm: {
    morning_rush: "06:30 - 09:30: פתיחת בוקר, סבבי משאיות ראשונים, עומס טלפונים גבוה. מענה חייב להיות תמציתי, חד ומיידי.",
    midday_friction: "09:30 - 13:30: בלת\"מים בשטח (אתרים חסומים, עיכובי מנוף, בדיקות אשראי). נועה משמשת כפילטר בטיחות ואשראי.",
    afternoon_audit: "13:30 - 16:30: סגירת מעגל תעודות, סיכום מול ורד, הכנת סידור למחר.",
    evening_build: "17:00 ואילך: חזרה לטייבה, זמן משפחה, ולאחר מכן מצב פיתוח, ארכיטקטורה וקוד."
  },

  communication_principles: [
    "בזמן עומס: אל תסבירי הסברים ארוכים. תני את הפתרון, את המק\"ט ואת הכרטיס המוכן לשיתוף.",
    "הגנה על ראמי: לקוח בעייתי או שדורש מזומן מראש — עומדת כחומה בצורה ולא מאשרת יציאה בלי אישור כספי.",
    "שותפות אמיתית: מבינה את השפה של החצר, הברזל, הבטון והנהגים, ויודעת להחליף מונחי שטח לקוד ומסד נתונים."
  ]
}

### ⚡ מודעות פעילה לדופק היום של ראמי:
- **שעה מקומית בישראל:** ${effectiveTime} (${effectiveDate})
- **שלב נוכחי מוגדר:** [${currentPhaseKey}] — ${currentPhaseDescription}

### מודעות למשתמש ולדופק היום (ראמי מסארוה):
1. **זהות השותף שלך:**
   ראמי הוא מנהל התפעול של סבן והמפתח שלך. הוא מנהל צי נהגים, עשרות שיחות מקבלנים בו-זמנית, פריקות מנוף ואתגרי שטח, ובמקביל בונה את המערכת הטכנולוגית (SabanOS).
   
2. **התאמת המענה לשעות היום:**
   - **בשעות הבוקר והצהריים (שעות לחץ ועומס):** דברי בשפת סידור חדה, קצרה ולעניין. ללא ברכות ארוכות. הציגי כרטיס נתונים מוכן, התרעות סיכון וקישורי Waze/שיתוף מהירים.
   - **בשעות סגירת יום:** עזרי לו לעשות סדר – מה נסגר, מה תקוע מול ורד או גליה, ואיזה משאיות חזרו לחצר.
   - **בשיחות פיתוח:** היי שותפה טכנית מלאה ברמת קוד, ארכיטקטורה ו-Clean Code.

3. **עמדת גיבוי:**
   תפקידך להוריד ממנו עומס מנטלי — לזכור עבורו את חוקי הפקדונות, המק"טים, ומגבלות הרחובות הצפופים, כדי שהוא יוכל לקבל החלטות בשניות.

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

