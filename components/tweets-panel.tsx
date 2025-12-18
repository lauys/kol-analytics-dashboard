"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Pin, Heart, Repeat2, MessageCircle, Quote, ImageIcon, Video, RefreshCw } from "lucide-react"
import type { Tweet } from "@/lib/types"
import { formatNumber } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/i18n"

interface TweetsPanelProps {
  kolId: string
  kolUsername: string
  isAdmin?: boolean
  onCollectTweets?: () => void
}

export function TweetsPanel({ kolId, kolUsername, isAdmin, onCollectTweets }: TweetsPanelProps) {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [loading, setLoading] = useState(true) // Set initial loading to true
  const [collecting, setCollecting] = useState(false)
  const { language } = useLanguage()
  const t = translations[language]

  useEffect(() => {
    fetchTweets()
  }, [kolId])

  const fetchTweets = async () => {
    setLoading(true)
    try {
      console.log("[v0] Fetching tweets for KOL:", kolId)
      const response = await fetch(`/api/kols/${kolId}/tweets`)
      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Loaded tweets from database:", data.length)
        setTweets(data)
      } else {
        console.error("[v0] Failed to fetch tweets, status:", response.status)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch tweets:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCollectTweets = async () => {
    setCollecting(true)
    console.log("[v0] Starting tweet collection for:", { kolId, kolUsername })

    try {
      const response = await fetch("/api/admin/collect-tweets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kolId, twitterUsername: kolUsername }),
      })

      console.log("[v0] Tweet collection response status:", response.status)

      const result = await response.json()
      console.log("[v0] Tweet collection result:", result)

      if (response.ok && result.success) {
        const message =
          language === "zh"
            ? `成功采集 ${result.savedCount} 条推文！${result.hasPinnedTweet ? "（包含置顶推文）" : ""}`
            : `Successfully collected ${result.savedCount} tweets!${result.hasPinnedTweet ? " (including pinned tweet)" : ""}`

        alert(message)
        console.log("[v0] Successfully collected tweets:", result.savedCount)
        await fetchTweets()
        if (onCollectTweets) onCollectTweets()
      } else {
        console.error("[v0] Failed to collect tweets:", result.error)
        const errorMsg =
          language === "zh"
            ? `采集推文失败：${result.error || "未知错误"}\n${result.details || ""}`
            : `Failed to collect tweets: ${result.error || "Unknown error"}\n${result.details || ""}`
        alert(errorMsg)
      }
    } catch (error) {
      console.error("[v0] Failed to collect tweets:", error)
      const errorMsg =
        language === "zh"
          ? `采集推文时发生错误：${error instanceof Error ? error.message : String(error)}`
          : `Error collecting tweets: ${error instanceof Error ? error.message : String(error)}`
      alert(errorMsg)
    } finally {
      setCollecting(false)
    }
  }

  const pinnedTweet = tweets.find((t) => t.is_pinned)
  const regularTweets = tweets.filter((t) => !t.is_pinned)

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex items-center justify-end">
          <Button size="sm" variant="outline" onClick={handleCollectTweets} disabled={collecting || loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${collecting ? "animate-spin" : ""}`} />
            {collecting ? t.collecting : "Collect Tweets"}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{t.loading_analytics}</div>
      ) : tweets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {language === "zh" ? "暂无推文数据。" : "No tweet data available."}
            {isAdmin &&
              (language === "zh"
                ? " 点击 Collect Tweets 按钮获取最新推文数据。"
                : " Click 'Collect Tweets' button to fetch the latest tweets.")}
          </CardContent>
        </Card>
      ) : (
        <>
          {pinnedTweet && (
            <Card className="border-primary">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="default" className="gap-1">
                    <Pin className="h-3 w-3" />
                    {t.pinned_tweet}
                  </Badge>
                  {pinnedTweet.media_type && (
                    <Badge variant="outline" className="gap-1">
                      {pinnedTweet.media_type === "video" ? (
                        <Video className="h-3 w-3" />
                      ) : (
                        <ImageIcon className="h-3 w-3" />
                      )}
                      {pinnedTweet.media_type}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap mb-3">{pinnedTweet.text_content}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1" title={t.likes}>
                    <Heart className="h-3 w-3" />
                    {formatNumber(pinnedTweet.likes)}
                  </span>
                  <span className="flex items-center gap-1" title={t.retweets}>
                    <Repeat2 className="h-3 w-3" />
                    {formatNumber(pinnedTweet.retweets)}
                  </span>
                  <span className="flex items-center gap-1" title={t.replies}>
                    <MessageCircle className="h-3 w-3" />
                    {formatNumber(pinnedTweet.replies)}
                  </span>
                  <span className="flex items-center gap-1" title={t.quotes}>
                    <Quote className="h-3 w-3" />
                    {formatNumber(pinnedTweet.quotes)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {regularTweets.slice(0, 10).map((tweet) => (
              <Card key={tweet.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm whitespace-pre-wrap flex-1">
                      {tweet.text_content.length > 200 ? `${tweet.text_content.slice(0, 200)}...` : tweet.text_content}
                    </p>
                    {tweet.media_type && (
                      <Badge variant="outline" className="gap-1 shrink-0">
                        {tweet.media_type === "video" ? (
                          <Video className="h-3 w-3" />
                        ) : (
                          <ImageIcon className="h-3 w-3" />
                        )}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {formatNumber(tweet.likes)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Repeat2 className="h-3 w-3" />
                      {formatNumber(tweet.retweets)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {formatNumber(tweet.replies)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
