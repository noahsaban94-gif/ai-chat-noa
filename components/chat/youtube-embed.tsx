"use client"

import React, { useState } from "react"
import { Play, ExternalLink, Video, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface YouTubeEmbedProps {
  videoId: string
  url?: string
  title?: string
  className?: string
}

export function YouTubeEmbed({ videoId, url, title, className }: YouTubeEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const fullUrl = url || `https://www.youtube.com/watch?v=${videoId}`
  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`

  return (
    <div
      className={cn(
        "my-3 w-full max-w-2xl rounded-2xl border border-stone-200 bg-stone-900 overflow-hidden shadow-xs transition-all",
        className,
      )}
      dir="rtl"
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-stone-950/90 border-b border-stone-800 text-stone-200">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-red-600/90 flex items-center justify-center text-white shrink-0 shadow-2xs">
            <Video className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-stone-100 truncate">
            {title || "סרטון הדרכה מקצועי | ח. סבן חומרי בניין"}
          </span>
        </div>

        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-stone-400 hover:text-white transition-colors shrink-0 bg-stone-800/80 hover:bg-stone-800 px-2 py-0.5 rounded-full"
          title="פתח לצפייה ישירה ביוטיוב"
        >
          <span>פתח ב-YouTube</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Video / Preview Container (16:9 Aspect Ratio) */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center">
        {isPlaying ? (
          <iframe
            src={embedUrl}
            title={title || "YouTube video player"}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div
            onClick={() => setIsPlaying(true)}
            className="group relative w-full h-full cursor-pointer flex items-center justify-center overflow-hidden"
          >
            {/* Thumbnail Image */}
            <img
              src={thumbnailUrl}
              alt={title || "תמונת סרטון הדרכה"}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 opacity-90"
              loading="lazy"
              onError={(e) => {
                // If HQ thumbnail fails, fallback to standard or placeholder
                ;(e.target as HTMLElement).style.display = "none"
              }}
            />

            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 group-hover:bg-black/20 transition-colors" />

            {/* Big Play Button */}
            <div className="relative z-10 flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-200">
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </div>
              <span className="text-xs font-medium text-white/90 drop-shadow-md bg-black/60 px-3 py-1 rounded-full border border-white/10">
                לחץ להפעלת הסרטון בנגן המובנה
              </span>
            </div>

            {/* Bottom bar indicator */}
            <div className="absolute bottom-2.5 right-3 z-10 flex items-center gap-1.5 text-[11px] text-emerald-400 bg-stone-900/90 px-2 py-0.5 rounded-md border border-stone-700/60">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>הדרכה טכנית מורשית</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
