import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "24h" // 24h, 7d, 30d
    const type = searchParams.get("type") || "total" // total, growth, governance, contribution
    const searchQuery = searchParams.get("search") || ""
    const filter = searchParams.get("filter") || "all"

    const supabase = await createClient()

    // Check if user is admin
    let isAdmin = false
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
      isAdmin = profile?.role === "admin"
    }

    // Helper function to apply search and filter to a query
    const applySearchAndFilter = (query: any) => {
      // Filter out hidden KOLs for non-admin users
      if (!isAdmin) {
        query = query.eq("is_hidden", false)
      }

      if (searchQuery.trim()) {
        const searchLower = searchQuery.toLowerCase().trim()
        query = query.or(
          `twitter_username.ilike.%${searchLower}%,display_name.ilike.%${searchLower}%,bio.ilike.%${searchLower}%`
        )
      }

      if (filter === "active") {
        query = query.eq("is_zombie", false)
      } else if (filter === "zombie") {
        query = query.eq("is_zombie", true)
      } else if (filter === "growing") {
        query = query.gt("followers_growth_rate_24h", 0)
      }

      return query
    }

    // Helper function to filter hidden KOLs in memory (for RPC results)
    const filterHiddenInMemory = (data: any[]) => {
      if (isAdmin) return data
      return data.filter((kol: any) => !kol.is_hidden)
    }

    let data: any
    let error

    switch (type) {
      case "growth":
        // Growth ranking - calculate growth rate based on period
        if (period === "7d") {
          const result = await supabase.rpc("get_7d_growth_ranking")
          data = result.data
          error = result.error

          // Fallback if RPC doesn't exist - use 24h data
          if (error) {
            let fallbackQuery = supabase.from("leaderboard_24h").select("*")
            fallbackQuery = applySearchAndFilter(fallbackQuery)
            const fallback = await fallbackQuery.order("followers_growth_rate_24h", { ascending: false })
            data = fallback.data
            error = fallback.error
            } else {
            // Apply search and filter to RPC result in memory
            let filtered = filterHiddenInMemory(data || [])
            if (searchQuery.trim()) {
              const searchLower = searchQuery.toLowerCase().trim()
              filtered = filtered.filter(
                (kol: any) =>
                  kol.twitter_username?.toLowerCase().includes(searchLower) ||
                  kol.display_name?.toLowerCase().includes(searchLower) ||
                  kol.bio?.toLowerCase().includes(searchLower)
              )
            }
            if (filter === "active") {
              filtered = filtered.filter((kol: any) => !kol.is_zombie)
            } else if (filter === "zombie") {
              filtered = filtered.filter((kol: any) => kol.is_zombie)
            } else if (filter === "growing") {
              filtered = filtered.filter((kol: any) => (kol.followers_growth_rate_7d || 0) > 0)
            }
            data = filtered
          }
        } else if (period === "30d") {
          const result = await supabase.rpc("get_30d_growth_ranking")
          data = result.data
          error = result.error

          // Fallback if RPC doesn't exist - use 24h data
          if (error) {
            let fallbackQuery = supabase.from("leaderboard_24h").select("*")
            fallbackQuery = applySearchAndFilter(fallbackQuery)
            const fallback = await fallbackQuery.order("followers_growth_rate_24h", { ascending: false })
            data = fallback.data
            error = fallback.error
          } else {
            // Apply search and filter to RPC result in memory
            let filtered = filterHiddenInMemory(data || [])
            if (searchQuery.trim()) {
              const searchLower = searchQuery.toLowerCase().trim()
              filtered = filtered.filter(
                (kol: any) =>
                  kol.twitter_username?.toLowerCase().includes(searchLower) ||
                  kol.display_name?.toLowerCase().includes(searchLower) ||
                  kol.bio?.toLowerCase().includes(searchLower)
              )
            }
            if (filter === "active") {
              filtered = filtered.filter((kol: any) => !kol.is_zombie)
            } else if (filter === "zombie") {
              filtered = filtered.filter((kol: any) => kol.is_zombie)
            } else if (filter === "growing") {
              filtered = filtered.filter((kol: any) => (kol.followers_growth_rate_30d || 0) > 0)
            }
            data = filtered
          }
        } else {
          let query = supabase.from("leaderboard_24h").select("*")
          query = applySearchAndFilter(query)
          const result = await query.order("followers_growth_rate_24h", { ascending: false })
          data = result.data
          error = result.error
        }
        break

      case "governance":
        {
          // Governance & activity - show all, highlight inactive ones
          // 支持 24h / 7d / 30d 时间维度
          const period = searchParams.get("period") || "24h"
          let orderColumn: string
          switch (period) {
            case "7d":
              orderColumn = "tweets_7d"
              break
            case "30d":
              orderColumn = "tweets_30d"
              break
            case "24h":
            default:
              orderColumn = "tweets_today"
          }

          let govQuery = supabase.from("tweet_activity_stats").select("*")
          govQuery = applySearchAndFilter(govQuery)
          const govResult = await govQuery.order(orderColumn, { ascending: false })
          data = govResult.data
          error = govResult.error

          // Fallback to leaderboard_24h if view doesn't exist
          if (error) {
            console.log("[v0] tweet_activity_stats view not found, using fallback")
            let fallbackQuery = supabase.from("leaderboard_24h").select("*")
            fallbackQuery = applySearchAndFilter(fallbackQuery)
            const fallback = await fallbackQuery.order("latest_time", { ascending: false })
            data = fallback.data
            error = fallback.error
          }
        }
        break

      case "contribution":
        // Community contribution ranking - based on interaction metrics from tweet_snapshots
        // 1) 获取近期（默认 30 天）内所有与 @Titannet_dao 相关的 tweet_snapshots
        {
          const days = Number(searchParams.get("days") || "30")
          const since = new Date()
          since.setDate(since.getDate() - days)

          const { data: snapshots, error: snapError } = await supabase
            .from("tweet_snapshots")
            .select("kol_id, likes, retweets, replies, quotes, text_content")
            .gte("recorded_at", since.toISOString())
            // 仅统计与 @Titannet_dao 官方账号相关的互动
            .or("text_content.ilike.%@titannet_dao%,text_content.ilike.%titannet_dao%")

          if (snapError) {
            console.error("[v0] Error fetching tweet_snapshots for contribution ranking:", snapError)
            return NextResponse.json({ error: snapError.message }, { status: 500 })
          }

          // 2) 在内存中按 KOL 聚合互动数据
          // 注意：贡献度分数应该统计KOL对官方推文的互动次数，而不是推文收到的互动
          type Agg = {
            kol_id: string
            retweet_count: number  // KOL转推官方推文的次数
            quote_count: number    // KOL引用官方推文的次数
            reply_count: number    // KOL回复/评论官方推文的次数
            like_count: number     // KOL点赞官方推文的次数（如果API支持）
            link_count: number     // KOL链接到官方推文的次数
            totalInteractions: number  // 总互动次数
          }

          const aggMap = new Map<string, Agg>()

          for (const row of snapshots || []) {
            const kolId = row.kol_id as string
            if (!kolId) continue

            const textContent = (row.text_content || "").toLowerCase()
            
            // 判断这条推文是否是对官方推文的互动，以及互动类型
            let isRetweet = false
            let isQuote = false
            let isReply = false
            let isLike = false
            let isLink = false

            // 检查是否包含 @Titannet_dao 标记
            if (textContent.includes("@titannet_dao") || textContent.includes("titannet_dao")) {
              // 根据文本内容判断互动类型
              if (textContent.startsWith("rt @titannet_dao") || 
                  (textContent.startsWith("rt ") && textContent.includes("@titannet_dao"))) {
                isRetweet = true
              } else if (textContent.includes("quote @titannet_dao") || 
                        textContent.includes("引用 @titannet_dao")) {
                isQuote = true
              } else if (textContent.includes("reply @titannet_dao") || 
                        textContent.includes("回复 @titannet_dao") ||
                        textContent.includes("comment @titannet_dao") ||
                        textContent.includes("评论 @titannet_dao")) {
                isReply = true
              } else if (textContent.includes("like @titannet_dao") || 
                        textContent.includes("点赞 @titannet_dao") ||
                        textContent.includes("favorite @titannet_dao")) {
                isLike = true
              } else if (textContent.includes("@titannet_dao")) {
                // 如果包含 @Titannet_dao 但不是明确的转发/引用/回复/点赞，可能是链接或提及
                isLink = true
              }
            }

            // 只统计对官方推文的互动，不统计推文收到的互动
            if (isRetweet || isQuote || isReply || isLike || isLink) {
              if (!aggMap.has(kolId)) {
                aggMap.set(kolId, { 
                  kol_id: kolId, 
                  retweet_count: 0, 
                  quote_count: 0, 
                  reply_count: 0, 
                  like_count: 0,
                  link_count: 0, 
                  totalInteractions: 0 
                })
              }

              const current = aggMap.get(kolId)!
              if (isRetweet) {
                current.retweet_count++
                current.totalInteractions++
              } else if (isQuote) {
                current.quote_count++
                current.totalInteractions++
              } else if (isReply) {
                current.reply_count++
                current.totalInteractions++
              } else if (isLike) {
                current.like_count++
                current.totalInteractions++
              } else if (isLink) {
                current.link_count++
                current.totalInteractions++
              }
            }
          }

          const kolIds = Array.from(aggMap.keys())

          if (kolIds.length === 0) {
            data = []
            break
          }

          // 3) 获取这些 KOL 的基础信息（从 leaderboard_24h 优先，其次从 kols 表）
          let leaderboardQuery = supabase
            .from("leaderboard_24h")
            .select("*")
            .in("id", kolIds)
          
          // Filter out hidden KOLs for non-admin users
          if (!isAdmin) {
            leaderboardQuery = leaderboardQuery.eq("is_hidden", false)
          }
          
          const { data: leaderboard, error: leaderboardError } = await leaderboardQuery

          let kols = leaderboard || []

          if (leaderboardError) {
            console.warn("[v0] leaderboard_24h not available for contribution ranking, falling back to kols table")
            let kolsQuery = supabase
              .from("kols")
              .select("id, twitter_username, display_name, avatar_url, bio, is_zombie, is_hidden")
              .in("id", kolIds)
            
            // Filter out hidden KOLs for non-admin users
            if (!isAdmin) {
              kolsQuery = kolsQuery.eq("is_hidden", false)
            }
            
            const { data: rawKols, error: kolsError } = await kolsQuery

            if (kolsError) {
              console.error("[v0] Error fetching KOLs for contribution ranking:", kolsError)
              return NextResponse.json({ error: kolsError.message }, { status: 500 })
            }

            kols = rawKols || []
          }

          // 定义互动类型的权重
          const interactionWeights = {
            retweet: 2.0,    // 转推：2分
            quote: 2.0,      // 引用：2分
            reply: 1.0,      // 回复/评论：1分
            like: 0.5,       // 点赞：0.5分（简单互动）
            link: 1.5,       // 链接：1.5分
          }

          // 计算加权总分
          const allAgg = Array.from(aggMap.values())
          const weightedScores = allAgg.map((a) => {
            return (
              a.retweet_count * interactionWeights.retweet +
              a.quote_count * interactionWeights.quote +
              a.reply_count * interactionWeights.reply +
              a.like_count * interactionWeights.like +
              a.link_count * interactionWeights.link
            )
          })
          const maxScore = weightedScores.length > 0 ? Math.max(...weightedScores) || 1 : 1

          // 4) 组合数据并计算贡献分 & 互动率
          const enriched = kols
            .map((kol: any) => {
              const agg = aggMap.get(kol.id)
              if (!agg) return null

              // 计算加权贡献度分数
              const contributionScore = Math.round(
                agg.retweet_count * interactionWeights.retweet +
                agg.quote_count * interactionWeights.quote +
                agg.reply_count * interactionWeights.reply +
                agg.like_count * interactionWeights.like +
                agg.link_count * interactionWeights.link
              )
              
              // 互动率基于加权分数
              const interactionRate = maxScore > 0 ? (contributionScore / maxScore) * 100 : 0

              let statusLabel = "Low Interaction"
              if (contributionScore >= 500) {
                statusLabel = "Core Contributor"
              } else if (contributionScore >= 100) {
                statusLabel = "Active"
              }

              return {
                ...kol,
                contribution_score: contributionScore,
                interaction_rate: interactionRate,
                // 注意：这里的 retweets, replies, quotes, likes 现在表示KOL对官方推文的互动次数，而不是推文收到的互动
                retweets: agg.retweet_count,  // KOL转推官方推文的次数
                replies: agg.reply_count,     // KOL回复/评论官方推文的次数
                quotes: agg.quote_count,      // KOL引用官方推文的次数
                likes: agg.like_count,        // KOL点赞官方推文的次数
                links: agg.link_count,        // KOL链接到官方推文的次数
                contribution_status: statusLabel,
              }
            })
            .filter(Boolean) as any[]

          // 5) 按贡献分排序
          enriched.sort((a, b) => (b.contribution_score || 0) - (a.contribution_score || 0))

          // 6) Apply search and filter to enriched data
          let filtered = filterHiddenInMemory(enriched)
          if (searchQuery.trim()) {
            const searchLower = searchQuery.toLowerCase().trim()
            filtered = filtered.filter(
              (kol: any) =>
                kol.twitter_username?.toLowerCase().includes(searchLower) ||
                kol.display_name?.toLowerCase().includes(searchLower) ||
                kol.bio?.toLowerCase().includes(searchLower)
            )
          }

          if (filter === "active") {
            filtered = filtered.filter((kol: any) => !kol.is_zombie)
          } else if (filter === "zombie") {
            filtered = filtered.filter((kol: any) => kol.is_zombie)
          } else if (filter === "growing") {
            // For contribution ranking, we can't filter by growth rate easily
            // So we'll skip this filter for contribution
          }

          data = filtered
        }
        break

      case "total":
      default:
        // Total ranking - sort by total followers
        let totalQuery = supabase.from("leaderboard_24h").select("*")
        totalQuery = applySearchAndFilter(totalQuery)
        const totalResult = await totalQuery.order("latest_followers", { ascending: false })
        data = totalResult.data
        error = totalResult.error
        break
    }

    if (error) {
      console.error("[v0] Error fetching rankings:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("[v0] Error in rankings API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
