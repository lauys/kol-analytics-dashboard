import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const maxDuration = 60

const OFFICIAL_USERNAME = "Brain_KOL_DAO" // 不带 @
const OFFICIAL_HANDLE = "@Brain_KOL_DAO"

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

    // Step 3: 方法1 - 直接获取官方推文的回复列表（更准确）
    const allInteractions: KolInteraction[] = []
    const kolUsernames = new Set(kols.map((k) => k.twitter_username).filter(Boolean))
    
    console.log(`[v0] Fetching replies to ${officialTweets.length} official tweets`)
    for (const officialTweet of officialTweets) {
      try {
        const replies = await fetchRepliesToTweet(apiKey, officialTweet.id, kolUsernames, kols)
        allInteractions.push(...replies)
        // 限流
        await new Promise((resolve) => setTimeout(resolve, 800))
      } catch (error) {
        console.error(`[v0] Failed to fetch replies for tweet ${officialTweet.id}:`, error)
      }
    }

    // Step 3b: 方法2 - 遍历每个 KOL 的时间线，查找对官方推文的互动（作为补充）
    console.log(`[v0] Also checking KOL timelines for interactions`)
    for (const kol of kols) {
      if (!kol.twitter_username) continue

      try {
        const kolInteractions = await fetchKolDaoInteractions(apiKey, kol, officialIds)
        // 去重：如果已经在方法1中找到，就不重复添加
        for (const interaction of kolInteractions) {
          const exists = allInteractions.some(
            (existing) =>
              existing.kol_id === interaction.kol_id &&
              existing.my_tweet_id === interaction.my_tweet_id &&
              existing.official_tweet_id === interaction.official_tweet_id,
          )
          if (!exists) {
            allInteractions.push(interaction)
          }
        }

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

// 直接获取官方推文的回复列表（更准确的方法）
async function fetchRepliesToTweet(
  apiKey: string,
  tweetId: string,
  kolUsernames: Set<string>,
  kols: Array<{ id: string; twitter_username: string; display_name: string; avatar_url: string | null }>,
): Promise<KolInteraction[]> {
  try {
    const apiUrl = `https://twitter.good6.top/api/base/apitools/tweetTimeline?apiKey=${encodeURIComponent(apiKey)}&tweetId=${encodeURIComponent(tweetId)}`
    const resp = await fetch(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    if (!resp.ok) {
      throw new Error(`TweetTimeline HTTP error ${resp.status}`)
    }

    const data = await resp.json()
    if (data.code !== 1 || !data.data) {
      // 如果没有回复或 API 返回错误，返回空数组
      return []
    }

    let inner = data.data
    if (typeof inner === "string") {
      inner = JSON.parse(inner)
    }

    const instructions = inner?.data?.threaded_conversation_with_injections_v2?.instructions || []
    const interactions: KolInteraction[] = []

    // 构建回复链映射：tweetId -> 所有回复它的推文 ID
    const replyChain = new Map<string, Set<string>>()
    const allTweets = new Map<string, { tweet: any; legacy: any; user: any }>()

    // 第一遍：收集所有推文和构建回复链
    for (const instruction of instructions) {
      if (instruction.type === "TimelineAddEntries" && instruction.entries) {
        for (const entry of instruction.entries) {
          if (entry.entryId?.startsWith("tweet-")) {
            const tweet = entry.content?.itemContent?.tweet_results?.result
            if (!tweet || tweet.__typename === "TweetUnavailable") continue

            const legacy = tweet.legacy || tweet.tweet?.legacy
            const myTweetId = String(tweet.rest_id || legacy?.id_str)
            const replyToId = legacy?.in_reply_to_status_id_str
            const user = tweet.core?.user_results?.result || tweet.tweet?.core?.user_results?.result

            allTweets.set(myTweetId, { tweet, legacy, user })

            if (replyToId) {
              const replyToIdStr = String(replyToId)
              if (!replyChain.has(replyToIdStr)) {
                replyChain.set(replyToIdStr, new Set())
              }
              replyChain.get(replyToIdStr)!.add(myTweetId)
            }
          }
        }
      }
    }

    // 第二遍：递归查找所有回复到目标推文或其回复链的推文
    const findRepliesRecursive = (targetId: string, visited: Set<string>): string[] => {
      if (visited.has(targetId)) return []
      visited.add(targetId)

      const directReplies = Array.from(replyChain.get(targetId) || [])
      const allReplies: string[] = [...directReplies]

      for (const replyId of directReplies) {
        allReplies.push(...findRepliesRecursive(replyId, visited))
      }

      return allReplies
    }

    const allReplyIds = findRepliesRecursive(tweetId, new Set())

    // 第三遍：提取 KOL 的回复
    for (const replyId of allReplyIds) {
      const tweetData = allTweets.get(replyId)
      if (!tweetData) continue

      const { legacy, user } = tweetData
      const username = user?.legacy?.screen_name?.toLowerCase()

      if (username && kolUsernames.has(username)) {
        const kol = kols.find((k) => k.twitter_username?.toLowerCase() === username)
        if (kol) {
          interactions.push({
            kol_id: kol.id,
            twitter_username: kol.twitter_username,
            display_name: kol.display_name,
            avatar_url: kol.avatar_url,
            my_tweet_id: replyId,
            official_tweet_id: tweetId,
            type: "reply",
            created_at: legacy?.created_at || new Date().toISOString(),
          })
        }
      }
    }

    console.log(`[v0] Found ${interactions.length} replies to tweet ${tweetId}`)
    return interactions
  } catch (error) {
    console.error(`[v0] Error fetching replies for tweet ${tweetId}:`, error)
    return []
  }
}

async function fetchKolDaoInteractions(
  apiKey: string,
  kol: { id: string; twitter_username: string; display_name: string; avatar_url: string | null },
  officialIds: Set<string>,
): Promise<KolInteraction[]> {
  console.log(`[v0] Fetching DAO interactions for ${kol.twitter_username}`)

  // 增加获取数量到 200，以捕获更多历史回复
  const apiUrl = `https://twitter.good6.top/api/base/apitools/userTimeline?apiKey=${encodeURIComponent(apiKey)}&screenName=${encodeURIComponent(kol.twitter_username)}&count=200`
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
    const replyToUserId: string | undefined = tweetData.in_reply_to_user_id_str

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
      // 直接回复官方推文
      interactionType = "reply"
      officialId = String(replyToId)
    } else if (replyToId) {
      // 回复链：尝试追溯回复链，看是否最终回复到官方推文
      // 注意：这需要额外的 API 调用，暂时先检查文本中是否包含官方账号提及
      const lowerText = fullText.toLowerCase()
      if (lowerText.includes("@brain_kol_dao") || lowerText.includes("brain_kol_dao")) {
        // 可能是回复链中的一环，标记为回复（但 officialId 可能不准确）
        // 优先尝试从文本中提取推文 ID
        const statusMatch = fullText.match(/status\/(\d+)/i)
        if (statusMatch) {
          const extractedId = statusMatch[1]
          if (officialIds.has(extractedId)) {
            interactionType = "reply"
            officialId = extractedId
          }
        } else {
          // 如果无法确定具体推文，但包含官方账号，标记为回复（使用第一个可能的官方推文）
          // 这种情况需要后续优化
          interactionType = "reply"
          officialId = Array.from(officialIds)[0] || String(replyToId)
        }
      }
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









