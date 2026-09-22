import { ChatShell } from "@/components/chat/chat-shell"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "נועה AI ❤️ | ח. סבן חומרי בניין",
  description: "העוזרת האישית והמוח הלוגיסטי-תפעולי של ראמי מסארוה בחברת ח. סבן חומרי בניין (1994) בע״מ",
}

export default function ChatPage() {
  return <ChatShell />
}
