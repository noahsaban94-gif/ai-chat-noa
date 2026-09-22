"use client"

import { useEffect, useState } from "react"

export function useOnlineStatus() {
  // Always initialize to true on initial render to prevent SSR hydration mismatch
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Sync with actual client navigator after component mounts
    if (typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine)
    }

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}
