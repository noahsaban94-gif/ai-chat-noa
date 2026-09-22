import { doc, getDoc, setDoc, getDocs, collection } from "firebase/firestore"
import { db } from "./firebase-auth"
import type { AuthorizedUser } from "./types/device-auth"

export interface SeedUserConfig {
  userId: string
  name: string
  role: string
  phone: string
  notes: string
  preboundDeviceId?: string
  preboundDeviceModel?: string
}

export const SABAN_TEAM_ROSTER: SeedUserConfig[] = [
  {
    userId: "user_rami_masarweh",
    name: "ראמי מסארוה",
    role: "מנהל תפעול וסדרן ראשי",
    phone: "050-8860896",
    notes: "סמכות עליונה לסידור עבודה, שיבוץ משאיות, אישור חריגות ושינוי מסלולים",
  },
  {
    userId: "user_harel_idelson",
    name: "הראל אידלסון",
    role: "מנכ״ל ובעלים",
    phone: "050-5218552",
    notes: "אישור אשראי חריג, החלטות אסטרטגיות וניהול כללי של ח. סבן",
  },
  {
    userId: "user_vered_idelson",
    name: "ורד אידלסון",
    role: "מנהלת מערכות מידע וביקורת (קומקס)",
    phone: "050-5218553",
    notes: "סנכרון תעודות משלוח, מחירונים, דוחות קומקס וביקורת מסמכים",
  },
  {
    userId: "user_itzik_zehavi",
    name: "איציק זהבי",
    role: "מנהל מסחרי ומכירות",
    phone: "050-5218554",
    notes: "סגירת הצעות מחיר, הנחות מיוחדות ומשא ומתן מול קבלנים",
  },
  {
    userId: "user_oren_yard",
    name: "אורן",
    role: "מנהל חצר ומלאי כבד (סניף 4 החרש)",
    phone: "050-5218555",
    notes: "ניהול בלות חול/סומסום, טיט, מלט, בלוקים וקליטת משטחי פקדון ריקים",
  },
  {
    userId: "user_tamir_branch1",
    name: "תמיר / דורון",
    role: "מנהל סניף 1 התלמיד (גבס, צבע ובידוד)",
    phone: "050-5218556",
    notes: "אספקת לוחות גבס, פרופילים, צבעים ומוצרי גמר קלים",
  },
  {
    userId: "user_hakmat_crane",
    name: "חכמת",
    role: "נהג מרצדס מנוף 615-41-002",
    phone: "050-5218557",
    notes: "פריקות מנוף מורכבות, אתרי וילות, הרצליה פיתוח, כפר שמריהו והוד השרון",
  },
  {
    userId: "user_ali_truck",
    name: "עלי",
    role: "נהג איסוזו חלוקה 654-51-701",
    phone: "050-5218558",
    notes: "חלוקת גבס, פרופילים ובידוד במרכז ובתל אביב, תמ״א 38 ורחובות צפופים",
  },
  {
    userId: "user_galia_accounting",
    name: "גליה",
    role: "מנהלת הנהלת חשבונות וגבייה",
    phone: "050-5218559",
    notes: "בדיקת חובות, תנאי תשלום מראש, אישור שקים והעברות בנקאיות",
  },
]

export interface SeedResultItem extends AuthorizedUser {
  activationUrl: string
}

/**
 * מאכלס את רשימת בעלי התפקידים ב-Firestore עם טוקני הפעלה קריפטוגרפיים ייחודיים
 */
export async function seedAuthorizedUsers(
  baseUrl: string = "https://saban.app",
  forceReset: boolean = false
): Promise<{
  success: boolean
  users: SeedResultItem[]
  message: string
}> {
  if (!db) {
    throw new Error("Firestore client is not initialized")
  }

  const results: SeedResultItem[] = []
  const usersCollection = collection(db, "authorized_users")

  for (const teamMember of SABAN_TEAM_ROSTER) {
    const userDocRef = doc(usersCollection, teamMember.userId)
    const existingSnap = await getDoc(userDocRef)

    if (existingSnap.exists() && !forceReset) {
      const data = existingSnap.data() as AuthorizedUser
      results.push({
        ...data,
        activationUrl: data.activationToken
          ? `${baseUrl}/?token=${data.activationToken}`
          : "המכשיר כבר מופעל ומקושר",
      })
      continue
    }

    // ייצור טוקן הפעלה ייחודי וקריפטוגרפי בטוח
    const tokenPart = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).substring(2) + Date.now().toString(36)
    const activationToken = `act_${teamMember.userId.replace(/^user_/, "")}_${tokenPart}`

    const newUserDoc: AuthorizedUser = {
      userId: teamMember.userId,
      name: teamMember.name,
      role: teamMember.role,
      phone: teamMember.phone,
      activationToken,
      isActivated: false,
      boundDeviceId: null,
      boundDeviceModel: null,
      boundAt: null,
      lastAccessAt: null,
      notes: teamMember.notes,
    }

    await setDoc(userDocRef, newUserDoc)

    results.push({
      ...newUserDoc,
      activationUrl: `${baseUrl}/?token=${activationToken}`,
    })
  }

  return {
    success: true,
    users: results,
    message: `הוזרקו/עודכנו בהצלחה ${results.length} בעלי תפקידים מורשים עם טוקני הפעלה קריפטוגרפיים.`,
  }
}

/**
 * שליפת כל בעלי התפקידים והקישורים שלהם (לצורך דשבורד מנהל ואבטחה)
 */
export async function getAllAuthorizedUsers(baseUrl: string = "https://saban.app"): Promise<SeedResultItem[]> {
  if (!db) {
    throw new Error("Firestore client is not initialized")
  }

  const querySnapshot = await getDocs(collection(db, "authorized_users"))
  if (querySnapshot.empty) {
    const seeded = await seedAuthorizedUsers(baseUrl, false)
    return seeded.users
  }

  const list: SeedResultItem[] = []
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data() as AuthorizedUser
    list.push({
      ...data,
      activationUrl: data.activationToken
        ? `${baseUrl}/?token=${data.activationToken}`
        : "המכשיר כבר מופעל ומקושר",
    })
  })

  return list
}
