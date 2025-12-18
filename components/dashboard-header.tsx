"use client"

import Image from "next/image"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, RefreshCw, Download, X } from "lucide-react"
import { ImportKOLsDialog } from "@/components/import-kols-dialog"
import { UserNav } from "@/components/user-nav"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/i18n"

interface DashboardHeaderProps {
  onSearch: (query: string) => void
  onFilterChange: (filter: string) => void
  onRefresh: () => void
  isRefreshing: boolean
  isAdmin?: boolean
}

export function DashboardHeader({
  onSearch,
  onFilterChange,
  onRefresh,
  isRefreshing,
  isAdmin = false,
}: DashboardHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [collectingAll, setCollectingAll] = useState(false)
  const [collectionProgress, setCollectionProgress] = useState<string>("")
  const [showResults, setShowResults] = useState(false)
  const [collectionResults, setCollectionResults] = useState<any>(null)
  const [exporting, setExporting] = useState(false)
  const [syncingDao, setSyncingDao] = useState(false)
  const { language } = useLanguage()
  const t = translations[language]

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch(value)
  }

  const handleCollectAllData = async () => {
    setCollectingAll(true)
    setCollectionProgress(t.collecting_kol_data || "正在采集KOL数据...")
    setShowResults(false)

    try {
      console.log("[v0] Starting data collection from UI...")
      const response = await fetch("/api/admin/collect-data", {
        method: "POST",
      })

      if (response.ok) {
        const data = await response.json()
        console.log("[v0] Collection completed:", data)

        setCollectionResults(data.results)
        setShowResults(true)
        setCollectionProgress("")

        setTimeout(() => {
          onRefresh()
          setShowResults(false)
        }, 5000)
      } else {
        console.error("[v0] Failed to collect data")
        setCollectionProgress("")
        alert(t.collection_failed || "数据采集失败")
      }
    } catch (error) {
      console.error("[v0] Error collecting data:", error)
      setCollectionProgress("")
      alert(t.collection_error || "采集过程中出现错误")
    } finally {
      setCollectingAll(false)
    }
  }

  const handleExportHistory = async () => {
    try {
      setExporting(true)
      const response = await fetch("/api/admin/export-kol-history", {
        method: "GET",
      })

      if (!response.ok) {
        console.error("[v0] Failed to export KOL history")
        alert("导出失败，请稍后重试")
        return
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `kol_history_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("[v0] Error exporting KOL history:", error)
      alert("导出过程中出现错误")
    } finally {
      setExporting(false)
    }
  }

  const handleSyncDaoInteractions = async () => {
    try {
      setSyncingDao(true)
      const response = await fetch("/api/admin/dao-interactions?limit=100", {
        method: "GET",
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        console.error("[v0] Failed to sync DAO interactions:", data)
        alert(data.error || "同步 DAO 互动数据失败，请稍后重试")
        return
      }

      const totalInteractions = data.totalInteractions ?? 0
      const kolCount = Array.isArray(data.kols) ? data.kols.length : 0

      alert(
        `已完成 DAO 互动数据同步：\n- 参与 KOL 数量：${kolCount}\n- 总互动条数（最近 100 条官方推文）：${totalInteractions}`,
      )
    } catch (error) {
      console.error("[v0] Error syncing DAO interactions:", error)
      alert("同步 DAO 互动数据过程中出现错误")
    } finally {
      setSyncingDao(false)
    }
  }

  return (
    <div className="relative">
      {/* 背景光束与科技感装饰 */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-16 top-1/2 h-52 w-52 -translate-y-1/2 rounded-full bg-gradient-to-tr from-chart-2/35 via-primary/45 to-chart-4/15 blur-3xl" />
        <div className="absolute right-[-40px] top-[-40px] h-48 w-72 bg-gradient-to-bl from-chart-3/45 via-primary/35 to-transparent blur-3xl" />
        <div className="absolute inset-0 opacity-50 [mask-image:radial-gradient(circle_at_top,white,transparent_70%)]">
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,_theme(colors.primary.DEFAULT/22),_transparent_55%)]" />
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-gradient-to-br from-background/85 via-background/65 to-background/85 px-6 py-6 shadow-[0_28px_120px_rgba(15,23,42,0.9)] backdrop-blur-2xl md:px-8 md:py-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/40 via-chart-2/40 to-background shadow-[0_0_42px_rgba(56,189,248,0.65)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0,white/35,transparent_55%)] mix-blend-screen" />
              <Image src="/icon.svg" alt="KOL Analytics" fill className="p-2 object-contain" priority />
            </div>
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-sky-100 shadow-[0_0_18px_rgba(129,140,248,0.55)] backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
                <span className="uppercase tracking-[0.18em] text-[10px]">
                  KOL Insights
                </span>
              </div>
              <div>
                <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl lg:text-[2.75rem] lg:leading-tight">
                  {t.dashboard_title}
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
                  {t.dashboard_subtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <UserNav />
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t.search_placeholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="glass-input pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={() => handleSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 md:justify-end">
            <Select defaultValue="all" onValueChange={onFilterChange}>
              <SelectTrigger className="w-40 border-border/60 bg-background/60 backdrop-blur">
                <SelectValue placeholder={t.filter_all} />
              </SelectTrigger>
              <SelectContent className="border-border/60 bg-background/95 backdrop-blur">
                <SelectItem value="all">{t.filter_all}</SelectItem>
                <SelectItem value="active">{t.filter_active}</SelectItem>
                <SelectItem value="zombie">{t.filter_zombie}</SelectItem>
                <SelectItem value="growing">{t.filter_growing}</SelectItem>
              </SelectContent>
            </Select>

            {isAdmin && (
              <>
                <Button
                  variant="default"
                  onClick={handleCollectAllData}
                  disabled={collectingAll || isRefreshing}
                  className="relative overflow-hidden border border-primary/60 bg-gradient-to-r from-primary/90 via-chart-2/90 to-chart-4/90 text-primary-foreground shadow-[0_0_32px_rgba(94,234,212,0.45)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_40px_rgba(94,234,212,0.7)]"
                >
                  <span className="pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(to_right,transparent,white,transparent)]">
                    <span className="block h-full w-full translate-x-[-100%] bg-[linear-gradient(to_right,transparent,white,transparent)] motion-safe:animate-[shimmer_2.4s_infinite]" />
                  </span>
                  <RefreshCw className={`relative z-10 mr-2 h-4 w-4 ${collectingAll ? "animate-spin" : ""}`} />
                  <span className="relative z-10">{collectingAll ? t.collecting : t.collect_all_data}</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSyncDaoInteractions}
                  disabled={syncingDao}
                  className="border-border/70 bg-background/60 text-xs md:text-sm backdrop-blur hover:border-primary/60 hover:text-primary"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${syncingDao ? "animate-spin" : ""}`} />
                  {syncingDao ? "同步 DAO 互动中..." : "同步 DAO 互动数据"}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleExportHistory}
                  disabled={exporting}
                  className="border-border/70 bg-background/60 text-xs md:text-sm backdrop-blur hover:border-primary/60 hover:text-primary"
                >
                  <Download className={`mr-2 h-4 w-4 ${exporting ? "animate-pulse" : ""}`} />
                  {exporting ? "导出中..." : "导出历史数据"}
                </Button>

                <ImportKOLsDialog />
              </>
            )}

            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="border-border/70 bg-background/60 backdrop-blur hover:border-primary/60 hover:text-primary"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {collectionProgress && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 px-3 py-2 text-xs shadow-[0_0_24px_rgba(56,189,248,0.35)]">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
              <span className="text-primary-foreground/80">{collectionProgress}</span>
            </div>
          </div>
        )}

        {showResults && collectionResults && (
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-3 py-3 text-xs shadow-[0_0_26px_rgba(16,185,129,0.4)]">
            <h3 className="mb-1.5 font-semibold text-emerald-300">
              {t.collection_complete || "✓ 数据采集完成"}
            </h3>
            <div className="space-y-1 text-emerald-100/90">
              <p>
                {t.successful_kols || "成功采集"}: {collectionResults.success?.length || 0}{" "}
                {t.kols || "个KOL"}
              </p>
              {collectionResults.failed?.length > 0 && (
                <p className="text-amber-200">
                  {t.failed_kols || "失败"}: {collectionResults.failed.length} {t.kols || "个KOL"}
                </p>
              )}
              <p className="mt-1 text-[11px] opacity-75">
                {t.collection_note || "注意：推文数据已同步采集并保存到数据库"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

declare global {
  // 自定义 shimmer 动画 keyframes（配合 arbitrary animate 使用）
  // 这里是类型声明，不会影响运行时，仅用于避免 TS 报错
  interface CSSProperties {
    "--tw-shimmer"?: string
  }
}
