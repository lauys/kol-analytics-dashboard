"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { KOL, Snapshot } from "@/lib/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  ArrowLeft,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Skull,
  Activity,
  BarChart3,
  Target,
  Download,
  Eye,
  EyeOff,
  Info,
  Trash2,
} from "lucide-react"
import { formatNumber } from "@/lib/utils"
import { MetricsChart } from "./metrics-chart"
import { TweetsPanel } from "./tweets-panel"
import { ScoreEditorDialog } from "./score-editor-dialog"
import { PinnedTweetChart } from "./pinned-tweet-chart"
import { BioHistoryPanel } from "./bio-history-panel"
import { createClient } from "@/lib/supabase/client"
import { Change24hPanel } from "./change-24h-panel"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/i18n"

interface KOLDetailPageProps {
  kol: KOL
}

interface InteractionItem {
  id: string
  tweet_id: string
  recorded_at: string
  action: string
}

export function KOLDetailPage({ kol: initialKol }: KOLDetailPageProps) {
  const [kol, setKol] = useState(initialKol)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(30)
  const [isAdmin, setIsAdmin] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [interactions, setInteractions] = useState<InteractionItem[]>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { language } = useLanguage()
  const t = translations[language]

  useEffect(() => {
    checkAdminStatus()
    fetchHistory()
  }, [days])

  // 互动历史只对管理员可见，且仅在管理员身份时请求
  useEffect(() => {
    if (isAdmin) {
      fetchInteractionHistory()
    } else {
      setInteractions([])
    }
  }, [isAdmin, days])

  const checkAdminStatus = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
      setIsAdmin(profile?.role === "admin")
    }
  }

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/kols/${kol.id}/history?days=${days}`)
      const data = await response.json()
      setHistory(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("[v0] Failed to fetch history:", error)
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  const fetchInteractionHistory = async () => {
    try {
      const response = await fetch(`/api/kols/${kol.id}/interaction-history?limit=3`)
      if (!response.ok) return
      const data = await response.json()
      setInteractions(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("[v0] Failed to fetch interaction history:", error)
      setInteractions([])
    }
  }

  const handleToggleHidden = async () => {
    try {
      const response = await fetch(`/api/kols/${kol.id}/toggle-hidden`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_hidden: !kol.is_hidden }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setKol({ ...kol, is_hidden: !kol.is_hidden })
        }
      } else {
        alert(t.operation_failed)
      }
    } catch (error) {
      console.error("[v0] Failed to toggle hidden status:", error)
      alert(t.operation_failed)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/kols/${kol.id}/delete`, {
        method: "DELETE",
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          // 删除成功后跳转到首页
          window.location.href = "/"
        } else {
          alert(t.delete_failed)
        }
      } else {
        alert(t.delete_failed)
      }
    } catch (error) {
      console.error("[v0] Failed to delete KOL:", error)
      alert(t.delete_failed)
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const refreshKol = async () => {
    const supabase = createClient()
    const { data } = await supabase.from("leaderboard_24h").select("*").eq("id", kol.id).maybeSingle()

    if (data) setKol(data)
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4" />
    if (change < 0) return <TrendingDown className="h-4 w-4" />
    return <Activity className="h-4 w-4" />
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return "text-success"
    if (change < 0) return "text-destructive"
    return "text-muted-foreground"
  }

  const formatRelativeTime = (timestamp: string) => {
    const now = Date.now()
    const timestampMs = new Date(timestamp).getTime()
    const diffMs = now - timestampMs
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffHour < 1) {
      return t.time_minutes_ago.replace("{n}", String(Math.max(diffMin, 1)))
    }
    if (diffDay < 1) {
      return t.time_hours_ago.replace("{n}", String(diffHour))
    }
    if (diffDay < 7) {
      return t.time_days_ago.replace("{n}", String(diffDay))
    }
    return new Date(timestamp).toLocaleDateString()
  }

  const handleExportHistory = async () => {
    try {
      setExporting(true)
      const response = await fetch(`/api/admin/export-kol-history/${kol.id}`)

      if (!response.ok) {
        console.error("[v0] Failed to export single KOL history")
        alert(t.export_failed)
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `kol_${kol.twitter_username || kol.id}_history_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("[v0] Error exporting single KOL history:", error)
      alert(t.export_error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={kol.avatar_url || undefined} />
                <AvatarFallback>
                  {(kol.display_name || kol.twitter_username || "KOL").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-bold">{kol.display_name || kol.twitter_username}</h1>
                <p className="text-muted-foreground">@{kol.twitter_username}</p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href={`https://twitter.com/${kol.twitter_username}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                {t.view_on_twitter}
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Profile Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.profile}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {kol.bio && <p className="text-sm text-muted-foreground leading-relaxed">{kol.bio}</p>}

                <div className="space-y-3 pt-4">
                  {kol.tier && (
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="secondary" className="font-mono">
                        {kol.tier} {t.tier_label}
                      </Badge>
                    </div>
                  )}

                  {kol.is_zombie && (
                    <div className="flex items-center gap-2">
                      <Skull className="h-4 w-4 text-destructive" />
                      <Badge variant="destructive">{t.zombie_account}</Badge>
                    </div>
                  )}

                  {kol.is_hidden && (
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="secondary">{t.hidden}</Badge>
                    </div>
                  )}

                  {isAdmin && kol.manual_score !== undefined && kol.manual_score !== 0 && (
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {t.manual_score}: <span className="font-semibold text-foreground">{kol.manual_score}</span>
                      </span>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="pt-4 space-y-2">
                    <ScoreEditorDialog kol={kol} onUpdate={refreshKol} />
                    <Button
                      variant={kol.is_hidden ? "default" : "outline"}
                      onClick={handleToggleHidden}
                      className="w-full"
                    >
                      {kol.is_hidden ? (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          {t.show}
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          {t.hide}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t.delete_kol}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t.engagement}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-muted-foreground">{t.follower_ratio}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{t.follower_ratio_tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <span className="text-sm font-semibold font-mono">
                    {((kol.latest_followers || 0) / Math.max(kol.latest_following || 1, 1)).toFixed(1)}x
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t.total_tweets}</span>
                  <span className="text-sm font-semibold font-mono">{formatNumber(kol.latest_tweets || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t.growth_24h}</span>
                  <span
                    className={`text-sm font-semibold font-mono ${getTrendColor(kol.followers_growth_rate_24h || 0)}`}
                  >
                    {(kol.followers_growth_rate_24h || 0) > 0 ? "+" : ""}
                    {(kol.followers_growth_rate_24h || 0).toFixed(2)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Interaction History - admin only */}
            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t.interaction_history}</CardTitle>
                </CardHeader>
                <CardContent>
                  {interactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t.no_interactions_detected}
                    </p>
                  ) : (
                    <div className="space-y-3 text-sm">
                      {interactions.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border px-3 py-2 bg-muted/40"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{item.action}</span>
                            <span className="text-xs text-muted-foreground">
                              {t.replied_to_official_post} {formatRelativeTime(item.recorded_at)}
                            </span>
                          </div>
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-primary hover:text-primary"
                          >
                            <a
                              href={`https://twitter.com/i/web/status/${item.tweet_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {t.view}
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 24h Change Panel */}
            <Change24hPanel kol={kol} />
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="gradient-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    {t.followers}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatNumber(kol.latest_followers || 0)}</div>
                  <div
                    className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(kol.followers_change_24h || 0)}`}
                  >
                    {getTrendIcon(kol.followers_change_24h || 0)}
                    <span className="font-mono">
                      {(kol.followers_change_24h || 0) > 0 ? "+" : ""}
                      {formatNumber(kol.followers_change_24h || 0)}
                    </span>
                    <span className="text-muted-foreground ml-1">{t.time_24h_label}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {t.following}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatNumber(kol.latest_following || 0)}</div>
                  <div
                    className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(kol.following_change_24h || 0)}`}
                  >
                    {getTrendIcon(kol.following_change_24h || 0)}
                    <span className="font-mono">
                      {(kol.following_change_24h || 0) > 0 ? "+" : ""}
                      {formatNumber(kol.following_change_24h || 0)}
                    </span>
                    <span className="text-muted-foreground ml-1">{t.time_24h_label}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    {t.tweets}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatNumber(kol.latest_tweets || 0)}</div>
                  <div className={`flex items-center gap-1 mt-2 text-sm ${getTrendColor(kol.tweets_change_24h || 0)}`}>
                    {getTrendIcon(kol.tweets_change_24h || 0)}
                    <span className="font-mono">
                      {(kol.tweets_change_24h || 0) > 0 ? "+" : ""}
                      {formatNumber(kol.tweets_change_24h || 0)}
                    </span>
                    <span className="text-muted-foreground ml-1">{t.time_24h_label}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Historical Charts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>{t.growth_analytics}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant={days === 7 ? "default" : "outline"} size="sm" onClick={() => setDays(7)}>
                      {t.days_7}
                    </Button>
                    <Button variant={days === 30 ? "default" : "outline"} size="sm" onClick={() => setDays(30)}>
                      {t.days_30}
                    </Button>
                    <Button variant={days === 90 ? "default" : "outline"} size="sm" onClick={() => setDays(90)}>
                      {t.days_90}
                    </Button>
                    {isAdmin && (
                      <Button variant="outline" size="sm" onClick={handleExportHistory} disabled={exporting}>
                        <Download className={`h-4 w-4 mr-1 ${exporting ? "animate-pulse" : ""}`} />
                        {exporting ? t.export_exporting : t.export_kol_history}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">{t.loading_analytics}</div>
                  </div>
                ) : history.length > 0 ? (
                  <MetricsChart data={history} days={days} />
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-muted-foreground">{t.no_historical_data}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tweets Section */}
            <Card>
              <CardHeader>
                <CardTitle>{t.recent_activity}</CardTitle>
              </CardHeader>
              <CardContent>
                <TweetsPanel
                  kolId={kol.id}
                  kolUsername={kol.twitter_username}
                  isAdmin={isAdmin}
                  onCollectTweets={refreshKol}
                />
              </CardContent>
            </Card>

            {/* Pinned Tweet Analytics */}
            <PinnedTweetChart kolId={kol.id} days={days} />

            {/* Bio Change History - admin only */}
            {isAdmin && <BioHistoryPanel kolId={kol.id} />}
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.confirm_delete}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.delete_confirmation_message.replace("{name}", kol.display_name || kol.twitter_username)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t.deleting : t.confirm_delete_button}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
