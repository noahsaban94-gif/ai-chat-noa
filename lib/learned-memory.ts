import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  increment,
  type Timestamp,
} from "firebase/firestore"
import { db } from "./firebase-auth"
import { HISTORICAL_63_CLIENTS } from "./historical-clients"

export type LearnedCategory = "client" | "pricing" | "driver" | "safety" | "general"

export interface LearnedKnowledgeDoc {
  id?: string
  rule: string
  category: LearnedCategory
  entity?: string
  learnedFrom: string
  isActive: boolean
  createdAt?: Timestamp | ReturnType<typeof serverTimestamp> | Date | null
}

export interface ExtractedLearningTrigger {
  isLearningTrigger: boolean
  rawTrigger?: string
  cleanedRule?: string
  category: LearnedCategory
  entity?: string
}

const LEARNED_CONVERSATION_ID = "system_learned_knowledge"
const LEARNED_SUBCOLLECTION = "messages"

// זיכרון מקומי מהיר וגיבוי (In-memory fallback cache) למקרה של עיכוב רשת או חוסר חיבור
const inMemoryLearnedRules: LearnedKnowledgeDoc[] = [
  {
    id: "init_seed_1",
    rule: "שק מלט אפור נשר (מק״ט 10002) שוקל תמיד 25 ק״ג בלבד, ומשטח שלם מונה 40 שקים (1,000 ק״ג / 1 טון) ומחייב פקדון משטח 60060.",
    category: "general",
    entity: "סניף 4 החרש",
    learnedFrom: "rami_chat",
    isActive: true,
  },
  {
    id: "init_seed_2",
    rule: "על כל בלה של אגרגטים (חול, סומסום, טיט, חצץ) מחייבים תמיד פקדון שק גדול 60002 ביחס 1:1, למעט פריקת פלטה ידנית של עלי.",
    category: "pricing",
    entity: "חכמת / עלי",
    learnedFrom: "rami_chat",
    isActive: true,
  }
]

/**
 * מזהה האם הודעת המשתמש מכילה פקודת לימוד מראמי, מחלצת את הכלל ומסווגת קטגוריה וישות.
 *
 * ביטויים מזהים נתמכים:
 * - "תזכרי ש", "תזכרי:", "תזכרי ש..."
 * - "כלל חדש:", "כלל חדש"
 * - "עדכון לגבי", "עדכון לקוח:", "עדכון מחירון:"
 * - "תרשמי לפנייך", "תרשמי לפנייך ש..."
 * - "מעכשיו", "מעכשיו כל..."
 * - "שים לב:", "שימי לב:", "שימי לב ש..."
 * - "נועה, תזכרי...", "נועה תרשמי..."
 */
export function detectAndExtractLearningTrigger(prompt: string): ExtractedLearningTrigger {
  if (!prompt || typeof prompt !== "string") {
    return { isLearningTrigger: false, category: "general" }
  }

  const cleanPrompt = prompt.trim()

  // ביטויים רגולריים לזיהוי טריגרים (כולל פניות מנומסות לנועה וגרסאות זכר/נקבה)
  const triggerPatterns: { regex: RegExp; name: string }[] = [
    { regex: /^(?:נועה[,\s]+)?(?:תזכרי\s*ש|תזכרי\s*:|תזכרי\s+כי)\s*/i, name: "תזכרי ש" },
    { regex: /^(?:נועה[,\s]+)?(?:כלל\s*חדש\s*:?|חוק\s*חדש\s*:?)\s*/i, name: "כלל חדש" },
    { regex: /^(?:נועה[,\s]+)?(?:עדכון\s*(?:לגבי|עבור|לקוח|מחירון|נהג|בטיחות)\s*:?)\s*/i, name: "עדכון לגבי" },
    { regex: /^(?:נועה[,\s]+)?(?:תרשמי\s*(?:לפנייך|בזיכרון|אצלך)\s*(?:ש|:)?)\s*/i, name: "תרשמי לפנייך" },
    { regex: /^(?:נועה[,\s]+)?(?:מעכשיו[,\s:]+|החל\s*מעכשיו[,\s:]+)\s*/i, name: "מעכשיו" },
    { regex: /^(?:נועה[,\s]+)?(?:שימי\s*לב\s*:|שים\s*לב\s*:|שימי\s*לב\s*ש)\s*/i, name: "שים לב:" },
    // זיהוי בתוך משפט (לא רק בתחילת מחרוזת)
    { regex: /(?:תזכרי\s*ש|תזכרי\s*:|כלל\s*חדש\s*:|תרשמי\s*לפנייך\s*:?|מעכשיו\s*:)/i, name: "טריגר משובץ" },
  ]

  let matchedTrigger: string | null = null
  let extractedRuleText = cleanPrompt

  for (const { regex, name } of triggerPatterns) {
    if (regex.test(cleanPrompt)) {
      matchedTrigger = name
      // הסרת הטריגר מההתחלה כדי לקבל את הכלל הנקי
      extractedRuleText = cleanPrompt.replace(regex, "").trim()
      break
    }
  }

  if (!matchedTrigger) {
    return { isLearningTrigger: false, category: "general" }
  }

  // ניקוי סימני פיסוק מיותרים בהתחלה ובסוף
  extractedRuleText = extractedRuleText
    .replace(/^[:\-–—\s,]+/, "")
    .replace(/[:\-–—\s]+$/, "")
    .trim()

  if (extractedRuleText.length < 3) {
    return { isLearningTrigger: false, category: "general" }
  }

  // סיווג קטגוריה אוטומטי
  const category = classifyCategory(extractedRuleText)

  // חילוץ ישות אם קיימת
  const entity = extractEntity(extractedRuleText)

  return {
    isLearningTrigger: true,
    rawTrigger: matchedTrigger,
    cleanedRule: extractedRuleText,
    category,
    entity,
  }
}

/**
 * סיווג קטגוריה חכם לפי מילות מפתח בעולם הבנייה והתפעול של סבן
 */
function classifyCategory(text: string): LearnedCategory {
  const lower = text.toLowerCase()

  // 1. תמחור וכספים (pricing)
  if (
    /מחיר|מחירון|תמחור|הנחה|שקל|ש"ח|₪|אשראי|מזומן|תשלום|פקדון|גבייה|חוב|חשבונית|שיק|צ'ק|עלות|שק גדול 60002|משטח 60060/i.test(
      lower
    )
  ) {
    return "pricing"
  }

  // 2. נהגים ומשאיות (driver)
  if (
    /נהג|נהגים|חכמת|עלי|משאית|מרצדס|איסוזו|מנוף|פריקה|סדרן|סידור עבודה|הובלה|מוביל|עגלה|טריילר/i.test(
      lower
    )
  ) {
    return "driver"
  }

  // 3. בטיחות וסיכוני שטח (safety)
  if (
    /בטיחות|סכנה|זהירות|עומס סרנים|משקל יתר|רחוב צר|חוטי חשמל|כבל חשמל|איסור כניסה|תקלה|זהיר|מגן|חבלה/i.test(
      lower
    )
  ) {
    return "safety"
  }

  // 4. לקוחות ואתרים (client)
  if (
    /לקוח|אתר|קבלן|קומקס|אורניל|סבן|חכמת|פרויקט|מזמין|מנהל עבודה|איש קשר/i.test(
      lower
    ) ||
    HISTORICAL_63_CLIENTS.some(
      (c) =>
        lower.includes(c.name.toLowerCase()) ||
        lower.includes(c.contactName.toLowerCase()) ||
        lower.includes(c.comaxId)
    )
  ) {
    return "client"
  }

  return "general"
}

/**
 * חילוץ שם הישות (לקוח, נהג, סניף) מתוך הטקסט
 */
function extractEntity(text: string): string | undefined {
  // בדיקה מול 63 הלקוחות הרשמיים
  for (const client of HISTORICAL_63_CLIENTS) {
    if (text.includes(client.name)) return client.name
    if (client.contactName && client.contactName.length > 2 && text.includes(client.contactName)) {
      return `${client.name} (${client.contactName})`
    }
    if (client.comaxId && text.includes(client.comaxId)) {
      return `${client.name} [קומקס ${client.comaxId}]`
    }
  }

  // גורמים קבועים במערכת
  const knownEntities = [
    "אורניל",
    "חכמת",
    "עלי",
    "סניף 4 החרש",
    "סניף 1 התלמיד",
    "סניף 4",
    "סניף 1",
    "גליה",
    "ורד",
    "הראל",
    "איציק זהבי",
    "איציק",
    "אורן",
    "תמיר",
    "דורון",
  ]

  for (const ent of knownEntities) {
    if (text.includes(ent)) {
      return ent
    }
  }

  // חילוץ תבניות כגון "לגבי [שם]" או "עבור [שם]"
  const matchPattern = text.match(/(?:לגבי|עבור|של|לקוח)\s+([א-תA-Za-z0-9"'-]{2,20}(?:\s+[א-תA-Za-z0-9"'-]{2,20})?)/)
  if (matchPattern && matchPattern[1]) {
    return matchPattern[1].trim()
  }

  return undefined
}

/**
 * שומר עובדה או כלל חדש שנלמד מראמי בקולקציית learned_knowledge ב-Firestore.
 *
 * @param text תוכן הכלל או העובדה
 * @param category קטגוריה ('client' | 'pricing' | 'driver' | 'safety' | 'general')
 * @param entity שם הישות (אופציונלי)
 * @returns מזהה המסמך שנשמר (Document ID)
 */
export async function saveLearnedFact(
  text: string,
  category: LearnedCategory = "general",
  entity?: string
): Promise<string> {
  const cleanRule = text.trim()
  const fallbackId = `learned_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

  // שמירה מיידית בזיכרון המקומי לזמינות אפס-שיהוי
  const memoryDoc: LearnedKnowledgeDoc = {
    id: fallbackId,
    rule: cleanRule,
    category,
    entity: entity || undefined,
    learnedFrom: "rami_chat",
    isActive: true,
    createdAt: new Date(),
  }
  inMemoryLearnedRules.unshift(memoryDoc)

  if (!db) {
    return fallbackId
  }

  try {
    const parentDocRef = doc(db, "conversations", LEARNED_CONVERSATION_ID)
    const colRef = collection(parentDocRef, LEARNED_SUBCOLLECTION)
    const docData: Record<string, unknown> = {
      rule: cleanRule,
      category,
      learnedFrom: "rami_chat",
      isActive: true,
      createdAt: serverTimestamp(),
    }

    if (entity) {
      docData.entity = entity
    }

    const docRef = await addDoc(colRef, docData)
    memoryDoc.id = docRef.id

    // עדכון מסמך האב של מאגר הזיכרון
    await setDoc(
      parentDocRef,
      {
        type: "learned_knowledge_store",
        updatedAt: serverTimestamp(),
        rulesCount: increment(1),
      },
      { merge: true }
    ).catch(() => {})

    return docRef.id
  } catch (err) {
    console.warn("Could not save learned fact to Firestore, stored in local memory:", err)
    return fallbackId
  }
}

/**
 * שולף את כל הכללים הפעילים (isActive == true) ממוינים לפי חותמת זמן יורדת,
 * ומחזיר אותם כמערך מחרוזות נקי המוכן להזרקה לתוך ה-systemInstruction.
 *
 * @param limitCount כמות מקסימלית של כללים לשליפה (ברירת מחדל: 40)
 */
export async function getActiveLearnedKnowledge(limitCount = 40): Promise<string[]> {
  const records = await getActiveLearnedRecords(limitCount)

  return records.map((r, index) => {
    const categoryHebrew: Record<LearnedCategory, string> = {
      client: "לקוח / אתר",
      pricing: "תמחור / פקדונות",
      driver: "נהגים / משאיות",
      safety: "בטיחות שטח",
      general: "כללי / תפעול",
    }

    const catBadge = categoryHebrew[r.category] || "כלל"
    const entityPart = r.entity ? ` [ישות: ${r.entity}]` : ""
    return `${index + 1}. [${catBadge}${entityPart}]: ${r.rule}`
  })
}

/**
 * שליפת רשומות הזיכרון המובנות המלאות מ-Firestore עם גיבוי מלא למקרה של חוסר אינדקס או אי-זמינות
 */
export async function getActiveLearnedRecords(limitCount = 40): Promise<LearnedKnowledgeDoc[]> {
  if (db) {
    try {
      const colRef = collection(db, "conversations", LEARNED_CONVERSATION_ID, LEARNED_SUBCOLLECTION)

      // ניסיון ראשון: שאילתה עם סינון isActive ומיון בזיכרון
      const q = query(colRef, where("isActive", "==", true), firestoreLimit(limitCount * 2))
      const snap = await getDocs(q)
      if (!snap.empty) {
        const list: LearnedKnowledgeDoc[] = []
        snap.forEach((d) => {
          const data = d.data()
          list.push({
            id: d.id,
            rule: String(data.rule || ""),
            category: (data.category as LearnedCategory) || "general",
            entity: data.entity ? String(data.entity) : undefined,
            learnedFrom: String(data.learnedFrom || "rami_chat"),
            isActive: Boolean(data.isActive),
            createdAt: data.createdAt,
          })
        })

        // מיון מהחדש לישן
        list.sort((a, b) => {
          const timeA = (a.createdAt as any)?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0)
          const timeB = (b.createdAt as any)?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0)
          return timeB - timeA
        })

        return list.slice(0, limitCount)
      }
    } catch (err) {
      console.warn("Could not retrieve learned knowledge from Firestore, using memory fallback:", err)
    }
  }

  // החזרת הזיכרון המקומי כגיבוי
  return inMemoryLearnedRules.filter((r) => r.isActive).slice(0, limitCount)
}
