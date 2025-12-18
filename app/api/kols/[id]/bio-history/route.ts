import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient()
    const { id } = await params

    const { data: bioHistory, error } = await supabase
      .from("bio_history")
      .select("*")
      .eq("kol_id", id)
      .order("changed_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("[v0] Error fetching bio history:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(bioHistory || [])
  } catch (error) {
    console.error("[v0] Error:", error)
    return NextResponse.json({ error: "Failed to fetch bio history" }, { status: 500 })
  }
}
