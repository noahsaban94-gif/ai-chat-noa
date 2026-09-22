"use client"

import { cn } from "@/lib/utils"
import type { Message } from "./chat-shell"
import { User } from "lucide-react"
import { MarkdownRenderer } from "./markdown-renderer"
import Image from "next/image"
import { AnimatedOrb } from "./animated-orb"

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  onActionClick?: (action: string) => void
}

// Format time for display
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function MessageBubble({ message, isStreaming = false, onActionClick }: MessageBubbleProps) {
  const isUser = message.role === "user"

  return (
    <div
      className={cn(
        "flex max-w-[95%] md:max-w-[85%] gap-2.5",
        isUser
          ? "ml-auto flex-row-reverse user-message-enter"
          : "mr-auto animate-in fade-in slide-in-from-bottom-2 duration-300 items-end",
      )}
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
      <div className={cn("flex flex-col", isUser ? "items-end text-right" : "items-start text-right")}>
        {/* Role label */}
        <span className="text-xs text-stone-400 mb-1 hidden sm:flex items-center gap-1.5 mt-2" dir="rtl">
          {isUser ? (
            <span className="font-semibold text-emerald-800">ראמי מסארוה</span>
          ) : (
            <span className="font-semibold text-stone-600 flex items-center gap-1">
              <span>נועה AI</span>
              <span className="text-red-500 text-[11px]">❤️</span>
              <span className="text-[10px] text-stone-400 font-normal">| ח. סבן חומרי בניין</span>
            </span>
          )}
        </span>

        {/* Bubble */}
        <div
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

        {/* Timestamp */}
        <span className="text-xs text-stone-400 mt-1">{formatTime(message.createdAt)}</span>
      </div>
    </div>
  )
}
