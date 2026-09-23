/**
 * lib/product-media-server.ts
 * 
 * מודול צד-שרת לסריקה דינמית של קובצי תמונות מוצר ב-public/products/
 * מאפשר זיהוי מיידי של תמונות חדשות שהועלו (.png, .jpg, .jpeg, .webp, .svg)
 */

import fs from "fs"
import path from "path"
import { PRODUCT_MEDIA_CATALOG } from "./product-media"

export interface ScannedProductMedia {
  sku: string
  name: string
  url: string
  fileName: string
  fileSize: number
  isRealUpload: boolean
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
    
    // סדר עדיפויות לסיומות: png > jpg > jpeg > webp > svg
    const extPriority: Record<string, number> = {
      ".png": 1,
      ".jpg": 2,
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
 * מחזיר נתיב תמונה חי עבור מק"ט נתון מתוך הקבצים הפיזיים הקיימים
 */
export function getLiveProductImageUrl(sku: string): string {
  const scanned = scanProductMediaFiles()
  if (scanned[sku]) {
    return scanned[sku].url
  }
  return "/products/default-building-material.svg"
}

/**
 * מייצר טקסט הנחיות עדכני עבור נועה AI עם כל התמונות הקיימות כעת במערכת
 */
export function buildProductMediaPrompt(): string {
  const scanned = scanProductMediaFiles()
  const scannedSkus = Object.keys(scanned)

  const itemsLines: string[] = []

  // נוודא שכל המק"טים הידועים מיוצגים
  for (const [sku, item] of Object.entries(PRODUCT_MEDIA_CATALOG)) {
    const live = scanned[sku]
    const activeUrl = live ? live.url : item.imagePath
    const uploadBadge = live?.isRealUpload ? " [📸 תמונה אמיתית הועלתה למערכת!]" : ""
    itemsLines.push(`- מק"ט **${sku}** ⬅️ "${item.name}"${uploadBadge} ⬅️ ![${item.name}](${activeUrl})`)
  }

  // נוסיף מק"טים חדשים שהועלו ישירות ולא נמצאים בקטלוג הבסיסי
  for (const sku of scannedSkus) {
    if (!PRODUCT_MEDIA_CATALOG[sku]) {
      const live = scanned[sku]
      itemsLines.push(`- מק"ט **${sku}** ⬅️ "${live.name}" [📸 קובץ שהועלה] ⬅️ ![${live.name}](${live.url})`)
    }
  }

  return `
### 🖼️ הנחיות תמונות מוצר ומדיה מקומית (חובה ומחייב בכל פנייה על מוצרים!):
1. **שליפת תמונות מיידית:**
   בכל פעם שהמשתמש שואל על מוצר, מבקש לראות מוצר, כותב "הציגי לי תמונת מוצר", מציין מק"ט (לדוגמה: 10002, 11501, וכו'), או מעלה/מזכיר חומר בניין — **את חייבת להציג לו מיד את תמונת המוצר שלו בתחביר Markdown**!
   פורמט חובה:
   \`![שם המוצר](/products/[שם-קובץ-מלא])\`
   מקמי תמיד את התמונה בשורה נפרדת עם שורת רווח מעליה ומתחתיה כדי שתוצג ככרטיס מוצר ויזואלי מהודר.

2. **תמונות קיימות ומאומתות במערכת לפי מק"ט (כולל קבצים אמיתיים שהועלו):**
${itemsLines.join("\n")}

3. **דוגמה קונקרטית:**
   אם המשתמש אומר "העליתי מוצר הציגי לי תמונת מוצר 10002":
   תשובתך חייבת לכלול:
   \`\`\`markdown
   הנה תמונת המוצר עבור מק"ט **10002** (מלט אפור 25 ק"ג נשר):

   ![מלט אפור 25 ק"ג נשר](/products/10002.png)
   \`\`\`

4. **מוצרים ללא תמונה ספציפית:**
   אם הוזכר מוצר שאינו מופיע ברשימה הנ"ל ואין לו מק"ט קיים, השתמשי בתמונת ברירת המחדל:
   \`![חומרי בניין סבן](/products/default-building-material.svg)\`
`
}
