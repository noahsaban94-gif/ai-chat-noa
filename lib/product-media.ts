/**
 * lib/product-media.ts
 * 
 * תשתית מדיה ומיפוי מק"טים קטלוגיים לתמונות מוצר
 * ח. סבן חומרי בניין (1994) בע"מ
 */

export interface ProductMediaItem {
  sku: string
  name: string
  imagePath: string
  category: string
  fallbackAlt: string
  aliases?: string[]
}

/**
 * מילון מרכזי הממפה מק"טים קטלוגיים של ח. סבן לתמונות מוצר רשמיות
 */
export const PRODUCT_MEDIA_CATALOG: Record<string, ProductMediaItem> = {
  "10002": {
    sku: "10002",
    name: 'מלט אפור 25 ק"ג נשר',
    imagePath: "/products/10002.png",
    category: "מלט וקשירה",
    fallbackAlt: "שק מלט אפור 25 קג נשר",
    aliases: ["מלט אפור", "מלט", "שק מלט", "נשר", "מלט 25", "אסמנת"],
  },
  "11501": {
    sku: "11501",
    name: "חול שק גדול (בלה)",
    imagePath: "/products/11501.jpg",
    category: "תפזורת בלות",
    fallbackAlt: "בלה חול מחצבה נקי",
    aliases: ["חול", "בלה חול", "בלת חול", "שק חול", "רמל"],
  },
  "11511": {
    sku: "11511",
    name: "סומסום שק גדול (בלה)",
    imagePath: "/products/11511.jpg",
    category: "תפזורת בלות",
    fallbackAlt: "בלה סומסום מצע לריצוף",
    aliases: ["סומסום", "בלה סומסום", "סמסם", "מצע ריצוף", "11502"],
  },
  "11551": {
    sku: "11551",
    name: "טיט שק גדול (בלה)",
    imagePath: "/products/11551.jpg",
    category: "תפזורת בלות",
    fallbackAlt: "בלה טיט מוכן לבנייה וטיח",
    aliases: ["טיט", "בלה טיט", "טיין", "11503"],
  },
  "11570": {
    sku: "11570",
    name: "חמרה שק גדול (בלה)",
    imagePath: "/products/11570.jpg",
    category: "תפזורת בלות",
    fallbackAlt: "בלה אדמת חמרה מנופה לגננות ופיתוח",
    aliases: ["חמרה", "אדמת חמרה", "בלה חמרה"],
  },
  "12204": {
    sku: "12204",
    name: "בלוק בטון 20/20/40",
    imagePath: "/products/12204.jpg",
    category: "בלוקים",
    fallbackAlt: "בלוק בטון שחור תקני 20",
    aliases: ["בלוק 20", "בלוק בטון", "בלוק שחור", "140020"],
  },
  "111260": {
    sku: "111260",
    name: "לוח גבס לבן 260",
    imagePath: "/products/111260.jpg",
    category: "גבס ופרופילים",
    fallbackAlt: "לוח גבס לבן תקני אורבונד/טמבור 2.60 מטר",
    aliases: ["לוח גבס", "גבס לבן", "גבס 2.60", "גבס 260"],
  },
  "60002": {
    sku: "60002",
    name: "שק גדול פקדון (בלה)",
    imagePath: "/products/60002.jpg",
    category: "פקדונות אריזה",
    fallbackAlt: "שק בלה ריק פקדון חוזר",
    aliases: ["פקדון בלה", "שק גדול", "שוואל", "שואיל"],
  },
  "60060": {
    sku: "60060",
    name: "משטח סבן פקדון",
    imagePath: "/products/60060.jpg",
    category: "פקדונות אריזה",
    fallbackAlt: "משטח עץ תקני סבן פקדון",
    aliases: ["משטח סבן", "פקדון משטח", "משטח עץ"],
  },
}

/**
 * תמונת ברירת מחדל אלגנטית לחומרי בניין כשאין תמונה ייעודית
 */
export const DEFAULT_PRODUCT_IMAGE = "/products/default-building-material.svg"

/**
 * מחזיר את נתיב התמונה המדויק לפי מק"ט או שם מוצר.
 * אם המוצר אינו קיים, מחזיר את תמונת ברירת המחדל.
 * 
 * @param skuOrName מק"ט מספרי (למשל "10002") או שם מוצר חלקי/מלא
 * @returns נתיב התמונה במערכת ה-public (למשל "/products/10002.jpg")
 */
export function getProductImageUrl(skuOrName: string): string {
  if (!skuOrName || typeof skuOrName !== "string") {
    return DEFAULT_PRODUCT_IMAGE
  }

  const cleanQuery = skuOrName.trim().toLowerCase()

  // 1. בדיקה ישירה לפי מק"ט
  if (PRODUCT_MEDIA_CATALOG[cleanQuery]) {
    return PRODUCT_MEDIA_CATALOG[cleanQuery].imagePath
  }

  // 2. חיפוש לפי התאמת שם מוצר או כינויים (aliases)
  const items = Object.values(PRODUCT_MEDIA_CATALOG)
  const matched = items.find((item) => {
    if (item.sku === cleanQuery) return true
    if (item.name.toLowerCase().includes(cleanQuery)) return true
    if (cleanQuery.includes(item.name.toLowerCase())) return true
    if (item.aliases?.some((alias) => cleanQuery.includes(alias.toLowerCase()) || alias.toLowerCase().includes(cleanQuery))) {
      return true
    }
    return false
  })

  return matched ? matched.imagePath : DEFAULT_PRODUCT_IMAGE
}

/**
 * שליפת המידע המלא על פריט מדיה לפי מק"ט או שם
 */
export function getProductMedia(skuOrName: string): ProductMediaItem | null {
  if (!skuOrName || typeof skuOrName !== "string") return null

  const cleanQuery = skuOrName.trim().toLowerCase()
  if (PRODUCT_MEDIA_CATALOG[cleanQuery]) {
    return PRODUCT_MEDIA_CATALOG[cleanQuery]
  }

  const items = Object.values(PRODUCT_MEDIA_CATALOG)
  const matched = items.find((item) => {
    if (item.sku === cleanQuery) return true
    if (item.name.toLowerCase().includes(cleanQuery)) return true
    if (cleanQuery.includes(item.name.toLowerCase())) return true
    if (item.aliases?.some((alias) => cleanQuery.includes(alias.toLowerCase()) || alias.toLowerCase().includes(cleanQuery))) {
      return true
    }
    return false
  })

  return matched || null
}

/**
 * יצירת תחביר Markdown לתמונת מוצר לפי מק"ט
 * דוגמה: ![מלט אפור 25 ק"ג נשר](/products/10002.jpg)
 */
export function formatProductMarkdownImage(sku: string, customAlt?: string): string {
  const media = PRODUCT_MEDIA_CATALOG[sku]
  if (media) {
    const alt = customAlt || media.name
    return `![${alt}](${media.imagePath})`
  }
  return `![${customAlt || "חומר בניין סבן"}](${DEFAULT_PRODUCT_IMAGE})`
}
