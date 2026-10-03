/**
 * שירות גשר וואטסאפ בזמן אמת (WhatsApp Live Bridge Service)
 * מנהל תור אירועים, מנויי SSE, וקריאות ל-whatsapp_bridge.cjs
 */

export interface WhatsAppLiveMessage {
  id: string
  phone: string
  senderName: string
  text: string
  timestamp: number
  direction: "incoming" | "outgoing"
  status?: "sent" | "delivered" | "received" | "failed"
  location?: { latitude: number; longitude: number } | null
  wazeUrl?: string | null
  replyToId?: string
}

export type WhatsAppEventListener = (message: WhatsAppLiveMessage) => void

// זיכרון מקומי לתור הודעות אחרונות
const messageBuffer: WhatsAppLiveMessage[] = []
const MAX_BUFFER = 100

// מנויי Realtime SSE
const listeners = new Set<WhatsAppEventListener>()

export function addWhatsAppLiveMessage(
  data: Omit<WhatsAppLiveMessage, "id"> & { id?: string }
): WhatsAppLiveMessage {
  const id = data.id || `wa_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const newMsg: WhatsAppLiveMessage = {
    ...data,
    id,
  }

  messageBuffer.push(newMsg)
  if (messageBuffer.length > MAX_BUFFER) {
    messageBuffer.shift()
  }

  // הפצה לכל המאזינים הפעילים (SSE / WebSockets)
  listeners.forEach((listener) => {
    try {
      listener(newMsg)
    } catch (err) {
      console.error("Error notifying WhatsApp listener:", err)
    }
  })

  return newMsg
}

export function getRecentWhatsAppLiveMessages(limitCount: number = 30): WhatsAppLiveMessage[] {
  return messageBuffer.slice(-limitCount)
}

export function subscribeWhatsAppLiveEvents(listener: WhatsAppEventListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * שליחת הודעה דרך שרת הגשר (whatsapp_bridge.cjs בפורט 3001)
 */
export async function sendToWhatsAppBridge(
  phone: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const bridgeUrl = process.env.WHATSAPP_BRIDGE_URL || "http://127.0.0.1:3001"

  try {
    const res = await fetch(`${bridgeUrl}/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, text, message: text }),
      signal: AbortSignal.timeout(6000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      return {
        success: false,
        error: `Bridge returned status ${res.status}: ${errText || "Unknown error"}`,
      }
    }

    const data = await res.json().catch(() => ({}))
    return {
      success: true,
      messageId: data.messageId || "sent",
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      error: `Could not reach WhatsApp Bridge on ${bridgeUrl}: ${msg}`,
    }
  }
}

/**
 * בדיקת סטטוס חיבור השרת בפורט 3001
 */
export async function checkWhatsAppBridgeStatus(): Promise<{
  connected: boolean
  isReady: boolean
  userPhone?: string
  qrAvailable?: boolean
  error?: string
}> {
  const bridgeUrl = process.env.WHATSAPP_BRIDGE_URL || "http://127.0.0.1:3001"

  try {
    const res = await fetch(`${bridgeUrl}/status`, {
      signal: AbortSignal.timeout(2500),
    })

    if (!res.ok) {
      return { connected: false, isReady: false, error: `HTTP ${res.status}` }
    }

    const data = await res.json().catch(() => ({}))
    return {
      connected: true,
      isReady: Boolean(data.isClientReady),
      userPhone: data.connectedUserPhone,
      qrAvailable: Boolean(data.latestQrCode || data.hasQr),
    }
  } catch (err) {
    return {
      connected: false,
      isReady: false,
      error: err instanceof Error ? err.message : "Unreachable",
    }
  }
}
