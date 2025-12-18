import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { kolId, score, tier } = await request.json()

    if (!kolId) {
      return NextResponse.json({ success: false, error: "KOL ID is required" }, { status: 400 })
    }

    const supabase = await createServerClient()

    // Check admin permission
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    // Update KOL score and/or tier
    const updates: any = { updated_at: new Date().toISOString() }
    if (score !== undefined) updates.manual_score = score
    if (tier !== undefined) updates.tier = tier

    const { data, error } = await supabase.from("kols").update(updates).eq("id", kolId).select().single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("[v0] Update score error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
