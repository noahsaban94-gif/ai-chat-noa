/**
 * OneSignal Integration Helper
 * Correctly formats the Authorization header according to OneSignal API specifications:
 * "Authorization: Key <REST_API_KEY>"
 * With automatic fallbacks for various OneSignal key formats.
 */

export interface OneSignalPushParams {
  appId?: string
  apiKey?: string
  title?: string
  message: string
  signature?: string
  url?: string
  data?: Record<string, unknown>
}

export interface OneSignalPushResult {
  success: boolean
  id?: string
  recipients?: number
  error?: unknown
  status?: number
  data?: unknown
  authUsed?: string
}

export async function sendOneSignalPush(params: OneSignalPushParams): Promise<OneSignalPushResult> {
  const appId = params.appId || process.env.ONESIGNAL_APP_ID || "8f9c9417-530c-41e2-8a65-850d10758258"
  const rawApiKey = params.apiKey || process.env.ONESIGNAL_REST_API_KEY || "snqjezzr7er64dnhhyof3pzoe"

  if (!rawApiKey) {
    return {
      success: false,
      status: 400,
      error: "OneSignal REST API key is missing. Please define ONESIGNAL_REST_API_KEY.",
    }
  }

  const cleanKey = rawApiKey.trim()

  // Build candidate Authorization headers
  // Official OneSignal REST API spec requires: "Authorization: Key YOUR_REST_API_KEY"
  const authCandidates: string[] = []
  if (cleanKey.startsWith("Key ") || cleanKey.startsWith("Basic ") || cleanKey.startsWith("Bearer ")) {
    authCandidates.push(cleanKey)
  } else {
    // Primary: Key <API_KEY> (OneSignal REST API standard per documentation)
    authCandidates.push(`Key ${cleanKey}`)
    // Fallback: Basic <API_KEY>
    authCandidates.push(`Basic ${cleanKey}`)
    // Fallback: Bearer <API_KEY>
    authCandidates.push(`Bearer ${cleanKey}`)
  }

  const now = new Date()
  const timeFormatted = now.toLocaleTimeString("he-IL", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
  })
  const dateFormatted = now.toLocaleDateString("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  const signature =
    params.signature ||
    `🏷️ חותמת מענה רשמית: נועה AI ❤️ | מוח תפעולי ולוגיסטי - ח. סבן חומרי בניין (1994) בע״מ | ${timeFormatted} (${dateFormatted})`

  const fullContent = `${params.message}\n\n${signature}`
  const title = params.title || "נועה AI ❤️ | ח. סבן חומרי בניין"
  const targetUrl =
    params.url || "https://ais-pre-x6v6mobnnowcdewbppidqv-812919982163.europe-west2.run.app"

  const payload = {
    app_id: appId,
    included_segments: ["Subscribed Users", "Active Users", "Total Subscriptions"],
    headings: {
      he: title,
      en: "Noa AI | H. Saban",
    },
    contents: {
      he: fullContent,
      en: fullContent,
    },
    subtitle: {
      he: "התראה מנועה AI - ח. סבן",
      en: "Noa AI Alert",
    },
    data: {
      sender: "noa_ai",
      stamp: signature,
      timestamp: now.toISOString(),
      israelTime: `${timeFormatted} ${dateFormatted}`,
      ...(params.data || {}),
    },
    url: targetUrl,
  }

  let lastStatus = 500
  let lastData: unknown = null

  for (const authHeader of authCandidates) {
    try {
      const res = await fetch("https://onesignal.com/api/v1/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
      })

      const resData = await res.json().catch(() => null)
      if (res.ok) {
        return {
          success: true,
          id: resData?.id,
          recipients: resData?.recipients || 0,
          data: resData,
          authUsed: authHeader.split(" ")[0],
        }
      }

      lastStatus = res.status
      lastData = resData

      // Only retry alternative headers if authentication failed (401 or 403)
      if (res.status !== 401 && res.status !== 403) {
        break
      }
    } catch (fetchErr) {
      lastData = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
    }
  }

  return {
    success: false,
    status: lastStatus,
    error: (lastData as { errors?: unknown })?.errors || lastData || "Access denied. Check API Key.",
  }
}

/**
 * Client-side helper to trigger notification via server route /api/onesignal/notify
 */
export async function pushToOneSignal(params: {
  title?: string
  message: string
  signature?: string
  url?: string
}): Promise<{ success: boolean; error?: string; notificationId?: string; recipients?: number }> {
  try {
    const res = await fetch("/api/onesignal/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      const errDetail =
        typeof data?.error === "string"
          ? data.error
          : JSON.stringify(data?.error || "שגיאת תקשורת מול OneSignal")
      return {
        success: false,
        error: errDetail,
      }
    }
    return {
      success: true,
      notificationId: data.notificationId,
      recipients: data.recipients,
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

