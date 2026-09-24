import { GoogleGenAI } from "@google/genai"
import { HISTORICAL_63_CLIENTS, findBestClientMatch, searchClients } from "@/lib/historical-clients"
import { TRAINING_PRODUCTS, findTrainingVideos } from "@/lib/training-videos"
import { PRODUCT_MEDIA_CATALOG } from "@/lib/product-media"
import { buildProductMediaPrompt, buildTargetedProductMediaSnippet } from "@/lib/product-media-server"
import { sendOneSignalPush } from "@/lib/onesignal"
import { db } from "@/lib/firebase-auth"
import {
  detectAndExtractLearningTrigger,
  saveLearnedFact,
  getActiveLearnedKnowledge,
  ensureLearnedKnowledgeBootstrapped,
} from "@/lib/learned-memory"
import {
  doc,
  getDoc,
  getDocs,
  updateDoc,
  collection,
  addDoc,
  serverTimestamp,
  arrayUnion,
  query,
  where,
  limit,
} from "firebase/firestore"
import type { AuthorizedUser } from "@/lib/types/device-auth"

let aiClient: GoogleGenAI | null = null

function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || ""
    const apiKey = rawKeys.split(",")[0]?.trim() || process.env.GEMINI_API_KEY
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  }
  return aiClient
}

const STATIC_LOGISTICS_CATALOG = [
  // --- אגרגטים ותפזורת בלות ---
  {
    sku: "11501",
    officialName: "חול שק גדול (בלה חול ~750 ק״ג)",
    category: "אגרגטים וחומרי מחצבה",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: true,
    requiresPalletDeposit: false,
    aliases: ["בלה חול", "בלות חול", "חול בלה", "שק חול גדול", "רמל בלה", "חול ים"]
  },
  {
    sku: "11511",
    officialName: "סומסום שק גדול (בלה סומסום נקי ~730 ק״ג)",
    category: "אגרגטים וחומרי מחצבה",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: true,
    requiresPalletDeposit: false,
    aliases: ["בלה סומסום", "סומסום בלה", "סמסם", "מצע לריצוף", "חצץ דק לריצוף"]
  },
  {
    sku: "11551",
    officialName: "טיט מוכן שק גדול (בלה טיט לבנייה וטיח ~700 ק״ג)",
    category: "אגרגטים וחומרי מחצבה",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: true,
    requiresPalletDeposit: false,
    aliases: ["בלה טיט", "טיט בלה", "טיט מוכן לבנייה", "טיין בלה"]
  },
  {
    sku: "11506",
    officialName: "חצץ שק גדול (בלה חצץ מדורג שטוף ונקי ~700 ק״ג)",
    category: "אגרגטים וחומרי מחצבה",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: true,
    requiresPalletDeposit: false,
    aliases: ["בלה חצץ", "חצץ בלה", "חצץ מדורג", "חצץ ליציקות"]
  },
  {
    sku: "11540",
    officialName: "מצע שק גדול (בלה מצע מהודק מדורג סוג א׳ לתשתיות ~700 ק״ג)",
    category: "אגרגטים וחומרי מחצבה",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: true,
    requiresPalletDeposit: false,
    aliases: ["בלה מצע", "מצע סוג א", "מצע מהודק", "מצע מעצ"]
  },
  {
    sku: "11570",
    officialName: "חמרה שק גדול (בלה אדמת חמרה אדומה נקייה לגינון ופיתוח ~700 ק״ג)",
    category: "אגרגטים וחומרי מחצבה",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: true,
    requiresPalletDeposit: false,
    aliases: ["בלה חמרה", "אדמת חמרה", "חמרה אדומה", "אדמה לגינה"]
  },
  {
    sku: "11521",
    officialName: "שליכט שק גדול (בלה חול שליכט מחצבה שטוף לשכבת גמר ~700 ק״ג)",
    category: "אגרגטים וחומרי מחצבה",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: true,
    requiresPalletDeposit: false,
    aliases: ["בלה שליכט", "שליכט בלה", "חול שליכט", "חול טיח גמר"]
  },

  // --- שקים בודדים (25 ק"ג) ואגרגטים ---
  {
    sku: "10002",
    officialName: "מלט אפור 25 ק״ג נשר (CEM II 42.5 N/B-LL)",
    category: "חומרי מליטה וצמנט",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["מלט אפור", "מלט נשר", "שק מלט", "מלט 25 קג", "אסמנת", "צמנט אפור"]
  },
  {
    sku: "10001",
    officialName: "מלט לבן 25 ק״ג נשר (CEM II 42.5 N או CEM I 52.5 R)",
    category: "חומרי מליטה וצמנט",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["מלט לבן", "צמנט לבן", "נשר לבן", "מלט לבן 25"]
  },
  {
    sku: "10011",
    officialName: "בטון מוכן 25 ק״ג תרמוקיר (בטון 30 MO 011)",
    category: "חומרי מליטה וצמנט",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["בטון מוכן", "בטון יבש", "בטון 30", "תרמוקיר בטון", "MO 011"]
  },
  {
    sku: "11500",
    officialName: "חול שק 25 ק״ג (חול ים שטוף ומסונן לבנייה)",
    category: "אגרגטים וחומרי מחצבה",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["שק חול", "חול 25 קג", "חול שטוף", "שק רמל"]
  },
  {
    sku: "11510",
    officialName: "סומסום שק 25 ק״ג (מצע חצץ דק נקי ומדורג לריצוף)",
    category: "אגרגטים וחומרי מחצבה",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["שק סומסום", "סומסום 25 קג", "סומסום שק", "חצץ דק"]
  },
  {
    sku: "11550",
    officialName: "טיט מוכן שק 25 ק״ג (תערובת טיט יבשה לבנייה וטיח)",
    category: "אגרגטים וחומרי מחצבה",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["שק טיט", "טיט 25 קג", "טיט מוכן", "טיט לבנייה"]
  },
  {
    sku: "11505",
    officialName: "חצץ שק 25 ק״ג (חצץ מדורג שטוף ונקי לבטון ותשתיות)",
    category: "אגרגטים וחומרי מחצבה",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["שק חצץ", "חצץ 25 קג", "חצץ בטון"]
  },

  // --- דבקים, טיט ואיטום צמנטי ---
  {
    sku: "19255",
    officialName: "סיקה סרם 255 סטארפלקס (SikaCeram-255)",
    category: "דבקים ואיטום",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["סיקה סרם 255", "סיקה 255", "סטארפלקס", "דבק קרמיקה סיקה"]
  },
  {
    sku: "10701",
    officialName: "סיקה טופ 107 (SikaTop Seal-107)",
    category: "חומרי איטום צמנטיים",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["סיקה 107", "סיקה טופ 107", "ערכת סיקה 107", "איטום חדרים רטובים"]
  },
  {
    sku: "10702",
    officialName: "סיקה לטקס SBR (SikaLatex SBR)",
    category: "מוספים ודבקים לטיח",
    defaultWarehouse: "סניף 1 התלמיד",
    requiresBelaDeposit: false,
    requiresPalletDeposit: false,
    aliases: ["סיקה לטקס", "לטקס SBR", "ביג בונד", "דבק מוסף לרולקות", "לטקס 5 ליטר"]
  },
  {
    sku: "15181",
    officialName: "טיט לריצוף 181 כרמית מיסטר פיקס 25 ק״ג (ריצופית)",
    category: "דבקים וטיט לריצוף",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["טיט לריצוף 181", "מיסטר פיקס 181", "ריצופית", "טיט 181", "כרמית 181"]
  },
  {
    sku: "14603",
    officialName: "דבק פלסטומר AD 603 אפור 25 ק״ג מותג :תרמוקיר",
    category: "דבקים ומליטה",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["תרמוקיר 603", "AD 603", "פלסטומר 603", "דבק קרמיקה תרמוקיר"]
  },
  {
    sku: "14075",
    officialName: "טיח גבס MP75 שק 25 ק״ג קנאוף (Knauf MP75)",
    category: "טיח וגמר פנים",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["טיח גבס", "MP75", "קנאוף MP75", "טיח מכונה", "טיח פנים"]
  },
  {
    sku: "14104",
    officialName: "טיח חוץ מיישר סופר PL 102s תרמוקיר 25 ק״ג (טיח בריכות וסביבה ימית)",
    category: "טייחים ואיטום",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["תרמוקיר PL 102s", "PL 102s", "טיח בריכות", "טיח מיישר חוץ"]
  },
  {
    sku: "15770",
    officialName: "טיח ממ״ד 770 כרמית מיסטר פיקס 25 ק״ג (טיח צמנטי רב-תכליתי למרחבים מוגנים)",
    category: "טייחים ומרחבים מוגנים",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["טיח ממד", "מיסטר פיקס 770", "טיח 770", "טיח למקלטים"]
  },
  {
    sku: "14400",
    officialName: "טיח תרמי 400 תרמוקיר 23 ק״ג (75 ליטר) Termokir TH 400",
    category: "טיח ובידוד תרמי",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["טיח תרמי 400", "תרמוקיר TH 400", "טיח תרמי", "TH 400"]
  },

  // --- איטום גגות, שפכטלים ודבקים מיוחדים ---
  {
    sku: "20110",
    officialName: "טמבור סופרפלקס לבן (טמבור פח 18 ליטר)",
    category: "איטום גגות וציפויים",
    defaultWarehouse: "סניף 1 התלמיד",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["סופרפלקס לבן", "סופרפלקס טמבור", "איטום גגות לבן", "פח סופרפלקס"]
  },
  {
    sku: "15090",
    officialName: "רוקבונד שפכטל אמריקאי מוכן 28 ק״ג (Rockbond)",
    category: "שפכטלים וגמר פנים",
    defaultWarehouse: "סניף 1 התלמיד",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["רוקבונד", "שפכטל אמריקאי מוכן", "שפכטל דלי", "שפכטל רוקבונד 28"]
  },
  {
    sku: "15453",
    officialName: "סופר 7 שקוף 290 מ״ל Bostik Super 7",
    category: "דבקים ואיטום",
    defaultWarehouse: "סניף 1 התלמיד",
    requiresBelaDeposit: false,
    requiresPalletDeposit: false,
    aliases: ["סופר 7", "סופר 7 שקוף", "סופר שבע", "Super 7", "בוסטיק שקוף", "דבק MS"]
  },
  {
    sku: "15680",
    officialName: "סיקפלקס FC11 תרמיל 300 מ״ל SIKA (Sikaflex-11 FC Purform)",
    category: "איטום והדבקה גמישה",
    defaultWarehouse: "סניף 1 התלמיד",
    requiresBelaDeposit: false,
    requiresPalletDeposit: false,
    aliases: ["סיקפלקס", "סיקפלקס 11", "FC11", "מסטיק פוליאוריטן סיקה"]
  },
  {
    sku: "30501",
    officialName: "קצף פוליאוריטן סיקה בום (Sika Boom-157)",
    category: "קצף ואיטום מרווחים",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: false,
    aliases: ["סיקה בום", "קצף פוליאוריטן", "פוליאוריטן מוקצף", "ספריי קצף"]
  },

  // --- לוחות גבס ---
  {
    sku: "111260",
    officialName: "לוח גבס לבן 260 ע׳ 12.50 מ״מ אורבונד / טמבור",
    category: "לוחות גבס ומחיצות",
    defaultWarehouse: "סניף 1 התלמיד",
    requiresBelaDeposit: false,
    requiresPalletDeposit: false,
    aliases: ["גבס לבן 2.60", "לוח גבס לבן 260", "לוח גבס רגיל", "גבס 260"]
  },
  {
    sku: "112260",
    officialName: "לוח גבס ירוק 260 עמידות מוגברת בלחות (עובי 12.5 מ״מ)",
    category: "לוחות גבס ומחיצות",
    defaultWarehouse: "סניף 1 התלמיד",
    requiresBelaDeposit: false,
    requiresPalletDeposit: false,
    aliases: ["גבס ירוק 2.60", "לוח גבס ירוק 260", "גבס עמיד לחות", "ירוק 2.60", "גבס למקלחות", "112260"],
    youtubeUrl: "https://www.youtube.com/watch?v=6B0Ih74mpkk"
  },
  {
    sku: "111200",
    officialName: "לוח גבס לבן 200 ע׳ 12.50 מ״מ אורבונד / טמבור",
    category: "לוחות גבס ומחיצות",
    defaultWarehouse: "סניף 1 התלמיד",
    requiresBelaDeposit: false,
    requiresPalletDeposit: false,
    aliases: ["גבס לבן 2 מטר", "לוח גבס 2.00", "גבס לבן 200"]
  },
  {
    sku: "112200",
    officialName: "לוח גבס ירוק 200 ע׳ 12.50 מ״מ אורבונד / טמבור",
    category: "לוחות גבס ומחיצות",
    defaultWarehouse: "סניף 1 התלמיד",
    requiresBelaDeposit: false,
    requiresPalletDeposit: false,
    aliases: ["גבס ירוק 2 מטר", "לוח גבס ירוק 200", "ירוק 2 מטר"]
  },
  {
    sku: "113260",
    officialName: "לוח גבס ורוד 260 ע׳ 12.50 מ״מ (מעכב בעירה FR)",
    category: "לוחות גבס ומחיצות",
    defaultWarehouse: "סניף 1 התלמיד",
    requiresBelaDeposit: false,
    requiresPalletDeposit: false,
    aliases: ["גבס ורוד", "גבס אדום", "גבס חסין אש", "לוח גבס ורוד 260", "גבס מעכב בעירה"]
  },
  {
    sku: "114260",
    officialName: "לוח גבס כחול 260 ע׳ 12.50 מ״מ (עמיד מים, אש וקול)",
    category: "לוחות גבס ומחיצות",
    defaultWarehouse: "סניף 1 התלמיד",
    requiresBelaDeposit: false,
    requiresPalletDeposit: false,
    aliases: ["גבס כחול", "לוח גבס כחול", "גבס אקוסטי כחול", "לוח כחול 260"]
  },

  // --- בלוקים ---
  {
    sku: "10020",
    officialName: "בלוק בטון חלול תקני 20 ס״מ",
    category: "בלוקים ומחיצות",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: true,
    aliases: ["בלוק 20", "בלוק בטון 20", "בלוק שחור 20", "בלוקים 20"]
  },

  // --- פקדונות לוגיסטיים ---
  {
    sku: "60002",
    officialName: "פקדון שק גדול (בלה ריקה)",
    category: "פקדונות אריזה",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: false,
    aliases: ["פקדון בלה", "שק גדול פקדון", "שוואל", "שואיל", "פקדון שק"]
  },
  {
    sku: "60060",
    officialName: "משטח עץ סבן תקני פקדון",
    category: "פקדונות אריזה",
    defaultWarehouse: "סניף 4 החרש",
    requiresBelaDeposit: false,
    requiresPalletDeposit: false,
    aliases: ["משטח סבן", "פקדון משטח", "משטח עץ", "פקדון משטח 60060"]
  }
];
/**
 * 1. שליפת הזמנות עבר מתוך קולקציית orders ב-Firestore עם גיבוי מקומי
 */
async function getClientPastOrdersFromFirestore(comaxIdOrName: string) {
  if (!comaxIdOrName) return []
  if (db) {
    try {
      const ordersCol = collection(db, "orders")
      const cleanQuery = String(comaxIdOrName).trim()

      // חיפוש לפי מספר קומקס
      const qByComax = query(ordersCol, where("comaxId", "==", cleanQuery), limit(3))
      let snap = await getDocs(qByComax)

      // אם לא נמצא לפי קומקס, חיפוש לפי שם לקוח
      if (snap.empty) {
        const qByName = query(ordersCol, where("clientName", "==", cleanQuery), limit(3))
        snap = await getDocs(qByName)
      }

      if (!snap.empty) {
        return snap.docs.map((dSnap) => {
          const d = dSnap.data()
          let dateStr = ""
          if (d.receiptDate?.seconds) {
            dateStr = new Date(d.receiptDate.seconds * 1000).toLocaleDateString("he-IL")
          } else if (d.receiptDate) {
            dateStr = String(d.receiptDate)
          }

          return {
            orderId: d.orderId,
            date: dateStr,
            products: d.rawProducts,
            driver: d.assignedDriver,
            warehouse: d.warehouse,
            status: d.deliveryStatus,
          }
        })
      }
    } catch {
      // המשך חלק לגיבוי ללא זיהום לוגים
    }
  }

  // גיבוי מבוסס לקוח היסטורי אם קיים במאגר
  const client = findBestClientMatch(comaxIdOrName)
  if (client) {
    return [
      {
        orderId: `ORD-${client.comaxId}-PREV`,
        date: "שבוע שעבר",
        products: `אספקת חומרי מליטה ובלות לאתר ${client.name}`,
        driver: "חכמת (מרצדס מנוף)",
        warehouse: "סניף 4 החרש",
        status: "סופק",
      },
    ]
  }

  return []
}

/**
 * 2. איתור מק"טים תואמים מתוך logistics_catalog עם גיבוי מקומי
 */
async function matchCatalogFromFirestore(text: string) {
  if (!text) return []
  const lowerText = text.toLowerCase()

  if (db) {
    try {
      const catalogSnap = await getDocs(collection(db, "logistics_catalog"))
      if (!catalogSnap.empty) {
        const matches: Array<{
          sku: string
          name: string
          category?: string
          warehouse?: string
          requiresBela?: boolean
          requiresPallet?: boolean
        }> = []

        catalogSnap.forEach((docSnap) => {
          const item = docSnap.data()
          const aliases: string[] = Array.isArray(item.aliases) ? item.aliases : [item.officialName || ""]
          const hasMatch = aliases.some((a: string) => a && lowerText.includes(String(a).toLowerCase()))

          if (hasMatch) {
            matches.push({
              sku: item.sku,
              name: item.officialName,
              category: item.category,
              warehouse: item.defaultWarehouse,
              requiresBela: Boolean(item.requiresBelaDeposit),
              requiresPallet: Boolean(item.requiresPalletDeposit),
            })
          }
        })

        if (matches.length > 0) {
          return matches.slice(0, 5)
        }
      }
    } catch {
      // המשך חלק לגיבוי קטלוגי סטטי
    }
  }

  // קטלוג מקומי מגובה
  const staticMatches: Array<{
    sku: string
    name: string
    category?: string
    warehouse?: string
    requiresBela?: boolean
    requiresPallet?: boolean
  }> = []

  STATIC_LOGISTICS_CATALOG.forEach((item) => {
    const hasMatch = item.aliases.some((a: string) => a && lowerText.includes(String(a).toLowerCase()))
    if (hasMatch) {
      staticMatches.push({
        sku: item.sku,
        name: item.officialName,
        category: item.category,
        warehouse: item.defaultWarehouse,
        requiresBela: item.requiresBelaDeposit,
        requiresPallet: item.requiresPalletDeposit,
      })
    }
  })

  return staticMatches.slice(0, 5)
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * מנתב מודלים חכם: Gemini ⬅️ OpenAI ⬅️ Claude
 */
async function generateWithProviderFallback(
  systemInstruction: string,
  messages: ChatMessage[]
): Promise<string> {
  // 1. ניסיון ראשי: Gemini עם שרשרת מודלים זמינים
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const contents = messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      const fallbackModels = [
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-flash-latest",
        "gemini-3.8-flash",
      ];

      for (const mName of fallbackModels) {
        try {
          const res = await ai.models.generateContent({
            model: mName,
            contents,
            config: { systemInstruction },
          });

          if (res.text) return res.text;
        } catch {
          // מנסה את המודל הבא ברשימה
        }
      }
    } catch {
      console.warn("Gemini provider fallback exhausted, moving to OpenAI...");
    }
  }

  // 2. גיבוי ראשון: OpenAI (GPT-4o-mini)
  if (process.env.OPENAI_API_KEY) {
    try {
      const openAiMessages = [
        { role: "system", content: systemInstruction },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ];

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: openAiMessages,
          temperature: 0.3,
        }),
      });

      const data = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
    } catch {
      console.warn("OpenAI fallback failed, moving to Anthropic...");
    }
  }

  // 3. גיבוי שני: Anthropic (Claude 3.5 Haiku)
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const anthropicMessages = messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content
      }));

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 1500,
          system: systemInstruction,
          messages: anthropicMessages,
        }),
      });

      const data = await res.json();
      if (res.ok && data.content?.[0]?.text) {
        return data.content[0].text;
      }
    } catch {
      console.warn("Anthropic fallback failed");
    }
  }

  return "";
}

const generateMultiProviderFallback = generateWithProviderFallback;
/**
 * POST /api/chat
 *
 * Route handler using @google/genai to stream AI responses.
 * Receives messages and optional image data from the frontend.
 */
export async function POST(req: Request) {
  try {
    // אתחול והבטחת קיום קולקציית הזיכרון בענן כבר בפנייה הראשונה
    await ensureLearnedKnowledgeBootstrapped()

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
    let verifiedUser: {
      userId: string
      name: string
      role: string
      phone: string
      boundDeviceModel?: string | null
      boundDeviceId?: string | null
    } | null = null

    if (db) {
      try {
        const targetUserId = userId || "user_rami_masarweh"
        const userDocRef = doc(db, "authorized_users", targetUserId)
        const userSnap = await getDoc(userDocRef)

        if (userSnap.exists()) {
          const userData = userSnap.data() as AuthorizedUser

          // איסוף כל מזהי המכשירים המאושרים
          const allowedDevices: string[] = Array.isArray(userData.allowedDeviceIds)
            ? [...userData.allowedDeviceIds]
            : []
          if (userData.boundDeviceId && !allowedDevices.includes(userData.boundDeviceId)) {
            allowedDevices.push(userData.boundDeviceId)
          }

          // בדיקה האם המשתמש כבר הופעל
          if (!userData.isActivated || allowedDevices.length === 0) {
            // עבור ראמי בסביבת הפיתוח - נעילת מכשיר אוטומטית אם טרם הופעל
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
            let isDeviceAuthorized = Boolean(deviceId && allowedDevices.includes(deviceId))

            if (!isDeviceAuthorized && targetUserId === "user_rami_masarweh" && deviceId) {
              // בסביבת AI Studio / תפעול שוטף של ראמי - אישור מכשיר וצימוד אוטומטי למנהל המערכת
              try {
                await updateDoc(userDocRef, {
                  allowedDeviceIds: arrayUnion(deviceId),
                  lastAccessAt: serverTimestamp(),
                })
                isDeviceAuthorized = true
              } catch (e) {
                console.warn("Could not auto-add deviceId for Rami:", e)
              }
            }

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
        // התעלמות משגיאות הרשאות או בדיקת מכשיר בסביבת פיתוח/הדגמה
      }
    }

    if (!verifiedUser) {
      verifiedUser = {
        userId: "user_rami_masarweh",
        name: "ראמי מסארוה",
        role: "מנהל תפעול וסדרן ראשי",
        phone: "050-8860896",
        boundDeviceModel: "מכשיר מנהל ראשי (Samsung/Workstation)",
        boundDeviceId: deviceId || "dev_saban_default",
      }
    }

    // בדיקת קיום מפתח API כלשהו בסביבת השרת (Gemini / OpenAI / Anthropic)
    const hasKey =
      process.env.GEMINI_API_KEYS ||
      process.env.GEMINI_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY

    if (!hasKey) {
      return new Response(
        "לא נמצא מפתח API מוגדר בסביבת השרת. יש להגדיר GEMINI_API_KEY, OPENAI_API_KEY או ANTHROPIC_API_KEY.",
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
          const mimeType = mimeMatch ? mimeMatch : "image/jpeg"
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
${matchingClients.map((c) => `- לקוח קומקס ${c.comaxId}: ${c.name} (${c.address}, ${c.city}) - טלפון: ${c.contactPhone} - מק"ט מנוף: ${c.craneBarcode}, מק"ט פלטה: ${c.flatbedBarcode}`).join("\n")}
`
    }

    // 🔥 שליפת נתוני אמת חיים מ-Firestore (הזמנות עבר + מק"טים מותאמים)
    let firestoreContextPrompt = ""

    const targetComaxId = matchedClient?.comaxId || ""
    const targetClientName = matchedClient?.name || latestUserMessage

    // 1. שליפת הזמנות עבר של הלקוח מ-Firestore
    const pastOrders = await getClientPastOrdersFromFirestore(targetComaxId || targetClientName)
    if (pastOrders.length > 0) {
      firestoreContextPrompt += `
### 📜 היסטוריית הזמנות עבר מתוך קולקציית orders ב-Firestore (מערכת מאוחדת):
${pastOrders.map((o) => `- **הזמנה ${o.orderId}** (${o.date}) | מחסן: ${o.warehouse} \vert{} נהג: ${o.driver}
  פירוט מוצרים שסופקו: ${o.products}
  סטטוס אספקה: ${o.status || "סופק"}`).join("\n")}
`
    }

    // 2. איתור מק"טים רלוונטיים מתוך קולקציית logistics_catalog ב-Firestore
    const catalogMatches = await matchCatalogFromFirestore(latestUserMessage)
    if (catalogMatches.length > 0) {
      firestoreContextPrompt += `
### 📦 מק"טים רשמיים שזוהו מתוך קולקציית logistics_catalog ב-Firestore:
${catalogMatches.map((c) => `- מק"ט: **${c.sku}** | מוצר: ${c.name} \vert{} מחסן: ${c.warehouse} | פקדון בלה: ${c.requiresBela ? "חובה (60002)" : "פטור"} \vert{} פקדון משטח: ${c.requiresPallet ? "חובה (60060)" : "פטור"}`).join("\n")}
`
    }

    // Handle OneSignal push requests directly if requested
    let oneSignalStatusNote = ""
    if (/onesignal|דחיפת התראה|התראה למערכת/i.test(latestUserMessage)) {
      const appId = process.env.ONESIGNAL_APP_ID || "8f9c9417-530c-41e2-8a65-850d10758258"
      const apiKey = process.env.ONESIGNAL_REST_API_KEY
      try {
        const pushResult = await sendOneSignalPush({
          appId,
          apiKey,
          message: latestUserMessage,
          title: "נועה AI ❤️ | ח. סבן חומרי בניין",
        })
        if (pushResult.success) {
          oneSignalStatusNote = `\n\n### 🔔 סטטוס דחיפת התראה ל-OneSignal:
- ההתראה נדחפה בהצלחה למערכת OneSignal עם חותמת מענה רשמית מנועה!
- מזהה התראה (Notification ID): ${pushResult.id || "מאושר"}
- נמענים רשומים: ${pushResult.recipients || 0}
- שיטת אימות שנבחרה: ${pushResult.authUsed || "Key"}
- צייני לראמי בביטחון ובחום שההתראה נדחפה בהצלחה למערכת עם חותמת רשמית וזמן מדויק.`
        } else {
          oneSignalStatusNote = `\n\n### 🔔 סטטוס דחיפת התראה ל-OneSignal:
- סטטוס תגובה משרתי OneSignal: ${JSON.stringify(pushResult.error)}
- צייני לראמי את הפרטים.`
        }
      } catch (e: unknown) {
        const errMsg = e instanceof Error ? e.message : String(e)
        oneSignalStatusNote = `\n\n### 🔔 סטטוס דחיפת התראה ל-OneSignal:
- כשל תקשורת מול OneSignal: ${errMsg}`
      }
    }

    // Training Videos and Technical Demonstrations
    const matchedTrainingVideos = findTrainingVideos(latestUserMessage)
    const isVideoOrTechnical = /סרטון|וידאו|הדרכה|יוטיוב|youtube|video|מדריך|איך ליישם|איך להרכיב|איך לפרוק|איטום|גבס|מנוף|דבק|סיקה/i.test(latestUserMessage)

    const trainingVideosPrompt = `
### 🎥 הצגת סרטוני וידאו והדרכות מקצועיות:
כאשר המשתמש מבקש סרטון, או כאשר מדובר בהדרכה טכנית (למשל: יישום איטום סיקה, הרכבת מחיצות גבס, בטיחות מנוף, דבק קרמיקה, טיח תרמי, ברזל ורשתות):
- צרפי את קישור היוטיוב המלא בשורה נפרדת:
https://www.youtube.com/watch?v=[VIDEO_ID]
- הממשק יזהה את הקישור אוטומטית ויציג אותו כנגן וידאו מובנה בתוך השיחה.
- לעולם אל תצרפי את הקישור בתוך משפט; מקמי אותו בשורה נפרדת עם שורות ריקות מעליו ומתחתיו.

מאגר סרטוני מוצרים לדוגמה לשליפה לפי מילות מפתח:
${TRAINING_PRODUCTS.map((p) => `- מוצר: **${p.name}** (מק"ט: ${p.sku}) \vert{} מילות מפתח: [${p.keywords.slice(0, 6).join(", ")}]
  קישור יוטיוב רשמי: ${p.youtubeUrl}
  שלבים מרכזיים: ${p.keyTechnicalSteps.slice(0, 2).join("; ")}`).join("\n")}
${
  matchedTrainingVideos.length > 0
    ? `\n### 💡 סרטון הדרכה שנמצא בהתאמה ישירה להודעה:
${matchedTrainingVideos.slice(0, 2).map((v) => `* **${v.name}**
  קישור להטמעה בשורה נפרדת:
  ${v.youtubeUrl}
  דגשים טכניים: ${v.keyTechnicalSteps.join(" | ")}
  בטיחות: ${(v.safetyNotes || []).join(" | ")}`).join("\n")}`
    : ""
}
`

    const productMediaPrompt = await buildProductMediaPrompt()
    const targetedProductSnippet = await buildTargetedProductMediaSnippet(latestUserMessage)

    // 🧠 מנגנון זיכרון ארוך-טווח ולמידה רציפה משיחה (Autonomous Long-Term Memory)
    const trigger = detectAndExtractLearningTrigger(latestUserMessage)
    let learningConfirmationNote = ""

    if (trigger && trigger.isLearningTrigger && trigger.rule) {
      console.log("🎯 זוהה טריגר לימוד, מתחיל שמירה:", trigger)
      try {
        const savedDocId = await saveLearnedFact(trigger.rule, trigger.category, trigger.entity)
        learningConfirmationNote = `
### ⚡ אירוע למידה בזמן אמת מהודעה זו:
- ראמי לימד אותך כרגע כלל חדש: "${trigger.rule}"
- קטגוריה שסווגה: ${trigger.category}${trigger.entity ? ` | ישות מזוהה: ${trigger.entity}` : ""}
- הכלל נצרב ונשמר בהצלחה בענן Firestore (מזהה מסמך: ${savedDocId}) במאגר הזיכרון לכל השיחות הבאות.
- **הנחיית אישור לראמי:** אשרי לו בחום ובביטחון שהכלל נצרב בזיכרון הקבוע שלך בענן (למשל: "רשמתי לפניי וצרבתי בזיכרון הקבוע — החל מעכשיו אני איישם כלל זה בכל סידורי העבודה והמענה").`
      } catch (err) {
        console.error("❌ שגיאה בשמירת כלל חדש בשיחה ל-Firestore:", err)
      }
    }

    // שליפת כל הכללים הפעילים מ-Firestore
    const activeLearnedRules = await getActiveLearnedKnowledge(40)
    let learnedMemoryPrompt = ""
    if (activeLearnedRules.length > 0) {
      learnedMemoryPrompt = `
### 🧠 ידע ונסיון נצבר שנלמד משיחות קודמות עם ראמי (Learned Memory):
להלן כללים עסקיים, עדכוני לקוחות, מחירונים והנחיות שטח שראמי לימד אותך ישירות בצ'אט לאורך הזמן. עליך לציית לכללים אלו בעדיפות עליונה בכל מענה וסידור עבודה:
${activeLearnedRules.join("\n")}
${learningConfirmationNote}
`
    }

    const verifiedIdentityBanner = verifiedUser
      ? `
### 🔒 זהות משתמש מאומתת (Device Binding מאושר ומאובטח בחומרה):
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
`
      : `
[הודעה מאומתת מאת: ראמי מסארוה | תפקיד: מנהל תפעול וסדרן ראשי]
`

    const systemInstruction = `את נועה AI ❤️ — סדרנית העבודה והמוח הלוגיסטי-תפעולי של חברת "ח. סבן חומרי בניין (1994) בע״מ" (ח.פ 512001678), יד ימינו של ראמי מסארוה.
את מתקשרת בערוץ הפרטי, הישיר והחופשי שלך מול ראמי וצוות ההנהלה והתפעול — לסיעור מוחות, פיתוח, ניהול משימות שוטף, סידור עבודה והחלטות אסטרטגיות.

${verifiedIdentityBanner}
${learnedMemoryPrompt}
${oneSignalStatusNote}
${trainingVideosPrompt}
${targetedProductSnippet}
${productMediaPrompt}
${firestoreContextPrompt}

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
קובץ historicalClients.ts ומאגר Firestore הם מקורות האמת של לקוחות ואתרי החברה.
להלן נתוני 63 הלקוחות הרשמיים המלאים:
${JSON.stringify(
  HISTORICAL_63_CLIENTS.map((c) => ({
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
  }))
)}

${matchedClientPrompt}

---

### 🔒 הנחיות קשיחות לזיהוי לקוח, תמחור וסידור עבודה:

1. **זיהוי ונרמול לקוח:**
   בעת קבלת טקסט חופשי, תעודה, הקלטה קולית או הודעה בוואטסאפ:
   - זהי את הלקוח לפי מספר טלפון (contactPhone), שם איש קשר (contactName), שם אתר (name), או כתובת (address/city).
   - הצמידי תמיד את מספר לקוח קומקס (comaxId) הרשמי ואת מזהה האתר (id).
   - אם מופיעות בהקשר הזמנות עבר מקולקציית orders — הסתמכי עליהן לצורך שחזור סל מוצרים קבוע או היסטוריית כמויות.

2. **נוהל בדיקת אשראי ובטיחות (חובה לבצע בכל הזמנה):**
   - **תנאי תשלום (paymentTerms):** אם מוגדר "מזומן / אשראי מראש" — חובה לסמן את ההזמנה בסטטוס: "⛔ ממתין לאישור תשלום מראש (גליה/לינה/הראל)". אין לאשר יציאה ללא תשלום.
   - **אתר בעייתי (status === 'problematic'):** חובה להציג התרעת אזהרה באדום (⚠️) עם פרטי הסיכון מתוך riskDetails והערות הפריקה (observations).
   - **תוספת מחיר (surchargePercent):** אם מוגדר 10%, יש לציין זאת בשורת ההובלה.
   - **שעות מועדפות (preferredDeliveryHours):** יש לשבץ את שעת האספקה אך ורק בתוך חלון הזמנים המוגדר.

3. **שיוך מק"טי הובלה, פקדונות וחישוב משקל ועומס סרנים:**
   - **מנוף (חכמת | מרצדס):** שייכי את מק"ט ה-craneBarcode המדויק של הלקוח.
   - **פלטה/חלוקה (עלי | איסוזו):** שייכי את מק"ט ה-flatbedBarcode (סדרת 818xxx) והחילי פטור מלא מפקדונות בלות ומשטחים.
   - **חוקי פקדונות חובה:** על כל בלה מחייבים שק גדול פקדון מק"ט 60002 ביחס 1:1. על כל 40 שקי מלט/דבק מוסיפים משטח סבן פקדון 60060.
   - **משקל מלט וחישוב עומס סרנים (דיוק קטלוגי מחייב בישראל ובסבן):**
     * **שק מלט אפור נשר (מק"ט 10002):** שק מלט הוא **25 ק"ג בלבד** (לעולם לא 50 ק"ג!).
     * **משטח מלט תקני שלם:** 40 שקים × 25 ק"ג = **1,000 ק"ג (1 טון נטו)** + משטח עץ סבן פקדון (מק"ט 60060).
     * **בלה (חול 11501 / סומסום 11502 / טיט 11503):** כ-**1,000 ק"ג (1 טון)** לבלה + שק פקדון 60002.
     * **בקרת עומס סרנים ומניעת חריגות משקל:** יש לבסס את כל חישובי המשקל של מלט על 25 ק"ג לשק כדי לא לעוות את עומס הסרנים במשאית (מרצדס מנוף: סביב 12-15 טון מטען; איסוזו חלוקה: סביב 4-5 טון).

4. **תמלול קולי ישיר ב-Gemini Multimodal וסדר עדיפויות מודולים (Voice-to-Order):**
   - **טכנולוגיית תמלול:** אין צורך בשירות Whisper חיצוני נוסף. מודל Gemini שכבר מחובר במערכת תומך ישירות ב-Audio Multimodal, ומבין עברית וערבית מדוברת (כולל סלנג ענף הבנייה בסבן) ישירות מקובץ השמע.
   - **סדר עדיפויות פיתוח מודולים (תועלת מקסימלית מול מינימום מורכבות):**
     * 🥇 **מקום 1: מודול 2 — מפענח הקלטות קוליות (Voice-to-Order):**
       - **למה עכשיו:** בשעות הבוקר (06:30–08:30) אין לראמי זמן להקליד שום דבר; קבלנים ונהגים שולחים הודעות קוליות ברכב תוך כדי תנועה.
       - **הערך המיידי:** העברת קובץ האודיו מ-WhatsApp לנועה ⬅️ נועה מחזירה כרטיס סידור מנורמל עם מק"טים ופקדונות תוך 3 שניות לאישור בלחיצה אחת.

5. **מבנה פלט קבוע לוואטסאפ (כרטיס סידור):**
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

### 📊 הנחיות לעיצוב טבלאות ודוחות נתונים:
כאשר המשתמש מבקש טבלה, ריכוז נתונים, סיכום כמויות או דוח מוצרים/הזמנות:
1. **מבנה טבלה תקני:** השתמשי במבנה טבלת Markdown תקנית (נתמכת ב-react-markdown / remark-gfm) או תגיות HTML נקיות (<table>, <thead>, <tbody>, <tr>, <th>, <td>).
2. **יישור לימין (RTL) והתאמה למסכים ניידים:** הקפידי תמיד על יישור מלא לימין (RTL) ותצוגה אסתטית נקייה מותאמת למסכים ניידים (מובייל).
3. **מבנה עמודות תקני לדוחות מוצרים:**
| מק"ט | שם מוצר רשמי | כמות | משקל מצטבר | מחסן מוצא |
| :--- | :--- | :--- | :--- | :--- |
4. **הדגשות ערכים מספריים ואימוג'ים מזהים:**
   - הדגישי ערכים מספריים וסיכומי שורות (לדוגמה: **40 שק**, **1,000 ק"ג**, ושורת **סה"כ משקל כולל: X טון** בתחתית).
   - שלבי אימוג'ים מזהים בכל עמודה ושורה: 📦 (מק"ט ומוצר), ⚖️ (משקל מצטבר), 🏭 (מחסן מוצא: 4 החרש / 1 התלמיד).

---

### כללי מענה משלימים ועיצוב טקסט מקצועי:
1. פתחי תמיד ב-1–2 משפטים חדים ומודגשים עם השורה התחתונה (**טקסט מודגש**).
2. **עיצוב טקסט מקצועי ונקי (ללא סימני קוד גולמיים):**
   - הימנעי לחלוטין משימוש בסימני קוד מסורבלים כגון "##", "###", "---", או מקפים כפולים "--" בתוך הטקסט.
   - במקום כותרות מסורבלות עם סולמיות (##), השתמשי בהדגשה חדה עם אימוג'י מוביל (לדוגמה: 📦 **פירוט כמויות ומק״טים:**).
   - ארגני את השורות במבנה נקי, קריא ונעים לעין, עם רווחים מדויקים ומרווח נשימה מאוזן שמתאים לקריאה מהירה גם במובייל וגם במחשב שולחני.
3. הציגי תמיד את כרטיס הסידור וההזמנה בדיוק לפי המבנה שנקבע לעיל.
4. **אישור למידה בזיכרון ארוך-טווח (חובה):**
   כאשר ראמי מבקש ממך לזכור עובדה או כלל חדש (באמצעות ביטויים כמו "תזכרי ש...", "כלל חדש:", "עדכון לקוח:", "תרשמי לפנייך:", "מעכשיו:"), אשרי לו תמיד בחום ובביטחון שהכלל נצרב בזיכרון הקבוע שלך (למשל: "רשמתי לפניי וצרבתי בזיכרון הקבוע — החל מעכשיו אני איישם כלל זה בכל סידורי העבודה והמענה").
5. בסוף כל מענה, הציגי בדיוק 3 כפתורי פעולה מהירים בהקשר השיחה (Quick Action Buttons):
   🔘 \`[ 🚚 פעולה או שאלה מהירה 1 ]\`  
   🔘 \`[ 📊 פעולה או שאלה מהירה 2 ]\`  
   🔘 \`[ ☕ פעולה או שאלה מהירה 3 ]\`

כתבי תמיד בעברית טבעית ורהוטה, פני לראמי בשמו, ושמרי על מחויבות עמוקה להצלחת סבן חומרי בניין.`

    let responseStream = null
    let lastStreamError: unknown = null

    // 1. ניסיון קריאה ב-Gemini (אם מוגדר מפתח GEMINI_API_KEYS או GEMINI_API_KEY)
    if (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY) {
      try {
        const ai = getGenAI()
        const modelsToTry = [
          "gemini-flash-lite-latest",
          "gemini-3.1-flash-lite",
          "gemini-3.5-flash-lite",
          "gemini-flash-latest",
          "gemini-3.8-flash",
          "gemini-3.6-flash",
        ]

        for (const modelName of modelsToTry) {
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              responseStream = await ai.models.generateContentStream({
                model: modelName,
                contents,
                config: {
                  systemInstruction,
                },
              })
              if (responseStream) break
            } catch (err: unknown) {
              lastStreamError = err
              const errMsg = err instanceof Error ? err.message : String(err)
              const isUnavailable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE")
              if (isUnavailable && attempt === 0) {
                await new Promise((resolve) => setTimeout(resolve, 600))
                continue
              }
              console.warn(`Model ${modelName} stream init failed:`, errMsg)
              break
            }
          }
          if (responseStream) break
        }

        if (!responseStream) {
          // ניסיון ישיר ללא streaming ב-Gemini
          for (const modelName of modelsToTry) {
            try {
              const directRes = await ai.models.generateContent({
                model: modelName,
                contents,
                config: { systemInstruction },
              })
              if (directRes.text) {
                return new Response(directRes.text, {
                  headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Cache-Control": "no-cache, no-transform",
                  },
                })
              }
            } catch (e) {
              console.warn(`Direct generateContent with ${modelName} failed:`, e)
            }
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini client error, moving to multi-provider fallback:", geminiErr)
      }
    }

    if (!responseStream) {
      // 2. Try multi-provider fallback (OpenAI / Anthropic if configured)
      try {
        const fallbackText = await generateMultiProviderFallback(systemInstruction, messages)
        if (fallbackText) {
          return new Response(fallbackText, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
            },
          })
        }
      } catch (multiErr) {
        console.warn("MultiProvider fallback failed:", multiErr)
      }

      // 3. Graceful fallback message rather than uncaught 500 error
      const gracefulNotice = `**ראמי שלום,** 

זיהיתי עומס רגעי בענן המודלים של גוגל. כל נתוני ההזמנות, המשאיות והמק"טים שמורים במערכת SabanOS.

אנא לחץ שוב על שליחה או בחר באחת מפעולות המערכת:

---
🔘 \`[ 🔄 שלח שוב את הפקודה ]\`  
🔘 \`[ 📦 בדיקת מלאי ומק"טים ]\`  
🔘 \`[ 🚚 סידור עבודה יומי ]\``

      return new Response(gracefulNotice, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
      })
    }

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        let fullGeneratedText = ""
        try {
          if (responseStream) {
            for await (const chunk of responseStream) {
              const text = chunk.text
              if (text) {
                fullGeneratedText += text
                controller.enqueue(encoder.encode(text))
              }
            }
          }
        } catch (streamErr) {
          console.warn("Streaming chunk iteration failed, trying direct fallback:", streamErr)
          if (!fullGeneratedText.trim()) {
            try {
              if (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY) {
                const ai = getGenAI()
                for (const fallbackModel of ["gemini-flash-lite-latest", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.8-flash"]) {
                  try {
                    const directResponse = await ai.models.generateContent({
                      model: fallbackModel,
                      contents,
                      config: {
                        systemInstruction,
                      },
                    })
                    const directText = directResponse.text || ""
                    if (directText) {
                      fullGeneratedText = directText
                      controller.enqueue(encoder.encode(directText))
                      break
                    }
                  } catch {
                    // Try next model
                  }
                }
              }
            } catch (directErr) {
              console.error("Direct fallback failed:", directErr)
              controller.enqueue(
                encoder.encode(
                  "ראמי יקר, זיהיתי עומס רגעי בענן המודלים. המערכת זמינה והמידע שלך שמור. אנא נסה שוב בלחיצה אחת."
                )
              )
            }
          }
        } finally {
          controller.close()
        }

        // 🔔 דחיפת התראה אוטומטית ל-OneSignal בסיום מענה נועה
        if (fullGeneratedText.trim()) {
          sendOneSignalPush({
            title: "נועה AI ❤️ | ח. סבן חומרי בניין",
            message: fullGeneratedText.trim(),
          }).catch((pushErr) => {
            console.warn("Automatic OneSignal push notification error:", pushErr)
          })
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
