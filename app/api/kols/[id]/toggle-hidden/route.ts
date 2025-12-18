import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { is_hidden } = await request.json()

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

    const { error } = await supabase
      .from("kols")
      .update({
        is_hidden: is_hidden ?? false,
      })
      .eq("id", id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Failed to toggle hidden status:", error)
    return NextResponse.json({ error: "Failed to update hidden status" }, { status: 500 })
  }
}

