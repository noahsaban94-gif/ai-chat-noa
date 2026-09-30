"use client"

/**
 * AudioService - Web Audio API based sound effects synthesizer
 * Generates sparkling, futuristic, magical micro-interaction sounds
 * without needing external asset files that could fail or lag.
 */

class AudioService {
  private ctx: AudioContext | null = null
  private muted: boolean = false

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null
    if (this.muted) return null

    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (AudioCtx) {
          this.ctx = new AudioCtx()
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {})
      }
      return this.ctx
    } catch {
      return null
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted
  }

  public isMuted(): boolean {
    return this.muted
  }

  /**
   * Sound 1: Flying / Swoosh - Airy ascending shimmer as Noa flies in an arc
   */
  public playFlyMagic() {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      osc.type = "sine"
      // Frequency glide upwards: 400Hz -> 880Hz -> 1046Hz
      osc.frequency.setValueAtTime(420, now)
      osc.frequency.exponentialRampToValueAtTime(784, now + 0.35)
      osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.65)

      // Lowpass filter for smooth airy feel
      filter.type = "lowpass"
      filter.frequency.setValueAtTime(1200, now)
      filter.frequency.exponentialRampToValueAtTime(3200, now + 0.4)

      // Envelope
      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.09, now + 0.1)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.72)
    } catch {
      // Audio error silent fallback
    }
  }

  /**
   * Sound 2: Magic Sparkle / Ping - High crystalline sparkle chime when casting over target card
   */
  public playMagicSparkle() {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      // Harmonic cascade (pentatonic bell tones: C6, E6, G6, B6, C7)
      const freqs = [1046.5, 1318.51, 1567.98, 1975.53, 2093.0]

      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = index % 2 === 0 ? "sine" : "triangle"
        osc.frequency.setValueAtTime(freq, now + index * 0.04)

        gain.gain.setValueAtTime(0.001, now + index * 0.04)
        gain.gain.linearRampToValueAtTime(0.08, now + index * 0.04 + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.04 + 0.38)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + index * 0.04)
        osc.stop(now + index * 0.04 + 0.4)
      })
    } catch {
      // Audio error silent fallback
    }
  }

  /**
   * Sound 3: Happy Spin / Return Chime - Whimsical cheerful arpeggio when spinning and completing
   */
  public playSuccessChime() {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const chord = [523.25, 659.25, 783.99, 1046.5] // C5 major

      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = "sine"
        osc.frequency.setValueAtTime(freq, now + idx * 0.05)

        gain.gain.setValueAtTime(0.001, now + idx * 0.05)
        gain.gain.linearRampToValueAtTime(0.07, now + idx * 0.05 + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.5)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + idx * 0.05)
        osc.stop(now + idx * 0.05 + 0.52)
      })
    } catch {
      // Audio error silent fallback
    }
  }
}

export const audioService = new AudioService()
