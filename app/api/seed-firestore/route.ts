import { NextResponse } from "next/server"
import { seedFirestoreConversations } from "@/lib/seed-conversations"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const force = Boolean(body.force)
    const result = await seedFirestoreConversations(force)
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("Error seeding Firestore conversations:", error)
    const errMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: errMessage },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const result = await seedFirestoreConversations(false)
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("Error seeding Firestore conversations via GET:", error)
    const errMessage = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json(
      { success: false, error: errMessage },
      { status: 500 }
    )
  }
}
