import { NextResponse } from "next/server"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore"
import { db } from "@/lib/firebase-auth"
import type { AuthorizedUser, DevicePairingRequest } from "@/lib/types/device-auth"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { userId, deviceId, otpCode } = body

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { success: false, error: "MISSING_USER_ID", message: "מזהה משתמש חסר" },
        { status: 400 }
      )
    }

    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json(
        { success: false, error: "MISSING_DEVICE_ID", message: "מזהה מכשיר חסר" },
        { status: 400 }
      )
    }

    const cleanOtp = String(otpCode || "").trim().replace(/\D/g, "")
    if (!cleanOtp || cleanOtp.length !== 6) {
      return NextResponse.json(
        { success: false, error: "INVALID_OTP_FORMAT", message: "נא להזין קוד אימות תקין בן 6 ספרות" },
        { status: 400 }
      )
    }

    if (!db) {
      return NextResponse.json(
        { success: false, error: "DATABASE_UNAVAILABLE", message: "שירות מסד הנתונים אינו זמין" },
        { status: 500 }
      )
    }

    // 1. חיפוש בקשת צימוד פעילה
    const requestsRef = collection(db, "device_pairing_requests")
    const q = query(
      requestsRef,
      where("userId", "==", userId),
      where("newDeviceId", "==", deviceId),
      where("status", "==", "pending")
    )
    const querySnap = await getDocs(q)

    let matchingDoc: { id: string; data: DevicePairingRequest } | null = null

    if (!querySnap.empty) {
      // נבדוק האם אחד מהמסמכים תואם לקוד שהוזן
      for (const d of querySnap.docs) {
        const data = d.data() as DevicePairingRequest
        if (data.otpCode === cleanOtp) {
          matchingDoc = { id: d.id, data }
          break
        }
      }
    }

    // בדיקת גיבוי: במידה וה-deviceId שונה מעט, נחפש לפי userId וקוד OTP פעיל
    if (!matchingDoc) {
      const fallbackQ = query(
        requestsRef,
        where("userId", "==", userId),
        where("otpCode", "==", cleanOtp),
        where("status", "==", "pending")
      )
      const fallbackSnap = await getDocs(fallbackQ)
      if (!fallbackSnap.empty) {
        const d = fallbackSnap.docs[0]
        matchingDoc = { id: d.id, data: d.data() as DevicePairingRequest }
      }
    }

    if (!matchingDoc) {
      return NextResponse.json(
        {
          success: false,
          error: "INCORRECT_OTP",
          message: "קוד האימות שגוי או שלא קיימת בקשה פעילה. אנא ודא שהזנת את 6 הספרות שהתקבלו בוואטסאפ.",
        },
        { status: 400 }
      )
    }

    // 2. בדיקת תוקף הזמן (5 דקות)
    const expiresAt = matchingDoc.data.expiresAt
    const expiresAtMs =
      expiresAt && typeof (expiresAt as { toMillis?: () => number }).toMillis === "function"
        ? (expiresAt as { toMillis: () => number }).toMillis()
        : new Date(expiresAt as unknown as string | number | Date).getTime()

    if (Date.now() > expiresAtMs) {
      await updateDoc(doc(db, "device_pairing_requests", matchingDoc.id), {
        status: "expired",
      })

      return NextResponse.json(
        {
          success: false,
          error: "OTP_EXPIRED",
          message: "תוקף קוד האימות פג (עברו יותר מ-5 דקות). אנא לחץ על שליחת קוד חדש.",
        },
        { status: 400 }
      )
    }

    // 3. עדכון מסמך הבקשה ל-approved
    await updateDoc(doc(db, "device_pairing_requests", matchingDoc.id), {
      status: "approved",
      approvedAt: serverTimestamp(),
    })

    // 4. הוספת המכשיר החדש למערך allowedDeviceIds של המשתמש ב-authorized_users
    const userRef = doc(db, "authorized_users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND", message: "משתמש לא נמצא" },
        { status: 404 }
      )
    }

    const userData = userSnap.data() as AuthorizedUser

    const updatePayload: Record<string, unknown> = {
      allowedDeviceIds: arrayUnion(deviceId),
      isActivated: true,
      lastAccessAt: serverTimestamp(),
    }

    // אם טרם הוגדר boundDeviceId ראשי, נקבע את המכשיר הנוכחי כראשי
    if (!userData.boundDeviceId) {
      updatePayload.boundDeviceId = deviceId
      updatePayload.boundDeviceModel = matchingDoc.data.newDeviceModel || "מכשיר מורשה"
      updatePayload.boundAt = serverTimestamp()
    }

    await updateDoc(userRef, updatePayload)

    return NextResponse.json({
      success: true,
      message: `המכשיר (${matchingDoc.data.newDeviceModel || "מכשיר נוסף"}) אושר בהצלחה ונוסף לרשימת המכשירים המורשים של ${userData.name}!`,
      user: {
        userId: userData.userId,
        name: userData.name,
        role: userData.role,
        phone: userData.phone,
        deviceId,
        deviceModel: matchingDoc.data.newDeviceModel || "מכשיר מורשה",
        isActivated: true,
      },
    })
  } catch (error: unknown) {
    console.error("Error in verify-device endpoint:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
