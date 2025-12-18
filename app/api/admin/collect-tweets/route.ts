import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] === Tweet Collection Started ===")

    const supabase = await createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
    }

    const adminSupabase = createAdminClient()

    const body = await request.json()
    const { kolId } = body

    console.log("[v0] Collecting tweets for KOL ID:", kolId)

    if (!kolId) {
      return NextResponse.json({ error: "Missing kolId" }, { status: 400 })
    }

    const { data: kol, error: kolError } = await adminSupabase
      .from("kols")
      .select("id, twitter_user_id, twitter_username")
      .eq("id", kolId)
      .single()

    if (kolError || !kol) {
      console.error("[v0] Failed to fetch KOL:", kolError)
      return NextResponse.json({ error: "KOL not found" }, { status: 404 })
    }

    if (!kol.twitter_user_id) {
      console.error("[v0] KOL missing twitter_user_id:", kol.twitter_username)
      return NextResponse.json(
        { error: "KOL missing twitter_user_id. Please re-collect user data first." },
        { status: 400 },
      )
    }

    console.log("[v0] Found KOL:", { username: kol.twitter_username, userId: kol.twitter_user_id })

    const apiKey = process.env.TWITTER_API_KEY
    if (!apiKey) {
      console.error("[v0] Twitter API key not found in environment")
      return NextResponse.json({ error: "Twitter API key not configured" }, { status: 500 })
    }

    // Step 1: Fetching user profile for pinned tweet info...
    console.log("[v0] Step 1: Fetching user profile for pinned tweet info...")
    const profileUrl = `https://twitter.good6.top/api/base/apitools/userByScreenNameV2?apiKey=${encodeURIComponent(apiKey)}&screenName=${encodeURIComponent(kol.twitter_username)}`

    const profileResponse = await fetch(profileUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    let pinnedTweetIds = []
    if (profileResponse.ok) {
      const profileData = await profileResponse.json()
      if (profileData.code === 1 && profileData.data) {
        let profileParsed = profileData.data
        if (typeof profileParsed === "string") {
          profileParsed = JSON.parse(profileParsed)
        }
        const userLegacy = profileParsed?.data?.user?.result?.legacy
        pinnedTweetIds = userLegacy?.pinned_tweet_ids_str || []
        console.log("[v0] ✓ Found pinned tweet IDs from profile:", pinnedTweetIds)
      }
    } else {
      console.log("[v0] ⚠ Profile API call failed, continuing without pinned tweet info")
    }

    // Step 2: Fetching tweets for userId
    console.log("[v0] Step 2: Fetching tweets for userId:", kol.twitter_user_id)

    const apiUrl = `https://twitter.good6.top/api/base/apitools/userTweetsV2?apiKey=${encodeURIComponent(apiKey)}&userId=${encodeURIComponent(kol.twitter_user_id)}&count=20`

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    console.log("[v0] Twitter API response status:", response.status)

    if (!response.ok) {
      console.error("[v0] Twitter API error:", response.status, response.statusText)
      return NextResponse.json({ error: `Twitter API error: ${response.statusText}` }, { status: response.status })
    }

    const data = await response.json()

    console.log("[v0] Response code:", data.code)

    if (data.code !== 1 || !data.data) {
      console.error("[v0] Twitter API returned error:", data.msg || "Unknown error")
      return NextResponse.json(
        {
          error: "Twitter API returned an error",
          details: data.msg || "Unknown error",
        },
        { status: 500 },
      )
    }

    let tweetsData = data.data
    if (typeof tweetsData === "string") {
      console.log("[v0] Parsing nested JSON data")
      try {
        tweetsData = JSON.parse(tweetsData)
      } catch (parseError) {
        console.error("[v0] Failed to parse data string:", tweetsData?.slice(0, 200))
        return NextResponse.json(
          {
            error: "Failed to parse Twitter API response",
            details: parseError instanceof Error ? parseError.message : String(parseError),
          },
          { status: 500 },
        )
      }
    }

    const timeline = tweetsData?.data?.user?.result?.timeline_v2?.timeline
    const instructions = timeline?.instructions || []

    console.log("[v0] Timeline instructions count:", instructions.length)

    let entries = []
    for (const instruction of instructions) {
      if (instruction.type === "TimelineAddEntries" && instruction.entries) {
        entries = instruction.entries
        break
      }
    }

    console.log("[v0] Found tweet entries:", entries.length)

    let savedCount = 0
    let pinnedTweetId = null
    const errors = []

    // Using pinned tweet IDs from profile API
    console.log("[v0] Using pinned tweet IDs:", pinnedTweetIds)

    for (const entry of entries) {
      if (entry.entryId?.startsWith("tweet-") || entry.entryId?.startsWith("profile-conversation-")) {
        const tweet = entry.content?.itemContent?.tweet_results?.result
        if (!tweet || tweet.__typename === "TweetUnavailable") {
          continue
        }

        const tweetData = tweet.legacy || tweet.tweet?.legacy
        if (!tweetData) {
          continue
        }

        const tweetId = tweet.rest_id || tweetData.id_str

        const isPinned = pinnedTweetIds.includes(tweetId)

        if (isPinned) {
          console.log("[v0] ✓ Found PINNED tweet:", tweetId)
          pinnedTweetId = tweetId
        }

        let mediaType = null
        if (tweetData.extended_entities?.media?.[0]) {
          const media = tweetData.extended_entities.media[0]
          mediaType = media.type
        }

        console.log(`[v0] Processing tweet ${savedCount + 1}:`, {
          tweetId,
          isPinned,
          likes: tweetData.favorite_count,
        })

        const { error } = await adminSupabase.from("tweet_snapshots").upsert(
          {
            kol_id: kolId,
            tweet_id: tweetId,
            text_content: tweetData.full_text || tweetData.text,
            likes: Number(tweetData.favorite_count || 0),
            retweets: Number(tweetData.retweet_count || 0),
            replies: Number(tweetData.reply_count || 0),
            quotes: Number(tweetData.quote_count || 0),
            is_pinned: isPinned,
            media_type: mediaType,
            // 使用推文原始创建时间作为互动时间，避免总是显示“1分钟前”
            recorded_at: tweetData.created_at
              ? new Date(tweetData.created_at).toISOString()
              : new Date().toISOString(),
          },
          {
            onConflict: "kol_id,tweet_id",
          },
        )

        if (error) {
          console.error("[v0] Error saving tweet:", tweetId, error)
          errors.push({ tweetId, error: error.message })
        } else {
          savedCount++
        }
      }
    }

    console.log("[v0] === Tweet Collection Completed ===")
    console.log("[v0] Tweets saved:", savedCount)
    console.log("[v0] Pinned tweet found:", !!pinnedTweetId)

    // 如果 profile 返回了置顶 tweetId，但这条推文不在最近时间线 entries 中，
    // 我们为其创建一条占位记录，方便前端展示说明和跳转链接。
    const missingPinnedIds =
      Array.isArray(pinnedTweetIds) && pinnedTweetIds.length > 0
        ? pinnedTweetIds.filter((id) => id && id !== pinnedTweetId)
        : []

    if (missingPinnedIds.length > 0) {
      console.log("[v0] Creating placeholder snapshots for pinned tweets not in recent timeline:", missingPinnedIds)

      const now = new Date().toISOString()
      const placeholderRecords = missingPinnedIds.map((id) => ({
        kol_id: kolId,
        tweet_id: id,
        text_content: "[Pinned Tweet - Not in recent timeline]",
        likes: 0,
        retweets: 0,
        replies: 0,
        quotes: 0,
        is_pinned: true,
        media_type: null,
        recorded_at: now,
      }))

      const { error: placeholderError } = await adminSupabase.from("tweet_snapshots").upsert(placeholderRecords, {
        onConflict: "kol_id,tweet_id",
      })

      if (placeholderError) {
        console.error("[v0] Error saving placeholder pinned tweets:", placeholderError)
        errors.push({ tweetId: "placeholder_pinned", error: placeholderError.message })
      }
    }

    return NextResponse.json({
      success: true,
      savedCount,
      totalTweets: entries.length,
      hasPinnedTweet: !!pinnedTweetId || missingPinnedIds.length > 0,
      pinnedTweetId: pinnedTweetId || missingPinnedIds[0] || null,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("[v0] Error collecting tweets:", error)
    return NextResponse.json(
      { error: "Failed to collect tweets", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
