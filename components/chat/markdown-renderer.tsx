"use client"

import { cn } from "@/lib/utils"
import type React from "react"
import { useState, useEffect } from "react"
import { AnalysisWordSpan } from "./analysis-word-span"
import { Sparkles, Database, FolderCheck, PackageCheck } from "lucide-react"
import parse, { HTMLReactParserOptions, Element, DOMNode, domToReact } from "html-react-parser"
import { YouTubeEmbed } from "./youtube-embed"
import { extractYouTubeVideoId, TRAINING_PRODUCTS } from "@/lib/training-videos"

interface MarkdownRendererProps {
  content: string
  className?: string
  isStreaming?: boolean
  onActionClick?: (action: string) => void
  style?: React.CSSProperties
}

function ProductChatImage({ src, alt }: { src: string; alt?: string }) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [triedExts, setTriedExts] = useState<string[]>([])
  const [triedApiFallback, setTriedApiFallback] = useState(false)

  useEffect(() => {
    setCurrentSrc(src)
    setTriedExts([])
    setTriedApiFallback(false)
  }, [src])

  // Extract possible SKU from src or alt
  const detectedSku =
    currentSrc.match(/(?:products\/|^|id=)(\d{4,6})/i)?.[1] ||
    alt?.match(/(\d{4,6})/)?.[1] ||
    null

  const handleError = async () => {
    // 1. If it was a local /products/ file, try alternate extensions
    const match = currentSrc.match(/^(.*\/products\/[^.]+)\.([a-zA-Z0-9]+)$/)
    if (match) {
      const basePath = match[1]
      const currentExt = match[2].toLowerCase()
      const candidateExts = ["jpg", "png", "jpeg", "webp", "svg"]
      const nextExt = candidateExts.find((ext) => ext !== currentExt && !triedExts.includes(ext))
      if (nextExt) {
        setTriedExts((prev) => [...prev, currentExt])
        setCurrentSrc(`${basePath}.${nextExt}`)
        return
      }
    }

    // 2. If alternate extensions failed or it was external, try API lookup for the SKU to get the opposite source
    if (detectedSku && !triedApiFallback) {
      setTriedApiFallback(true)
      try {
        const res = await fetch(`/api/products/lookup?sku=${detectedSku}`)
        if (res.ok) {
          const data = await res.json()
          // If current was external and failed, try localImageUrl
          if (currentSrc.startsWith("http") && data.localImageUrl && data.localImageUrl !== currentSrc) {
            setCurrentSrc(data.localImageUrl)
            return
          }
          // If current was local and failed, try sheetImageUrl
          if (data.sheetImageUrl && data.sheetImageUrl !== currentSrc) {
            setCurrentSrc(data.sheetImageUrl)
            return
          }
        }
      } catch (e) {
        console.warn("Product image fallback lookup failed:", e)
      }
    }

    // 3. Fallback to default building material svg
    if (currentSrc !== "/products/default-building-material.svg") {
      setCurrentSrc("/products/default-building-material.svg")
    }
  }

  const altTitle = alt && alt !== "null" && alt !== "undefined" ? alt : "תמונת מוצר סבן"
  const isLocalStorage = currentSrc.startsWith("/products/") && !currentSrc.includes("default-building-material")
  const isSheetStorage = currentSrc.startsWith("http")

  return (
    <span className="block my-3 max-w-sm rounded-2xl overflow-hidden shadow-lg border border-slate-700/60 bg-slate-900 group relative">
      <div className="relative overflow-hidden bg-slate-950/60 min-h-[160px] flex items-center justify-center">
        <img
          src={currentSrc}
          alt={altTitle}
          className="w-full h-auto object-cover max-h-72 transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={handleError}
        />
        {/* Source badge */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10" dir="rtl">
          {isLocalStorage ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border shadow-xs text-emerald-300 bg-emerald-950/85 border-emerald-500/40">
              <FolderCheck className="w-3 h-3 text-emerald-400" />
              <span>מאגר מקומי</span>
            </span>
          ) : isSheetStorage ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border shadow-xs text-sky-300 bg-sky-950/85 border-sky-500/40">
              <Database className="w-3 h-3 text-sky-400" />
              <span>גיליון מילון_לוגיסטי</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border shadow-xs text-slate-300 bg-slate-900/85 border-slate-600/40">
              <PackageCheck className="w-3 h-3 text-amber-400" />
              <span>סבן חומרי בניין</span>
            </span>
          )}
        </div>
      </div>
      {altTitle && (
        <span className="block px-3 py-2 text-xs font-bold text-slate-200 bg-slate-950/95 text-center border-t border-slate-800 flex items-center justify-between" dir="rtl">
          <span className="truncate">{altTitle}</span>
          {detectedSku && (
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60 shrink-0">
              מק״ט {detectedSku}
            </span>
          )}
        </span>
      )}
    </span>
  )
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

        // Table container and elements
        if (domNode.name === "table") {
          return (
            <div className="overflow-x-auto my-3 rounded-xl border border-slate-200/90 shadow-xs bg-white" dir="rtl">
              <table className={cn("w-full text-right text-xs divide-y divide-slate-200", domNode.attribs.class, domNode.attribs.className)}>
                {domToReact(domNode.children as DOMNode[], parseOptions)}
              </table>
            </div>
          )
        }

        if (domNode.name === "thead") {
          return (
            <thead className={cn("bg-slate-100/90 text-slate-800 font-extrabold border-b border-slate-200", domNode.attribs.class, domNode.attribs.className)}>
              {domToReact(domNode.children as DOMNode[], parseOptions)}
            </thead>
          )
        }

        if (domNode.name === "tbody") {
          return (
            <tbody className={cn("divide-y divide-slate-100 font-medium bg-white", domNode.attribs.class, domNode.attribs.className)}>
              {domToReact(domNode.children as DOMNode[], parseOptions)}
            </tbody>
          )
        }

        if (domNode.name === "tr") {
          return (
            <tr className={cn("hover:bg-sky-50/40 transition-colors", domNode.attribs.class, domNode.attribs.className)}>
              {domToReact(domNode.children as DOMNode[], parseOptions)}
            </tr>
          )
        }

        if (domNode.name === "th") {
          return (
            <th className={cn("p-2.5 whitespace-nowrap font-extrabold text-slate-800 text-right text-xs", domNode.attribs.class, domNode.attribs.className)}>
              {domToReact(domNode.children as DOMNode[], parseOptions)}
            </th>
          )
        }

        if (domNode.name === "td") {
          return (
            <td className={cn("p-2.5 whitespace-nowrap text-slate-700 text-right text-xs", domNode.attribs.class, domNode.attribs.className)}>
              {domToReact(domNode.children as DOMNode[], parseOptions)}
            </td>
          )
        }

        if (domNode.name === "img") {
          const src = domNode.attribs.src || ""
          const alt = domNode.attribs.alt || "תמונת מוצר סבן"
          return <ProductChatImage key={domNode.attribs.key || src} src={src} alt={alt} />
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

      // Check for images: ![alt](url)
      const imageMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/)
      if (imageMatch) {
        const altText = imageMatch[1] || "תמונת מוצר סבן"
        const imgUrl = imageMatch[2]
        elements.push(
          <ProductChatImage key={`img-${keyIndex++}`} src={imgUrl} alt={altText} />
        )
        remaining = remaining.slice(imageMatch[0].length)
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
      const nextSpecial = remaining.search(/[`*[\]()!]/)
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

      // Check for images: ![alt](url)
      const animatedImageMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/)
      if (animatedImageMatch) {
        const altText = animatedImageMatch[1] || "תמונת מוצר סבן"
        const imgUrl = animatedImageMatch[2]
        elements.push(
          <ProductChatImage key={`anim-img-${keyIndex++}`} src={imgUrl} alt={altText} />
        )
        remaining = remaining.slice(animatedImageMatch[0].length)
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
      const nextSpecial = remaining.search(/[`*[\]()!]/)
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
      <div key={key} className="overflow-x-auto my-3 rounded-xl border border-slate-200/90 shadow-xs bg-white" dir="rtl">
        <table className="w-full text-right text-xs divide-y divide-slate-200">
          <thead className="bg-slate-100/90 text-slate-800 font-extrabold border-b border-slate-200">
            <tr>
              {headerCols.map((col, idx) => (
                <th key={idx} className="p-2.5 whitespace-nowrap text-right font-extrabold text-slate-800">
                  {renderPlainInlineMarkdown(col)}
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
              const isSummaryRow = cols.some((c) => c.includes("סה״כ") || c.includes('סה"כ') || c.includes("סיכום"))

              return (
                <tr
                  key={rIdx}
                  className={cn(
                    "transition-colors",
                    isSummaryRow
                      ? "bg-slate-100/80 font-bold border-t-2 border-slate-300 text-slate-900"
                      : "hover:bg-sky-50/50"
                  )}
                >
                  {cols.map((col, cIdx) => (
                    <td
                      key={cIdx}
                      className={cn(
                        "p-2.5 text-right whitespace-nowrap",
                        cIdx === 0 ? "font-bold text-slate-800" : "text-slate-600",
                        isSummaryRow && "text-slate-900 font-bold"
                      )}
                    >
                      {renderPlainInlineMarkdown(col)}
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

  // Parse text and render embedded YouTube videos seamlessly when links are present
  const renderTextWithYouTubeVideos = (text: string, partIndex: number, animated: boolean) => {
    // Matches markdown YouTube links: [title](url) or standalone YouTube URLs
    const ytRegex = /(?:\[([^\]]+)\]\((https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}[^)]*)\)|(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}(?:[^\s\n()<>]*)))/g

    if (!ytRegex.test(text)) {
      return animated ? renderAnimatedInlineMarkdown(text) : renderPlainInlineMarkdown(text)
    }

    ytRegex.lastIndex = 0

    const chunks: React.ReactNode[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = ytRegex.exec(text)) !== null) {
      const matchIndex = match.index
      const fullMatch = match[0]
      const linkTitle = match[1]
      const rawUrl = match[2] || match[3] || fullMatch

      if (matchIndex > lastIndex) {
        const textBefore = text.slice(lastIndex, matchIndex)
        chunks.push(
          <span key={`txt-${partIndex}-${lastIndex}`}>
            {animated ? renderAnimatedInlineMarkdown(textBefore) : renderPlainInlineMarkdown(textBefore)}
          </span>,
        )
      }

      const videoId = extractYouTubeVideoId(rawUrl)
      if (videoId) {
        const matchedProduct = TRAINING_PRODUCTS.find((p) => p.videoId === videoId)
        const displayTitle = linkTitle || matchedProduct?.videoTitle || matchedProduct?.name || "סרטון הדרכה מקצועי | ח. סבן חומרי בניין"

        chunks.push(
          <div key={`yt-${partIndex}-${matchIndex}`} className="w-full my-2.5">
            <YouTubeEmbed
              videoId={videoId}
              url={rawUrl}
              title={displayTitle}
            />
          </div>,
        )
      } else {
        chunks.push(
          <span key={`fallback-${partIndex}-${matchIndex}`}>
            {animated ? renderAnimatedInlineMarkdown(fullMatch) : renderPlainInlineMarkdown(fullMatch)}
          </span>,
        )
      }

      lastIndex = matchIndex + fullMatch.length
    }

    if (lastIndex < text.length) {
      const textAfter = text.slice(lastIndex)
      chunks.push(
        <span key={`txt-rem-${partIndex}-${lastIndex}`}>
          {animated ? renderAnimatedInlineMarkdown(textAfter) : renderPlainInlineMarkdown(textAfter)}
        </span>,
      )
    }

    return chunks
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
          // Pre-convert simple inline markdown bold/italic and markdown images if mixed inside HTML
          const processedHtml = part
            .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
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
          return (
            <span key={sIdx}>
              {renderTextWithYouTubeVideos(sub, sIdx, animated)}
            </span>
          )
        })
      }

      return (
        <span key={partIndex}>
          {renderTextWithYouTubeVideos(part, partIndex, animated)}
        </span>
      )
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
