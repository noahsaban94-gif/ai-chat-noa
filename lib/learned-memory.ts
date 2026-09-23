import { initializeApp, getApps, getApp } from "firebase/app"
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  limit as firestoreLimit,
} from "firebase/firestore"
import { HISTORICAL_63_CLIENTS } from "./historical-clients"

// הגדרות Firebase מחייבות וסביבת Node.js Server Runtime
const firebaseConfig = {
  projectId: "gen-lang-client-0128713331",
  appId: "1:1091656935060:web:a7c1fba39af94a20fc3681",
  apiKey: "AIzaSyDyK1mBNz5ynUw-YAY1qadVh1XQXHVLbqM",
  authDomain: "gen-lang-client-0128713331.firebaseapp.com",
}

// אתחול עצמאי ומובטח של Firebase Client התואם סביבת Node.js (ללא שום תלות ב-window)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
export const serverDb = getFirestore(app)

export interface LearnedFact {
  id?: string
  rule: string
  category: string
  entity: string
  learnedFrom: string
  isActive: boolean
  createdAt: any
}

// ממשק תואם לאחור עבור בדיקות וטריגרים
export type LearnedCategory = "client" | "pricing" | "driver" | "safety" | "general"
export type LearnedKnowledgeDoc = LearnedFact

export interface ExtractedLearningTrigger {
  isLearningTrigger: boolean
  rule: string
  cleanedRule?: string // תאימות לאחור
  category: string
  entity: string
  rawTrigger?: string
}

let isBootstrapped = false

/**
 * שמירה פיזית מאובטחת בענן ב-Firestore
 */
export async function saveLearnedFact(
  rule: string,
  category: string = "general",
  entity: string = ""
): Promise<string> {
  const cleanRule = rule.trim()
  const cleanCategory = (category || "general").trim()
  const cleanEntity = (entity || "").trim()

  console.log("🔥 [saveLearnedFact] מתחיל שמירה בענן:", {
    rule: cleanRule,
    category: cleanCategory,
    entity: cleanEntity,
  })

  try {
    const colRef = collection(serverDb, "learned_knowledge")
    const docRef = await addDoc(colRef, {
      rule: cleanRule,
      category: cleanCategory,
      entity: cleanEntity,
      learnedFrom: "rami_chat",
      isActive: true,
      createdAt: serverTimestamp(),
    })

    console.log(`✅ [saveLearnedFact] נשמר בהצלחה ב-Firestore בענן! ID: ${docRef.id}`)
    return docRef.id
  } catch (error) {
    console.error("❌ [saveLearnedFact] שגיאה קריטית בשמירה ל-Firestore:", error)
    throw error
  }
}

/**
 * פונקציית זיהוי וחילוץ גמישה של פקודות וטריגרי לימוד מראמי
 * תומכת בביטויים מגוונים:
 * "תזכרי ש", "תזכרי:", "תזכרי", "כלל חדש:", "עדכון לגבי", "עדכון לקוח:", "החדש של", "תרשמי לפנייך", "מעכשיו", "שימי לב:"
 */
export function detectAndExtractLearningTrigger(prompt: string): ExtractedLearningTrigger {
  if (!prompt || typeof prompt !== "string") {
    return { isLearningTrigger: false, rule: "", category: "general", entity: "" }
  }

  const cleanPrompt = prompt.trim()

  // ביטויים רגולריים לחילוץ טריגרים
  const triggerPatterns: { regex: RegExp; name: string }[] = [
    { regex: /^(?:נועה[,\s]+)?(?:תזכרי\s*ש|תזכרי\s*:|תזכרי\s+כי|תזכרי)\s*/i, name: "תזכרי" },
    { regex: /^(?:נועה[,\s]+)?(?:כלל\s*חדש\s*:?|חוק\s*חדש\s*:?)\s*/i, name: "כלל חדש:" },
    { regex: /^(?:נועה[,\s]+)?(?:עדכון\s*לקוח\s*:?)\s*/i, name: "עדכון לקוח:" },
    { regex: /^(?:נועה[,\s]+)?(?:עדכון\s*(?:לגבי|עבור|מחירון|נהג|בטיחות|אתר)\s*:?)\s*/i, name: "עדכון לגבי" },
    { regex: /^(?:נועה[,\s]+)?(?:החדש\s*של\s*:?)\s*/i, name: "החדש של" },
    { regex: /^(?:נועה[,\s]+)?(?:תרשמי\s*(?:לפנייך|בזיכרון|אצלך)\s*(?:ש|:)?)\s*/i, name: "תרשמי לפנייך" },
    { regex: /^(?:נועה[,\s]+)?(?:מעכשיו[,\s:]+|החל\s*מעכשיו[,\s:]+)\s*/i, name: "מעכשיו" },
    { regex: /^(?:נועה[,\s]+)?(?:שימי\s*לב\s*:|שים\s*לב\s*:|שימי\s*לב\s*ש)\s*/i, name: "שימי לב:" },
    // חיפוש בתוך משפט (לא רק בתחילת מחרוזת)
    { regex: /(?:תזכרי\s*ש|תזכרי\s*:|כלל\s*חדש\s*:|תרשמי\s*לפנייך\s*:?|מעכשיו\s*:|עדכון\s*לקוח\s*:)/i, name: "טריגר משובץ" },
  ]

  let matchedTrigger: string | null = null
  let extractedRuleText = cleanPrompt

  for (const { regex, name } of triggerPatterns) {
    if (regex.test(cleanPrompt)) {
      matchedTrigger = name
      extractedRuleText = cleanPrompt.replace(regex, "").trim()
      break
    }
  }

  if (!matchedTrigger) {
    return { isLearningTrigger: false, rule: "", category: "general", entity: "" }
  }

  // ניקוי סימני פיסוק מהקצוות
  extractedRuleText = extractedRuleText
    .replace(/^[:\-–—\s,]+/, "")
    .replace(/[:\-–—\s]+$/, "")
    .trim()

  if (extractedRuleText.length < 3) {
    return { isLearningTrigger: false, rule: "", category: "general", entity: "" }
  }

  const category = classifyCategory(extractedRuleText)
  const entity = extractEntity(extractedRuleText) || ""

  return {
    isLearningTrigger: true,
    rule: extractedRuleText,
    cleanedRule: extractedRuleText,
    category,
    entity,
    rawTrigger: matchedTrigger,
  }
}

/**
 * סיווג קטגוריה חכם לפי מילות מפתח
 */
function classifyCategory(text: string): string {
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
    /לקוח|אתר|קבלן|קומקס|גלעד קדם|ד\.?ניב|חכמת|פרויקט|מזמין|מנהל עבודה|איש קשר/i.test(
      lower
    ) ||
    HISTORICAL_63_CLIENTS.some(
      (c) =>
        lower.includes(c.name.toLowerCase()) ||
        (c.contactName && lower.includes(c.contactName.toLowerCase())) ||
        (c.comaxId && lower.includes(c.comaxId))
    )
  ) {
    return "client"
  }

  return "general"
}

/**
 * חילוץ שם הישות (כגון "גלעד קדם", "ד.ניב", "חכמת", "עלי", וכו')
 */
function extractEntity(text: string): string | undefined {
  // בדיקה של לקוחות בולטים מבוקשים
  if (/גלעד\s*קדם/i.test(text)) return "גלעד קדם"
  if (/ד\.?\s*ניב/i.test(text)) return "ד.ניב"
  if (/חכמת/i.test(text)) return "חכמת"
  if (/עלי/i.test(text)) return "עלי"

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

  // גורמים קבועים במערכת סבן
  const knownEntities = [
    "אורניל",
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
  const matchPattern = text.match(/(?:לגבי|עבור|של|לקוח)\s+([א-תA-Za-z0-9"'.]{2,20}(?:\s+[א-תA-Za-z0-9"'.]{2,20})?)/)
  if (matchPattern && matchPattern[1]) {
    return matchPattern[1].trim()
  }

  return undefined
}

/**
 * פונקציית אתחול ראשוני:
 * אם הקולקציה ריקה, מייצרת מיד מסמך ראשון:
 * rule: "גלעד קדם (הוד השרון) — מספר טלפון מעודכן באתר: 054-9998877", category: "client", entity: "גלעד קדם".
 * גורמת לקולקציה להופיע ב-Firebase Console מיידית!
 */
export async function ensureLearnedKnowledgeBootstrapped(): Promise<boolean> {
  if (isBootstrapped) return true

  try {
    const colRef = collection(serverDb, "learned_knowledge")
    const snap = await getDocs(query(colRef, firestoreLimit(1)))

    if (snap.empty) {
      console.log("🌱 [ensureLearnedKnowledgeBootstrapped] הקולקציה learned_knowledge ריקה. מבצע אתחול מסמך ראשון בענן...")
      await saveLearnedFact(
        "גלעד קדם (הוד השרון) — מספר טלפון מעודכן באתר: 054-9998877",
        "client",
        "גלעד קדם"
      )
      console.log("🌱 [ensureLearnedKnowledgeBootstrapped] מסמך ראשון נשמר בהצלחה! הקולקציה זמינה ב-Firebase Console.")
    } else {
      console.log("🌱 [ensureLearnedKnowledgeBootstrapped] הקולקציה learned_knowledge קיימת ומאוכלסת ב-Firestore.")
    }

    isBootstrapped = true
    return true
  } catch (error) {
    console.error("⚠️ [ensureLearnedKnowledgeBootstrapped] שגיאה בבדיקה/אתחול הקולקציה:", error)
    return false
  }
}

/**
 * שולף את כל הכללים שבהם isActive == true ממוינים לפי createdAt desc ומחזיר מערך מחרוזות
 */
export async function getActiveLearnedKnowledge(limitCount = 40): Promise<string[]> {
  try {
    const colRef = collection(serverDb, "learned_knowledge")
    const q = query(
      colRef,
      where("isActive", "==", true),
      firestoreLimit(limitCount * 2)
    )
    const snap = await getDocs(q)

    if (snap.empty) {
      return []
    }

    const facts: LearnedFact[] = []
    snap.forEach((d) => {
      const data = d.data()
      facts.push({
        id: d.id,
        rule: String(data.rule || ""),
        category: String(data.category || "general"),
        entity: String(data.entity || ""),
        learnedFrom: String(data.learnedFrom || "rami_chat"),
        isActive: Boolean(data.isActive),
        createdAt: data.createdAt,
      })
    })

    // מיון לפי createdAt יורד (החדש ביותר ראשון)
    facts.sort((a, b) => {
      const timeA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0)
      const timeB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0)
      return timeB - timeA
    })

    const categoryHebrew: Record<string, string> = {
      client: "לקוח / אתר",
      pricing: "תמחור / פקדונות",
      driver: "נהגים / משאיות",
      safety: "בטיחות שטח",
      general: "כללי / תפעול",
    }

    return facts.slice(0, limitCount).map((r, index) => {
      const catBadge = categoryHebrew[r.category] || r.category || "כלל"
      const entityPart = r.entity ? ` [ישות: ${r.entity}]` : ""
      return `${index + 1}. [${catBadge}${entityPart}]: ${r.rule}`
    })
  } catch (error) {
    console.error("❌ [getActiveLearnedKnowledge] שגיאה בשליפת כללים מ-Firestore:", error)
    return []
  }
}

/**
 * שליפת רשומות מלאות אם נדרש
 */
export async function getActiveLearnedRecords(limitCount = 40): Promise<LearnedFact[]> {
  try {
    const colRef = collection(serverDb, "learned_knowledge")
    const q = query(
      colRef,
      where("isActive", "==", true),
      firestoreLimit(limitCount * 2)
    )
    const snap = await getDocs(q)
    const facts: LearnedFact[] = []

    snap.forEach((d) => {
      const data = d.data()
      facts.push({
        id: d.id,
        rule: String(data.rule || ""),
        category: String(data.category || "general"),
        entity: String(data.entity || ""),
        learnedFrom: String(data.learnedFrom || "rami_chat"),
        isActive: Boolean(data.isActive),
        createdAt: data.createdAt,
      })
    })

    facts.sort((a, b) => {
      const timeA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0)
      const timeB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0)
      return timeB - timeA
    })

    return facts.slice(0, limitCount)
  } catch (err) {
    console.error("❌ [getActiveLearnedRecords] שגיאה בשליפת רשומות:", err)
    return []
  }
}
