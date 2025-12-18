"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, Users, MessageSquare, Target } from "lucide-react"
import { formatNumber } from "@/lib/utils"
import type { KOL } from "@/lib/types"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/i18n"

interface Change24hPanelProps {
  kol: KOL
}

export function Change24hPanel({ kol }: Change24hPanelProps) {
  const { language } = useLanguage()
  const t = translations[language]

  const changes = [
    {
      icon: Users,
      label: t.followers,
      current: kol.latest_followers || 0,
      change: kol.followers_change_24h || 0,
      growthRate: kol.followers_growth_rate_24h || 0,
      color: "text-blue-500",
    },
    {
      icon: Target,
      label: t.following,
      current: kol.latest_following || 0,
      change: kol.following_change_24h || 0,
      growthRate: kol.following_growth_rate_24h || 0,
      color: "text-cyan-500",
    },
    {
      icon: MessageSquare,
      label: t.tweets,
      current: kol.latest_tweets || 0,
      change: kol.tweets_change_24h || 0,
      growthRate: kol.tweets_growth_rate_24h || 0,
      color: "text-green-500",
    },
  ]

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-5 w-5" />
    if (change < 0) return <TrendingDown className="h-5 w-5" />
    return <Minus className="h-5 w-5" />
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return "text-success"
    if (change < 0) return "text-destructive"
    return "text-muted-foreground"
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t["24hChange"]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {changes.map((item, index) => {
          const Icon = item.icon
          const previous = item.current - item.change

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <div className={`flex items-center gap-1 ${getTrendColor(item.change)}`}>
                  {getTrendIcon(item.change)}
                  <span className="font-mono text-sm font-semibold">
                    {item.change > 0 ? "+" : ""}
                    {formatNumber(item.change)}
                  </span>
                  <span className="text-xs">({item.growthRate.toFixed(2)}%)</span>
                </div>
              </div>

              {/* Progress bar showing change */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {t["24hAgo"]}: {formatNumber(previous)}
                  </span>
                  <span>
                    {t.current}: {formatNumber(item.current)}
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.change >= 0 ? "bg-success" : "bg-destructive"} transition-all`}
                    style={{
                      width: `${Math.min(Math.abs((item.change / previous) * 100), 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )
        })}

        {/* Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t.overallTrend}:</span>
            <span
              className={`font-semibold ${getTrendColor(
                (kol.followers_change_24h || 0) + (kol.following_change_24h || 0) + (kol.tweets_change_24h || 0),
              )}`}
            >
              {(kol.followers_change_24h || 0) + (kol.following_change_24h || 0) + (kol.tweets_change_24h || 0) > 0
                ? t.growing
                : (kol.followers_change_24h || 0) + (kol.following_change_24h || 0) + (kol.tweets_change_24h || 0) < 0
                  ? t.declining
                  : t.stable}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
