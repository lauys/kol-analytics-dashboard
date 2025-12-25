import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * 查看最近的自动采集执行情况
 * 
 * 查询参数：
 * - hours: 查询最近多少小时内的数据（默认 24）
 * 
 * 示例：
 * GET /api/cron/collection-status?hours=24
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = Number.parseInt(searchParams.get("hours") || "24", 10)

    const supabase = createAdminClient()
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()

    // 1. 查询最近的快照记录
    const { data: recentSnapshots, error: snapshotsError } = await supabase
      .from("snapshots")
      .select("kol_id, created_at")
      .gte("created_at", cutoffTime)
      .order("created_at", { ascending: false })

    if (snapshotsError) throw snapshotsError

    // 2. 统计采集的 KOL 数量
    const uniqueKols = new Set(recentSnapshots?.map((s) => s.kol_id) || [])
    const kolCount = uniqueKols.size

    // 3. 查询最近的推文记录
    const { data: recentTweets, error: tweetsError } = await supabase
      .from("tweet_snapshots")
      .select("kol_id, recorded_at")
      .gte("recorded_at", cutoffTime)
      .order("recorded_at", { ascending: false })

    if (tweetsError) throw tweetsError

    // 4. 统计推文采集情况
    const uniqueTweetKols = new Set(recentTweets?.map((t) => t.kol_id) || [])
    const tweetCount = recentTweets?.length || 0

    // 5. 获取所有非僵尸 KOL 数量（用于计算覆盖率）
    const { data: allKols, error: kolsError } = await supabase
      .from("kols")
      .select("id")
      .eq("is_zombie", false)

    if (kolsError) throw kolsError

    const totalKols = allKols?.length || 0
    const coverageRate = totalKols > 0 ? ((kolCount / totalKols) * 100).toFixed(1) : "0"

    // 6. 获取最近的执行时间
    const latestSnapshotTime =
      recentSnapshots && recentSnapshots.length > 0
        ? recentSnapshots[0].created_at
        : null

    // 7. 获取每个 KOL 的采集状态
    const { data: kolStatus, error: statusError } = await supabase
      .from("kols")
      .select("id, twitter_username, display_name, updated_at")
      .eq("is_zombie", false)
      .order("updated_at", { ascending: false })
      .limit(20)

    if (statusError) throw statusError

    const kolStatusList = (kolStatus || []).map((kol) => ({
      username: kol.twitter_username,
      display_name: kol.display_name,
      last_updated: kol.updated_at,
      is_recent: kol.updated_at ? new Date(kol.updated_at) >= new Date(cutoffTime) : false,
    }))

    return NextResponse.json({
      success: true,
      period: {
        hours,
        start_time: cutoffTime,
        end_time: new Date().toISOString(),
      },
      statistics: {
        kols_collected: kolCount,
        total_kols: totalKols,
        coverage_rate: `${coverageRate}%`,
        tweets_collected: tweetCount,
        kols_with_tweets: uniqueTweetKols.size,
        snapshots_created: recentSnapshots?.length || 0,
      },
      latest_execution: latestSnapshotTime,
      recent_kols: kolStatusList,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error fetching collection status:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch collection status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

