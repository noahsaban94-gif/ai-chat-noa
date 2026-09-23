/**
 * scripts/generate-product-placeholders.mjs
 * 
 * סקריפט Node.js ליצירת תמונות מוצר מקומיות (Placeholders מעוצבים) בתוך public/products/
 * לפי המק"טים הקטלוגיים של ח. סבן חומרי בניין (1994) בע"מ.
 * 
 * הפעלה:
 * node scripts/generate-product-placeholders.mjs
 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// נתיב ספריית התמונות
const TARGET_DIR = path.resolve(__dirname, "../public/products")

// רשימת המוצרים והעיצובים התואמים
const PRODUCTS = [
  {
    sku: "10002",
    name: 'מלט אפור 25 ק"ג נשר',
    subtitle: 'שק 25 ק"ג תקני | 40 שק במשטח (1,000 ק"ג)',
    category: "מלט וקשירה",
    bgGradientStart: "#374151",
    bgGradientEnd: "#1F2937",
    accentColor: "#9CA3AF",
    badgeBg: "#4B5563",
    badgeText: "#F3F4F6",
    iconType: "cement",
  },
  {
    sku: "11501",
    name: "חול שק גדול (בלה)",
    subtitle: "חול מחצבה נקי ומנופה לבנייה ולטיח",
    category: "תפזורת בלות",
    bgGradientStart: "#B45309",
    bgGradientEnd: "#78350F",
    accentColor: "#FDE68A",
    badgeBg: "#D97706",
    badgeText: "#FFFBEB",
    iconType: "bigbag",
  },
  {
    sku: "11511",
    name: "סומסום שק גדול (בלה)",
    subtitle: "מצע סומסום נקי ומדורג לריצוף ותשתיות",
    category: "תפזורת בלות",
    bgGradientStart: "#78350F",
    bgGradientEnd: "#451A03",
    accentColor: "#FCD34D",
    badgeBg: "#92400E",
    badgeText: "#FEF3C7",
    iconType: "bigbag",
  },
  {
    sku: "11551",
    name: "טיט שק גדול (בלה)",
    subtitle: "טיט מוכן איכותי לבנייה וטיח חוץ/פנים",
    category: "תפזורת בלות",
    bgGradientStart: "#854D0E",
    bgGradientEnd: "#532A06",
    accentColor: "#FEF08A",
    badgeBg: "#A16207",
    badgeText: "#FEFCE8",
    iconType: "bigbag",
  },
  {
    sku: "11570",
    name: "חמרה שק גדול (בלה)",
    subtitle: "אדמת חמרה מנופה לגננות, פיתוח ומילוי",
    category: "תפזורת בלות",
    bgGradientStart: "#9A3412",
    bgGradientEnd: "#431407",
    accentColor: "#FED7AA",
    badgeBg: "#C2410C",
    badgeText: "#FFF7ED",
    iconType: "bigbag",
  },
  {
    sku: "12204",
    name: "בלוק בטון 20/20/40",
    subtitle: "בלוק שחור תקני לבנייה | עמידות גבוהה",
    category: "בלוקים",
    bgGradientStart: "#1E293B",
    bgGradientEnd: "#0F172A",
    accentColor: "#CBD5E1",
    badgeBg: "#334155",
    badgeText: "#F8FAFC",
    iconType: "block",
  },
  {
    sku: "111260",
    name: "לוח גבס לבן 260",
    subtitle: 'לוח גבס תקני 2.60 מ\' | עובי 12.7 מ"מ',
    category: "גבס ופרופילים",
    bgGradientStart: "#0369A1",
    bgGradientEnd: "#0C4A6E",
    accentColor: "#BAE6FD",
    badgeBg: "#0284C7",
    badgeText: "#F0F9FF",
    iconType: "plasterboard",
  },
  {
    sku: "60002",
    name: "שק גדול פקדון (בלה)",
    subtitle: "אריזת שק בלה גמיש עם 4 ידיות הנפה",
    category: "פקדונות אריזה",
    bgGradientStart: "#047857",
    bgGradientEnd: "#064E3B",
    accentColor: "#A7F3D0",
    badgeBg: "#059669",
    badgeText: "#ECFDF5",
    iconType: "deposit-bag",
  },
  {
    sku: "60060",
    name: "משטח סבן פקדון",
    subtitle: "משטח עץ תקני חזק לפריקה במנוף",
    category: "פקדונות אריזה",
    bgGradientStart: "#7C2D12",
    bgGradientEnd: "#431407",
    accentColor: "#FED7AA",
    badgeBg: "#9A3412",
    badgeText: "#FFF7ED",
    iconType: "pallet",
  },
]

/**
 * יצירת קוד SVG בהיר, מקצועי ונקי לפי המוצר
 */
function generateProductSVG(p) {
  let iconSvg = ""

  if (p.iconType === "cement") {
    // שק מלט 25 ק"ג
    iconSvg = `
      <g transform="translate(240, 110)">
        <rect x="0" y="20" width="120" height="150" rx="14" fill="#6B7280" stroke="#E5E7EB" stroke-width="4"/>
        <path d="M 15 20 Q 60 5 105 20" stroke="#E5E7EB" stroke-width="4" fill="none"/>
        <rect x="20" y="55" width="80" height="42" rx="6" fill="#111827" opacity="0.6"/>
        <text x="60" y="76" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="#F9FAFB" text-anchor="middle">נשר</text>
        <text x="60" y="90" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#E5E7EB" text-anchor="middle">מלט CEM II</text>
        <rect x="35" y="115" width="50" height="22" rx="4" fill="#EF4444"/>
        <text x="60" y="130" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#FFFFFF" text-anchor="middle">25 ק"ג</text>
        <circle cx="20" cy="35" r="4" fill="#D1D5DB"/>
        <circle cx="100" cy="35" r="4" fill="#D1D5DB"/>
        <circle cx="20" cy="155" r="4" fill="#D1D5DB"/>
        <circle cx="100" cy="155" r="4" fill="#D1D5DB"/>
      </g>
    `
  } else if (p.iconType === "bigbag" || p.iconType === "deposit-bag") {
    // בלה / שק גדול
    iconSvg = `
      <g transform="translate(235, 105)">
        <!-- ידיות הנפה -->
        <path d="M 20 50 C 20 10, 45 10, 45 50" fill="none" stroke="#FBBF24" stroke-width="7" stroke-linecap="round"/>
        <path d="M 85 50 C 85 10, 110 10, 110 50" fill="none" stroke="#FBBF24" stroke-width="7" stroke-linecap="round"/>
        <!-- גוף השק -->
        <rect x="10" y="45" width="110" height="120" rx="12" fill="#F3F4F6" stroke="#D1D5DB" stroke-width="3"/>
        <rect x="22" y="70" width="86" height="55" rx="6" fill="#1F2937" opacity="0.85"/>
        <text x="65" y="93" font-family="system-ui, sans-serif" font-size="14" font-weight="800" fill="#F59E0B" text-anchor="middle">בלה גדולה</text>
        <text x="65" y="112" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="#FFFFFF" text-anchor="middle">סבן חומרי בניין</text>
        <!-- רצועות חיזוק צולבות -->
        <line x1="10" y1="135" x2="120" y2="135" stroke="#F59E0B" stroke-width="4"/>
        <line x1="30" y1="45" x2="30" y2="165" stroke="#F59E0B" stroke-width="4"/>
        <line x1="100" y1="45" x2="100" y2="165" stroke="#F59E0B" stroke-width="4"/>
      </g>
    `
  } else if (p.iconType === "block") {
    // בלוק בטון
    iconSvg = `
      <g transform="translate(225, 115)">
        <polygon points="10,120 120,120 145,85 35,85" fill="#475569" stroke="#94A3B8" stroke-width="3"/>
        <polygon points="120,120 145,85 145,45 120,70" fill="#334155" stroke="#94A3B8" stroke-width="3"/>
        <polygon points="10,120 35,85 35,45 10,70" fill="#334155" stroke="#94A3B8" stroke-width="3"/>
        <polygon points="10,70 120,70 145,45 35,45" fill="#64748B" stroke="#CBD5E1" stroke-width="3"/>
        <!-- תאי חלל הבלוק -->
        <ellipse cx="60" cy="58" rx="14" ry="7" fill="#1E293B"/>
        <ellipse cx="100" cy="58" rx="14" ry="7" fill="#1E293B"/>
        <rect x="35" y="85" width="80" height="24" rx="4" fill="#0F172A" opacity="0.75"/>
        <text x="75" y="101" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="#F8FAFC" text-anchor="middle">20/20/40</text>
      </g>
    `
  } else if (p.iconType === "plasterboard") {
    // לוח גבס
    iconSvg = `
      <g transform="translate(230, 105)">
        <!-- חבילת לוחות גבס בתלת ממד שטוח -->
        <polygon points="10,130 110,130 135,50 35,50" fill="#F8FAFC" stroke="#0284C7" stroke-width="4"/>
        <polygon points="110,130 135,50 140,55 115,135" fill="#E2E8F0" stroke="#0284C7" stroke-width="2"/>
        <polygon points="10,130 110,130 115,135 15,135" fill="#CBD5E1" stroke="#0284C7" stroke-width="2"/>
        <!-- תו פנימי -->
        <rect x="42" y="70" width="60" height="35" rx="5" fill="#0284C7" opacity="0.9"/>
        <text x="72" y="87" font-family="system-ui, sans-serif" font-size="11" font-weight="900" fill="#FFFFFF" text-anchor="middle">גבס 2.60 מ'</text>
        <text x="72" y="100" font-family="system-ui, sans-serif" font-size="9" font-weight="700" fill="#E0F2FE" text-anchor="middle">תקן 1490</text>
      </g>
    `
  } else if (p.iconType === "pallet") {
    // משטח עץ פקדון
    iconSvg = `
      <g transform="translate(220, 115)">
        <!-- קורות עליונות -->
        <rect x="10" y="30" width="140" height="12" rx="3" fill="#B45309" stroke="#78350F" stroke-width="2"/>
        <rect x="10" y="48" width="140" height="12" rx="3" fill="#D97706" stroke="#78350F" stroke-width="2"/>
        <rect x="10" y="66" width="140" height="12" rx="3" fill="#B45309" stroke="#78350F" stroke-width="2"/>
        <!-- קוביות מרווח -->
        <rect x="15" y="80" width="22" height="22" rx="3" fill="#92400E"/>
        <rect x="69" y="80" width="22" height="22" rx="3" fill="#92400E"/>
        <rect x="123" y="80" width="22" height="22" rx="3" fill="#92400E"/>
        <!-- קורות תחתונות -->
        <rect x="10" y="104" width="140" height="10" rx="2" fill="#78350F"/>
        <!-- תגית סבן -->
        <rect x="45" y="48" width="70" height="12" fill="#000000" opacity="0.6"/>
        <text x="80" y="58" font-family="system-ui, sans-serif" font-size="10" font-weight="900" fill="#FEF3C7" text-anchor="middle">ח. סבן פקדון</text>
      </g>
    `
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.bgGradientStart}" />
      <stop offset="100%" stop-color="${p.bgGradientEnd}" />
    </linearGradient>
    <pattern id="blueprintGrid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#FFFFFF" stroke-width="1" stroke-opacity="0.05" />
    </pattern>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <!-- רקע גרדיאנט ראשי -->
  <rect width="600" height="450" fill="url(#bgGrad)" />
  <rect width="600" height="450" fill="url(#blueprintGrid)" />

  <!-- כותרת ראשית ומיתוג חברה -->
  <g transform="translate(30, 30)">
    <rect x="0" y="0" width="540" height="45" rx="8" fill="#000000" fill-opacity="0.3" />
    <text x="20" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" fill="#93C5FD">ח. סבן חומרי בניין (1994) בע״מ</text>
    <text x="520" y="28" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="600" fill="#E5E7EB" text-anchor="end">קטלוג לוגיסטי רשמי</text>
  </g>

  <!-- כרטיס תוכן מרכזי מעוצב -->
  <g transform="translate(50, 95)" filter="url(#cardShadow)">
    <rect x="0" y="0" width="500" height="300" rx="16" fill="#111827" fill-opacity="0.7" stroke="${p.accentColor}" stroke-width="2" stroke-opacity="0.3"/>
    
    <!-- תגית מק"ט עליונה -->
    <g transform="translate(25, 25)">
      <rect x="0" y="0" width="130" height="32" rx="16" fill="${p.badgeBg}"/>
      <text x="65" y="21" font-family="system-ui, sans-serif" font-size="15" font-weight="900" fill="${p.badgeText}" text-anchor="middle">מק"ט: ${p.sku}</text>
    </g>

    <!-- קטגוריה -->
    <g transform="translate(475, 25)">
      <text x="0" y="21" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${p.accentColor}" text-anchor="end">${p.category}</text>
    </g>

    <!-- אייקון / איור המוצר -->
    ${iconSvg}

    <!-- שם מוצר ראשי בעברית -->
    <text x="250" y="240" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="900" fill="#FFFFFF" text-anchor="middle" direction="rtl">
      ${p.name}
    </text>

    <!-- תיאור משני -->
    <text x="250" y="268" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500" fill="#D1D5DB" text-anchor="middle" direction="rtl">
      ${p.subtitle}
    </text>
  </g>

  <!-- חותמת מקורית בתחתית -->
  <g transform="translate(30, 415)">
    <circle cx="10" cy="10" r="4" fill="#10B981"/>
    <text x="22" y="14" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#9CA3AF">מלאי מנוהל במערכת קומקס ו-ERP סבן</text>
    <text x="540" y="14" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="${p.accentColor}" text-anchor="end">נועה AI • שירות לוגיסטי</text>
  </g>
</svg>`
}

/**
 * תמונת ברירת מחדל כללית לחומרי בניין
 */
function generateDefaultProductSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
  <defs>
    <linearGradient id="defGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
  </defs>
  <rect width="600" height="450" fill="url(#defGrad)" />
  <rect x="40" y="40" width="520" height="370" rx="16" fill="#111827" fill-opacity="0.8" stroke="#38BDF8" stroke-width="2" stroke-opacity="0.4"/>
  
  <g transform="translate(250, 110)">
    <rect x="0" y="20" width="100" height="90" rx="10" fill="#0284C7" stroke="#38BDF8" stroke-width="3"/>
    <polygon points="50,0 0,20 100,20" fill="#38BDF8"/>
    <circle cx="50" cy="65" r="18" fill="#0F172A"/>
    <path d="M 40 65 L 48 73 L 62 57" stroke="#38BDF8" stroke-width="4" fill="none" stroke-linecap="round"/>
  </g>

  <text x="300" y="260" font-family="system-ui, sans-serif" font-size="24" font-weight="900" fill="#FFFFFF" text-anchor="middle" direction="rtl">
    חומרי בניין ומחצבה
  </text>
  <text x="300" y="295" font-family="system-ui, sans-serif" font-size="15" font-weight="600" fill="#94A3B8" text-anchor="middle" direction="rtl">
    ח. סבן חומרי בניין (1994) בע״מ
  </text>
  <text x="300" y="335" font-family="system-ui, sans-serif" font-size="13" font-weight="500" fill="#38BDF8" text-anchor="middle" direction="rtl">
    הובלה, פריקת מנוף ומלאי זמין בסניפי החרש 4 והתלמיד 1
  </text>
</svg>`
}

async function main() {
  console.log("🚀 מתחיל יצירת תמונות מוצר מקומיות...")
  
  // 1. יצירת התיקייה public/products/ במידת הצורך
  if (!fs.existsSync(TARGET_DIR)) {
    console.log(`📁 יוצר תיקייה חדשה: ${TARGET_DIR}`)
    fs.mkdirSync(TARGET_DIR, { recursive: true })
  } else {
    console.log(`✅ התיקייה כבר קיימת: ${TARGET_DIR}`)
  }

  let generatedCount = 0

  // 2. יצירת קובצי המוצרים
  for (const product of PRODUCTS) {
    const svgContent = generateProductSVG(product)

    // שומרים גם כקובץ .jpg (הפורמט שה-Markdown קורא אליו) וגם כ-.svg
    const jpgTarget = path.join(TARGET_DIR, `${product.sku}.jpg`)
    const svgTarget = path.join(TARGET_DIR, `${product.sku}.svg`)

    fs.writeFileSync(jpgTarget, svgContent, "utf8")
    fs.writeFileSync(svgTarget, svgContent, "utf8")

    console.log(`  ✓ נוצרה תמונה עבור מק"ט ${product.sku}: ${product.name} -> ${product.sku}.jpg`)
    generatedCount++
  }

  // 3. יצירת תמונת ברירת המחדל
  const defaultSvgContent = generateDefaultProductSVG()
  const defaultSvgTarget = path.join(TARGET_DIR, "default-building-material.svg")
  const defaultJpgTarget = path.join(TARGET_DIR, "default-building-material.jpg")

  fs.writeFileSync(defaultSvgTarget, defaultSvgContent, "utf8")
  fs.writeFileSync(defaultJpgTarget, defaultSvgContent, "utf8")
  console.log(`  ✓ נוצרה תמונת ברירת מחדל: default-building-material.svg`)

  console.log(`\n🎉 הושלם בהצלחה! סך הכל נוצרו ${generatedCount} תמונות מוצר בתוך ${TARGET_DIR}`)
}

main().catch((err) => {
  console.error("❌ שגיאה ביצירת תמונות מוצר:", err)
  process.exit(1)
})
