import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const maxDuration = 60

const OFFICIAL_USERNAME = "Titannet_dao" // 不带 @
const OFFICIAL_HANDLE = "@Titannet_dao"

interface OfficialTweet {
  id: string
  created_at: string
  text: string
}

interface KolInteraction {
  kol_id: string
  twitter_username: string
  display_name: string
  avatar_url: string | null
  my_tweet_id: string
  official_tweet_id: string
  type: "retweet" | "quote" | "reply" | "link"
  created_at: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()

    // 管理员权限校验
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    if (profile?.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden: admin only" }, { status: 403 })
    }

    const apiKey = process.env.TWITTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Twitter API key not configured (TWITTER_API_KEY)" },
        { status: 500 },
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get("limit") || "100")

    // Step 1: 获取官方账号最近 N 条推文
    const officialTweets = await fetchOfficialTweets(apiKey, limit)
    const officialIds = new Set(officialTweets.map((t) => t.id))

    // Step 2: 获取所有 KOL 列表
    const adminSupabase = createAdminClient()
    const { data: kols, error: kolsError } = await adminSupabase
      .from("kols")
      .select("id, twitter_username, display_name, avatar_url")
      .eq("is_zombie", false)

    if (kolsError || !kols) {
      return NextResponse.json({ success: false, error: "Failed to fetch KOLs" }, { status: 500 })
    }

    // Step 3: 遍历每个 KOL 的时间线，查找对官方推文的互动
    const allInteractions: KolInteraction[] = []

    for (const kol of kols) {
      if (!kol.twitter_username) continue

      try {
        const kolInteractions = await fetchKolDaoInteractions(apiKey, kol, officialIds)
        allInteractions.push(...kolInteractions)

        // 简单限流，避免触发第三方 API 频率限制
        await new Promise((resolve) => setTimeout(resolve, 1200))
      } catch (error) {
        console.error(`[v0] Failed to fetch DAO interactions for ${kol.twitter_username}:`, error)
      }
    }

    // Step 4: 聚合每个 KOL 的互动统计
    const interactionsByKol: Record<
      string,
      {
        kol_id: string
        twitter_username: string
        display_name: string
        avatar_url: string | null
        total: number
        retweet: number
        quote: number
        reply: number
        link: number
        interactions: KolInteraction[]
      }
    > = {}

    for (const item of allInteractions) {
      const key = item.kol_id
      if (!interactionsByKol[key]) {
        interactionsByKol[key] = {
          kol_id: item.kol_id,
          twitter_username: item.twitter_username,
          display_name: item.display_name,
          avatar_url: item.avatar_url,
          total: 0,
          retweet: 0,
          quote: 0,
          reply: 0,
          link: 0,
          interactions: [],
        }
      }

      const bucket = interactionsByKol[key]
      bucket.total++
      bucket[item.type]++
      bucket.interactions.push(item)
    }

    const kolSummaries = Object.values(interactionsByKol).sort((a, b) => b.total - a.total)

    return NextResponse.json({
      success: true,
      official: {
        username: OFFICIAL_HANDLE,
        tweet_count: officialTweets.length,
        tweets: officialTweets,
      },
      kols: kolSummaries,
      totalInteractions: allInteractions.length,
      limit,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] DAO interactions collection error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

async function fetchOfficialTweets(apiKey: string, limit: number): Promise<OfficialTweet[]> {
  console.log("[v0] Fetching official tweets for", OFFICIAL_HANDLE)

  const profileUrl = `https://twitter.good6.top/api/base/apitools/userByScreenNameV2?apiKey=${encodeURIComponent(apiKey)}&screenName=${encodeURIComponent(OFFICIAL_USERNAME)}`
  const profileResp = await fetch(profileUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })

  if (!profileResp.ok) {
    throw new Error(`Failed to fetch official profile: HTTP ${profileResp.status}`)
  }

  const profileData = await profileResp.json()
  if (profileData.code !== 1 || !profileData.data) {
    throw new Error(`Official profile API error: ${profileData.msg || "No data"}`)
  }

  let parsedProfile = profileData.data
  if (typeof parsedProfile === "string") {
    parsedProfile = JSON.parse(parsedProfile)
  }

  const userResult = parsedProfile?.data?.user?.result
  const restId = userResult?.rest_id

  if (!restId) {
    throw new Error("Official account rest_id not found")
  }

  const tweetsUrl = `https://twitter.good6.top/api/base/apitools/userTweetsV2?apiKey=${encodeURIComponent(apiKey)}&userId=${encodeURIComponent(restId)}&count=${limit}`
  const tweetsResp = await fetch(tweetsUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })

  if (!tweetsResp.ok) {
    throw new Error(`Failed to fetch official tweets: HTTP ${tweetsResp.status}`)
  }

  const tweetsData = await tweetsResp.json()
  if (tweetsData.code !== 1 || !tweetsData.data) {
    throw new Error(`Official tweets API error: ${tweetsData.msg || "No data"}`)
  }

  let innerTweets = tweetsData.data
  if (typeof innerTweets === "string") {
    innerTweets = JSON.parse(innerTweets)
  }

  const timeline = innerTweets?.data?.user?.result?.timeline_v2?.timeline
  const instructions = timeline?.instructions || []

  const officialTweets: OfficialTweet[] = []

  for (const instruction of instructions) {
    if (instruction.type === "TimelineAddEntries" && instruction.entries) {
      for (const entry of instruction.entries) {
        if (entry.entryId?.startsWith("tweet-") || entry.entryId?.startsWith("profile-conversation-")) {
          const tweet = entry.content?.itemContent?.tweet_results?.result
          if (!tweet || tweet.__typename === "TweetUnavailable") continue

          const legacy = tweet.legacy || tweet.tweet?.legacy
          const tweetId = tweet.rest_id || legacy?.id_str
          if (!tweetId || !legacy) continue

          officialTweets.push({
            id: String(tweetId),
            created_at: legacy.created_at || new Date().toISOString(),
            text: legacy.full_text || legacy.text || "",
          })
        }
      }
    }
  }

  console.log(`[v0] Found ${officialTweets.length} official tweets`)
  return officialTweets
}

async function fetchKolDaoInteractions(
  apiKey: string,
  kol: { id: string; twitter_username: string; display_name: string; avatar_url: string | null },
  officialIds: Set<string>,
): Promise<KolInteraction[]> {
  console.log(`[v0] Fetching DAO interactions for ${kol.twitter_username}`)

  const apiUrl = `https://twitter.good6.top/api/base/apitools/userTimeline?apiKey=${encodeURIComponent(apiKey)}&screenName=${encodeURIComponent(kol.twitter_username)}&count=100`
  const resp = await fetch(apiUrl, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  })

  if (!resp.ok) {
    throw new Error(`Timeline HTTP error ${resp.status}`)
  }

  const data = await resp.json()
  if (data.code !== 0 || !data.data) {
    throw new Error(`Timeline API error: ${data.msg || "No data"}`)
  }

  const inner = JSON.parse(data.data)
  const tweets = inner?.data || []

  const interactions: KolInteraction[] = []

  for (const wrapper of tweets) {
    const tweetData = wrapper.tweet || {}
    const myTweetId = tweetData.id_str
    if (!myTweetId) continue

    const createdAt: string = tweetData.created_at || new Date().toISOString()
    const fullText: string = tweetData.full_text || tweetData.text || ""

    const retweetedId: string | undefined = tweetData.retweeted_status_id_str
    const quotedId: string | undefined = tweetData.quoted_status_id_str
    const replyToId: string | undefined = tweetData.in_reply_to_status_id_str

    let interactionType: KolInteraction["type"] | null = null
    let officialId: string | null = null

    // 优先级：转推 > 引用 > 回复 > 带链接
    if (retweetedId && officialIds.has(String(retweetedId))) {
      interactionType = "retweet"
      officialId = String(retweetedId)
    } else if (quotedId && officialIds.has(String(quotedId))) {
      interactionType = "quote"
      officialId = String(quotedId)
    } else if (replyToId && officialIds.has(String(replyToId))) {
      interactionType = "reply"
      officialId = String(replyToId)
    } else {
      // 检查是否在文本中包含官方推文 ID（通过链接）
      for (const id of officialIds) {
        if (fullText.includes(id) || fullText.includes(`status/${id}`)) {
          interactionType = "link"
          officialId = id
          break
        }
      }
    }

    if (interactionType && officialId) {
      interactions.push({
        kol_id: kol.id,
        twitter_username: kol.twitter_username,
        display_name: kol.display_name,
        avatar_url: kol.avatar_url,
        my_tweet_id: String(myTweetId),
        official_tweet_id: officialId,
        type: interactionType,
        created_at: createdAt,
      })
    }
  }

  console.log(`[v0] ${kol.twitter_username} has ${interactions.length} interactions with DAO tweets`)
  return interactions
}









