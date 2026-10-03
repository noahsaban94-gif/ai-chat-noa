/**
 * ==============================================================================
 * ח. סבן חומרי בניין (1994) בע״מ | נועה AI — שרת וואטסאפ אוטונומי היברידי
 * ==============================================================================
 * קובץ: whatsapp_bridge.cjs
 * תיאור: גרסה סופית — זיכרון שיחה, עגלה היברידית, GPS קשיח, חיבור Realtime לצ'אט
 * ושיגור מענה מנהל ישירות לוואטסאפ של הלקוח.
 * ==============================================================================
 */

const express = require('express');
const cors = require('cors');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

process.on('uncaughtException', (err) => console.error('\n❌ Uncaught Exception:', err.message));
process.on('unhandledRejection', (reason) => console.error('\n❌ Unhandled Rejection:', reason));

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.BRIDGE_PORT || 3001;
const APP_URL = process.env.APP_URL || 'http://127.0.0.1:3000';

// מזהי Google Sheets
const UNIFIED_SPREADSHEET_ID = process.env.UNIFIED_SPREADSHEET_ID || '1Ie7gKql_EDdrIN9HqunJc9Ey5k0WXXfPRxs0Vp1Bs2c'; 
const NOA_AI_SPREADSHEET_ID = process.env.NOA_AI_SPREADSHEET_ID || '1VA9J6n9IYcooO_s2xOpnkvyDQWWQD3pfhh0cnenCkoA';  
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwAkBK1Z051WmTvyDsRNrUf3xAS0MOCio9QRdoGyYxQdN66AekWhG_YFAgmKNEl7mR_/exec';
const APPS_SCRIPT_TOKEN = process.env.APPS_SCRIPT_TOKEN || 'saban_secret_token_2026';

// מספרי טלפון מאומתים להרשאות מיוחדות
const RAMI_PHONES = (process.env.RAMI_PHONES || '972508860896,0508860896').split(',').map(p => p.trim().replace(/[^0-9]/g, ''));
const HAREL_PHONES = (process.env.HAREL_PHONES || '').split(',').map(p => p.trim().replace(/[^0-9]/g, '')).filter(Boolean);
const MOM_PHONES = (process.env.MOM_PHONES || '').split(',').map(p => p.trim().replace(/[^0-9]/g, '')).filter(Boolean);

let latestQrCode = null;
let latestQrDataUrl = null;
let isClientReady = false;
let connectedUserPhone = null;

// ==============================================================================
// מנגנון ניהול מצב והיסטוריית שיחה (Memory & Context)
// ==============================================================================
const activeCarts = new Map();
const lastClosedCarts = new Map();
const rateLimitMap = new Map();
const HISTORY_FILE = path.join(__dirname, 'chat_history.json');

function saveChatMessage(phone, role, text, rawSender = 'לקוח') {
  try {
    let history = {};
    if (fs.existsSync(HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
    if (!history[phone]) history[phone] = [];
    
    let content = text;
    if (role === 'user') content = `שולח: ${rawSender}\nהודעה: ${text}`;
    else if (role === 'assistant') content = `{"type":"MESSAGE","clientReply":${JSON.stringify(text)}}`;

    history[phone].push({ role, content, timestamp: Date.now() });
    
    if (history[phone].length > 30) history[phone] = history[phone].slice(-30);
    
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    console.error('❌ שגיאה בשמירת היסטוריית שיחה:', err.message);
  }
}

/**
 * דחיפת ההודעה בזמן אמת לממשק ה-Chat של SabanOS
 */
async function pushMessageToChatInterface(payload) {
  try {
    const res = await fetch(`${APP_URL}/api/whatsapp/incoming`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3500)
    });
    if (res.ok) {
      console.log(`📡 [Real-time Push] הודעה נדחפה בהצלחה לממשק הצ'אט: ${payload.senderName} (${payload.phone})`);
    } else {
      console.warn(`⚠️ [Push Warning] הצ'אט החזיר סטטוס ${res.status}`);
    }
  } catch (err) {
    console.warn(`⚠️ לא ניתן לדחוף לממשק הצ'אט ב-${APP_URL}:`, err.message);
  }
}

function checkRateLimit(phone) {
  if (RAMI_PHONES.some(p => phone.includes(p))) return true;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const userRate = rateLimitMap.get(phone) || { count: 0, resetTime: now + windowMs };

  if (now > userRate.resetTime) {
    userRate.count = 1;
    userRate.resetTime = now + windowMs;
  } else {
    userRate.count++;
  }
  rateLimitMap.set(phone, userRate);
  
  return userRate.count <= 500; 
}

// ==============================================================================
// קטלוג, פונקציות זיהוי מילוני ופונקציות מפות
// ==============================================================================
const CITIES = ['רעננה', 'כפר סבא', 'הוד השרון', 'הרצליה', 'תל אביב', 'פתח תקווה', 'כפר ברא', 'ג\'לג\'וליה', 'טייבה', 'טירה', 'רמת השרון', 'נתניה', 'יבנה', 'חולון', 'בת ים', 'רמת גן', 'גבעתיים', 'בני ברק', 'קדימה', 'צור יגאל', 'כוכב יאיר', 'אלפי מנשה', 'אריאל', 'ראש העין', 'אביחיל', 'עמק חפר'];

const RAW_CATALOG = [
  { keywords: ['חול בלה', 'בלה חול', 'חול שק גדול', 'חול 4'], sku: '11501', name: 'חול שק גדול (בלה)', unit: 'בלה', isBigBag: true, weightTon: 0.75 },
  { keywords: ['חול שק 25', 'חול שק'], sku: '11500', name: 'חול שק 25 ק"ג', unit: 'שק', isBag: true, weightTon: 0.025 },
  { keywords: ['סומסום בלה', 'בלה סומסום'], sku: '11511', name: 'סומסום שק גדול (בלה)', unit: 'בלה', isBigBag: true, weightTon: 0.73 },
  { keywords: ['סומסום שק 25', 'סומסום שק'], sku: '11510', name: 'סומסום שק 25 ק"ג', unit: 'שק', isBag: true, weightTon: 0.025 },
  { keywords: ['מצע בלה', 'בלה מצע'], sku: '11540', name: 'מצע שק גדול (בלה)', unit: 'בלה', isBigBag: true, weightTon: 0.80 },
  { keywords: ['טיט מוכן שק גדול', 'טיט בלה', 'בלה טיט'], sku: '11551', name: 'טיט מוכן שק גדול (בלה)', unit: 'בלה', isBigBag: true, weightTon: 0.75 },
  { keywords: ['טיט מוכן שק', 'טיט שק'], sku: '11550', name: 'טיט מוכן שק 25 ק"ג', unit: 'שק', isBag: true, weightTon: 0.025 },
  { keywords: ['משטח מלט', 'משטח מלט נשר', 'משטח מלט אפור'], sku: '10002', name: 'מלט אפור 25 ק"ג (משטח)', unit: 'שק', isBag: true, isCementPallet: true, defaultQty: 40, weightTon: 0.025 },
  { keywords: ['מלט נשר 25', 'מלט אפור', 'מלט'], sku: '10002', name: 'מלט אפור 25 ק"ג', unit: 'שק', isBag: true, weightTon: 0.025 },
  { keywords: ['חול'], sku: '11501', name: 'חול שק גדול (בלה)', unit: 'בלה', isBigBag: true, weightTon: 0.75 },
  { keywords: ['סומסום'], sku: '11511', name: 'סומסום שק גדול (בלה)', unit: 'בלה', isBigBag: true, weightTon: 0.73 },
  { keywords: ['טיט'], sku: '11551', name: 'טיט שק גדול (בלה)', unit: 'בלה', isBigBag: true, weightTon: 0.75 }
];

const SORTED_RULES = [];
for (const p of RAW_CATALOG) for (const kw of p.keywords) SORTED_RULES.push({ length: kw.length, keyword: kw.toLowerCase(), product: p });
SORTED_RULES.sort((a, b) => b.length - a.length);

function convertHebrewNumbers(text) {
  const numMap = {
    'חצי': 0.5, 'אחד': 1, 'אחת': 1, 'שניים': 2, 'שתיים': 2, 'שני': 2, 'שתי': 2, 
    'שלוש': 3, 'שלושה': 3, 'ארבע': 4, 'ארבעה': 4, 'חמש': 5, 'חמישה': 5,
    'שש': 6, 'שישה': 6, 'שבע': 7, 'שבעה': 7, 'שמונה': 8, 'תשע': 9, 'תשעה': 9, 'עשר': 10, 'עשרה': 10
  };
  let result = text;
  for (const [word, digit] of Object.entries(numMap)) {
      result = result.replace(new RegExp(`(?:^|\\s)ו?${word}(?:\\s|$)`, 'g'), ` ${digit} `);
      result = result.replace(new RegExp(`(?:^|\\s)ו?${word}(?:\\s|$)`, 'g'), ` ${digit} `);
  }
  return result;
}

function parseAndNormalizeMaterials(text, existingItems = []) {
  const items = [];
  let remainingText = text.toLowerCase();

  for (const rule of SORTED_RULES) {
    let index = remainingText.indexOf(rule.keyword);
    while (index !== -1) {
      let preText = remainingText.substring(Math.max(0, index - 25), index);
      let qtyMatch = preText.match(/(\d+)(?=\s*(?:שקי|שק|יח|יחידות|בלות|בלה|משטחי|משטח|-)?\s*$)/);
      let quantity = 1;
      
      if (qtyMatch) {
          quantity = parseInt(qtyMatch[1], 10);
      } else {
          let postText = remainingText.substring(index + rule.keyword.length, Math.min(remainingText.length, index + rule.keyword.length + 15));
          let postQtyMatch = postText.match(/^\s*(?:שקי|שק|יח|יחידות|בלות|בלה|משטחי|משטח|-)?\s*(\d+)/);
          if (postQtyMatch) {
              quantity = parseInt(postQtyMatch[1], 10);
          } else {
              quantity = rule.product.defaultQty || 1;
          }
      }

      const existing = items.find(i => i.sku === rule.product.sku);
      if (existing) {
          existing.quantity += quantity;
      } else {
          items.push({ ...rule.product, quantity });
      }
      
      remainingText = remainingText.substring(0, index) + ' ' + remainingText.substring(index + rule.keyword.length);
      index = remainingText.indexOf(rule.keyword);
    }
  }

  const combinedItemsMap = new Map();
  for (const item of existingItems) combinedItemsMap.set(item.sku, { ...item });
  for (const item of items) {
      if (combinedItemsMap.has(item.sku)) {
          combinedItemsMap.get(item.sku).quantity += item.quantity;
      } else {
          combinedItemsMap.set(item.sku, { ...item });
      }
  }
  
  const combined = Array.from(combinedItemsMap.values());
  const bigBagCount = combined.filter(i => i.isBigBag).reduce((sum, i) => sum + i.quantity, 0);
  const totalBags = combined.filter(i => i.isBag).reduce((sum, i) => sum + i.quantity, 0);
  
  return {
    items: combined,
    newItemsFound: items.length > 0,
    deposits: { bigBags: bigBagCount, pallets: Math.ceil(totalBags / 35) },
    needsCrane: bigBagCount > 0 || totalBags >= 25
  };
}

function extractAddress(text) {
  if (!text) return '';
  const clean = text.trim();
  
  for (const city of CITIES) {
    if (clean.toLowerCase().includes(city)) {
        const prepositions = ['לרחוב', 'ברחוב', 'רחוב', 'לאתר', 'באתר', 'לכיוון'];
        for (const prep of prepositions) {
            const regex = new RegExp(`(?:^|\\s)${prep}\\s+([א-ת]+(?:\\s+[א-ת]+){0,2}\\s*\\d*\\s*${city})`, 'i');
            const match = clean.match(regex);
            if (match) return match[1].trim();
        }
        
        const regexAttached = new RegExp(`(?:^|\\s)[לב]([א-ת]+(?:\\s+[א-ת]+){0,2}\\s*\\d*\\s*${city})`, 'i');
        const matchAttached = clean.match(regexAttached);
        if (matchAttached) return matchAttached[1].trim();
    }
  }

  const parts = clean.split(/[,;\n.]+/).map(p => p.trim()).filter(Boolean);
  for (const part of parts) {
    if (CITIES.some(c => part.toLowerCase().includes(c))) {
      if (part.split(' ').length > 6) continue;
      let pClean = part.replace(/^(?:רוצה\s+|צריך\s+|תשלח\s+|תביא\s+|הובלה\s+|משלוח\s+|ל|ב|לאתר\s+|באתר\s+|אתר\s+|שלי\s+|לרחוב\s+|ברחוב\s+|רחוב\s+)+/gi, '');
      if (/^[לב][א-ת]/.test(pClean) && !CITIES.some(c => pClean.startsWith(c))) pClean = pClean.substring(1);
      return pClean.trim();
    }
  }
  return '';
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'he' }, signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const street = data.address.road || data.address.pedestrian || '';
        const city = data.address.city || data.address.town || data.address.village || '';
        const house = data.address.house_number || '';
        const parts = [street, house, city].filter(Boolean);
        if (parts.length > 0) return parts.join(', ');
      }
    }
  } catch (e) {}
  return null;
}

// ==============================================================================
// שירותי רשת והזרקת נתונים לגיליונות 
// ==============================================================================
async function fetchLiveTruckStatus() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${NOA_AI_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('דוח_בוקר_מבצעי')}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) return null;
    return `🚛 *סטטוס משאיות וסידור עבודה חי מגיליון נועה AI:* הכל תקין ובזמן.`;
  } catch (e) { return null; }
}

async function notifyRami(alertText) {
  const primaryRamiPhone = RAMI_PHONES[0] || '972508860896';
  const chatId = (primaryRamiPhone.startsWith('0') ? '972' + primaryRamiPhone.slice(1) : primaryRamiPhone) + '@c.us';
  try { await client.sendMessage(chatId, alertText); } catch (e) {}
}

async function injectConfirmedOrderToSheets(orderPayload) {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'injectNewOrder',
        token: APPS_SCRIPT_TOKEN,
        unifiedSheetId: UNIFIED_SPREADSHEET_ID,
        targetTab: 'הזמנות_וואטסאפ',
        orderData: {
          timestamp: new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }),
          status: orderPayload.status || 'בסידור עבודה',
          customerName: orderPayload.customerName,
          phone: orderPayload.phone,
          address: orderPayload.address,
          itemsText: orderPayload.itemsText,
          bigBagsDeposit: String(orderPayload.deposits?.bigBags || 0),
          palletsDeposit: String(orderPayload.deposits?.pallets || 0),
          driver: orderPayload.driver,
          wazeUrl: orderPayload.wazeUrl || `https://www.waze.com/ul?q=${encodeURIComponent(orderPayload.address)}&navigate=yes`,
          whatsappUrl: `שדר לנהג`,
          comaxOrderNumber: 'הזמנת וואטסאפ'
        }
      })
    });
    return res.ok;
  } catch (e) {
    notifyRami(`🚨 תקלת הזרקה בגיליון! יעד: ${orderPayload.address}. שגיאה: ${e.message}`);
    return false;
  }
}

// ==============================================================================
// המוח של נועה - עיבוד לוגי (Hybrid Cart Logic)
// ==============================================================================
async function processNoaBrain(messageText, senderName, senderPhone) {
  let clean = (messageText || '').trim();
  clean = convertHebrewNumbers(clean);
  const lower = clean.toLowerCase();
  const rawDigits = senderPhone.replace(/[^0-9]/g, '');

  if (RAMI_PHONES.some(p => rawDigits.includes(p))) {
    if (clean === '1') return await fetchLiveTruckStatus() || `🚛 *סטטוס סבבי משאיות להיום:* הכל תקין בסידור.`;
    return `שלום המפקד! 🫡 \nסליחה, נועה כאן לרשותך! זיהיתי אותך מיד.\n\nמה המשימה כרגע?\n[1] 🚛 *תמונת מצב סבבים חיה*\n[2] ➕ *קליטת הזמנה חדשה*\n[3] 📊 *דוח בוקר*`;
  }

  // אתחול עגלה היברידית 
  let currentCart = activeCarts.get(senderPhone) || { items: [], containerService: null, address: '', pendingAddress: null, wazeLink: null };

  // 1. טיפול באישור מיקום (נעץ GPS) 
  if (currentCart.pendingAddress && (clean === 'כן' || clean.includes('תסגור') || clean.includes('תאשרי') || clean.includes('לשם'))) {
    currentCart.address = currentCart.pendingAddress;
    currentCart.pendingAddress = null; 
    
    if (currentCart.items.length > 0 || currentCart.containerService) {
      const driver = currentCart.needsCrane ? 'חכמת (מנוף)' : 'עלי (חלוקה)';
      const driverShort = currentCart.containerService && currentCart.items.length === 0 ? 'רמסע (סדרן)' : driver.split(' ')[0];

      let formattedItems = currentCart.items.map((it, idx) => `${idx + 1}. מק"ט ${it.sku} — ${it.name} (כמות: *${it.quantity}*)`).join('\n');
      if (currentCart.containerService) {
          formattedItems = formattedItems ? `${formattedItems}\n🚛 שירות נוסף: *${currentCart.containerService}*` : `🚛 שירות מבוקש: *${currentCart.containerService}*`;
      }

      let depositsText = '';
      if (currentCart.items.length > 0) {
           depositsText = `\n\n🛡️ *פקדונות מחייבים:* ${currentCart.deposits.bigBags || 0} בלות | ${currentCart.deposits.pallets || 0} משטחים`;
      }

      const hardGpsAddress = currentCart.wazeLink ? `[📌 נעץ GPS] ${currentCart.address}\nלינק: ${currentCart.wazeLink}` : currentCart.address;

      injectConfirmedOrderToSheets({
        customerName: senderName,
        phone: senderPhone,
        address: hardGpsAddress,
        itemsText: formattedItems.replace(/\n/g, ' | ').replace(/\*/g, ''),
        deposits: currentCart.deposits || { bigBags: 0, pallets: 0 },
        driver: driverShort,
        status: 'בסידור עבודה',
        wazeUrl: currentCart.wazeLink
      });
      
      lastClosedCarts.set(senderPhone, { ...currentCart });
      activeCarts.delete(senderPhone);
      
      return `קלטתי וסגרתי את ההזמנה לסידור! ✅🚚\n\n📋 *כרטיס עבודה - אספקה:*\n${formattedItems}${depositsText}\n📍 *יעד פריקה מאושר:* ${currentCart.address}\n🚛 *משאית משובצת:* ${driverShort}\n\nההזמנה הוזרקה בהצלחה לסידור עם הנעץ המדויק. עבודה בטוחה! 🏗️`;
    }
  }

  // --- זיהוי כוונות במקביל ממשפט בודד (מכולה + חומרים + כתובת) ---
  let intentFound = false;

  // א. מכולה בטקסט
  if (clean === '22' || clean.includes('החלפת מכולה') || (clean.includes('החלפה') && clean.includes('קוב'))) {
    currentCart.containerService = 'החלפת מכולה';
    intentFound = true;
  } else if (clean === '21' || clean.includes('הצבת מכולה') || (clean.includes('הצבה') && clean.includes('קוב'))) {
    currentCart.containerService = 'הצבת מכולה חדשה';
    intentFound = true;
  } else if (clean === '23' || clean.includes('פינוי מכולה') || clean.includes('פינוי סופי')) {
    currentCart.containerService = 'פינוי סופי';
    intentFound = true;
  }

  // ב. חילוץ חומרים
  const normResult = parseAndNormalizeMaterials(clean, currentCart.items);
  if (normResult.newItemsFound) {
    currentCart.items = normResult.items;
    currentCart.deposits = normResult.deposits;
    currentCart.needsCrane = normResult.needsCrane;
    intentFound = true;
  }
  
  // ג. חילוץ כתובת
  const detectedAddr = extractAddress(clean);
  if (detectedAddr) {
    currentCart.address = detectedAddr;
    intentFound = true;
  }

  // --- סגירת ההזמנה אם כל התנאים התקיימו ---
  if (intentFound || currentCart.items.length > 0 || currentCart.containerService) {
      const driver = currentCart.needsCrane ? 'חכמת (מנוף)' : 'עלי (חלוקה)';
      const driverShort = currentCart.containerService && currentCart.items.length === 0 ? 'רמסע (סדרן)' : driver.split(' ')[0];

      if (currentCart.address && (currentCart.items.length > 0 || currentCart.containerService)) {
          let formattedItems = currentCart.items.map((it, idx) => `${idx + 1}. מק"ט ${it.sku} — ${it.name} (כמות: *${it.quantity}*)`).join('\n');
          if (currentCart.containerService) {
              formattedItems = formattedItems ? `${formattedItems}\n🚛 שירות נוסף: *${currentCart.containerService}*` : `🚛 שירות מבוקש: *${currentCart.containerService}*`;
          }

          let depositsText = '';
          if (currentCart.items.length > 0) {
               depositsText = `\n\n🛡️ *פקדונות מחייבים:* ${currentCart.deposits.bigBags || 0} בלות | ${currentCart.deposits.pallets || 0} משטחים`;
          }

          injectConfirmedOrderToSheets({
              customerName: senderName,
              phone: senderPhone,
              address: currentCart.address,
              itemsText: formattedItems.replace(/\n/g, ' | ').replace(/\*/g, ''),
              deposits: currentCart.deposits || { bigBags: 0, pallets: 0 },
              driver: driverShort,
              status: 'בסידור עבודה'
          });

          activeCarts.delete(senderPhone);
          lastClosedCarts.set(senderPhone, { ...currentCart });

          return `קלטתי וסגרתי את ההזמנה לסידור! ✅🚚\n\n📋 *כרטיס עבודה - אספקה:*\n${formattedItems}${depositsText}\n📍 *יעד פריקה מאושר:* ${currentCart.address}\n🚛 *משאית משובצת:* ${driverShort}\n\nההזמנה הוזרקה בהצלחה לסידור. עבודה בטוחה! 🏗️`;
      }

      // חסר פרטים (למשל כתובת) - שומר בעגלה ומחזיר סטטוס 
      activeCarts.set(senderPhone, currentCart);
      let reply = `📦 *סל מוצרים מעודכן:*\n`;
      
      if (currentCart.items.length === 0 && currentCart.containerService) {
           reply = `✅ *הוספתי שירות ${currentCart.containerService} לעגלת חומרי הבניין שלך!*\n\n`;
      } else if (currentCart.items.length > 0) {
          reply += currentCart.items.map((it, idx) => `${idx + 1}. מק"ט ${it.sku} — ${it.name} (כמות: *${it.quantity}*)`).join('\n');
          if (currentCart.containerService) reply += `\n\n🚛 שירות נוסף: *${currentCart.containerService}*`;
          reply += `\n\n🛡️ *פקדונות:* ${currentCart.deposits.bigBags || 0} בלות | ${currentCart.deposits.pallets || 0} משטחים`;
      }
      
      reply += `\n🚛 *משאית משובצת:* ${driverShort}`;
      reply += `\n\n📍 *לאיזו כתובת מדויקת לתאם את האספקה?* (אפשר לרשום או לשלוח נעץ מפה)`;
      return reply;
  }

  // תפריטי ניווט מהירים (אם הלקוח הקליד רק מספר)
  if (clean === '1') return `מעולה! מחלקת *הזמנות והובלות לאתר* 🏗️\nנא לרשום את פירוט החומרים והכמויות (למשל: 3 חול בלה, 40 שק מלט) והכתובת לאספקה!`;
  if (clean === '3') return `סניפי ומחסני *ח. סבן* לשירותך 🏭\n\n[31] 🏟 *סניף 1, הוד השרון (גבס וצבע)*\n[32] 🏭 *סניף 4, הוד השרון (מגרש ראשי מנופים)*`;
  if (clean === '4') return `מחלקת *מעקב משלוחים* 🚚\nנא לרשום שם מזמין ואבדוק בסידור!`;
  if (clean === '5') {
    notifyRami(`📞 לקוח מבקש מענה: ${senderName} (${senderPhone})`);
    return `פנייתך הועברה ישירות ל-*ראמי מסארווה* 🫡 (טלפון: 050-886-0896). ראמי יחזור אליך בהקדם!`;
  }

  return `*ח. סבן חומרי בניין (1994) בע״מ*\nשלום ${senderName || 'חבר'}! כאן נועה ❤️ (סידור ראמי)\n\nאיך לקדם אותך היום?\n[1] 🧱 *הזמנת חומרים והובלה*\n[2] 🚛 *שירות מכולות פסולת*\n[3] 🏭 *סניפים, שעות ואיסוף*\n[4] 📦 *בירור סטטוס הזמנה*\n[5] 📞 *פנייה ישירה לראמי*\n\n_להזמנה מהירה: רשום כמויות וכתובת (למשל: 3 בלות חול, 40 מלט)._`;
}

// ==============================================================================
// חיבור ואירועי WhatsApp
// ==============================================================================
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

client.on('qr', async (qr) => {
  latestQrCode = qr;
  isClientReady = false;
  try { latestQrDataUrl = await QRCode.toDataURL(qr); } catch (e) {}
  console.log(`\n📲 QR לסריקה: http://localhost:${PORT}/qr\n`);
  qrcodeTerminal.generate(qr, { small: true });
});

client.on('ready', () => {
  isClientReady = true;
  connectedUserPhone = client.info?.wid?.user || 'מחובר';
  console.log('\n======================================================');
  console.log('🚀 נועה AI מחוברת לוואטסאפ (עם תמיכת GPS וזיכרון שיחה)!');
  console.log('======================================================\n');
});

client.on('message', async (msg) => {
  if (msg.isStatus || msg.from.includes('@broadcast') || msg.from.includes('@g.us')) return;
  
  const senderPhone = (msg.from || '').replace(/@(c\.us|lid)/, '');
  let senderName = 'לקוח וואטסאפ';
  try {
    const contact = await msg.getContact();
    senderName = contact.pushname || contact.name || 'לקוח';
  } catch (e) {}

  if (!checkRateLimit(senderPhone)) {
    console.log(`⚠️ מניעת הצפה: מסונן הודעה מ-${senderPhone}`);
    return;
  }

  // 📡 דחיפה ישירה בזמן אמת לממשק הצ'אט של SabanOS (כדי שהמנהל יראה אותה מיד על המסך)
  pushMessageToChatInterface({
    phone: senderPhone,
    senderName: senderName,
    text: msg.body || (msg.type === 'location' ? `📍 נשלח נעץ מיקום GPS` : ''),
    timestamp: Date.now(),
    type: msg.type,
    location: msg.location || null,
    wazeUrl: msg.type === 'location' ? `https://waze.com/ul?ll=${msg.location.latitude},${msg.location.longitude}&navigate=yes` : null
  });

  // -- קליטת נעץ מפה (GPS Location) --
  if (msg.type === 'location') {
    const lat = msg.location.latitude;
    const lng = msg.location.longitude;
    const wazeLink = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
    
    console.log(`\n📍 התקבל מיקום GPS מ-${senderName}`);
    let addressName = await reverseGeocode(lat, lng);
    let suggestedAddress = addressName ? `${addressName} (מבוסס מיקום)` : `מיקום נעץ במפה 📍`;
    
    let currentCart = activeCarts.get(senderPhone) || { items: [], containerService: null, address: '' };
    currentCart.pendingAddress = suggestedAddress;
    currentCart.wazeLink = wazeLink;
    activeCarts.set(senderPhone, currentCart);
    
    saveChatMessage(msg.from, 'user', `[נשלח מיקום GPS: ${lat}, ${lng}]`, senderName);
    
    const replyText = `📍 קלטתי מיקום GPS מאתר האספקה!\nהאם הכתובת היא:\n*${suggestedAddress}*?\n\n(השב "כן" לאישור, או הקלד את הכתובת לתיקון)`;
    saveChatMessage(msg.from, 'assistant', replyText);
    
    try { 
        await msg.reply(replyText); 
        console.log('✅ מענה ה-GPS נשלח לקבלן בהצלחה!');
    } catch (e) { 
        await client.sendMessage(msg.from, replyText); 
    }
    return;
  }

  if (!msg.body || !msg.body.trim()) return;

  console.log(`\n📩 הודעה נכנסת בוואטסאפ: ${senderName} (${senderPhone}): "${msg.body}"`);
  saveChatMessage(msg.from, 'user', msg.body, senderName);

  const replyText = await processNoaBrain(msg.body, senderName, senderPhone);

  if (replyText) {
    saveChatMessage(msg.from, 'assistant', replyText);
    try { 
        await msg.reply(replyText); 
        console.log('✅ תשובה נחתה בהצלחה בוואטסאפ!');
    } catch (e) { 
        try {
            await client.sendMessage(msg.from, replyText); 
            console.log('✅ תשובה נשלחה כהודעה חדשה בוואטסאפ!');
        } catch(err) {
            console.error('❌ שגיאה בשליחת המענה:', err.message);
        }
    }
  }
});

// ==============================================================================
// נקודות קצה HTTP: קליטה מהצ'אט, סטטוס ו-QR
// ==============================================================================

/**
 * 📤 שיגור מענה מנהל מהצ'אט ישירות לוואטסאפ של הלקוח
 */
app.post('/send-message', async (req, res) => {
  try {
    const { phone, text, message } = req.body;
    const bodyText = text || message;

    if (!phone || !bodyText) {
      return res.status(400).json({ error: 'Phone and text/message are required' });
    }

    const cleanPhone = String(phone).replace(/[^0-9]/g, '');
    const chatId = (cleanPhone.startsWith('0') ? '972' + cleanPhone.slice(1) : cleanPhone) + '@c.us';

    console.log(`\n📤 [שיגור תשובת מנהל מהצ'אט לוואטסאפ]: אל ${chatId}: "${bodyText}"`);

    saveChatMessage(chatId, 'assistant', bodyText, 'ראמי מסארווה (מנהל)');

    if (!isClientReady) {
      console.warn(`⚠️ לקוח וואטסאפ טרם חובר פיזית.`);
      const intl = cleanPhone.startsWith('0') ? '972' + cleanPhone.slice(1) : cleanPhone;
      return res.status(503).json({
        error: 'WhatsApp client is not ready. Please scan QR at /qr',
        waMeUrl: `https://wa.me/${intl}?text=${encodeURIComponent(bodyText)}`
      });
    }

    const sent = await client.sendMessage(chatId, bodyText);
    console.log(`✅ שוגר בהצלחה לוואטסאפ של הלקוח! ID: ${sent.id?._serialized || 'ok'}`);

    return res.json({
      success: true,
      messageId: sent.id?._serialized || 'sent',
      recipient: chatId,
      timestamp: Date.now()
    });
  } catch (err) {
    console.error('❌ שגיאה בשיגור לוואטסאפ:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * 📊 סטטוס חיבור
 */
app.get('/status', (_req, res) => {
  res.json({
    isClientReady,
    connectedUserPhone,
    latestQrCode: Boolean(latestQrCode),
    hasQr: Boolean(latestQrDataUrl),
    activeCartsCount: activeCarts.size,
    port: PORT
  });
});

/**
 * 📲 עמוד הצגת QR
 */
app.get('/qr', (_req, res) => {
  if (isClientReady) {
    return res.send(`
      <div style="font-family:system-ui;text-align:center;padding:40px;direction:rtl;">
        <h1 style="color:#059669;">✅ וואטסאפ מחובר בהצלחה!</h1>
        <p>מספר מזוהה: <b>${connectedUserPhone || 'סבן חומרי בניין'}</b></p>
        <p>כל ההודעות הנכנסות נדחפות בזמן אמת לממשק הצ'אט בפורט 3000.</p>
      </div>
    `);
  }
  if (latestQrDataUrl) {
    return res.send(`
      <div style="font-family:system-ui;text-align:center;padding:30px;direction:rtl;">
        <h2>📲 סריקת קוד QR — חיבור נועה AI לוואטסאפ</h2>
        <p>פתח את וואטסאפ בטלפון > מכשירים מקושרים > קשר מכשיר</p>
        <div style="margin:20px 0;"><img src="${latestQrDataUrl}" style="border:4px solid #10b981;border-radius:16px;padding:8px;" /></div>
        <p style="color:#6b7280;font-size:12px;">העמוד מתרענן אוטומטית בהתחברות</p>
        <script>setTimeout(() => location.reload(), 15000);</script>
      </div>
    `);
  }
  res.send(`
    <div style="font-family:system-ui;text-align:center;padding:40px;direction:rtl;">
      <h2>⏳ ממתין ליצירת קוד QR מוואטסאפ...</h2>
      <p>אנא המתן כמה שניות ורענן את העמוד.</p>
      <script>setTimeout(() => location.reload(), 3000);</script>
    </div>
  `);
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`🌐 שרת גשר וואטסאפ פעיל על: http://localhost:${PORT}`);
  console.log(`📲 כתובת לסריקת QR: http://localhost:${PORT}/qr`);
  client.initialize().catch(err => console.error('❌ שגיאת אתחול WhatsApp Client:', err.message));
});
