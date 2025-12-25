"use client"

import { useState, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
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
  Trash2,
} from "lucide-react"
import { formatNumber, cn } from "@/lib/utils"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
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
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 100
  // 简单的前端缓存，避免切换时间维度 / 榜单类型时产生"整页刷新"的感觉
  const [cache, setCache] = useState<Record<string, RankingKOL[]>>({})
  // 跟踪已预加载的 key，避免重复请求
  const preloadedKeysRef = useRef<Set<string>>(new Set())
  const [totalSortField, setTotalSortField] = useState<TotalSortField>("followers")
  const [totalSortOrder, setTotalSortOrder] = useState<SortOrder>("desc")
  const [growthSortField, setGrowthSortField] = useState<GrowthSortField>("growth")
  const [growthSortOrder, setGrowthSortOrder] = useState<SortOrder>("desc")
  const [govSortField, setGovSortField] = useState<GovernanceSortField>("tweets")
  const [govSortOrder, setGovSortOrder] = useState<SortOrder>("desc")
  // 批量删除相关状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { t } = useTranslation()

  // 如果当前不是管理员但选中了贡献度 Tab，则自动切回总榜
  useEffect(() => {
    if (!isAdmin && activeTab === "contribution") {
      setActiveTab("total")
    }
  }, [isAdmin, activeTab])

  // 切换标签页或页面时清空选中状态
  useEffect(() => {
    setSelectedIds(new Set())
  }, [activeTab, currentPage])

  // 处理单个复选框切换
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // 处理全选/取消全选
  const handleSelectAll = (currentPageKols: RankingKOL[]) => {
    const allSelected = currentPageKols.every((kol) => selectedIds.has(kol.id))
    if (allSelected) {
      // 取消全选当前页
      setSelectedIds((prev) => {
        const newSet = new Set(prev)
        currentPageKols.forEach((kol) => newSet.delete(kol.id))
        return newSet
      })
    } else {
      // 全选当前页
      setSelectedIds((prev) => {
        const newSet = new Set(prev)
        currentPageKols.forEach((kol) => newSet.add(kol.id))
        return newSet
      })
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      alert(t("no_kols_selected"))
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch("/api/kols/batch-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          alert(t("batch_delete_success").replace("{n}", String(selectedIds.size)))
          setSelectedIds(new Set())
          setShowDeleteDialog(false)
          // 刷新数据
          fetchRankings()
          // 清除缓存，强制重新加载
          setCache({})
        } else {
          alert(t("batch_delete_failed"))
        }
      } else {
        alert(t("batch_delete_failed"))
      }
    } catch (error) {
      console.error("[v0] Failed to batch delete KOLs:", error)
      alert(t("batch_delete_failed"))
    } finally {
      setIsDeleting(false)
    }
  }

  // 页面加载时预加载所有时间维度的数据（静默加载，不显示 loading）
  useEffect(() => {
    const preloadAllPeriods = async () => {
      const tabs: RankingType[] = isAdmin ? ["total", "growth", "governance", "contribution"] : ["total", "growth", "governance"]
      const periods: TimePeriod[] = ["24h", "7d", "30d"]
      
      // 静默预加载所有组合，不显示 loading
      const preloadPromises = tabs.flatMap((tab) =>
        periods.map(async (period) => {
          const key = JSON.stringify({
            type: tab,
            period,
            search: searchQuery.trim(),
            filter: filter || "all",
          })
          
          // 如果已预加载或已有缓存，跳过
          if (preloadedKeysRef.current.has(key)) return
          
          // 标记为正在预加载
          preloadedKeysRef.current.add(key)
          
          try {
            const params = new URLSearchParams({
              type: tab,
              period,
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
              setCache((prev) => ({
                ...prev,
                [key]: data,
              }))
            }
          } catch (error) {
            // 静默失败，不影响用户体验
            console.error(`[v0] Failed to preload ${tab}-${period}:`, error)
          }
        })
      )
      
      // 并行加载所有数据，不阻塞 UI
      Promise.all(preloadPromises).catch(() => {
        // 静默处理错误
      })
    }
    
    preloadAllPeriods()
  }, [searchQuery, filter, isAdmin]) // 当搜索或筛选变化时，重新预加载

  // 切换榜单/时间维度/搜索/筛选时，从缓存读取或加载，并重置到第一页
  useEffect(() => {
    setCurrentPage(1)
    fetchRankings()
  }, [activeTab, timePeriod, searchQuery, filter])

  const fetchRankings = async () => {
    const key = JSON.stringify({
      type: activeTab,
      period: timePeriod,
      search: searchQuery.trim(),
      filter: filter || "all",
    })

    // 如果已经有缓存数据，直接使用缓存并跳过网络请求
    if (cache[key]) {
      setKols(cache[key])
      setLoading(false)
      return
    }

    // 只有在没有缓存时才显示 loading
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
        setCache((prev) => ({
          ...prev,
          [key]: data,
        }))
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

  // 分页工具函数
  const getPaginatedData = <T,>(data: T[]) => {
    const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE)
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    const paginatedData = data.slice(startIndex, endIndex)
    return { paginatedData, totalPages, totalItems: data.length }
  }

  // 渲染分页组件
  const renderPagination = (totalPages: number, totalItems: number) => {
    if (totalPages <= 1) return null

    const pages = []
    const maxVisiblePages = 7

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i)
        pages.push("ellipsis")
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push("ellipsis")
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push("ellipsis")
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
        pages.push("ellipsis")
        pages.push(totalPages)
      }
    }

    return (
      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="text-sm text-muted-foreground">
          共 {totalItems} 条，第 {currentPage} / {totalPages} 页
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (currentPage > 1) setCurrentPage(currentPage - 1)
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {pages.map((page, index) => (
              <PaginationItem key={index}>
                {page === "ellipsis" ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setCurrentPage(page as number)
                    }}
                    isActive={currentPage === page}
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1)
                }}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    )
  }

  const renderTotalRanking = () => {
    const sortedKols = getSortedTotalKols()
    const { paginatedData, totalPages, totalItems } = getPaginatedData(sortedKols)

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
      <>
        {isAdmin && selectedIds.size > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-lg border bg-card p-4">
            <span className="text-sm font-medium">
              {t("selected_count").replace("{n}", String(selectedIds.size))}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t("batch_delete")}
            </Button>
          </div>
        )}
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[720px] text-sm md:text-base">
        <TableHeader>
          <TableRow className="bg-muted/50">
            {isAdmin && (
              <TableHead className="w-12">
                <Checkbox
                  checked={paginatedData.length > 0 && paginatedData.every((kol) => selectedIds.has(kol.id))}
                  onCheckedChange={() => handleSelectAll(paginatedData)}
                />
              </TableHead>
            )}
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
          {paginatedData.map((kol, index) => {
            const globalRank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1
            const delay = Math.min(index * 0.03, 0.5) // 每行延迟最多0.5秒
            return (
              <TableRow
                key={kol.id || `kol-${index}-${globalRank}`}
                className="cursor-pointer hover:bg-accent/50 transition-all duration-300 ease-out hover:translate-x-1"
                style={{ animation: `fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s backwards` }}
                onClick={(e) => {
                  // 如果点击的是复选框，不触发行点击
                  if ((e.target as HTMLElement).closest('[data-slot="checkbox"]')) {
                    return
                  }
                  handleRowClick(kol)
                }}
              >
              {isAdmin && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(kol.id)}
                    onCheckedChange={() => handleToggleSelect(kol.id)}
                  />
                </TableCell>
              )}
              <TableCell className="font-bold">
                {globalRank <= 3 ? (
                  <div className="flex items-center justify-center">
                    <Trophy
                      className={`h-5 w-5 ${
                        globalRank === 1 ? "text-yellow-500" : globalRank === 2 ? "text-gray-400" : "text-amber-600"
                      }`}
                    />
                  </div>
                ) : (
                  <span className="text-muted-foreground">#{globalRank}</span>
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
            )
          })}
      </TableBody>
    </Table>
      </div>
        {renderPagination(totalPages, totalItems)}
      </>
    )
  }

  const renderGrowthRanking = () => {
    const sortedKols = getSortedGrowthKols()
    const { paginatedData, totalPages, totalItems } = getPaginatedData(sortedKols)

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
        <div className="flex justify-center gap-3 md:gap-4 px-6 pt-6">
          <Button 
            variant={timePeriod === "24h" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setTimePeriod("24h")}
            className={timePeriod !== "24h" ? "hover:text-foreground" : ""}
          >
            {t("time_24h")}
          </Button>
          <Button 
            variant={timePeriod === "7d" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setTimePeriod("7d")}
            className={timePeriod !== "7d" ? "hover:text-foreground" : ""}
          >
            {t("time_7d")}
          </Button>
          <Button 
            variant={timePeriod === "30d" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setTimePeriod("30d")}
            className={timePeriod !== "30d" ? "hover:text-foreground" : ""}
          >
            {t("time_30d")}
          </Button>
        </div>

        {isAdmin && selectedIds.size > 0 && (
          <div className="mx-6 mb-4 flex items-center justify-between rounded-lg border bg-card p-4">
            <span className="text-sm font-medium">
              {t("selected_count").replace("{n}", String(selectedIds.size))}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t("batch_delete")}
            </Button>
          </div>
        )}

        <div className="w-full overflow-x-auto">
          <Table className="min-w-[720px] text-sm md:text-base">
          <TableHeader>
            <TableRow className="bg-muted/50">
              {isAdmin && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={paginatedData.length > 0 && paginatedData.every((kol) => selectedIds.has(kol.id))}
                    onCheckedChange={() => handleSelectAll(paginatedData)}
                  />
                </TableHead>
              )}
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
            {paginatedData.map((kol, index) => {
              const globalRank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1
              const delay = Math.min(index * 0.03, 0.5)
              const growth = getGrowthValue(kol)
              const growthRate = getGrowthRate(kol)
              return (
                <TableRow
                  key={kol.id || `kol-${index}-${globalRank}`}
                  className="cursor-pointer hover:bg-accent/50 transition-all duration-300 ease-out hover:translate-x-1"
                  style={{ animation: `fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s backwards` }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('[data-slot="checkbox"]')) {
                      return
                    }
                    handleRowClick(kol)
                  }}
                >
                  {isAdmin && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(kol.id)}
                        onCheckedChange={() => handleToggleSelect(kol.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-bold">
                    {globalRank <= 3 ? (
                      <div className="flex items-center justify-center">
                        <Zap
                          className={`h-5 w-5 ${
                            globalRank === 1 ? "text-yellow-500" : globalRank === 2 ? "text-gray-400" : "text-amber-600"
                          }`}
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">#{globalRank}</span>
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
        {renderPagination(totalPages, totalItems)}
      </div>
    )
  }

  const renderGovernanceRanking = () => {
    const sortedKols = getSortedGovKols()
    const { paginatedData, totalPages, totalItems } = getPaginatedData(sortedKols)

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
        <div className="flex justify-center gap-3 md:gap-4 pt-6">
          <Button
            variant={timePeriod === "24h" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("24h")}
            className={timePeriod !== "24h" ? "hover:text-foreground" : ""}
          >
            {t("time_24h")}
          </Button>
          <Button
            variant={timePeriod === "7d" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("7d")}
            className={timePeriod !== "7d" ? "hover:text-foreground" : ""}
          >
            {t("time_7d")}
          </Button>
          <Button
            variant={timePeriod === "30d" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimePeriod("30d")}
            className={timePeriod !== "30d" ? "hover:text-foreground" : ""}
          >
            {t("time_30d")}
          </Button>
        </div>

        {isAdmin && selectedIds.size > 0 && (
          <div className="mx-6 mb-4 flex items-center justify-between rounded-lg border bg-card p-4">
            <span className="text-sm font-medium">
              {t("selected_count").replace("{n}", String(selectedIds.size))}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t("batch_delete")}
            </Button>
          </div>
        )}

        <div className="w-full overflow-x-auto">
          <Table className="min-w-[720px] text-sm md:text-base">
          <TableHeader>
            <TableRow className="bg-muted/50">
              {isAdmin && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={paginatedData.length > 0 && paginatedData.every((kol) => selectedIds.has(kol.id))}
                    onCheckedChange={() => handleSelectAll(paginatedData)}
                  />
                </TableHead>
              )}
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
            {paginatedData.map((kol, index) => {
              const globalRank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1
              const delay = Math.min(index * 0.03, 0.5)
              const inactive = isInactive(kol.latest_time)
              const metrics = getGovernanceMetricsForPeriod(kol)

              return (
                <TableRow
                  key={kol.id || `kol-${index}-${globalRank}`}
                  className={`cursor-pointer hover:bg-accent/50 transition-all duration-300 ease-out hover:translate-x-1 ${
                    inactive ? "bg-destructive/5" : ""
                  }`}
                  style={{ animation: `fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s backwards` }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('[data-slot="checkbox"]')) {
                      return
                    }
                    handleRowClick(kol)
                  }}
                >
                  {isAdmin && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(kol.id)}
                        onCheckedChange={() => handleToggleSelect(kol.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-semibold text-muted-foreground">#{globalRank}</TableCell>
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
        {renderPagination(totalPages, totalItems)}
      </div>
    )
  }

  const renderContributionRanking = () => {
    const { paginatedData, totalPages, totalItems } = getPaginatedData(kols)
    
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
      <>
        <div className="px-6 pt-6 pb-4 border-b border-border/50">
          <p className="text-sm text-foreground/90 font-medium">量化与官方账号的互动贡献。</p>
        </div>
        {isAdmin && selectedIds.size > 0 && (
          <div className="mx-6 mb-4 flex items-center justify-between rounded-lg border bg-card p-4">
            <span className="text-sm font-medium">
              {t("selected_count").replace("{n}", String(selectedIds.size))}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {t("batch_delete")}
            </Button>
          </div>
        )}
        <div className="w-full overflow-x-auto">
          <Table className="min-w-[780px] text-sm md:text-base">
        <TableHeader>
          <TableRow className="bg-muted/50">
            {isAdmin && (
              <TableHead className="w-12">
                <Checkbox
                  checked={paginatedData.length > 0 && paginatedData.every((kol) => selectedIds.has(kol.id))}
                  onCheckedChange={() => handleSelectAll(paginatedData)}
                />
              </TableHead>
            )}
            <TableHead className="w-16">{t("rank")}</TableHead>
            <TableHead>{t("kol")}</TableHead>
            <TableHead className="text-right">{t("contribution_score")}</TableHead>
            <TableHead className="w-[180px]">{t("interaction_rate")}</TableHead>
            <TableHead className="w-[220px]">{t("engagement_breakdown")}</TableHead>
            <TableHead className="text-center">{t("status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.map((kol, index) => {
            const globalRank = (currentPage - 1) * ITEMS_PER_PAGE + index + 1
            const delay = Math.min(index * 0.03, 0.5)
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
                key={kol.id || `kol-${index}-${globalRank}`}
                className="cursor-pointer hover:bg-accent/50 transition-all duration-300 ease-out hover:translate-x-1"
                style={{ animation: `fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s backwards` }}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('[data-slot="checkbox"]')) {
                    return
                  }
                  handleRowClick(kol)
                }}
              >
                {isAdmin && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(kol.id)}
                      onCheckedChange={() => handleToggleSelect(kol.id)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-semibold text-muted-foreground">
                  {globalRank <= 3 ? (
                    <div className="flex items-center justify-center">
                      <Trophy
                        className={`h-5 w-5 ${
                          globalRank === 1 ? "text-amber-400" : globalRank === 2 ? "text-slate-300" : "text-yellow-700"
                        }`}
                      />
                    </div>
                  ) : (
                    <>#{globalRank}</>
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
      </div>
        {renderPagination(totalPages, totalItems)}
      </>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RankingType)} className="w-full gap-6 max-w-full overflow-x-hidden">
      <TabsList className={cn(
        "!h-auto !flex !w-full rounded-2xl bg-card/60 border border-border/50 p-1 sm:p-1.5 grid gap-1 sm:gap-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-sm max-w-full overflow-hidden",
        isAdmin ? "grid-cols-4" : "grid-cols-3"
      )}>
        <TabsTrigger
          value="total"
          className={cn(
            "relative !h-auto !flex !flex-col font-medium rounded-xl transition-all duration-200 w-full items-center justify-center py-3 px-2 sm:px-4 !border-0 min-w-0 overflow-hidden",
            activeTab === "total"
              ? "!bg-gradient-to-br !from-blue-500 !to-blue-600 !text-white shadow-lg"
              : "!bg-transparent !text-muted-foreground hover:!bg-muted/50 hover:!text-foreground",
          )}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <Trophy className={cn(
              "h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0",
              activeTab === "total" ? "text-yellow-300" : "text-muted-foreground/60"
            )} />
            <span className="text-xs sm:text-sm font-medium truncate">{t("total_ranking")}</span>
          </div>
          <div className={cn(
            "text-[10px] sm:text-xs text-center mt-0.5 line-clamp-2",
            activeTab === "total" ? "text-white/80" : "text-muted-foreground/50"
          )}>
            {t("total_ranking_subtitle")}
          </div>
        </TabsTrigger>
        <TabsTrigger
          value="growth"
          className={cn(
            "relative !h-auto !flex !flex-col font-medium rounded-xl transition-all duration-200 w-full items-center justify-center py-3 px-2 sm:px-4 !border-0 min-w-0 overflow-hidden",
            activeTab === "growth"
              ? "!bg-gradient-to-br !from-emerald-500 !to-teal-500 !text-white shadow-lg"
              : "!bg-transparent !text-muted-foreground hover:!bg-muted/50 hover:!text-foreground",
          )}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <Zap className={cn(
              "h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0",
              activeTab === "growth" ? "text-yellow-200" : "text-muted-foreground/60"
            )} />
            <span className="text-xs sm:text-sm font-medium truncate">{t("growth_ranking")}</span>
          </div>
          <div className={cn(
            "text-[10px] sm:text-xs text-center mt-0.5 line-clamp-2",
            activeTab === "growth" ? "text-white/80" : "text-muted-foreground/50"
          )}>
            {t("growth_ranking_subtitle")}
          </div>
        </TabsTrigger>
        <TabsTrigger
          value="governance"
          className={cn(
            "relative !h-auto !flex !flex-col font-medium rounded-xl transition-all duration-200 w-full items-center justify-center py-3 px-2 sm:px-4 !border-0 min-w-0 overflow-hidden",
            activeTab === "governance"
              ? "!bg-gradient-to-br !from-fuchsia-500 !to-pink-500 !text-white shadow-lg"
              : "!bg-transparent !text-muted-foreground hover:!bg-muted/50 hover:!text-foreground",
          )}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <ActivityIcon className={cn(
              "h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0",
              activeTab === "governance" ? "text-pink-200" : "text-muted-foreground/60"
            )} />
            <span className="text-xs sm:text-sm font-medium truncate">{t("governance_activity")}</span>
          </div>
          <div className={cn(
            "text-[10px] sm:text-xs text-center mt-0.5 line-clamp-2",
            activeTab === "governance" ? "text-white/80" : "text-muted-foreground/50"
          )}>
            {t("governance_activity_subtitle")}
          </div>
        </TabsTrigger>
        {isAdmin && (
          <TabsTrigger
            value="contribution"
            className={cn(
              "relative !h-auto !flex !flex-col font-medium rounded-xl transition-all duration-200 w-full items-center justify-center py-3 px-2 sm:px-4 !border-0 min-w-0 overflow-hidden",
              activeTab === "contribution"
                ? "!bg-gradient-to-br !from-amber-500 !to-orange-500 !text-white shadow-lg"
                : "!bg-transparent !text-muted-foreground hover:!bg-muted/50 hover:!text-foreground",
            )}
          >
            <div className="flex items-center gap-1 sm:gap-2">
              <Trophy className={cn(
                "h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0",
                activeTab === "contribution" ? "text-yellow-200" : "text-muted-foreground/60"
              )} />
              <span className="text-xs sm:text-sm font-medium truncate">{t("contribution")}</span>
            </div>
            <div className={cn(
              "text-[10px] sm:text-xs text-center mt-0.5 line-clamp-2",
              activeTab === "contribution" ? "text-white/80" : "text-muted-foreground/50"
            )}>
              {t("contribution_subtitle")}
            </div>
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="total" className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center animate-pulse">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>{t("loading_analytics")}</span>
            </div>
          </div>
        ) : (
          <div className="animate-fadeIn">{renderTotalRanking()}</div>
        )}
      </TabsContent>

      <TabsContent value="growth" className="space-y-4">
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center animate-pulse">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>{t("loading_analytics")}</span>
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn">{renderGrowthRanking()}</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="governance" className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center animate-pulse">
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>{t("loading_analytics")}</span>
            </div>
          </div>
        ) : (
          <div className="animate-fadeIn">{renderGovernanceRanking()}</div>
        )}
      </TabsContent>

      {isAdmin && (
        <TabsContent value="contribution" className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center animate-pulse">
              <div className="inline-flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>{t("loading_analytics")}</span>
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn">{renderContributionRanking()}</div>
          )}
        </TabsContent>
      )}

      {/* 批量删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("batch_delete_confirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("batch_delete_message").replace("{n}", String(selectedIds.size))}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("deleting") : t("confirm_delete_button")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  )
}
