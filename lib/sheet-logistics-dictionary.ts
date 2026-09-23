/**
 * lib/sheet-logistics-dictionary.ts
 * 
 * חיבור וסנכרון ישיר של נועה AI לגיליון מילון_לוגיסטי:
 * Spreadsheet ID: 1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA
 * Tab: מילון_לוגיסטי
 * עמודה K (אינדקס 10): "תמונה" (קישור לתמונת מוצר)
 * 
 * כולל מנגנון מטמון (cache) חי בזיכרון, פרסור עמיד של CSV, ותמיכה בקישורי אינטרנט ישירים.
 */

export interface SheetLogisticsItem {
  sku: string
  name: string
  category: string
  unit: string
  keywords: string
  deposits: string
  weightKg: number
  warehouse: string
  driver: string
  productImageColJ?: string
  imageUrl?: string // עמודה K: תמונה (לינק ישיר כגון PostImage / Google Drive / URL)
  youtubeUrl?: string // עמודה U או KATK / יוטיוב: קישור סרטון הדרכה יוטיוב
}

const SPREADSHEET_ID = "1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA"
const TAB_NAME = "מילון_לוגיסטי"
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzWpPnV9jxBt8qGDGkVjTWChG_9vQMN156D1VMdw2vDUKuPEkQR53_C56PIYgwHwONn/exec"

let cachedDictionary: SheetLogisticsItem[] | null = null
let lastFetchTime = 0
const CACHE_TTL_MS = 60 * 1000 // דקה אחת של זיכרון מטמון כדי למנוע בקשות מיותרות אך לשמור על עדכניות

/**
 * מפרק שורת CSV תקנית תוך טיפול במירכאות כפולות ופסיקים פנימיים
 */
function parseCsvLine(text: string): string[] {
  const result: string[] = []
  let cell = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cell += '"'
        i++ // מדלג על המירכאה המוברחת
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      result.push(cell.trim())
      cell = ""
    } else {
      cell += char
    }
  }
  result.push(cell.trim())
  return result
}

/**
 * מנקה ומנרמל קישור תמונה (תמיכה ב-PostImage, Google Drive, קישורים ישירים)
 */
export function normalizeProductImageUrl(url?: string): string | undefined {
  if (!url) return undefined
  const trimmed = url.trim()
  if (!trimmed || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "undefined") {
    return undefined
  }

  // בדיקת תקינות URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    // אם זה קישור Google Drive לצפייה, נמיר אותו לצפייה ישירה בתמונה
    const gDriveMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
    if (gDriveMatch && gDriveMatch[1]) {
      return `https://drive.google.com/uc?export=view&id=${gDriveMatch[1]}`
    }
    return trimmed
  }

  return undefined
}

/**
 * שולף ומעדכן את המילון הלוגיסטי מגיליון Google Sheets של נועה
 */
export async function fetchSheetLogisticsDictionary(forceRefresh = false): Promise<SheetLogisticsItem[]> {
  const now = Date.now()
  if (!forceRefresh && cachedDictionary && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedDictionary
  }

  try {
    const exportUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(TAB_NAME)}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 7000)

    const response = await fetch(exportUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Noa-AI-Logistics/1.0",
      },
      next: { revalidate: 60 },
    })
    clearTimeout(timeout)

    if (!response.ok) {
      console.warn(`[SheetDictionary] Failed fetching CSV: ${response.status} ${response.statusText}`)
      return cachedDictionary || []
    }

    const csvData = await response.text()
    const lines = csvData.split(/\r?\n/)
    if (lines.length < 2) {
      return cachedDictionary || []
    }

    const items: SheetLogisticsItem[] = []

    // בדיקת כותרות לאיתור עמודת יוטיוב / וידאו / Column U דינמית
    const headerCols = parseCsvLine(lines[0]).map((h) => h.replace(/^"+|"+$/g, "").trim().toLowerCase())
    let youtubeColIndex = headerCols.findIndex(
      (h) =>
        h.includes("יוטיוב") ||
        h.includes("youtube") ||
        h.includes("סרטון") ||
        h.includes("וידאו") ||
        h.includes("הדרכה") ||
        h.includes("katk") ||
        h === "u"
    )
    if (youtubeColIndex === -1 && headerCols.length > 20) {
      youtubeColIndex = 20 // עמודה U היא אינדקס 20 (A=0 ... U=20)
    }

    // דילוג על שורת הכותרת
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue

      const cols = parseCsvLine(line)
      const sku = (cols[0] || "").replace(/^"+|"+$/g, "").trim()
      if (!sku) continue

      const name = (cols[1] || "").replace(/^"+|"+$/g, "").trim()
      const category = (cols[2] || "").replace(/^"+|"+$/g, "").trim()
      const unit = (cols[3] || "").replace(/^"+|"+$/g, "").trim()
      const keywords = (cols[4] || "").replace(/^"+|"+$/g, "").trim()
      const deposits = (cols[5] || "").replace(/^"+|"+$/g, "").trim()
      const weightKg = parseFloat(cols[6]) || 0
      const warehouse = (cols[7] || "").replace(/^"+|"+$/g, "").trim()
      const driver = (cols[8] || "").replace(/^"+|"+$/g, "").trim()
      const colJ = (cols[9] || "").replace(/^"+|"+$/g, "").trim()
      const colK = (cols[10] || "").replace(/^"+|"+$/g, "").trim()
      const colU = (cols[20] || "").replace(/^"+|"+$/g, "").trim()
      const dynamicColYt = youtubeColIndex !== -1 ? (cols[youtubeColIndex] || "").replace(/^"+|"+$/g, "").trim() : ""

      // איתור קישור יוטיוב מתוך עמודה U, עמודת KATK, או סריקה של כל תא בשורה
      let rawYoutube: string | undefined = undefined
      if (colU.includes("youtube.com") || colU.includes("youtu.be")) {
        rawYoutube = colU
      } else if (dynamicColYt.includes("youtube.com") || dynamicColYt.includes("youtu.be")) {
        rawYoutube = dynamicColYt
      } else if (colK.includes("youtube.com") || colK.includes("youtu.be")) {
        rawYoutube = colK
      } else {
        // סריקה עמידה של כל התאים לאיתור קישור יוטיוב
        for (const cell of cols) {
          const trimmed = cell.replace(/^"+|"+$/g, "").trim()
          if (trimmed.includes("youtube.com/watch") || trimmed.includes("youtu.be/")) {
            rawYoutube = trimmed
            break
          }
        }
      }

      // גיבוי למוצר 112260 (לוח גבס ירוק עמיד לחות 260) - סרטון הדרכה רשמי
      if (!rawYoutube && (sku === "112260" || name.includes("גבס ירוק 260"))) {
        rawYoutube = "https://www.youtube.com/watch?v=6B0Ih74mpkk"
      }

      // עמודה K היא העמודה הראשית של "תמונה", עם גיבוי מעמודה J אם יש בה לינק (וודא שאינו יוטיוב)
      let rawImage = ""
      if (!colK.includes("youtube.com") && !colK.includes("youtu.be") && (colK.startsWith("http") || colK.startsWith("/"))) {
        rawImage = colK
      } else if (!colJ.includes("youtube.com") && !colJ.includes("youtu.be") && (colJ.startsWith("http") || colJ.startsWith("/"))) {
        rawImage = colJ
      }
      const imageUrl = normalizeProductImageUrl(rawImage)

      items.push({
        sku,
        name,
        category,
        unit,
        keywords,
        deposits,
        weightKg,
        warehouse,
        driver,
        productImageColJ: colJ,
        imageUrl,
        youtubeUrl: rawYoutube,
      })
    }

    cachedDictionary = items
    lastFetchTime = now
    return items
  } catch (err) {
    console.error("[SheetDictionary] Error fetching sheet dictionary:", err)
    return cachedDictionary || []
  }
}

/**
 * חיפוש פריט במילון הלוגיסטי לפי מק"ט או מילות מפתח
 */
export async function findSheetProduct(query: string): Promise<SheetLogisticsItem | null> {
  const dict = await fetchSheetLogisticsDictionary()
  if (!query || !dict.length) return null

  const clean = query.trim().toLowerCase()

  // 1. התאמת מק"ט מדויקת
  const bySku = dict.find((item) => item.sku.toLowerCase() === clean)
  if (bySku) return bySku

  // 2. מק"ט מוכל בטקסט
  const bySkuIncluded = dict.find((item) => clean.includes(item.sku.toLowerCase()) && item.sku.length >= 4)
  if (bySkuIncluded) return bySkuIncluded

  // 3. שם מוצר מדויק או מוכל
  const byName = dict.find((item) => item.name.toLowerCase().includes(clean) || clean.includes(item.name.toLowerCase()))
  if (byName) return byName

  // 4. מילות מפתח
  const byKeywords = dict.find((item) => {
    if (!item.keywords) return false
    const words = item.keywords.toLowerCase().split(/[,|]+/).map((w) => w.trim()).filter(Boolean)
    return words.some((w) => clean.includes(w) || w.includes(clean))
  })

  return byKeywords || null
}

/**
 * שליפת כל הפריטים שיש להם קישור תמונה פעיל בעמודה K
 */
export async function getSheetProductsWithImages(): Promise<SheetLogisticsItem[]> {
  const dict = await fetchSheetLogisticsDictionary()
  return dict.filter((item) => Boolean(item.imageUrl))
}
