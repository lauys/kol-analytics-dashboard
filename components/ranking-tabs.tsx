"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  Zap,
  ActivityIcon,
  Repeat2,
  MessageCircle,
  Heart,
  Quote,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ExternalLink,
} from "lucide-react"
import { formatNumber } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/lib/i18n"
import type { KOL } from "@/lib/types"
import { Progress } from "@/components/ui/progress"

type RankingType = "total" | "growth" | "governance" | "contribution"
type TimePeriod = "24h" | "7d" | "30d"
type GrowthSortField = "growth" | "rate"
type GovernanceSortField = "tweets" | "likes" | "replies"
type TotalSortField = "followers" | "change_24h" | "growth_rate" | "tweets"
type SortOrder = "asc" | "desc"

type RankingKOL = KOL & {
  contribution_score?: number
  interaction_rate?: number
  likes?: number
  retweets?: number
  replies?: number
  quotes?: number
  contribution_status?: string
}

interface RankingTabsProps {
  searchQuery?: string
  filter?: string
}

export function RankingTabs({ searchQuery = "", filter = "all", isAdmin = false }: RankingTabsProps & { isAdmin?: boolean }) {
  const [activeTab, setActiveTab] = useState<RankingType>("total")
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("24h")
  const [kols, setKols] = useState<RankingKOL[]>([])
  const [loading, setLoading] = useState(false)
  const [totalSortField, setTotalSortField] = useState<TotalSortField>("followers")
  const [totalSortOrder, setTotalSortOrder] = useState<SortOrder>("desc")
  const [growthSortField, setGrowthSortField] = useState<GrowthSortField>("growth")
  const [growthSortOrder, setGrowthSortOrder] = useState<SortOrder>("desc")
  const [govSortField, setGovSortField] = useState<GovernanceSortField>("tweets")
  const [govSortOrder, setGovSortOrder] = useState<SortOrder>("desc")
  const router = useRouter()
  const { t } = useTranslation()

  // 如果当前不是管理员但选中了贡献度 Tab，则自动切回总榜
  useEffect(() => {
    if (!isAdmin && activeTab === "contribution") {
      setActiveTab("total")
    }
  }, [isAdmin, activeTab])

  useEffect(() => {
    fetchRankings()
  }, [activeTab, timePeriod, searchQuery, filter])

  const fetchRankings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: activeTab,
        period: timePeriod,
      })
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim())
      }
      if (filter && filter !== "all") {
        params.append("filter", filter)
      }

      const response = await fetch(`/api/rankings?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setKols(data)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch rankings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRowClick = (kol: KOL) => {
    router.push(`/kol/${kol.id}`)
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return null
  }

  const getGrowthValue = (kol: KOL) => {
    if (timePeriod === "7d") return kol.followers_change_7d || 0
    if (timePeriod === "30d") return kol.followers_change_30d || 0
    return kol.followers_change_24h || 0
  }

  const getGrowthRate = (kol: KOL) => {
    if (timePeriod === "7d") return kol.followers_growth_rate_7d || 0
    if (timePeriod === "30d") return kol.followers_growth_rate_30d || 0
    return kol.followers_growth_rate_24h || 0
  }

  const isInactive = (lastActive: string) => {
    const diff = Date.now() - new Date(lastActive).getTime()
    return diff > 7 * 24 * 60 * 60 * 1000 // 7 days
  }

  const handleGrowthSort = (field: GrowthSortField) => {
    if (growthSortField === field) {
      setGrowthSortOrder(growthSortOrder === "asc" ? "desc" : "asc")
    } else {
      setGrowthSortField(field)
      setGrowthSortOrder("desc")
    }
  }

  const handleTotalSort = (field: TotalSortField) => {
    if (totalSortField === field) {
      setTotalSortOrder(totalSortOrder === "asc" ? "desc" : "asc")
    } else {
      setTotalSortField(field)
      setTotalSortOrder("desc")
    }
  }

  const handleGovSort = (field: GovernanceSortField) => {
    if (govSortField === field) {
      setGovSortOrder(govSortOrder === "asc" ? "desc" : "asc")
    } else {
      setGovSortField(field)
      setGovSortOrder("desc")
    }
  }

  const getSortedGrowthKols = () => {
    const sorted = [...kols].sort((a, b) => {
      let aValue: number, bValue: number

      if (growthSortField === "growth") {
        aValue = getGrowthValue(a)
        bValue = getGrowthValue(b)
      } else {
        aValue = getGrowthRate(a)
        bValue = getGrowthRate(b)
      }

      return growthSortOrder === "desc" ? bValue - aValue : aValue - bValue
    })
    return sorted
  }

  const getSortedTotalKols = () => {
    const sorted = [...kols].sort((a, b) => {
      let aValue: number, bValue: number

      if (totalSortField === "followers") {
        aValue = a.latest_followers || 0
        bValue = b.latest_followers || 0
      } else if (totalSortField === "change_24h") {
        aValue = a.followers_change_24h || 0
        bValue = b.followers_change_24h || 0
      } else if (totalSortField === "growth_rate") {
        aValue = a.followers_growth_rate_24h || 0
        bValue = b.followers_growth_rate_24h || 0
      } else {
        aValue = a.latest_tweets || 0
        bValue = b.latest_tweets || 0
      }

      return totalSortOrder === "desc" ? bValue - aValue : aValue - bValue
    })
    return sorted
  }

  const getGovernanceMetricsForPeriod = (kol: RankingKOL) => {
    let tweets = 0
    let likes = 0
    let replies = 0

    if (timePeriod === "7d") {
      tweets = kol.tweets_7d || 0
      likes = (kol as any).likes_7d || 0
      replies = (kol as any).replies_7d || 0
    } else if (timePeriod === "30d") {
      tweets = (kol as any).tweets_30d || 0
      likes = (kol as any).likes_30d || 0
      replies = (kol as any).replies_30d || 0
    } else {
      tweets = kol.tweets_today || 0
      likes = (kol as any).likes_today || 0
      replies = (kol as any).replies_today || 0
    }

    return { tweets, likes, replies }
  }

  const getSortedGovKols = () => {
    const sorted = [...kols].sort((a, b) => {
      const aMetrics = getGovernanceMetricsForPeriod(a)
      const bMetrics = getGovernanceMetricsForPeriod(b)

      let aValue = 0
      let bValue = 0

      if (govSortField === "likes") {
        aValue = aMetrics.likes
        bValue = bMetrics.likes
      } else if (govSortField === "replies") {
        aValue = aMetrics.replies
        bValue = bMetrics.replies
      } else {
        aValue = aMetrics.tweets
        bValue = bMetrics.tweets
      }

      return govSortOrder === "desc" ? bValue - aValue : aValue - bValue
    })
    return sorted
  }

  const renderGrowthSortIcon = (field: GrowthSortField) => {
    if (growthSortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />
    }
    return growthSortOrder === "desc" ? (
      <ArrowDown className="h-4 w-4 ml-1 text-primary" />
    ) : (
      <ArrowUp className="h-4 w-4 ml-1 text-primary" />
    )
  }

  const renderTotalSortIcon = (field: TotalSortField) => {
    if (totalSortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />
    }
    return totalSortOrder === "desc" ? (
      <ArrowDown className="h-4 w-4 ml-1 text-primary" />
    ) : (
      <ArrowUp className="h-4 w-4 ml-1 text-primary" />
    )
  }

  const renderGovSortIcon = (field: GovernanceSortField) => {
    if (govSortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-40" />
    }
    return govSortOrder === "desc" ? (
      <ArrowDown className="h-4 w-4 ml-1 text-primary" />
    ) : (
      <ArrowUp className="h-4 w-4 ml-1 text-primary" />
    )
  }

  const renderTotalRanking = () => {
    const sortedKols = getSortedTotalKols()

    if (sortedKols.length === 0 && !loading) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          {searchQuery.trim() || filter !== "all"
            ? t("no_kols_match")
            : t("no_data_available")}
        </div>
      )
    }

    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-16">{t("rank")}</TableHead>
            <TableHead>{t("kol")}</TableHead>
            <TableHead
              className="text-right cursor-pointer hover:bg-accent/50 select-none"
              onClick={() => handleTotalSort("followers")}
            >
              <div className="flex items-center justify-end">
                {t("followers")}
                {renderTotalSortIcon("followers")}
              </div>
            </TableHead>
            <TableHead
              className="text-right cursor-pointer hover:bg-accent/50 select-none"
              onClick={() => handleTotalSort("change_24h")}
            >
              <div className="flex items-center justify-end">
                {t("change_24h")}
                {renderTotalSortIcon("change_24h")}
              </div>
            </TableHead>
            <TableHead
              className="text-right cursor-pointer hover:bg-accent/50 select-none"
              onClick={() => handleTotalSort("growth_rate")}
            >
              <div className="flex items-center justify-end">
                {t("growth_rate")}
                {renderTotalSortIcon("growth_rate")}
              </div>
            </TableHead>
            <TableHead
              className="text-right cursor-pointer hover:bg-accent/50 select-none"
              onClick={() => handleTotalSort("tweets")}
            >
              <div className="flex items-center justify-end">
                {t("tweet_count")}
                {renderTotalSortIcon("tweets")}
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedKols.map((kol, index) => (
          <TableRow
            key={kol.id}
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => handleRowClick(kol)}
          >
            <TableCell className="font-bold">
              {index < 3 ? (
                <div className="flex items-center justify-center">
                  <Trophy
                    className={`h-5 w-5 ${
                      index === 0 ? "text-yellow-500" : index === 1 ? "text-gray-400" : "text-amber-600"
                    }`}
                  />
                </div>
              ) : (
                <span className="text-muted-foreground">#{index + 1}</span>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={kol.avatar_url || undefined} />
                  <AvatarFallback>{(kol.display_name || "?")[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{kol.display_name}</div>
                  <div className="text-sm text-muted-foreground">@{kol.twitter_username}</div>
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right font-mono font-bold text-lg">
              {formatNumber(kol.latest_followers)}
            </TableCell>
            <TableCell className="text-right">
              <div
                className={`flex items-center justify-end gap-1 font-mono ${
                  (kol.followers_change_24h || 0) > 0
                    ? "text-green-500"
                    : (kol.followers_change_24h || 0) < 0
                      ? "text-red-500"
                      : ""
                }`}
              >
                {getTrendIcon(kol.followers_change_24h || 0)}
                {(kol.followers_change_24h || 0) > 0 ? "+" : ""}
                {formatNumber(kol.followers_change_24h || 0)}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <span
                className={`font-mono font-semibold ${
                  (kol.followers_growth_rate_24h || 0) > 0
                    ? "text-green-500"
                    : (kol.followers_growth_rate_24h || 0) < 0
                      ? "text-red-500"
                      : ""
                }`}
              >
                {(kol.followers_growth_rate_24h || 0) > 0 ? "+" : ""}
                {(kol.followers_growth_rate_24h || 0).toFixed(2)}%
              </span>
            </TableCell>
            <TableCell className="text-right font-mono">{formatNumber(kol.latest_tweets)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    )
  }

  const renderGrowthRanking = () => {
    const sortedKols = getSortedGrowthKols()

    if (sortedKols.length === 0 && !loading) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          {searchQuery.trim() || filter !== "all"
            ? t("no_kols_match")
            : t("no_data_available")}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-center gap-3 md:gap-4">
          <Button variant={timePeriod === "24h" ? "default" : "outline"} size="sm" onClick={() => setTimePeriod("24h")}>
            {t("time_24h")}
          </Button>
          <Button variant={timePeriod === "7d" ? "default" : "outline"} size="sm" onClick={() => setTimePeriod("7d")}>
            {t("time_7d")}
          </Button>
          <Button variant={timePeriod === "30d" ? "default" : "outline"} size="sm" onClick={() => setTimePeriod("30d")}>
            {t("time_30d")}
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16">{t("rank")}</TableHead>
              <TableHead>{t("kol")}</TableHead>
              <TableHead
                className="text-right cursor-pointer hover:bg-accent/50 select-none"
                onClick={() => handleGrowthSort("growth")}
              >
                <div className="flex items-center justify-end">
                  {t("net_growth")}
                  {renderGrowthSortIcon("growth")}
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:bg-accent/50 select-none"
                onClick={() => handleGrowthSort("rate")}
              >
                <div className="flex items-center justify-end">
                  {t("growth_rate")}
                  {renderGrowthSortIcon("rate")}
                </div>
              </TableHead>
              <TableHead className="text-right">{t("followers")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedKols.map((kol, index) => {
              const growth = getGrowthValue(kol)
              const growthRate = getGrowthRate(kol)
              return (
                <TableRow
                  key={kol.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleRowClick(kol)}
                >
                  <TableCell className="font-bold">
                    {index < 3 ? (
                      <div className="flex items-center justify-center">
                        <Zap
                          className={`h-5 w-5 ${
                            index === 0 ? "text-yellow-500" : index === 1 ? "text-gray-400" : "text-amber-600"
                          }`}
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">#{index + 1}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={kol.avatar_url || undefined} />
                        <AvatarFallback>{(kol.display_name || "?")[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{kol.display_name}</div>
                        <div className="text-sm text-muted-foreground">@{kol.twitter_username}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div
                      className={`flex items-center justify-end gap-1 font-mono font-bold ${growth > 0 ? "text-green-500" : growth < 0 ? "text-red-500" : ""}`}
                    >
                      {getTrendIcon(growth)}
                      {growth > 0 ? "+" : ""}
                      {formatNumber(growth)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-mono font-bold text-lg ${growthRate > 0 ? "text-green-500" : growthRate < 0 ? "text-red-500" : ""}`}
                    >
                      {growthRate > 0 ? "+" : ""}
                      {growthRate.toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(kol.latest_followers)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderGovernanceRanking = () => {
    const sortedKols = getSortedGovKols()

    if (sortedKols.length === 0 && !loading) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          {searchQuery.trim() || filter !== "all"
            ? t("no_kols_match")
            : t("no_data_available")}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-center gap-3 md:gap-4">
          <Button
            variant={timePeriod === "24h" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("24h")}
          >
            {t("time_24h")}
          </Button>
          <Button
            variant={timePeriod === "7d" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("7d")}
          >
            {t("time_7d")}
          </Button>
          <Button
            variant={timePeriod === "30d" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("30d")}
          >
            {t("time_30d")}
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16">#</TableHead>
              <TableHead>{t("kol")}</TableHead>
              <TableHead
                className="text-right cursor-pointer hover:bg-accent/50 select-none"
                onClick={() => handleGovSort("tweets")}
              >
                <div className="flex items-center justify-end">
                  {t("post_count")}
                  {renderGovSortIcon("tweets")}
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:bg-accent/50 select-none"
                onClick={() => handleGovSort("likes")}
              >
                <div className="flex items-center justify-end">
                  {t("likes_received")}
                  {renderGovSortIcon("likes")}
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:bg-accent/50 select-none"
                onClick={() => handleGovSort("replies")}
              >
                <div className="flex items-center justify-end">
                  {t("replies_received")}
                  {renderGovSortIcon("replies")}
                </div>
              </TableHead>
              <TableHead className="text-center">{t("status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedKols.map((kol, index) => {
              const inactive = isInactive(kol.latest_time)
              const metrics = getGovernanceMetricsForPeriod(kol)

              return (
                <TableRow
                  key={kol.id}
                  className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                    inactive ? "bg-destructive/5" : ""
                  }`}
                  onClick={() => handleRowClick(kol)}
                >
                  <TableCell className="font-semibold text-muted-foreground">#{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border">
                        <AvatarImage src={kol.avatar_url || undefined} />
                        <AvatarFallback>{(kol.display_name || "?")[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold flex items-center gap-2">
                          {kol.display_name}
                          {inactive && <AlertTriangle className="h-4 w-4 text-destructive" />}
                        </div>
                        <div className="text-sm text-muted-foreground">@{kol.twitter_username}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-lg">
                    {formatNumber(metrics.tweets)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(metrics.likes)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatNumber(metrics.replies)}
                  </TableCell>
                  <TableCell className="text-center">
                    {kol.is_zombie ? (
                      <Badge variant="destructive">{t("zombie")}</Badge>
                    ) : inactive ? (
                      <Badge variant="outline" className="border-destructive text-destructive">
                        {t("inactive_warning")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-500 text-green-500">
                        {t("normal")}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderContributionRanking = () => {
    if (kols.length === 0 && !loading) {
      return (
        <div className="p-8 text-center text-muted-foreground">
          {searchQuery.trim() || filter !== "all"
            ? t("no_kols_match")
            : t("no_data_available")}
        </div>
      )
    }

    return (
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-16">{t("rank")}</TableHead>
            <TableHead>{t("kol")}</TableHead>
            <TableHead className="text-right">{t("contribution_score")}</TableHead>
            <TableHead className="w-[180px]">{t("interaction_rate")}</TableHead>
            <TableHead className="w-[220px]">{t("engagement_breakdown")}</TableHead>
            <TableHead className="text-center">{t("status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kols.map((kol, index) => {
            const score = kol.contribution_score || 0
            const rate = Math.min(Math.max(kol.interaction_rate || 0, 0), 100)
            const retweets = kol.retweets || 0  // KOL转推官方推文的次数
            const replies = kol.replies || 0    // KOL回复/评论官方推文的次数
            const quotes = kol.quotes || 0      // KOL引用官方推文的次数
            const likes = kol.likes || 0        // KOL点赞官方推文的次数
            const links = (kol as any).links || 0  // KOL链接到官方推文的次数

            const statusLabel = kol.contribution_status || (score > 0 ? t("active") : t("low_interaction"))
            const isCore = statusLabel === t("core_contributor")
            const isLow = statusLabel === t("low_interaction")

            return (
              <TableRow
                key={kol.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleRowClick(kol)}
              >
                <TableCell className="font-semibold text-muted-foreground">
                  {index < 3 ? (
                    <div className="flex items-center justify-center">
                      <Trophy
                        className={`h-5 w-5 ${
                          index === 0 ? "text-amber-400" : index === 1 ? "text-slate-300" : "text-yellow-700"
                        }`}
                      />
                    </div>
                  ) : (
                    <>#{index + 1}</>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage src={kol.avatar_url || undefined} />
                      <AvatarFallback>{(kol.display_name || "?")[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{kol.display_name}</div>
                      <div className="text-sm text-muted-foreground">@{kol.twitter_username}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-1.5 text-lg font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-purple-400 to-fuchsia-400">
                    <span>💎</span>
                    <span>{formatNumber(score)}</span>
                  </span>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t("participation")}</span>
                      <span className="font-mono font-semibold">{rate.toFixed(0)}%</span>
                    </div>
                    <Progress value={rate} className="h-2" />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1" title={t("retweets") || "Retweets"}>
                      <Repeat2 className="h-3 w-3 text-green-500" />
                      <span>{formatNumber(retweets)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1" title={t("replies") || "Comments/Replies"}>
                      <MessageCircle className="h-3 w-3 text-sky-500" />
                      <span>{formatNumber(replies)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1" title={t("quotes") || "Quotes"}>
                      <Quote className="h-3 w-3 text-purple-500" />
                      <span>{formatNumber(quotes)}</span>
                    </span>
                    {likes > 0 && (
                      <span className="inline-flex items-center gap-1" title={t("likes") || "Likes"}>
                        <Heart className="h-3 w-3 text-pink-500" />
                        <span>{formatNumber(likes)}</span>
                      </span>
                    )}
                    {links > 0 && (
                      <span className="inline-flex items-center gap-1" title="Links">
                        <ExternalLink className="h-3 w-3 text-orange-500" />
                        <span>{formatNumber(links)}</span>
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {isCore ? (
                    <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/40">
                      {t("core_contributor")}
                    </Badge>
                  ) : isLow ? (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/40">{t("low_interaction")}</Badge>
                  ) : (
                    <Badge variant="outline" className="border-primary/40 text-primary">
                      {statusLabel}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RankingType)} className="w-full">
      <TabsList className={`grid w-full mb-6 ${isAdmin ? "grid-cols-4" : "grid-cols-3"}`}>
        <TabsTrigger value="total" className="gap-2">
          <Trophy className="h-4 w-4" />
          {t("total_ranking")}
        </TabsTrigger>
        <TabsTrigger value="growth" className="gap-2">
          <Zap className="h-4 w-4" />
          {t("growth_ranking")}
        </TabsTrigger>
        <TabsTrigger value="governance" className="gap-2">
          <ActivityIcon className="h-4 w-4" />
          {t("governance_activity")}
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="contribution" className="gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            {t("contribution")}
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="total" className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? <div className="p-8 text-center">{t("loading_analytics")}</div> : renderTotalRanking()}
      </TabsContent>

      <TabsContent value="growth" className="space-y-4">
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden pt-5">
          {loading ? <div className="p-8 text-center">{t("loading_analytics")}</div> : renderGrowthRanking()}
        </div>
      </TabsContent>

      <TabsContent value="governance" className="rounded-xl border bg-card shadow-sm overflow-hidden pt-5">
        {loading ? <div className="p-8 text-center">{t("loading_analytics")}</div> : renderGovernanceRanking()}
      </TabsContent>

      {isAdmin && (
        <TabsContent value="contribution" className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {loading ? <div className="p-8 text-center">{t("loading_analytics")}</div> : renderContributionRanking()}
        </TabsContent>
      )}
    </Tabs>
  )
}
