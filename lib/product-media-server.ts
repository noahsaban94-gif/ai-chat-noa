/**
 * lib/product-media-server.ts
 * 
 * מודול צד-שרת מורחב לסנכרון תמונות מוצר של ח. סבן:
 * 1. סריקה דינמית של קובצי תמונות מוצר מקומיים ב-public/products/ + זיהוי קבצים בתיקיית השורש
 * 2. חיבור חי לגיליון מילון_לוגיסטי (Google Sheet ID: 1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA)
 *    עמודה K ("תמונה") — שליפת תמונות מלינקים חיצוניים (PostImage, Drive, URLs)
 * 3. קדימות היברידית: קובץ מקומי אמיתי שהועלה מקבל עדיפות עליונה, וקישור גיליון מעמודה K משמש כראשי או גיבוי מיידי
 */

import fs from "fs"
import path from "path"
import { PRODUCT_MEDIA_CATALOG } from "./product-media"
import { fetchSheetLogisticsDictionary, type SheetLogisticsItem } from "./sheet-logistics-dictionary"
import { extractSkuFromText } from "./product-data-service"
import { TRAINING_PRODUCTS } from "./training-videos"

export interface ScannedProductMedia {
  sku: string
  name: string
  url: string
  fileName: string
  fileSize: number
  isRealUpload: boolean
  source: "local_upload" | "sheet_column_k" | "catalog_default"
}

export interface ResolvedProductMedia {
  sku: string
  name: string
  primaryUrl: string
  localUrl: string | null
  sheetUrl: string | null
  youtubeUrl: string | null
  hasLocalFile: boolean
  hasSheetUrl: boolean
  isRealLocalUpload: boolean
  source: "local_upload" | "sheet_column_k" | "catalog_default" | "fallback"
}

const PRODUCTS_DIR = path.join(process.cwd(), "public/products")

/**
 * מסנכרן אוטומטית קבצי תמונה שהועלו לשורש המערכת (process.cwd()) ישירות ל-public/products
 */
function syncRootUploadedImages(): void {
  try {
    const rootDir = process.cwd()
    if (!fs.existsSync(PRODUCTS_DIR)) {
      fs.mkdirSync(PRODUCTS_DIR, { recursive: true })
    }

    const rootFiles = fs.readdirSync(rootDir)
    const imgExtRegex = /^\d+\.(jpg|jpeg|png|webp|svg)$/i

    for (const file of rootFiles) {
      if (imgExtRegex.test(file)) {
        const rootPath = path.join(rootDir, file)
        const targetPath = path.join(PRODUCTS_DIR, file)
        
        try {
          const stats = fs.statSync(rootPath)
          if (stats.isFile() && stats.size > 0) {
            // אם הקובץ לא קיים ב-public/products או שונה בגודלו, נעתיק
            if (!fs.existsSync(targetPath) || fs.statSync(targetPath).size !== stats.size) {
              fs.copyFileSync(rootPath, targetPath)
              console.log(`[ProductMediaServer] Synced root image ${file} to public/products/`)
            }
          }
        } catch (e) {
          console.warn(`[ProductMediaServer] Error syncing root image ${file}:`, e)
        }
      }
    }
  } catch (err) {
    console.warn("[ProductMediaServer] Failed root sync check:", err)
  }
}

/**
 * סורק את ספריית public/products ומחזיר מיפוי עדכני של כל המק"טים לקובץ התמונה האמיתי שלהם
 */
export function scanProductMediaFiles(): Record<string, ScannedProductMedia> {
  const result: Record<string, ScannedProductMedia> = {}

  try {
    // 1. סנכרון מקדים של קבצים שהועלו לשורש הפרויקט
    syncRootUploadedImages()

    if (!fs.existsSync(PRODUCTS_DIR)) {
      fs.mkdirSync(PRODUCTS_DIR, { recursive: true })
      return result
    }

    const files = fs.readdirSync(PRODUCTS_DIR)
    
    // סדר עדיפויות לסיומות מקומיות: jpg > png > jpeg > webp > svg
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
      // קובץ אמיתי נחשב אם אינו SVG וגודלו מעל 100 בתים
      const isRealUpload = ext !== ".svg" && stats.size > 100

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
        const currentScore = (isRealUpload ? 0 : 10) + (extPriority[ext] || 99)
        const existingScore = (existing.isRealUpload ? 0 : 10) + (extPriority[existingExt] || 99)
        
        if (currentScore < existingScore) {
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
 * מבצע רזולוציה מלאה והיברידית של תמונת מוצר לפי מק"ט:
 * בודק קובץ מקומי במאגר + קישור מגיליון עמודה K ומחזיר את שניהם יחד עם הקישור המועדף
 */
export async function resolveProductMedia(sku: string): Promise<ResolvedProductMedia> {
  const cleanSku = String(sku || "").trim().toLowerCase()
  const scanned = scanProductMediaFiles()
  const local = scanned[cleanSku]
  
  let sheetUrl: string | null = null
  let sheetYoutubeUrl: string | null = null
  let productName = local?.name || PRODUCT_MEDIA_CATALOG[cleanSku]?.name || `מוצר ${cleanSku}`

  try {
    const sheetItems = await fetchSheetLogisticsDictionary()
    const match = sheetItems.find((i) => i.sku.toLowerCase() === cleanSku)
    if (match) {
      if (match.imageUrl) {
        sheetUrl = match.imageUrl
      } else if (match.productImageColJ && match.productImageColJ.startsWith("http")) {
        sheetUrl = match.productImageColJ
      }
      if (match.youtubeUrl) {
        sheetYoutubeUrl = match.youtubeUrl
      }
      if (match.name) {
        productName = match.name
      }
    }
  } catch (e) {
    console.warn("[ProductMediaServer] Sheet fetch error during resolve:", e)
  }

  // איתור סרטון הדרכה
  let youtubeUrl: string | null = sheetYoutubeUrl
  if (!youtubeUrl) {
    const trainingMatch = TRAINING_PRODUCTS.find(
      (p) => p.sku?.toLowerCase() === cleanSku || p.keywords.some((k) => k.toLowerCase() === cleanSku)
    )
    if (trainingMatch) {
      youtubeUrl = trainingMatch.youtubeUrl
    } else if (cleanSku === "112260") {
      youtubeUrl = "https://www.youtube.com/watch?v=6B0Ih74mpkk"
    }
  }

  const localUrl = local ? local.url : null
  const isRealLocalUpload = Boolean(local?.isRealUpload)

  // קדימות:
  // 1. קובץ מקומי אמיתי שהועלה לשרת (מהיר, יציב וללא תלות בשרת חיצוני)
  // 2. קישור ישיר מגיליון מילון_לוגיסטי עמודה K
  // 3. קובץ מקומי מובנה (כגון SVG)
  // 4. תמונת ברירת מחדל
  let primaryUrl = "/products/default-building-material.svg"
  let source: ResolvedProductMedia["source"] = "fallback"

  if (isRealLocalUpload && localUrl) {
    primaryUrl = localUrl
    source = "local_upload"
  } else if (sheetUrl) {
    primaryUrl = sheetUrl
    source = "sheet_column_k"
  } else if (localUrl) {
    primaryUrl = localUrl
    source = "catalog_default"
  }

  return {
    sku: cleanSku,
    name: productName,
    primaryUrl,
    localUrl,
    sheetUrl,
    youtubeUrl,
    hasLocalFile: Boolean(localUrl),
    hasSheetUrl: Boolean(sheetUrl),
    isRealLocalUpload,
    source,
  }
}

/**
 * מחזיר נתיב תמונה חי עבור מק"ט נתון
 */
export async function getLiveProductImageUrl(sku: string): Promise<string> {
  const resolved = await resolveProductMedia(sku)
  return resolved.primaryUrl
}

/**
 * מייצר טקסט הנחיות עדכני עבור נועה AI עם כל התמונות הקיימות כעת במערכת,
 * כולל קבצים מקומיים (במאגר המקומי) ולינקים חיים מגיליון מילון_לוגיסטי (עמודה K)!
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
      sheetImageMap.set(item.sku.toLowerCase(), item)
    }
  }

  const itemsLines: string[] = []

  // 1. מיפוי מוצרים מהקטלוג המרכזי
  for (const [sku, item] of Object.entries(PRODUCT_MEDIA_CATALOG)) {
    const cleanSku = sku.toLowerCase()
    const liveLocal = scanned[cleanSku]
    const sheetItem = sheetImageMap.get(cleanSku)

    let activeUrl = liveLocal ? liveLocal.url : item.imagePath
    let badge = ""

    if (liveLocal?.isRealUpload) {
      activeUrl = liveLocal.url
      badge = ` [📸 קובץ מקומי אמיתי בשרת: ${liveLocal.url}]`
      if (sheetItem?.imageUrl) {
        badge += ` [📊 קיים גם קישור גיליון עמודה K: ${sheetItem.imageUrl}]`
      }
    } else if (sheetItem?.imageUrl) {
      activeUrl = sheetItem.imageUrl
      badge = ` [📊 מחובר לגיליון מילון_לוגיסטי עמודה K: ${sheetItem.imageUrl}]`
    } else if (liveLocal) {
      badge = ` [📁 קטלוג בסיס: ${liveLocal.url}]`
    }

    itemsLines.push(`- מק"ט **${sku}** ⬅️ "${item.name}"${badge} ⬅️ ![${item.name}](${activeUrl})`)
  }

  // 2. פריטים נוספים מהגיליון שיש להם קישור תמונה אך אינם בקטלוג הבסיסי
  sheetImageMap.forEach((sheetItem, sku) => {
    if (!PRODUCT_MEDIA_CATALOG[sku]) {
      const liveLocal = scanned[sku]
      let activeUrl = sheetItem.imageUrl || ""
      let badge = ` [📊 מחובר לגיליון מילון_לוגיסטי - עמודה K]`
      
      if (liveLocal?.isRealUpload) {
        activeUrl = liveLocal.url
        badge = ` [📸 קובץ מקומי אמיתי הועלה לשרת: ${liveLocal.url}] [📊 קישור גיליון: ${sheetItem.imageUrl}]`
      }

      itemsLines.push(
        `- מק"ט **${sku}** ⬅️ "${sheetItem.name}"${badge} ⬅️ ![${sheetItem.name}](${activeUrl})`
      )
    }
  })

  // 3. מק"טים מקומיים שהועלו ישירות ולא נמצאים בקטלוג הבסיס או בגיליון
  for (const sku of scannedSkus) {
    if (!PRODUCT_MEDIA_CATALOG[sku] && !sheetImageMap.has(sku)) {
      const live = scanned[sku]
      itemsLines.push(`- מק"ט **${sku}** ⬅️ "${live.name}" [📸 קובץ מקומי שהועלה] ⬅️ ![${live.name}](${live.url})`)
    }
  }

  return `
### 🖼️ הנחיות תמונות מוצר ומדיה (שילוב מאגר מקומי + גיליון מילון_לוגיסטי עמודה K):
נועה AI מסונכרנת בזמן אמת לשני מאגרי מדיה מקבילים של החברה:
1. **מאגר מקומי (public/products/):** קבצים פיזיים שהועלו לשרת (כגון 10002.jpg, 11501.jpg).
2. **גיליון מילון_לוגיסטי (Google Sheets):** עמודה K ("תמונה") המכילה לינקים ישירים (PostImage, Google Drive, URLs).

חוקי ברזל להצגת תמונות מוצר:
1. **שליפת תמונות מיידית:**
   בכל פעם שהמשתמש שואל על מוצר, מבקש לראות מוצר, כותב "הציגי לי תמונת מוצר", מציין מק"ט (לדוגמה: 10002, 11501, 11511 וכו'), או מעלה/מזכיר חומר בניין — **את חייבת להציג לו מיד את תמונת המוצר שלו בתחביר Markdown**!
   פורמט חובה:
   \`![שם המוצר](כתובת-התמונה)\`
   מקמי תמיד את התמונה בשורה נפרדת עם שורת רווח מעליה ומתחתיה כדי שתוצג ככרטיס מוצר ויזואלי מהודר.

2. **תמונות קיימות ומאומתות במערכת לפי מק"ט (מאגר מקומי + קישורי גיליון):**
${itemsLines.join("\n")}

3. **דוגמאות מפורשות לשליפת תמונות מקובץ מקומי ומגיליון:**
   * **עבור מק"ט 10002 (מלט אפור 25 ק"ג נשר — קיים במאגר המקומי):**
     \`\`\`markdown
     הנה תמונת המוצר עבור מק"ט **10002** (מלט אפור 25 ק"ג נשר):

     ![מלט אפור 25 ק"ג נשר](/products/10002.jpg)
     \`\`\`

   * **עבור מק"ט 11501 (חול שק גדול — קיים במאגר המקומי + לינק עמודה K):**
     \`\`\`markdown
     הנה תמונת המוצר עבור מק"ט **11501** (חול שק גדול):

     ![חול שק גדול (בלה)](/products/11501.jpg)
     \`\`\`

   * **עבור מק"ט 11511 (סומסום שק גדול — קישור גיליון עמודה K):**
     \`\`\`markdown
     הנה תמונת המוצר מתוך גיליון מילון_לוגיסטי עבור מק"ט **11511** (סומסום שק גדול):

     ![סומסום שק גדול (בלה)](https://i.postimg.cc/7LWTYwrf/Gemini-Generated-Image-(6).png)
     \`\`\`

4. **מוצרים ללא תמונה ספציפית:**
   אם הוזכר מוצר שאינו מופיע ברשימה ואין לו קובץ מקומי או לינק בעמודה K, השתמשי בתמונת ברירת המחדל:
   \`![חומרי בניין סבן](/products/default-building-material.svg)\`
`
}

/**
 * בונה הנחיה ממוקדת ומחייבת (Targeted Prompt Snippet) כאשר ההודעה הנוכחית של המשתמש מכילה מק"ט או בקשת תמונה
 */
export async function buildTargetedProductMediaSnippet(userMessage: string): Promise<string> {
  const detectedSku = extractSkuFromText(userMessage)
  
  // זיהוי לפי מילות מפתח מובילות אם לא זוהה מק"ט מפורש
  let targetSku = detectedSku
  if (!targetSku) {
    if (/112260|גבס ירוק|ירוק 260|עמיד.*לחות|עמידות מוגברת|גבס למקלחות/i.test(userMessage)) targetSku = "112260"
    else if (/חול|רמל|11501/i.test(userMessage)) targetSku = "11501"
    else if (/סומסום|סמסם|11511/i.test(userMessage)) targetSku = "11511"
    else if (/טיט|11551/i.test(userMessage)) targetSku = "11551"
    else if (/מלט|נשר|10002/i.test(userMessage)) targetSku = "10002"
    else if (/חמרה|11570/i.test(userMessage)) targetSku = "11570"
    else if (/בלוק|12204/i.test(userMessage)) targetSku = "12204"
    else if (/111260|גבס לבן/i.test(userMessage)) targetSku = "111260"
  }

  if (!targetSku) {
    return ""
  }

  const resolved = await resolveProductMedia(targetSku)
  const isVideoRequested = /סרטון|הדרכה|וידאו|יוטיוב|youtube|video|katk/i.test(userMessage)

  let videoSection = ""
  if (resolved.youtubeUrl) {
    videoSection = `
- **קישור סרטון הדרכה מקצועי (עמודה U / מילון לוגיסטי):** \`${resolved.youtubeUrl}\`
${isVideoRequested || targetSku === "112260" ? `
**חובה חמורה: המשתמש ביקש סרטון הדרכה או שאל על מוצר עם הדרכה!**
עלייך לכלול בתשובתך את סרטון היוטיוב בתחביר Markdown הבא, בשורה נפרדת לחלוטין (כדי שנגן היוטיוב המשובץ יוצג מיד בממשק):
[סרטון הדרכה מקצועי: ${resolved.name}](${resolved.youtubeUrl})

בנוסף, הצג את שלבי היישום הטכניים העיקריים של המוצר (הכנת תשתית, מרווחי ניצבים 40 ס"מ בחדרים רטובים, הגבהה 10-15 מ"מ מהרצפה, שימוש בברגים עמידי קורוזיה ושפכטל עמיד לחות, ושכבת איטום סיקה 107 במקלחות).
` : ""}`
  }

  return `
### 🚨 חובה מיידית: מוצר זוהה בהודעת המשתמש — הציגי את תמונת המוצר${resolved.youtubeUrl ? " וסרטון ההדרכה" : ""}!
המשתמש מתייחס כעת למוצר מק"ט **${resolved.sku}** (${resolved.name}).
- **קובץ מקומי במערכת:** ${resolved.localUrl ? `${resolved.localUrl} (סטטוס: ${resolved.isRealLocalUpload ? "קובץ אמיתי" : "ברירת מחדל"})` : "לא קיים"}
- **קישור מגיליון מילון_לוגיסטי (עמודה K):** ${resolved.sheetUrl || "לא קיים"}
- **כתובת התמונה הראשית המחייבת לשימוש כעת:** \`${resolved.primaryUrl}\`
${videoSection}

**הנחיה בלתי ניתנת לערעור:**
עלייך לכלול בתשובתך את תמונת המוצר המדויקת בתחביר Markdown הבא, בשורה נפרדת לחלוטין עם שורה ריקה מעליה ושורה ריקה מתחתיה:
![${resolved.name}](${resolved.primaryUrl})
`
}
