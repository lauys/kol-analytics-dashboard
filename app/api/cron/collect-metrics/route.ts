import { createServerClient } from "@/lib/supabase/server"
import { TwitterAPIClient } from "@/lib/twitter-api"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

async function fetchTwitterMetricsMock(twitterUserId: string) {
  const baseFollowers = Math.abs(Number.parseInt(twitterUserId.slice(-6), 10)) || 100000
  return {
    followers_count: Math.floor(baseFollowers * (1 + Math.random() * 0.002)),
    following_count: Math.floor(500 + Math.random() * 1000),
    tweet_count: Math.floor(5000 + Math.random() * 10000),
  }
}

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

    // Verify cron secret for security (optional in development)
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createServerClient()

    const { data: kols, error: kolsError } = await supabase
      .from("kols")
      .select("id, twitter_id, twitter_user_id, username, twitter_username")
      .eq("is_zombie", false)

    if (kolsError) {
      throw kolsError
    }

    const apiKey = process.env.TWITTER_API_KEY
    const useRealAPI = !!apiKey
    const twitterClient = apiKey ? new TwitterAPIClient(apiKey) : null
    const errors: string[] = []

    // Collect metrics for each KOL
    const snapshots = await Promise.all(
      (kols || []).map(async (kol) => {
        try {
          const twitterId = kol.twitter_id || kol.twitter_user_id
          const username = kol.username || kol.twitter_username

          let metrics
          if (useRealAPI && twitterClient) {
            // Use real Twitter API - prefer username for more reliable lookup
            const userData = username
              ? await twitterClient.getUserByUsername(username)
              : await twitterClient.getUserById(twitterId)

            if (userData) {
              metrics = {
                followers_count: userData.public_metrics?.followers_count || userData.followers_count || 0,
                following_count: userData.public_metrics?.following_count || userData.following_count || 0,
                tweet_count: userData.public_metrics?.tweet_count || userData.tweet_count || 0,
              }
            } else {
              throw new Error("User not found")
            }
          } else {
            // Fallback to mock data
            metrics = await fetchTwitterMetricsMock(twitterId)
          }

          return {
            kol_id: kol.id,
            followers_count: metrics.followers_count,
            following_count: metrics.following_count,
            tweet_count: metrics.tweet_count,
          }
        } catch (error) {
          console.error(`[v0] Failed to fetch metrics for KOL ${kol.id}:`, error)
          errors.push(`KOL ${kol.id} (${kol.username || kol.twitter_username})`)
          return null
        }
      }),
    )

    // Filter out failed fetches
    const validSnapshots = snapshots.filter((s) => s !== null)

    // Insert all valid snapshots
    if (validSnapshots.length > 0) {
      const { error: insertError } = await supabase.from("snapshots").insert(validSnapshots)

      if (insertError) {
        throw insertError
      }

      for (const snapshot of validSnapshots) {
        await supabase
          .from("kols")
          .update({
            followers_count: snapshot.followers_count,
            following_count: snapshot.following_count,
            tweet_count: snapshot.tweet_count,
            updated_at: new Date().toISOString(),
          })
          .eq("id", snapshot.kol_id)
      }
    }

    return NextResponse.json({
      success: true,
      collected: validSnapshots.length,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      mode: useRealAPI ? "real_api" : "mock_data",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Cron job error:", error)
    return NextResponse.json(
      {
        error: "Failed to collect metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
