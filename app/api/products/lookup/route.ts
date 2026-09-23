import { NextRequest, NextResponse } from "next/server"
import { lookupProductBySku, batchLookupProductImages } from "@/lib/product-data-service"

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const sku = searchParams.get("sku")
    const skusParam = searchParams.get("skus")

    // Batch lookup
    if (skusParam) {
      const skus = skusParam.split(",").map((s) => s.trim()).filter(Boolean)
      const imagesMap = await batchLookupProductImages(skus)
      const result: Record<string, string> = {}
      imagesMap.forEach((url, s) => {
        result[s] = url
      })
      return NextResponse.json({ success: true, images: result })
    }

    // Single SKU lookup
    if (!sku) {
      return NextResponse.json(
        { error: "Missing required 'sku' or 'skus' query parameter" },
        { status: 400 }
      )
    }

    const result = await lookupProductBySku(sku)
    return NextResponse.json({
      success: true,
      found: result.found,
      sku: result.sku,
      imageUrl: result.imageUrl || null,
      localImageUrl: result.localImageUrl || null,
      sheetImageUrl: result.sheetImageUrl || null,
      youtubeUrl: result.youtubeUrl || null,
      source: result.source || "none",
      hasLocalFile: result.hasLocalFile || false,
      hasSheetUrl: result.hasSheetUrl || false,
      product: result.product || null,
    })
  } catch (error) {
    console.error("[ProductLookupAPI] Error during SKU lookup:", error)
    return NextResponse.json(
      { error: "Internal server error performing product lookup" },
      { status: 500 }
    )
  }
}
