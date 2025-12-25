"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, XCircle, AlertCircle, Download, RefreshCw } from "lucide-react"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/i18n"

interface CollectionResult {
  success: string[]
  failed: Array<{ username: string; error: string }>
  total: number
}

interface CollectionReport {
  results: CollectionResult
  tweets?: {
    success: number
    failed: number
    totalTweets?: number
    details?: Array<{
      username: string
      tweetCount: number
      success: boolean
      error?: string
    }>
  }
  daoInteractions?: {
    count: number
  }
  kolDetails?: Array<{
    username: string
    display_name?: string
    followers_count?: number
    following_count?: number
    tweet_count?: number
    status: "success" | "failed"
    error?: string
  }>
  collectedAt?: string // 采集时间
}

interface CollectionReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: CollectionReport | null
  onRefresh?: () => void
}

export function CollectionReportDialog({
  open,
  onOpenChange,
  report,
  onRefresh,
}: CollectionReportDialogProps) {
  const { language } = useLanguage()
  const t = translations[language]
  const [activeTab, setActiveTab] = useState("summary")

  if (!report) return null

  const { results, tweets, daoInteractions, kolDetails } = report
  const successCount = results.success.length
  const failedCount = results.failed.length
  const totalCount = results.total
  const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : "0"

  const handleExport = () => {
    if (!report) return

    const csvRows: string[] = []
    
    // 表头
    csvRows.push("用户名,显示名称,状态,粉丝数,关注数,推文数,错误信息")
    
    // 成功的数据
    if (kolDetails) {
      kolDetails.forEach((kol) => {
        csvRows.push(
          `"${kol.username}","${kol.display_name || ""}",${kol.status === "success" ? "成功" : "失败"},${kol.followers_count || 0},${kol.following_count || 0},${kol.tweet_count || 0},"${kol.error || ""}"`
        )
      })
    } else {
      results.success.forEach((username) => {
        csvRows.push(`"${username}","",成功,0,0,0,""`)
      })
      results.failed.forEach((item) => {
        csvRows.push(`"${item.username}","",失败,0,0,0,"${item.error}"`)
      })
    }
    
    // 推文统计
    if (tweets?.details) {
      csvRows.push("")
      csvRows.push("推文采集统计")
      csvRows.push("用户名,推文数量,状态,错误信息")
      tweets.details.forEach((detail) => {
        csvRows.push(
          `"${detail.username}",${detail.tweetCount},${detail.success ? "成功" : "失败"},"${detail.error || ""}"`
        )
      })
    }
    
    const csvContent = csvRows.join("\n")
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `collection_report_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            数据采集报告
          </DialogTitle>
          <DialogDescription>
            采集完成时间: {report.collectedAt ? new Date(report.collectedAt).toLocaleString("zh-CN") : new Date().toLocaleString("zh-CN")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* 统计摘要 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">总数量</div>
              <div className="text-2xl font-bold mt-1">{totalCount}</div>
            </div>
            <div className="rounded-lg border bg-card p-4 border-emerald-500/50 bg-emerald-500/5">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                成功
              </div>
              <div className="text-2xl font-bold mt-1 text-emerald-500">{successCount}</div>
            </div>
            <div className="rounded-lg border bg-card p-4 border-red-500/50 bg-red-500/5">
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                失败
              </div>
              <div className="text-2xl font-bold mt-1 text-red-500">{failedCount}</div>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <div className="text-sm text-muted-foreground">成功率</div>
              <div className="text-2xl font-bold mt-1">{successRate}%</div>
            </div>
          </div>

          {/* 详细数据标签页 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
            <TabsList className="grid w-full grid-cols-3 shrink-0">
              <TabsTrigger value="summary">采集摘要</TabsTrigger>
              <TabsTrigger value="details">详细数据</TabsTrigger>
              <TabsTrigger value="tweets">推文统计</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="flex-1 overflow-hidden mt-4 min-h-0 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-4">
                  {/* KOL采集摘要 */}
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      KOL数据采集 ({successCount} 成功)
                    </h3>
                    {kolDetails && kolDetails.length > 0 ? (
                      <div className="space-y-1">
                        {kolDetails
                          .filter((kol) => kol.status === "success")
                          .slice(0, 10)
                          .map((kol) => (
                            <div
                              key={kol.username}
                              className="flex items-center justify-between p-2 rounded border bg-card text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span className="font-medium">@{kol.username}</span>
                                {kol.display_name && (
                                  <span className="text-muted-foreground">({kol.display_name})</span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {kol.followers_count !== undefined && (
                                  <span>粉丝: {kol.followers_count.toLocaleString()}</span>
                                )}
                                {kol.tweet_count !== undefined && (
                                  <span>推文: {kol.tweet_count.toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        {kolDetails.filter((kol) => kol.status === "success").length > 10 && (
                          <div className="text-xs text-muted-foreground text-center py-2">
                            还有 {kolDetails.filter((kol) => kol.status === "success").length - 10} 个成功项...
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {results.success.slice(0, 10).map((username) => (
                          <div
                            key={username}
                            className="flex items-center gap-2 p-2 rounded border bg-card text-sm"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span>@{username}</span>
                          </div>
                        ))}
                        {results.success.length > 10 && (
                          <div className="text-xs text-muted-foreground text-center py-2">
                            还有 {results.success.length - 10} 个成功项...
                          </div>
                        )}
                      </div>
                    )}

                    {failedCount > 0 && (
                      <>
                        <h3 className="font-semibold flex items-center gap-2 mt-4">
                          <XCircle className="h-4 w-4 text-red-500" />
                          失败项 ({failedCount})
                        </h3>
                        <div className="space-y-1">
                          {results.failed.slice(0, 10).map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded border border-red-500/50 bg-red-500/5 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span className="font-medium">@{item.username}</span>
                              </div>
                              <span className="text-xs text-red-500">{item.error}</span>
                            </div>
                          ))}
                          {results.failed.length > 10 && (
                            <div className="text-xs text-muted-foreground text-center py-2">
                              还有 {results.failed.length - 10} 个失败项...
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* 推文采集摘要 */}
                  {tweets && (
                    <div className="space-y-2 mt-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-500" />
                        推文数据采集
                      </h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="rounded-lg border bg-card p-3">
                          <div className="text-xs text-muted-foreground">成功</div>
                          <div className="text-xl font-bold text-emerald-500">{tweets.success}</div>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                          <div className="text-xs text-muted-foreground">失败</div>
                          <div className="text-xl font-bold text-red-500">{tweets.failed}</div>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                          <div className="text-xs text-muted-foreground">总推文数</div>
                          <div className="text-xl font-bold">{tweets.totalTweets || 0}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DAO互动摘要 */}
                  {daoInteractions && (
                    <div className="space-y-2 mt-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-purple-500" />
                        DAO互动数据
                      </h3>
                      <div className="rounded-lg border bg-card p-3">
                        <div className="text-sm text-muted-foreground">采集到的互动数量</div>
                        <div className="text-2xl font-bold text-purple-500">{daoInteractions.count}</div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="details" className="flex-1 overflow-hidden mt-4 min-h-0 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {kolDetails && kolDetails.length > 0 ? (
                    kolDetails.map((kol, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border ${
                          kol.status === "success"
                            ? "border-emerald-500/50 bg-emerald-500/5"
                            : "border-red-500/50 bg-red-500/5"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {kol.status === "success" ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                            <div>
                              <div className="font-semibold">@{kol.username}</div>
                              {kol.display_name && (
                                <div className="text-sm text-muted-foreground">{kol.display_name}</div>
                              )}
                            </div>
                            <Badge variant={kol.status === "success" ? "default" : "destructive"}>
                              {kol.status === "success" ? "成功" : "失败"}
                            </Badge>
                          </div>
                        </div>
                        {kol.status === "success" ? (
                          <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                            <div>
                              <div className="text-muted-foreground">粉丝数</div>
                              <div className="font-semibold">
                                {kol.followers_count?.toLocaleString() || "N/A"}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">关注数</div>
                              <div className="font-semibold">
                                {kol.following_count?.toLocaleString() || "N/A"}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">推文数</div>
                              <div className="font-semibold">
                                {kol.tweet_count?.toLocaleString() || "N/A"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 text-sm text-red-500">
                            <div className="font-semibold">错误信息:</div>
                            <div className="mt-1">{kol.error || "未知错误"}</div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="space-y-2">
                      {results.success.map((username) => (
                        <div
                          key={username}
                          className="p-3 rounded-lg border border-emerald-500/50 bg-emerald-500/5"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <span className="font-medium">@{username}</span>
                            <Badge variant="default">成功</Badge>
                          </div>
                        </div>
                      ))}
                      {results.failed.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg border border-red-500/50 bg-red-500/5"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <span className="font-medium">@{item.username}</span>
                            <Badge variant="destructive">失败</Badge>
                          </div>
                          <div className="text-sm text-red-500 mt-1">{item.error}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="tweets" className="flex-1 overflow-hidden mt-4 min-h-0 flex flex-col">
              <ScrollArea className="flex-1">
                {tweets?.details && tweets.details.length > 0 ? (
                  <div className="space-y-2">
                    {tweets.details.map((detail, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${
                          detail.success
                            ? "border-emerald-500/50 bg-emerald-500/5"
                            : "border-red-500/50 bg-red-500/5"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {detail.success ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="font-medium">@{detail.username}</span>
                            <Badge variant={detail.success ? "default" : "destructive"}>
                              {detail.success ? "成功" : "失败"}
                            </Badge>
                          </div>
                          <div className="text-sm">
                            <span className="text-muted-foreground">推文数: </span>
                            <span className="font-semibold">{detail.tweetCount}</span>
                          </div>
                        </div>
                        {detail.error && (
                          <div className="mt-2 text-sm text-red-500">{detail.error}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {tweets ? (
                      <div>
                        <p>成功采集: {tweets.success} 个KOL的推文</p>
                        <p>失败: {tweets.failed} 个KOL的推文</p>
                        {tweets.totalTweets !== undefined && (
                          <p>总推文数: {tweets.totalTweets}</p>
                        )}
                      </div>
                    ) : (
                      <p>暂无推文采集数据</p>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            导出报告
          </Button>
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新数据
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>关闭</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

