"use client"

import React, { useState, useEffect, useRef } from "react"
import { Sparkles, Video, Eye, EyeOff, Sliders, Upload, RefreshCw, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface VideoBackgroundConfig {
  enabled: boolean
  selectedVideo: "video1" | "video2" | "custom"
  opacity: number // 0.1 to 0.7
  onlyWhileThinking: boolean
  customVideoUrl: string | null
}

const DEFAULT_CONFIG: VideoBackgroundConfig = {
  enabled: true,
  selectedVideo: "video1",
  opacity: 0.28,
  onlyWhileThinking: false,
  customVideoUrl: null,
}

const STORAGE_KEY = "jarvis_chat_video_bg_config"

const PRESET_VIDEOS = [
  {
    id: "video1" as const,
    name: "3D Iridescent Crystals & Orb",
    hebrewName: "קריסטלים אירידיסנטיים ואורב",
    src: "/videos/video-1-iridescent.mp4",
    accent: "from-cyan-400 via-purple-400 to-pink-400",
  },
  {
    id: "video2" as const,
    name: "3D Silk Waves & Neural Flow",
    hebrewName: "גלי משי וזרימה נוירונלית",
    src: "/videos/video-2-silk-waves.mp4",
    accent: "from-slate-400 via-zinc-400 to-stone-400",
  },
]

interface VideoBackgroundProps {
  isStreaming: boolean
  className?: string
}

export function VideoBackground({ isStreaming, className = "" }: VideoBackgroundProps) {
  const [config, setConfig] = useState<VideoBackgroundConfig>(DEFAULT_CONFIG)
  const [isLoaded, setIsLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load config from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setConfig((prev) => ({ ...prev, ...JSON.parse(stored) }))
      }
    } catch {
      // Ignore localStorage parse error
    } finally {
      setIsLoaded(true)
    }
  }, [])

  // Persist config
  const updateConfig = (updates: Partial<VideoBackgroundConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Ignore quota
      }
      return next
    })
  }

  // Active video source
  const currentVideoSrc =
    config.selectedVideo === "custom" && config.customVideoUrl
      ? config.customVideoUrl
      : config.selectedVideo === "video2"
        ? PRESET_VIDEOS[1].src
        : PRESET_VIDEOS[0].src

  // Handle video element playback & rate changes during AI thinking
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (isStreaming) {
      // Faster playback and vibrant presence during thinking
      video.playbackRate = 1.15
      video.play().catch(() => {})
    } else {
      video.playbackRate = 0.95
      if (config.onlyWhileThinking) {
        video.pause()
      } else {
        video.play().catch(() => {})
      }
    }
  }, [isStreaming, config.onlyWhileThinking])

  // Custom video file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("video/")) {
      alert("נא להעלות קובץ וידאו תקין (MP4, WebM וכו')")
      return
    }

    const objectUrl = URL.createObjectURL(file)
    updateConfig({
      customVideoUrl: objectUrl,
      selectedVideo: "custom",
      enabled: true,
    })
  }

  // Calculate dynamic opacity based on AI thinking state
  const targetOpacity = !config.enabled
    ? 0
    : config.onlyWhileThinking
      ? isStreaming
        ? config.opacity + 0.18
        : 0
      : isStreaming
        ? Math.min(0.7, config.opacity + 0.18)
        : config.opacity

  return (
    <>
      {/* Background Video Layer */}
      <div
        id="chat-video-background-layer"
        className={`absolute inset-0 pointer-events-none overflow-hidden transition-all duration-700 ease-in-out z-0 ${className}`}
        style={{
          opacity: isLoaded ? targetOpacity : 0,
        }}
        aria-hidden="true"
      >
        <video
          ref={videoRef}
          key={currentVideoSrc}
          src={currentVideoSrc}
          autoPlay
          loop
          muted
          playsInline
          className={`w-full h-full object-cover transition-transform duration-1000 ease-out ${
            isStreaming ? "scale-105 filter saturate-125" : "scale-100"
          }`}
          style={{
            mixBlendMode: "multiply",
          }}
        />

        {/* Studio Soft Vignette & Blending Gradients */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 40%, rgba(250, 250, 249, 0.45) 80%, rgba(250, 250, 249, 0.92) 100%)",
          }}
        />

        {/* Ambient Top and Bottom Soft Gradient Masks */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-stone-50 via-stone-50/70 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-stone-50 via-stone-50/80 to-transparent pointer-events-none" />

        {/* Iridescent Neural Thinking Aura (Active during AI streaming) */}
        <div
          className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
            isStreaming ? "opacity-100" : "opacity-0"
          }`}
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(192, 132, 252, 0.12) 0%, rgba(56, 189, 248, 0.08) 35%, transparent 70%)",
            animation: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          }}
        />
      </div>

      {/* AI Thinking Floating Indicator Banner */}
      <div
        id="ai-thinking-indicator"
        className={`absolute top-4 right-16 z-20 pointer-events-none transition-all duration-500 transform ${
          isStreaming ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-md border border-purple-200/70 shadow-sm text-xs font-medium text-purple-900 animate-pulse">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
          </span>
          <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-spin" style={{ animationDuration: "4s" }} />
          <span>מעבד ומנסח מענה...</span>
        </div>
      </div>

      {/* Video Background Settings Trigger Button */}
      <div className="absolute top-4 right-4 z-20">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="video-background-settings-button"
              variant="ghost"
              size="icon"
              style={{
                marginRight: "11px",
                marginBottom: "7px",
                paddingBottom: "2px",
                marginLeft: "8px",
                marginTop: "-12px",
              }}
              className={`h-10 w-10 rounded-full transition-all duration-300 shadow-sm ${
                config.enabled
                  ? isStreaming
                    ? "bg-purple-100 text-purple-700 ring-2 ring-purple-300/80"
                    : "bg-zinc-100 hover:bg-zinc-200 text-stone-700"
                  : "bg-zinc-100/70 hover:bg-zinc-200 text-stone-400"
              }`}
              title="הגדרות רקע וידאו (חשיבת AI)"
              aria-label="Video Background Settings"
            >
              <Video className="w-4 h-4" />
            </Button>
          </PopoverTrigger>

          <PopoverContent
            id="video-background-settings-popover"
            align="end"
            className="w-80 p-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-stone-200/80 text-right font-sans"
            dir="rtl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-purple-600" />
                <h4 className="font-semibold text-sm text-stone-800">רקע וידאו וחשיבת AI</h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateConfig({ enabled: !config.enabled })}
                className="h-7 px-2 text-xs rounded-lg text-stone-600 hover:bg-stone-100"
              >
                {config.enabled ? (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <Eye className="w-3.5 h-3.5" /> פעיל
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-stone-400">
                    <EyeOff className="w-3.5 h-3.5" /> כבוי
                  </span>
                )}
              </Button>
            </div>

            {/* Video Presets Selector */}
            <div className="mt-3 space-y-2">
              <label className="text-xs font-medium text-stone-500 block">בחר סרטון רקע:</label>
              <div className="grid grid-cols-1 gap-2">
                {PRESET_VIDEOS.map((vid) => (
                  <button
                    key={vid.id}
                    type="button"
                    onClick={() => updateConfig({ selectedVideo: vid.id, enabled: true })}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-right transition-all text-xs ${
                      config.selectedVideo === vid.id
                        ? "border-purple-500 bg-purple-50/70 text-purple-950 font-semibold shadow-xs"
                        : "border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-tr ${vid.accent}`} />
                      <span>{vid.hebrewName}</span>
                    </div>
                    {config.selectedVideo === vid.id && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">
                        נבחר
                      </span>
                    )}
                  </button>
                ))}

                {/* Custom Video Option */}
                {config.customVideoUrl && (
                  <button
                    type="button"
                    onClick={() => updateConfig({ selectedVideo: "custom", enabled: true })}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-right transition-all text-xs ${
                      config.selectedVideo === "custom"
                        ? "border-purple-500 bg-purple-50/70 text-purple-950 font-semibold shadow-xs"
                        : "border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-stone-500" />
                      <span>וידאו אישי שהועלה</span>
                    </div>
                    {config.selectedVideo === "custom" && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-full">
                        נבחר
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Upload Custom Video Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="w-full mt-1.5 h-8 text-xs border-dashed border-stone-300 text-stone-600 hover:text-stone-900 rounded-xl"
              >
                <Upload className="w-3.5 h-3.5 ml-1.5 text-stone-400" />
                העלה קובץ וידאו נוסף (MP4)
              </Button>
            </div>

            {/* Behavior Mode */}
            <div className="mt-4 pt-3 border-t border-stone-100 space-y-2">
              <label className="text-xs font-medium text-stone-500 block">אופן תצוגה:</label>
              <div className="flex items-center justify-between bg-stone-50 p-2 rounded-xl text-xs">
                <span className="text-stone-700">מוצג רק בזמן מענה/חשיבת AI</span>
                <input
                  type="checkbox"
                  id="only-thinking-toggle"
                  checked={config.onlyWhileThinking}
                  onChange={(e) => updateConfig({ onlyWhileThinking: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                />
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="mt-4 pt-3 border-t border-stone-100 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-stone-500">שקיפות רקע ({Math.round(config.opacity * 100)}%)</span>
                <Sliders className="w-3.5 h-3.5 text-stone-400" />
              </div>
              <input
                type="range"
                min="0.1"
                max="0.65"
                step="0.05"
                value={config.opacity}
                onChange={(e) => updateConfig({ opacity: Number.parseFloat(e.target.value) })}
                className="w-full accent-purple-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-stone-400 pt-0.5">
                <span>מעודן (10%)</span>
                <span>בולט (65%)</span>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  )
}
