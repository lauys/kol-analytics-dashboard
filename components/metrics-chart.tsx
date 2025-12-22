"use client"

import type { Snapshot } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { formatNumber } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/i18n"

interface MetricsChartProps {
  data: Snapshot[]
  days?: number
}

export function MetricsChart({ data, days }: MetricsChartProps) {
  const { language } = useLanguage()
  const t = translations[language]

  // 按“天”为单位汇总快照：同一天只保留当天最新的一条
  const chartData = (() => {
    if (!Array.isArray(data) || data.length === 0) return []

    // 按时间排序，保证同一天最后一条是最新
    const sorted = [...data].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )

    const byDay = new Map<
      string,
      {
        dateObj: Date
        followers: number
        following: number
        tweets: number
      }
    >()

    for (const snapshot of sorted) {
      const dateObj = new Date(snapshot.created_at)
      // 使用 UTC 日期键，避免时区导致的一天偏移
      const dayKey = dateObj.toISOString().slice(0, 10) // YYYY-MM-DD

      byDay.set(dayKey, {
        dateObj,
        followers: snapshot.followers_count,
        following: snapshot.following_count,
        tweets: snapshot.tweet_count,
      })
    }

    // 将 Map 转成数组，并按日期顺序输出
    let daily = Array.from(byDay.values()).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())

    // 根据选择的时间范围对点位进行采样：
    // 7 天 => 7 个点，30 天 => 30 个点，90 天 => 90 个点（不够就用现有数量）
    if (days && days > 0 && daily.length > days) {
      const targetPoints = days
      const step = (daily.length - 1) / (targetPoints - 1)
      const sampled: typeof daily = []
      for (let i = 0; i < targetPoints; i++) {
        const idx = Math.round(i * step)
        const clampedIdx = Math.min(idx, daily.length - 1)
        sampled.push(daily[clampedIdx])
      }
      daily = sampled
    }

    return daily.map((entry) => {
        const date = entry.dateObj

        // X 轴显示日期（按语言本地化），不带时间
        const dateLabel =
          language === "zh"
            ? date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })
            : date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

        // Tooltip 中展示完整日期时间
        const timestamp = date.toLocaleString(language === "zh" ? "zh-CN" : "en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })

        return {
          date: dateLabel,
          timestamp,
          followers: entry.followers,
          following: entry.following,
          tweets: entry.tweets,
        }
      })
  })()

  const colors = {
    followers: "#3b82f6", // blue
    following: "#06b6d4", // cyan
    tweets: "#10b981", // green
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-popover p-3 shadow-md">
          <p className="text-xs text-muted-foreground mb-1">{payload[0].payload.timestamp}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
              {entry.name}: {formatNumber(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.followers_over_time}</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => formatNumber(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="followers"
                stroke={colors.followers}
                strokeWidth={2}
                dot={{ r: 3, fill: colors.followers }}
                name={t.followers}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.following_over_time}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="following"
                  stroke={colors.following}
                  strokeWidth={2}
                  dot={{ r: 3, fill: colors.following }}
                  name={t.following}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.tweets_over_time}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="tweets"
                  stroke={colors.tweets}
                  strokeWidth={2}
                  dot={{ r: 3, fill: colors.tweets }}
                  name={t.tweets}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
