"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  MessageSquare,
  Sparkles,
  Send,
  Copy,
  Check,
  ExternalLink,
  RotateCcw,
  Package,
  Truck,
  Building2,
  PhoneCall,
  X,
  Code2,
  CheckCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { audioService } from "@/lib/audio-service"
import type { WhatsAppBranchType, WhatsAppReplyResponse } from "@/app/api/whatsapp-reply/route"

interface WhatsAppReplySimulatorProps {
  isOpen: boolean
  onClose: () => void
  onFlyToBranch?: (branchId: string, branchName: string) => void
}

const PRESET_QUERIES = [
  {
    branch: "materials" as WhatsAppBranchType,
    label: "🏗️ ענף 1: הזמנת חומרים",
    name: "איציק קבלן שלד",
    phone: "054-8891234",
    text: "שלום, צריך מחר על הבוקר 3 בלות חול ומשטח מלט לאתר ברחוב הבנים 12 ברעננה. יש לכם מנוף פנוי?",
    targetNodeId: "node-branch-materials",
  },
  {
    branch: "containers" as WhatsAppBranchType,
    label: "🚛 ענף 2: מכולות פסולת",
    name: "מוטי שיפוצים",
    phone: "052-7765432",
    text: "היי נועה, המכולה באתר בפתח תקווה מלאה לגמרי, אפשר להביא מכולה 8 קוב חדשה ולהוציא את הישנה?",
    targetNodeId: "node-branch-containers",
  },
  {
    branch: "pickup" as WhatsAppBranchType,
    label: "🏬 ענף 3: איסוף עצמי",
    name: "דני אינסטלציה",
    phone: "050-3344556",
    text: "אהלן נועה, אתם פתוחים עכשיו בחצר בכפר ברא? אפשר להגיע עם הטנדר לקחת 5 שקים של טיט ומלט?",
    targetNodeId: "node-branch-pickup",
  },
  {
    branch: "pricing" as WhatsAppBranchType,
    label: "💰 ענף 4: שאלת מחיר",
    name: "עופר יזמות",
    phone: "053-9988776",
    text: "כמה עולה בלה סומסום כולל הובלת מנוף להרצליה? תעשו לי מחיר מיוחד לכמויות גדולות",
    targetNodeId: "node-branch-pricing",
  },
]

export function WhatsAppReplySimulator({ isOpen, onClose, onFlyToBranch }: WhatsAppReplySimulatorProps) {
  const [clientName, setClientName] = useState("איציק קבלן שלד")
  const [clientPhone, setClientPhone] = useState("054-8891234")
  const [clientText, setClientText] = useState(PRESET_QUERIES[0].text)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedResult, setGeneratedResult] = useState<WhatsAppReplyResponse | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [showPromptCode, setShowPromptCode] = useState(false)
  const [isPushingLive, setIsPushingLive] = useState(false)

  const handlePushLiveToChat = async () => {
    if (!clientText.trim()) return
    setIsPushingLive(true)
    audioService.playClick()
    try {
      const res = await fetch("/api/whatsapp/incoming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: clientPhone || "054-8891234",
          senderName: clientName || "לקוח וואטסאפ",
          text: clientText,
        }),
      })
      if (res.ok) {
        audioService.playSuccess()
        onClose()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsPushingLive(false)
    }
  }

  if (!isOpen) return null

  const handleApplyPreset = (preset: (typeof PRESET_QUERIES)[0]) => {
    setClientName(preset.name)
    setClientPhone(preset.phone)
    setClientText(preset.text)
    audioService.playClick()
  }

  const handleGenerate = async () => {
    if (!clientText.trim() || isGenerating) return

    setIsGenerating(true)
    audioService.playFlyMagic()

    try {
      const res = await fetch("/api/whatsapp-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: clientName,
          from: clientPhone,
          text: clientText,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to generate WhatsApp reply")
      }

      const data: WhatsAppReplyResponse = await res.json()
      setGeneratedResult(data)

      // trigger companion flight on the canvas!
      if (onFlyToBranch && data.targetNodeId) {
        onFlyToBranch(data.targetNodeId, data.branchName)
      } else {
        audioService.playMagicSpark()
      }
    } catch (err) {
      console.error("Error generating WhatsApp reply:", err)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = () => {
    if (!generatedResult?.reply) return
    navigator.clipboard.writeText(generatedResult.reply)
    setIsCopied(true)
    audioService.playClick()
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleOpenWhatsApp = () => {
    if (!generatedResult?.reply) return
    const textEncoded = encodeURIComponent(generatedResult.reply)
    const cleanPhone = clientPhone.replace(/\D/g, "")
    const targetUrl = cleanPhone
      ? `https://wa.me/972${cleanPhone.replace(/^0/, "")}?text=${textEncoded}`
      : `https://wa.me/?text=${textEncoded}`
    window.open(targetUrl, "_blank")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md text-right rtl overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="relative w-full max-w-2xl bg-stone-900 border border-cyan-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 bg-gradient-to-r from-emerald-950/40 via-stone-900 to-cyan-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-stone-950 font-bold">
              <MessageSquare className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-100">סימולטור מענה וואטסאפ — נועה AI</h2>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                  4 ענפי הליבה
                </Badge>
              </div>
              <p className="text-xs text-stone-400">
                מענה מקצועי, מצומצם ומעוצב עם כוכביות הדגשה (*...*) ואימוג'ים מותאמים
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Preset Buttons */}
          <div>
            <Label className="text-xs text-stone-400 mb-1.5 block">בחר תרחיש פנייה מהיר (קבלנים):</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_QUERIES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="p-2 text-right rounded-xl bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700 text-[11px] font-medium text-stone-200 transition-colors flex flex-col justify-between cursor-pointer"
                >
                  <span className="font-semibold text-cyan-300">{preset.label}</span>
                  <span className="text-[10px] text-stone-400 truncate mt-1">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields: Name, Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-stone-300 mb-1 block">שם הלקוח / איש קשר ({"{{1.name}}"}):</Label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="לדוגמה: איציק קבלן שלד"
                className="bg-stone-950/70 border-stone-700 text-stone-100 text-sm h-9 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs text-stone-300 mb-1 block">טלפון פנייה ({"{{1.from}}"}):</Label>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="054-1234567"
                className="bg-stone-950/70 border-stone-700 text-stone-100 text-sm h-9 rounded-xl font-mono text-left"
                dir="ltr"
              />
            </div>
          </div>

          {/* Incoming Message Text */}
          <div>
            <Label className="text-xs text-stone-300 mb-1 block">הודעה שהתקבלה מוואטסאפ ({"{{1.text}}"}):</Label>
            <Textarea
              value={clientText}
              onChange={(e) => setClientText(e.target.value)}
              placeholder="כתוב את ההודעה שהתקבלה מהקבלן..."
              rows={3}
              className="bg-stone-950/70 border-stone-700 text-stone-100 text-sm rounded-xl resize-none"
            />
          </div>

          {/* Action Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !clientText.trim()}
              className="flex-1 h-10 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-stone-950 font-bold text-sm shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <div className="flex items-center gap-2 text-stone-950">
                  <Sparkles className="w-4 h-4 animate-spin text-stone-950" />
                  <span>נועה בודקת ומנתבת בענפים... 🛸</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-stone-950">
                  <Sparkles className="w-4 h-4 text-stone-950" />
                  <span>צור מענה מותאם לוואטסאפ (נועה AI) ✨</span>
                </div>
              )}
            </Button>

            <Button
              onClick={handlePushLiveToChat}
              disabled={isPushingLive || !clientText.trim()}
              variant="outline"
              className="h-10 px-3 rounded-xl border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              title="דחוף הודעה זו בזמן אמת לצ'אט — תופיע מיד בצד שמאל!"
            >
              <Send className="w-3.5 h-3.5" />
              <span>דחוף לצ'אט חי (Push) ⚡</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowPromptCode(!showPromptCode)}
              className="w-10 h-10 rounded-xl border-stone-700 text-stone-400 hover:text-stone-100 hover:bg-stone-800 shrink-0"
              title="הצג פרומפט רשמי ל-Make.com / Webhook"
            >
              <Code2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Make.com Prompt Code View Toggle */}
          <AnimatePresence>
            {showPromptCode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 text-xs font-mono text-cyan-300/90 whitespace-pre-wrap leading-relaxed">
                  <div className="flex items-center justify-between text-[11px] text-stone-400 pb-2 border-b border-stone-800 mb-2 font-sans">
                    <span>תבנית פרומפט ל-Make.com / Webhook:</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (generatedResult?.rawPromptUsed) {
                          navigator.clipboard.writeText(generatedResult.rawPromptUsed)
                          setIsCopied(true)
                          setTimeout(() => setIsCopied(false), 2000)
                        }
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold"
                    >
                      העתק תבנית
                    </button>
                  </div>
                  {generatedResult?.rawPromptUsed ||
                    `אתה נועה AI — מנהלת הסידור והשירות של "ח. סבן חומרי בניין (1994) בע״מ" ויד ימינו של ראמי מסארווה.

פרטי הפנייה הנכנסת:
- שם הלקוח: {{1.name}}
- טלפון: {{1.from}}
- הודעה שהתקבלה: "{{1.text}}"

פעל לפי 4 ענפי הליבה...`}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generated Result: WhatsApp Message Preview Card */}
          {generatedResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 pt-2 border-t border-stone-800"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <span>ענף ליבה מזוהה: {generatedResult.branchName}</span>
                </span>
                <span className="text-[10px] text-stone-400">תצוגה מקדימה כהודעת וואטסאפ</span>
              </div>

              {/* Realistic WhatsApp Chat Bubble Container */}
              <div
                className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 shadow-inner relative"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.05) 0%, transparent 80%)`,
                }}
              >
                {/* Simulated WhatsApp incoming message banner */}
                <div className="mb-3 text-[11px] text-stone-400 bg-stone-900/80 p-2 rounded-xl border border-stone-800 flex items-center justify-between">
                  <span>פנייה מאת: {clientName} ({clientPhone})</span>
                  <span className="text-stone-500">{new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>

                {/* WhatsApp Outgoing Message Bubble (Green) */}
                <div className="bg-[#005c4b] text-white p-3.5 rounded-2xl rounded-tr-none shadow-md max-w-full text-sm leading-relaxed whitespace-pre-wrap select-text">
                  {generatedResult.reply}
                  <div className="mt-2 pt-1 flex items-center justify-end gap-1 text-[10px] text-emerald-200/70">
                    <span>{new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}</span>
                    <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                  </div>
                </div>
              </div>

              {/* Footer Action Buttons */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="flex-1 h-9 rounded-xl border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40 font-medium text-xs cursor-pointer"
                >
                  {isCopied ? (
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <Check className="w-3.5 h-3.5" />
                      <span>הועתק ללוח!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Copy className="w-3.5 h-3.5" />
                      <span>העתק מענה לוואטסאפ</span>
                    </div>
                  )}
                </Button>

                <Button
                  onClick={handleOpenWhatsApp}
                  className="flex-1 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>פתח ישירות ב-WhatsApp</span>
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
