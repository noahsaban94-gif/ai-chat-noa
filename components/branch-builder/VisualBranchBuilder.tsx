"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
  Sparkles,
  Plus,
  Send,
  Layers,
  ArrowRight,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Volume2,
  VolumeX,
  MessageSquare,
  Wand2,
  Settings2,
  Trash2,
  Edit3,
  Play,
  RotateCcw,
  Boxes,
  FileText,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { NoaCanvasCompanion, type NoaCanvasCompanionHandle } from "./noa-canvas-companion"
import { CanvasFlightSimulation } from "./CanvasFlightSimulation"
import { WhatsAppReplySimulator } from "./WhatsAppReplySimulator"
import { audioService } from "@/lib/audio-service"
import { cn } from "@/lib/utils"

export interface WorkflowNode {
  id: string
  title: string
  subtitle: string
  type: "intake" | "warehouse_yard" | "warehouse_store" | "transport" | "qa" | "delivery"
  status: "idle" | "active" | "completed" | "warning"
  assignee: string
  warehouse?: string
  details: string[]
  x: number
  y: number
  lastUpdated?: string
  isHighlighted?: boolean
}

export interface WorkflowEdge {
  id: string
  from: string
  to: string
  label?: string
}

// 4 ענפי הליבה הרשמיים של נועה AI עבור מענה ללקוחות בוואטסאפ (טקסט פרומפט Make.com)
export const CORE_WHATSAPP_NODES: WorkflowNode[] = [
  {
    id: "node-hub",
    title: "מרכזת פניות וואטסאפ (Make.com)",
    subtitle: "פנייה נכנסת: {{1.name}} | {{1.from}}",
    type: "intake",
    status: "active",
    assignee: "נועה AI ❤️",
    details: [
      "פנייה אישית בשם: 'שלום {{1.name}} 🏗️'",
      "מענה תמציתי ומקצועי (עד 3-4 פסקאות קצרות)",
      "עיצוב לוואטסאפ: כוכביות (*...*) ואימוג'ים מותאמים",
      "סיום תמיד בשאלה מקדמת אחת",
    ],
    x: 60,
    y: 220,
    lastUpdated: "סנכרון Webhook פעיל",
  },
  {
    id: "node-branch-materials",
    title: "1. הזמנת חומרים והובלה לאתר",
    subtitle: "אספקה מהירה | חכמת (מנוף) ועלי (פלטה)",
    type: "warehouse_yard",
    status: "idle",
    assignee: "חכמת (מנוף) / עלי (פלטה)",
    warehouse: "חצר 4 החרש",
    details: [
      "אספקה מהירה: ברזל, בלוקים, מלט, טיט, חול וסומסום",
      "בירור מיד: כתובת אספקה מדויקת (עיר ורחוב)",
      "בירור כמויות ושעת הגעה (סבב בוקר/צהריים)",
      "ציון זמינות משאיות מנוף (חכמת) ופלטה (עלי)",
    ],
    x: 480,
    y: 40,
    lastUpdated: "ענף ליבה 1",
  },
  {
    id: "node-branch-containers",
    title: "2. שירות מכולות פסולת",
    subtitle: "מכולות 6/8/12 קוב | משאית רמסע",
    type: "transport",
    status: "idle",
    assignee: "מערך רמסע ופינוי פסולת",
    details: [
      "בירור פעולה: 📍 הצבה חדשה / 🔄 החלפה / 🚛 הוצאה ופינוי",
      "בירור גודל: 📦 6 קוב / 📦 8 קוב / 📦 12 קוב",
      "⚠️ תזכורת תפעולית: נדרשת גישה פנויה ורחבה לרמסע",
    ],
    x: 480,
    y: 200,
    lastUpdated: "ענף ליבה 2",
  },
  {
    id: "node-branch-pickup",
    title: "3. איסוף עצמי ושעות פעילות",
    subtitle: "חצר המכר כפר ברא | ניווט Waze",
    type: "warehouse_store",
    status: "idle",
    assignee: "חצר המכר (כפר ברא)",
    warehouse: "חצר כפר ברא",
    details: [
      "א'–ה': 06:00–17:00 | ימי שישי: 06:00–13:00",
      "מיקום: חצר המכר, אזור תעשייה כפר ברא",
      "ניווט Waze: https://waze.com/ul?q=ח.סבן+כפר+ברא",
    ],
    x: 480,
    y: 360,
    lastUpdated: "ענף ליבה 3",
  },
  {
    id: "node-branch-pricing",
    title: "4. שאלות מחיר או בירור מורכב",
    subtitle: "העברה אישית לראמי מסארווה (050-886-0896)",
    type: "qa",
    status: "idle",
    assignee: "ראמי מסארווה (050-886-0896)",
    details: [
      "איסור מוחלט על המצאת מחירים סופיים",
      "נוסח מחייב: 'העברתי את הפרטים לראמי מסארווה (050-886-0896)...'",
      "חזרה תוך מספר דקות עם מחיר מדויק וסגירת אספקה",
    ],
    x: 480,
    y: 520,
    lastUpdated: "ענף ליבה 4",
  },
]

export const CORE_WHATSAPP_EDGES: WorkflowEdge[] = [
  { id: "edge-w1", from: "node-hub", to: "node-branch-materials", label: "1. חומרים והובלה" },
  { id: "edge-w2", from: "node-hub", to: "node-branch-containers", label: "2. מכולות ופסולת" },
  { id: "edge-w3", from: "node-hub", to: "node-branch-pickup", label: "3. איסוף ושעות" },
  { id: "edge-w4", from: "node-hub", to: "node-branch-pricing", label: "4. מחיר ובירור" },
]

// Initial workflow tailored specifically for H. Saban Building Materials (Logistics Ops)
const INITIAL_NODES: WorkflowNode[] = [
  {
    id: "node-intake",
    title: "1. קליטת הזמנה מוואטסאפ",
    subtitle: "זיהוי מק\"טים ושיקוף מחירים",
    type: "intake",
    status: "completed",
    assignee: "נועה AI ❤️",
    details: ["הזמנת שטיכמוס / עופר כץ", "אימות מק\"טים מול הקטלוג", "סנכרון פיקדונות בלה (60002)"],
    x: 80,
    y: 160,
    lastUpdated: "הושלם לפני 10 דק'",
  },
  {
    id: "node-yard",
    title: "2. ליקוט חצר ומגרש (מחסן 4)",
    subtitle: "מחסן 4 החרש — אגרגטים וגבס",
    type: "warehouse_yard",
    status: "active",
    assignee: "אורן (מלקט) / תמיר",
    warehouse: "מחסן 4 החרש",
    details: ["בלה סומסום 700 ק\"ג (11511)", "מלט 25 ק\"ג נשר (10002)", "ניצב 70/300 ומסלול (מס' 8)"],
    x: 440,
    y: 80,
    lastUpdated: "בליקוט שטח",
  },
  {
    id: "node-store",
    title: "3. ליקוט חנות וגמר (סניף התלמיד)",
    subtitle: "מחסן 1 התלמיד / דלפק",
    type: "warehouse_store",
    status: "active",
    assignee: "שי (מלקט דלפק)",
    warehouse: "מחסן 1 התלמיד",
    details: ["סופרקריל לבן 18 ליטר (53009)", "שפכטל יוניפלוט קנאוף (14290)", "ברגי גבס ופחפח ורו"],
    x: 440,
    y: 380,
    lastUpdated: "מוכן להעמסה",
  },
  {
    id: "node-transport",
    title: "4. שיבוץ נהג וסבב פריקה",
    subtitle: "תיאום מנוף / חלוקות גבס",
    type: "transport",
    status: "idle",
    assignee: "חכמת (מנוף) / עלי (גבס)",
    details: ["סבב בוקר 07:00 אתר שיבת ציון", "פריקת מנוף קומה 3", "אישור מנהל תפעול (ראמי)"],
    x: 820,
    y: 220,
    lastUpdated: "ממתין להשלמת ליקוט",
  },
  {
    id: "node-qa",
    title: "5. בקרת איכות ותעודת משלוח",
    subtitle: "חתימת לקוח ודוח סוף יום 18:00",
    type: "qa",
    status: "idle",
    assignee: "ראמי ונועה",
    details: ["בדיקת שלמות משטחים ושקים", "חתימה דיגיטלית בתעודה", "שיקוף לקבוצת הוואטסאפ"],
    x: 1200,
    y: 220,
    lastUpdated: "סופי",
  },
]

const INITIAL_EDGES: WorkflowEdge[] = [
  { id: "e1", from: "node-intake", to: "node-yard", label: "פיצול חצר" },
  { id: "e1b", from: "node-intake", to: "node-store", label: "פיצול חנות" },
  { id: "e2", from: "node-yard", to: "node-transport", label: "מוכן לחבירה" },
  { id: "e3", from: "node-store", to: "node-transport", label: "הועבר לחכמת" },
  { id: "e4", from: "node-transport", to: "node-qa", label: "פריקה וחתימה" },
]

interface VisualBranchBuilderProps {
  onBackToChat?: () => void
  userName?: string
}

export function VisualBranchBuilder({ onBackToChat, userName = "ראמי מסארוה" }: VisualBranchBuilderProps) {
  const [workflowMode, setWorkflowMode] = useState<"whatsapp_core" | "logistics_ops">("whatsapp_core")
  const [nodes, setNodes] = useState<WorkflowNode[]>(CORE_WHATSAPP_NODES)
  const [edges, setEdges] = useState<WorkflowEdge[]>(CORE_WHATSAPP_EDGES)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("node-hub")
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isDrawerOpen, setIsDrawerOpen] = useState(true)
  const [drawerInput, setDrawerInput] = useState("")
  const [isMuted, setIsMuted] = useState(audioService.isMuted())
  const [isProcessingAI, setIsProcessingAI] = useState(false)
  const [activeHighlightNodeId, setActiveHighlightNodeId] = useState<string | null>(null)
  const [isSimulationOpen, setIsSimulationOpen] = useState(false)
  const [isWhatsAppSimulatorOpen, setIsWhatsAppSimulatorOpen] = useState(false)

  // Switch between 4 Core WhatsApp Branches and Logistics Operations
  const handleSwitchWorkflow = (mode: "whatsapp_core" | "logistics_ops") => {
    setWorkflowMode(mode)
    if (mode === "whatsapp_core") {
      setNodes(CORE_WHATSAPP_NODES)
      setEdges(CORE_WHATSAPP_EDGES)
      setSelectedNodeId("node-hub")
    } else {
      setNodes(INITIAL_NODES)
      setEdges(INITIAL_EDGES)
      setSelectedNodeId("node-yard")
    }
    audioService.playClick()
  }

  // Handle flight to branch from WhatsApp simulator
  const handleSimulatorFly = (branchId: string, branchName: string) => {
    if (workflowMode !== "whatsapp_core") {
      setWorkflowMode("whatsapp_core")
      setNodes(CORE_WHATSAPP_NODES)
      setEdges(CORE_WHATSAPP_EDGES)
    }
    setSelectedNodeId(branchId)
    setTimeout(() => {
      executeNodeAction(branchId, "update_node", branchName)
    }, 150)
  }

  // Mascot Companion Ref
  const companionRef = useRef<NoaCanvasCompanionHandle>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Toggle Audio Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    audioService.setMuted(nextMuted)
    if (!nextMuted) {
      audioService.playMagicSparkle()
    }
  }

  // Get screen coordinates of a specific node
  const getNodeCoordinates = useCallback((nodeId: string): { x: number; y: number } | null => {
    const el = nodeRefs.current[nodeId]
    if (!el) {
      // Fallback calculation using node stored x/y transformed by canvas zoom/pan
      const node = nodes.find((n) => n.id === nodeId)
      if (node && canvasContainerRef.current) {
        const rect = canvasContainerRef.current.getBoundingClientRect()
        return {
          x: rect.left + pan.x + (node.x + 130) * zoom,
          y: rect.top + pan.y + (node.y + 40) * zoom,
        }
      }
      return null
    }

    const rect = el.getBoundingClientRect()
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + 30, // top header of card
    }
  }, [nodes, pan.x, pan.y, zoom])

  // Trigger fly animation to a specific node and update it
  const executeNodeAction = async (
    targetNodeId: string,
    actionType: "create_node" | "update_node",
    customTitle?: string
  ) => {
    const targetNode = nodes.find((n) => n.id === targetNodeId)
    const title = customTitle || targetNode?.title || "ענף לוגיסטיקה"

    const coords = getNodeCoordinates(targetNodeId)
    if (!coords || !companionRef.current) return

    setIsProcessingAI(true)

    await companionRef.current.flyToTarget(
      {
        x: coords.x,
        y: coords.y,
        nodeId: targetNodeId,
        actionType,
        nodeTitle: title,
      },
      () => {
        // Trigger live pulse on the card
        setActiveHighlightNodeId(targetNodeId)
        setTimeout(() => {
          setActiveHighlightNodeId(null)
        }, 1800)

        // Live update the node
        setNodes((prev) =>
          prev.map((n) => {
            if (n.id === targetNodeId) {
              return {
                ...n,
                status: actionType === "create_node" ? "active" : "completed",
                lastUpdated: `עודכן עכשיו ע״י נועה 🪄 (${new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })})`,
                isHighlighted: true,
              }
            }
            return n
          })
        )
      }
    )

    setIsProcessingAI(false)
  }

  // Handle AI Drawer submission
  const handleAISubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!drawerInput.trim() || isProcessingAI) return

    const promptText = drawerInput.trim()
    setDrawerInput("")

    // Check if user is asking to create a node or update
    const isCreate = promptText.includes("צור") || promptText.includes("הוסף") || promptText.includes("חדש")
    
    if (isCreate) {
      // Create new node
      const newId = `node-${Date.now().toString(36)}`
      const newNode: WorkflowNode = {
        id: newId,
        title: promptText.slice(0, 32),
        subtitle: "ענף מותאם אישית שנוצר ע״י נועה",
        type: "qa",
        status: "active",
        assignee: "ראמי ונועה ❤️",
        details: ["בוצע סנכרון ישיר ל-ERP", "אושר ע״י סידור עבודה", promptText],
        x: 640 + Math.random() * 80,
        y: 250 + Math.random() * 120,
        lastUpdated: "נוצר עכשיו",
      }

      setNodes((prev) => [...prev, newNode])
      setEdges((prev) => [
        ...prev,
        {
          id: `edge-${Date.now()}`,
          from: "node-yard",
          to: newId,
          label: "זרימה חדשה",
        },
      ])

      // Wait a tick for DOM to mount then fly
      setTimeout(() => {
        executeNodeAction(newId, "create_node", newNode.title)
      }, 100)
    } else {
      // Update targeted or selected node
      const targetId = selectedNodeId || "node-yard"
      executeNodeAction(targetId, "update_node")
    }
  }

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking canvas background directly
    if ((e.target as HTMLElement).closest(".workflow-card") || (e.target as HTMLElement).closest(".interactive-panel")) {
      return
    }
    setIsDraggingCanvas(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCanvas) return
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDraggingCanvas(false)
  }

  // Draw smooth SVG bezier edges between connected nodes
  const renderEdges = () => {
    return edges.map((edge) => {
      const fromNode = nodes.find((n) => n.id === edge.from)
      const toNode = nodes.find((n) => n.id === edge.to)
      if (!fromNode || !toNode) return null

      // Card dimensions approx: 260px wide, 170px high
      const startX = fromNode.x + 260
      const startY = fromNode.y + 85
      const endX = toNode.x
      const endY = toNode.y + 85

      const deltaX = Math.abs(endX - startX) * 0.5
      const pathData = `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`

      return (
        <g key={edge.id} className="pointer-events-none">
          {/* Outer glow line */}
          <path
            d={pathData}
            fill="none"
            stroke="url(#edge-gradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="opacity-75"
          />
          {/* Animated flowing pulse particle line */}
          <path
            d={pathData}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="6 8"
            className="animate-pulse"
          />
          {/* Edge Label Pill */}
          {edge.label && (
            <foreignObject
              x={(startX + endX) / 2 - 45}
              y={(startY + endY) / 2 - 12}
              width="90"
              height="24"
              className="overflow-visible"
            >
              <div className="bg-white/90 backdrop-blur-xs border border-stone-200/90 text-stone-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-center shadow-xs truncate">
                {edge.label}
              </div>
            </foreignObject>
          )}
        </g>
      )
    })
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  return (
    <div
      ref={canvasContainerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full h-screen overflow-hidden bg-slate-950 font-sans select-none text-stone-100"
      dir="rtl"
    >
      {/* Blueprint Grid Canvas Background */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.3) 1px, transparent 0),
            linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px, 96px 96px, 96px 96px",
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      />

      {/* Floating Animated Mascot: NoaCanvasCompanion */}
      <NoaCanvasCompanion
        ref={companionRef}
        dockPosition={{
          x: isDrawerOpen ? 340 : 40,
          y: 95,
        }}
      />

      {/* Header Bar Toolbar */}
      <header className="absolute top-3 left-4 right-4 z-40 flex items-center justify-between pointer-events-auto bg-stone-900/85 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-stone-700/60 shadow-xl">
        <div className="flex items-center gap-3">
          {onBackToChat && (
            <Button
              onClick={onBackToChat}
              variant="outline"
              size="sm"
              className="h-8 px-2.5 rounded-xl border-stone-700 bg-stone-800/80 hover:bg-stone-700 text-stone-200 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>חזרה לצ'אט נועה</span>
            </Button>
          )}

          <div className="flex items-center gap-2 pr-2 border-r border-stone-700/60">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-500 p-0.5 flex items-center justify-center shadow-xs">
              <Boxes className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-stone-100">בונה ענפים לוגיסטי</span>
                <span className="text-red-500 text-xs">❤️</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-cyan-500/50 text-cyan-300 bg-cyan-950/40">
                  סגנון Maia
                </Badge>
              </div>
              <p className="text-[10px] text-stone-400">ח. סבן חומרי בניין (1994) בע״מ | מחובר: {userName}</p>
            </div>
          </div>
        </div>

        {/* Center Actions Toolbar */}
        <div className="hidden md:flex items-center gap-1.5 bg-stone-800/80 p-1 rounded-xl border border-stone-700/60">
          {/* Workflow Mode Selector */}
          <div className="flex items-center bg-stone-950/80 p-0.5 rounded-lg border border-stone-700/60">
            <button
              type="button"
              onClick={() => handleSwitchWorkflow("whatsapp_core")}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                workflowMode === "whatsapp_core"
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-stone-950 shadow-xs"
                  : "text-stone-400 hover:text-stone-200"
              )}
            >
              💬 4 ענפי וואטסאפ
            </button>
            <button
              type="button"
              onClick={() => handleSwitchWorkflow("logistics_ops")}
              className={cn(
                "px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer",
                workflowMode === "logistics_ops"
                  ? "bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-xs"
                  : "text-stone-400 hover:text-stone-200"
              )}
            >
              📦 סידור תפעולי
            </button>
          </div>

          <Button
            onClick={() => {
              if (workflowMode !== "whatsapp_core") {
                handleSwitchWorkflow("whatsapp_core")
              }
              setIsWhatsAppSimulatorOpen(true)
            }}
            variant="default"
            size="sm"
            className="h-7 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-stone-950 rounded-lg gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>סימולטור מענה וואטסאפ</span>
          </Button>

          <Button
            onClick={() => {
              const newId = `node-${Date.now().toString(36)}`
              const newNode: WorkflowNode = {
                id: newId,
                title: "ענף אספקה חדש",
                subtitle: "שיבוץ ליקוט ונהג",
                type: "warehouse_yard",
                status: "active",
                assignee: "אורן / תמיר",
                details: ["פריקת בלות סומסום", "אימות תעודה"],
                x: 600,
                y: 200,
                lastUpdated: "נוצר הרגע",
              }
              setNodes((prev) => [...prev, newNode])
              executeNodeAction(newId, "create_node", newNode.title)
            }}
            variant="ghost"
            size="sm"
            className="h-7 text-xs font-medium text-stone-200 hover:text-white hover:bg-stone-700/80 rounded-lg gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            <span>הוסף בלוק</span>
          </Button>

          <Button
            onClick={() => {
              if (selectedNodeId) {
                executeNodeAction(selectedNodeId, "update_node")
              } else {
                executeNodeAction(workflowMode === "whatsapp_core" ? "node-branch-materials" : "node-yard", "update_node")
              }
            }}
            disabled={isProcessingAI}
            variant="ghost"
            size="sm"
            className="h-7 text-xs font-medium text-purple-300 hover:text-purple-200 hover:bg-purple-950/60 rounded-lg gap-1.5 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
            <span>שגר את נועה לבלוק</span>
          </Button>

          <Button
            onClick={() => setIsSimulationOpen(true)}
            variant="ghost"
            size="sm"
            className="h-7 text-xs font-semibold text-cyan-300 hover:text-cyan-200 hover:bg-cyan-950/60 rounded-lg gap-1.5 cursor-pointer"
            title="פתיחת סימולציית טיסה מבודדת (כרטיס הזמנה #comax_20419)"
          >
            <Play className="w-3 h-3 text-cyan-400 fill-cyan-400" />
            <span>סימולציית טיסה</span>
          </Button>

          <Button
            onClick={() => {
              setZoom(1)
              setPan({ x: 0, y: 0 })
            }}
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-stone-300 hover:bg-stone-700/80 rounded-lg cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-stone-400" />
            <span>איפוס מבט</span>
          </Button>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            onClick={handleToggleMute}
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 cursor-pointer"
            title={isMuted ? "הפעל סאונד קסם" : "השתק סאונד"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-stone-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </Button>

          <Button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            variant={isDrawerOpen ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shadow-xs",
              isDrawerOpen
                ? "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white"
                : "border-stone-700 bg-stone-800/80 hover:bg-stone-700 text-stone-200"
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>מגירת AI נועה</span>
          </Button>
        </div>
      </header>

      {/* Main Interactive Zoomable Canvas Plane */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing transition-transform duration-75"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {/* SVG Bezier Edges Layer */}
        <svg
          className="absolute inset-0 w-[3000px] h-[3000px] pointer-events-none overflow-visible"
          style={{ transformOrigin: "0 0" }}
        >
          <defs>
            <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          {renderEdges()}
        </svg>

        {/* Workflow Node Cards */}
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id
          const isHighlighted = activeHighlightNodeId === node.id

          return (
            <div
              key={node.id}
              ref={(el) => {
                nodeRefs.current[node.id] = el
              }}
              onClick={() => setSelectedNodeId(node.id)}
              className={cn(
                "workflow-card absolute w-[270px] rounded-2xl p-4 transition-all duration-300 shadow-2xl cursor-pointer select-none",
                "bg-stone-900/90 backdrop-blur-xl border",
                isSelected
                  ? "border-cyan-400 ring-2 ring-cyan-400/40 shadow-cyan-500/20"
                  : "border-stone-700/80 hover:border-stone-500",
                isHighlighted && "ring-4 ring-cyan-400 animate-ping shadow-2xl shadow-cyan-400/80 border-cyan-300"
              )}
              style={{
                left: `${node.x}px`,
                top: `${node.y}px`,
              }}
            >
              {/* Magic Pulse Wave when Noa casts on this card */}
              {isHighlighted && (
                <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-tr from-cyan-400/40 via-purple-500/40 to-pink-500/40 animate-pulse blur-xs -z-10" />
              )}

              {/* Node Card Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-xs",
                      node.type === "intake" && "bg-cyan-500",
                      node.type === "warehouse_yard" && "bg-amber-600",
                      node.type === "warehouse_store" && "bg-blue-600",
                      node.type === "transport" && "bg-emerald-600",
                      node.type === "qa" && "bg-purple-600"
                    )}
                  >
                    {node.type === "intake" && <MessageSquare className="w-3.5 h-3.5" />}
                    {node.type === "warehouse_yard" && <Package className="w-3.5 h-3.5" />}
                    {node.type === "warehouse_store" && <Boxes className="w-3.5 h-3.5" />}
                    {node.type === "transport" && <Truck className="w-3.5 h-3.5" />}
                    {node.type === "qa" && <UserCheck className="w-3.5 h-3.5" />}
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-stone-100 truncate max-w-[150px]">{node.title}</h3>
                    <p className="text-[10px] text-stone-400 truncate max-w-[150px]">{node.subtitle}</p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] px-1.5 py-0 font-semibold",
                    node.status === "completed" && "border-emerald-500/60 text-emerald-400 bg-emerald-950/40",
                    node.status === "active" && "border-amber-500/60 text-amber-400 bg-amber-950/40",
                    node.status === "idle" && "border-stone-600 text-stone-400 bg-stone-800/40",
                    node.status === "warning" && "border-red-500/60 text-red-400 bg-red-950/40"
                  )}
                >
                  {node.status === "completed" ? "הושלם" : node.status === "active" ? "בביצוע" : "ממתין"}
                </Badge>
              </div>

              {/* Staff and Warehouse tag */}
              <div className="flex items-center gap-1.5 mb-2.5 text-[10px] text-stone-400 font-medium">
                <span className="text-cyan-300 font-semibold">אחראי: {node.assignee}</span>
                {node.warehouse && <span className="text-stone-500">• {node.warehouse}</span>}
              </div>

              {/* Node Checklist / Details */}
              <div className="space-y-1 bg-stone-950/60 p-2 rounded-xl border border-stone-800/80 mb-2">
                {node.details.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-[11px] text-stone-300 leading-snug">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              {/* Node Card Footer */}
              <div className="flex items-center justify-between text-[9px] text-stone-400 pt-1 border-t border-stone-800/80">
                <span>{node.lastUpdated || "סנכרון פעיל"}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    executeNodeAction(node.id, "update_node")
                  }}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer active:scale-95"
                >
                  <Wand2 className="w-2.5 h-2.5" />
                  <span>עדכן עם נועה</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Canvas Zoom Controls (Bottom Left) */}
      <div className="interactive-panel absolute bottom-5 left-5 z-30 flex items-center gap-1 bg-stone-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-stone-700/80 shadow-2xl">
        <Button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 1.8))}
          variant="ghost"
          size="icon"
          className="w-7 h-7 rounded-xl text-stone-300 hover:bg-stone-800 cursor-pointer"
          title="הגדל מבט"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
        <span className="text-[10px] font-bold text-stone-400 px-1">{Math.round(zoom * 100)}%</span>
        <Button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
          variant="ghost"
          size="icon"
          className="w-7 h-7 rounded-xl text-stone-300 hover:bg-stone-800 cursor-pointer"
          title="הקטן מבט"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <Button
          onClick={() => {
            setZoom(1)
            setPan({ x: 0, y: 0 })
          }}
          variant="ghost"
          size="icon"
          className="w-7 h-7 rounded-xl text-stone-300 hover:bg-stone-800 cursor-pointer"
          title="מירכוז"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* AI Assistant Chat Drawer (Style Maia - Make.com) */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.aside
            initial={{ x: -360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -360, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="interactive-panel absolute top-16 bottom-5 left-4 w-[320px] sm:w-[350px] z-30 bg-stone-900/95 backdrop-blur-2xl rounded-3xl border border-purple-500/30 shadow-2xl flex flex-col overflow-hidden text-right rtl"
          >
            {/* Drawer Header */}
            <div className="p-4 border-b border-stone-800/80 flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-stone-900 to-cyan-950/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Sparkles className="w-4 h-4 text-white animate-spin" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-stone-100 flex items-center gap-1.5">
                    <span>נועה Maia AI</span>
                    <span className="text-red-500 text-xs">❤️</span>
                  </h2>
                  <p className="text-[10px] text-cyan-300 font-medium">עוזרת זרימת עבודה ולוגיסטיקה</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-6 h-6 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Chips */}
            <div className="p-3 border-b border-stone-800/60 bg-stone-950/40 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-semibold text-stone-400">
                <span>ניווט מהיר בענפים:</span>
                <button
                  type="button"
                  onClick={() => setIsWhatsAppSimulatorOpen(true)}
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  <MessageSquare className="w-2.5 h-2.5" />
                  <span>סימולטור וואטסאפ</span>
                </button>
              </div>

              {workflowMode === "whatsapp_core" ? (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => executeNodeAction("node-branch-materials", "update_node", "1. הזמנת חומרים והובלה")}
                    disabled={isProcessingAI}
                    className="px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/60 text-[10px] font-semibold text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>🏗️ 1. חומרים והובלה (חכמת/עלי)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => executeNodeAction("node-branch-containers", "update_node", "2. שירות מכולות פסולת")}
                    disabled={isProcessingAI}
                    className="px-2 py-1 rounded-lg bg-teal-950/60 hover:bg-teal-900/60 border border-teal-700/60 text-[10px] font-semibold text-teal-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>🚛 2. מכולות ופסולת (רמסע)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => executeNodeAction("node-branch-pickup", "update_node", "3. איסוף עצמי ושעות")}
                    disabled={isProcessingAI}
                    className="px-2 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 border border-blue-700/60 text-[10px] font-semibold text-blue-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>🏬 3. איסוף עצמי (כפר ברא)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => executeNodeAction("node-branch-pricing", "update_node", "4. שאלות מחיר ובירור")}
                    disabled={isProcessingAI}
                    className="px-2 py-1 rounded-lg bg-purple-950/60 hover:bg-purple-900/60 border border-purple-700/60 text-[10px] font-semibold text-purple-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>💰 4. בירור מחיר (ראמי)</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => executeNodeAction("node-yard", "update_node")}
                    disabled={isProcessingAI}
                    className="px-2 py-1 rounded-lg bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700/60 text-[10px] font-medium text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Package className="w-2.5 h-2.5" />
                    <span>עדכן ליקוט חצר (אורן)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => executeNodeAction("node-store", "update_node")}
                    disabled={isProcessingAI}
                    className="px-2 py-1 rounded-lg bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700/60 text-[10px] font-medium text-cyan-300 hover:text-cyan-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Boxes className="w-2.5 h-2.5" />
                    <span>עדכן דלפק (שי)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => executeNodeAction("node-transport", "update_node")}
                    disabled={isProcessingAI}
                    className="px-2 py-1 rounded-lg bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700/60 text-[10px] font-medium text-emerald-300 hover:text-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Truck className="w-2.5 h-2.5" />
                    <span>שבץ מנוף (חכמת)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Selected Node Inspector or Guide */}
            <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
              {selectedNode ? (
                <div className="bg-stone-950/60 rounded-2xl p-3 border border-stone-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-cyan-400">בלוק נבחר:</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-stone-700 text-stone-300">
                      ID: {selectedNode.id}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-stone-100 text-xs">{selectedNode.title}</h4>
                  <p className="text-[11px] text-stone-400">{selectedNode.subtitle}</p>

                  <div className="pt-2 border-t border-stone-800/80 space-y-1">
                    <span className="text-[10px] text-stone-400 font-semibold">פירוט משימות:</span>
                    {selectedNode.details.map((d, i) => (
                      <div key={i} className="text-[10px] text-stone-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => executeNodeAction(selectedNode.id, "update_node")}
                    disabled={isProcessingAI}
                    size="sm"
                    className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-xl text-xs font-semibold gap-1.5 cursor-pointer shadow-md"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>שגר את נועה לעדכון בלוק זה</span>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6 text-stone-500 text-xs">
                  לחץ על בלוק בקנבס כדי לצפות בו, או בקש מנועה ליצור בלוק חדש!
                </div>
              )}

              {/* Info Note */}
              <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-[10px] text-purple-200 leading-relaxed">
                💡 **איך נועה פועלת?** בכל עדכון או יצירת בלוק, נועה מרחפת בקשת זורמת אל הכרטיס, מפעילה אפקט זוהר פועם וצליל קסום, ומעדכנת את הנתונים בזמן אמת.
              </div>
            </div>

            {/* Drawer Composer Input */}
            <form onSubmit={handleAISubmit} className="p-3 border-t border-stone-800/80 bg-stone-950/80">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={drawerInput}
                  onChange={(e) => setDrawerInput(e.target.value)}
                  placeholder="הקלד פקודה (לדוגמה: הוסף בלוק בקרת איכות)..."
                  disabled={isProcessingAI}
                  className="w-full h-10 pl-10 pr-3 rounded-xl bg-stone-900 border border-stone-700/80 focus:border-cyan-400 focus:outline-none text-xs text-stone-100 placeholder:text-stone-500"
                />
                <button
                  type="submit"
                  disabled={!drawerInput.trim() || isProcessingAI}
                  className="absolute left-1.5 w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white flex items-center justify-center disabled:opacity-40 transition-opacity cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Flight Simulation Dialog Modal */}
      <AnimatePresence>
        {isSimulationOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl"
            >
              <CanvasFlightSimulation onClose={() => setIsSimulationOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp Customer Response Simulator (4 Core Branches) */}
      <WhatsAppReplySimulator
        isOpen={isWhatsAppSimulatorOpen}
        onClose={() => setIsWhatsAppSimulatorOpen(false)}
        onFlyToBranch={handleSimulatorFly}
      />
    </div>
  )
}
