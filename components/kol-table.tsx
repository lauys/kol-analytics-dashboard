"use client"

import { useRouter } from "next/navigation"
import type { KOL } from "@/lib/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TrendingUp, TrendingDown, Minus, Skull } from "lucide-react"
import { formatNumber } from "@/lib/utils"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/i18n"

interface KOLTableProps {
  kols: KOL[]
  onRowClick?: (kol: KOL) => void
}

export function KOLTable({ kols, onRowClick }: KOLTableProps) {
  const router = useRouter()
  const { language } = useLanguage()
  const t = translations[language]

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-success" />
    if (change < 0) return <TrendingDown className="h-4 w-4 text-destructive" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return "text-success"
    if (change < 0) return "text-destructive"
    return "text-muted-foreground"
  }

  const handleRowClick = (kol: KOL) => {
    router.push(`/kol/${kol.id}`)
  }

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">#</TableHead>
            <TableHead>{t.kol}</TableHead>
            <TableHead>{t.tier}</TableHead>
            <TableHead className="text-right">{t.followers}</TableHead>
            <TableHead className="text-right">{t.change_24h}</TableHead>
            <TableHead className="text-right">{t.growth_rate}</TableHead>
            <TableHead className="text-right">{t.tweets}</TableHead>
            <TableHead className="w-20">{language === "zh" ? "状态" : "Status"}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kols.map((kol, index) => (
            <TableRow
              key={kol.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleRowClick(kol)}
            >
              <TableCell className="font-semibold text-muted-foreground">#{index + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={kol.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {(kol.display_name || kol.twitter_username || "KOL").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-semibold leading-none mb-1">{kol.display_name || kol.twitter_username}</span>
                    <span className="text-sm text-muted-foreground">@{kol.twitter_username}</span>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {kol.tier && (
                  <Badge variant="outline" className="text-xs font-medium">
                    {kol.tier}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right font-mono font-semibold">
                {formatNumber(kol.latest_followers || 0)}
              </TableCell>
              <TableCell className="text-right">
                <div
                  className={`flex items-center justify-end gap-1.5 font-mono text-sm ${getTrendColor(kol.followers_change_24h || 0)}`}
                >
                  {getTrendIcon(kol.followers_change_24h || 0)}
                  {(kol.followers_change_24h || 0) > 0 ? "+" : ""}
                  {formatNumber(kol.followers_change_24h || 0)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <span className={`font-mono font-semibold ${getTrendColor(kol.followers_growth_rate_24h || 0)}`}>
                  {(kol.followers_growth_rate_24h || 0) > 0 ? "+" : ""}
                  {(kol.followers_growth_rate_24h || 0).toFixed(2)}%
                </span>
              </TableCell>
              <TableCell className="text-right font-mono">{formatNumber(kol.latest_tweets || 0)}</TableCell>
              <TableCell>
                {kol.is_zombie && (
                  <Badge variant="destructive" className="gap-1">
                    <Skull className="h-3 w-3" />
                    {language === "zh" ? "僵尸" : "Zombie"}
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
