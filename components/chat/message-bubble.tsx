"use client"

import { cn } from "@/lib/utils"
import type { Message } from "./chat-shell"
import { Clock } from "lucide-react"
import { MarkdownRenderer } from "./markdown-renderer"
import Image from "next/image"

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  onActionClick?: (action: string) => void
}

// Format time for display (e.g. 10:24)
export function formatTime(date: Date | string | number | undefined): string {
  if (!date) return ""
  try {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return ""
    return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

// Format full date and time for tooltip and accessibility
export function formatFullDateTime(date: Date | string | number | undefined): string {
  if (!date) return ""
  try {
    const d = date instanceof Date ? date : new Date(date)
    if (isNaN(d.getTime())) return ""
    return d.toLocaleString("he-IL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

export function MessageBubble({ message, isStreaming = false, onActionClick }: MessageBubbleProps) {
  const isUser = message.role === "user"
  const timeFormatted = formatTime(message.createdAt)
  const fullDateTime = formatFullDateTime(message.createdAt)

  return (
    <div
      id={`message-item-${message.id}`}
      className={cn(
        "flex max-w-[95%] md:max-w-[85%] gap-2.5",
        isUser
          ? "ml-auto flex-row-reverse user-message-enter"
          : "mr-auto animate-in fade-in slide-in-from-bottom-2 duration-300 items-end",
      )}
      style={message.id === "OIhXf4iq5qKDJYMSSYQd" ? { backgroundColor: "#1372cd" } : undefined}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative",
          isUser ? "bg-white border border-emerald-500/20" : "",
          !isUser && isStreaming && "sticky bottom-4 self-end transition-all duration-300",
        )}
        style={{
          boxShadow: isUser
            ? "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px"
            : "none",
        }}
        aria-hidden="true"
      >
        {isUser ? (
          <span className="text-sm font-bold text-emerald-700">ר</span>
        ) : (
          <div className="relative">
            <img
              src="/assets/noa-profile.png"
              alt="נועה AI - ח. סבן"
              className="w-10 h-10 rounded-full object-cover object-top border-2 border-blue-600 shadow-sm"
              referrerPolicy="no-referrer"
            />
            <span className="absolute -top-1 -right-1 text-[11px] select-none leading-none">❤️</span>
          </div>
        )}
      </div>

      {/* Message content */}
      <div
        className={cn("flex flex-col flex-1 min-w-0", isUser ? "items-end text-right" : "items-start text-right")}
        style={message.id === "beiFOQh4h5W4B0Jlef94" ? { backgroundColor: "#d4e4f4" } : undefined}
      >
        {/* Role & Time header */}
        <div
          className={cn(
            "flex items-center gap-1.5 mb-1 px-1 text-xs select-none",
            isUser ? "flex-row-reverse" : "flex-row",
          )}
          dir="rtl"
        >
          {isUser ? (
            <span className="font-semibold text-emerald-800">ראמי מסארוה</span>
          ) : (
            <span className="font-semibold text-stone-700 flex items-center gap-1">
              <span>נועה AI</span>
              <span className="text-red-500 text-[11px]">❤️</span>
              <span className="text-[10px] text-stone-400 font-normal hidden sm:inline">| ח. סבן</span>
            </span>
          )}
          <span className="text-stone-300 text-[10px]">•</span>
          {timeFormatted && (
            <time
              dateTime={message.createdAt ? new Date(message.createdAt).toISOString() : undefined}
              className="text-[11px] font-medium text-stone-500 flex items-center gap-1 tracking-tight"
              title={fullDateTime}
            >
              <Clock className="w-3 h-3 text-stone-400 inline shrink-0" />
              <span>{timeFormatted}</span>
            </time>
          )}
          {message.device && (
            <>
              <span className="text-stone-300 text-[10px]">•</span>
              <span className="text-[10px] font-medium text-stone-500 bg-stone-100/90 border border-stone-200/60 px-1.5 py-0.2 rounded-md">
                {message.device === "samsung_mobile"
                  ? "📱 סמסונג"
                  : message.device === "whatsapp"
                  ? "💬 וואטסאפ"
                  : "💻 מחשב"}
              </span>
            </>
          )}
        </div>

        {/* Bubble */}
        <div
          id={`message-bubble-${message.id}`}
          className={cn(
            "rounded-2xl border-none overflow-hidden",
            isUser
              ? "bg-white text-stone-800 border border-stone-200 rounded-br-md shadow-xs"
              : "bg-white/70 backdrop-blur-xs text-stone-800 rounded-bl-md border border-stone-200/50 p-3 shadow-xs",
          )}
          style={{
            boxShadow: isUser
              ? "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px"
              : "none",
            willChange: isStreaming ? "height" : "auto",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div
            className={cn(isUser ? "px-4 py-3" : "py-1")}
            style={{
              transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease",
              ...(!isUser
                ? {
                    fontWeight: "bold",
                    fontFamily: "system-ui",
                    fontSize: "15px",
                  }
                : {}),
            }}
          >
            {isUser ? (
              <div className="flex flex-col gap-2">
                {message.imageData && (
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-stone-200">
                    <Image
                      src={message.imageData || "/placeholder.svg"}
                      alt="Uploaded image"
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <p
                  className="whitespace-pre-wrap break-words text-[17px] font-bold text-[#089d0e] leading-[27px]"
                  style={{
                    fontSize: "17px",
                    fontWeight: "bold",
                    color: "#089d0e",
                    fontFamily: "Arial",
                    lineHeight: "27px",
                  }}
                >
                  {message.content}
                </p>
              </div>
            ) : (
              <MarkdownRenderer
                content={message.content || " "}
                isStreaming={isStreaming}
                onActionClick={onActionClick}
                className="text-[15px] font-bold [font-family:system-ui]"
              />
            )}
          </div>
        </div>

        {/* Timestamp next to bubble footer */}
        {timeFormatted && (
          <div
            className={cn(
              "flex items-center gap-1 text-[11px] text-stone-400 mt-1 px-1.5 select-none",
              isUser ? "justify-end" : "justify-start",
            )}
            dir="rtl"
            title={fullDateTime}
            style={
              message.id === "OIhXf4iq5qKDJYMSSYQd"
                ? { fontWeight: "bold", color: "#ebb07f" }
                : undefined
            }
          >
            <Clock
              className="w-2.5 h-2.5 text-stone-400/80 shrink-0"
              style={
                message.id === "OIhXf4iq5qKDJYMSSYQd"
                  ? { color: "#f9811c" }
                  : undefined
              }
            />
            <span>{timeFormatted}</span>
          </div>
        )}
      </div>
    </div>
  )
}
