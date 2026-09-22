import { NextRequest, NextResponse } from "next/server"
import { normalizeOrderText } from "@/lib/order-normalizer"
import { getTeamMember, buildUserSenderContext } from "@/lib/knowledge"

/**
 * POST /api/normalize-order
 * 
 * Endpoint לנרמול הזמנות טקסט חופשי (מתאים לקריאות ישירות, Webhook, או JONI)
 * מחזיר גם כרטיס הזמנה מנורמל בפורמט וואטסאפ וגם אובייקט JSON מובנה.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const text = body.text || body.message || body.content || ""
    const senderPhone = body.senderPhone || body.phone || body.sender || "050-6620013"

    if (!text.trim()) {
      return NextResponse.json(
        { error: "יש להזין שדה text המכיל את תוכן ההודעה" },
        { status: 400 }
      )
    }

    const teamMember = getTeamMember(senderPhone)
    const userSenderContext = buildUserSenderContext(senderPhone)
    const normalizedResult = normalizeOrderText(text, senderPhone)

    return NextResponse.json({
      success: true,
      sender: {
        phone: senderPhone,
        isTeamMember: !!teamMember,
        teamMember: teamMember ? { name: teamMember.name, role: teamMember.role } : null,
        contextText: userSenderContext
      },
      ...normalizedResult
    })
  } catch (error) {
    console.error("Error in normalize-order API:", error)
    return NextResponse.json(
      { error: "שגיאה בביצוע נרמול הזמנה", details: String(error) },
      { status: 500 }
    )
  }
}
