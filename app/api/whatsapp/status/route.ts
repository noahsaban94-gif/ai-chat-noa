import { NextResponse } from "next/server"
import {
  checkWhatsAppBridgeStatus,
  getRecentWhatsAppLiveMessages,
} from "@/lib/whatsapp-bridge-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const status = await checkWhatsAppBridgeStatus()
  const recentMessages = getRecentWhatsAppLiveMessages(10)

  return NextResponse.json({
    bridge: status,
    recentCount: recentMessages.length,
    recentMessages,
    timestamp: Date.now(),
  })
}
