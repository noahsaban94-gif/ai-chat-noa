/**
 * lib/product-data-service.ts
 * 
 * Service to fetch product data from the Google Apps Script endpoint and connected Google Sheet
 * using the Fetch API, specifically targeting the 'Image' (תמונה) column for SKU lookups.
 * 
 * Spreadsheet ID: 1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA
 * Tab: מילון_לוגיסטי
 * Apps Script URL: https://script.google.com/macros/s/AKfycbzWpPnV9jxBt8qGDGkVjTWChG_9vQMN156D1VMdw2vDUKuPEkQR53_C56PIYgwHwONn/exec
 * Target Column: Column K (Index 10) - "תמונה" (Product Image URL)
 */

export interface ProductRecord {
  /** Stock Keeping Unit (מק"ט קומקס) */
  sku: string
  /** Official product name */
  name: string
  /** Logistic category */
  category?: string
  /** Unit of measurement (שק, בלה, יח', etc.) */
  unit?: string
  /** Search keywords and slang terms */
  keywords?: string
  /** Pallet and deposit specifications */
  deposits?: string
  /** Weight in kilograms per unit */
  weightKg?: number
  /** Default dispatch warehouse */
  warehouse?: string
  /** Default assigned driver or vehicle */
  driver?: string
  /** Resolved Product Image URL from 'Image' column (עמודה K: תמונה) */
  imageUrl?: string
  /** Raw Image value from secondary column (עמודה J: תמונת מוצר) */
  rawImageColJ?: string
  /** Data resolution source */
  source: "apps_script" | "google_sheet" | "cache"
}

export interface ProductLookupResult {
  found: boolean
  sku: string
  product?: ProductRecord
  imageUrl?: string
  localImageUrl?: string | null
  sheetImageUrl?: string | null
  source?: "local_upload" | "sheet_column_k" | "catalog_default" | "none"
  hasLocalFile?: boolean
  hasSheetUrl?: boolean
}

/**
 * Safely inspects local disk on server side for product image existence without breaking client bundling
 */
function checkLocalProductImage(cleanSku: string): { localUrl: string | null; isReal: boolean } {
  if (typeof window !== "undefined") {
    return { localUrl: `/products/${cleanSku}.jpg`, isReal: false }
  }
  try {
    // Dynamic require so Next.js client bundler does not error
    const fs = (eval("require"))("fs")
    const path = (eval("require"))("path")
    const productsDir = path.join(process.cwd(), "public/products")
    
    // Also check root if file was uploaded to root
    const rootDir = process.cwd()
    const exts = ["jpg", "png", "jpeg", "webp", "svg"]
    for (const ext of exts) {
      const rootCandidate = path.join(rootDir, `${cleanSku}.${ext}`)
      const targetCandidate = path.join(productsDir, `${cleanSku}.${ext}`)
      if (fs.existsSync(rootCandidate) && !fs.existsSync(targetCandidate)) {
        try {
          fs.copyFileSync(rootCandidate, targetCandidate)
        } catch {}
      }

      if (fs.existsSync(targetCandidate)) {
        const stats = fs.statSync(targetCandidate)
        // Skip empty or 0-byte placeholder files
        if (stats.size > 100) {
          return {
            localUrl: `/products/${cleanSku}.${ext}`,
            isReal: ext !== "svg" && stats.size > 1000,
          }
        }
      }
    }
  } catch {
    // non-node environment
  }
  return { localUrl: null, isReal: false }
}

export interface ProductServiceConfig {
  /** Google Apps Script endpoint URL */
  scriptUrl?: string
  /** Google Spreadsheet ID */
  spreadsheetId?: string
  /** Sheet tab name */
  tabName?: string
  /** In-memory cache duration in milliseconds (default: 60,000ms / 1 min) */
  cacheTtlMs?: number
  /** Request timeout in milliseconds (default: 8,000ms) */
  timeoutMs?: number
  /** Bypass cache and force reload */
  forceRefresh?: boolean
}

export const DEFAULT_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzWpPnV9jxBt8qGDGkVjTWChG_9vQMN156D1VMdw2vDUKuPEkQR53_C56PIYgwHwONn/exec"

export const DEFAULT_SPREADSHEET_ID =
  "1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA"

export const DEFAULT_TAB_NAME = "מילון_לוגיסטי"

export const DEFAULT_FALLBACK_IMAGE = "/products/default-building-material.svg"

// In-memory cache
let cachedProducts: Map<string, ProductRecord> = new Map()
let lastCacheTimestamp = 0

/**
 * Normalizes image URLs from Google Drive, PostImage, and other CDNs into direct image URLs.
 */
export function normalizeProductImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  const cleaned = String(url).trim().replace(/^"+|"+$/g, "")
  if (!cleaned || cleaned.toLowerCase() === "null" || cleaned.toLowerCase() === "undefined") {
    return undefined
  }

  // Google Drive file view URL -> direct image stream link
  const driveMatch = cleaned.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i)
  if (driveMatch && driveMatch[1]) {
    return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`
  }

  // Validate standard URLs and relative paths
  if (cleaned.startsWith("http://") || cleaned.startsWith("https://") || cleaned.startsWith("/")) {
    return cleaned
  }

  return undefined
}

/**
 * Parses standard CSV lines with quoted cells and escaped quotes.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let currentCell = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        currentCell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === "," && !inQuotes) {
      result.push(currentCell.trim())
      currentCell = ""
    } else {
      currentCell += char
    }
  }
  result.push(currentCell.trim())
  return result
}

/**
 * Fetches product data using the Fetch API.
 * First queries the Google Apps Script endpoint; if that returns non-product data or is unavailable,
 * automatically falls back to fetching directly from the 'מילון_לוגיסטי' tab in the connected Google Sheet.
 */
export async function fetchProductDataFromScript(
  config: ProductServiceConfig = {}
): Promise<ProductRecord[]> {
  const scriptUrl = config.scriptUrl || DEFAULT_APPS_SCRIPT_URL
  const spreadsheetId = config.spreadsheetId || DEFAULT_SPREADSHEET_ID
  const tabName = config.tabName || DEFAULT_TAB_NAME
  const cacheTtlMs = config.cacheTtlMs ?? 60 * 1000
  const timeoutMs = config.timeoutMs ?? 8000
  const forceRefresh = config.forceRefresh ?? false

  const now = Date.now()
  if (!forceRefresh && cachedProducts.size > 0 && now - lastCacheTimestamp < cacheTtlMs) {
    return Array.from(cachedProducts.values())
  }

  // 1. Try querying the Google Apps Script URL with Fetch API
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(scriptUrl, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent": "Noa-AI-Logistics/1.0",
      },
      signal: controller.signal,
      next: { revalidate: 60 },
    })
    clearTimeout(timer)

    if (response.ok) {
      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("application/json")) {
        const json = await response.json()
        const rawList = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.products)
          ? json.products
          : null

        // Check if the Apps Script returned items containing product fields (e.g. sku and image)
        if (rawList && rawList.length > 0) {
          const sample = rawList[0]
          const hasSkuField = Boolean(
            sample.sku || sample.SKU || sample["מק\"ט"] || sample["מק\"ט (SKU)"] || sample.itemCode
          )
          const hasImageField = Boolean(
            sample.image || sample.imageUrl || sample.Image || sample["תמונה"] || sample["תמונת מוצר"]
          )

          if (hasSkuField && (hasImageField || sample.name || sample["שם מוצר"])) {
            const mapped: ProductRecord[] = []
            for (const item of rawList) {
              const sku = String(
                item.sku || item.SKU || item["מק\"ט"] || item["מק\"ט (SKU)"] || item.itemCode || ""
              ).trim()
              if (!sku) continue

              const rawImg =
                item.imageUrl ||
                item.image ||
                item.Image ||
                item["תמונה"] ||
                item["תמונת מוצר"] ||
                ""
              const imageUrl = normalizeProductImageUrl(rawImg)

              const record: ProductRecord = {
                sku,
                name: String(item.name || item["שם מוצר רשמי (קומקס)"] || item["שם מוצר"] || `מוצר ${sku}`),
                category: item.category || item["קטגוריה לוגיסטית"],
                unit: item.unit || item["יחידת מידה"],
                keywords: item.keywords || item["סלנג ומילות מפתח לנרמול AI"],
                deposits: item.deposits || item["סיווג וחישוב פקדונות"],
                weightKg: Number(item.weightKg || item["משקל יח' (ק\"ג)"] || 0),
                warehouse: item.warehouse || item["מחסן מקור ברירת מחדל"],
                driver: item.driver || item["שיוך נהג ומשאית ברירת מחדל"],
                imageUrl,
                source: "apps_script",
              }
              mapped.push(record)
            }

            if (mapped.length > 0) {
              cachedProducts = new Map(mapped.map((p) => [p.sku.toLowerCase(), p]))
              lastCacheTimestamp = now
              return mapped
            }
          }
        }
      }
    }
  } catch (scriptErr) {
    console.warn("[ProductDataService] Apps Script call returned error or timeout, trying sheet tab:", scriptErr)
  }

  // 2. Query the Google Sheet 'מילון_לוגיסטי' tab directly using the Fetch API
  try {
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
      tabName
    )}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(exportUrl, {
      method: "GET",
      headers: {
        Accept: "text/csv, text/plain, */*",
        "User-Agent": "Noa-AI-Logistics/1.0",
      },
      signal: controller.signal,
      next: { revalidate: 60 },
    })
    clearTimeout(timer)

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet CSV: ${response.status} ${response.statusText}`)
    }

    const csvText = await response.text()
    const lines = csvText.split(/\r?\n/)
    if (lines.length < 2) {
      return Array.from(cachedProducts.values())
    }

    const products: ProductRecord[] = []

    // Read header line to locate column indices dynamically
    const headerCols = parseCsvLine(lines[0]).map((h) => h.replace(/^"+|"+$/g, "").trim().toLowerCase())
    let skuColIndex = headerCols.findIndex((h) => h.includes("מק\"ט") || h.includes("sku"))
    let nameColIndex = headerCols.findIndex((h) => h.includes("שם מוצר") || h.includes("name"))
    let categoryColIndex = headerCols.findIndex((h) => h.includes("קטגוריה"))
    let unitColIndex = headerCols.findIndex((h) => h.includes("יחידת מידה") || h.includes("unit"))
    let keywordsColIndex = headerCols.findIndex((h) => h.includes("סלנג") || h.includes("מילות מפתח"))
    let depositsColIndex = headerCols.findIndex((h) => h.includes("פקדונות"))
    let weightColIndex = headerCols.findIndex((h) => h.includes("משקל"))
    let warehouseColIndex = headerCols.findIndex((h) => h.includes("מחסן"))
    let driverColIndex = headerCols.findIndex((h) => h.includes("נהג"))
    // Column K is specifically "תמונה", column J is "תמונת מוצר"
    let imageColKIndex = headerCols.findIndex((h) => h === "תמונה" || h === "image")
    let imageColJIndex = headerCols.findIndex((h) => h.includes("תמונת מוצר") || h.includes("product image"))

    // Fallbacks if header indices not matched
    if (skuColIndex === -1) skuColIndex = 0
    if (nameColIndex === -1) nameColIndex = 1
    if (categoryColIndex === -1) categoryColIndex = 2
    if (unitColIndex === -1) unitColIndex = 3
    if (keywordsColIndex === -1) keywordsColIndex = 4
    if (depositsColIndex === -1) depositsColIndex = 5
    if (weightColIndex === -1) weightColIndex = 6
    if (warehouseColIndex === -1) warehouseColIndex = 7
    if (driverColIndex === -1) driverColIndex = 8
    if (imageColJIndex === -1) imageColJIndex = 9
    if (imageColKIndex === -1) imageColKIndex = 10

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue

      const cols = parseCsvLine(line)
      const sku = (cols[skuColIndex] || "").replace(/^"+|"+$/g, "").trim()
      if (!sku) continue

      const name = (cols[nameColIndex] || "").replace(/^"+|"+$/g, "").trim()
      const category = (cols[categoryColIndex] || "").replace(/^"+|"+$/g, "").trim()
      const unit = (cols[unitColIndex] || "").replace(/^"+|"+$/g, "").trim()
      const keywords = (cols[keywordsColIndex] || "").replace(/^"+|"+$/g, "").trim()
      const deposits = (cols[depositsColIndex] || "").replace(/^"+|"+$/g, "").trim()
      const weightKg = parseFloat(cols[weightColIndex]) || 0
      const warehouse = (cols[warehouseColIndex] || "").replace(/^"+|"+$/g, "").trim()
      const driver = (cols[driverColIndex] || "").replace(/^"+|"+$/g, "").trim()

      const rawColJ = (cols[imageColJIndex] || "").replace(/^"+|"+$/g, "").trim()
      const rawColK = (cols[imageColKIndex] || "").replace(/^"+|"+$/g, "").trim()

      // Specifically targeting column K ("תמונה"), with secondary fallback to column J
      const rawImage = rawColK || rawColJ
      const imageUrl = normalizeProductImageUrl(rawImage)

      products.push({
        sku,
        name,
        category,
        unit,
        keywords,
        deposits,
        weightKg,
        warehouse,
        driver,
        rawImageColJ: rawColJ,
        imageUrl,
        source: "google_sheet",
      })
    }

    cachedProducts = new Map(products.map((p) => [p.sku.toLowerCase(), p]))
    lastCacheTimestamp = now
    return products
  } catch (err) {
    console.error("[ProductDataService] Error loading product data:", err)
    return Array.from(cachedProducts.values())
  }
}

/**
 * Looks up a single product by SKU, specifically targeting the 'Image' column.
 *
 * @param sku The product SKU (מק"ט קומקס), e.g. "10002", "11501", "11511"
 * @param config Optional service configuration
 */
export async function lookupProductBySku(
  sku: string,
  config: ProductServiceConfig = {}
): Promise<ProductLookupResult> {
  const cleanSku = String(sku || "").trim().toLowerCase()
  if (!cleanSku) {
    return { found: false, sku: "" }
  }

  // 1. בדיקת קיום קובץ מקומי במערכת (public/products)
  const localCheck = checkLocalProductImage(cleanSku)

  // 2. ודא טעינת נתונים מגיליון / Apps Script
  await fetchProductDataFromScript(config)

  let product = cachedProducts.get(cleanSku)
  if (!product) {
    // Fuzzy lookup if exact match not found
    for (const [key, item] of cachedProducts.entries()) {
      if (key.includes(cleanSku) || cleanSku.includes(key)) {
        product = item
        break
      }
    }
  }

  const sheetImageUrl = product?.imageUrl || null
  const localImageUrl = localCheck.localUrl
  const hasLocalFile = Boolean(localImageUrl)
  const hasSheetUrl = Boolean(sheetImageUrl)

  // קדימות:
  // אם הועלה קובץ מקומי אמיתי (כגון 10002.jpg או 11501.jpg), השתמש בו
  // אחרת אם יש לינק בעמודה K בגיליון, השתמש בו
  // אחרת קובץ מקומי / ברירת מחדל
  let chosenImageUrl: string | undefined = undefined
  let source: ProductLookupResult["source"] = "none"

  if (localCheck.isReal && localImageUrl) {
    chosenImageUrl = localImageUrl
    source = "local_upload"
  } else if (sheetImageUrl) {
    chosenImageUrl = sheetImageUrl
    source = "sheet_column_k"
  } else if (localImageUrl) {
    chosenImageUrl = localImageUrl
    source = "catalog_default"
  }

  if (product || hasLocalFile) {
    const finalProduct: ProductRecord = product || {
      sku: cleanSku,
      name: `מוצר מק"ט ${cleanSku}`,
      category: "חומרי בניין",
      unit: "יח'",
      source: "cache",
      imageUrl: chosenImageUrl,
    }

    return {
      found: true,
      sku: finalProduct.sku,
      product: {
        ...finalProduct,
        imageUrl: chosenImageUrl,
      },
      imageUrl: chosenImageUrl,
      localImageUrl,
      sheetImageUrl,
      source,
      hasLocalFile,
      hasSheetUrl,
    }
  }

  return { found: false, sku }
}

/**
 * Returns the Image URL for a given SKU, specifically from column K ('תמונה').
 * Returns the fallback building material image if no specific image is registered.
 *
 * @param sku The product SKU (מק"ט)
 * @param fallback Optional fallback image URL if none found
 */
export async function getProductImageUrlBySku(
  sku: string,
  fallback: string = DEFAULT_FALLBACK_IMAGE
): Promise<string> {
  const result = await lookupProductBySku(sku)
  if (result.found && result.imageUrl) {
    return result.imageUrl
  }
  return fallback
}

/**
 * Batch lookup of product images for multiple SKUs.
 * Efficiently resolves multiple SKUs against the cached dataset.
 *
 * @param skus Array of SKU strings
 */
export async function batchLookupProductImages(
  skus: string[],
  config: ProductServiceConfig = {}
): Promise<Map<string, string>> {
  await fetchProductDataFromScript(config)
  const results = new Map<string, string>()

  for (const rawSku of skus) {
    const clean = String(rawSku).trim().toLowerCase()
    const product = cachedProducts.get(clean)
    if (product?.imageUrl) {
      results.set(product.sku, product.imageUrl)
    }
  }

  return results
}

/**
 * Clears the in-memory cache to force a fresh fetch on the next call.
 */
export function clearProductDataCache(): void {
  cachedProducts.clear()
  lastCacheTimestamp = 0
}

/**
 * Extracts a candidate SKU number or code from user text (e.g., "10002", "11501", "מק\"ט 11511").
 */
export function extractSkuFromText(text: string): string | null {
  if (!text) return null
  const cleaned = text.trim()

  // 1. Explicit pattern: מק"ט / מקט / מק״ט / sku / מוצר followed by digits
  const explicitMatch = cleaned.match(/(?:מק["״]?ט|מקט|sku|פריט|מוצר)\s*[:#-]?\s*(\d{4,7})/i)
  if (explicitMatch && explicitMatch[1]) {
    return explicitMatch[1]
  }

  // 2. Standalone or delimited 4-7 digit number
  const digitMatch = cleaned.match(/\b(1\d{4,5}|6\d{4}|[1-9]\d{3,6})\b/)
  if (digitMatch && digitMatch[1]) {
    return digitMatch[1]
  }

  return null
}
