"use client"

import { cn } from "@/lib/utils"
import type React from "react"
import { useState, useEffect } from "react"
import { AnalysisWordSpan } from "./analysis-word-span"
import { Sparkles } from "lucide-react"
import parse, { HTMLReactParserOptions, Element, DOMNode, domToReact } from "html-react-parser"

interface MarkdownRendererProps {
  content: string
  className?: string
  isStreaming?: boolean
  onActionClick?: (action: string) => void
  style?: React.CSSProperties
}

export function MarkdownRenderer({
  content,
  className,
  isStreaming = false,
  onActionClick,
  style,
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

  // Extract quick chips (either from Markdown 🔘 [ ... ] or standalone)
  const extractMarkdownChips = (text: string): { cleanedText: string; chips: string[] } => {
    let workingText = text
    const chips: string[] = []

    // Look for Markdown button syntax: 🔘 `[ ... ]` or 🔘 [ ... ]
    const mdButtonRegex = /🔘\s*`?\[\s*([^\]`]+?)\s*\]`?/gi
    let mdMatch
    const matchedSpans: string[] = []
    while ((mdMatch = mdButtonRegex.exec(workingText)) !== null) {
      matchedSpans.push(mdMatch[0])
      const chipText = mdMatch[1].trim()
      if (chipText && !chips.includes(chipText)) {
        chips.push(chipText)
      }
    }

    if (matchedSpans.length > 0) {
      workingText = workingText.replace(/---\s*(\n\s*🔘[\s\S]*)$/, "").trim()
      for (const span of matchedSpans) {
        workingText = workingText.replace(span, "").trim()
      }
    }

    return { cleanedText: workingText, chips }
  }

  // Helper to extract text from a DOMNode
  const getDomNodeText = (node: any): string => {
    if (!node) return ""
    if (node.type === "text") return node.data || ""
    if (node.children && Array.isArray(node.children)) {
      return node.children.map(getDomNodeText).join("")
    }
    return ""
  }

  // HTML parser options with Tailwind styling and interactive buttons
  const parseOptions: HTMLReactParserOptions = {
    replace(domNode) {
      if (domNode instanceof Element) {
        // Interactive Quick Chip Button
        if (domNode.name === "button") {
          const rawClass = domNode.attribs.class || domNode.attribs.className || ""
          const buttonText = getDomNodeText(domNode).trim()

          return (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (buttonText) onActionClick?.(buttonText)
              }}
              className={cn(
                "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer shadow-xs transition-all active:scale-95 text-right my-1",
                "bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 text-slate-700",
                rawClass
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>{domToReact(domNode.children as DOMNode[], parseOptions)}</span>
            </button>
          )
        }

        // Table container
        if (domNode.name === "table") {
          return (
            <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 shadow-xs" dir="rtl">
              <table className={cn("w-full text-right text-xs", domNode.attribs.class, domNode.attribs.className)}>
                {domToReact(domNode.children as DOMNode[], parseOptions)}
              </table>
            </div>
          )
        }

        // Ordered List
        if (domNode.name === "ol") {
          return (
            <ol className={cn("list-decimal list-inside space-y-1.5 my-2 pr-2 font-medium text-slate-700 text-xs sm:text-sm", domNode.attribs.class, domNode.attribs.className)}>
              {domToReact(domNode.children as DOMNode[], parseOptions)}
            </ol>
          )
        }

        // Unordered List
        if (domNode.name === "ul") {
          return (
            <ul className={cn("list-disc list-inside space-y-1.5 my-2 pr-2 font-medium text-slate-700 text-xs sm:text-sm", domNode.attribs.class, domNode.attribs.className)}>
              {domToReact(domNode.children as DOMNode[], parseOptions)}
            </ul>
          )
        }

        // Quick chips container
        if (domNode.attribs.class?.includes("quick-chips") || domNode.attribs.className?.includes("quick-chips")) {
          return (
            <div className={cn("quick-chips flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-200/80", domNode.attribs.class, domNode.attribs.className)} dir="rtl">
              {domToReact(domNode.children as DOMNode[], parseOptions)}
            </div>
          )
        }
      }
    },
  }

  // Check if string contains HTML tags
  const hasHtml = (str: string) => {
    return /<\/?(?:div|p|span|table|thead|tbody|tr|th|td|ol|ul|li|button|h[1-6]|strong|em|b|i|br|pre|code|hr|a)\b/i.test(str)
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

      // Check for HTML content
      if (hasHtml(part)) {
        try {
          // Pre-convert simple inline markdown bold/italic if mixed inside HTML
          const processedHtml = part
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, "$1<em>$2</em>$3")

          return (
            <div key={partIndex} className="my-1.5 whitespace-normal break-words leading-relaxed html-rendered-content" dir="rtl">
              {parse(processedHtml, parseOptions)}
            </div>
          )
        } catch (e) {
          console.error("HTML parsing error, falling back to markdown:", e)
        }
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
  const { cleanedText, chips } = extractMarkdownChips(combinedContent)

  // Split cleanedText into static and animating
  const currentStatic = isStreaming ? cleanedText.slice(0, staticContent.length) : cleanedText
  const currentAnimating = isStreaming ? cleanedText.slice(staticContent.length) : ""

  return (
    <div
      className={cn("text-sm whitespace-pre-wrap break-words leading-relaxed", className)}
      style={style}
      dir="rtl"
    >
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
