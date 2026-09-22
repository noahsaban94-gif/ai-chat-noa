import { NextResponse } from "next/server"
import { getAllAuthorizedUsers, seedAuthorizedUsers } from "@/lib/seed-authorized-users"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const baseUrl = `${url.protocol}//${url.host}`
    const users = await getAllAuthorizedUsers(baseUrl)
    return NextResponse.json({ success: true, users })
  } catch (error: unknown) {
    console.error("Error retrieving authorized users:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url)
    const baseUrl = `${url.protocol}//${url.host}`
    const body = await req.json().catch(() => ({}))
    const forceReset = Boolean(body.forceReset)
    const result = await seedAuthorizedUsers(baseUrl, forceReset)
    return NextResponse.json(result)
  } catch (error: unknown) {
    console.error("Error seeding authorized users:", error)
    const message = error instanceof Error ? error.message : "Internal Server Error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
