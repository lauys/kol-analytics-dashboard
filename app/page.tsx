"use client"

// 最早导入 v0-fix，确保 btoa polyfill 在客户端代码执行前生效
import "@/lib/v0-fix"

import { useEffect, useState, useCallback } from "react"
import type { KOL } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { DashboardHeader } from "@/components/dashboard-header"
import { RankingTabs } from "@/components/ranking-tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  TrendingUp,
  Activity,
  Skull,
  AlertCircle,
  Sparkles,
  Repeat2,
  Heart,
  MessageCircle,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/i18n"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export default function Page() {
  const [kols, setKols] = useState<KOL[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [isAdmin, setIsAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalInteractions, setTotalInteractions] = useState<number | null>(null)
  const [totalLikes, setTotalLikes] = useState<number | null>(null)
  const [totalRetweets, setTotalRetweets] = useState<number | null>(null)
  const [totalReplies, setTotalReplies] = useState<number | null>(null)

  const { language } = useLanguage()
  const t = translations[language]

  const fetchKols = useCallback(async () => {
    setIsRefreshing(true)
    setError(null)
    try {
      const response = await fetch("/api/kols")
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setKols(data)
          return
        }
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from("leaderboard_24h")
        .select("*")
        .order("latest_followers", { ascending: false })

      if (error) throw error
      setKols(data || [])
    } catch (error) {
      console.error("[v0] Failed to fetch KOLs:", error)
      setError("Failed to load KOL data. Please try again.")
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const checkAdminStatus = useCallback(async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
      setIsAdmin(profile?.role === "admin")
    }
  }, [])

  useEffect(() => {
    fetchKols()
    checkAdminStatus()
  }, [fetchKols, checkAdminStatus])

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch("/api/metrics/summary")
        if (!response.ok) return
        const data = await response.json()
        setTotalInteractions(data.totalInteractions ?? 0)
        setTotalLikes(data.totalLikes ?? 0)
        setTotalRetweets(data.totalRetweets ?? 0)
        setTotalReplies(data.totalReplies ?? 0)
      } catch (e) {
        console.error("[v0] Failed to fetch metrics summary:", e)
      }
    }

    fetchMetrics()
  }, [])

  const stats = {
    totalKols: kols.length,
    activeKols: kols.filter((k) => !k.is_zombie).length,
    zombieKols: kols.filter((k) => k.is_zombie).length,
    avgGrowth:
      kols.length > 0
        ? (kols.reduce((sum, k) => sum + (k.followers_growth_rate_24h || 0), 0) / kols.length).toFixed(2)
        : "0.00",
  }

  return (
    <div className="page-shell">
      <div className="sticky top-0 z-20 border-b border-border/60 bg-gradient-to-b from-background/95 via-background/80 to-background/40 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-5 md:px-6">
          <DashboardHeader
            onSearch={setSearchQuery}
            onFilterChange={setFilter}
            onRefresh={fetchKols}
            isRefreshing={isRefreshing}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      <div className="container mx-auto px-4 pb-10 pt-6 md:px-6 md:pt-8">
        {error && (
          <Card className="mb-8 border-destructive/60 bg-destructive/5 shadow-[0_0_30px_rgba(248,113,113,0.25)]">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-destructive">{error}</span>
              <Button variant="outline" size="sm" onClick={fetchKols}>
                {t.retry || "重试"}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mb-6 grid gap-5 md:grid-cols-4">
          <Card className="card-enter gradient-border relative overflow-hidden border-border/70 bg-card/75 backdrop-blur transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/70 hover:shadow-[0_22px_65px_rgba(59,130,246,0.55)]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t.total_kols}</CardTitle>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{t.total_kols_help}</p>
                </TooltipContent>
              </Tooltip>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight number-enter">{stats.totalKols}</div>
            </CardContent>
          </Card>

          <Card className="card-enter-delay-1 relative overflow-hidden border-border/70 bg-card/75 backdrop-blur transition-all duration-300 ease-out hover:-translate-y-1 hover:border-success/60 hover:shadow-[0_22px_60px_rgba(34,197,94,0.4)]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t.active_kols}</CardTitle>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{t.active_kols_help}</p>
                </TooltipContent>
              </Tooltip>
              <Activity className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight number-enter">{stats.activeKols}</div>
            </CardContent>
          </Card>

          <Card className="card-enter-delay-2 relative overflow-hidden border-border/70 bg-card/75 backdrop-blur transition-all duration-300 ease-out hover:-translate-y-1 hover:border-destructive/60 hover:shadow-[0_22px_60px_rgba(248,113,113,0.4)]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t.zombie_accounts}
                    </CardTitle>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{t.zombie_accounts_help}</p>
                </TooltipContent>
              </Tooltip>
              <Skull className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight number-enter">{stats.zombieKols}</div>
            </CardContent>
          </Card>

          <Card className="card-enter-delay-3 relative overflow-hidden border-border/70 bg-card/75 backdrop-blur transition-all duration-300 ease-out hover:-translate-y-1 hover:border-chart-2/70 hover:shadow-[0_22px_60px_rgba(56,189,248,0.5)]">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {t.avg_growth_24h}
                    </CardTitle>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>{t.avg_growth_24h_help}</p>
                </TooltipContent>
              </Tooltip>
              <TrendingUp className="h-5 w-5 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight number-enter">{stats.avgGrowth}%</div>
            </CardContent>
          </Card>
        </div>

        {/* @Brain_KOL_DAO Interaction Cards - admin only */}
        {isAdmin && (
          <div className="mb-8 grid gap-5 md:grid-cols-4">
            <Card className="border-border/70 bg-card/75 backdrop-blur transition-transform duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-[0_20px_55px_rgba(56,189,248,0.45)]">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  对 @Brain_KOL_DAO 的转发数
                </CardTitle>
                <Repeat2 className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {totalRetweets !== null ? totalRetweets.toLocaleString() : "--"}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/75 backdrop-blur transition-transform duration-200 hover:-translate-y-0.5 hover:border-pink-500/60 hover:shadow-[0_20px_55px_rgba(236,72,153,0.45)]">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  对 @Brain_KOL_DAO 的点赞数
                </CardTitle>
                <Heart className="h-5 w-5 text-pink-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {totalLikes !== null ? totalLikes.toLocaleString() : "--"}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/75 backdrop-blur transition-transform duration-200 hover:-translate-y-0.5 hover:border-sky-500/60 hover:shadow-[0_20px_55px_rgba(56,189,248,0.45)]">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  对 @Brain_KOL_DAO 的评论数
                </CardTitle>
                <MessageCircle className="h-5 w-5 text-sky-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {totalReplies !== null ? totalReplies.toLocaleString() : "--"}
                </div>
              </CardContent>
            </Card>

            <Card className="border-purple-500/50 bg-gradient-to-br from-purple-600/25 via-amber-500/10 to-background/80 shadow-[0_26px_80px_rgba(147,51,234,0.7)] backdrop-blur">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  对 @Brain_KOL_DAO 的互动总和
                </CardTitle>
                <Sparkles className="h-5 w-5 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-purple-400 to-fuchsia-400">
                  {totalInteractions !== null ? totalInteractions.toLocaleString() : "--"}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  所有 KOL 对 @Brain_KOL_DAO 官方内容的点赞、转发、评论等互动总和
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <RankingTabs searchQuery={searchQuery} filter={filter} isAdmin={isAdmin} />
      </div>
    </div>
  )
}
