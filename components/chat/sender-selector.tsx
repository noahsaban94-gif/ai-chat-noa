"use client"

import { useState } from "react"
import { ChevronDown, UserCheck, Phone, ShieldCheck } from "lucide-react"

export interface SenderOption {
  phone: string
  name: string
  role: string
  type: "team" | "client" | "custom"
  emoji: string
}

export const PRESET_SENDERS: SenderOption[] = [
  { phone: "972508860896", name: "ראמי מסארוה", role: "מנהל תפעול וסדרן ראשי", type: "team", emoji: "👑" },
  { phone: "97255227724", name: "הראל אידלסון", role: "מנכ״ל ובעלים", type: "team", emoji: "👔" },
  { phone: "972506662300", name: "ורד אידלסון", role: "מנהלת IT וביקורת", type: "team", emoji: "💻" },
  { phone: "972504482285", name: "איציק זהבי", role: "מנהל סניף 4 החרש (מסחרי)", type: "team", emoji: "🏢" },
  { phone: "972509001392", name: "אורן", role: "מנהל חצר סניף 4 החרש", type: "team", emoji: "🏗️" },
  { phone: "972520000004", name: "תמיר / דורון", role: "מנהלי סניף 1 התלמיד", type: "team", emoji: "🏟️" },
  { phone: "972520000005", name: "חכמת", role: "נהג מנוף מרצדס (615-41-002)", type: "team", emoji: "🚚" },
  { phone: "972520000006", name: "עלי", role: "נהג חלוקה איסוזו (654-51-701)", type: "team", emoji: "🚛" },
  { phone: "972520000008", name: "לינה / גליה", role: "הנהלת חשבונות", type: "team", emoji: "📑" },
  { phone: "050-6620013", name: "זבולון-עדירן (עבד)", role: "לקוח: החורש 21 כפר שמריהו", type: "client", emoji: "📍" },
  { phone: "050-8861080", name: "גלעד קדם", role: "לקוח: מזל דלי 1 הוד השרון", type: "client", emoji: "📍" },
]

interface SenderSelectorProps {
  currentSenderPhone: string
  onSelectSender: (sender: SenderOption) => void
}

export function SenderSelector({ currentSenderPhone, onSelectSender }: SenderSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const active =
    PRESET_SENDERS.find((s) => s.phone === currentSenderPhone) || PRESET_SENDERS[0]

  return (
    <div className="relative inline-block text-right" dir="rtl">
      <button
        id="sender-selector-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100 hover:bg-stone-200/80 text-stone-800 text-xs font-semibold border border-stone-300/80 transition-colors cursor-pointer"
        title="בחירת זהות הפונה לסימולציית שיחה ונרמול"
      >
        <span className="text-xs">{active.emoji}</span>
        <span className="max-w-[85px] sm:max-w-[110px] truncate">{active.name}</span>
        <ChevronDown className="w-3 h-3 text-stone-500 shrink-0" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            id="sender-selector-dropdown"
            className="absolute right-0 top-full mt-1.5 w-64 sm:w-72 bg-white rounded-2xl shadow-xl border border-stone-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-right"
          >
            <div className="px-2.5 py-1.5 text-[11px] font-bold text-stone-500 border-b border-stone-100 flex items-center justify-between">
              <span>זהות השולח להודעות (סימולציה)</span>
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-stone-100 py-1">
              <div className="py-1">
                <div className="px-2 text-[10px] font-bold text-stone-400">צוות סבן:</div>
                {PRESET_SENDERS.filter((s) => s.type === "team").map((sender) => (
                  <button
                    key={sender.phone}
                    type="button"
                    onClick={() => {
                      onSelectSender(sender)
                      setIsOpen(false)
                    }}
                    className={`w-full text-right px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-stone-100 text-xs transition-colors cursor-pointer ${
                      sender.phone === currentSenderPhone ? "bg-emerald-50 text-emerald-900 font-bold" : "text-stone-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span>{sender.emoji}</span>
                      <span className="truncate">{sender.name}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 shrink-0">{sender.role.slice(0, 14)}</span>
                  </button>
                ))}
              </div>

              <div className="py-1">
                <div className="px-2 text-[10px] font-bold text-stone-400">לקוחות ואתרי בנייה:</div>
                {PRESET_SENDERS.filter((s) => s.type === "client").map((sender) => (
                  <button
                    key={sender.phone}
                    type="button"
                    onClick={() => {
                      onSelectSender(sender)
                      setIsOpen(false)
                    }}
                    className={`w-full text-right px-2 py-1.5 rounded-lg flex items-center justify-between hover:bg-stone-100 text-xs transition-colors cursor-pointer ${
                      sender.phone === currentSenderPhone ? "bg-blue-50 text-blue-900 font-bold" : "text-stone-700"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span>{sender.emoji}</span>
                      <span className="truncate">{sender.name}</span>
                    </div>
                    <span className="text-[10px] text-stone-400 shrink-0">{sender.phone}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
