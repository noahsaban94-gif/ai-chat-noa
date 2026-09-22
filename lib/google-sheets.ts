/**
 * Google Sheets & Drive API Client
 * Operates with OAuth access tokens passed from authenticated sessions.
 */

export interface SpreadsheetInfo {
  id: string
  name: string
  modifiedTime?: string
  webViewLink?: string
}

export interface SheetTab {
  sheetId: number
  title: string
  index: number
}

export interface SpreadsheetMetadata {
  spreadsheetId: string
  title: string
  sheets: SheetTab[]
  spreadsheetUrl: string
}

export async function listSpreadsheets(accessToken: string): Promise<SpreadsheetInfo[]> {
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false")
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&orderBy=modifiedTime desc&pageSize=20`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to list spreadsheets: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.files || []
}

export async function getSpreadsheet(
  accessToken: string,
  spreadsheetId: string
): Promise<SpreadsheetMetadata> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,properties.title,properties.defaultFormat,sheets.properties(sheetId,title,index),spreadsheetUrl`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get spreadsheet metadata: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || "Untitled Spreadsheet",
    sheets: (data.sheets || []).map((s: { properties: SheetTab }) => s.properties),
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  }
}

export async function readSheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string
): Promise<{ range: string; values: string[][] }> {
  const encodedRange = encodeURIComponent(range)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to read sheet values: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return {
    range: data.range,
    values: data.values || [],
  }
}

export async function appendSheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean)[][]
): Promise<{ updatedRows: number; updatedColumns: number; updatedCells: number }> {
  const encodedRange = encodeURIComponent(range)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to append rows to sheet: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return {
    updatedRows: data.updates?.updatedRows || 0,
    updatedColumns: data.updates?.updatedColumns || 0,
    updatedCells: data.updates?.updatedCells || 0,
  }
}

export async function updateSheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean)[][]
): Promise<{ updatedCells: number }> {
  const encodedRange = encodeURIComponent(range)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to update sheet cells: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return {
    updatedCells: data.updatedCells || 0,
  }
}

export async function createSpreadsheet(
  accessToken: string,
  title: string,
  sheetTitles: string[] = ["Sheet1"]
): Promise<SpreadsheetMetadata> {
  const url = "https://sheets.googleapis.com/v4/spreadsheets"

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: sheetTitles.map((tabTitle) => ({
        properties: {
          title: tabTitle,
        },
      })),
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to create spreadsheet: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || title,
    sheets: (data.sheets || []).map((s: { properties: SheetTab }) => s.properties),
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`,
  }
}
