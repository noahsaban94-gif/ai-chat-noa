"use client"

import React, { useState, useEffect } from "react"
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  Users,
  Lock,
  ExternalLink,
  Laptop,
  AlertTriangle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  getOrCreateDeviceId,
  detectDeviceModel,
  getCurrentDeviceSession,
  handleDeviceActivation,
} from "@/lib/device-auth"
import type { DeviceSession } from "@/lib/types/device-auth"
import type { SeedResultItem } from "@/lib/seed-authorized-users"

interface DeviceAuthModalProps {
  isOpen: boolean
  onClose: () => void
  currentSession: DeviceSession | null
  onSessionUpdated: (session: DeviceSession) => void
  onRequestPairing?: () => void
}

export function DeviceAuthModal({
  isOpen,
  onClose,
  currentSession,
  onSessionUpdated,
  onRequestPairing,
}: DeviceAuthModalProps) {
  const [deviceId, setDeviceId] = useState("")
  const [deviceModel, setDeviceModel] = useState("")
  const [usersList, setUsersList] = useState<SeedResultItem[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [activatingUserId, setActivatingUserId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDeviceId(getOrCreateDeviceId())
      setDeviceModel(detectDeviceModel())
    }
  }, [isOpen])

  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const res = await fetch("/api/auth/users")
      const data = await res.json()
      if (data.success && Array.isArray(data.users)) {
        setUsersList(data.users)
      }
    } catch (e) {
      console.error("Failed to load users:", e)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  const handleCopyLink = (url: string, tokenKey: string) => {
    navigator.clipboard.writeText(url)
    setCopiedToken(tokenKey)
    setTimeout(() => setCopiedToken(null), 2500)
  }

  const handleActivateForThisDevice = async (user: SeedResultItem) => {
    if (!user.activationToken) {
      setStatusMessage({
        text: `המשתמש ${user.name} כבר נעול במכשיר אחר (${user.boundDeviceModel || "מכשיר מורשה"}). כדי להעבירו נדרש איפוס מנהל.`,
        type: "error",
      })
      return
    }

    setActivatingUserId(user.userId)
    setStatusMessage(null)

    try {
      const res = await handleDeviceActivation(user.activationToken)
      if (res.success && res.user) {
        onSessionUpdated(res.user)
        setStatusMessage({
          text: `המכשיר הנוכחי ננעל בהצלחה עבור ${res.user.name} (${res.user.role})!`,
          type: "success",
        })
        fetchUsers()
      } else {
        setStatusMessage({
          text: res.error || "שגיאה בנעילת המכשיר",
          type: "error",
        })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "שגיאת תקשורת"
      setStatusMessage({ text: msg, type: "error" })
    } finally {
      setActivatingUserId(null)
    }
  }

  const handleResetAllTokens = async () => {
    if (!confirm("האם לאפס מחדש את כל טוקני ההפעלה של בעלי התפקידים? (למטרת פיתוח ובדיקות)")) {
      return
    }
    setIsLoadingUsers(true)
    try {
      const res = await fetch("/api/auth/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceReset: true }),
      })
      const data = await res.json()
      if (data.success) {
        setUsersList(data.users)
        setStatusMessage({
          text: "טוקני ההפעלה אופסו מחדש בהצלחה. קישורים חדשים הופקו.",
          type: "success",
        })
      }
    } catch (e) {
      console.error("Failed to reset tokens:", e)
    } finally {
      setIsLoadingUsers(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        id="device-auth-modal-content"
        className="max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 bg-stone-50 border border-stone-200 text-right"
        dir="rtl"
      >
        <DialogHeader className="text-right pb-3 border-b border-stone-200/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-stone-900">
                  נעילת מכשיר (Device Binding) & מניעת התחזות
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500">
                  ח. סבן חומרי בניין (1994) בע״מ | בקרת גישה פיזית לפי בעלי תפקידים
                </DialogDescription>
              </div>
            </div>
            <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>אבטחה מופעלת</span>
            </span>
          </div>
        </DialogHeader>

        {/* Current Device Hardware Card */}
        <div className="mt-4 p-3.5 bg-white rounded-xl border border-stone-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500">
            <span className="font-semibold text-stone-700 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-stone-500" />
              <span>פרטי המכשיר הפיזי הנוכחי:</span>
            </span>
            <span className="text-[11px] text-stone-400 font-mono">Hardware ID</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-stone-50 p-2.5 rounded-lg border border-stone-100">
            <div>
              <p className="font-medium text-stone-800 flex items-center gap-1">
                <span>דגם מזוהה:</span>
                <span className="font-semibold text-emerald-800">{deviceModel}</span>
              </p>
              <p className="font-mono text-[11px] text-stone-500 truncate max-w-xs mt-0.5">
                מזהה: {deviceId}
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0 flex flex-col items-end gap-1.5">
              <span className="text-[11px] font-semibold text-stone-600 bg-stone-200/60 px-2 py-0.5 rounded-md">
                {currentSession ? `מקושר ל: ${currentSession.name}` : "טרם קושר משתמש"}
              </span>
              {onRequestPairing && (
                <button
                  type="button"
                  onClick={onRequestPairing}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold underline cursor-pointer"
                >
                  צימוד מכשיר זה ב-OTP (וואטסאפ)
                </button>
              )}
            </div>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {statusMessage.type === "success" ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Team Members List */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-stone-500" />
              <span>רשימת בעלי תפקידים וקישורי הפעלה אישיים:</span>
            </h3>
            <Button
              onClick={handleResetAllTokens}
              variant="ghost"
              size="sm"
              disabled={isLoadingUsers}
              className="text-[11px] h-7 px-2 text-stone-500 hover:text-stone-800 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3 ml-1" />
              <span>איפוס טוקנים</span>
            </Button>
          </div>

          <div className="space-y-2">
            {isLoadingUsers ? (
              <div className="p-8 text-center text-xs text-stone-400">
                טוען נתוני בעלי תפקידים מ-Firestore...
              </div>
            ) : (
              usersList.map((user) => {
                const isCurrentActive = currentSession?.userId === user.userId
                const isBound = user.isActivated && Boolean(user.boundDeviceId)

                return (
                  <div
                    key={user.userId}
                    className={`p-3 rounded-xl border transition-all ${
                      isCurrentActive
                        ? "bg-emerald-50/70 border-emerald-300 shadow-2xs"
                        : "bg-white border-stone-200/80 hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">{user.name}</span>
                          <span className="text-[11px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded">
                            {user.role}
                          </span>
                          {isCurrentActive && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                              פעיל במכשיר זה ✓
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 font-mono">
                          טלפון: {user.phone} {user.notes ? `• ${user.notes}` : ""}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {isBound ? (
                          <span className="text-[10px] font-medium text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5 text-stone-500" />
                            <span>נעול: {user.boundDeviceModel || "מכשיר מאושר"}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span>ממתין להפעלה</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions: Copy link or Activate on this device */}
                    <div className="mt-2.5 pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      {user.activationToken ? (
                        <div className="flex items-center gap-1.5">
                          <Button
                            onClick={() => handleCopyLink(user.activationUrl, user.userId)}
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-[11px] font-medium text-stone-700 border-stone-200 hover:bg-stone-50 cursor-pointer flex items-center gap-1"
                          >
                            {copiedToken === user.userId ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700 font-semibold">הקישור הועתק!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-stone-500" />
                                <span>העתק קישור הפעלה</span>
                              </>
                            )}
                          </Button>

                          {!isCurrentActive && (
                            <Button
                              onClick={() => handleActivateForThisDevice(user)}
                              disabled={activatingUserId === user.userId}
                              variant="default"
                              size="sm"
                              className="h-7 px-2.5 text-[11px] font-medium bg-stone-900 hover:bg-stone-800 text-white cursor-pointer"
                            >
                              {activatingUserId === user.userId ? "נועל..." : "נעל במכשיר זה"}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-stone-400">
                          טוקן ההפעלה נוצל ונמחק לצמיתות (נעול במכשיר המורשה).
                        </span>
                      )}

                      <span className="text-[10px] font-mono text-stone-400">
                        {user.userId}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs text-stone-500">
          <span className="flex items-center gap-1 text-[11px]">
            <ShieldAlert className="w-3.5 h-3.5 text-stone-400" />
            <span>כל ניסיון גישה ממכשיר זר נחסם מיידית (403) ומתועד ב-security_alerts.</span>
          </span>
          <Button
            onClick={onClose}
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs cursor-pointer"
          >
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
