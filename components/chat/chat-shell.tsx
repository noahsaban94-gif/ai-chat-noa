"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { RotateCcw, Trash2, Sparkles, Database, ShieldCheck, ShieldAlert, Lock, CheckCircle2 } from "lucide-react"
import { MessageList } from "./message-list"
import { Composer, type AIModel } from "./composer"
import { Button } from "@/components/ui/button"
import { VideoBackground } from "./video-background"
import { PWAInstallButton } from "@/components/pwa/pwa-install-button"
import { OfflineIndicator } from "@/components/pwa/offline-indicator"
import { DeviceAuthModal } from "./device-auth-modal"
import { DevicePairingModal } from "./device-pairing-modal"
import {
  getOrCreateDeviceId,
  getCurrentDeviceSession,
  handleDeviceActivation,
} from "@/lib/device-auth"
import type { DeviceSession } from "@/lib/types/device-auth"
import {
  listenToConversation,
  saveMessage,
  detectDevice,
  ACTIVE_SESSION_ID,
  messageDocumentToUIMessage,
} from "@/lib/conversation-memory"
import { seedFirestoreConversations } from "@/lib/seed-conversations"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Data model for messages
export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  createdAt: Date
  imageData?: string
  device?: "pc" | "samsung_mobile" | "whatsapp"
  isNormalizedOrder?: boolean
}

// localStorage key for persisting messages
const STORAGE_KEY = "chat-messages"
const MODEL_STORAGE_KEY = "chat-selected-model"

// Generates a unique ID for messages
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

export function ChatShell() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const isStreamingRef = useRef(isStreaming)
  useEffect(() => {
    isStreamingRef.current = isStreaming
  }, [isStreaming])

  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [selectedModel, setSelectedModel] = useState<AIModel>("google/gemini-2.0-flash-001")
  const [isLoaded, setIsLoaded] = useState(false)
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false)

  // 🔒 Device Binding & Hardware Session State
  const [currentSession, setCurrentSession] = useState<DeviceSession | null>(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authBanner, setAuthBanner] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [pairingModalData, setPairingModalData] = useState<{
    isOpen: boolean
    userId: string
    userName: string
    phone: string
    pendingMessage?: { content: string; imageData?: string }
  } | null>(null)

  // Initialize and verify device binding & check activation token in URL (?token=...)
  useEffect(() => {
    // 1. Check local device session
    const session = getCurrentDeviceSession()
    if (session) {
      setCurrentSession(session)
    }

    // 2. Check for token in URL (?token=act_...)
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const token = urlParams.get("token")
      if (token) {
        handleDeviceActivation(token).then((res) => {
          if (res.success && res.user) {
            setCurrentSession(res.user)
            setAuthBanner({
              message: `מכשיר זה אומת וננעל בהצלחה עבור ${res.user.name} (${res.user.role})!`,
              type: "success",
            })
            window.history.replaceState({}, document.title, window.location.pathname)
          } else {
            setAuthBanner({
              message: res.error || "קישור הפעלה זה אינו תקף או שכבר נוצל במכשיר אחר.",
              type: "error",
            })
          }
        })
      }
    }
  }, [])

  // Listen to Cloud Firestore in real time for cross-device memory (PC + Samsung)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    try {
      unsubscribe = listenToConversation(ACTIVE_SESSION_ID, (firestoreDocs) => {
        if (firestoreDocs && firestoreDocs.length > 0) {
          setIsFirestoreConnected(true)
          if (!isStreamingRef.current) {
            const uiMsgs: Message[] = firestoreDocs.map((doc) => messageDocumentToUIMessage(doc))
            setMessages(uiMsgs)
          }
        } else {
          // If Firestore is empty, auto-inject the initial conversation context
          seedFirestoreConversations(false)
            .then((res) => {
              if (res.success) {
                setIsFirestoreConnected(true)
              }
            })
            .catch((err) => console.warn("Auto-seed error:", err))
        }
      })
    } catch (e) {
      console.warn("Firestore listener not connected, falling back to local storage:", e)
    }

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  // Load messages from localStorage on mount as backup
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && messages.length === 0) {
        const parsed = JSON.parse(stored)
        const messagesWithDates = parsed.map((msg: Message) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }))
        setMessages(messagesWithDates)
      }
      const savedModel = localStorage.getItem(MODEL_STORAGE_KEY) as AIModel | null
      if (savedModel) {
        setSelectedModel(savedModel)
      }
    } catch (e) {
      console.error("Failed to load from localStorage:", e)
    } finally {
      setIsLoaded(true)
    }
  }, [messages.length])

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    } catch (e) {
      console.error("Failed to save messages to localStorage:", e)
    }
  }, [messages])

  const handleModelChange = useCallback((model: AIModel) => {
    setSelectedModel(model)
    localStorage.setItem(MODEL_STORAGE_KEY, model)
  }, [])

  const handleSeedConversation = useCallback(async () => {
    setIsSeeding(true)
    try {
      const res = await seedFirestoreConversations(true)
      if (res.success) {
        setIsFirestoreConnected(true)
      }
    } catch (err) {
      console.error("Failed to seed conversation in Firestore:", err)
    } finally {
      setIsSeeding(false)
    }
  }, [])

  // Send a message to the AI
  const sendMessage = useCallback(
    async (content: string, imageData?: string) => {
      if ((!content.trim() && !imageData) || isStreaming) return

      setError(null)

      const userMessage: Message = {
        id: generateId(),
        role: "user",
        content: content.trim() || "נועה תציצ בתמונה ",
        createdAt: new Date(),
        imageData,
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        createdAt: new Date(),
      }

      const newMessages = [...messages, userMessage, assistantMessage]
      setMessages(newMessages)
      setIsStreaming(true)

      // שמירת הודעת המשתמש ב-Cloud Firestore
      saveMessage(ACTIVE_SESSION_ID, "user", userMessage.content, detectDevice()).catch((err) =>
        console.warn("Could not save user message to Firestore:", err)
      )

      const controller = new AbortController()
      setAbortController(controller)

      try {
        const now = new Date()
        const clientDate = now.toLocaleDateString("he-IL", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        const clientTime = now.toLocaleTimeString("he-IL", {
          hour: "2-digit",
          minute: "2-digit",
        })

        const deviceId = getOrCreateDeviceId()
        const targetUserId = currentSession?.userId || "user_rami_masarweh"

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map((m) => ({
              role: m.role,
              content: m.content,
              imageData: m.imageData,
            })),
            model: selectedModel,
            currentDate: `יום ${clientDate}`,
            currentTime: clientTime,
            userId: targetUserId,
            deviceId,
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          let errData: {
            error?: string
            requiresPairing?: boolean
            message?: string
            userId?: string
            userName?: string
            phone?: string
          } = {}

          try {
            errData = await response.json()
          } catch {
            const txt = await response.text()
            errData = { message: txt }
          }

          // במידה ונדרש אימות מכשיר נוסף (OTP / Device Pairing)
          if (errData.requiresPairing || errData.error === "UNAUTHORIZED_DEVICE") {
            setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessage.id))
            setIsStreaming(false)
            setAbortController(null)

            setPairingModalData({
              isOpen: true,
              userId: errData.userId || targetUserId,
              userName: errData.userName || currentSession?.name || "ראמי מסארוה",
              phone: errData.phone || currentSession?.phone || "050-8860896",
              pendingMessage: { content, imageData },
            })
            return
          }

          throw new Error(errData.message || errData.error || `שגיאת אימות / תקשורת (${response.status})`)
        }

        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error("No response body")
        }

        let accumulatedContent = ""

        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          accumulatedContent += chunk

          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantMessage.id ? { ...msg, content: accumulatedContent } : msg)),
          )
        }

        // שמירת תשובת נועה ב-Cloud Firestore לסנכרון מלא
        if (accumulatedContent.trim()) {
          saveMessage(ACTIVE_SESSION_ID, "model", accumulatedContent, "pc").catch((err) =>
            console.warn("Could not save assistant message to Firestore:", err)
          )
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessage.id ? { ...msg, content: msg.content || "[Cancelled]" } : msg,
            ),
          )
        } else {
          console.error("Error sending message:", e)
          setError(e instanceof Error ? e.message : "An error occurred")
          setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessage.id))
        }
      } finally {
        setIsStreaming(false)
        setAbortController(null)
      }
    },
    [messages, isStreaming, selectedModel],
  )

  const retry = useCallback(() => {
    if (messages.length === 0) return
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
    if (lastUserMessage) {
      const index = messages.findIndex((m) => m.id === lastUserMessage.id)
      setMessages(messages.slice(0, index))
      setError(null)
      setTimeout(() => sendMessage(lastUserMessage.content, lastUserMessage.imageData), 100)
    }
  }, [messages, sendMessage])

  const stopStreaming = useCallback(() => {
    if (abortController) {
      abortController.abort()
    }
  }, [abortController])

  const clearChat = useCallback(() => {
    if (abortController) {
      abortController.abort()
      setAbortController(null)
    }
    setIsStreaming(false)
    setMessages([])
    setError(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error("Failed to clear localStorage:", e)
    }
    setIsClearConfirmOpen(false)
  }, [abortController])

  const handleStartNewSession = useCallback(() => {
    if (messages.length > 0) {
      setIsClearConfirmOpen(true)
    } else {
      clearChat()
    }
  }, [messages.length, clearChat])

  return (
    <div
      className="relative h-dvh bg-stone-50 overflow-hidden"
      style={{
        boxShadow:
          "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px",
      }}
    >
      {/* Semi-transparent Thinking Video Background & Controls */}
      <VideoBackground isStreaming={isStreaming} />

      {/* Top Header Bar */}
      <header
        id="chat-header-bar"
        className="absolute top-2.5 sm:top-3 left-3 right-3 sm:left-4 sm:right-4 z-20 flex items-center justify-between gap-2 pointer-events-none"
        dir="rtl"
      >
        <div
          className="flex items-center gap-2 pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-200/80 shadow-xs max-w-[65%] sm:max-w-none"
        >
          <img
            src="/assets/noa-profile.png"
            alt="נועה AI - ח. סבן"
            className="w-6 h-6 rounded-full object-cover object-top border border-blue-600 shadow-2xs shrink-0"
            referrerPolicy="no-referrer"
          />
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-bold text-stone-800 shrink-0">נועה AI</span>
          <span className="text-red-500 text-xs shrink-0">❤️</span>
          <span className="text-stone-300 text-xs hidden sm:inline">|</span>
          <span className="text-xs font-medium text-stone-600 hidden md:inline truncate">ח. סבן (1994) בע״מ</span>
          <span className="text-stone-300 text-xs hidden sm:inline">|</span>
          <span className="text-xs font-semibold text-emerald-800 truncate">
            {currentSession ? currentSession.name : "ראמי מסארוה"}
          </span>

          {/* Hidden technical badges */}
          <span
            className="hidden"
            title={currentSession ? `מכשיר נעול ומאובטח: ${currentSession.name} (${currentSession.role})` : "נעילת מכשיר אקטיבית"}
          >
            <Lock className="w-2.5 h-2.5 text-emerald-600" />
            <span className="truncate max-w-[85px]">{currentSession ? currentSession.role : "מנהל תפעול"}</span>
          </span>

          {isFirestoreConnected && (
            <span
              id="firestore-status-badge"
              className="hidden"
              title="מסונכרן בזמן אמת ל-Cloud Firestore"
            >
              <Database className="w-2.5 h-2.5 text-emerald-600" />
              <span>ענן מסונכרן</span>
            </span>
          )}
        </div>

        {/* Redesigned Button Row Toolbar */}
        <div
          id="chat-header-actions"
          className="flex items-center gap-1.5 pointer-events-auto shrink-0 bg-white/90 backdrop-blur-md p-1 rounded-full border border-stone-200/80 shadow-xs"
        >
          {/* Hidden dev/admin buttons kept for DOM references but hidden from chat room */}
          <Button
            id="device-security-button"
            onClick={() => setIsAuthModalOpen(true)}
            variant="outline"
            size="sm"
            className="hidden"
            aria-label="בקרת נעילת מכשיר והרשאות צוות"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>נעילת מכשיר</span>
          </Button>

          <Button
            id="seed-firestore-button"
            onClick={handleSeedConversation}
            disabled={isSeeding}
            variant="outline"
            size="sm"
            className="hidden"
            aria-label="הזרק נתוני שיחה ורענן הקשר ב-Cloud Firestore"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{isSeeding ? "מזריק..." : "הזרק הקשר"}</span>
          </Button>

          <PWAInstallButton />

          <Button
            id="clear-history-button"
            onClick={handleStartNewSession}
            variant="ghost"
            size="sm"
            className="h-8 px-3.5 rounded-full bg-stone-100 hover:bg-stone-200/80 text-stone-800 hover:text-stone-950 font-semibold text-xs flex items-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer shadow-2xs border border-stone-200/60 group"
            aria-label="התחל שיחה חדשה ונקה היסטוריה"
            title="מחיקת היסטוריית השיחה והתחלת סשן חדש"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-500 transition-transform duration-300 group-hover:-rotate-90 group-hover:text-stone-800" />
            <span>שיחה חדשה</span>
          </Button>
        </div>
      </header>

      {/* Floating Auth & Security Alert Banner */}
      {authBanner && (
        <div
          className={`absolute top-14 left-4 right-4 z-30 p-2.5 sm:p-3 rounded-xl shadow-md border flex items-center justify-between gap-2 text-xs font-medium backdrop-blur-md transition-all ${
            authBanner.type === "success"
              ? "bg-emerald-50/95 border-emerald-300 text-emerald-900"
              : "bg-red-50/95 border-red-300 text-red-900"
          }`}
          dir="rtl"
        >
          <div className="flex items-center gap-2">
            {authBanner.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{authBanner.message}</span>
          </div>
          <button
            onClick={() => setAuthBanner(null)}
            className="text-stone-500 hover:text-stone-800 text-xs px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <div className="relative z-10 h-full w-full">
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          error={error}
          onRetry={retry}
          isLoaded={isLoaded}
          onSendMessage={sendMessage}
        />
      </div>

      <Composer
        onSend={sendMessage}
        onStop={stopStreaming}
        isStreaming={isStreaming}
        disabled={!!error}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
      />

      <OfflineIndicator />

      {/* Confirmation Dialog for Clearing Chat and Starting New Session */}
      <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
        <AlertDialogContent
          id="clear-chat-dialog"
          className="max-w-md bg-white border border-stone-200 shadow-2xl rounded-2xl p-6"
          dir="rtl"
        >
          <AlertDialogHeader className="text-right space-y-2">
            <AlertDialogTitle className="text-base sm:text-lg font-bold text-stone-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-600 shrink-0" />
              <span>להתחיל שיחה חדשה?</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-stone-600 text-sm leading-relaxed text-right">
              פעולה זו תמחק את כל היסטוריית ההודעות בשיחה הנוכחית עם נועה, ותפתח סשן עבודה חדש ונקי.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse justify-start gap-2.5 mt-5 sm:space-x-0">
            <AlertDialogAction
              id="confirm-clear-history-button"
              onClick={clearChat}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl text-xs font-semibold px-4 py-2.5 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>כן, נקה והתחל שיחה חדשה</span>
            </AlertDialogAction>
            <AlertDialogCancel
              id="cancel-clear-history-button"
              className="rounded-xl text-xs font-medium px-4 py-2.5 border-stone-200 hover:bg-stone-100 text-stone-700 cursor-pointer"
            >
              ביטול
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Device Authentication and Hardware Binding Modal */}
      <DeviceAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentSession={currentSession}
        onSessionUpdated={(newSession) => {
          setCurrentSession(newSession)
          setAuthBanner({
            message: `המכשיר סונכרן וננעל בהצלחה עבור ${newSession.name} (${newSession.role})!`,
            type: "success",
          })
        }}
        onRequestPairing={() => {
          setIsAuthModalOpen(false)
          setPairingModalData({
            isOpen: true,
            userId: currentSession?.userId || "user_rami_masarweh",
            userName: currentSession?.name || "ראמי מסארוה",
            phone: currentSession?.phone || "050-8860896",
          })
        }}
      />

      {/* Device Pairing (OTP) Modal for additional devices (e.g. PC + Samsung) */}
      {pairingModalData && (
        <DevicePairingModal
          isOpen={pairingModalData.isOpen}
          onClose={() => setPairingModalData(null)}
          userId={pairingModalData.userId}
          userName={pairingModalData.userName}
          phone={pairingModalData.phone}
          onPairingSuccess={(newSession) => {
            setCurrentSession(newSession)
            setAuthBanner({
              message: `מכשיר נוסף (${newSession.deviceModel}) אומת ואושר בהצלחה עבור ${newSession.name}!`,
              type: "success",
            })
            const pending = pairingModalData.pendingMessage
            setPairingModalData(null)

            // המשך השיחה בצורה חלקה ללא צורך בהקלדה מחדש
            if (pending) {
              setTimeout(() => {
                sendMessage(pending.content, pending.imageData)
              }, 400)
            }
          }}
        />
      )}
    </div>
  )
}
