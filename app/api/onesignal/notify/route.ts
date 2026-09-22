import { NextRequest, NextResponse } from "next/server"
import { sendOneSignalPush } from "@/lib/onesignal"

interface NotificationPayload {
  title?: string
  message: string
  signature?: string
  url?: string
  data?: Record<string, unknown>
  apiKey?: string
}

export async function GET() {
  const appId = process.env.ONESIGNAL_APP_ID || "8f9c9417-530c-41e2-8a65-850d10758258"
  const apiKey = process.env.ONESIGNAL_REST_API_KEY || "os_v2_app_r6ojif2tbra6fctfqugra5mcld3qwaxp2lgevdvazqtnecdbnlkd5ooualhui4dlke7nv6lvug4qhquicjd2e3jmkkpsk72lv3wz5cy"

  const isConfigured = Boolean(apiKey)

  return NextResponse.json({
    service: "OneSignal Push Notification System",
    isConfigured,
    appId,
    appIdConfigured: true,
    apiKeyConfigured: Boolean(apiKey),
    hint: isConfigured
      ? "מערכת OneSignal מוגדרת ומוכנה לדחיפת התראות אוטומטית."
      : "יש להגדיר ONESIGNAL_REST_API_KEY בהגדרות המערכת (Settings).",
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
    const apiKey = body.apiKey || process.env.ONESIGNAL_REST_API_KEY

    const result = await sendOneSignalPush({
      appId,
      apiKey,
      title: body.title,
      message: rawMessage,
      signature: body.signature,
      url: body.url,
      data: body.data,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          status: result.status || 401,
          error: result.error || "שגיאה בדחיפת התראה ל-OneSignal. ודא תקינות מפתח API.",
          hint: "https://documentation.onesignal.com/docs/en/keys-and-ids#api-keys",
        },
        { status: result.status || 401 },
      )
    }

    return NextResponse.json({
      success: true,
      notificationId: result.id,
      recipients: result.recipients || 0,
      timestamp: new Date().toISOString(),
      authUsed: result.authUsed,
      responseData: result.data,
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
