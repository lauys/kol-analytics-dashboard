import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerClient()
    const { id } = await params

    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get("limit") || "3")

    // 仅拉取包含 @Titannet_dao 相关关键词的互动记录，视为与官方账号的互动
    const { data, error } = await supabase
      .from("tweet_snapshots")
      .select("id, tweet_id, text_content, recorded_at")
      .eq("kol_id", id)
      // 仅记录与 @Titannet_dao 官方账号相关的推文
      .or("text_content.ilike.%@titannet_dao%,text_content.ilike.%titannet_dao%")
      .order("recorded_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[v0] Error fetching interaction history:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const items =
      data?.map((row) => {
        const text = (row.text_content || "").toLowerCase()
        let action = "Interacted with official post"

        if (text.includes("rt @titannet_dao") || text.includes("retweet")) {
          action = "Retweeted official post"
        } else if (text.includes("@titannet_dao") && text.includes("reply")) {
          action = "Replied to official post"
        } else if (text.includes("@titannet_dao")) {
          action = "Mentioned @Titannet_dao"
        }

        return {
          id: row.id,
          tweet_id: row.tweet_id,
          recorded_at: row.recorded_at,
          action,
        }
      }) || []

    return NextResponse.json(items)
  } catch (error) {
    console.error("[v0] Error in interaction history API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


