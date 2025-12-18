"use client"

import { useState, useEffect } from "react"
import type { KOL, Snapshot } from "@/lib/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Skull, TrendingUp, Users, MessageSquare, ExternalLink, Eye, EyeOff, Info, Trash2 } from "lucide-react"
import { formatNumber } from "@/lib/utils"
import { MetricsChart } from "./metrics-chart"
import { ScoreEditorDialog } from "./score-editor-dialog"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/i18n"
import { TweetsPanel } from "./tweets-panel"

interface InteractionItem {
  id: string
  tweet_id: string
  recorded_at: string
  action: string
}

interface KOLDetailModalProps {
  kol: KOL | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMarkZombie: (id: string, isZombie: boolean) => void
  onToggleHidden?: (id: string, isHidden: boolean) => void
  onDelete?: (id: string) => void
  isAdmin?: boolean // Add isAdmin prop
  onUpdate?: () => void // Add callback to refresh KOL data after updates
}

export function KOLDetailModal({
  kol,
  open,
  onOpenChange,
  onMarkZombie,
  onToggleHidden,
  onDelete,
  isAdmin = false,
  onUpdate,
}: KOLDetailModalProps) {
  const [history, setHistory] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(7)
  const [interactions, setInteractions] = useState<InteractionItem[]>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { language } = useLanguage()
  const t = translations[language]

  useEffect(() => {
    if (kol && open) {
      fetchHistory()
      fetchInteractionHistory()
    }
  }, [kol, open, days])

  const fetchHistory = async () => {
    if (!kol) return
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
    if (!kol) return
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

  const handleMarkZombie = async () => {
    if (!kol) return
    await onMarkZombie(kol.id, !kol.is_zombie)
    onOpenChange(false)
  }

  const handleToggleHidden = async () => {
    if (!kol || !onToggleHidden) return
    await onToggleHidden(kol.id, !kol.is_hidden)
    if (onUpdate) {
      onUpdate()
    }
  }

  const handleDelete = async () => {
    if (!kol || !onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(kol.id)
      setShowDeleteDialog(false)
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Failed to delete KOL:", error)
      alert(t.delete_failed)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!kol) return null

  const formatRelativeTime = (timestamp: string) => {
    const now = Date.now()
    const t = new Date(timestamp).getTime()
    const diffMs = now - t
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={kol.avatar_url || undefined} />
              <AvatarFallback>
                {(kol.display_name || kol.twitter_username || "KOL").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-2xl flex items-center gap-2">
                {kol.display_name || kol.twitter_username}
                {kol.tier && (
                  <Badge variant="outline" className="ml-2">
                    {kol.tier} {t.tier_label}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <span>@{kol.twitter_username}</span>
                <a
                  href={`https://twitter.com/${kol.twitter_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  {t.view_on_twitter} <ExternalLink className="h-3 w-3" />
                </a>
              </DialogDescription>
              {kol.bio && <p className="text-sm text-muted-foreground mt-2">{kol.bio}</p>}
              <div className="flex gap-2 mt-3">
                {kol.is_zombie && (
                  <Badge variant="destructive" className="gap-1">
                    <Skull className="h-3 w-3" />
                    {t.zombie_account}
                  </Badge>
                )}
                {kol.is_hidden && (
                  <Badge variant="secondary" className="gap-1">
                    <EyeOff className="h-3 w-3" />
                    {t.hidden}
                  </Badge>
                )}
                {isAdmin && kol.manual_score !== undefined && kol.manual_score !== 0 && (
                  <Badge variant="secondary">{t.manual_score}: {kol.manual_score}</Badge>
                )}
              </div>
            </div>
            {isAdmin && onUpdate && <ScoreEditorDialog kol={kol} onUpdate={onUpdate} />}
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">{t.profile}</TabsTrigger>
            <TabsTrigger value="tweets">{t.tweets}</TabsTrigger>
            <TabsTrigger value="charts">{t.growth_analytics}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{t.followers}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(kol.latest_followers || 0)}</div>
                  <p
                    className={`text-xs ${(kol.followers_change_24h || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {(kol.followers_change_24h || 0) > 0 ? "+" : ""}
                    {formatNumber(kol.followers_change_24h || 0)} {t.time_24h_label}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{t.following}</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(kol.latest_following || 0)}</div>
                  <p
                    className={`text-xs ${(kol.following_change_24h || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {(kol.following_change_24h || 0) > 0 ? "+" : ""}
                    {formatNumber(kol.following_change_24h || 0)} {t.time_24h_label}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{t.tweets}</CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(kol.latest_tweets || 0)}</div>
                  <p
                    className={`text-xs ${(kol.tweets_change_24h || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {(kol.tweets_change_24h || 0) > 0 ? "+" : ""}
                    {formatNumber(kol.tweets_change_24h || 0)} {t.time_24h_label}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t.growth_metrics}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t.growth_rate_24h}</span>
                  <span
                    className={`text-lg font-bold ${(kol.followers_growth_rate_24h || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {(kol.followers_growth_rate_24h || 0) > 0 ? "+" : ""}
                    {(kol.followers_growth_rate_24h || 0).toFixed(2)}%
                  </span>
                </div>
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
                  <span className="text-lg font-bold">
                    {((kol.latest_followers || 0) / Math.max(kol.latest_following || 1, 1)).toFixed(1)}x
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {t.interaction_history}
                </CardTitle>
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

            {isAdmin && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button
                    variant={kol.is_zombie ? "default" : "destructive"}
                    onClick={handleMarkZombie}
                    className="flex-1"
                  >
                    <Skull className="h-4 w-4 mr-2" />
                    {kol.is_zombie ? t.unmark_as_zombie : t.mark_as_zombie}
                  </Button>
                  {onToggleHidden && (
                    <Button
                      variant={kol.is_hidden ? "default" : "outline"}
                      onClick={handleToggleHidden}
                      className="flex-1"
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
                  )}
                </div>
                {onDelete && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t.delete_kol}
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tweets">
            <TweetsPanel
              kolId={kol.id}
              kolUsername={kol.twitter_username}
              isAdmin={isAdmin}
              onCollectTweets={onUpdate}
            />
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button variant={days === 7 ? "default" : "outline"} size="sm" onClick={() => setDays(7)}>
                {t.days_7_full}
              </Button>
              <Button variant={days === 30 ? "default" : "outline"} size="sm" onClick={() => setDays(30)}>
                {t.days_30_full}
              </Button>
              <Button variant={days === 90 ? "default" : "outline"} size="sm" onClick={() => setDays(90)}>
                {t.days_90_full}
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">{t.loading_charts}</div>
              </div>
            ) : history.length > 0 ? (
              <MetricsChart data={history} />
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-muted-foreground">{t.no_historical_data}</div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.confirm_delete}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.delete_confirmation_message.replace("{name}", kol?.display_name || kol?.twitter_username || "")}
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
    </Dialog>
  )
}
