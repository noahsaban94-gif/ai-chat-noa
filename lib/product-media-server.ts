/**
 * lib/product-media-server.ts
 * 
 * מודול צד-שרת מורחב לסנכרון תמונות מוצר של ח. סבן:
 * 1. סריקה דינמית של קובצי תמונות מוצר מקומיים ב-public/products/
 * 2. חיבור חי לגיליון מילון_לוגיסטי (Google Sheet ID: 1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA)
 *    עמודה K ("תמונה") — שליפת תמונות מלינקים חיצוניים (PostImage, Drive, URLs)
 * 3. קדימות: קישור אינטרנט עדכני מעמודה K או קובץ מקומי אמיתי שהועלה לשרת
 */

import fs from "fs"
import path from "path"
import { PRODUCT_MEDIA_CATALOG } from "./product-media"
import { fetchSheetLogisticsDictionary, type SheetLogisticsItem } from "./sheet-logistics-dictionary"

export interface ScannedProductMedia {
  sku: string
  name: string
  url: string
  fileName: string
  fileSize: number
  isRealUpload: boolean
  source: "local_upload" | "sheet_column_k" | "catalog_default"
}

const PRODUCTS_DIR = path.join(process.cwd(), "public/products")

/**
 * סורק את ספריית public/products ומחזיר מיפוי עדכני של כל המק"טים לקובץ התמונה האמיתי שלהם
 */
export function scanProductMediaFiles(): Record<string, ScannedProductMedia> {
  const result: Record<string, ScannedProductMedia> = {}

  try {
    if (!fs.existsSync(PRODUCTS_DIR)) {
      return result
    }

    const files = fs.readdirSync(PRODUCTS_DIR)
    
    // סדר עדיפויות לסיומות מקומיות: png > jpg > jpeg > webp > svg
    const extPriority: Record<string, number> = {
      ".jpg": 1,
      ".png": 2,
      ".jpeg": 3,
      ".webp": 4,
      ".svg": 5,
    }

    for (const file of files) {
      const ext = path.extname(file).toLowerCase()
      if (!extPriority[ext]) continue

      const baseName = path.basename(file, ext)
      if (baseName === "default-building-material") continue

      const filePath = path.join(PRODUCTS_DIR, file)
      const stats = fs.statSync(filePath)
      
      const sku = baseName
      const catalogInfo = PRODUCT_MEDIA_CATALOG[sku]
      const name = catalogInfo?.name || `מוצר מק"ט ${sku}`
      const url = `/products/${file}`
      const isRealUpload = ext !== ".svg" && stats.size > 5000

      // אם כבר יש קובץ עבור המק"ט, נשמור את בעל העדיפות הגבוהה יותר
      const existing = result[sku]
      if (!existing) {
        result[sku] = {
          sku,
          name,
          url,
          fileName: file,
          fileSize: stats.size,
          isRealUpload,
          source: isRealUpload ? "local_upload" : "catalog_default",
        }
      } else {
        const existingExt = path.extname(existing.fileName).toLowerCase()
        if (extPriority[ext] < (extPriority[existingExt] || 99)) {
          result[sku] = {
            sku,
            name,
            url,
            fileName: file,
            fileSize: stats.size,
            isRealUpload,
            source: isRealUpload ? "local_upload" : "catalog_default",
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed scanning public/products directory:", err)
  }

  return result
}

/**
 * מחזיר נתיב תמונה חי עבור מק"ט נתון מתוך הקבצים הפיזיים הקיימים או מתוך הגיליון
 */
export async function getLiveProductImageUrl(sku: string): Promise<string> {
  // 1. בדיקת קובץ מקומי
  const scanned = scanProductMediaFiles()
  if (scanned[sku] && scanned[sku].isRealUpload) {
    return scanned[sku].url
  }

  // 2. בדיקה בגיליון מילון_לוגיסטי (עמודה K)
  try {
    const sheetItems = await fetchSheetLogisticsDictionary()
    const sheetMatch = sheetItems.find((item) => item.sku === sku)
    if (sheetMatch?.imageUrl) {
      return sheetMatch.imageUrl
    }
  } catch (e) {
    console.warn("Error fetching sheet image for sku:", sku, e)
  }

  if (scanned[sku]) {
    return scanned[sku].url
  }

  return "/products/default-building-material.svg"
}

/**
 * מייצר טקסט הנחיות עדכני עבור נועה AI עם כל התמונות הקיימות כעת במערכת,
 * כולל שליפה חיה של קישורי תמונות מעמודה K בגיליון מילון_לוגיסטי!
 */
export async function buildProductMediaPrompt(): Promise<string> {
  const scanned = scanProductMediaFiles()
  const scannedSkus = Object.keys(scanned)

  // שליפת נתונים מגיליון מילון_לוגיסטי (Google Sheet)
  let sheetItems: SheetLogisticsItem[] = []
  try {
    sheetItems = await fetchSheetLogisticsDictionary()
  } catch (err) {
    console.warn("Could not load sheet items for prompt:", err)
  }

  // איסוף כל המק"טים עם קישורי תמונה פעילים מהגיליון (עמודה K)
  const sheetImageMap = new Map<string, SheetLogisticsItem>()
  for (const item of sheetItems) {
    if (item.imageUrl) {
      sheetImageMap.set(item.sku, item)
    }
  }

  const itemsLines: string[] = []

  // 1. מיפוי מוצרים מהקטלוג המרכזי
  for (const [sku, item] of Object.entries(PRODUCT_MEDIA_CATALOG)) {
    const liveLocal = scanned[sku]
    const sheetItem = sheetImageMap.get(sku)

    let activeUrl = liveLocal ? liveLocal.url : item.imagePath
    let badge = ""

    // אם יש לינק תמונה מהגיליון עמודה K, נועה תשתמש בו
    if (sheetItem?.imageUrl) {
      activeUrl = sheetItem.imageUrl
      badge = " [📊 מחובר לגיליון מילון_לוגיסטי - עמודה K (תמונה מלינק)!]"
    } else if (liveLocal?.isRealUpload) {
      badge = " [📸 תמונה אמיתית הועלתה למערכת!]"
    }

    itemsLines.push(`- מק"ט **${sku}** ⬅️ "${item.name}"${badge} ⬅️ ![${item.name}](${activeUrl})`)
  }

  // 2. פריטים נוספים מהגיליון שיש להם קישור תמונה אך אינם בקטלוג הבסיסי
  sheetImageMap.forEach((sheetItem, sku) => {
    if (!PRODUCT_MEDIA_CATALOG[sku]) {
      itemsLines.push(
        `- מק"ט **${sku}** ⬅️ "${sheetItem.name}" [📊 מחובר לגיליון מילון_לוגיסטי - עמודה K (תמונה מלינק)!] ⬅️ ![${sheetItem.name}](${sheetItem.imageUrl})`
      )
    }
  })

  // 3. מק"טים מקומיים שהועלו ישירות ולא נמצאים בקטלוג
  for (const sku of scannedSkus) {
    if (!PRODUCT_MEDIA_CATALOG[sku] && !sheetImageMap.has(sku)) {
      const live = scanned[sku]
      itemsLines.push(`- מק"ט **${sku}** ⬅️ "${live.name}" [📸 קובץ מקומי שהועלה] ⬅️ ![${live.name}](${live.url})`)
    }
  }

  return `
### 🖼️ הנחיות תמונות מוצר ומדיה (מחובר לגיליון מילון_לוגיסטי + העלאות קבצים):
נועה AI מסונכרנת בזמן אמת לגיליון Google Sheets של החברה:
- מזהה גיליון: \`1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA\`
- טאב: \`מילון_לוגיסטי\`
- עמודה K ("תמונה"): מכילה לינקים ישירים לתמונות מוצר (כולל PostImage, Google Drive, URLs).
- בנוסף, קיימים קובצי תמונה שהועלו מקומית לשרת (כגון מק"ט 10002).

1. **שליפת תמונות מיידית:**
   בכל פעם שהמשתמש שואל על מוצר, מבקש לראות מוצר, כותב "הציגי לי תמונת מוצר", מציין מק"ט (לדוגמה: 10002, 11501, 11511 וכו'), או מעלה/מזכיר חומר בניין — **את חייבת להציג לו מיד את תמונת המוצר שלו בתחביר Markdown**!
   פורמט חובה:
   \`![שם המוצר](כתובת-התמונה)\`
   מקמי תמיד את התמונה בשורה נפרדת עם שורת רווח מעליה ומתחתיה כדי שתוצג ככרטיס מוצר ויזואלי מהודר.

2. **תמונות קיימות ומאומתות במערכת לפי מק"ט (לינקים חיים מעמודה K + העלאות שרת):**
${itemsLines.join("\n")}

3. **דוגמאות מפורשות לשליפת תמונות מלינק ומקובץ:**
   * **עבור מק"ט 10002 (מלט אפור 25 ק"ג נשר שהועלה כעת):**
     \`\`\`markdown
     הנה תמונת המוצר עבור מק"ט **10002** (מלט אפור 25 ק"ג נשר):

     ![מלט אפור 25 ק"ג נשר](/products/10002.jpg)
     \`\`\`

   * **עבור מק"ט 11501 (חול שק גדול - מחובר מלינק עמודה K מילון_לוגיסטי):**
     \`\`\`markdown
     הנה תמונת המוצר מתוך גיליון מילון_לוגיסטי עבור מק"ט **11501** (חול שק גדול):

     ![חול שק גדול](https://i.postimg.cc/6qZJTcs9/Gemini-Generated-Image-(5).png)
     \`\`\`

   * **עבור מק"ט 11511 (סומסום שק גדול - מחובר מלינק עמודה K מילון_לוגיסטי):**
     \`\`\`markdown
     הנה תמונת המוצר מתוך גיליון מילון_לוגיסטי עבור מק"ט **11511** (סומסום שק גדול):

     ![סומסום שק גדול](https://i.postimg.cc/7LWTYwrf/Gemini-Generated-Image-(6).png)
     \`\`\`

4. **שליפת לינק מגיליון מילון_לוגיסטי עבור מוצרים עתידיים:**
   בכל פעם שמוסיפים לינק לתמונה בעמודה K בגיליון, נועה שולפת את הלינק המדויק ומציגה אותו ישירות בתשובה כ-Markdown Image.

5. **מוצרים ללא תמונה ספציפית:**
   אם הוזכר מוצר שאינו מופיע ברשימה ואין לו לינק בעמודה K, השתמשי בתמונת ברירת המחדל:
   \`![חומרי בניין סבן](/products/default-building-material.svg)\`
`
}
