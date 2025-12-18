import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { TwitterAPIClient } from "@/lib/twitter-api"

export const dynamic = "force-dynamic"
export const maxDuration = 30

interface ImportRequest {
  usernames: string[]
}

export async function POST(request: Request) {
  try {
    const { usernames }: ImportRequest = await request.json()

    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return NextResponse.json({ error: "usernames array is required" }, { status: 400 })
    }

    if (usernames.length > 5) {
      return NextResponse.json({ error: "Please import maximum 5 KOLs at a time to avoid timeout" }, { status: 400 })
    }

    const supabase = await createServerClient()
    const apiKey = process.env.TWITTER_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "TWITTER_API_KEY not configured" }, { status: 500 })
    }

    const twitterClient = new TwitterAPIClient(apiKey)
    const result = {
      success: [] as string[],
      failed: [] as { username: string; error: string }[],
      skipped: [] as string[],
    }

    for (const rawUsername of usernames) {
      const username = rawUsername.trim().replace(/^["@]+|["]+$/g, "")

      if (!username) continue

      try {
        // Check if already exists
        const { data: existing } = await supabase
          .from("kols")
          .select("id")
          .or(`username.eq.${username},twitter_username.eq.${username}`)
          .maybeSingle()

        if (existing) {
          result.skipped.push(username)
          continue
        }

        // Fetch from Twitter API with retry mechanism
        console.log(`[v0] Fetching data for ${username}...`)

        // 检查 API Key 配置
        if (!apiKey || apiKey.trim() === "") {
          throw new Error("Twitter API Key 未配置，请在环境变量中设置 TWITTER_API_KEY")
        }

        const userData = await twitterClient.getUserByUsername(username)

        if (!userData) {
          throw new Error(
            "无法获取用户数据。可能的原因：1) 网络连接问题 2) API 服务暂时不可用 3) 用户名不存在 4) API Key 无效。请检查网络连接和 API 配置后重试。",
          )
        }

        console.log(`[v0] Successfully fetched data for ${username}`)

        // Insert into database
        const { error: insertError } = await supabase.from("kols").insert({
          twitter_id: userData.id,
          twitter_user_id: userData.id,
          username: userData.username,
          twitter_username: userData.username,
          display_name: userData.name || userData.username,
          bio: userData.description || null,
          profile_image_url: userData.profile_image_url || null,
          avatar_url: userData.profile_image_url || null,
          followers_count: userData.public_metrics?.followers_count || 0,
          following_count: userData.public_metrics?.following_count || 0,
          tweet_count: userData.public_metrics?.tweet_count || 0,
          is_zombie: false,
        })

        if (insertError) {
          throw insertError
        }

        // Get the inserted KOL
        const { data: kol } = await supabase
          .from("kols")
          .select("id")
          .or(`username.eq.${username},twitter_username.eq.${username}`)
          .maybeSingle()

        // Create initial snapshot
        if (kol) {
          await supabase.from("snapshots").insert({
            kol_id: kol.id,
            followers_count: userData.public_metrics?.followers_count || 0,
            following_count: userData.public_metrics?.following_count || 0,
            tweet_count: userData.public_metrics?.tweet_count || 0,
          })
        }

        result.success.push(username)

        // Add delay between successful imports to avoid rate limiting
        if (usernames.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500))
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error"
        console.error(`[v0] Failed to import ${username}:`, errorMessage)
        result.failed.push({ username, error: errorMessage })
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Import error:", error)
    return NextResponse.json({ error: "Failed to import KOLs" }, { status: 500 })
  }
}
