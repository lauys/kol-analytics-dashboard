import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { is_zombie } = await request.json()

    const supabase = await createClient()

    const { error } = await supabase
      .from("kols")
      .update({
        is_zombie,
        zombie_marked_at: is_zombie ? new Date().toISOString() : null,
      })
      .eq("id", id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to mark zombie:", error)
    return NextResponse.json({ error: "Failed to update zombie status" }, { status: 500 })
  }
}
