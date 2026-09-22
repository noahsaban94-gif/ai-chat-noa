import { NextResponse } from "next/server"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase-auth"
import type { AuthorizedUser } from "@/lib/types/device-auth"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { token, deviceId, deviceModel } = body

    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { success: false, error: "טוקן הפעלה חסר או לא תקין" },
        { status: 400 }
      )
    }

    if (!deviceId || typeof deviceId !== "string" || !deviceId.trim()) {
      return NextResponse.json(
        { success: false, error: "מזהה מכשיר פיזי (deviceId) חסר" },
        { status: 400 }
      )
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: "שירות Firestore אינו זמין" },
        { status: 500 }
      )
    }

    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown-ip"
    const userAgent = req.headers.get("user-agent") || ""

    // 1. חיפוש המשתמש לפי ה-activationToken
    const usersCollection = collection(db, "authorized_users")
    const q = query(usersCollection, where("activationToken", "==", token.trim()))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      // בדיקה האם מדובר בטוקן שכבר נוצל (נבדוק אם יש משתמש שכבר מקושר למכשיר אחר)
      await addDoc(collection(db, "security_alerts"), {
        userId: "unknown",
        attemptedDeviceId: deviceId,
        ip: clientIp,
        userAgent,
        reason: `ניסיון הפעלה עם טוקן לא קיים או שפג תוקפו: ${token.substring(0, 15)}...`,
        timestamp: serverTimestamp(),
      })

      return NextResponse.json(
        {
          success: false,
          error: "קישור הפעלה זה אינו תקף, פג תוקפו או שכבר נוצל במכשיר אחר. פנה למנהל המערכת לקבלת קישור חדש.",
        },
        { status: 403 }
      )
    }

    const userDocSnap = querySnapshot.docs[0]
    const user = userDocSnap.data() as AuthorizedUser

    // 2. בדיקה אם המשתמש כבר הופעל בעבר עם מכשיר שונה
    if (user.isActivated && user.boundDeviceId && user.boundDeviceId !== deviceId) {
      // רישום אירוע אבטחה חמור: ניסיון שימוש חוזר בטוקן ממכשיר זר!
      await addDoc(collection(db, "security_alerts"), {
        userId: user.userId,
        userName: user.name,
        attemptedDeviceId: deviceId,
        boundDeviceId: user.boundDeviceId,
        ip: clientIp,
        userAgent,
        reason: `ניסיון הפעלה חוזר של קישור עבור ${user.name} ממכשיר זר שאינו המכשיר הנעול (${user.boundDeviceModel || "Unknown"})`,
        timestamp: serverTimestamp(),
      })

      return NextResponse.json(
        {
          success: false,
          error: `קישור הפעלה זה כבר נוצל וננעל במכשיר אחר (${user.boundDeviceModel || "מכשיר מורשה"}). מטעמי אבטחה, לא ניתן להעביר קישור לעובד או מכשיר אחר.`,
        },
        { status: 403 }
      )
    }

    // 3. אישור והפעלת המכשיר (Device Binding חד-פעמי קשיח)
    const userRef = doc(db, "authorized_users", user.userId)
    await updateDoc(userRef, {
      boundDeviceId: deviceId,
      boundDeviceModel: deviceModel || "Unknown Device",
      isActivated: true,
      activationToken: null, // ביטול הטוקן לצמיתות כדי שלא ניתן יהיה להעבירו לאחר!
      boundAt: serverTimestamp(),
      lastAccessAt: serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      message: `המכשיר אושר וננעל בהצלחה עבור ${user.name} (${user.role}) בחברת ח. סבן.`,
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        phone: user.phone,
        boundDeviceId: deviceId,
      },
    })
  } catch (error: unknown) {
    console.error("Error in activate device endpoint:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
