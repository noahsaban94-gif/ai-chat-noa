export interface PushNotificationParams {
  title?: string
  message: string
  signature?: string
  url?: string
  data?: Record<string, unknown>
}

export interface PushNotificationResult {
  success: boolean
  notificationId?: string
  recipients?: number
  stamp?: string
  message?: string
  error?: string
  isConfigured?: boolean
}

/**
 * Pushes a notification to OneSignal with Noa's verified operational stamp.
 */
export async function pushToOneSignal(
  params: PushNotificationParams,
): Promise<PushNotificationResult> {
  try {
    const res = await fetch("/api/onesignal/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
      return {
        success: false,
        error: data?.message || data?.error || `שגיאת שרת (${res.status})`,
        isConfigured: data?.isConfigured !== false,
      }
    }

    return {
      success: true,
      notificationId: data?.notificationId,
      recipients: data?.recipients,
      stamp: data?.stamp,
      message: "ההתראה נדחפה בהצלחה למערכת OneSignal!",
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      error: msg || "שגיאת תקשורת עם שרת ההתראות",
    }
  }
}

/**
 * Checks if OneSignal is configured on the server.
 */
export async function checkOneSignalStatus(): Promise<{
  isConfigured: boolean
  hint: string
}> {
  try {
    const res = await fetch("/api/onesignal/notify")
    const data = await res.json().catch(() => null)
    return {
      isConfigured: Boolean(data?.isConfigured),
      hint: data?.hint || "",
    }
  } catch {
    return {
      isConfigured: false,
      hint: "לא ניתן לבדוק סטטוס OneSignal כרגע",
    }
  }
}
