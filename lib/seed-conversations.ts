import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from "firebase/firestore"
import { db } from "./firebase-auth"

export const ACTIVE_SESSION_ID = "user_0508860896_active"

export interface SeedMessage {
  role: "user" | "model"
  text: string
  device: "pc" | "samsung_mobile" | "whatsapp"
  isNormalizedOrder: boolean
  minutesAgo: number
}

export const INITIAL_CONVERSATION_MESSAGES: SeedMessage[] = [
  {
    role: "user",
    text: "בוקר טוב נועה ❤️ מה הלו״ז ותמונת המצב של המשאיות והאספקות להיום?",
    device: "samsung_mobile",
    isNormalizedOrder: false,
    minutesAgo: 60,
  },
  {
    role: "model",
    text: `**בוקר אור ראמי שלי! ❤️ המערכת דרוכה ומוכנה.**

הנה תמונת המצב המבצעית לבוקר זה בח. סבן חומרי בניין:

🏗️ **חכמת (מרצדס מנוף 615-41-002) — סבבי בוקר מסניף 4 החרש:**
* **סבב 1 (07:30):** אחמד אבו חדר (שחף 9 הוד השרון) — 3 בלות חול (מק״ט 11501) + 3 פקדון (מק״ט 60002).
* **סבב 2 (09:45):** הדר וילות (הנשיא 42 הרצליה פיתוח) — משטח מלט 40 שקים (מק״ט 10002) + משטח סבן פקדון (מק״ט 60060). פריקה מורכבת מעבר לחומת אבן לבריכה.

🚚 **עלי (איסוזו חלוקה 654-51-701) — סבבים מסניף 1 התלמיד:**
* **סבב 1 (08:00):** שיכון דן (משמר הירדן 54 ת״א) — לוחות גבס לבן 260 (מק״ט 111260) + מסלולים וניצבים 50.
* **סבב 2 (10:30):** הדר יוסף (שלונסקי 28 ת״א) — פרויקט תמ״א 38.

📦 **מצב חצר ומלאי (סניף 4 - אורן):**
* 45 בלות חול מוכנות להעמסה, 30 בלות סומסום, 160 שקי מלט נשר.
* עומס מלגזות סביר בחצר החרש.

💰 **סמכות מסחרית:**
* איציק זהבי סוגר הצעת מחיר מיוחדת לבלוקים וטיח מול קבלן בהוד השרון.

---
🔘 \`[ 🚚 אשר סבבי מנוף לחכמת ]\`  
🔘 \`[ 📋 סנכרן תעודות משלוח מול ורד ]\`  
🔘 \`[ 🧱 בדוק סטטוס מלאי מלט ובלות ]\``,
    device: "pc",
    isNormalizedOrder: false,
    minutesAgo: 58,
  },
  {
    role: "user",
    text: "מעולה. עבד מהפרויקט של זבולון התקשר עכשיו, צריך לחורש 21 כפר שמריהו דחוף 3 בלות חול ומשטח מלט 40 שקים. להרים מעבר לגדר לחצר אחורית. שחכמת ייקח את זה בסבב הצהריים.",
    device: "samsung_mobile",
    isNormalizedOrder: true,
    minutesAgo: 45,
  },
  {
    role: "model",
    text: `**ההזמנה נקלטה ונרמלה במלואה, ראמי! 🫡 שובצה לחכמת לסבב צהריים (סבב 3 בשעה 12:15).**

נועה ❤️ | כרטיס סידור והזמנה
──────────
👤 לקוח קומקס: 607145 — זבולון-עדירן/הופמן
📍 כתובת אתר: החורש 21, כפר שמריהו (השרון)
📞 איש קשר: עבד (050-6620013)
🧭 ניווט Waze: https://waze.com/ul?ll=32.188,34.821&navigate=yes
──────────
⚠️ בקרת אתר ותשלום:
• סטטוס תשלום: שוטף + 30 (מאושר אשראי)
• מורכבות אתר: שער כניסה רחב, פריקה מעבר לגדר לחצר האחורית
• חלון זמן מועדף: 11:30 - 14:00
• זמן פריקה משוער: 25 דקות
──────────
📦 מוצרים מנורמלים ומק\"טים:
1. מק״ט 11501 | חול שק גדול (בלה) | כמות: 3
2. מק״ט 10002 | מלט אפור 25 ק״ג נשר | כמות: 40 (משטח שלם)
3. מק״ט 60002 | שק גדול פקדון (בלה) | כמות: 3 (יחס 1:1)
4. מק״ט 60060 | משטח סבן פקדון | כמות: 1 (עבור 40 שקים)
• הובלה: מק״ט 18060 (הובלת מנוף הרצליה-רמה״ש/כפר שמריהו) | כמות: 1
──────────
🚚 שיבוץ מבצעי:
• מחסן מוצא: 🏭 4 (החרש)
• נהג: חכמת (מרצדס מנוף 615-41-002)
• הנחיית נהג: להרים בזהירות מעבר לגדר לחצר האחורית

---
🔘 \`[ 📱 שדר כרטיס לוואטסאפ של חכמת ]\`  
🔘 \`[ 🏭 הודע לאורן בחצר להכין משטח ]\`  
🔘 \`[ 📑 הנפק תעודת משלוח בקומקס ]\``,
    device: "pc",
    isNormalizedOrder: true,
    minutesAgo: 43,
  },
  {
    role: "user",
    text: "תבדקי לי מה קורה עם ההזמנה של תל אביב בינוי לדיזנגוף 182, שילמו כבר?",
    device: "samsung_mobile",
    isNormalizedOrder: false,
    minutesAgo: 30,
  },
  {
    role: "model",
    text: `**בדיקה בוצעה מידית ראמי — עצור העמסה! ⛔**

הנה הממצאים מול הנהלת חשבונות ונתוני האתר:
* 👤 **לקוח:** תל אביב בינוי (לקוח קומקס 40210 - דיזנגוף 182 ת״א).
* 💰 **תנאי תשלום:** **מזומן / אשראי מראש**!
* ⚠️ **סטטוס תשלום:** גליה ולינה בהנה״ח מאשרות שטרם הוסדר תשלום בכרטיס או העברה בנקאית.
* 🛑 **התרעת אתר בעייתי (דיזנגוף 182):**
  - נתיב תחבורה ציבורית (נת״צ) עם אכיפת מצלמות עירייה מחמירה.
  - סכנת קנס כבד בעצירה ללא אישור פריקה מוסדר.
  - חלון פריקה מאושר: 09:30–11:30 בלבד.

**המלצה תפעולית:** המשאית לא יוצאת עד לקבלת אישור סופי מהראל או מלינה, ובכל מקרה יש לתאם את חלון הפריקה במדויק.

---
🔘 \`[ 📞 תזכר את איש הקשר בדיזנגוף להסדיר תשלום ]\`  
🔘 \`[ 💬 בדוק מול לינה אם הגיעה אסמכתא ]\`  
🔘 \`[ 🚚 העבר את חכמת לסבב חלופי ]\``,
    device: "pc",
    isNormalizedOrder: false,
    minutesAgo: 28,
  },
  {
    role: "user",
    text: "כל הכבוד נועה על העירנות! תזכרי שאנחנו שמים היום דגש גם על סגירת תעודות פתוחות מול ורד, וגם מעקב אחרי החזרת משטחי פקדון ריקים לסניף 4.",
    device: "samsung_mobile",
    isNormalizedOrder: false,
    minutesAgo: 15,
  },
  {
    role: "model",
    text: `**רשום ונעול בזיכרון התפעולי שלי ראמי! 🔒❤️**

ריכזתי עבורך את שני היעדים המרכזיים להיום:

1. 📑 **סגירת תעודות מול ורד (IT וביקורת):**
   * סנכרון תעודות משלוח חתומות של אתמול והיום מול קומקס.
   * ווידוא שאין תעודות שנשארו פתוחות ללא חתימת מקבל בשטח.

2. 🪵 **בקרת פקדונות משטחים (מק״ט 60060):**
   * אורן בחצר 4 ערוך לקלוט את המשטחים הריקים שחכמת ועלי מחזירים בסוף הסבבים.
   * כל החזרה תזוכה במערכת ביחס 1:1 כנגד תעודת החזרה מסודרת.

אני כאן איתך ברצף שיחה מלא — בין אם אתה ליד המחשב או בנייד סמסונג בשטח. כל תנועה מתועדת ומסונכרנת בענן! 🚀

---
🔘 \`[ 📊 הצג דוח תעודות פתוחות להיום ]\`  
🔘 \`[ 🪵 בדוק יתרת משטחי פקדון בסניף 4 ]\`  
🔘 \`[ 🚚 סטטוס נהגים נוכחי בזמן אמת ]\``,
    device: "pc",
    isNormalizedOrder: false,
    minutesAgo: 13,
  },
]

/**
 * הזרקת נתוני השיחה ההתחלתית ל-Cloud Firestore
 * כדי שנועה תזכור את כל ההקשר התפעולי של סבן, ראמי, המשאיות והלקוחות
 */
export async function seedFirestoreConversations(force: boolean = false): Promise<{
  success: boolean
  count: number
  message: string
}> {
  if (!db) {
    return {
      success: false,
      count: 0,
      message: "לקוח Firestore אינו מאותחל בסביבה זו.",
    }
  }

  try {
    const conversationRef = doc(db, "conversations", ACTIVE_SESSION_ID)
    const messagesCollectionRef = collection(conversationRef, "messages")

    // בדיקה אם כבר קיימות הודעות בקולקציה (אלא אם התבקש force=true)
    if (!force) {
      const existingSnap = await getDocs(messagesCollectionRef)
      if (!existingSnap.empty) {
        return {
          success: true,
          count: existingSnap.size,
          message: `ב-Firestore כבר קיימות ${existingSnap.size} הודעות שמורות. הזיכרון טעון ופעיל.`,
        }
      }
    }

    const nowMs = Date.now()
    const batch = writeBatch(db)

    // 1. עדכון מסמך השיחה הראשי
    batch.set(
      conversationRef,
      {
        userId: "0508860896",
        userName: "ראמי מסארוה",
        userRole: "מנהל תפעול וסדרן ראשי",
        activeDevice: "samsung_mobile",
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        messageCount: INITIAL_CONVERSATION_MESSAGES.length,
        summaryContext:
          "שיחת בוקר פעילה עם ראמי מסארוה: חכמת (מרצדס מנוף) מבצע סבבים להוד השרון, הרצליה פיתוח וכפר שמריהו (החורש 21 - עבד). עלי (איסוזו) בקו גבס לתל אביב. הזמנת דיזנגוף 182 נעצרה עקב תנאי תשלום מראש ואתר בעייתי בנת״צ. דגש על סגירת תעודות מול ורד ובקרת משטחי פקדון 60060 אצל אורן בחצר 4.",
      },
      { merge: true }
    )

    // 2. הזרקת ההודעות עם חותמות זמן מדורגות לאחור
    for (let i = 0; i < INITIAL_CONVERSATION_MESSAGES.length; i++) {
      const item = INITIAL_CONVERSATION_MESSAGES[i]
      const msgDocRef = doc(messagesCollectionRef)
      const msgDate = new Date(nowMs - item.minutesAgo * 60 * 1000)

      batch.set(msgDocRef, {
        role: item.role,
        text: item.text,
        timestamp: Timestamp.fromDate(msgDate),
        device: item.device,
        isNormalizedOrder: item.isNormalizedOrder,
      })
    }

    await batch.commit()

    return {
      success: true,
      count: INITIAL_CONVERSATION_MESSAGES.length,
      message: `הוזרקו בהצלחה ${INITIAL_CONVERSATION_MESSAGES.length} הודעות ל-Cloud Firestore. הזיכרון ההיסטורי של נועה הופעל!`,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.warn("Seeding Firestore conversation skipped:", errorMsg)
    return {
      success: false,
      count: 0,
      message: `שמירה בענן אינה זמינה כעת: ${errorMsg}`,
    }
  }
}
