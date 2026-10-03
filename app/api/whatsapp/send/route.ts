import { NextRequest, NextResponse } from "next/server"
import {
  sendToWhatsAppBridge,
  addWhatsAppLiveMessage,
} from "@/lib/whatsapp-bridge-service"
import { saveMessage } from "@/lib/conversation-memory"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const phone = String(body.phone || body.to || "").trim()
    const text = String(body.text || body.message || "").trim()
    const senderName = String(body.senderName || "ראמי מסארוה (מנהל)").trim()
    const customerName = String(body.customerName || "לקוח").trim()

    if (!phone || !text) {
      return NextResponse.json(
        { error: "מספר טלפון ותוכן ההודעה הינם שדות חובה" },
        { status: 400 }
      )
    }

    console.log(`📤 [API WhatsApp Send] שיגור מענה מנהל ל-${phone}: "${text}"`)

    // 1. קריאה לשרת הגשר whatsapp_bridge.cjs בפורט 3001
    const bridgeResult = await sendToWhatsAppBridge(phone, text)

    // 2. רישום ההודעה היוצאת בשירות ה-Realtime
    const outgoingMsg = addWhatsAppLiveMessage({
      phone,
      senderName,
      text,
      timestamp: Date.now(),
      direction: "outgoing",
      status: bridgeResult.success ? "sent" : "failed",
    })

    // 3. שמירה ב-Firestore
    const activeSessionId = "user_0508860896_active"
    try {
      await saveMessage(
        activeSessionId,
        "model",
        text,
        "whatsapp",
        false,
        {
          dispatchedToWhatsApp: true,
          recipientPhone: phone,
          recipientName: customerName,
          sentBy: senderName,
          bridgeSuccess: bridgeResult.success,
        }
      )
    } catch (saveErr) {
      console.warn("Could not save outgoing WhatsApp message to Firestore:", saveErr)
    }

    // קישור wa.me לגיבוי ישיר
    const cleanDigits = phone.replace(/[^0-9]/g, "")
    const intlDigits = cleanDigits.startsWith("0") ? "972" + cleanDigits.slice(1) : cleanDigits
    const waMeUrl = `https://wa.me/${intlDigits}?text=${encodeURIComponent(text)}`

    return NextResponse.json({
      success: bridgeResult.success,
      messageId: bridgeResult.messageId || outgoingMsg.id,
      bridgeSuccess: bridgeResult.success,
      bridgeError: bridgeResult.error || null,
      waMeFallbackUrl: waMeUrl,
      recipient: phone,
      text,
    })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error("Error in /api/whatsapp/send:", errorMsg)
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
