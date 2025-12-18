import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "30")

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const { data: pinnedTweets, error } = await supabase
      .from("tweet_snapshots")
      .select("*")
      .eq("kol_id", id)
      .eq("is_pinned", true)
      .gte("recorded_at", cutoffDate.toISOString())
      .order("recorded_at", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching pinned tweet history:", error)
      // Return empty array instead of error to allow UI to show "no data" message
      return NextResponse.json({ tweets: [] })
    }

    // If no pinned tweets found, return empty array
    if (!pinnedTweets || pinnedTweets.length === 0) {
      return NextResponse.json({ tweets: [] })
    }

    // Group by tweet_id to track metrics changes for each pinned tweet
    const tweetGroups = new Map()

    pinnedTweets.forEach((tweet) => {
      if (!tweetGroups.has(tweet.tweet_id)) {
        tweetGroups.set(tweet.tweet_id, [])
      }
      tweetGroups.get(tweet.tweet_id).push(tweet)
    })

    const result = Array.from(tweetGroups.entries()).map(([tweetId, history]: [string, any[]]) => ({
      tweet_id: tweetId,
      text_content: history[0].text_content,
      history: history.sort((a, b) => 
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      ),
      first_seen: history[0].recorded_at,
      last_seen: history[history.length - 1].recorded_at,
    }))

    return NextResponse.json({ tweets: result })
  } catch (error) {
    console.error("[v0] Error fetching pinned tweet history:", error)
    // Return empty array instead of error to allow UI to show "no data" message
    return NextResponse.json({ tweets: [] })
  }
}
