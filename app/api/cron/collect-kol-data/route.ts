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

    console.log("[v0] [CRON] Starting automated KOL data collection")

    const apiKey = process.env.TWITTER_API_KEY
    if (!apiKey) {
      throw new Error("TWITTER_API_KEY not configured")
    }

    const twitterClient = new TwitterAPIClient(apiKey)
    const supabase = createAdminClient()

    const { data: kols, error: kolsError } = await supabase
      .from("kols")
      .select("id, twitter_username")
      .eq("is_zombie", false)

    if (kolsError) throw kolsError

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

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

        results.success++
        console.log(`[v0] [CRON] ✓ ${kol.twitter_username}`)

        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        results.failed++
        const errorMsg = `${kol.twitter_username}: ${error instanceof Error ? error.message : "Unknown error"}`
        results.errors.push(errorMsg)
        console.error(`[v0] [CRON] ✗ ${errorMsg}`)
      }
    }

    console.log(`[v0] [CRON] Collection complete: ${results.success} success, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      collected: results.success,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] [CRON] Fatal error:", error)
    return NextResponse.json(
      {
        error: "Failed to collect KOL data",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
