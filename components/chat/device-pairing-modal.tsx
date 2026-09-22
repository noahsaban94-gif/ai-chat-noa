"use client"

import React, { useState, useEffect } from "react"
import {
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Laptop,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Lock,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  getOrCreateDeviceId,
  detectDeviceModel,
  saveDeviceSession,
} from "@/lib/device-auth"
import type { DeviceSession } from "@/lib/types/device-auth"

interface DevicePairingModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
  phone: string
  onPairingSuccess: (session: DeviceSession) => void
}

export function DevicePairingModal({
  isOpen,
  onClose,
  userId,
  userName,
  phone,
  onPairingSuccess,
}: DevicePairingModalProps) {
  const [deviceId, setDeviceId] = useState("")
  const [deviceModel, setDeviceModel] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [maskedPhone, setMaskedPhone] = useState(phone || "")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(300) // 5 דקות = 300 שניות

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDeviceId(getOrCreateDeviceId())
      setDeviceModel(detectDeviceModel())
    }
  }, [isOpen])

  // טיימר ספירה לאחור ל-5 דקות מרגע שליחת הקוד
  useEffect(() => {
    if (!codeSent || timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(interval)
  }, [codeSent, timeLeft])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // 1. שליחת קוד אימות חד-פעמי (OTP) לוואטסאפ / מכשיר ראשי
  const handleSendOtp = async () => {
    setIsSendingOtp(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const currentDeviceId = deviceId || getOrCreateDeviceId()
      const currentDeviceModel = deviceModel || detectDeviceModel()

      const res = await fetch("/api/auth/request-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId || "user_rami_masarweh",
          deviceId: currentDeviceId,
          deviceModel: currentDeviceModel,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "שגיאה בשליחת קוד אימות")
      }

      setCodeSent(true)
      setTimeLeft(300)
      if (data.maskedPhone) {
        setMaskedPhone(data.maskedPhone)
      }
      setSuccessMessage(
        data.message || "קוד אימות בן 6 ספרות נשלח לוואטסאפ. תוקף הקוד: 5 דקות."
      )
    } catch (err: unknown) {
      console.error("Failed to request OTP:", err)
      setErrorMessage(err instanceof Error ? err.message : "תקלת תקשורת בשליחת קוד האימות")
    } finally {
      setIsSendingOtp(false)
    }
  }

  // 2. אישור הקוד והוספת המכשיר
  const handleVerifyDevice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    const cleanOtp = otpCode.trim().replace(/\D/g, "")
    if (cleanOtp.length !== 6) {
      setErrorMessage("נא להזין קוד אימות מלא בן 6 ספרות")
      return
    }

    setIsVerifying(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const currentDeviceId = deviceId || getOrCreateDeviceId()
      const res = await fetch("/api/auth/verify-device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId || "user_rami_masarweh",
          deviceId: currentDeviceId,
          otpCode: cleanOtp,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "קוד אימות שגוי או שפג תוקפו")
      }

      const verifiedSession: DeviceSession = {
        userId: data.user.userId,
        name: data.user.name,
        role: data.user.role,
        phone: data.user.phone,
        deviceId: currentDeviceId,
        deviceModel: data.user.deviceModel || deviceModel,
        isActivated: true,
      }

      // שמירת הסשן המקומי
      saveDeviceSession(verifiedSession)

      setSuccessMessage("המכשיר אומת בהצלחה! מסנכרן שיחה וממשיך...")

      setTimeout(() => {
        onPairingSuccess(verifiedSession)
        onClose()
      }, 900)
    } catch (err: unknown) {
      console.error("Failed to verify OTP:", err)
      setErrorMessage(err instanceof Error ? err.message : "שגיאה באימות קוד המכשיר")
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        id="device-pairing-modal-content"
        className="max-w-md p-5 sm:p-6 bg-stone-50 border border-stone-200 text-right shadow-xl"
        dir="rtl"
      >
        <DialogHeader className="text-right pb-3 border-b border-stone-200/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-stone-900">
                  אישור וחיבור מכשיר נוסף (OTP)
                </DialogTitle>
                <DialogDescription className="text-xs text-stone-500">
                  ח. סבן חומרי בניין | אימות רב-מכשירי (PC + סמסונג)
                </DialogDescription>
              </div>
            </div>
            <span className="text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-600" />
              <span>נדרש אימות</span>
            </span>
          </div>
        </DialogHeader>

        {/* פרטי המכשיר והמשתמש הנוכחי */}
        <div className="mt-3 p-3 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-2 text-xs">
          <div className="flex items-center justify-between text-stone-500">
            <span className="font-semibold text-stone-800 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-stone-600" />
              <span>מכשיר נוכחי שזוהה:</span>
            </span>
            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
              {deviceModel || "מכשיר לא מזוהה"}
            </span>
          </div>
          <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-stone-600">
            <span>משתמש מורשה לחיבור:</span>
            <span className="font-bold text-stone-900">{userName || "ראמי מסארוה"}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-400 font-mono">
            <span>מזהה חומרה:</span>
            <span className="truncate max-w-[190px]">{deviceId}</span>
          </div>
        </div>

        {/* שלב 1: כפתור שליחת קוד */}
        <div className="mt-2 space-y-2">
          {!codeSent ? (
            <div className="space-y-2">
              <p className="text-xs text-stone-600 leading-relaxed">
                מכשיר זה טרם אושר בחשבון של <strong>{userName || "ראמי מסארוה"}</strong>.
                לחץ על הכפתור כדי לקבל קוד אימות חד-פעמי בן 6 ספרות לוואטסאפ במכשיר הראשי.
              </p>
              <Button
                id="send-otp-button"
                onClick={handleSendOtp}
                disabled={isSendingOtp}
                variant="default"
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                {isSendingOtp ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>שולח קוד אימות בוואטסאפ...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>שלח קוד אימות למכשיר הראשי / לוואטסאפ</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-emerald-800">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>קוד נשלח לוואטסאפ: {maskedPhone}</span>
                </span>
                <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-900">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(timeLeft)}</span>
                </span>
              </div>

              {/* שלב 2: שדה קלט ל-6 ספרות וכפתור "אשר מכשיר" */}
              <form onSubmit={handleVerifyDevice} className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="otp-input" className="text-xs font-semibold text-stone-700 block">
                    הזן את 6 ספרות הקוד שהתקבלו בוואטסאפ:
                  </label>
                  <Input
                    id="otp-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="h-12 text-center text-xl font-mono font-bold tracking-[0.4em] bg-white border-stone-300 focus:border-stone-900 focus:ring-0"
                    autoFocus
                  />
                </div>

                <Button
                  id="confirm-device-button"
                  type="submit"
                  disabled={isVerifying || otpCode.trim().length !== 6 || timeLeft <= 0}
                  className="w-full h-10 bg-stone-900 hover:bg-stone-800 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {isVerifying ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>מאמת ונועל מכשיר...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>אשר מכשיר</span>
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={isSendingOtp}
                    className="text-stone-500 hover:text-stone-800 underline text-[11px] cursor-pointer"
                  >
                    לא קיבלת קוד? שלח שוב
                  </button>

                  <span className="text-[11px] text-stone-400">
                    תוקף הקוד: 5 דקות
                  </span>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* הודעות שגיאה או הצלחה */}
        {errorMessage && (
          <div className="mt-2.5 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && !errorMessage && (
          <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-stone-200/80 flex justify-end">
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs text-stone-500 hover:text-stone-800 cursor-pointer"
          >
            ביטול
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
