"use client"

import { cn } from "@/lib/utils"
import type React from "react"
import { useState, useEffect, useRef } from "react"
import { AnalysisWordSpan } from "./analysis-word-span"
import { Sparkles } from "lucide-react"

interface MarkdownRendererProps {
  content: string
  className?: string
  isStreaming?: boolean
  onActionClick?: (action: string) => void
}

export function MarkdownRenderer({
  content,
  className,
  isStreaming = false,
  onActionClick,
}: MarkdownRendererProps) {
  const [staticContent, setStaticContent] = useState("")
  const [animatingContent, setAnimatingContent] = useState("")

  useEffect(() => {
    if (isStreaming) {
      const newContent = content.slice(staticContent.length)
      setAnimatingContent(newContent)
    } else {
      setStaticContent(content)
      setAnimatingContent("")
    }
  }, [content, isStreaming, staticContent.length])

  useEffect(() => {
    if (animatingContent.length > 200) {
      const cutPoint = animatingContent.lastIndexOf(" ", 150)
      if (cutPoint > 50) {
        setStaticContent((prev) => prev + animatingContent.slice(0, cutPoint + 1))
        setAnimatingContent(animatingContent.slice(cutPoint + 1))
      }
    }
  }, [animatingContent])

  // Extract quick chips if present in content
  const extractQuickChips = (text: string): { cleanedText: string; chips: string[] } => {
    const chips: string[] = []
    
    // Look for quick-chips block
    const quickChipsRegex = /<div[^>]*class=["'][^"']*quick-chips[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    const match = text.match(quickChipsRegex)
    
    if (match) {
      const innerHtml = match[1]
      // Extract button texts
      const buttonRegex = /<button[^>]*>([\s\S]*?)<\/button>/gi
      let btnMatch
      while ((btnMatch = buttonRegex.exec(innerHtml)) !== null) {
        // Strip any inner html tags
        const chipText = btnMatch[1].replace(/<[^>]+>/g, "").trim()
        if (chipText) {
          chips.push(chipText)
        }
      }
      const cleaned = text.replace(quickChipsRegex, "").trim()
      return { cleanedText: cleaned, chips }
    }

    // Also look for fallback patterns like [פעולה 1] [פעולה 2] at the end
    return { cleanedText: text, chips }
  }

  const renderPlainInlineMarkdown = (text: string) => {
    const elements: (string | React.ReactNode)[] = []
    let remaining = text
    let keyIndex = 0

    while (remaining.length > 0) {
      // Check for inline code
      const codeMatch = remaining.match(/^`([^`]+)`/)
      if (codeMatch) {
        elements.push(
          <code key={keyIndex++} className="px-1.5 py-0.5 bg-stone-100 text-stone-700 rounded text-sm font-mono">
            {codeMatch[1]}
          </code>,
        )
        remaining = remaining.slice(codeMatch[0].length)
        continue
      }

      // Check for bold
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/)
      if (boldMatch) {
        elements.push(
          <strong key={keyIndex++} className="font-extrabold text-stone-900">
            {boldMatch[1]}
          </strong>,
        )
        remaining = remaining.slice(boldMatch[0].length)
        continue
      }

      // Check for italic
      const italicMatch = remaining.match(/^\*([^*]+)\*/)
      if (italicMatch) {
        elements.push(<em key={keyIndex++}>{italicMatch[1]}</em>)
        remaining = remaining.slice(italicMatch[0].length)
        continue
      }

      // Check for links
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
      if (linkMatch) {
        elements.push(
          <a
            key={keyIndex++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2 transition-colors font-medium"
          >
            {linkMatch[1]}
          </a>,
        )
        remaining = remaining.slice(linkMatch[0].length)
        continue
      }

      // Find next special character or add remaining text
      const nextSpecial = remaining.search(/[`*[\]()]/)
      if (nextSpecial === -1) {
        elements.push(remaining)
        break
      } else if (nextSpecial === 0) {
        elements.push(remaining[0])
        remaining = remaining.slice(1)
      } else {
        elements.push(remaining.slice(0, nextSpecial))
        remaining = remaining.slice(nextSpecial)
      }
    }

    return elements
  }

  const renderAnimatedInlineMarkdown = (text: string) => {
    const elements: (string | React.ReactNode)[] = []
    let remaining = text
    let keyIndex = 0

    while (remaining.length > 0) {
      // Check for inline code
      const codeMatch = remaining.match(/^`([^`]+)`/)
      if (codeMatch) {
        elements.push(
          <code key={keyIndex++} className="px-1.5 py-0.5 bg-stone-100 text-stone-700 rounded text-sm font-mono">
            {codeMatch[1]}
          </code>,
        )
        remaining = remaining.slice(codeMatch[0].length)
        continue
      }

      // Check for bold
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/)
      if (boldMatch) {
        const words = boldMatch[1].split(/(\s+)/)
        elements.push(
          <strong key={keyIndex++} className="font-extrabold text-stone-900">
            {words.map((word, i) => {
              if (word.match(/\s+/)) return word
              if (!word) return null
              return <AnalysisWordSpan key={`b-${keyIndex}-${i}`} word={word} />
            })}
          </strong>,
        )
        remaining = remaining.slice(boldMatch[0].length)
        continue
      }

      // Check for italic
      const italicMatch = remaining.match(/^\*([^*]+)\*/)
      if (italicMatch) {
        const words = italicMatch[1].split(/(\s+)/)
        elements.push(
          <em key={keyIndex++}>
            {words.map((word, i) => {
              if (word.match(/\s+/)) return word
              if (!word) return null
              return <AnalysisWordSpan key={`i-${keyIndex}-${i}`} word={word} />
            })}
          </em>,
        )
        remaining = remaining.slice(italicMatch[0].length)
        continue
      }

      // Check for links
      const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
      if (linkMatch) {
        elements.push(
          <a
            key={keyIndex++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2 transition-colors font-medium"
          >
            {linkMatch[1]}
          </a>,
        )
        remaining = remaining.slice(linkMatch[0].length)
        continue
      }

      // Find next special character or add remaining text
      const nextSpecial = remaining.search(/[`*[\]()]/)
      if (nextSpecial === -1) {
        const words = remaining.split(/(\s+)/)
        elements.push(
          ...words.map((word, i) => {
            if (word.match(/\s+/)) return word
            if (!word) return null
            return <AnalysisWordSpan key={`w-${keyIndex++}-${i}`} word={word} />
          }),
        )
        break
      } else if (nextSpecial === 0) {
        elements.push(remaining[0])
        remaining = remaining.slice(1)
      } else {
        const textPart = remaining.slice(0, nextSpecial)
        const words = textPart.split(/(\s+)/)
        elements.push(
          ...words.map((word, i) => {
            if (word.match(/\s+/)) return word
            if (!word) return null
            return <AnalysisWordSpan key={`t-${keyIndex++}-${i}`} word={word} />
          }),
        )
        remaining = remaining.slice(nextSpecial)
      }
    }

    return elements
  }

  const renderCodeBlock = (part: string, partIndex: number) => {
    const codeContent = part.slice(3, -3)
    const firstNewline = codeContent.indexOf("\n")
    const language = firstNewline > 0 ? codeContent.slice(0, firstNewline).trim() : ""
    const code = firstNewline > 0 ? codeContent.slice(firstNewline + 1) : codeContent

    return (
      <pre
        key={partIndex}
        className="my-2 p-3 bg-stone-900 text-stone-100 rounded-lg overflow-x-auto text-sm font-mono text-left"
        dir="ltr"
        style={{
          boxShadow:
            "rgba(14, 63, 126, 0.04) 0px 0px 0px 1px, rgba(42, 51, 69, 0.04) 0px 1px 1px -0.5px, rgba(42, 51, 70, 0.04) 0px 3px 3px -1.5px, rgba(42, 51, 70, 0.04) 0px 6px 6px -3px, rgba(14, 63, 126, 0.04) 0px 12px 12px -6px, rgba(14, 63, 126, 0.04) 0px 24px 24px -12px",
        }}
      >
        {language && <span className="text-xs text-stone-400 block mb-2">{language}</span>}
        <code>{code}</code>
      </pre>
    )
  }

  // Parse markdown tables and render as styled tables
  const renderMarkdownTable = (tableStr: string, key: number) => {
    const lines = tableStr.trim().split("\n").filter((l) => l.trim().startsWith("|"))
    if (lines.length < 2) return null

    const headerCols = lines[0]
      .split("|")
      .map((c) => c.trim())
      .filter((c, i, a) => i > 0 && i < a.length - 1)

    const rowLines = lines.slice(2) // Skip header and separator

    return (
      <div key={key} className="overflow-x-auto my-3 rounded-xl border border-slate-200 shadow-xs" dir="rtl">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
            <tr>
              {headerCols.map((col, idx) => (
                <th key={idx} className="p-2.5">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium bg-white">
            {rowLines.map((line, rIdx) => {
              const cols = line
                .split("|")
                .map((c) => c.trim())
                .filter((c, i, a) => i > 0 && i < a.length - 1)
              return (
                <tr key={rIdx} className="hover:bg-sky-50/50 transition-colors">
                  {cols.map((col, cIdx) => (
                    <td key={cIdx} className={`p-2.5 ${cIdx === 0 ? "font-bold text-slate-800" : "text-slate-600"}`}>
                      {col}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const renderContent = (text: string, animated: boolean) => {
    if (!text) return null

    // Split by code blocks first
    const parts = text.split(/(```[\s\S]*?```)/g)

    return parts.map((part, partIndex) => {
      if (part.startsWith("```") && part.endsWith("```")) {
        return renderCodeBlock(part, partIndex)
      }

      // Check for raw HTML table or div block
      if (part.includes("<div") && part.includes("<table")) {
        return (
          <div
            key={partIndex}
            dir="rtl"
            dangerouslySetInnerHTML={{ __html: part }}
            className="my-2"
          />
        )
      }

      // Check for markdown table
      const mdTableRegex = /(\|[^\n]+\|\n\|[\s-:|]+\|\n(?:\|[^\n]+\|\n?)+)/g
      if (mdTableRegex.test(part)) {
        const subParts = part.split(mdTableRegex)
        return subParts.map((sub, sIdx) => {
          if (sub.trim().startsWith("|") && sub.includes("\n|")) {
            return renderMarkdownTable(sub, sIdx)
          }
          if (animated) {
            return <span key={sIdx}>{renderAnimatedInlineMarkdown(sub)}</span>
          }
          return <span key={sIdx}>{renderPlainInlineMarkdown(sub)}</span>
        })
      }

      if (animated) {
        return <span key={partIndex}>{renderAnimatedInlineMarkdown(part)}</span>
      }

      return <span key={partIndex}>{renderPlainInlineMarkdown(part)}</span>
    })
  }

  // Extract quick chips from combined content
  const combinedContent = content || ""
  const { cleanedText, chips } = extractQuickChips(combinedContent)

  // Split cleanedText into static and animating
  const currentStatic = isStreaming ? cleanedText.slice(0, staticContent.length) : cleanedText
  const currentAnimating = isStreaming ? cleanedText.slice(staticContent.length) : ""

  return (
    <div className={cn("text-sm whitespace-pre-wrap break-words leading-relaxed", className)} dir="rtl">
      {renderContent(currentStatic, false)}
      {renderContent(currentAnimating, true)}

      {/* Render 3 Contextual Quick Chips if present and not streaming or when ready */}
      {chips.length > 0 && (
        <div className="quick-chips flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-200/80" dir="rtl">
          {chips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onActionClick?.(chip)}
              className="quick-chip-btn flex items-center gap-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 text-right"
            >
              <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>{chip}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
