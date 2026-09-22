import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  onSnapshot,
  increment,
  type Timestamp,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./firebase-auth"

export type DeviceType = "pc" | "samsung_mobile" | "whatsapp"
export type MessageRole = "user" | "model"

/**
 * מודל מסמך שיחה ראשי (קולקציית conversations)
 */
export interface ConversationDocument {
  userId: string
  userName: string
  userRole: string
  updatedAt: Timestamp | ReturnType<typeof serverTimestamp>
  createdAt?: Timestamp | ReturnType<typeof serverTimestamp>
  activeDevice: DeviceType
  summaryContext: string
  messageCount?: number
}

/**
 * מודל מסמך הודעה (תת-קולקציה messages)
 */
export interface MessageDocument {
  id?: string
  role: MessageRole
  text: string
  timestamp: Timestamp | ReturnType<typeof serverTimestamp> | null
  device: DeviceType
  isNormalizedOrder: boolean
  orderData?: Record<string, unknown>
}

/**
 * מבנה תוכן תואם Gemini API
 */
export interface GeminiContentPart {
  text: string
}

export interface GeminiContent {
  role: "user" | "model"
  parts: GeminiContentPart[]
}

/**
 * זיהוי אוטומטי של סוג המכשיר (PC מול סמסונג מובייל / וואטסאפ)
 */
export function detectDevice(): DeviceType {
  if (typeof window === "undefined" || !window.navigator) {
    return "pc"
  }
  const ua = window.navigator.userAgent || ""
  if (/SM-|Samsung|Android/i.test(ua)) {
    return "samsung_mobile"
  }
  if (/WhatsApp/i.test(ua)) {
    return "whatsapp"
  }
  if (/Mobi|iPhone|iPad/i.test(ua)) {
    return "samsung_mobile"
  }
  return "pc"
}

/**
 * שמירת הודעה חדשה ב-Firestore ועדכון חותמת הזמן והמכשיר הפעיל בשיחה
 * 
 * @param sessionId מזהה השיחה (למשל: user_0508860896_active)
 * @param role תפקיד ההודעה ('user' או 'model')
 * @param text תוכן ההודעה
 * @param device סוג המכשיר שממנו נשלחה ההודעה ('pc' | 'samsung_mobile' | 'whatsapp')
 * @param isNormalizedOrder האם זוהתה כהזמנה מנורמלת
 * @param orderData מטא-דאטה מובנה של ההזמנה (אופציונלי)
 * @param userMeta פרטי המשתמש לעדכון מסמך האב
 */
export async function saveMessage(
  sessionId: string,
  role: MessageRole,
  text: string,
  device: DeviceType = "pc",
  isNormalizedOrder: boolean = false,
  orderData?: Record<string, unknown>,
  userMeta?: { userId?: string; userName?: string; userRole?: string }
): Promise<string> {
  if (!db) {
    throw new Error("Firestore client is not initialized")
  }

  const conversationRef = doc(db, "conversations", sessionId)
  const messagesCollectionRef = collection(conversationRef, "messages")

  const nowTimestamp = serverTimestamp()

  // 1. שמירת ההודעה בתת-הקולקציה messages
  const messageData: Omit<MessageDocument, "id"> = {
    role,
    text,
    timestamp: nowTimestamp,
    device,
    isNormalizedOrder,
    ...(orderData ? { orderData } : {}),
  }

  const newDocRef = await addDoc(messagesCollectionRef, messageData)

  // 2. עדכון מסמך האב של השיחה (או יצירתו עם ערכי ברירת מחדל אם אינו קיים)
  await setDoc(
    conversationRef,
    {
      userId: userMeta?.userId || sessionId.replace(/^user_/, "").replace(/_active$/, ""),
      userName: userMeta?.userName || "ראמי מסארוה",
      userRole: userMeta?.userRole || "מנהל תפעול וסדרן ראשי",
      updatedAt: nowTimestamp,
      activeDevice: device,
      messageCount: increment(1),
      summaryContext: "",
    },
    { merge: true }
  )

  return newDocRef.id
}

/**
 * שליפת N ההודעות האחרונות בסדר כרונולוגי עולה (Sliding Window)
 * משמש להזנת Gemini API בתוך מגבלת ה-Tokens
 * 
 * @param sessionId מזהה השיחה
 * @param limitCount כמות ההודעות לשליפה (ברירת מחדל: 15)
 */
export async function getRecentContext(
  sessionId: string,
  limitCount: number = 15
): Promise<MessageDocument[]> {
  if (!db) {
    throw new Error("Firestore client is not initialized")
  }

  const messagesRef = collection(db, "conversations", sessionId, "messages")
  // שולפים N הודעות אחרונות לפי חותמת זמן יורדת
  const q = query(messagesRef, orderBy("timestamp", "desc"), firestoreLimit(limitCount))

  const querySnapshot = await getDocs(q)
  const messages: MessageDocument[] = []

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data() as Omit<MessageDocument, "id">
    messages.push({
      id: docSnap.id,
      role: data.role,
      text: data.text,
      timestamp: data.timestamp,
      device: data.device,
      isNormalizedOrder: Boolean(data.isNormalizedOrder),
      orderData: data.orderData,
    })
  })

  // הופכים את המערך כדי לקבל סדר כרונולוגי עולה (מהישן לחדש) עבור המודל
  return messages.reverse()
}

/**
 * המרה מדויקת של מסמכי ההודעות מ-Firestore למבנה ה-contents הנדרש ע"י Gemini API
 * מקפיד על חלוקת תפקידים תקינה (user / model) ומנקה הודעות ריקות
 * 
 * @param messages רשימת הודעות מסודרות כרונולוגית
 */
export function formatForGemini(messages: MessageDocument[]): GeminiContent[] {
  const contents: GeminiContent[] = []

  for (const msg of messages) {
    if (!msg.text || !msg.text.trim()) continue

    const validRole: "user" | "model" = msg.role === "model" ? "model" : "user"

    // אם ההודעה האחרונה הייתה של אותו גורם (למשל 2 הודעות user רצופות), ממזגים את התוכן
    const lastContent = contents[contents.length - 1]
    if (lastContent && lastContent.role === validRole) {
      lastContent.parts.push({ text: msg.text })
    } else {
      contents.push({
        role: validRole,
        parts: [{ text: msg.text }],
      })
    }
  }

  return contents
}

/**
 * מאזין בזמן אמת (onSnapshot) לשיחה המאפשר למחשב ולנייד (Samsung) להציג עדכונים מיידית
 * 
 * @param sessionId מזהה השיחה
 * @param callback פונקציה המקבלת את רשימת ההודעות העדכנית
 * @param limitCount כמות הודעות להאזנה (ברירת מחדל: 50)
 * @returns פונקציית ביטול הרשמה (Unsubscribe)
 */
export function listenToConversation(
  sessionId: string,
  callback: (messages: MessageDocument[]) => void,
  limitCount: number = 50
): Unsubscribe {
  if (!db) {
    console.warn("Firestore client is not initialized for real-time listener")
    return () => {}
  }

  const messagesRef = collection(db, "conversations", sessionId, "messages")
  const q = query(messagesRef, orderBy("timestamp", "desc"), firestoreLimit(limitCount))

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: MessageDocument[] = []
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<MessageDocument, "id">
        msgs.push({
          id: docSnap.id,
          role: data.role,
          text: data.text,
          timestamp: data.timestamp,
          device: data.device,
          isNormalizedOrder: Boolean(data.isNormalizedOrder),
          orderData: data.orderData,
        })
      })

      // סדר כרונולוגי עולה לתצוגה חלקה בממשק
      callback(msgs.reverse())
    },
    (error) => {
      console.error(`Error listening to conversation ${sessionId}:`, error)
    }
  )
}

export const ACTIVE_SESSION_ID = "user_0508860896_active"

/**
 * המרת מסמך הודעה מ-Firestore לאובייקט Message של ממשק המשתמש
 */
export function messageDocumentToUIMessage(doc: MessageDocument): {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
  device?: DeviceType
  isNormalizedOrder?: boolean
} {
  let createdDate = new Date()
  if (doc.timestamp) {
    if (typeof (doc.timestamp as { toDate?: () => Date }).toDate === "function") {
      createdDate = (doc.timestamp as { toDate: () => Date }).toDate()
    } else if (doc.timestamp instanceof Date) {
      createdDate = doc.timestamp
    }
  }

  return {
    id: doc.id || `msg_${Math.random().toString(36).substring(2, 9)}`,
    role: doc.role === "model" ? "assistant" : "user",
    content: doc.text,
    createdAt: createdDate,
    device: doc.device,
    isNormalizedOrder: doc.isNormalizedOrder,
  }
}

