"use client"

import { useEffect, useRef, useState } from "react"
import { MessageBubble } from "./message-bubble"
import type { Message } from "./chat-shell"
import { TypingIndicator } from "./typing-indicator"
import { AlertCircle, RefreshCw, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedOrb } from "./animated-orb"

interface MessageListProps {
  messages: Message[]
  isStreaming: boolean
  error: string | null
  onRetry: () => void
  isLoaded: boolean // Added isLoaded prop to know when localStorage is loaded
  onSendMessage?: (text: string) => void
  speakingMessageId?: string | null
  isLoadingSpeech?: boolean
  onToggleSpeech?: (messageId: string, text: string) => void
}

function getDayKey(date: Date | string | number | undefined): string {
  if (!date) return ""
  try {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return ""
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  } catch {
    return ""
  }
}

function getDayLabel(date: Date | string | number | undefined): string {
  if (!date) return ""
  try {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return ""
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const diffDays = Math.round((today - msgDay) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "היום"
    if (diffDays === 1) return "אתמול"
    if (diffDays < 7 && diffDays > 0) {
      return d.toLocaleDateString("he-IL", { weekday: "long" })
    }
    return d.toLocaleDateString("he-IL", {
      day: "numeric",
      month: "long",
      year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    })
  } catch {
    return ""
  }
}

const LAUNCH_SOUND_URL = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/launch-SUi0itAGHr1wtvdDYYG5bzFLsIYHtP.mp3"

export function MessageList({
  messages,
  isStreaming,
  error,
  onRetry,
  isLoaded,
  onSendMessage,
  speakingMessageId,
  isLoadingSpeech,
  onToggleSpeech,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const rafRef = useRef<number | null>(null)
  const [hasAnimated, setHasAnimated] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastScrollRef = useRef<number>(0)
  const hasPlayedIntroRef = useRef(false) // Track if intro has played

  useEffect(() => {
    if (!isLoaded) return // Wait for localStorage to load

    // Only animate if no messages were loaded (fresh start)
    if (messages.length === 0 && !hasPlayedIntroRef.current) {
      setHasAnimated(true)
      hasPlayedIntroRef.current = true

      audioRef.current = new Audio(LAUNCH_SOUND_URL)
      audioRef.current.volume = 0.5
      audioRef.current.play().catch(() => {
        // Ignore autoplay errors - browser may block without user interaction
      })
    } else if (messages.length > 0) {
      // Skip animation if messages exist
      setHasAnimated(false)
      hasPlayedIntroRef.current = true
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [isLoaded, messages.length])

  useEffect(() => {
    if (!containerRef.current) return
    // Immediate scroll to bottom when messages change
    const container = containerRef.current
    container.scrollTop = container.scrollHeight
    setAutoScroll(true)
  }, [messages.length])

  useEffect(() => {
    if (!isStreaming || !autoScroll || !containerRef.current) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }

    const container = containerRef.current
    lastScrollRef.current = container.scrollTop

    const smoothScroll = () => {
      if (!container) return

      const { scrollHeight, clientHeight } = container
      const targetScroll = scrollHeight - clientHeight
      const currentScroll = lastScrollRef.current
      const diff = targetScroll - currentScroll

      if (diff > 0.5) {
        const newScroll = currentScroll + diff * 0.03
        lastScrollRef.current = newScroll
        container.scrollTop = newScroll
      }

      rafRef.current = requestAnimationFrame(smoothScroll)
    }

    // Start immediately
    rafRef.current = requestAnimationFrame(smoothScroll)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [isStreaming, autoScroll])

  // Detect if user scrolls up to disable auto-scroll
  const handleScroll = () => {
    if (!containerRef.current || isStreaming) return

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 150
    setAutoScroll(isAtBottom)
  }

  const lastMessage = messages[messages.length - 1]
  const showTypingIndicator =
    isStreaming &&
    (messages.length === 0 ||
      lastMessage?.role === "user" ||
      (lastMessage?.role === "assistant" && lastMessage?.content === ""))

  if (!isLoaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatedOrb size={64} />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="absolute inset-0 overflow-y-auto pt-16 pb-32 space-y-4 border-none px-6"
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
    >
      {/* Empty state */}
      {messages.length === 0 && !error && !isStreaming && (
        <div className="flex flex-col items-center justify-center h-full text-center text-stone-600 px-4" dir="rtl">
          <div className={`mb-4 relative ${hasAnimated ? "orb-intro" : ""}`}>
            <img
              src="/assets/noa-profile.png"
              alt="נועה AI - ח. סבן"
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover object-top border-4 border-blue-600 shadow-md ring-4 ring-blue-100/70"
              referrerPolicy="no-referrer"
            />
            <span className="absolute -bottom-1 -left-1 text-2xl select-none filter drop-shadow">❤️</span>
          </div>
          <h1 className={`text-2xl font-bold text-stone-800 ${hasAnimated ? "text-blur-intro" : ""}`}>
            שלום ראמי, אני נועה AI ❤️
          </h1>

          <p className="text-xs text-stone-600 mt-1 max-w-sm">
            ערוץ השיחה הפרטי לניהול משימות שוטף, סידור עבודה,ממתינה.
          </p>

          {/* Quick starter chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6 max-w-lg">
            {[
              { icon: "📋", text: "סידור עבודה יומי לנהגים ולמשאיות" },
              { icon: "🏗️", text: "בדיקת סטטוס מלאי חומרי בניין והזמנות רכש" },
              { icon: "💡", text: "סיעור מוחות לפיתוח וייעול לוגיסטי" },
              { icon: "⏱️", text: "מעקב אספקות וסגירת קצוות פתוחים" },
            ].map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSendMessage?.(item.text)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/90 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-stone-200/80 text-stone-700 text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
              >
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      {(() => {
        const visibleMessages = messages.filter((message) => {
          // Hide empty assistant messages during streaming - they'll be shown as typing indicator instead
          if (isStreaming && message.role === "assistant" && message === lastMessage && message.content === "") {
            return false
          }
          return true
        })

        return visibleMessages.map((message, index) => {
          const prevMessage = index > 0 ? visibleMessages[index - 1] : null
          const showDateDivider = !prevMessage || getDayKey(message.createdAt) !== getDayKey(prevMessage.createdAt)
          const dayLabel = getDayLabel(message.createdAt)

          return (
            <div key={message.id} className="space-y-4">
              {showDateDivider && dayLabel && (
                <div className="flex items-center justify-center my-3 select-none" dir="rtl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-200/70 backdrop-blur-xs text-stone-600 text-[11px] font-semibold border border-stone-300/60 shadow-2xs">
                    <Calendar className="w-3 h-3 text-stone-500" />
                    <span>{dayLabel}</span>
                  </div>
                </div>
              )}
              <MessageBubble
                message={message}
                isStreaming={isStreaming && message.role === "assistant" && message === lastMessage}
                onActionClick={onSendMessage}
                isSpeaking={speakingMessageId === message.id}
                isLoadingSpeech={isLoadingSpeech && speakingMessageId === message.id}
                onToggleSpeech={onToggleSpeech}
              />
            </div>
          )
        })
      })()}

      {showTypingIndicator && <TypingIndicator />}

      {/* Error state */}
      {error && (
        <div
          className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
          role="alert"
          style={{
            boxShadow:
              "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px",
          }}
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">Something went wrong</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="text-red-600 hover:text-red-700 hover:bg-red-100 transition-colors"
            aria-label="Retry sending message"
          >
            <RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {/* Scroll anchor */}
      <div ref={bottomRef} aria-hidden="true" className="h-20" />
    </div>
  )
}
