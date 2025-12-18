import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = await createServerClient()

    // 获取所有 tweet_snapshots 及关联的 KOL 基本信息（推文级历史数据）
    const { data, error } = await supabase
      .from("tweet_snapshots")
      .select(
        `
        id,
        kol_id,
        tweet_id,
        text_content,
        likes,
        retweets,
        replies,
        quotes,
        is_pinned,
        recorded_at,
        kols!inner(
          id,
          username,
          twitter_username,
          twitter_user_id,
          display_name
        )
      `,
      )
      .order("recorded_at", { ascending: true })

    if (error) {
      console.error("[v0] Failed to export KOL history:", error)
      return new Response(JSON.stringify({ error: "Failed to export KOL history" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    }

    const rows = data || []

    // 生成 CSV 头（KOL + 推文级别历史数据）
    const header = [
      "tweet_snapshot_id",
      "kol_id",
      "username",
      "twitter_username",
      "twitter_user_id",
      "display_name",
      "tweet_id",
      "text_content",
      "likes",
      "retweets",
      "replies",
      "quotes",
      "is_pinned",
      "recorded_at",
    ]

    const escapeCsv = (value: unknown): string => {
      if (value === null || value === undefined) return ""
      const str = String(value)
      if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // 生成 CSV 行
    const lines = rows.map((row: any) => {
      const kol = row.kols
      return [
        escapeCsv(row.id),
        escapeCsv(row.kol_id),
        escapeCsv(kol?.username ?? ""),
        escapeCsv(kol?.twitter_username ?? ""),
        escapeCsv(kol?.twitter_user_id ?? ""),
        escapeCsv(kol?.display_name ?? ""),
        escapeCsv(row.tweet_id),
        escapeCsv(row.text_content),
        escapeCsv(row.likes),
        escapeCsv(row.retweets),
        escapeCsv(row.replies),
        escapeCsv(row.quotes),
        escapeCsv(row.is_pinned),
        escapeCsv(row.recorded_at),
      ].join(",")
    })

    const csvContent = [header.join(","), ...lines].join("\n")
    // 在内容前加上 UTF-8 BOM，避免 Windows Excel 打开出现中文乱码
    const bom = "\uFEFF"
    const body = bom + csvContent
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kol_history_${timestamp}.csv"`,
      },
    })
  } catch (error) {
    console.error("[v0] Unexpected error while exporting KOL history:", error)
    return new Response(JSON.stringify({ error: "Failed to export KOL history" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}


