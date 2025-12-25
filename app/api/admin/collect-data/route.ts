import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const maxDuration = 300 // 增加超时时间，因为需要采集更多数据

/**
 * 带超时和重试机制的 fetch 函数
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  timeout = 30000, // 30秒超时
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response
    } catch (error: any) {
      const isTimeout =
        error.name === "AbortError" ||
        error.code === "UND_ERR_CONNECT_TIMEOUT" ||
        error.cause?.code === "UND_ERR_CONNECT_TIMEOUT"
      
      const isConnectionError =
        error.code === "UND_ERR_CONNECT_TIMEOUT" ||
        error.code === "ECONNREFUSED" ||
        error.code === "ENOTFOUND" ||
        error.message?.includes("fetch failed") ||
        error.message?.includes("network") ||
        error.cause?.code === "UND_ERR_CONNECT_TIMEOUT"

      // 如果是超时或连接错误，且还有重试机会，则重试
      if (attempt < retries && (isTimeout || isConnectionError)) {
        const delay = attempt * 2000 // 指数退避：2s, 4s, 6s
        const errorType = isTimeout ? "timeout" : "connection error"
        console.log(
          `[v0] ⚠ Fetch ${errorType} for ${url} (attempt ${attempt}/${retries}), retrying after ${delay}ms...`,
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      // 最后一次尝试失败
      if (attempt === retries) {
        const errorType = isTimeout ? "timeout" : isConnectionError ? "connection error" : "error"
        console.error(
          `[v0] ✗ Fetch failed after ${retries} attempts (${errorType}) for ${url}:`,
          error.message || error.toString(),
        )
        throw error
      }
    }
  }

  throw new Error("Unexpected error in fetchWithRetry")
}

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
  type: "retweet" | "quote" | "reply" | "like" | "link"
  created_at: string
  full_text?: string // 推文完整内容
  likes?: number
  retweets?: number
  replies?: number
  quotes?: number
}

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Starting data collection...")

    const supabase = createAdminClient()

    const apiKey = process.env.TWITTER_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing TWITTER_API_KEY environment variable",
        },
        { status: 500 },
      )
    }

    console.log("[v0] Environment variables found")

    // 从数据库动态获取 KOL 列表，而不是在代码中硬编码
    const { data: dbKols, error: dbKolsError } = await supabase
      .from("kols")
      .select("twitter_username")
      .eq("is_zombie", false)
      .not("twitter_username", "is", null)

    if (dbKolsError) {
      console.error("[v0] ✗ Failed to load KOL list from database:", dbKolsError)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to load KOL list from database: ${dbKolsError.message}`,
        },
        { status: 500 },
      )
    }

    const kols = (dbKols || [])
      .map((k) => k.twitter_username as string | null)
      .filter((username): username is string => Boolean(username))

    console.log(`[v0] Loaded ${kols.length} KOLs from database for profile & snapshot collection`)

    const results = {
      success: [],
      failed: [],
      total: kols.length,
    }

    const kolDetails: Array<{
      username: string
      display_name?: string
      followers_count?: number
      following_count?: number
      tweet_count?: number
      status: "success" | "failed"
      error?: string
    }> = []

    for (let i = 0; i < kols.length; i++) {
      const username = kols[i]
      console.log(`[v0] [${i + 1}/${kols.length}] Processing ${username}...`)

      try {
        const apiUrl = `https://twitter.good6.top/api/base/apitools/userByScreenNameV2?apiKey=${encodeURIComponent(apiKey)}&screenName=${username}`
        console.log(`[v0] Fetching data for ${username}...`)

        const response = await fetchWithRetry(apiUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
        const data = await response.json()

        if (data.code !== 1 || !data.data) {
          const errorMsg = data.msg || "No data returned"
          console.log(`[v0] ✗ API error for ${username}: ${errorMsg}`)
          results.failed.push({ username, error: errorMsg })
          kolDetails.push({
            username,
            status: "failed",
            error: errorMsg,
          })
          continue
        }

        const innerData = JSON.parse(data.data)
        const userData = innerData?.data?.user?.result?.legacy

        if (!userData) {
          const errorMsg = "No user data in response"
          console.log(`[v0] ✗ No user data found for ${username}`)
          results.failed.push({ username, error: errorMsg })
          kolDetails.push({
            username,
            status: "failed",
            error: errorMsg,
          })
          continue
        }

        console.log(`[v0] ✓ Got data for ${username}: ${userData.followers_count} followers`)

        const userResult = innerData?.data?.user?.result
        const twitterUserId = userResult?.rest_id

        if (!twitterUserId) {
          const errorMsg = "No twitter_user_id in response"
          console.log(`[v0] ✗ No twitter_user_id found for ${username}`)
          results.failed.push({ username, error: errorMsg })
          kolDetails.push({
            username,
            status: "failed",
            error: errorMsg,
          })
          continue
        }

        console.log(`[v0] ✓ Twitter ID for ${username}: ${twitterUserId}`)

        const newBio = userData.description || ""

        const kolData = {
          twitter_username: userData.screen_name,
          twitter_user_id: twitterUserId,
          display_name: userData.name,
          avatar_url:
            userData.profile_image_url_https?.replace("_normal", "_400x400") || userData.profile_image_url_https,
          bio: newBio,
          followers_count: userData.followers_count || 0,
          following_count: userData.friends_count || 0,
          tweet_count: userData.statuses_count || 0,
          is_zombie: false,
        }

        const { data: existingKol } = await supabase
          .from("kols")
          .select("id, bio")
          .eq("twitter_username", kolData.twitter_username)
          .maybeSingle()

        let kolId: string

        if (existingKol) {
          if (existingKol.bio && existingKol.bio !== newBio) {
            console.log(`[v0] ℹ Bio changed for ${username}, recording history...`)
            await supabase.from("bio_history").insert({
              kol_id: existingKol.id,
              old_bio: existingKol.bio,
              new_bio: newBio,
              changed_at: new Date().toISOString(),
            })
          }

          const { data: updated, error: updateError } = await supabase
            .from("kols")
            .update(kolData)
            .eq("id", existingKol.id)
            .select("id")
            .single()

          if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`)
          }

          kolId = updated!.id
          console.log(`[v0] ✓ Updated ${username}`)
        } else {
          const { data: inserted, error: insertError } = await supabase
            .from("kols")
            .insert(kolData)
            .select("id")
            .single()

          if (insertError) {
            throw new Error(`Insert failed: ${insertError.message}`)
          }

          kolId = inserted!.id
          console.log(`[v0] ✓ Inserted ${username}`)
        }

        await supabase.from("snapshots").insert({
          kol_id: kolId,
          followers_count: kolData.followers_count,
          following_count: kolData.following_count,
          tweet_count: kolData.tweet_count,
        })

        results.success.push(username)
        
        kolDetails.push({
          username,
          display_name: kolData.display_name,
          followers_count: kolData.followers_count,
          following_count: kolData.following_count,
          tweet_count: kolData.tweet_count,
          status: "success",
        })

        console.log(`[v0] Collecting tweets for ${username}...`)
        try {
          const pinnedTweetIds: string[] = []

          // Try to get pinned tweet IDs from user profile API
          try {
            const profileUrl = `https://twitter.good6.top/api/base/apitools/userByScreenNameV2?apiKey=${encodeURIComponent(apiKey)}&screenName=${encodeURIComponent(username)}`
            const profileResponse = await fetchWithRetry(profileUrl, {
              method: "GET",
              headers: { "Content-Type": "application/json" },
            })

            if (profileResponse.ok) {
              const profileData = await profileResponse.json()
              if (profileData.code === 1 && profileData.data) {
                let profileParsed = profileData.data
                if (typeof profileParsed === "string") {
                  profileParsed = JSON.parse(profileParsed)
                }
                const userLegacy = profileParsed?.data?.user?.result?.legacy
                if (userLegacy?.pinned_tweet_ids_str && Array.isArray(userLegacy.pinned_tweet_ids_str)) {
                  pinnedTweetIds.push(...userLegacy.pinned_tweet_ids_str)
                  console.log(`[v0] ✓ Found ${pinnedTweetIds.length} pinned tweet ID(s) from profile API`)
                }
              }
            }
          } catch (profileError) {
            console.log(`[v0] ⚠ Could not fetch profile for pinned tweets:`, profileError)
          }

          // Fallback: Try to get from userData if available
          if (pinnedTweetIds.length === 0) {
            if (userData.pinned_tweet_ids_str && Array.isArray(userData.pinned_tweet_ids_str)) {
              pinnedTweetIds.push(...userData.pinned_tweet_ids_str)
              console.log(`[v0] Found ${userData.pinned_tweet_ids_str.length} pinned IDs from legacy data`)
            }

            if (userResult?.legacy?.pinned_tweet_ids_str && Array.isArray(userResult.legacy.pinned_tweet_ids_str)) {
              for (const id of userResult.legacy.pinned_tweet_ids_str) {
                if (!pinnedTweetIds.includes(id)) {
                  pinnedTweetIds.push(id)
                }
              }
              console.log(`[v0] Found additional pinned IDs from userResult.legacy`)
            }
          }

          console.log(`[v0] Total pinned tweet IDs for ${username}:`, pinnedTweetIds)

          // Fetch recent tweets
          const tweetsApiUrl = `https://twitter.good6.top/api/base/apitools/userTweetsV2?apiKey=${encodeURIComponent(apiKey)}&userId=${twitterUserId}&count=20`
          const tweetsResponse = await fetchWithRetry(tweetsApiUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          })
          const tweetsData = await tweetsResponse.json()

          const allTweets: any[] = []

          if (tweetsData.code === 1 && tweetsData.data) {
            const innerTweetsData = JSON.parse(tweetsData.data)
            const timeline = innerTweetsData?.data?.user?.result?.timeline_v2?.timeline?.instructions || []

            // First, check for TimelinePinEntry to get pinned tweet ID
            const pinEntry = timeline.find((instruction: any) => instruction.type === "TimelinePinEntry")
            if (pinEntry?.entry?.content?.itemContent?.tweet_results?.result) {
              const pinnedTweet = pinEntry.entry.content.itemContent.tweet_results.result
              const pinnedTweetId = pinnedTweet.rest_id || pinnedTweet.legacy?.id_str
              if (pinnedTweetId && !pinnedTweetIds.includes(pinnedTweetId)) {
                pinnedTweetIds.push(pinnedTweetId)
                console.log(`[v0] ✓ Found pinned tweet ID from TimelinePinEntry: ${pinnedTweetId}`)
              }
            }

            // Then collect all tweets from timeline
            for (const instruction of timeline) {
              if (instruction.type === "TimelineAddEntries" && instruction.entries) {
                const recentTweets = instruction.entries
                  .filter(
                    (entry: any) =>
                      entry.entryId?.startsWith("tweet-") || entry.entryId?.startsWith("profile-conversation-"),
                  )
                  .map((entry: any) => {
                    const tweet = entry.content?.itemContent?.tweet_results?.result
                    if (!tweet || tweet.__typename === "TweetUnavailable") return null
                    return tweet.legacy || tweet.tweet?.legacy
                  })
                  .filter(Boolean)

                allTweets.push(...recentTweets)
              }
            }
          }

          console.log(`[v0] Total tweets collected: ${allTweets.length}`)

          if (allTweets.length > 0) {
            const uniqueTweets = Array.from(
              new Map(allTweets.map((tweet) => [String(tweet.id_str || tweet.conversation_id_str), tweet])).values(),
            )

            console.log(`[v0] Unique tweets after deduplication: ${uniqueTweets.length}`)

            if (uniqueTweets.length > 0) {
              console.log(`[v0] First 3 tweet IDs from API:`)
              uniqueTweets.slice(0, 3).forEach((tweet, idx) => {
                const tweetId = String(tweet.id_str || tweet.conversation_id_str)
                console.log(
                  `  [${idx + 1}] ID: ${tweetId}, Type: ${typeof tweetId}, id_str type: ${typeof tweet.id_str}`,
                )
              })
              console.log(`[v0] Pinned IDs to match against:`)
              pinnedTweetIds.forEach((id, idx) => {
                console.log(`  [${idx + 1}] ID: ${id}, Type: ${typeof id}`)
              })
            }

            const tweetRecords = uniqueTweets.map((tweet) => {
              const tweetId = String(tweet.id_str || tweet.conversation_id_str)
              const isPinned = pinnedTweetIds.includes(tweetId)

              if (isPinned) {
                console.log(`[v0] ✓ Marked tweet as pinned: ${tweetId}`)
              }

              return {
                kol_id: kolId,
                tweet_id: tweetId,
                text_content: tweet.full_text || "",
                likes: Number(tweet.favorite_count || 0),
                retweets: Number(tweet.retweet_count || 0),
                replies: Number(tweet.reply_count || 0),
                quotes: Number(tweet.quote_count || 0),
                is_pinned: isPinned,
                media_type: tweet.entities?.media?.[0]?.type || null,
                // 使用推文原始创建时间作为互动时间，避免总是显示“1分钟前”
                recorded_at: tweet.created_at ? new Date(tweet.created_at).toISOString() : new Date().toISOString(),
              }
            })

            const foundPinnedIds = tweetRecords.filter((t) => t.is_pinned).map((t) => t.tweet_id)
            const missingPinnedIds = pinnedTweetIds.filter((id) => !foundPinnedIds.includes(id))

            if (missingPinnedIds.length > 0) {
              console.log(
                `[v0] Creating placeholder records for ${missingPinnedIds.length} pinned tweet(s) not in recent tweets`,
              )

              for (const pinnedId of missingPinnedIds) {
                tweetRecords.push({
                  kol_id: kolId,
                  tweet_id: pinnedId,
                  text_content: "[Pinned Tweet - Not in recent timeline]",
                  likes: 0,
                  retweets: 0,
                  replies: 0,
                  quotes: 0,
                  is_pinned: true,
                  media_type: null,
                  recorded_at: new Date().toISOString(),
                })
              }
            }

            console.log(`[v0] Tweet records to save: ${tweetRecords.length}`)
            const pinnedCount = tweetRecords.filter((t) => t.is_pinned).length
            console.log(`[v0] ${pinnedCount} tweet(s) marked as pinned`)

            const { error: tweetsError } = await supabase.from("tweet_snapshots").upsert(tweetRecords, {
              onConflict: "kol_id,tweet_id",
              ignoreDuplicates: false,
            })

            if (tweetsError) {
              console.log(`[v0] ✗ Failed to save tweets for ${username}: ${tweetsError.message}`)
            } else {
              console.log(`[v0] ✓ Saved ${tweetRecords.length} tweets for ${username}`)
            }
          }
        } catch (tweetError) {
          console.log(`[v0] ⚠ Could not collect tweets for ${username}:`, tweetError)
        }

        if (i < kols.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error"
        console.error(`[v0] ✗ Error processing ${username}:`, error)
        results.failed.push({
          username,
          error: errorMsg,
        })
        kolDetails.push({
          username,
          status: "failed",
          error: errorMsg,
        })
      }
    }

    console.log(`[v0] Collection complete: ${results.success.length} success, ${results.failed.length} failed`)

    // Step 2: 采集所有KOL的推文数据（如果还没有采集）
    console.log(`[v0] Starting tweet collection for all KOLs...`)
    const tweetResults = {
      success: 0,
      failed: 0,
      totalTweets: 0,
      details: [] as Array<{
        username: string
        tweetCount: number
        success: boolean
        error?: string
      }>,
    }

    const { data: allKols } = await supabase
      .from("kols")
      .select("id, twitter_username, twitter_user_id")
      .eq("is_zombie", false)

    if (allKols && allKols.length > 0) {
      for (let i = 0; i < allKols.length; i++) {
        const kol = allKols[i]
        if (!kol.twitter_username || !kol.twitter_user_id) continue

        try {
          console.log(`[v0] [${i + 1}/${allKols.length}] Collecting tweets for ${kol.twitter_username}...`)

          // 调用 collect-tweets 的逻辑来采集推文
          const tweetsApiUrl = `https://twitter.good6.top/api/base/apitools/userTweetsV2?apiKey=${encodeURIComponent(apiKey)}&userId=${kol.twitter_user_id}&count=20`
          const tweetsResponse = await fetchWithRetry(tweetsApiUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          })
          const tweetsData = await tweetsResponse.json()

          const allTweets: any[] = []

          if (tweetsData.code === 1 && tweetsData.data) {
            const innerTweetsData = JSON.parse(tweetsData.data)
            const timeline = innerTweetsData?.data?.user?.result?.timeline_v2?.timeline?.instructions || []

            // 获取置顶推文ID
            const pinnedTweetIds: string[] = []
            const pinEntry = timeline.find((instruction: any) => instruction.type === "TimelinePinEntry")
            if (pinEntry?.entry?.content?.itemContent?.tweet_results?.result) {
              const pinnedTweet = pinEntry.entry.content.itemContent.tweet_results.result
              const pinnedTweetId = pinnedTweet.rest_id || pinnedTweet.legacy?.id_str
              if (pinnedTweetId) {
                pinnedTweetIds.push(pinnedTweetId)
              }
            }

            // 收集所有推文
            for (const instruction of timeline) {
              if (instruction.type === "TimelineAddEntries" && instruction.entries) {
                const recentTweets = instruction.entries
                  .filter(
                    (entry: any) =>
                      entry.entryId?.startsWith("tweet-") || entry.entryId?.startsWith("profile-conversation-"),
                  )
                  .map((entry: any) => {
                    const tweet = entry.content?.itemContent?.tweet_results?.result
                    if (!tweet || tweet.__typename === "TweetUnavailable") return null
                    return tweet.legacy || tweet.tweet?.legacy
                  })
                  .filter(Boolean)

                allTweets.push(...recentTweets)
              }
            }

            if (allTweets.length > 0) {
              const uniqueTweets = Array.from(
                new Map(allTweets.map((tweet) => [String(tweet.id_str || tweet.conversation_id_str), tweet])).values(),
              )

              const tweetRecords = uniqueTweets.map((tweet) => {
                const tweetId = String(tweet.id_str || tweet.conversation_id_str)
                const isPinned = pinnedTweetIds.includes(tweetId)

                return {
                  kol_id: kol.id,
                  tweet_id: tweetId,
                  text_content: tweet.full_text || "",
                  likes: Number(tweet.favorite_count || 0),
                  retweets: Number(tweet.retweet_count || 0),
                  replies: Number(tweet.reply_count || 0),
                  quotes: Number(tweet.quote_count || 0),
                  is_pinned: isPinned,
                  media_type: tweet.entities?.media?.[0]?.type || null,
                  recorded_at: new Date().toISOString(),
                }
              })

              // 为不在最近推文中的置顶推文创建占位记录
              const foundPinnedIds = tweetRecords.filter((t) => t.is_pinned).map((t) => t.tweet_id)
              const missingPinnedIds = pinnedTweetIds.filter((id) => !foundPinnedIds.includes(id))

              for (const pinnedId of missingPinnedIds) {
                tweetRecords.push({
                  kol_id: kol.id,
                  tweet_id: pinnedId,
                  text_content: "[Pinned Tweet - Not in recent timeline]",
                  likes: 0,
                  retweets: 0,
                  replies: 0,
                  quotes: 0,
                  is_pinned: true,
                  media_type: null,
                  recorded_at: new Date().toISOString(),
                })
              }

              const { error: tweetsError } = await supabase.from("tweet_snapshots").upsert(tweetRecords, {
                onConflict: "kol_id,tweet_id",
                ignoreDuplicates: false,
              })

              if (tweetsError) {
                console.log(`[v0] ✗ Failed to save tweets for ${kol.twitter_username}: ${tweetsError.message}`)
                tweetResults.failed++
                tweetResults.details.push({
                  username: kol.twitter_username,
                  tweetCount: 0,
                  success: false,
                  error: tweetsError.message,
                })
              } else {
                console.log(`[v0] ✓ Saved ${tweetRecords.length} tweets for ${kol.twitter_username}`)
                tweetResults.success++
                tweetResults.totalTweets += tweetRecords.length
                tweetResults.details.push({
                  username: kol.twitter_username,
                  tweetCount: tweetRecords.length,
                  success: true,
                })
              }
            }
          }

          // 限流
          if (i < allKols.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1500))
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error"
          console.error(`[v0] ✗ Error collecting tweets for ${kol.twitter_username}:`, error)
          tweetResults.failed++
          tweetResults.details.push({
            username: kol.twitter_username,
            tweetCount: 0,
            success: false,
            error: errorMsg,
          })
        }
      }
    }

    console.log(`[v0] Tweet collection complete: ${tweetResults.success} success, ${tweetResults.failed} failed`)

    // Step 3: 采集DAO互动数据
    console.log(`[v0] Starting DAO interactions collection...`)
    let daoInteractionsCount = 0

    try {
      // 获取官方账号最近100条推文
      const officialTweets = await fetchOfficialTweets(apiKey, 100)
      const officialIds = new Set(officialTweets.map((t) => t.id))
      console.log(`[v0] Found ${officialTweets.length} official tweets`)
      console.log(`[v0] Official tweet IDs (first 5):`, Array.from(officialIds).slice(0, 5))

      // 方法1: 从已采集的推文数据中查找互动（更可靠）
      console.log(`[v0] Checking interactions from existing tweet_snapshots...`)
      const allInteractions: KolInteraction[] = []
      
      const { data: existingTweets, error: tweetsError } = await supabase
        .from("tweet_snapshots")
        .select("kol_id, tweet_id, text_content, likes, retweets, replies, quotes, recorded_at")
        .gte("recorded_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 最近30天

      if (!tweetsError && existingTweets) {
        console.log(`[v0] Found ${existingTweets.length} existing tweets to check`)

        // 获取所有KOL信息
        const { data: kolsForMapping } = await supabase
          .from("kols")
          .select("id, twitter_username, display_name, avatar_url")
          .eq("is_zombie", false)

        const kolsMap = new Map((kolsForMapping || []).map(k => [k.id, k]))

        // 检查每条推文是否与官方推文有互动
        for (const tweet of existingTweets) {
          const kol = kolsMap.get(tweet.kol_id)
          if (!kol) continue

          const textContent = (tweet.text_content || "").toLowerCase()
          
          // 检查是否包含官方推文ID或 @Titannet_dao
          let interactionType: KolInteraction["type"] | null = null
          let officialId: string | null = null

          // 检查文本中是否包含官方推文ID
          for (const id of officialIds) {
            if (textContent.includes(id) || textContent.includes(`status/${id}`)) {
              // 根据文本内容判断互动类型
              // 注意：转发识别需要更精确，因为文本中可能包含 "RT" 但不是真正的转发
              // 真正的转发通常文本以 "RT @username: " 开头，且文本内容是被转发的推文
              const isRetweet = textContent.startsWith("rt @titannet_dao") || 
                               (textContent.startsWith("rt ") && textContent.includes("@titannet_dao"))
              const isQuote = textContent.includes("quote @titannet_dao") || 
                             textContent.includes("引用 @titannet_dao")
              const isReply = textContent.includes("reply @titannet_dao") || 
                             textContent.includes("回复 @titannet_dao") ||
                             textContent.includes("comment @titannet_dao") ||
                             textContent.includes("评论 @titannet_dao")
              const isLike = textContent.includes("like @titannet_dao") || 
                            textContent.includes("点赞 @titannet_dao") ||
                            textContent.includes("favorite @titannet_dao")
              
              if (isRetweet) {
                interactionType = "retweet"
              } else if (isQuote) {
                interactionType = "quote"
              } else if (isReply) {
                interactionType = "reply"
              } else if (isLike) {
                interactionType = "like"
              } else {
                interactionType = "link"
              }
              officialId = id
              break
            }
          }

          // 如果文本包含 @Titannet_dao 但没有找到具体ID，也标记为互动
          if (!interactionType && (textContent.includes("@titannet_dao") || textContent.includes("titannet_dao"))) {
            interactionType = "reply" // 默认为回复类型
            officialId = Array.from(officialIds)[0] // 使用第一个官方推文ID作为占位
          }

          if (interactionType && officialId) {
            allInteractions.push({
              kol_id: kol.id,
              twitter_username: kol.twitter_username,
              display_name: kol.display_name,
              avatar_url: kol.avatar_url,
              my_tweet_id: tweet.tweet_id,
              official_tweet_id: officialId,
              type: interactionType,
              created_at: tweet.recorded_at,
              full_text: tweet.text_content || "",
              likes: tweet.likes || 0,
              retweets: tweet.retweets || 0,
              replies: tweet.replies || 0,
              quotes: tweet.quotes || 0,
            })
          }
        }

        daoInteractionsCount = allInteractions.length
        console.log(`[v0] Found ${allInteractions.length} interactions from existing tweets`)

        // 保存互动数据
        if (allInteractions.length > 0) {
          console.log(`[v0] Saving ${allInteractions.length} DAO interactions to database...`)
          
          const interactionRecords = []
          
          for (const interaction of allInteractions) {
            let textContent = interaction.full_text || ""
            
            // 确保包含 @Titannet_dao 关键词
            if (!textContent.toLowerCase().includes("@titannet_dao") && !textContent.toLowerCase().includes("titannet_dao")) {
              const prefix = interaction.type === "retweet" 
                ? "RT @Titannet_dao " 
                : interaction.type === "quote"
                ? "Quote @Titannet_dao "
                : interaction.type === "reply"
                ? "Reply @Titannet_dao "
                : interaction.type === "like"
                ? "Like @Titannet_dao "
                : "@Titannet_dao "
              textContent = prefix + textContent
            }
            
            let recordedAt: string
            if (interaction.created_at) {
              try {
                const date = new Date(interaction.created_at)
                recordedAt = isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
              } catch {
                recordedAt = new Date().toISOString()
              }
            } else {
              recordedAt = new Date().toISOString()
            }
            
            interactionRecords.push({
              kol_id: interaction.kol_id,
              tweet_id: interaction.my_tweet_id,
              text_content: textContent,
              likes: interaction.likes || 0,
              retweets: interaction.retweets || 0,
              replies: interaction.replies || 0,
              quotes: interaction.quotes || 0,
              is_pinned: false,
              media_type: null,
              recorded_at: recordedAt,
            })
          }
          
          if (interactionRecords.length > 0) {
            const { error: saveError } = await supabase
              .from("tweet_snapshots")
              .upsert(interactionRecords, {
                onConflict: "kol_id,tweet_id",
                ignoreDuplicates: false,
              })
            
            if (saveError) {
              console.error(`[v0] Failed to save DAO interactions:`, saveError)
            } else {
              console.log(`[v0] ✓ Saved ${interactionRecords.length} DAO interaction records`)
            }
          }
        }

        // 方法2: 尝试从 userTimeline API 获取更多互动（作为补充）
        console.log(`[v0] Attempting to fetch additional interactions from userTimeline API...`)
        const { data: kolsForDao, error: kolsError } = await supabase
          .from("kols")
          .select("id, twitter_username, display_name, avatar_url")
          .eq("is_zombie", false)

        if (!kolsError && kolsForDao) {
          const apiInteractions: KolInteraction[] = []

          for (let i = 0; i < Math.min(kolsForDao.length, 10); i++) { // 限制只检查前10个，避免超时
            const kol = kolsForDao[i]
            if (!kol.twitter_username) continue

            try {
              console.log(
                `[v0] [${i + 1}/${Math.min(kolsForDao.length, 10)}] Fetching DAO interactions for ${kol.twitter_username}...`,
              )
              const kolInteractions = await fetchKolDaoInteractions(apiKey, kol, officialIds)
              apiInteractions.push(...kolInteractions)

              // 限流
              if (i < Math.min(kolsForDao.length, 10) - 1) {
                await new Promise((resolve) => setTimeout(resolve, 1200))
              }
            } catch (error) {
              console.error(`[v0] Failed to fetch DAO interactions for ${kol.twitter_username}:`, error)
            }
          }

          // 合并API获取的互动数据
          if (apiInteractions.length > 0) {
            allInteractions.push(...apiInteractions)
            console.log(`[v0] Added ${apiInteractions.length} interactions from API`)
          }
        }
      }

      // 汇总所有互动数据
      daoInteractionsCount = allInteractions.length
      console.log(`[v0] DAO interactions collection complete: ${allInteractions.length} interactions found`)

      // 将互动数据保存到 tweet_snapshots 表
      // 需要确保这些互动推文被保存，并且 text_content 包含 @Titannet_dao 关键词以便前端查询
      if (allInteractions.length > 0) {
        console.log(`[v0] Saving ${allInteractions.length} DAO interactions to database...`)
        
        // 为每个互动推文创建或更新 tweet_snapshots 记录
        const interactionRecords = []
        
        for (const interaction of allInteractions) {
          // 使用原始推文内容，并确保包含 @Titannet_dao 关键词
          let textContent = interaction.full_text || ""
          
          // 如果原始文本不包含 @Titannet_dao，添加标记以确保能被查询到
          // 注意：查询使用 ilike，所以大小写不敏感，但为了清晰我们使用标准格式
          if (!textContent.toLowerCase().includes("@titannet_dao") && !textContent.toLowerCase().includes("titannet_dao")) {
            // 根据互动类型添加标记
            const prefix = interaction.type === "retweet" 
              ? "RT @Titannet_dao " 
              : interaction.type === "quote"
              ? "Quote @Titannet_dao "
              : interaction.type === "reply"
              ? "Reply @Titannet_dao "
              : interaction.type === "like"
              ? "Like @Titannet_dao "
              : "@Titannet_dao "
            textContent = prefix + textContent
          }
          
          // 处理 recorded_at 字段：确保是 ISO 格式的日期字符串
          let recordedAt: string
          if (interaction.created_at) {
            try {
              // 尝试解析日期字符串
              const date = new Date(interaction.created_at)
              if (isNaN(date.getTime())) {
                // 如果解析失败，使用当前时间
                recordedAt = new Date().toISOString()
              } else {
                recordedAt = date.toISOString()
              }
            } catch {
              recordedAt = new Date().toISOString()
            }
          } else {
            recordedAt = new Date().toISOString()
          }
          
          interactionRecords.push({
            kol_id: interaction.kol_id,
            tweet_id: interaction.my_tweet_id,
            text_content: textContent,
            likes: interaction.likes || 0,
            retweets: interaction.retweets || 0,
            replies: interaction.replies || 0,
            quotes: interaction.quotes || 0,
            is_pinned: false,
            media_type: null,
            recorded_at: recordedAt,
          })
          
          console.log(`[v0] Prepared interaction record: ${interaction.kol_id}/${interaction.my_tweet_id} (${interaction.type}), text: ${textContent.substring(0, 50)}...`)
        }
        
        // 批量保存或更新到 tweet_snapshots 表
        if (interactionRecords.length > 0) {
          console.log(`[v0] Upserting ${interactionRecords.length} interaction records...`)
          const { error: saveError, data: savedData } = await supabase
            .from("tweet_snapshots")
            .upsert(interactionRecords, {
              onConflict: "kol_id,tweet_id",
              ignoreDuplicates: false,
            })
            .select()
          
          if (saveError) {
            console.error(`[v0] Failed to save DAO interactions:`, saveError)
            console.error(`[v0] Error details:`, JSON.stringify(saveError, null, 2))
          } else {
            console.log(`[v0] ✓ Saved ${interactionRecords.length} DAO interaction records`)
            if (savedData) {
              console.log(`[v0] Saved records count: ${savedData.length}`)
            }
          }
        } else {
          console.log(`[v0] ⚠ No interaction records to save`)
        }
      } else {
        console.log(`[v0] ⚠ No interactions found to save`)
      }
      
      // 显示互动摘要（无论是否有互动都显示）
      console.log(`[v0] DAO interactions summary:`)
      const interactionsByKol: Record<string, number> = {}
      for (const interaction of allInteractions) {
        interactionsByKol[interaction.kol_id] = (interactionsByKol[interaction.kol_id] || 0) + 1
      }
      console.log(`[v0] KOLs with interactions: ${Object.keys(interactionsByKol).length}`)
    } catch (error) {
      console.error(`[v0] Error collecting DAO interactions:`, error)
    }

    return NextResponse.json({
      success: true,
      results,
      tweets: {
        success: tweetResults.success,
        failed: tweetResults.failed,
        totalTweets: tweetResults.totalTweets,
        details: tweetResults.details,
      },
      daoInteractions: {
        count: daoInteractionsCount,
      },
      kolDetails,
    })
  } catch (error) {
    console.error("[v0] Collection error:", error)
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
  const profileResp = await fetchWithRetry(profileUrl, {
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
  const tweetsResp = await fetchWithRetry(tweetsUrl, {
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
  
  try {
    const resp = await fetchWithRetry(apiUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })

    if (!resp.ok) {
      console.log(`[v0] ⚠ Timeline HTTP error ${resp.status} for ${kol.twitter_username}`)
      return []
    }

    // 先获取响应文本，以便更好地处理错误
    const responseText = await resp.text()
    
    if (!responseText || responseText.trim().length === 0) {
      console.log(`[v0] ⚠ Empty response for ${kol.twitter_username}`)
      return []
    }

    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.log(`[v0] ⚠ Failed to parse JSON response for ${kol.twitter_username}:`, responseText.substring(0, 100))
      return []
    }

    // 检查API响应状态
    if (data.code !== 0) {
      console.log(`[v0] ⚠ Timeline API error for ${kol.twitter_username}: ${data.msg || "Unknown error"}`)
      console.log(`[v0] Response code: ${data.code}, msg: ${data.msg}`)
      return []
    }

    if (!data.data) {
      console.log(`[v0] ⚠ No data in response for ${kol.twitter_username}`)
      console.log(`[v0] Response structure:`, Object.keys(data))
      return []
    }

    // 解析内部数据
    let inner: any
    try {
      if (typeof data.data === "string") {
        inner = JSON.parse(data.data)
      } else {
        inner = data.data
      }
    } catch (innerParseError) {
      console.log(`[v0] ⚠ Failed to parse inner data for ${kol.twitter_username}`)
      console.log(`[v0] Parse error:`, innerParseError instanceof Error ? innerParseError.message : String(innerParseError))
      console.log(`[v0] Data type: ${typeof data.data}`)
      if (typeof data.data === "string") {
        console.log(`[v0] Data preview (first 500 chars):`, data.data.substring(0, 500))
      } else {
        console.log(`[v0] Data preview:`, JSON.stringify(data.data).substring(0, 500))
      }
      return []
    }

    // userTimeline API 返回的数据结构
    // 根据 dao-interactions 接口的实现，应该是 inner.data (数组)
    const tweets = inner?.data || []
    
    if (!Array.isArray(tweets)) {
      console.log(`[v0] ⚠ Data structure issue for ${kol.twitter_username}: inner.data is not an array`)
      console.log(`[v0] inner.data type: ${typeof inner?.data}`)
      console.log(`[v0] inner keys:`, inner ? Object.keys(inner) : "null")
      if (inner) {
        console.log(`[v0] inner.data preview:`, JSON.stringify(inner.data).substring(0, 500))
      }
      return []
    }
    
    console.log(`[v0] Parsed ${tweets.length} tweets from timeline for ${kol.twitter_username}`)

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
        console.log(`[v0] ✓ Found retweet interaction: ${myTweetId} -> ${officialId}`)
      } else if (quotedId && officialIds.has(String(quotedId))) {
        interactionType = "quote"
        officialId = String(quotedId)
        console.log(`[v0] ✓ Found quote interaction: ${myTweetId} -> ${officialId}`)
      } else if (replyToId && officialIds.has(String(replyToId))) {
        interactionType = "reply"
        officialId = String(replyToId)
        console.log(`[v0] ✓ Found reply interaction: ${myTweetId} -> ${officialId}`)
      } else {
        // 检查是否在文本中包含官方推文 ID（通过链接）
        for (const id of officialIds) {
          if (fullText.includes(id) || fullText.includes(`status/${id}`)) {
            interactionType = "link"
            officialId = id
            console.log(`[v0] ✓ Found link interaction: ${myTweetId} -> ${officialId}`)
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
          full_text: fullText,
          likes: Number(tweetData.favorite_count || 0),
          retweets: Number(tweetData.retweet_count || 0),
          replies: Number(tweetData.reply_count || 0),
          quotes: Number(tweetData.quote_count || 0),
        })
      }
    }

    console.log(`[v0] ${kol.twitter_username} has ${interactions.length} interactions with DAO tweets`)
    return interactions
  } catch (error) {
    console.log(`[v0] ⚠ Error fetching DAO interactions for ${kol.twitter_username}:`, error instanceof Error ? error.message : String(error))
    return []
  }
}
