import { NextRequest, NextResponse } from "next/server"
import {
  listSpreadsheets,
  getSpreadsheet,
  readSheetValues,
  appendSheetValues,
  updateSheetValues,
  createSpreadsheet,
} from "@/lib/google-sheets"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Unauthorized: Missing or invalid Google OAuth Bearer token" },
      { status: 401 }
    )
  }

  const accessToken = authHeader.replace("Bearer ", "").trim()
  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action") || "list"
  const spreadsheetId = searchParams.get("spreadsheetId")
  const range = searchParams.get("range")

  try {
    if (action === "list") {
      const files = await listSpreadsheets(accessToken)
      return NextResponse.json({ files })
    }

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: "Missing required parameter: spreadsheetId" },
        { status: 400 }
      )
    }

    if (action === "metadata") {
      const metadata = await getSpreadsheet(accessToken, spreadsheetId)
      return NextResponse.json(metadata)
    }

    if (action === "read") {
      if (!range) {
        return NextResponse.json(
          { error: "Missing required parameter: range (e.g. Sheet1!A1:D10)" },
          { status: 400 }
        )
      }
      const data = await readSheetValues(accessToken, spreadsheetId, range)
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error interacting with Google Sheets API"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Unauthorized: Missing or invalid Google OAuth Bearer token" },
      { status: 401 }
    )
  }

  const accessToken = authHeader.replace("Bearer ", "").trim()

  try {
    const body = await req.json()
    const { action, spreadsheetId, range, values, title, sheetTitles } = body

    if (action === "create") {
      if (!title) {
        return NextResponse.json({ error: "Missing title for new spreadsheet" }, { status: 400 })
      }
      const created = await createSpreadsheet(accessToken, title, sheetTitles)
      return NextResponse.json(created)
    }

    if (!spreadsheetId) {
      return NextResponse.json({ error: "Missing spreadsheetId" }, { status: 400 })
    }

    if (action === "append") {
      if (!range || !Array.isArray(values)) {
        return NextResponse.json({ error: "Missing range or values array for append" }, { status: 400 })
      }
      const res = await appendSheetValues(accessToken, spreadsheetId, range, values)
      return NextResponse.json(res)
    }

    if (action === "update") {
      if (!range || !Array.isArray(values)) {
        return NextResponse.json({ error: "Missing range or values array for update" }, { status: 400 })
      }
      const res = await updateSheetValues(accessToken, spreadsheetId, range, values)
      return NextResponse.json(res)
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error executing Google Sheets operation"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
