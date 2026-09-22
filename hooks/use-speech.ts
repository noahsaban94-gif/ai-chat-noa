"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { cleanTextForSpeech, speakWithBrowserSynthesis } from "@/lib/speech-service"

export function useSpeech() {
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [autoSpeakEnabled, setAutoSpeakEnabled] = useState(false)

  const activeAudioRef = useRef<HTMLAudioElement | null>(null)
  const cancelSpeechRef = useRef<(() => void) | null>(null)

  // Load auto speak preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("noa_auto_speak_enabled")
      if (saved !== null) {
        setAutoSpeakEnabled(saved === "true")
      }
    } catch {}
  }, [])

  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeakEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem("noa_auto_speak_enabled", String(next))
      } catch {}
      return next
    })
  }, [])

  const stop = useCallback(() => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause()
      activeAudioRef.current.currentTime = 0
      activeAudioRef.current = null
    }

    if (cancelSpeechRef.current) {
      cancelSpeechRef.current()
      cancelSpeechRef.current = null
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel()
    }

    setSpeakingMessageId(null)
    setIsLoading(false)
  }, [])

  const speak = useCallback(
    async (messageId: string, text: string) => {
      // If already playing this message, clicking again toggles it off
      if (speakingMessageId === messageId) {
        stop()
        return
      }

      stop()

      const cleaned = cleanTextForSpeech(text)
      if (!cleaned) return

      setSpeakingMessageId(messageId)
      setIsLoading(true)

      try {
        // Attempt 1: High-fidelity Server-side Gemini AI TTS
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: cleaned }),
        })

        if (!res.ok) {
          throw new Error(`TTS server responded with ${res.status}`)
        }

        const audioBlob = await res.blob()
        if (audioBlob.size < 500) {
          throw new Error("Audio blob too small or empty")
        }

        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)
        activeAudioRef.current = audio

        audio.oncanplaythrough = () => {
          setIsLoading(false)
        }

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          activeAudioRef.current = null
          setSpeakingMessageId(null)
          setIsLoading(false)
        }

        audio.onerror = (e) => {
          console.warn("Audio playback error, falling back to browser synthesis:", e)
          URL.revokeObjectURL(audioUrl)
          activeAudioRef.current = null
          // Fallback to browser synthesis
          fallbackToBrowser(messageId, cleaned)
        }

        await audio.play()
        setIsLoading(false)
      } catch (err) {
        console.info("Using native Hebrew female speech synthesis fallback:", err)
        fallbackToBrowser(messageId, cleaned)
      }
    },
    [speakingMessageId, stop],
  )

  const fallbackToBrowser = useCallback((messageId: string, text: string) => {
    setIsLoading(false)
    setSpeakingMessageId(messageId)

    const cancel = speakWithBrowserSynthesis(
      text,
      () => {
        setSpeakingMessageId((current) => (current === messageId ? null : current))
        cancelSpeechRef.current = null
      },
      () => {
        setSpeakingMessageId((current) => (current === messageId ? null : current))
        cancelSpeechRef.current = null
      },
    )
    cancelSpeechRef.current = cancel
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return {
    speakingMessageId,
    isLoading,
    autoSpeakEnabled,
    speak,
    stop,
    toggleAutoSpeak,
  }
}
