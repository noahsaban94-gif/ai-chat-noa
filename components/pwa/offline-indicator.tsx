"use client"

import React from "react"
import { useOnlineStatus } from "@/hooks/use-online-status"
import { WifiOff } from "lucide-react"

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-600/95 backdrop-blur-md px-4 py-2 text-xs font-semibold text-white shadow-lg border border-amber-400/40 animate-in fade-in slide-in-from-bottom-3 duration-200"
      dir="rtl"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0 animate-pulse text-amber-200" />
      <span>מצב לא מקוון — המערכת ממתינה לחיבור רשת...</span>
    </div>
  )
}
