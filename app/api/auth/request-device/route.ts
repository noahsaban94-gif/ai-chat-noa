import { NextResponse } from "next/server"
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase-auth"
import type { AuthorizedUser } from "@/lib/types/device-auth"

function maskPhoneNumber(phone: string): string {
  if (!phone) return "***"
  const cleaned = phone.trim()
  if (cleaned.length >= 7) {
    const start = cleaned.slice(0, 3)
    const end = cleaned.slice(-4)
    return `${start}-***${end}`
  }
  return phone
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { userId, deviceId, deviceModel } = body

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

    if (!db) {
      return NextResponse.json(
        { success: false, error: "DATABASE_UNAVAILABLE", message: "שירות מסד הנתונים אינו זמין" },
        { status: 500 }
      )
    }

    // 1. איתור המשתמש המורשה
    const userRef = doc(db, "authorized_users", userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND", message: "משתמש לא נמצא ברשימת המורשים של ח. סבן" },
        { status: 404 }
      )
    }

    const userData = userSnap.data() as AuthorizedUser

    // 2. יצירת קוד OTP אקראי בן 6 ספרות ותוקף ל-5 דקות
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const nowMs = Date.now()
    const expiresAtMs = nowMs + 5 * 60 * 1000 // 5 דקות
    const expiresAt = Timestamp.fromMillis(expiresAtMs)
    const requestId = `req_${nowMs}_${Math.random().toString(36).substring(2, 8)}`

    // 3. שמירת הבקשה בקולקציית device_pairing_requests
    const pairingDocRef = doc(db, "device_pairing_requests", requestId)
    await setDoc(pairingDocRef, {
      requestId,
      userId: userData.userId,
      userName: userData.name,
      userRole: userData.role,
      phone: userData.phone,
      newDeviceId: deviceId,
      newDeviceModel: deviceModel || "מכשיר לא מזוהה",
      otpCode,
      expiresAt,
      status: "pending",
      createdAt: serverTimestamp(),
    })

    // 4. שיגור Webhook ב-POST אל Make
    const webhookUrl = "https://hook.eu1.make.com/j1kfxfn5y4goe1lud3dk1phkw4bkjvyr"
    const whatsappMessage = `🔐 קוד אישור מכשיר חדש ב-SabanOS: ${otpCode}. תוקף הקוד: 5 דקות.`

    let webhookDelivered = false
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          userId: userData.userId,
          userName: userData.name,
          userRole: userData.role,
          phone: userData.phone,
          newDeviceId: deviceId,
          newDeviceModel: deviceModel || "מכשיר נוסף",
          otpCode,
          expiresAt: new Date(expiresAtMs).toISOString(),
          whatsappMessage,
          message: whatsappMessage,
          timestamp: new Date().toISOString(),
        }),
      })
      webhookDelivered = webhookResponse.ok
    } catch (whErr) {
      console.error("Error dispatching OTP webhook to Make:", whErr)
    }

    return NextResponse.json({
      success: true,
      requestId,
      expiresAt: new Date(expiresAtMs).toISOString(),
      expiresInSeconds: 300,
      phone: userData.phone,
      maskedPhone: maskPhoneNumber(userData.phone),
      userName: userData.name,
      webhookDelivered,
      message: `קוד אימות בן 6 ספרות נשלח לוואטסאפ (${maskPhoneNumber(userData.phone)}). תוקף: 5 דקות.`,
    })
  } catch (error: unknown) {
    console.error("Error in request-device endpoint:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
