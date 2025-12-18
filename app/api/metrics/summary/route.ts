import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET() {
  try {
    const supabase = await createClient()

    // 统计所有与 @Titannet_dao 官方账号相关的推文互动数据
    const { data, error } = await supabase
      .from("tweet_snapshots")
      .select("likes, retweets, replies, quotes, text_content")
      // 仅统计与 @Titannet_dao 官方账号相关的推文互动
      .or("text_content.ilike.%@titannet_dao%,text_content.ilike.%titannet_dao%")

    if (error) {
      console.error("[v0] Error fetching tweet_snapshots for metrics:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 如果未来需要进一步收紧口径，可以在这里增加更精细的匹配规则
    let totalLikes = 0
    let totalRetweets = 0
    let totalReplies = 0
    let totalQuotes = 0

    for (const row of data || []) {
      totalLikes += Number(row.likes || 0)
      totalRetweets += Number(row.retweets || 0)
      totalReplies += Number(row.replies || 0)
      totalQuotes += Number(row.quotes || 0)
    }

    const totalInteractions = totalLikes + totalRetweets + totalReplies + totalQuotes

    return NextResponse.json({
      totalInteractions,
      totalLikes,
      totalRetweets,
      totalReplies,
      totalQuotes,
    })
  } catch (error) {
    console.error("[v0] Error in metrics summary API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


