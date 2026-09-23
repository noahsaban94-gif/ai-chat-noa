"use client"

import type React from "react"

import { useState, useRef, useCallback, type KeyboardEvent, useEffect } from "react"
import { Square, Mic, MicOff, Brain, Paperclip, X, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { extractSkuFromText } from "@/lib/product-data-service"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"
import Image from "next/image"
import { AnimatedOrb } from "./animated-orb"
import { AudioWaveform } from "./audio-waveform"

export type AIModel = "google/gemini-2.0-flash-001" | "openai/gpt-4o" | "anthropic/claude-sonnet-4"

export const AI_MODELS: { id: AIModel; name: string; icon: string }[] = [
  { id: "google/gemini-2.0-flash-001", name: "Gemini", icon: "/images/google.webp" },
  { id: "openai/gpt-4o", name: "GPT-4o", icon: "/images/gpt.png" },
  { id: "anthropic/claude-sonnet-4", name: "Claude", icon: "/images/claude.svg" },
]

interface ComposerProps {
  onSend: (content: string, imageData?: string) => void
  onStop: () => void
  isStreaming: boolean
  disabled?: boolean
  selectedModel: AIModel
  onModelChange: (model: AIModel) => void
  isSkuSearching?: boolean
  searchingSku?: string | null
}

export function Composer({
  onSend,
  onStop,
  isStreaming,
  disabled,
  selectedModel,
  onModelChange,
  isSkuSearching = false,
  searchingSku = null,
}: ComposerProps) {
  const [value, setValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [showImageBounce, setShowImageBounce] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const [localSearching, setLocalSearching] = useState(false)
  const [localSku, setLocalSku] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const isRecordingRef = useRef(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const speechRecognitionTextRef = useRef("")
  const baseTextRef = useRef("")

  // SKU detection from current input text
  const previewSku = extractSkuFromText(value)
  const isQueryingSku = Boolean(isSkuSearching || localSearching)
  const activeSku = searchingSku || localSku || previewSku

  useEffect(() => {
    if (!isStreaming && localSearching) {
      const timer = setTimeout(() => {
        setLocalSearching(false)
        setLocalSku(null)
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [isStreaming, localSearching])

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      const targetHeight = Math.min(Math.max(textarea.scrollHeight, 56), 220)
      textarea.style.height = `${targetHeight}px`
    }
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [value, adjustTextareaHeight])

  const handleInput = useCallback(() => {
    adjustTextareaHeight()
  }, [adjustTextareaHeight])

  const initRecognition = useCallback(() => {
    if (typeof window === "undefined") return null
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return null

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "he-IL"

      recognition.onresult = (event: any) => {
        let interimText = ""
        let newFinalText = ""

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i]
          if (res.isFinal) {
            newFinalText += res[0].transcript + " "
          } else {
            interimText += res[0].transcript
          }
        }

        const fullSpeech = (newFinalText + interimText).trim()
        if (fullSpeech) {
          speechRecognitionTextRef.current = fullSpeech
          const prefix = baseTextRef.current ? baseTextRef.current.trim() + " " : ""
          const combined = prefix + fullSpeech
          setValue(combined)
          if (textareaRef.current) {
            textareaRef.current.value = combined
            handleInput()
          }
        }
      }

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error)
        if (event.error === "no-speech") return
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          // Do not crash - media recorder fallback will take over seamlessly
          try {
            recognition.stop()
          } catch {}
        }
      }

      recognition.onend = () => {
        if (isRecordingRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start()
          } catch {
            // Already active or stopped
          }
        }
      }

      return recognition
    } catch (e) {
      console.warn("Failed to create SpeechRecognition:", e)
      return null
    }
  }, [handleInput])

  useEffect(() => {
    recognitionRef.current = initRecognition()

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch {}
      }
    }
  }, [initRecognition])

  useEffect(() => {
    // Trigger intro animation after mount
    setHasAnimated(true)
  }, [])

  const playClickSound = useCallback(() => {
    const audio = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/click-FM4Xaa1FJj237591TiZw4yL1fIxdOw.mp3")
    audio.volume = 0.5
    audio.play().catch(() => {})
  }, [])

  const playRecordSound = useCallback(() => {
    const audio = new Audio("https://hebbkx1anhila5yf.public.blob.vercel-storage.com/record-CNHOyjcpri6lx5C2sGXncDtFVDwspO.mp3")
    audio.volume = 0.5
    audio.play().catch(() => {})
  }, [])

  const stopActiveRecording = useCallback(async () => {
    isRecordingRef.current = false
    setIsRecording(false)

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {}
    }

    const recorder = mediaRecorderRef.current
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.requestData()
      } catch {}

      recorder.onstop = async () => {
        // Stop audio tracks after recorder finished
        if (mediaStream) {
          mediaStream.getTracks().forEach((track) => track.stop())
          setMediaStream(null)
        }

        // If Web Speech already captured text, keep it!
        if (speechRecognitionTextRef.current.trim().length > 0) {
          return
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        })

        if (audioBlob.size > 200) {
          setIsTranscribing(true)
          try {
            const formData = new FormData()
            formData.append("audio", audioBlob, "recording.webm")

            const res = await fetch("/api/transcribe", {
              method: "POST",
              body: formData,
            })

            if (res.ok) {
              const data = await res.json()
              if (data.text && data.text.trim()) {
                const prefix = baseTextRef.current ? baseTextRef.current.trim() + " " : ""
                const fullText = prefix + data.text.trim()
                setValue(fullText)
                if (textareaRef.current) {
                  textareaRef.current.value = fullText
                  textareaRef.current.focus()
                  handleInput()
                }
              }
            }
          } catch (err) {
            console.error("AI Transcription error:", err)
          } finally {
            setIsTranscribing(false)
          }
        }
      }

      try {
        recorder.stop()
      } catch (err) {
        console.warn("Error stopping recorder:", err)
      }
    } else {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop())
        setMediaStream(null)
      }
    }
  }, [mediaStream, handleInput])

  const toggleRecording = useCallback(async () => {
    playClickSound()

    if (isRecording) {
      await stopActiveRecording()
    } else {
      playRecordSound()
      baseTextRef.current = value
      speechRecognitionTextRef.current = ""
      audioChunksRef.current = []

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        setMediaStream(stream)
        isRecordingRef.current = true
        setIsRecording(true)

        // Setup MediaRecorder for universal AI transcription fallback
        try {
          let mimeType = ""
          if (typeof MediaRecorder !== "undefined") {
            if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
              mimeType = "audio/webm;codecs=opus"
            } else if (MediaRecorder.isTypeSupported("audio/webm")) {
              mimeType = "audio/webm"
            } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
              mimeType = "audio/mp4"
            }
          }
          const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data)
            }
          }
          recorder.start(100)
          mediaRecorderRef.current = recorder
        } catch (e) {
          console.warn("MediaRecorder start notice:", e)
        }

        // Start Web Speech Recognition
        if (!recognitionRef.current) {
          recognitionRef.current = initRecognition()
        }
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start()
          } catch (e) {
            console.warn("Recognition start notice:", e)
          }
        }
      } catch (err) {
        console.error("Microphone permission error:", err)
        alert("נא לאשר גישה למיקרופון בהגדרות הדפדפן כדי להקליט הודעות לנועה.")
        setIsRecording(false)
        isRecordingRef.current = false
      }
    }
  }, [isRecording, value, playClickSound, playRecordSound, stopActiveRecording, initRecognition])

  const handleSend = useCallback(() => {
    if ((!value.trim() && !uploadedImage) || isStreaming || disabled) return
    playClickSound()

    if (previewSku) {
      setLocalSearching(true)
      setLocalSku(previewSku)
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
    }
    onSend(value || "נועה תציצ בתמונה ", uploadedImage || undefined)
    setValue("")
    setUploadedImage(null)
    baseTextRef.current = ""
    speechRecognitionTextRef.current = ""
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }, [value, uploadedImage, isStreaming, disabled, onSend, isRecording, playClickSound, previewSku])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      playClickSound()

      const file = e.target.files?.[0]
      if (!file) return

      const isAudio =
        file.type.startsWith("audio/") ||
        /\.(ogg|opus|mp3|wav|m4a|aac|weba)$/i.test(file.name)

      if (file.type.startsWith("image/")) {
        const reader = new FileReader()
        reader.onload = (event) => {
          setUploadedImage(event.target?.result as string)
          setShowImageBounce(true)
          setTimeout(() => setShowImageBounce(false), 400)
        }
        reader.readAsDataURL(file)
      } else if (isAudio) {
        setIsTranscribing(true)
        try {
          const formData = new FormData()
          formData.append("audio", file, file.name || "voice-note.ogg")

          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: formData,
          })

          if (res.ok) {
            const data = await res.json()
            if (data.text && data.text.trim()) {
              const prefix = baseTextRef.current ? baseTextRef.current.trim() + " " : ""
              const fullText = `${prefix}🎙️ [הודעה קולית / WhatsApp Voice]: "${data.text.trim()}"`
              setValue(fullText)
              if (textareaRef.current) {
                textareaRef.current.value = fullText
                textareaRef.current.focus()
                handleInput()
              }
            }
          }
        } catch (err) {
          console.error("Audio transcription error:", err)
        } finally {
          setIsTranscribing(false)
        }
      }
      e.target.value = ""
    },
    [playClickSound, handleInput],
  )

  const removeImage = useCallback(() => {
    setUploadedImage(null)
  }, [])

  const currentModel = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0]

  return (
    <div className={cn("fixed bottom-4 left-0 right-0 px-4 pointer-events-none z-10", hasAnimated && "composer-intro")}>
      <div className="relative max-w-2xl mx-auto pointer-events-auto">
        <div
          className={cn(
            "flex flex-col gap-3 p-4 bg-white border-stone-200 transition-all duration-300 border-none border-0 overflow-hidden relative rounded-3xl",
            "focus-within:border-stone-300 focus-within:ring-2 focus-within:ring-stone-200",
            isQueryingSku && "ring-2 ring-amber-400/50 border-amber-300/80 sku-searching-glow"
          )}
          style={{
            minHeight: "171px",
            height: "auto",
            boxShadow: isQueryingSku
              ? "rgba(245, 158, 11, 0.16) 0px 0px 0px 2px, rgba(245, 158, 11, 0.1) 0px 8px 24px -4px, rgba(14, 63, 126, 0.06) 0px 12px 12px -6px"
              : "rgba(14, 63, 126, 0.06) 0px 0px 0px 1px, rgba(42, 51, 69, 0.06) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.06) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.06) 0px 6px 6px -3px, rgba(14, 63, 126, 0.06) 0px 12px 12px -6px, rgba(14, 63, 126, 0.06) 0px 24px 24px -12px",
          }}
        >
          {/* Subtle scanning light beam on top border during SKU lookup */}
          {isQueryingSku && (
            <div className="absolute top-0 left-0 right-0 h-1 overflow-hidden rounded-t-3xl bg-amber-500/10 z-20">
              <div className="h-full w-2/5 bg-gradient-to-r from-transparent via-amber-500 to-transparent sku-searching-scanner" />
            </div>
          )}

          {/* Real-time SKU search feedback banner */}
          {isQueryingSku && (
            <div
              className="flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-50/95 via-orange-50/80 to-amber-50/95 border border-amber-200/90 text-amber-950 text-xs shadow-xs animate-in fade-in slide-in-from-top-1 duration-200"
              dir="rtl"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="font-semibold text-amber-950">
                  {activeSku
                    ? `אני על זה ראמי  ${activeSku} ותמונת מוצר (מאתרת)...`
                    : "מבצעת שאילתת מק\"ט במאגר המקומי ובגיליון מילון_לוגיסטי..."}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-800">
                <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                <span className="hidden sm:inline">מאגר מקומי + גיליון</span>
              </div>
            </div>
          )}

          {/* Subtle preview indicator while typing an SKU */}
          {!isQueryingSku && previewSku && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-100/90 border border-stone-200/80 text-stone-600 text-xs w-fit animate-in fade-in duration-150"
              dir="rtl"
            >
              <Search className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                זוהה מק&quot;ט <strong className="text-amber-700 font-semibold">{previewSku}</strong> — בלחיצה על שלח תתבצע שאילתה במקור הנתונים
              </span>
            </div>
          )}

          <div className="flex gap-2 items-center">
            {uploadedImage && (
              <div className={cn("relative shrink-0", showImageBounce && "image-bounce")}>
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-stone-200">
                  <Image
                    src={uploadedImage || "/placeholder.svg"}
                    alt="Uploaded image"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={removeImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-stone-800 hover:bg-stone-900 text-white rounded-full flex items-center justify-center transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                handleInput()
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                isQueryingSku
                  ? `שולפת נתונים ותמונה עבור מק"ט ${activeSku || ""} ממקור הנתונים...`
                  : isRecording
                    ? "מקשיבה לך ראמי... (דבר בחופשיות)"
                    : isTranscribing
                      ? "מתמללת את ההקלטה שלך לנועה..."
                      : "כתוב הודעה לנועה... (Shift+Enter לשורה חדשה)"
              }
              disabled={isStreaming || disabled}
              rows={1}
              dir="auto"
              className={cn(
                "flex-1 resize-none bg-transparent px-3.5 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 text-right",
                "focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
                "min-h-[56px] max-h-[220px] border border-stone-200/80 rounded-2xl overflow-y-auto transition-[height] duration-150 ease-out",
                isQueryingSku && "border-amber-400/70 bg-amber-50/20"
              )}
              style={{
                minHeight: "56px",
                maxHeight: "220px",
                borderStyle: "double",
                borderRadius: "19px",
                borderWidth: "6.888889px",
              }}
              aria-label="Message input"
            />

            {isRecording && (
              <div className="shrink-0 w-24">
                <AudioWaveform isRecording={isRecording} stream={mediaStream} />
              </div>
            )}

            {isStreaming ? (
              <button
                onClick={() => {
                  playClickSound()
                  onStop()
                }}
                className="relative h-9 w-9 shrink-0 transition-all rounded-full flex items-center justify-center cursor-pointer hover:scale-105"
                aria-label="Stop generating"
              >
                <AnimatedOrb size={36} variant="red" />
                <Square
                  className="w-4 h-4 absolute drop-shadow-md text-red-700"
                  fill="currentColor"
                  aria-hidden="true"
                />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={(!value.trim() && !uploadedImage) || disabled}
                className={cn(
                  "relative h-9 w-9 shrink-0 transition-all rounded-full flex items-center justify-center",
                  (!value.trim() && !uploadedImage) || disabled
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:scale-105",
                )}
                aria-label="Send message"
              >
                <AnimatedOrb size={36} />
              </button>
            )}
          </div>

          <div
            className="flex items-center gap-2"
            style={{
              marginLeft: "3px",
              marginTop: "2px",
              marginRight: "64px",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,audio/*,.ogg,.opus,.m4a,.mp3,.wav,.aac,.weba"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="צרף תמונה או הודעה קולית מוואטסאפ"
            />

            <div className="relative">
              <Button
                onClick={toggleRecording}
                disabled={isStreaming || disabled || isTranscribing}
                size="icon"
                className={cn(
                  "h-9 w-9 shrink-0 transition-all rounded-full relative z-10 cursor-pointer",
                  isRecording
                    ? "bg-red-500 hover:bg-red-600 text-white animate-bounce-subtle ring-2 ring-red-300"
                    : isTranscribing
                      ? "bg-purple-100 text-purple-700 ring-2 ring-purple-300"
                      : "bg-zinc-100 hover:bg-zinc-200 text-stone-700",
                )}
                aria-label={isRecording ? "עצור הקלטה" : isTranscribing ? "מתמללת שמע..." : "הקלט הודעה קולית לנועה"}
                title={isRecording ? "לחץ לסיום הקלטה" : isTranscribing ? "מתמללת שמע..." : "הקלט הודעה קולית (דיבור לטקסט)"}
              >
                {isRecording ? (
                  <MicOff className="w-4 h-4" />
                ) : isTranscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </Button>
            </div>

            <Button
              onClick={() => {
                playClickSound()
                fileInputRef.current?.click()
              }}
              disabled={isStreaming || disabled}
              size="icon"
              className="h-9 w-9 shrink-0 bg-zinc-100 hover:bg-zinc-200 text-stone-700 rounded-full"
              aria-label="צרף תמונה או הודעה קולית מוואטסאפ"
              title="צרף תמונה או הודעה קולית מוואטסאפ (Voice-to-Order)"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger className="bg-zinc-100" asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isStreaming || disabled}
                  className="h-9 w-9 shrink-0 bg-zinc-100 hover:bg-zinc-200 text-stone-700 rounded-full"
                  aria-label="Select AI model"
                  onClick={playClickSound}
                >
                  <Brain className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent
                  align="start"
                  side="top"
                  sideOffset={8}
                  className="w-40 px-2 py-2 rounded-2xl z-[9999]"
                >
                  {AI_MODELS.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => {
                        playClickSound()
                        onModelChange(model.id)
                      }}
                      className={cn(
                        "flex items-center cursor-pointer gap-3 rounded-lg",
                        selectedModel === model.id && "bg-stone-100",
                      )}
                    >
                      <Image
                        src={model.icon || "/placeholder.svg"}
                        alt={model.name}
                        width={20}
                        height={20}
                        className="rounded-sm object-contain w-4 h-4"
                      />
                      <span className="text-sm">{model.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>

            <span className="text-xs text-stone-400">{currentModel.name}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
