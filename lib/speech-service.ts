"use client"

export function cleanTextForSpeech(text: string): string {
  if (!text) return ""

  return text
    // Remove Markdown buttons like 🔘 [ ... ]
    .replace(/🔘\s*`?\[\s*([^\]`]+?)\s*\]`?/gi, "")
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    // Remove links [title](url) -> title
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove Markdown headers (#, ##, ###)
    .replace(/^#+\s+/gm, "")
    // Remove bold/italics
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    // Remove list symbols
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    // Remove horizontal rules
    .replace(/---+/g, "")
    // Remove table pipes
    .replace(/\|/g, " ")
    // Clean emojis that might confuse speech
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    // Normalize spaces
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Finds the best available Hebrew female voice in the browser.
 */
export function getHebrewFemaleVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null
  }

  const voices = window.speechSynthesis.getVoices()
  if (!voices || voices.length === 0) return null

  // Priority 1: Known Hebrew female voices (Carmit on Apple, Hila on Windows/Edge, Google he-IL female)
  const femaleHebrewKeywords = ["carmit", "כרמית", "hila", "הילה", "hadar", "הדר", "female", "אישה"]
  for (const voice of voices) {
    const lang = voice.lang?.toLowerCase() || ""
    const name = voice.name?.toLowerCase() || ""
    if (lang.includes("he") || lang.includes("iw")) {
      for (const kw of femaleHebrewKeywords) {
        if (name.includes(kw)) {
          return voice
        }
      }
    }
  }

  // Priority 2: Google Hebrew voice (high natural quality on Android / Chrome)
  const googleHebrew = voices.find(
    (v) => (v.lang?.startsWith("he") || v.lang?.startsWith("iw")) && v.name?.toLowerCase().includes("google"),
  )
  if (googleHebrew) return googleHebrew

  // Priority 3: Any Hebrew voice
  const anyHebrew = voices.find(
    (v) => v.lang?.startsWith("he") || v.lang?.startsWith("iw") || v.name?.includes("עברית"),
  )
  if (anyHebrew) return anyHebrew

  return null
}

/**
 * Speaks text using Web Speech API with Hebrew female voice settings.
 */
export function speakWithBrowserSynthesis(
  text: string,
  onEnd?: () => void,
  onError?: (err: any) => void,
): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onError?.(new Error("Speech synthesis not supported"))
    return () => {}
  }

  window.speechSynthesis.cancel()

  const clean = cleanTextForSpeech(text)
  if (!clean) {
    onEnd?.()
    return () => {}
  }

  const utterance = new SpeechSynthesisUtterance(clean)
  utterance.lang = "he-IL"
  utterance.pitch = 1.08 // Slightly higher pitch for natural feminine warmth
  utterance.rate = 0.98 // Slightly measured, clear executive cadence

  const femaleVoice = getHebrewFemaleVoice()
  if (femaleVoice) {
    utterance.voice = femaleVoice
  }

  utterance.onend = () => {
    onEnd?.()
  }

  utterance.onerror = (e) => {
    // Interrupted is normal when user cancels or starts new speech
    if (e.error !== "interrupted" && e.error !== "canceled") {
      console.warn("Speech synthesis error:", e)
      onError?.(e)
    } else {
      onEnd?.()
    }
  }

  window.speechSynthesis.speak(utterance)

  return () => {
    window.speechSynthesis.cancel()
  }
}
