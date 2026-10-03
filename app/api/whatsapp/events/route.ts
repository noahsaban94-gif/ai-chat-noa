import { NextRequest } from "next/server"
import {
  subscribeWhatsAppLiveEvents,
  getRecentWhatsAppLiveMessages,
  type WhatsAppLiveMessage,
} from "@/lib/whatsapp-bridge-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // 1. שליחת פעימת פתיחה והודעות אחרונות
      const initPayload = JSON.stringify({
        type: "init",
        recentMessages: getRecentWhatsAppLiveMessages(15),
        serverTime: Date.now(),
      })
      controller.enqueue(encoder.encode(`data: ${initPayload}\n\n`))

      // 2. האזנה להודעות נכנסות/יוצאות חדשות
      const unsubscribe = subscribeWhatsAppLiveEvents((msg: WhatsAppLiveMessage) => {
        try {
          const eventPayload = JSON.stringify({
            type: "message",
            message: msg,
          })
          controller.enqueue(encoder.encode(`data: ${eventPayload}\n\n`))
        } catch (err) {
          console.error("Error pushing SSE event:", err)
        }
      })

      // 3. Keep-alive heartbeat כל 15 שניות
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`))
        } catch {
          clearInterval(heartbeat)
        }
      }, 15000)

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat)
        unsubscribe()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  })
}
