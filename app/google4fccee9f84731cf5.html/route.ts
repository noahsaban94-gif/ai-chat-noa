import { NextResponse } from "next/server"

export async function GET() {
  return new NextResponse("google-site-verification: google4fccee9f84731cf5.html\n", {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
