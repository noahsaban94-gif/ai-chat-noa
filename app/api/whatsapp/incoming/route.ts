import { NextRequest, NextResponse } from "next/server"
import { addWhatsAppLiveMessage } from "@/lib/whatsapp-bridge-service"
import { saveMessage } from "@/lib/conversation-memory"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const phone = String(body.phone || body.from || "").trim()
    const senderName = String(body.senderName || body.name || "לקוח וואטסאפ").trim()
    const text = String(body.text || body.body || body.message || "").trim()
    const location = body.location || null
    const wazeUrl = body.wazeUrl || (location ? `https://waze.com/ul?ll=${location.latitude},${location.longitude}&navigate=yes` : null)

    if (!phone && !text) {
      return NextResponse.json({ error: "Phone and text are required" }, { status: 400 })
    }

    console.log(`📥 [API WhatsApp Incoming] פנייה מלקוח: ${senderName} (${phone}): "${text || (location ? 'מיקום GPS' : '')}"`)

    // 1. הוספה לשירות ה-Realtime החי (משגר אירוע SSE לכל הדפדפנים המחוברים)
    const liveMsg = addWhatsAppLiveMessage({
      phone,
      senderName,
      text: text || (location ? `📍 נשלח נעץ מיקום GPS: ${location.latitude}, ${location.longitude}` : ""),
      timestamp: Number(body.timestamp) || Date.now(),
      direction: "incoming",
      status: "received",
      location,
      wazeUrl,
    })

    // 2. שמירה ב-Firestore בסשן הפעיל של ראמי כדי שיישמר בהיסטוריית השיחה
    const activeSessionId = "user_0508860896_active"
    try {
      await saveMessage(
        activeSessionId,
        "user",
        text || `📍 נשלח מיקום GPS מאת ${senderName}`,
        "whatsapp",
        false,
        {
          whatsappSender: senderName,
          whatsappPhone: phone,
          isIncomingCustomerMessage: true,
          location,
          wazeUrl,
        },
        {
          userId: "0508860896",
          userName: "ראמי מסארוה",
          userRole: "מנהל תפעול וסדרן ראשי",
        }
      )
    } catch (saveErr) {
      console.warn("Could not save WhatsApp incoming message to Firestore:", saveErr)
    }

    return NextResponse.json({
      success: true,
      messageId: liveMsg.id,
      timestamp: liveMsg.timestamp,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("Error in /api/whatsapp/incoming:", errorMsg)
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
