import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient()
    const { id } = await params // Await params for Next.js 16

    console.log("[v0] Fetching tweets for KOL ID:", id) // Add logging

    const { data: tweets, error } = await supabase
      .from("tweet_snapshots")
      .select("*")
      .eq("kol_id", id)
      .order("is_pinned", { ascending: false })
      .order("recorded_at", { ascending: false })
      .limit(20)

    if (error) {
      console.error("[v0] Error fetching tweets:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Found tweets in database:", tweets?.length || 0) // Log result count
    return NextResponse.json(tweets || [])
  } catch (error) {
    console.error("[v0] Error:", error)
    return NextResponse.json({ error: "Failed to fetch tweets" }, { status: 500 })
  }
}
