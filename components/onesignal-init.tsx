"use client"

import { useEffect } from "react"

export function OneSignalInit() {
  useEffect(() => {
    try {
      const hostname = window.location.hostname
      const isAllowedHost =
        hostname === "ai-chat-noa.vercel.app" ||
        hostname === "localhost" ||
        hostname === "127.0.0.1"
      if (!isAllowedHost) return

      ;(window as any).OneSignalDeferred = (window as any).OneSignalDeferred || []
      const script = document.createElement("script")
      script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
      script.defer = true
      document.head.appendChild(script)

      ;(window as any).OneSignalDeferred.push(async function (OneSignal: any) {
        try {
          await OneSignal.init({
            appId: "8f9c9417-530c-41e2-8a65-850d10758258",
            allowLocalhostAsSecureOrigin: true,
            notifyButton: { enable: false },
          })
        } catch {}
      })
    } catch {}
  }, [])

  return null
}
