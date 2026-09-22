import type { DeviceSession } from "./types/device-auth"

export const DEVICE_ID_KEY = "saban_device_id"
export const CURRENT_USER_KEY = "saban_current_user"

/**
 * מחלץ את דגם המכשיר והדפדפן (Hardware / OS Fingerprint)
 */
export function detectDeviceModel(): string {
  if (typeof window === "undefined" || !window.navigator) {
    return "Unknown Device (Server)"
  }

  const ua = window.navigator.userAgent || ""

  // זיהוי דגמי סמסונג ואנדרואיד
  const samsungMatch = ua.match(/SM-[A-Z0-9]+/i)
  if (samsungMatch) {
    return `Samsung Galaxy (${samsungMatch[0]})`
  }
  if (/Samsung/i.test(ua)) {
    return "Samsung Mobile Device"
  }
  if (/Pixel [0-9]+/i.test(ua)) {
    const pixelMatch = ua.match(/Pixel [0-9]+/i)
    return `Google ${pixelMatch ? pixelMatch[0] : "Pixel"}`
  }
  if (/Android/i.test(ua)) {
    return "Android Device"
  }
  if (/iPhone/i.test(ua)) {
    return "Apple iPhone"
  }
  if (/iPad/i.test(ua)) {
    return "Apple iPad"
  }
  if (/Macintosh|Mac OS X/i.test(ua)) {
    return "MacBook / macOS Workstation"
  }
  if (/Windows NT/i.test(ua)) {
    return "Windows Office PC"
  }
  if (/Linux/i.test(ua)) {
    return "Linux Workstation"
  }

  return "Web Browser Client"
}

/**
 * מחולל או שולף מזהה מכשיר פיזי ייחודי, קבוע ומאובטח שנשמר ב-localStorage
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") {
    return "srv_unknown_device"
  }

  try {
    let existingId = localStorage.getItem(DEVICE_ID_KEY)
    if (!existingId || !existingId.startsWith("dev_")) {
      const entropy = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36)
      existingId = `dev_${entropy}`
      localStorage.setItem(DEVICE_ID_KEY, existingId)
    }
    return existingId
  } catch (e) {
    console.error("Failed to access localStorage for deviceId:", e)
    return `dev_fallback_${Date.now()}`
  }
}

/**
 * שולף את פרטי הסשן המקושר של המשתמש הפעיל במכשיר הנוכחי
 */
export function getCurrentDeviceSession(): DeviceSession | null {
  if (typeof window === "undefined") return null
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as DeviceSession
    const currentDeviceId = getOrCreateDeviceId()

    // בדיקת תקינות שהמכשיר המקומי תואם
    if (parsed.deviceId && parsed.deviceId !== currentDeviceId) {
      console.warn("Device mismatch detected in local session, clearing.")
      localStorage.removeItem(CURRENT_USER_KEY)
      return null
    }

    return parsed
  } catch (e) {
    console.error("Error reading current device session:", e)
    return null
  }
}

/**
 * שומר את פרטי הסשן המאומת במכשיר
 */
export function saveDeviceSession(session: DeviceSession): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(session))
  } catch (e) {
    console.error("Failed to save device session:", e)
  }
}

/**
 * ניקוי הסשן מהמכשיר
 */
export function clearDeviceSession(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(CURRENT_USER_KEY)
  } catch (e) {
    console.error("Failed to clear device session:", e)
  }
}

/**
 * פונקציה המופעלת כאשר משתמש נכנס עם קישור הפעלה ראשוני (token)
 * ושולחת את ה-deviceId ודגם המכשיר לשרת לצורך נעילה חד-פעמית (Device Binding)
 */
export async function handleDeviceActivation(token: string): Promise<{
  success: boolean
  user?: DeviceSession
  message?: string
  error?: string
}> {
  const deviceId = getOrCreateDeviceId()
  const deviceModel = detectDeviceModel()

  try {
    const response = await fetch("/api/auth/activate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        deviceId,
        deviceModel,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "שגיאה באימות ונעילת המכשיר",
      }
    }

    const session: DeviceSession = {
      userId: data.user.userId,
      name: data.user.name,
      role: data.user.role,
      phone: data.user.phone,
      deviceId,
      deviceModel,
      isActivated: true,
    }

    saveDeviceSession(session)

    return {
      success: true,
      user: session,
      message: data.message || `מכשיר זה ננעל בהצלחה עבור ${data.user.name} (${data.user.role})`,
    }
  } catch (err: unknown) {
    console.error("Network error during device activation:", err)
    return {
      success: false,
      error: "תקלת תקשורת מול השרת במהלך נעילת המכשיר",
    }
  }
}
