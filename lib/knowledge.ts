/**
 * knowledge.ts
 * מאגר הידע, ה-DNA הארגוני, קטלוג המק"טים, חוקי הפקדונות, וזיהוי בעלי התפקידים והלקוחות של נועה AI
 * ח. סבן חומרי בניין (1994) בע"מ
 */

export interface InventoryItem {
  sku: string
  name: string
  deposits: {
    bela: boolean
    pallet: boolean
    barrel: boolean
    blockPallet: boolean
  }
}

export interface TeamMember {
  name: string
  role: string
  context: string
  family?: {
    children?: string
    son?: string
    brother?: string
  }
  personality?: string
}

export interface ClientRecord {
  id?: number
  name: string
  phone?: string
  altPhone?: string
  comaxId: string
  comaxCardName: string
  contactPerson?: string
  address: string
  city?: string
  defaultDriver: string
  defaultWarehouse?: string
  driveFolderUrl?: string
  driveFolder?: string
  projects?: string[]
  extraCardName?: string
}

export const INVENTORY_CATALOG: InventoryItem[] = [
  {
    "sku": "10002",
    "name": "מלט אפור",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "15770",
    "name": "טיח ממ\"ד",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11526",
    "name": "סיד בור חבית",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": true,
      "blockPallet": false
    }
  },
  {
    "sku": "30509",
    "name": "פינת טיח ישראלי 3.00 מטר",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "18050",
    "name": "הובלת מנוף הוד השרון",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11521",
    "name": "שליכט שק גדול",
    "deposits": {
      "bela": true,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11500",
    "name": "חול שק",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11501",
    "name": "חול שק גדול",
    "deposits": {
      "bela": true,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11505",
    "name": "חצץ שק",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11506",
    "name": "חצץ שק גדול",
    "deposits": {
      "bela": true,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11507",
    "name": "חצץ ניקוז 7/8 שק גדול",
    "deposits": {
      "bela": true,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11510",
    "name": "סומסום שק",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11511",
    "name": "סומסום שק גדול",
    "deposits": {
      "bela": true,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11515",
    "name": "מחצבה שק",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11520",
    "name": "שליכט חול שק",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11540",
    "name": "מצע שק גדול",
    "deposits": {
      "bela": true,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11550",
    "name": "טיט מוכן שק",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11551",
    "name": "טיט מוכן שק גדול",
    "deposits": {
      "bela": true,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11570",
    "name": "חמרה שק גדול",
    "deposits": {
      "bela": true,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11601",
    "name": "חול גנים שק גדול כולל פקדון",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11600",
    "name": "חול - שק גדול כולל פקדון",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11605",
    "name": "טיט - שק גדול כולל פקדון",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "11615",
    "name": "סומסום - שק גדול כולל פקדון",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "12003",
    "name": "בלוק בטון 3/20/40 (פלטה)",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": true
    }
  },
  {
    "sku": "12004",
    "name": "בלוק בטון 4/20/40 (פלטה)",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": true
    }
  },
  {
    "sku": "12007",
    "name": "בלוק בטון 7/20/40",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": true
    }
  },
  {
    "sku": "12010",
    "name": "בלוק בטון 10/20/40",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": true
    }
  },
  {
    "sku": "12018",
    "name": "בלוק קוביה 20 []",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": true
    }
  },
  {
    "sku": "12021",
    "name": "בלוק ופלה 20/10/40",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": true
    }
  },
  {
    "sku": "12022",
    "name": "בלוק ופלה 10/10/40",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": true
    }
  },
  {
    "sku": "12154",
    "name": "בלוק בטון 15/20/40 4 חורים",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": true
    }
  },
  {
    "sku": "12202",
    "name": "בלוק בטון 20/20/40 2 חורים",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": true
    }
  },
  {
    "sku": "12204",
    "name": "בלוק בטון 20/20/40 4 חורים",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": true
    }
  },
  {
    "sku": "12205",
    "name": "בלוק תרמי 20/20/40 5 חורים",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": true
    }
  },
  {
    "sku": "12215",
    "name": "בלוק שוקת 20/20/40",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": true
    }
  },
  {
    "sku": "12225",
    "name": "בלוק תרמי 22/20/40 5 חורים",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": true
    }
  },
  {
    "sku": "12913",
    "name": "פריקת מנוף גדול (בלוקים)",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "18209",
    "name": "הובלת משאית מנוף 09",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "60006",
    "name": "משטח בלוקים פקדון",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "60060",
    "name": "משטח סבן פקדון",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "60002",
    "name": "שק גדול פקדון (בלה)",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "10015",
    "name": "בטון מהיר מוכן 25 ק\"ג",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "14202",
    "name": "גבס 2.5 ק\"ג",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "14233",
    "name": "מלט לבן 2.5 ק\"ג",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "14245",
    "name": "מלט אפור 2.5 ק\"ג",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "15010",
    "name": "טיח בריכות גלקסי 10 25 ק\"ג",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "15109",
    "name": "דבק 109 25 ק\"ג כרמית",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "15116",
    "name": "דבק 116 לבן 25 ק\"ג כרמית",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "15181",
    "name": "ריצופית אפור 181 25 ק\"ג",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "15710",
    "name": "טיח חוץ 710 שק 25 ק\"ג",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "15720",
    "name": "הרבצה 720 25 ק\"ג כרמית",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "15800",
    "name": "טיח גבס 800 25 ק\"ג כרמית",
    "deposits": {
      "bela": false,
      "pallet": true,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "111000",
    "name": "לוח גבס לבן מ\"ר **",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "111200",
    "name": "לוח גבס לבן 200 ע 12.50",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "111260",
    "name": "לוח גבס לבן 260 ע 12.50",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "111280",
    "name": "לוח גבס לבן 280 ע 12.50",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "111300",
    "name": "לוח גבס לבן 300 ע 12.50",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "112200",
    "name": "לוח גבס ירוק 200 ע 12.50",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "112260",
    "name": "לוח גבס ירוק 260 ע 12.50",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "112280",
    "name": "לוח גבס ירוק 280 ע 12.50",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "112300",
    "name": "לוח גבס ירוק 300 ע 12.50",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "114260",
    "name": "לוח גבס כחול 260 ע 12.50",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "8550300",
    "name": "מסלול 0.5 50/300",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "8570300",
    "name": "מסלול 0.5 70/300",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "9550260",
    "name": "ניצב 0.5 50/260",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "9550300",
    "name": "ניצב 0.5 50/300",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "9570300",
    "name": "ניצב 0.5 70/300",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "76206",
    "name": "בורג גבס 25 1000 יח' VERO",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "76133",
    "name": "בורג פחפח 13 1000 יח' VERO",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "71710",
    "name": "סרט/רשת 5 לגבס 90 מ.א.",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "18055",
    "name": "הובלת מנוף כפר סבא-רעננה",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "18060",
    "name": "הובלת מנוף הרצליה - רמה\"ש",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "18065",
    "name": "הובלת מנוף תל אביב צפון",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "18070",
    "name": "הובלת מנוף תל אביב מרכז",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "18075",
    "name": "הובלת מנוף רמת גן-גבעתיים",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "18095",
    "name": "הובלת מנוף ראש העין-פ\"ת",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "818050",
    "name": "הובלה ללא פריקה הוד השרון",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "818055",
    "name": "הובלה ללא פריקה כ\"ס-רעננה",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "818060",
    "name": "הובלה ללא פריקה הרצליה-רמה\"ש",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "818065",
    "name": "הובלה ללא פריקה תל אביב צפון",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  },
  {
    "sku": "818070",
    "name": "הובלה ללא פריקה תל אביב מרכז",
    "deposits": {
      "bela": false,
      "pallet": false,
      "barrel": false,
      "blockPallet": false
    }
  }
]

export const NOA_KNOWLEDGE_BASE = {
  metadata: {
    company: "ח. סבן חומרי בניין (1994) בע\"מ",
    version: "5.2.0",
    last_update: "2026-09-06",
    dna: {
      role: "סדרנית עבודה ראשית ומנהלת לוגיסטיקה אוטונומית (SabanOS)",
      tone: "עברית חדה, מקצועית, שירותית, ישירה ובגובה העיניים של ענף הבנייה. ללא תשובות רובוטיות מלאכותיות.",
      pricing_rule: "נועה אינה קובעת מחירונים והנחות. בכל בירור מחיר או הצעת מחיר יש להפנות לאיציק זהבי (מנהל סניף החרש 4) או לדלפק."
    },
    branches: [
      {
        id: "branch_haresh",
        code: "4",
        name: "סניף מחסן 4 (החרש) — סניף ראשי וחצר לוגיסטית",
        address: "רחוב החרש 4, הוד השרון",
        hours: "ימים א'-ה' 06:30 עד 16:00 | ימי שישי וערבי חג 06:30 עד 13:30",
        phone: "09-7402575",
        specialty: "חומרי מלט, אגרגטים (חול, סומסום, טיט בבלות ובשקים), מלט, בלוקים, ברזל, חנות כלי עבודה ואינסטלציה",
        managers: {
          store: "איציק זהבי (מנהל סניף ראשי ומסחר)",
          yard: "אורן (מנהל חצר, העמסות מנוף ומלגזות)"
        },
        reps: ["איציק זהבי", "אורן", "שי", "עופר", "אליהו", "ריימונד ביטון"]
      },
      {
        id: "branch_talmid",
        code: "1",
        name: "סניף מחסן 1 (התלמיד) — מחלקת גבס, צבע ואספקה יבשה",
        address: "רחוב התלמיד 1 / 6, הוד השרון",
        hours: "ימים א'-ה' 06:30 עד 16:30 | ימי שישי וערבי חג 06:30 עד 12:30",
        phone: "09-7602010",
        specialty: "לוחות גבס (לבן, ירוק, כחול, סופרבורד), פרופילים (מסלולים וניצבים), בידוד מינרלי, צבעים, שפכטל, דלתות וחומרי גמר",
        managers: {
          branch: "תמיר (מנהל חצר, העמסות מנוף ומלגזות)"
        },
        reps: ["תמיר", "ראמי", "אשר", "חנן", "שמעון", "נתנאל", "לינה"]
      }
    ],
    logistics: {
      fleet: [
        {
          driver: "חכמת (Hikmat)",
          truck: "משאית מרצדס מנוף (מ\"ר 615-41-002)",
          role: "הנפות מנוף לגובה, בלות כבדות, משטחי מלט ומשטחי בלוקים",
          crane_limit: "הנפה תקנית לקומות עד 10 מטר גובה (גישה מיוחדת עד 15 מטר במק\"ט 81007) במשאית אחרת וולוו",
          safety_rules: "איסור פריקה מתחת לקווי חשמל חיים; חובת קרקע יציבה לפתיחת רגלי מנוף"
        },
        {
          driver: "עלי (Ali)",
          truck: "משאית איסוזו חלוקה פתוחה (מ\"ר 654-51-701)",
          role: "חלוקת גבס, פרופילים, לוחות עץ/דיקטים, צבעים, פריקות ידניות והובלות ללא פריקה",
          safety_rules: "קשירת לוחות ואביזרים; בדיקת גובה כניסה לחניות תת-קרקעיות ורחובות צפופים"
        }
      ],
      circular_waste: "המשאית שמביאה חומר לוקחת פסולת — אספקת שקי בלה ריקים לפינוי מוסדר וטופס 4 מהיר",
      dispatch_phone: "050-8860896",
      office_phone: "077-2374865"
    }
  },
  team: {
    "972508860896": {
      name: "ראמי מסארוה",
      role: "סדרן עבודה ומנהל תפעול ראשי (מפתח SabanOS / נועה AI)",
      context: "מנהל המערכת הישיר שלך. מענה טכני וביצועי מיידי. הזמנות מראמי מוזרקות מיד לגליונות ול-Make ללא מלשינון."
    },
    "972507855865": {
      name: "יואב שגיב",
      role: "קולגה של ראמי בסידור עבודה, משבץ נהגים ושולח דוחות בוקר לקבוצת דוח בוקר",
      context: "מענה מכבד, תמציתי ורשמי. עדכוני מאקרו, עזרה בכתיבת דוח בוקר בעזרת מחולל הודעות וואטסאפ, חריגות תפעוליות ותקלות צי רכב בלבד."
    },
    "97255227724": {
      name: "הראל אידלסון",
      role: "מנכ\"ל ובעלים (CEO)",
      context: "מענה מכבד, תמציתי ורשמי. עדכוני מאקרו יומיים, חריגות תפעוליות ותקלות צי רכב בלבד."
    },
    "972506662300": {
      name: "ורד אידלסון",
      role: "מנהלת מערכות מידע, IT וביקורת (אחותו של הראל המנכ\"ל)",
      family: {
        children: "שני ילדים — בן ובת",
        son: "עידן (שחקן כדורסל מוכר ומצליח)",
        brother: "הראל אידלסון (מנכ\"ל)"
      },
      personality: "חמה, לבבית, מקצועית, מעריכה דיוק ושותפות נשית פתוחה.",
      context: "ורד מפקחת על תעודות המשלוח וההצלבות מול קומקס. נועה משמשת גשר תפעולי בינה לבין ראמי. כשוורד מודה או מברכת, נועה עונה לה בחום נשי, מעבירה את הקרדיט לראמי אהובה, ומזכירה ברוח הומוריסטית של ענף הבנייה שראמי תפוס וקשור אליה ביציקת בטון עם פריימר 🔐🔒."
    },
    "972504482285": {
      name: "איציק זהבי",
      role: "מנהל סניף חנות/מחסן 4 (החרש) ומנהל מסחרי",
      context: "סמכות מסחרית ומכירות. לקוחות ששואלים על מחירים, תנאי תשלום או אשראי מופנים ישירות לאיציק."
    },
    "972509001392": {
      name: "אורן",
      role: "מנהל חצר ומחסן 4 (החרש)",
      context: "בירור זמינות מלאי כבד (בלות, מלט, טיט, בלוקים), עומסי מלגזות והחזרות שקי פקדון ומשטחים."
    },
    "972520000004": {
      name: "דורון / תמיר",
      role: "מנהלי סניף מחסן 1 (התלמיד)",
      context: "בירור זמינות גבס, פרופילים, צבעים, לוחות מיוחדים ותיאום העמסות למשאית החלוקה של עלי."
    },
    "972520000005": {
      name: "חכמת",
      role: "נהג ראשי — משאית מנוף מרצדס (615-41-002)",
      context: "שפת נהגים ישירה: כרטיס סידור, כתובת מדויקת + קישור Waze, איש קשר באתר + נייד, והנחיות מנוף."
    },
    "972520000006": {
      name: "עלי",
      role: "נהג חלוקה — משאית איסוזו פתוחה (654-51-701)",
      context: "שפת נהגים: סדר תחנות פריקה (Drop order), כתובות, תיאום סבלים באתר ועדכון סיום פריקה."
    },
    "972520000007": {
      name: "ריימונד ביטון",
      role: "סוכן מכירות בכיר / מוסר הזמנות",
      context: "בירור סטטוס אספקה ללקוחותיו, העברת דגשים מיוחדים של קבלנים וכתובות אתר מעודכנות."
    },
    "972520000008": {
      name: "גליה יששכר רפאלי / לינה",
      role: "הנהלת חשבונות וגבייה",
      context: "בדיקת תעודות משלוח חתומות, מעקב סגירת הזמנות, אישורי אשראי ללקוחות ומעקב חיוב פקדונות."
    }
  } as Record<string, TeamMember>,
  deposit_rules: {
    bela: {
      sku: "60002",
      name: "שק גדול פקדון (בלה / Big-Bag)",
      ratio: "1:1 לכל שק חומר גדול (חול 11501, סומסום 11511, טיט 11551, מצע 11540, חמרה 11570, חצץ 11506)"
    },
    pallet: {
      sku: "60060",
      name: "משטח סבן פקדון (משטח עץ תקני)",
      ratio: "1 משטח לכל 35-40 שקי מלט (10002) או שקי מליטה/טיח/דבק (25 ק\"ג)"
    },
    block_pallet: {
      sku: "60006",
      name: "משטח בלוקים פקדון",
      ratio: "1 משטח לכל מארז בלוקים (כ-75 בלוקים 20 או כ-90 בלוקים 10)"
    },
    lime_barrel: {
      sku: "60004",
      name: "חבית פקדון",
      ratio: "1 חבית כנגד כל חבית סיד (11526)"
    },
    exemption: {
      rule: "הובלה ללא פריקה (מק\"טים 818050 עד 818118)",
      effect: "פטור מוחלט מחיוב פקדונות בלות ומשטחים (מסומן כ-ℹ️ פטור)"
    }
  },
  clients: [
    {
      id: 1,
      name: "זבולון-עדירן/הופמן",
      phone: "050-6620013",
      altPhone: "054-2164451",
      comaxId: "607145",
      comaxCardName: "זבולון-עדירן/הופמן",
      contactPerson: "ויסאם (054-2164451) / עבד (050-6620013)",
      address: "החורש 21, כפר שמריהו",
      city: "כפר שמריהו",
      defaultDriver: "חכמת",
      defaultWarehouse: "4(החרש)",
      driveFolderUrl: "https://drive.google.com/drive/folders/1YAevLPp-douFJe7qpyvLevhsGUX45Mz1",
      projects: ["החורש 21, כפר שמריהו", "החורש 21", "הופמן"]
    },
    {
      id: 2,
      name: "קדם גלעד/מזל דלי",
      phone: "050-8861080",
      comaxId: "632052",
      comaxCardName: "קדם גלעד/מזל דלי",
      contactPerson: "גלעד קדם",
      address: "מזל דלי 1, הוד השרון",
      city: "הוד השרון",
      defaultDriver: "חכמת",
      defaultWarehouse: "4(החרש)",
      driveFolderUrl: "https://drive.google.com/drive/folders/1_fpDmOj7LFj1Vgb993QStTylBUvRt-oZ",
      projects: ["מזל דלי 1, הוד השרון", "מזל דלי 1"]
    },
    {
      id: 3,
      name: "אסף אמיתי",
      phone: "050-2174847",
      comaxId: "632254",
      comaxCardName: "אסף אמיתי",
      contactPerson: "אייל (050-2174847)",
      address: "הנדיב 51, הרצליה",
      city: "הרצליה",
      defaultDriver: "עלי",
      defaultWarehouse: "1(התלמיד)",
      driveFolderUrl: "https://drive.google.com/drive/folders/1qG2k3baI1ilER3TRBVDBY3R60DmicXdE",
      projects: ["הנדיב 51, הרצליה פיתוח", "הנדיב 51"]
    },
    {
      id: 4,
      name: "אורניל/אבי לוי",
      phone: "054-5998111",
      comaxId: "601992",
      comaxCardName: "אורניל/אבי לוי",
      contactPerson: "בר אורן (054-5998111)",
      address: "סטרומה 4, הרצליה",
      city: "הרצליה",
      defaultDriver: "חכמת",
      defaultWarehouse: "4(החרש)",
      driveFolderUrl: "https://drive.google.com/drive/folders/16sPMhzokzuWus1SX2mtXyW8OoeCYRrSQ",
      projects: ["סטרומה 4, הרצליה", "סטרומה 4", "הרצליה פיתוח"]
    },
    {
      id: 5,
      name: "אבי (ארד-עד הנדסה)",
      phone: "052-6390100",
      comaxId: "601946",
      comaxCardName: "ארד-עד הנדסה-הרצליה",
      extraCardName: "גיא ודור",
      contactPerson: "אבי",
      address: "חופי 22, הרצליה",
      city: "הרצליה",
      defaultDriver: "חכמת",
      defaultWarehouse: "4(החרש)",
      driveFolderUrl: "",
      projects: ["חופי 22, הרצליה", "חופי 22", "חופי 81, רמת גן", "חופי 3, הרצליה", "סנהדרין 27"]
    },
    {
      id: 6,
      name: "עופר כץ",
      phone: "052-4757356",
      comaxId: "601002",
      comaxCardName: "עופר כץ",
      contactPerson: "רועי / עופר",
      address: "בית העם 3, רמות השבים",
      city: "רמות השבים",
      defaultDriver: "עלי",
      defaultWarehouse: "1(התלמיד)",
      driveFolderUrl: "",
      projects: ["בית העם 3, רמות השבים", "בית העם 3", "בית העם 4, רמות השבים"]
    },
    {
      id: 7,
      name: "דודי אוזנה (שטיכמוס)",
      phone: "052-4404222",
      comaxId: "632160",
      comaxCardName: "שטיכמוס שיבת ציון",
      contactPerson: "דודי",
      address: "שיבת ציון 30, תל אביב",
      city: "תל אביב",
      defaultDriver: "חכמת",
      defaultWarehouse: "4(החרש)",
      driveFolderUrl: "",
      projects: ["שיבת ציון 30, תל אביב", "שיבת ציון 30", "שיבת ציון 12, הרצליה"]
    }
  ] as ClientRecord[],
  customers: {
    "1996": { name: "קורט צבי הולנדר בע\"מ", address: "לולים גבעת חן, גבעת חן", city: "גבעת חן", defaultDriver: "חכמת" },
    "5030203": { name: "א.ש. בלום נדל\"ן בע\"מ", address: "מרכז שרונה, כפר סבא", city: "כפר סבא", defaultDriver: "עלי" },
    "5040076": { name: "מידן לירן", address: "אוסטושינסקי 5, כפר סבא", city: "כפר סבא", defaultDriver: "עלי" },
    "512940": { name: "משה שביט - שביט הנדסה", address: "רחוב הבנים 14, הוד השרון", city: "הוד השרון", defaultDriver: "חכמת" },
    "519205": { name: "וגשל דאו", address: "בורוכוב 28, תל אביב", city: "תל אביב", defaultDriver: "חכמת" },
    "519977": { name: "קבוצת חסון", address: "החשמונאים 1, הוד השרון", city: "הוד השרון", defaultDriver: "חכמת" },
    "601479": { name: "אריק הולץ", address: "שושנה דמארי 18, ראש העין", city: "ראש העין", defaultDriver: "חכמת" },
    "601946": { name: "ארד-עד הנדסה-הרצליה", address: "חופי 22, הרצליה", city: "הרצליה", defaultDriver: "חכמת" },
    "601992": { name: "אורניל/אבי לוי", address: "סטרומה 4, הרצליה", city: "הרצליה", defaultDriver: "חכמת", driveFolder: "https://drive.google.com/drive/folders/16sPMhzokzuWus1SX2mtXyW8OoeCYRrSQ" },
    "602051": { name: "בן ענבר", address: "הצנחנים 4, כפר מלל", city: "כפר מלל", defaultDriver: "עלי" },
    "602100": { name: "שטיכמוס / שיבת ציון", address: "שיבת ציון 12, הרצליה", city: "הרצליה", defaultDriver: "חכמת" },
    "602115": { name: "בזלת מזר בע\"מ", address: "שדה בוקר 17, גבעתיים", city: "גבעתיים", defaultDriver: "חכמת" },
    "602568": { name: "בוקטוס שלום-בי\"ס אלי כהן", address: "עזרא 52, רמת השרון", city: "רמת השרון", defaultDriver: "חכמת" },
    "602866": { name: "נועם ענבר גינון", address: "מחתרות 1, הוד השרון", city: "הוד השרון", defaultDriver: "חכמת" },
    "603271": { name: "א.ערן אזולאי", address: "נח 3, תל אביב", city: "תל אביב", defaultDriver: "חכמת" },
    "603377": { name: "ד.ניב / חינוך מיוחד והדרים", address: "הבנות 16 / ז'בוטינסקי 4, הוד השרון", city: "הוד השרון", defaultDriver: "עלי" },
    "605070": { name: "השוקדים-כללי", address: "עלי זהב, הכוונה טלפונית מספר: 1", city: "עלי זהב", defaultDriver: "עלי" },
    "607145": { name: "זבולון-עדירן/הופמן", address: "החורש 21, כפר שמריהו", city: "כפר שמריהו", defaultDriver: "חכמת", driveFolder: "https://drive.google.com/drive/folders/1YAevLPp-douFJe7qpyvLevhsGUX45Mz1" },
    "607509": { name: "טל שחר כאשי", address: "חשמונאים 5, פתח תקווה", city: "פתח תקווה", defaultDriver: "חכמת" },
    "612090": { name: "לירן/אחוזה ויהודה הלוי", address: "אחוזה 42 / יהודה הלוי 6, רעננה", city: "רעננה", defaultDriver: "עלי" },
    "612100": { name: "לירן/ביל\"ו", address: "ביל\"ו 53, רעננה", city: "רעננה", defaultDriver: "חכמת" },
    "612108": { name: "לירן/מוצקין", address: "מוצקין 22, רעננה", city: "רעננה", defaultDriver: "עלי" },
    "613431": { name: "מידן לירן / לירן", address: "ביל\"ו 53, רעננה", city: "רעננה", defaultDriver: "עלי" },
    "614132": { name: "נתנאל מגד", address: "י.ל. פרץ 4, הרצליה", city: "הרצליה", defaultDriver: "חכמת" },
    "614290": { name: "ערוגת הבשם", address: "דרך הבשמים 8, מושב בצרה", city: "מושב בצרה", defaultDriver: "חכמת" },
    "616088": { name: "ערוגת הבשם", address: "באר גנים 78, אבן יהודה", city: "אבן יהודה", defaultDriver: "חכמת" },
    "617083": { name: "פלח משה", address: "השומר, הוד השרון", city: "הוד השרון", defaultDriver: "עלי" },
    "632052": { name: "קדם גלעד/מזל דלי", address: "מזל דלי 1, הוד השרון", city: "הוד השרון", defaultDriver: "חכמת", driveFolder: "https://drive.google.com/drive/folders/1_fpDmOj7LFj1Vgb993QStTylBUvRt-oZ" },
    "632122": { name: "הכל מבראשית", address: "אוניברסיטת ת\"א שער 14, תל אביב", city: "תל אביב", defaultDriver: "חכמת" },
    "632145": { name: "נקש את נעמן", address: "זוויתן 1, צור יגאל", city: "צור יגאל", defaultDriver: "חכמת" },
    "632160": { name: "שטיכמוס שיבת ציון", address: "שיבת ציון 30, תל אביב", city: "תל אביב", defaultDriver: "חכמת" },
    "632225": { name: "ליאור שרף שיווק והפצה בע\"מ", address: "שניר 17, הוד השרון", city: "הוד השרון", defaultDriver: "עלי" },
    "632237": { name: "בונק אסף", address: "השרון 10, בית דגן", city: "בית דגן", defaultDriver: "חכמת" },
    "632248": { name: "קראמה אסאמה", address: "ג'לג'וליה / הוד השרון", city: "הוד השרון", defaultDriver: "חכמת" },
    "632254": { name: "אסף אמיתי", address: "הנדיב 51, הרצליה", city: "הרצליה", defaultDriver: "עלי", driveFolder: "https://drive.google.com/drive/folders/1qG2k3baI1ilER3TRBVDBY3R60DmicXdE" }
  } as Record<string, { name: string; address: string; city: string; defaultDriver: string; driveFolder?: string }>
}

/**
 * מנרמל מספר טלפון להשוואה חלקה (הסרת מקפים, רווחים, המרה בין 05x ל-9725x)
 */
export function normalizePhoneNumber(rawPhone: string | undefined | null): string {
  if (!rawPhone) return ""
  const digits = rawPhone.replace(/\D/g, "")
  if (digits.startsWith("972") && digits.length >= 11) {
    return digits
  }
  if (digits.startsWith("05") && digits.length === 10) {
    return "972" + digits.slice(1)
  }
  return digits
}

/**
 * זיהוי שולח מתוך טבלת הצוות
 */
export function getTeamMember(phoneOrName: string | undefined | null): TeamMember | null {
  if (!phoneOrName) return null
  const cleanPhone = normalizePhoneNumber(phoneOrName)
  
  // ישירה לפי טלפון
  if (cleanPhone && NOA_KNOWLEDGE_BASE.team[cleanPhone]) {
    return NOA_KNOWLEDGE_BASE.team[cleanPhone]
  }

  // חיפוש לפי שם (למשל "ראמי", "ורד", "הראל")
  const trimmed = phoneOrName.trim().toLowerCase()
  for (const [phone, member] of Object.entries(NOA_KNOWLEDGE_BASE.team)) {
    if (member.name.toLowerCase().includes(trimmed) || trimmed.includes(member.name.toLowerCase())) {
      return member
    }
  }

  return null
}

/**
 * בניית הקשר זיהוי השולח להזרקה ל-System Prompt
 */
export function buildUserSenderContext(senderPhoneOrName?: string): string {
  const teamMember = getTeamMember(senderPhoneOrName)
  if (teamMember) {
    return `[הודעה מאת: ${teamMember.name} | תפקיד: ${teamMember.role} | הנחיות שיחה: ${teamMember.context}]`
  }
  const clean = senderPhoneOrName ? senderPhoneOrName.trim() : "לא צוין"
  return `[הודעה מלקוח / גורם חיצוני: ${clean}]`
}

/**
 * שלב 1: זיהוי הלקוח (Entity Matching)
 * סדר עדיפויות:
 * 1. לפי מספר טלפון
 * 2. לפי שם לקוח או איש קשר באתר (למשל: "ויסאם", "עבד", "גלעד קדם", "אבי לוי")
 * 3. לפי כתובת האתר / הפרויקט (למשל: "החורש 21", "מזל דלי 1", "סטרומה 4", "הנדיב 51")
 */
export function matchClient(
  text: string,
  senderPhone?: string
): {
  comaxId: string
  clientName: string
  contactPerson: string
  address: string
  phone: string
  defaultDriver: string
  defaultWarehouse: string
} | null {
  const normSender = normalizePhoneNumber(senderPhone)

  // 1. זיהוי לפי מספר טלפון
  if (normSender) {
    for (const c of NOA_KNOWLEDGE_BASE.clients) {
      if (normalizePhoneNumber(c.phone) === normSender || normalizePhoneNumber(c.altPhone) === normSender) {
        return {
          comaxId: c.comaxId,
          clientName: c.comaxCardName,
          contactPerson: c.contactPerson || c.name,
          address: c.address,
          phone: senderPhone || c.phone || "",
          defaultDriver: c.defaultDriver || "חכמת",
          defaultWarehouse: c.defaultWarehouse || "4(החרש)"
        }
      }
    }
  }

  // בדיקת טלפון המוזכר בתוך הטקסט
  for (const c of NOA_KNOWLEDGE_BASE.clients) {
    if (c.phone && text.includes(c.phone.replace(/-/g, ""))) {
      return {
        comaxId: c.comaxId,
        clientName: c.comaxCardName,
        contactPerson: c.contactPerson || c.name,
        address: c.address,
        phone: c.phone,
        defaultDriver: c.defaultDriver || "חכמת",
        defaultWarehouse: c.defaultWarehouse || "4(החרש)"
      }
    }
  }

  // 2. זיהוי לפי שם הלקוח או איש הקשר
  for (const c of NOA_KNOWLEDGE_BASE.clients) {
    const contactNames = (c.contactPerson || "").split(/[\/\(\)\d\-]/).map(s => s.trim()).filter(Boolean)
    for (const cn of contactNames) {
      if (cn.length >= 3 && text.includes(cn)) {
        return {
          comaxId: c.comaxId,
          clientName: c.comaxCardName,
          contactPerson: c.contactPerson || cn,
          address: c.address,
          phone: c.phone || "",
          defaultDriver: c.defaultDriver || "חכמת",
          defaultWarehouse: c.defaultWarehouse || "4(החרש)"
        }
      }
    }

    if (text.includes(c.name) || text.includes(c.comaxCardName)) {
      return {
        comaxId: c.comaxId,
        clientName: c.comaxCardName,
        contactPerson: c.contactPerson || c.name,
        address: c.address,
        phone: c.phone || "",
        defaultDriver: c.defaultDriver || "חכמת",
        defaultWarehouse: c.defaultWarehouse || "4(החרש)"
      }
    }
  }

  // 3. זיהוי לפי כתובת אתר / פרויקט
  for (const c of NOA_KNOWLEDGE_BASE.clients) {
    if (c.projects) {
      for (const p of c.projects) {
        if (text.includes(p) || p.split(",")[0] && text.includes(p.split(",")[0].trim())) {
          return {
            comaxId: c.comaxId,
            clientName: c.comaxCardName,
            contactPerson: c.contactPerson || c.name,
            address: c.address,
            phone: c.phone || senderPhone || "",
            defaultDriver: c.defaultDriver || "חכמת",
            defaultWarehouse: c.defaultWarehouse || "4(החרש)"
          }
        }
      }
    }
    const cleanStreet = c.address.split(",")[0]?.trim()
    if (cleanStreet && text.includes(cleanStreet)) {
      return {
        comaxId: c.comaxId,
        clientName: c.comaxCardName,
        contactPerson: c.contactPerson || c.name,
        address: c.address,
        phone: c.phone || senderPhone || "",
        defaultDriver: c.defaultDriver || "חכמת",
        defaultWarehouse: c.defaultWarehouse || "4(החרש)"
      }
    }
  }

  // בדיקה מול מאגר customers המורחב
  for (const [cid, cust] of Object.entries(NOA_KNOWLEDGE_BASE.customers)) {
    if (text.includes(cust.name) || text.includes(cust.address.split(",")[0].trim())) {
      return {
        comaxId: cid,
        clientName: cust.name,
        contactPerson: cust.name,
        address: cust.address,
        phone: senderPhone || "",
        defaultDriver: cust.defaultDriver || "חכמת",
        defaultWarehouse: cust.defaultDriver === "עלי" ? "1(התלמיד)" : "4(החרש)"
      }
    }
  }

  return null
}

export default NOA_KNOWLEDGE_BASE
