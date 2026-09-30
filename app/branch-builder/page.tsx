import type { Metadata } from "next"
import { VisualBranchBuilder } from "@/components/branch-builder/VisualBranchBuilder"

export const metadata: Metadata = {
  title: "בונה ענפים לוגיסטי | נועה AI ❤️ (סגנון Maia)",
  description: "בונה ענפים ויזואלי לתפעול ולוגיסטיקה בחברת ח. סבן חומרי בניין (1994) בע״מ עם ליווי הדמות המונפשת NoaCanvasCompanion",
}

export default function BranchBuilderPage() {
  return <VisualBranchBuilder />
}
