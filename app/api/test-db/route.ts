import { NextResponse } from "next/server"
import {
  serverDb,
  saveLearnedFact,
  getActiveLearnedKnowledge,
  ensureLearnedKnowledgeBootstrapped,
} from "@/lib/learned-memory"
import { collection, getDocs, query, limit } from "firebase/firestore"

export const dynamic = "force-dynamic"

export async function GET() {
  const timestamp = new Date().toISOString()
  const testRule = `בדיקת אימות חיבור ישיר ל-Firestore בענן (Node.js Server) - ${timestamp}`

  try {
    console.log("🧪 [GET /api/test-db] מתחיל בדיקת אימות כתיבה וקריאה ל-Firestore...")

    // 1. אתחול ראשוני (Bootstrapping) במידת הצורך
    await ensureLearnedKnowledgeBootstrapped()

    // 2. ביצוע כתיבה פיזית ישירה של מסמך בדיקה
    const testDocId = await saveLearnedFact(
      testRule,
      "general",
      "בדיקת שרת"
    )

    // 3. שליפה ישירה של המסמכים הקיימים בקולקציית learned_knowledge
    const colRef = collection(serverDb, "learned_knowledge")
    const snap = await getDocs(query(colRef, limit(20)))

    const documents = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }))

    // 4. שליפת כללים פעילים מעוצבים
    const activeRulesFormatted = await getActiveLearnedKnowledge(10)

    console.log(`✅ [GET /api/test-db] הבדיקה הושלמה בהצלחה! נשמר מסמך: ${testDocId}, נשלפו ${documents.length} מסמכים.`)

    return NextResponse.json({
      success: true,
      message: "החיבור ל-Firebase Firestore בשרת פועל ומאומת במלואו!",
      testDocumentId: testDocId,
      totalDocuments: documents.length,
      documents,
      activeRulesFormatted,
      serverTimestamp: timestamp,
    })
  } catch (error: any) {
    console.error("❌ [GET /api/test-db] שגיאה קריטית בבדיקת חיבור Firestore:", error)

    return NextResponse.json(
      {
        success: false,
        error: error?.message || String(error),
        code: error?.code,
        details: error?.stack || "No stack trace available",
        serverTimestamp: timestamp,
      },
      { status: 500 }
    )
  }
}
