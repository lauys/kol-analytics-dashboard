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

    console.log("[v0] [CRON] Starting combined data collection (KOL data + tweets)")

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

    if (kolsError) throw kolsError

    const results = {
      kolData: {
        success: 0,
        failed: 0,
        errors: [] as string[],
      },
      tweets: {
        success: 0,
        failed: 0,
        totalTweets: 0,
        errors: [] as string[],
      },
    }

    // 第一步：收集 KOL 基本信息
    console.log("[v0] [CRON] Phase 1: Collecting KOL basic data...")
    for (const kol of kols || []) {
      try {
        console.log(`[v0] [CRON] Collecting data for ${kol.twitter_username}`)

        const userData = await twitterClient.getUserByUsername(kol.twitter_username)

        if (!userData) {
          throw new Error("无法获取用户数据。可能的原因：1) 网络连接问题 2) API 服务暂时不可用 3) 用户名不存在 4) API Key 无效")
        }

        const kolData = {
          display_name: userData.name,
          bio: userData.description || "",
          avatar_url: userData.profile_image_url?.replace("_normal", "_400x400") || "",
          followers_count: userData.followers_count || 0,
          following_count: userData.following_count || 0,
          tweet_count: userData.tweet_count || 0,
          twitter_user_id: userData.id,
          updated_at: new Date().toISOString(),
        }

        const { error: updateError } = await supabase.from("kols").update(kolData).eq("id", kol.id)

        if (updateError) throw updateError

        await supabase.from("snapshots").insert({
          kol_id: kol.id,
          followers_count: kolData.followers_count,
          following_count: kolData.following_count,
          tweet_count: kolData.tweet_count,
        })

        const { data: previousKol } = await supabase.from("kols").select("bio").eq("id", kol.id).single()

        if (previousKol && previousKol.bio !== kolData.bio) {
          await supabase.from("bio_history").insert({
            kol_id: kol.id,
            old_bio: previousKol.bio,
            new_bio: kolData.bio,
          })
        }

        results.kolData.success++
        console.log(`[v0] [CRON] ✓ ${kol.twitter_username} (KOL data)`)

        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        results.kolData.failed++
        const errorMsg = `${kol.twitter_username}: ${error instanceof Error ? error.message : "Unknown error"}`
        results.kolData.errors.push(errorMsg)
        console.error(`[v0] [CRON] ✗ ${errorMsg}`)
      }
    }

    // 第二步：收集推文数据（只处理有 twitter_user_id 的 KOL）
    console.log("[v0] [CRON] Phase 2: Collecting tweets...")
    const kolsWithUserId = (kols || []).filter((kol) => kol.twitter_user_id)

    for (const kol of kolsWithUserId) {
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

          results.tweets.totalTweets += tweets.length
          console.log(`[v0] [CRON] ✓ ${kol.twitter_username}: ${tweets.length} tweets`)
        }

        results.tweets.success++

        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        results.tweets.failed++
        const errorMsg = `${kol.twitter_username}: ${error instanceof Error ? error.message : "Unknown error"}`
        results.tweets.errors.push(errorMsg)
        console.error(`[v0] [CRON] ✗ ${errorMsg}`)
      }
    }

    console.log(
      `[v0] [CRON] Collection complete: KOL data (${results.kolData.success}/${results.kolData.success + results.kolData.failed}), Tweets (${results.tweets.success} KOLs, ${results.tweets.totalTweets} tweets)`,
    )

    return NextResponse.json({
      success: true,
      kol_data: {
        collected: results.kolData.success,
        failed: results.kolData.failed,
        errors: results.kolData.errors.length > 0 ? results.kolData.errors : undefined,
      },
      tweets: {
        kols_processed: results.tweets.success,
        tweets_collected: results.tweets.totalTweets,
        failed: results.tweets.failed,
        errors: results.tweets.errors.length > 0 ? results.tweets.errors : undefined,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] [CRON] Fatal error:", error)
    return NextResponse.json(
      {
        error: "Failed to collect data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}









