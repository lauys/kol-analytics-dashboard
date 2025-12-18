import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "7")

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("snapshots")
      .select("*")
      .eq("kol_id", id)
      .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: true })

    if (error) {
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Failed to fetch KOL history:", error)
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 })
  }
}
