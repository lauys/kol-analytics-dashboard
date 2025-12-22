"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { formatNumber } from "@/lib/utils"
import { Heart, Repeat2, MessageCircle, Quote, TrendingUp, TrendingDown, ExternalLink } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/i18n"

interface PinnedTweetChartProps {
  kolId: string
  days?: number
}

export function PinnedTweetChart({ kolId, days = 30 }: PinnedTweetChartProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { language } = useLanguage()
  const t = translations[language]

  useEffect(() => {
    fetchPinnedTweetHistory()
  }, [kolId, days])

  const fetchPinnedTweetHistory = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/kols/${kolId}/pinned-tweet-history?days=${days}`)
      if (response.ok) {
        const result = await response.json()
        setData(result || { tweets: [] })
      } else {
        console.error("[v0] Failed to fetch pinned tweet history:", response.status, response.statusText)
        setData({ tweets: [] })
      }
    } catch (error) {
      console.error("[v0] Failed to fetch pinned tweet history:", error)
      setData({ tweets: [] })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.pinned_tweet_analytics}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">{t.loading_analytics}</div>
        </CardContent>
      </Card>
    )
  }

  if (!data?.tweets?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.pinned_tweet_analytics}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <p>{t.no_pinned_history}</p>
            <p className="text-xs">{t.collect_tweets_first}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentTweet = data.tweets[0]

  const isPlaceholder = currentTweet.text_content?.includes("[Pinned Tweet - Not in recent timeline]")

  if (isPlaceholder) {
    const tweetUrl = `https://twitter.com/i/web/status/${currentTweet.tweet_id}`

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.pinned_tweet_analytics}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-primary/30 rounded-lg p-6 bg-gradient-to-br from-primary/10 to-transparent">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold mb-2">{t.pinned_tweet_detected}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t.pinned_tweet_old_explanation}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="font-mono">
                    ID: {currentTweet.tweet_id}
                  </Badge>
                  <span>•</span>
                  <span>
                    {t.detected_at}: {new Date(currentTweet.first_seen).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" className="gap-2">
                    <a href={tweetUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      {t.view_original_tweet}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">💡 {t.pinned_tweet_tip}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = currentTweet.history.map((snapshot: any) => ({
    date: new Date(snapshot.recorded_at).toLocaleDateString(),
    time: new Date(snapshot.recorded_at).toLocaleString(),
    likes: snapshot.likes,
    retweets: snapshot.retweets,
    replies: snapshot.replies,
    quotes: snapshot.quotes,
  }))

  const latestSnapshot = currentTweet.history[currentTweet.history.length - 1]
  const firstSnapshot = currentTweet.history[0]

  const likesGrowth = latestSnapshot.likes - firstSnapshot.likes
  const retweetsGrowth = latestSnapshot.retweets - firstSnapshot.retweets
  const repliesGrowth = latestSnapshot.replies - firstSnapshot.replies
  const quotesGrowth = latestSnapshot.quotes - firstSnapshot.quotes

  const likesGrowthPercent = firstSnapshot.likes > 0 ? ((likesGrowth / firstSnapshot.likes) * 100).toFixed(1) : "0"
  const retweetsGrowthPercent =
    firstSnapshot.retweets > 0 ? ((retweetsGrowth / firstSnapshot.retweets) * 100).toFixed(1) : "0"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t.pinned_tweet_analytics}</CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            {currentTweet.history.length} {t.data_points}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border-2 border-primary/20 rounded-lg p-4 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-sm font-semibold text-primary">{t.current_pinned_tweet}</h3>
            <Badge variant="secondary" className="text-xs">
              {t.pinned}
            </Badge>
          </div>

          <p className="text-sm leading-relaxed mb-4 text-foreground">{currentTweet.text_content}</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card/50 p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="h-4 w-4 text-pink-500" />
                <span className="text-xs text-muted-foreground">{t.likes}</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">{formatNumber(latestSnapshot.likes)}</span>
                {likesGrowth !== 0 && (
                  <div
                    className={`flex items-center gap-1 text-xs ${likesGrowth > 0 ? "text-success" : "text-destructive"}`}
                  >
                    {likesGrowth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className="font-semibold">
                      {likesGrowth > 0 ? "+" : ""}
                      {formatNumber(likesGrowth)}
                    </span>
                    <span className="text-muted-foreground">({likesGrowthPercent}%)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card/50 p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Repeat2 className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">{t.retweets}</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">{formatNumber(latestSnapshot.retweets)}</span>
                {retweetsGrowth !== 0 && (
                  <div
                    className={`flex items-center gap-1 text-xs ${retweetsGrowth > 0 ? "text-success" : "text-destructive"}`}
                  >
                    {retweetsGrowth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className="font-semibold">
                      {retweetsGrowth > 0 ? "+" : ""}
                      {formatNumber(retweetsGrowth)}
                    </span>
                    <span className="text-muted-foreground">({retweetsGrowthPercent}%)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card/50 p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">{t.replies}</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">{formatNumber(latestSnapshot.replies)}</span>
                {repliesGrowth !== 0 && (
                  <div
                    className={`flex items-center gap-1 text-xs ${repliesGrowth > 0 ? "text-success" : "text-destructive"}`}
                  >
                    {repliesGrowth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className="font-semibold">
                      {repliesGrowth > 0 ? "+" : ""}
                      {formatNumber(repliesGrowth)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-card/50 p-3 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Quote className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">{t.quotes}</span>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-bold">{formatNumber(latestSnapshot.quotes)}</span>
                {quotesGrowth !== 0 && (
                  <div
                    className={`flex items-center gap-1 text-xs ${quotesGrowth > 0 ? "text-success" : "text-destructive"}`}
                  >
                    {quotesGrowth > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className="font-semibold">
                      {quotesGrowth > 0 ? "+" : ""}
                      {formatNumber(quotesGrowth)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t.first_seen}: {new Date(firstSnapshot.recorded_at).toLocaleDateString()}
            </span>
            <span>
              {t.last_updated}: {new Date(latestSnapshot.recorded_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {chartData.length > 1 && (
          <div>
            <h4 className="text-sm font-medium mb-3">{t.engagement_trend}</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "rgba(255, 255, 255, 0.6)", fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    tick={{ fill: "rgba(255, 255, 255, 0.6)", fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: any) => formatNumber(value)}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]) {
                        return payload[0].payload.time
                      }
                      return label
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="likes"
                    name={t.likes}
                    stroke="#ec4899"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="retweets"
                    name={t.retweets}
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="replies"
                    name={t.replies}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="quotes"
                    name={t.quotes}
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {data.tweets.length > 1 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">{t.previous_pinned_tweets}</h4>
            <div className="space-y-2">
              {data.tweets.slice(1, 4).map((tweet: any) => (
                <div key={tweet.tweet_id} className="text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                  <p className="line-clamp-2 mb-1">{tweet.text_content}</p>
                  <p className="text-[10px]">
                    {new Date(tweet.first_seen).toLocaleDateString()} - {new Date(tweet.last_seen).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
