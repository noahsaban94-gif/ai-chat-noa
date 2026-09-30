"use client"

// ╔══════════════════════════════════════════════════════════════════╗
// ║  🚀 סימולציית טיסה פעילה ב-Canvas — VisualBranchBuilder          ║
// ╚══════════════════════════════════════════════════════════════════╝

import React, { useState, useRef } from "react"
import { NoaCanvasCompanion } from "./NoaCanvasCompanion"
import { Sparkles, X } from "lucide-react"

interface CanvasFlightSimulationProps {
  onClose?: () => void
}

export const CanvasFlightSimulation: React.FC<CanvasFlightSimulationProps> = ({ onClose }) => {
  // מיקום מדמה של כרטיס יעד על ה-Canvas (למשל: כרטיס הזמנה #20419)
  const [targetCoords, setTargetCoords] = useState<{ x: number; y: number } | null>(null)
  const [isFlying, setIsFlying] = useState(false)
  const [cardStatus, setCardStatus] = useState<"idle" | "updated">("idle")
  const cardRef = useRef<HTMLDivElement>(null)

  // הפעלת סימולציית הטיסה אל כרטיס היעד
  const triggerSimulation = () => {
    // הגדרת קואורדינטות היעד על המסך - חישוב מיקום חי ומדויק לפי הכרטיס
    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect()
      setTargetCoords({ x: rect.left + rect.width / 2, y: rect.top + 30 })
    } else {
      setTargetCoords({ x: 450, y: 280 })
    }
    setIsFlying(true)
    setCardStatus("idle")
  }

  return (
    <div
      className="relative w-full h-[400px] bg-slate-900 rounded-2xl border border-cyan-500/30 p-6 overflow-hidden flex flex-col justify-between shadow-2xl text-right rtl"
      dir="rtl"
    >
      {/* כותרת הסימולציה */}
      <div className="flex items-center justify-between z-10">
        <div>
          <h3 className="text-cyan-300 font-bold text-lg flex items-center gap-2">
            <span>✨ בונה הענפים — סימולציית טיסה</span>
            <span className="text-red-500 text-xs">❤️</span>
          </h3>
          <p className="text-slate-400 text-xs">מעקב אחרי מנוע הטיסה והתעדכנות כרטיסים בזמן אמת (סגנון Maia)</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={triggerSimulation}
            disabled={isFlying}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-cyan-500/30 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isFlying ? "נועה בטיסה ליעד... 🛸" : "🚀 הפעל טיסת נועה לכרטיס"}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
              aria-label="סגירת סימולציה"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* אזור ה-Canvas וכרטיס היעד המדומה */}
      <div className="relative flex-1 flex items-center justify-center">
        <div
          ref={cardRef}
          style={{ transform: "translate(150px, 40px)" }}
          className={`w-72 p-4 rounded-xl border transition-all duration-500 ${
            cardStatus === "updated"
              ? "bg-cyan-950/80 border-cyan-400 ring-4 ring-cyan-400/50 shadow-cyan-500/30 shadow-2xl scale-105"
              : "bg-slate-800/80 border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-cyan-400">#comax_20419</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                cardStatus === "updated" ? "bg-cyan-500/20 text-cyan-300" : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {cardStatus === "updated" ? "✅ עודכן בהצלחה" : "⏳ ממתין לעדכון"}
            </span>
          </div>
          <h4 className="text-white font-semibold text-sm">לי-רן יזום והשקעות / מוצקין 22</h4>
          <p className="text-slate-400 text-xs mt-1">מוצרי גמר ואספקה טכנית (סניף 1 התלמיד)</p>
          <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-400">
            <span>מלקט: שי (דלפק)</span>
            <span className="text-cyan-400">ח. סבן (1994) בע״מ</span>
          </div>
        </div>
      </div>

      {/* דמות נועה המונפשת (רצה על ה-Canvas) */}
      <NoaCanvasCompanion
        targetPosition={targetCoords}
        isFlying={isFlying}
        onArrival={() => {
          setIsFlying(false)
          setCardStatus("updated") // עדכון הכרטיס עם הגעת נועה
        }}
      />
    </div>
  )
}
