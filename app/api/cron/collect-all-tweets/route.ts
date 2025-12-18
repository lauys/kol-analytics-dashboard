import { createAdminClient } from "@/lib/supabase/admin"
import { TwitterAPIClient } from "@/lib/twitter-api"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60 // Maximum allowed by Vercel

export async function GET(request: Request) {
  try {
    // 全局总开关：关闭后所有自动采集接口立即返回，不再执行任何逻辑
    if (process.env.ENABLE_AUTO_COLLECTION !== "true") {
      return NextResponse.json(
        {
          error: "Auto collection is disabled",
          code: "AUTO_COLLECTION_DISABLED",
        },
        { status: 503 },
      )
    }

    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] [CRON] Starting automated tweet collection")

    const apiKey = process.env.TWITTER_API_KEY
    if (!apiKey) {
      throw new Error("TWITTER_API_KEY not configured")
    }

    const twitterClient = new TwitterAPIClient(apiKey)
    const supabase = createAdminClient()

    const { data: kols, error: kolsError } = await supabase
      .from("kols")
      .select("id, twitter_username, twitter_user_id")
      .eq("is_zombie", false)
      .not("twitter_user_id", "is", null)

    if (kolsError) throw kolsError

    const results = {
      success: 0,
      failed: 0,
      totalTweets: 0,
      errors: [] as string[],
    }

    for (const kol of kols || []) {
      try {
        console.log(`[v0] [CRON] Collecting tweets for ${kol.twitter_username}`)

        const data = await twitterClient.fetchUserTweets(kol.twitter_user_id, 20)

        const instructions = data?.data?.user?.result?.timeline_v2?.timeline?.instructions || []

        const timelineInstruction = instructions.find((inst: any) => inst.type === "TimelineAddEntries")

        if (!timelineInstruction?.entries) {
          console.log(`[v0] [CRON] No tweets found for ${kol.twitter_username}`)
          continue
        }

        const profileData = data?.data?.user?.result?.legacy || {}
        const pinnedTweetIds = profileData.pinned_tweet_ids_str || []

        const tweets = []
        for (const entry of timelineInstruction.entries) {
          if (entry.entryId?.startsWith("tweet-")) {
            const content = entry.content?.itemContent
            const tweetResult = content?.tweet_results?.result

            if (tweetResult?.legacy) {
              const legacy = tweetResult.legacy
              const tweetId = legacy.id_str

              let mediaType: string | null = null
              if (legacy.extended_entities?.media?.[0]) {
                mediaType = legacy.extended_entities.media[0].type || null
              }

              tweets.push({
                kol_id: kol.id,
                tweet_id: tweetId,
                text_content: legacy.full_text || "",
                likes: Number(legacy.favorite_count) || 0,
                retweets: Number(legacy.retweet_count) || 0,
                replies: Number(legacy.reply_count) || 0,
                quotes: Number(legacy.quote_count) || 0,
                is_pinned: pinnedTweetIds.includes(tweetId),
                media_type: mediaType,
                recorded_at: legacy.created_at ? new Date(legacy.created_at).toISOString() : new Date().toISOString(),
              })
            }
          }
        }

        if (tweets.length > 0) {
          const { error: upsertError } = await supabase.from("tweet_snapshots").upsert(tweets, {
            onConflict: "kol_id,tweet_id",
            ignoreDuplicates: false,
          })

          if (upsertError) throw upsertError

          results.totalTweets += tweets.length
          console.log(`[v0] [CRON] ✓ ${kol.twitter_username}: ${tweets.length} tweets`)
        }

        results.success++

        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        results.failed++
        const errorMsg = `${kol.twitter_username}: ${error instanceof Error ? error.message : "Unknown error"}`
        results.errors.push(errorMsg)
        console.error(`[v0] [CRON] ✗ ${errorMsg}`)
      }
    }

    console.log(`[v0] [CRON] Tweet collection complete: ${results.success} KOLs, ${results.totalTweets} tweets`)

    return NextResponse.json({
      success: true,
      kols_processed: results.success,
      tweets_collected: results.totalTweets,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] [CRON] Fatal error:", error)
    return NextResponse.json(
      {
        error: "Failed to collect tweets",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
