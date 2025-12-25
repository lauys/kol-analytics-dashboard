import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json()

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: "KOL IDs are required" }, { status: 400 })
    }

    const supabase = await createServerClient()

    // 检查管理员权限
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    if (profile?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden: admin only" }, { status: 403 })
    }

    // 批量删除KOL（级联删除会自动处理相关的snapshots, bio_history, tweet_snapshots等）
    const { error } = await supabase.from("kols").delete().in("id", ids)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, deletedCount: ids.length })
  } catch (error) {
    console.error("[v0] Failed to batch delete KOLs:", error)
    return NextResponse.json({ error: "Failed to delete KOLs" }, { status: 500 })
  }
}

