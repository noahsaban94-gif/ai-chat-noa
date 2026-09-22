import { NextRequest, NextResponse } from "next/server"

interface NotificationPayload {
  title?: string
  message: string
  signature?: string
  url?: string
  data?: Record<string, unknown>
}

export async function GET() {
  const appId = process.env.ONESIGNAL_APP_ID || "8f9c9417-530c-41e2-8a65-850d10758258"
  const apiKey = process.env.ONESIGNAL_REST_API_KEY

  const isConfigured = Boolean(apiKey)

  return NextResponse.json({
    service: "OneSignal Push Notification System",
    isConfigured,
    appId,
    appIdConfigured: true,
    apiKeyConfigured: Boolean(apiKey),
    hint: isConfigured
      ? "מערכת OneSignal מוגדרת ומוכנה לדחיפת התראות."
      : "יש להגדיר ONESIGNAL_REST_API_KEY בהגדרות המערכת (Settings) לצורך שליחה ישירה.",
  })
}

export async function POST(req: NextRequest) {
  try {
    const body: NotificationPayload = await req.json().catch(() => ({ message: "" }))
    const rawMessage = body.message?.trim()

    if (!rawMessage) {
      return NextResponse.json(
        {
          success: false,
          error: "תוכן ההודעה ריק. יש להזין טקסט לדחיפת ההתראה.",
        },
        { status: 400 },
      )
    }

    const appId = process.env.ONESIGNAL_APP_ID || "8f9c9417-530c-41e2-8a65-850d10758258"
    const apiKey = process.env.ONESIGNAL_REST_API_KEY

    // Validation of credentials
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          isConfigured: false,
          error: "OneSignal REST API Key is not configured",
          message:
            "מפתח ה-API של OneSignal (ONESIGNAL_REST_API_KEY) טרם הוגדר ב-Settings. מזהה האפליקציה (8f9c9417-530c-41e2-8a65-850d10758258) מוגדר בהצלחה. נא להזין את ה-REST API Key בהגדרות.",
        },
        { status: 400 },
      )
    }

    // Format current Israel Time for the stamp
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

    const officialSignature =
      body.signature ||
      `🏷️ חותמת מענה רשמית: נועה AI ❤️ | מוח תפעולי ולוגיסטי - ח. סבן חומרי בניין (1994) בע״מ | ${timeFormatted} (${dateFormatted})`

    // Compose final message with stamp
    const finalContent = `${rawMessage}\n\n${officialSignature}`

    const title = body.title || "נועה AI ❤️ | ח. סבן חומרי בניין"
    const targetUrl =
      body.url || "https://ais-pre-x6v6mobnnowcdewbppidqv-812919982163.europe-west2.run.app"

    // Real API call to OneSignal REST API v1
    const oneSignalResponse = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        included_segments: ["Subscribed Users", "Active Users", "Total Subscriptions"],
        headings: {
          he: title,
          en: "Noa AI | H. Saban",
        },
        contents: {
          he: finalContent,
          en: finalContent,
        },
        subtitle: {
          he: "התראה מנועה AI - ח. סבן",
          en: "Noa AI Alert",
        },
        data: {
          sender: "noa_ai",
          stamp: officialSignature,
          timestamp: now.toISOString(),
          israelTime: `${timeFormatted} ${dateFormatted}`,
          ...(body.data || {}),
        },
        url: targetUrl,
      }),
    })

    const responseData = await oneSignalResponse.json().catch(() => null)

    if (!oneSignalResponse.ok) {
      console.error("OneSignal push error response:", responseData)
      return NextResponse.json(
        {
          success: false,
          status: oneSignalResponse.status,
          error: responseData?.errors || responseData || "שגיאה בדחיפת התראה ל-OneSignal",
        },
        { status: oneSignalResponse.status },
      )
    }

    return NextResponse.json({
      success: true,
      notificationId: responseData?.id,
      recipients: responseData?.recipients || 0,
      timestamp: now.toISOString(),
      stamp: officialSignature,
      responseData,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("OneSignal API server error:", errorMsg)
    return NextResponse.json(
      {
        success: false,
        error: errorMsg || "שגיאת שרת פנימית בביצוע הדחיפה ל-OneSignal",
      },
      { status: 500 },
    )
  }
}
