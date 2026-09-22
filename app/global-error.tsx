"use client"

import React from "react"

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="he" dir="rtl">
      <body className="font-sans antialiased bg-stone-50 text-stone-900 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-white rounded-2xl border border-stone-200 shadow-sm text-center space-y-4">
          <h2 className="text-lg font-bold text-stone-800">התרחשה שגיאה בלתי צפויה</h2>
          <p className="text-sm text-stone-500">
            חלה שגיאה בטעינת המערכת. ניתן לנסות לטעון שוב או לרענן את העמוד.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-semibold hover:bg-stone-800 cursor-pointer"
          >
            טען מחדש
          </button>
        </div>
      </body>
    </html>
  )
}
