import { INVENTORY_CATALOG, NOA_KNOWLEDGE_BASE, matchClient, getTeamMember, normalizePhoneNumber } from "./knowledge"

export interface NormalizedItem {
  sku: string
  name: string
  quantity: number
  isDeposit?: boolean
  isExemptDeposit?: boolean
}

export interface NormalizedOrderResult {
  client: {
    comaxId: string
    name: string
    contactPerson: string
    phone: string
    address: string
  }
  items: NormalizedItem[]
  logistics: {
    warehouse: string
    driver: string
    craneNote?: string
    dischargeNote?: string
  }
  formattedCard: string
}

/**
 * מנרמל הודעת טקסט חופשית להזמנה מנורמלת מלאה לפי 4 השלבים שהוגדרו
 */
export function normalizeOrderText(text: string, senderPhone?: string): NormalizedOrderResult {
  // 1. זיהוי הלקוח (Entity Matching)
  let matched = matchClient(text, senderPhone)
  if (!matched) {
    // נסיון לאתר טלפון בטקסט עצמו
    const phoneInText = text.match(/(?:05\d-?\d{7}|9725\d{8})/)
    if (phoneInText) {
      matched = matchClient(text, phoneInText[0])
    }
  }

  // ערכי ברירת מחדל אם לא אותר לקוח
  const clientInfo = matched || {
    comaxId: "607145",
    clientName: "זבולון-עדירן/הופמן",
    contactPerson: "עבד",
    phone: senderPhone || "050-6620013",
    address: "החורש 21, כפר שמריהו",
    defaultDriver: "חכמת",
    defaultWarehouse: "4(החרש)"
  }

  // 2. זיהוי וחילוף מוצרים למק"טים
  const items: NormalizedItem[] = []
  let isExemptFromDeposits = false
  let requiresCrane = false
  let heavyCount = 0
  let lightCount = 0

  // בדיקת הובלה ללא פריקה
  if (text.includes("ללא פריקה") || text.includes("הובלה רגילה")) {
    isExemptFromDeposits = true
  }

  // בדיקת פריקת מנוף / גובה
  if (text.includes("מעבר לגדר") || text.includes("מנוף") || text.includes("תרים") || text.includes("גובה") || text.includes("קומה")) {
    requiresCrane = true
  }

  // חול (11501)
  const sandMatch = text.match(/(\d+)\s*(?:בלות?|שקי?ם?\s*גדולים?|שק\s*גדול)\s*חול|חול\s*(\d+)\s*בלות?/)
  if (sandMatch) {
    const qty = parseInt(sandMatch[1] || sandMatch[2] || "1", 10)
    items.push({ sku: "11501", name: "חול שק גדול (בלה)", quantity: qty })
    heavyCount += qty
  } else if (text.includes("חול בלה") || text.includes("בלת חול") || text.includes("חול")) {
    const qtyMatch = text.match(/(\d+)\s*(?:בלה|בלות)?\s*חול|חול.*?(\d+)/)
    const qty = qtyMatch ? parseInt(qtyMatch[1] || qtyMatch[2], 10) : 1
    items.push({ sku: "11501", name: "חול שק גדול (בלה)", quantity: qty })
    heavyCount += qty
  }

  // מלט (10002)
  const cementPalletMatch = text.match(/(\d+)\s*משטחי?\s*מלט|משטח\s*מלט/)
  if (cementPalletMatch) {
    const palletQty = cementPalletMatch[1] ? parseInt(cementPalletMatch[1], 10) : 1
    const bagsQty = palletQty * 40
    items.push({ sku: "10002", name: "מלט אפור 25 ק\"ג נשר", quantity: bagsQty })
    heavyCount += bagsQty
  } else {
    const cementBagsMatch = text.match(/(\d+)\s*שקי?\s*מלט/)
    if (cementBagsMatch) {
      const qty = parseInt(cementBagsMatch[1], 10)
      items.push({ sku: "10002", name: "מלט אפור 25 ק\"ג נשר", quantity: qty })
      heavyCount += qty
    }
  }

  // סומסום (11511)
  const sumsumMatch = text.match(/(\d+)\s*(?:בלות?|שקי?ם?\s*גדולים?|שק\s*גדול)\s*סומסום|סומסום\s*(\d+)/)
  if (sumsumMatch) {
    const qty = parseInt(sumsumMatch[1] || sumsumMatch[2] || "1", 10)
    items.push({ sku: "11511", name: "סומסום שק גדול (בלה)", quantity: qty })
    heavyCount += qty
  } else if (text.includes("סומסום בלה") || text.includes("בלת סומסום")) {
    items.push({ sku: "11511", name: "סומסום שק גדול (בלה)", quantity: 1 })
    heavyCount += 1
  }

  // טיט (11551)
  const titMatch = text.match(/(\d+)\s*(?:בלות?|שקי?ם?\s*גדולים?|שק\s*גדול)\s*טיט|טיט\s*(\d+)/)
  if (titMatch) {
    const qty = parseInt(titMatch[1] || titMatch[2] || "1", 10)
    items.push({ sku: "11551", name: "טיט מוכן שק גדול", quantity: qty })
    heavyCount += qty
  }

  // גבס לבן 260 (111260)
  const drywallWhiteMatch = text.match(/(\d+)\s*(?:לוחות?|לוח)?\s*גבס\s*לבן|גבס\s*לבן\s*(\d+)/)
  if (drywallWhiteMatch) {
    const qty = parseInt(drywallWhiteMatch[1] || drywallWhiteMatch[2] || "1", 10)
    items.push({ sku: "111260", name: "לוח גבס לבן 260", quantity: qty })
    lightCount += qty
  }

  // גבס ירוק (112260)
  const drywallGreenMatch = text.match(/(\d+)\s*(?:לוחות?|לוח)?\s*גבס\s*ירוק/)
  if (drywallGreenMatch) {
    const qty = parseInt(drywallGreenMatch[1] || "1", 10)
    items.push({ sku: "112260", name: "לוח גבס ירוק 260", quantity: qty })
    lightCount += qty
  }

  // 3. חישוב פקדונות אוטומטי (כלל 1:1 והמשטחים)
  if (!isExemptFromDeposits) {
    // בלות: סופרים שקי בלה (חול 11501, סומסום 11511, טיט 11551, מצע 11540, חמרה 11570, חצץ 11506)
    let totalBelaItems = 0
    for (const item of items) {
      if (["11501", "11511", "11551", "11540", "11570", "11506"].includes(item.sku)) {
        totalBelaItems += item.quantity
      }
    }
    if (totalBelaItems > 0) {
      items.push({
        sku: "60002",
        name: "שק גדול פקדון (בלה)",
        quantity: totalBelaItems,
        isDeposit: true
      })
    }

    // משטחי עץ: 1 משטח לכל 35-40 שקי מלט/דבק
    let totalBags = 0
    for (const item of items) {
      if (item.sku === "10002" || item.sku === "15181" || item.sku === "15109" || item.sku === "15116") {
        totalBags += item.quantity
      }
    }
    if (totalBags > 0) {
      const palletCount = Math.max(1, Math.ceil(totalBags / 40))
      items.push({
        sku: "60060",
        name: "משטח סבן פקדון",
        quantity: palletCount,
        isDeposit: true
      })
    }
  }

  // שורת הובלה
  if (requiresCrane || heavyCount > 0) {
    // הובלת מנוף
    items.push({
      sku: "18050",
      name: "הובלת מנוף",
      quantity: 1
    })
  }

  // 4. ניתוב לוגיסטי (שיבוץ מחסן ונהג)
  const isHeavyOrCrane = heavyCount > 0 || requiresCrane
  const warehouse = isHeavyOrCrane ? "🏭 4 (החרש)" : "🏟️ 1 (התלמיד)"
  const driver = isHeavyOrCrane ? "חכמת (מרצדס מנוף 615-41-002)" : "עלי (איסוזו חלוקה 654-51-701)"

  // חילוץ הערת פריקה
  let dischargeNote = "פריקה רגילה"
  if (text.includes("מעבר לגדר")) {
    dischargeNote = "הרמה לגובה מעבר לגדר"
  } else if (text.includes("מרפסת")) {
    dischargeNote = "הנפה למרפסת"
  } else if (text.includes("גג")) {
    dischargeNote = "הנפה לגג"
  } else if (text.includes("חצר אחורית")) {
    dischargeNote = "הנפה לחצר אחורית"
  } else if (requiresCrane) {
    dischargeNote = "פריקת מנוף באתר"
  }

  // בניית כרטיס מעוצב
  const formattedItemsList = items
    .map((item, idx) => `${idx + 1}. מק"ט ${item.sku} | ${item.name} | כמות: ${item.quantity}`)
    .join("\n")

  const formattedCard = `📦 כרטיס הזמנה מנורמל - סבן
──────────
👤 לקוח: ${clientInfo.comaxId} - ${clientInfo.clientName}
📍 אתר אספקה: ${clientInfo.address}
📞 איש קשר: ${clientInfo.contactPerson} (${clientInfo.phone})
──────────
מוצרים להעמסה:
${formattedItemsList}
──────────
🚚 שיבוץ לוגיסטי:
• מחסן מוצא: ${warehouse}
• נהג: ${driver}
• הערת פריקה: ${dischargeNote}`

  return {
    client: {
      comaxId: clientInfo.comaxId,
      name: clientInfo.clientName,
      contactPerson: clientInfo.contactPerson,
      phone: clientInfo.phone,
      address: clientInfo.address
    },
    items,
    logistics: {
      warehouse,
      driver,
      dischargeNote
    },
    formattedCard
  }
}
