import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { kolId, tweetId } = body as { kolId?: string; tweetId?: string }

    if (!kolId || !tweetId) {
      return NextResponse.json({ error: "kolId and tweetId are required" }, { status: 400 })
    }

    const apiKey = process.env.TWITTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "Twitter API key not configured" }, { status: 500 })
    }

    const adminSupabase = createAdminClient()

    // 确认 KOL 是否存在，避免写入无效外键
    const { data: kol, error: kolError } = await adminSupabase
      .from("kols")
      .select("id")
      .eq("id", kolId)
      .maybeSingle()

    if (kolError) {
      console.error("[v0] Failed to verify KOL for pinned detail:", kolError)
      return NextResponse.json({ error: "Failed to verify KOL" }, { status: 500 })
    }

    if (!kol) {
      return NextResponse.json({ error: "KOL not found" }, { status: 404 })
    }

    // 调用 tweetTimeline 接口获取推文详情与回复
    // 文档: https://utools.readme.io/reference/tweettimelineusingget-1
    // 该接口支持可选的 auth_token 参数，某些高级功能需要此参数
    const authToken = process.env.TWITTER_AUTH_TOKEN

    const searchParams = new URLSearchParams({
      apiKey,
      tweetId,
    })

    if (authToken) {
      searchParams.set("auth_token", authToken)
    }

    const apiUrl = `https://twitter.good6.top/api/base/apitools/tweetTimeline?${searchParams.toString()}`

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error("[v0] tweetTimeline HTTP error:", response.status, response.statusText)
      return NextResponse.json({ error: "Failed to fetch tweet detail" }, { status: 502 })
    }

    const payload = await response.json()

    if (payload.code !== 1 || !payload.data) {
      console.error("[v0] tweetTimeline API error:", payload.msg || "Unknown error")
      return NextResponse.json({ error: payload.msg || "TweetTimeline API error" }, { status: 502 })
    }

    let detail = payload.data
    if (typeof detail === "string") {
      try {
        detail = JSON.parse(detail)
      } catch (e) {
        console.error("[v0] Failed to parse tweetTimeline data JSON string:", e)
        return NextResponse.json({ error: "Invalid tweetTimeline data format" }, { status: 502 })
      }
    }

    // tweetTimeline 返回的是包含主推文和回复的会话时间线
    // 结构大致类似 Tweet 详情页的 timeline，我们需要找到主推文的 legacy 数据
    const instructions =
      detail?.data?.threaded_conversation_with_injections_v2?.instructions ||
      detail?.data?.timeline?.instructions ||
      []

    let mainTweetLegacy: any | null = null

    for (const instruction of instructions) {
      if (!instruction) continue

      if (instruction.type === "TimelineAddEntries" && Array.isArray(instruction.entries)) {
        for (const entry of instruction.entries) {
          const tweetResult = entry?.content?.itemContent?.tweet_results?.result
          if (!tweetResult || tweetResult.__typename === "TweetUnavailable") {
            continue
          }

          const restId = tweetResult.rest_id || tweetResult.tweet?.rest_id
          const legacy = tweetResult.legacy || tweetResult.tweet?.legacy

          if (!legacy) continue

          // 如果 tweetId 匹配，认为是主推文；否则取第一条作为兜底
          if (restId === tweetId || legacy.id_str === tweetId) {
            mainTweetLegacy = legacy
            break
          }

          if (!mainTweetLegacy) {
            mainTweetLegacy = legacy
          }
        }
      }

      if (mainTweetLegacy) break
    }

    if (!mainTweetLegacy) {
      console.error("[v0] Could not locate main tweet legacy data in tweetTimeline response")
      return NextResponse.json({ error: "Tweet detail not found in response" }, { status: 502 })
    }

    const likes = Number(mainTweetLegacy.favorite_count || 0)
    const retweets = Number(mainTweetLegacy.retweet_count || 0)
    const replies = Number(mainTweetLegacy.reply_count || 0)
    const quotes = Number(mainTweetLegacy.quote_count || 0)
    const textContent = mainTweetLegacy.full_text || mainTweetLegacy.text || ""

    // 解析媒体类型（如果有）
    let mediaType: string | null = null
    if (mainTweetLegacy.extended_entities?.media?.[0]) {
      const media = mainTweetLegacy.extended_entities.media[0]
      mediaType = media.type || null
    }

    // 将当前快照写入 tweet_snapshots 表
    const { error: upsertError } = await adminSupabase.from("tweet_snapshots").upsert(
      {
        kol_id: kolId,
        tweet_id: tweetId,
        text_content: textContent || "[Pinned Tweet - fetched via tweetTimeline]",
        likes,
        retweets,
        replies,
        quotes,
        is_pinned: true,
        media_type: mediaType,
        recorded_at: new Date().toISOString(),
      },
      {
        onConflict: "kol_id,tweet_id",
      },
    )

    if (upsertError) {
      console.error("[v0] Failed to upsert tweet_snapshots from tweetTimeline:", upsertError)
      return NextResponse.json({ error: "Failed to save tweet snapshot" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      tweetId,
      likes,
      retweets,
      replies,
      quotes,
    })
  } catch (error) {
    console.error("[v0] Unexpected error in fetch-pinned-detail:", error)
    return NextResponse.json({ error: "Failed to fetch pinned tweet detail" }, { status: 500 })
  }
}

