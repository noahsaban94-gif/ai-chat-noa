"use client"

import React, { useState, useEffect } from "react"
import { usePWAInstall } from "@/hooks/use-pwa-install"
import { Download, Share2, PlusSquare, X } from "lucide-react"

export const PWAInstallButton: React.FC = () => {
  const [mounted, setMounted] = useState(false)
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall()
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Hide on server, during initial hydration, or if already running in standalone PWA mode
  if (!mounted || isInstalled) {
    return null
  }

  // Chromium / Android / Desktop install flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
        title="התקנת אפליקציית נועה AI במכשיר"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">התקנת אפליקציה</span>
        <span className="sm:hidden">התקן</span>
      </button>
    )
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-blue-700 border border-blue-200 text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
          title="התקנת נועה AI באייפון / אייפד"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">התקנה ב-iOS</span>
          <span className="sm:hidden">התקן</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" dir="rtl">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-stone-200 text-right animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  התקנת נועה AI במסך הבית (iPhone / iPad)
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-stone-700 leading-relaxed font-medium">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    1
                  </div>
                  <div>
                    לחץ על כפתור <strong>השיתוף (Share)</strong> <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-600" /> בסרגל הכלים של דפדפן Safari בתחתית המסך.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    2
                  </div>
                  <div>
                    גלול מעט מטה ולחץ על <strong>״הוסף למסך הבית״ (Add to Home Screen)</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-600" />.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    3
                  </div>
                  <div>
                    לחץ על <strong>״הוסף״ (Add)</strong> בפינה העליונה — ונועה AI תופיע כאפליקציה עצמאית ומהירה במסך המכשיר שלך!
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition cursor-pointer"
              >
                הבנתי, תודה
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return null
}
