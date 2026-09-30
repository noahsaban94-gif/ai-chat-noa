"use client"

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { audioService } from "@/lib/audio-service"
import { Sparkles, Wand2 } from "lucide-react"

export type CompanionExpression = "smile" | "blink" | "wink" | "excited" | "focus"

export interface TargetPosition {
  x: number
  y: number
  nodeId?: string
  actionType?: "create_node" | "update_node"
  nodeTitle?: string
}

export interface NoaCanvasCompanionHandle {
  flyToTarget: (target: TargetPosition, onReach?: () => void) => Promise<void>
  express: (expression: CompanionExpression, durationMs?: number) => void
  say: (message: string, durationMs?: number) => void
}

export interface NoaCanvasCompanionProps {
  /** Target position when controlled via props */
  targetPosition?: { x: number; y: number } | null
  /** Whether Noa is triggered to fly via props */
  isFlying?: boolean
  /** Callback fired when Noa arrives at the card */
  onArrival?: () => void
  /** Initial home dock position relative to container or window */
  dockPosition?: { x: number; y: number }
  className?: string
  onAnimationComplete?: () => void
}

export const NoaCanvasCompanion = forwardRef<NoaCanvasCompanionHandle, NoaCanvasCompanionProps>(
  (
    {
      targetPosition = null,
      isFlying = false,
      onArrival,
      dockPosition = { x: 30, y: 110 },
      className = "",
      onAnimationComplete,
    },
    ref
  ) => {
    // Current state
    const [state, setState] = useState<"idle" | "flying" | "casting" | "spinning" | "returning">("idle")
    const [expression, setExpression] = useState<CompanionExpression>("smile")
    const [speechBubble, setSpeechBubble] = useState<string | null>("היי ראמי! אני כאן לערוך ולבנות ענפים 🪄")
    const [activeTarget, setActiveTarget] = useState<TargetPosition | null>(null)
    const [showPingRing, setShowPingRing] = useState(false)
    const [sparkleParticles, setSparkleParticles] = useState<{ id: number; angle: number; distance: number }[]>([])

    // Motion position coordinates
    const [currentPos, setCurrentPos] = useState({ x: dockPosition.x, y: dockPosition.y })
    const homePosRef = useRef(dockPosition)

    useEffect(() => {
      homePosRef.current = dockPosition
      if (state === "idle") {
        setCurrentPos(dockPosition)
      }
    }, [dockPosition, state])

    // Natural blinking loop while idle
    useEffect(() => {
      if (state !== "idle") return

      const blinkInterval = setInterval(() => {
        if (Math.random() > 0.3) {
          setExpression("blink")
          setTimeout(() => {
            setExpression("smile")
          }, 240)
        } else if (Math.random() > 0.6) {
          setExpression("wink")
          setTimeout(() => {
            setExpression("smile")
          }, 450)
        }
      }, 3500)

      return () => clearInterval(blinkInterval)
    }, [state])

    // Auto-hide speech bubble after delay
    useEffect(() => {
      if (!speechBubble) return
      const t = setTimeout(() => {
        setSpeechBubble(null)
      }, 4500)
      return () => clearTimeout(t)
    }, [speechBubble])

    // Reusable flight sequence
    const executeFly = useCallback(
      async (target: TargetPosition, onReach?: () => void) => {
        setActiveTarget(target)
        setState("flying")
        setExpression("focus")
        setSpeechBubble(
          target.actionType === "create_node"
            ? `יוצרת ענף חדש: ${target.nodeTitle || "שלב חדש"} 🪄`
            : `מעדכנת את צומת ${target.nodeTitle || "הענף"} ✨`
        )

        // 1. Play magical flying sound
        audioService.playFlyMagic()

        // 2. Animate to target (offset so Noa floats slightly above-center of the card)
        const targetX = target.x - 36
        const targetY = target.y - 75

        setCurrentPos({ x: targetX, y: targetY })

        // Flight duration approx 800ms
        await new Promise((res) => setTimeout(res, 850))

        // 3. Arrived at target: Cast magic effect
        setState("casting")
        setExpression("excited")
        setShowPingRing(true)

        // Generate burst particles around the card
        const particles = Array.from({ length: 8 }).map((_, i) => ({
          id: Date.now() + i,
          angle: (i * 360) / 8,
          distance: 40 + Math.random() * 25,
        }))
        setSparkleParticles(particles)

        // Play magic sparkle chime
        audioService.playMagicSparkle()

        if (onReach) {
          onReach()
        }

        // Wait during casting pulse
        await new Promise((res) => setTimeout(res, 650))
        setShowPingRing(false)

        // 4. Joyful 360 spin
        setState("spinning")
        setExpression("wink")
        audioService.playSuccessChime()
        await new Promise((res) => setTimeout(res, 550))
        setSparkleParticles([])

        // 5. Return smoothly to dock
        setState("returning")
        setSpeechBubble("בוצע בהצלחה! הענף עודכן ❤️")
        setCurrentPos(homePosRef.current)
        audioService.playFlyMagic()

        await new Promise((res) => setTimeout(res, 850))

        // Back to idle
        setState("idle")
        setExpression("smile")
        setActiveTarget(null)
        if (onAnimationComplete) {
          onAnimationComplete()
        }
      },
      [onAnimationComplete]
    )

    // Declarative trigger via props: isFlying + targetPosition
    const lastTriggerRef = useRef(false)
    useEffect(() => {
      if (isFlying && !lastTriggerRef.current && targetPosition) {
        lastTriggerRef.current = true
        executeFly(
          {
            x: targetPosition.x,
            y: targetPosition.y,
            actionType: "update_node",
            nodeTitle: "כרטיס יעד",
          },
          () => {
            if (onArrival) {
              onArrival()
            }
          }
        ).finally(() => {
          lastTriggerRef.current = false
        })
      }
    }, [isFlying, targetPosition, onArrival, executeFly])

    // Expose flyToTarget and other API methods via Ref
    useImperativeHandle(ref, () => ({
      flyToTarget: async (target: TargetPosition, onReach?: () => void) => {
        return executeFly(target, onReach)
      },

      express: (exp: CompanionExpression, durationMs = 1500) => {
        setExpression(exp)
        if (durationMs > 0) {
          setTimeout(() => setExpression("smile"), durationMs)
        }
      },

      say: (msg: string, durationMs = 4000) => {
        setSpeechBubble(msg)
        if (durationMs > 0) {
          setTimeout(() => setSpeechBubble(null), durationMs)
        }
      },
    }))

    // Mascot click handler in idle mode
    const handleMascotClick = () => {
      if (state !== "idle") return
      audioService.playMagicSparkle()
      setExpression("excited")
      const phrases = [
        "נועה לשירותך בבונה הענפים! 🪄",
        "מוכנה להוסיף צומת אספקה חדש?",
        "מחסן 4 החרש ומחסן 1 התלמיד מסונכרנים! 🚚",
        "תגיד לי מה לעדכן ואני עפה לענף!",
      ]
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)]
      setSpeechBubble(randomPhrase)
      setTimeout(() => setExpression("smile"), 1500)
    }

    const isMoving = state === "flying" || state === "returning"

    return (
      <div
        className={`fixed z-50 transition-none ${className} ${
          isMoving ? "pointer-events-none" : "pointer-events-auto"
        }`}
        style={{
          left: `${currentPos.x}px`,
          top: `${currentPos.y}px`,
          transition: isMoving
            ? "left 0.85s cubic-bezier(0.34, 1.45, 0.64, 1), top 0.85s cubic-bezier(0.34, 1.25, 0.64, 1)"
            : "left 0.4s ease-out, top 0.4s ease-out",
        }}
      >
        {/* Floating motion container */}
        <motion.div
          animate={
            state === "idle"
              ? {
                  y: [-5, 5, -5],
                  rotate: [-2, 2, -2],
                  scale: [1, 1.025, 1],
                }
              : state === "flying"
              ? {
                  y: [-2, 2, -2],
                  rotate: [12, -4, 8],
                  scale: 1.12,
                }
              : state === "casting"
              ? {
                  scale: [1.1, 1.25, 1.15],
                  rotate: [0, 5, -5, 0],
                }
              : state === "spinning"
              ? {
                  rotate: 360,
                  scale: [1.1, 1.25, 1],
                }
              : {
                  y: [0, -3, 0],
                  scale: 1.05,
                }
          }
          transition={
            state === "idle"
              ? {
                  duration: 3.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : state === "spinning"
              ? {
                  duration: 0.55,
                  ease: "easeInOut",
                }
              : {
                  duration: 0.6,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
          }
          className="relative select-none flex flex-col items-center"
        >
          {/* Speech Bubble */}
          <AnimatePresence>
            {speechBubble && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.85 }}
                className="absolute -top-12 right-1/2 translate-x-1/2 whitespace-nowrap bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-xl border border-purple-200/80 text-stone-900 text-[11px] font-bold z-20 flex items-center gap-1.5 rtl pointer-events-none"
                style={{ direction: "rtl" }}
              >
                <Sparkles className="w-3 h-3 text-cyan-500 animate-pulse shrink-0" />
                <span>{speechBubble}</span>
                {/* Pointer tail */}
                <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/95 border-b border-r border-purple-200/80 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Target Pulsing Glow Ring on Target Card (When Casting) */}
          <AnimatePresence>
            {showPingRing && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0.9 }}
                animate={{ scale: 2.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeOut" }}
                className="absolute inset-0 rounded-full ring-4 ring-cyan-400 bg-cyan-400/20 blur-xs pointer-events-none -z-10"
              />
            )}
          </AnimatePresence>

          {/* Burst sparkle particles during cast */}
          {sparkleParticles.map((p) => {
            const rad = (p.angle * Math.PI) / 180
            const tx = Math.cos(rad) * p.distance
            const ty = Math.sin(rad) * p.distance
            return (
              <motion.div
                key={p.id}
                initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                animate={{ x: tx, y: ty, scale: [0, 1.4, 0], opacity: [1, 0.8, 0] }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="absolute w-2 h-2 rounded-full bg-gradient-to-tr from-cyan-300 via-amber-300 to-purple-400 shadow-md shadow-cyan-300/50 pointer-events-none"
              />
            )
          })}

          {/* Companion Mascot Body (Fluorescent Glass Cloud / Bubble) */}
          <button
            type="button"
            onClick={handleMascotClick}
            aria-label="נועה AI - עוזרת בונה ענפים"
            className="group relative cursor-pointer outline-none focus:ring-0 active:scale-95 transition-transform"
          >
            {/* Outer Fluorescent Atmosphere Glow */}
            <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-cyan-400/40 via-purple-500/40 to-pink-400/30 blur-md opacity-80 group-hover:opacity-100 transition-opacity animate-pulse" />

            {/* Glowing Flight Speed Tail (when flying) */}
            {isMoving && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: [0.4, 0.9, 0.4], scaleX: [1, 1.4, 1] }}
                transition={{ repeat: Infinity, duration: 0.4 }}
                className="absolute -right-5 top-1/2 -translate-y-1/2 w-8 h-4 rounded-full bg-gradient-to-l from-transparent via-cyan-400/60 to-purple-500/80 blur-xs -z-10"
              />
            )}

            {/* Main Glass Cloud / Orb Body */}
            <div className="relative w-16 h-14 sm:w-18 sm:h-16 rounded-[28px] bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-500 p-[2px] shadow-2xl shadow-purple-500/40 backdrop-blur-lg">
              {/* Inner Glass Surface with Specular Sheen */}
              <div className="relative w-full h-full rounded-[26px] bg-gradient-to-b from-white/35 via-white/10 to-purple-900/30 overflow-hidden flex items-center justify-center border border-white/40 shadow-inner">
                {/* Top Glass Specular Highlight Curve */}
                <div className="absolute top-1 left-2 right-2 h-3.5 rounded-full bg-gradient-to-b from-white/70 to-transparent blur-[0.5px]" />

                {/* SVG Mascot Expressive Face */}
                <svg
                  viewBox="0 0 64 52"
                  className="w-12 h-10 sm:w-14 sm:h-12 drop-shadow-sm select-none"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Left Cheek Blush */}
                  <ellipse cx="14" cy="32" rx="4.5" ry="2.5" fill="#f472b6" opacity="0.75" />

                  {/* Right Cheek Blush */}
                  <ellipse cx="50" cy="32" rx="4.5" ry="2.5" fill="#f472b6" opacity="0.75" />

                  {/* Left Eye */}
                  {expression === "blink" ? (
                    <path
                      d="M 17 26 Q 22 30 27 26"
                      stroke="#0f172a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  ) : expression === "wink" ? (
                    <path
                      d="M 17 26 Q 22 23 27 26"
                      stroke="#0f172a"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                    />
                  ) : (
                    <g>
                      {/* Pupil */}
                      <ellipse cx="22" cy="24" rx="4.5" ry="5.5" fill="#0f172a" />
                      {/* Cute Catchlight Sparkle */}
                      <circle cx="20.5" cy="22" r="1.8" fill="#ffffff" />
                      <circle cx="23.8" cy="26" r="0.9" fill="#38bdf8" />
                    </g>
                  )}

                  {/* Right Eye */}
                  {expression === "blink" ? (
                    <path
                      d="M 37 26 Q 42 30 47 26"
                      stroke="#0f172a"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  ) : (
                    <g>
                      {/* Pupil */}
                      <ellipse cx="42" cy="24" rx="4.5" ry="5.5" fill="#0f172a" />
                      {/* Cute Catchlight Sparkle */}
                      <circle cx="40.5" cy="22" r="1.8" fill="#ffffff" />
                      <circle cx="43.8" cy="26" r="0.9" fill="#38bdf8" />
                    </g>
                  )}

                  {/* Mouth Animation */}
                  {expression === "excited" ? (
                    <path
                      d="M 27 33 Q 32 40 37 33 Z"
                      fill="#ec4899"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  ) : expression === "wink" ? (
                    <path
                      d="M 28 32 Q 32 37 36 32"
                      stroke="#0f172a"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  ) : (
                    /* Sweet Smile */
                    <path
                      d="M 28 32 Q 32 36 36 32"
                      stroke="#0f172a"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Cute Forehead Magic Star Sparkle */}
                  <path
                    d="M 32 8 Q 32 13 35 13 Q 32 13 32 18 Q 32 13 29 13 Q 32 13 32 8 Z"
                    fill="#fef08a"
                    opacity="0.95"
                  />
                </svg>
              </div>
            </div>

            {/* Small Floating Wand/Sparkle Orb on shoulder */}
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-tr from-yellow-300 via-amber-400 to-pink-500 border border-white shadow-md flex items-center justify-center animate-bounce">
              <Wand2 className="w-2.5 h-2.5 text-stone-900 drop-shadow-2xs" />
            </div>

            {/* Status indicator ring */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.2 rounded-full bg-stone-900/80 backdrop-blur-xs border border-white/30 text-[9px] font-bold text-cyan-300 shadow-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>נועה</span>
            </div>
          </button>
        </motion.div>
      </div>
    )
  }
)

NoaCanvasCompanion.displayName = "NoaCanvasCompanion"
