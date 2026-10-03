import { NextRequest, NextResponse } from "next/server"
import { addWhatsAppLiveMessage } from "@/lib/whatsapp-bridge-service"
import { saveMessage } from "@/lib/conversation-memory"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const phone = String(body.phone || "054-8891234").trim()
    const senderName = String(body.senderName || "איציק קבלן שלד").trim()
    const text = String(
      body.text || "אהלן ראמי, צריך מחר על הבוקר 3 בלות חול ומשטח מלט לאתר בהוד השרון, תעדכן מתי המנוף אצלי"
    ).trim()

    const liveMsg = addWhatsAppLiveMessage({
      phone,
      senderName,
      text,
      timestamp: Date.now(),
      direction: "incoming",
      status: "received",
      location: body.location || null,
      wazeUrl: body.wazeUrl || null,
    })

    // שמירה ב-Firestore
    const activeSessionId = "user_0508860896_active"
    try {
      await saveMessage(
        activeSessionId,
        "user",
        text,
        "whatsapp",
        false,
        {
          whatsappSender: senderName,
          whatsappPhone: phone,
          isIncomingCustomerMessage: true,
          isSimulation: true,
        },
        {
          userId: "0508860896",
          userName: "ראמי מסארוה",
          userRole: "מנהל תפעול וסדרן ראשי",
        }
      )
    } catch {}

    return NextResponse.json({
      success: true,
      simulatedMessage: liveMsg,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
