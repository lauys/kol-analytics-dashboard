"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, ArrowRight, ChevronDown, ChevronUp, AlertCircle } from "lucide-react"
import type { BioChange } from "@/lib/types"
import { useLanguage } from "@/lib/language-context"
import { translations } from "@/lib/i18n"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface BioHistoryPanelProps {
  kolId: string
}

export function BioHistoryPanel({ kolId }: BioHistoryPanelProps) {
  const [history, setHistory] = useState<BioChange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const { language } = useLanguage()
  const t = translations[language]

  useEffect(() => {
    fetchBioHistory()
  }, [kolId])

  const fetchBioHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/kols/${kolId}/bio-history`)
      if (response.ok) {
        const data = await response.json()
        setHistory(data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || t.bio_history_error)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch bio history:", error)
      setError(t.bio_history_error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) {
      return t.just_now
    } else if (diffMins < 60) {
      return t.time_minutes_ago.replace("{n}", String(diffMins))
    } else if (diffHours < 24) {
      return t.time_hours_ago.replace("{n}", String(diffHours))
    } else if (diffDays < 7) {
      return t.time_days_ago.replace("{n}", String(diffDays))
    } else {
      return date.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.bio_change_history}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">{t.loading_analytics}</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.bio_change_history}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.bio_change_history}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">{t.no_bio_changes}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t.bio_change_history}</CardTitle>
          <Badge variant="outline">
            {history.length} {t.bio_changes}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((change) => {
            const isExpanded = expandedItems.has(change.id)
            const oldBio = change.old_bio || ""
            const newBio = change.new_bio || ""
            const needsExpansion = oldBio.length > 100 || newBio.length > 100

            return (
              <div key={change.id} className="space-y-3 pb-4 border-b last:border-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(change.changed_at)}</span>
                  <span className="text-muted-foreground/60">
                    ({new Date(change.changed_at).toLocaleString(language === "zh" ? "zh-CN" : "en-US")})
                  </span>
                </div>

                <div className="grid gap-3">
                  {change.old_bio && (
                    <div className="p-3 bg-destructive/5 dark:bg-destructive/10 rounded-md border border-destructive/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-destructive font-medium">{t.old_bio}</span>
                        {needsExpansion && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => toggleExpand(change.id)}
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3 mr-1" />
                                {t.collapse_bio}
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3 mr-1" />
                                {t.expand_bio}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      <p className={`text-sm text-muted-foreground ${!isExpanded && needsExpansion ? "line-clamp-3" : ""}`}>
                        {change.old_bio}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-center py-1">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div className="p-3 bg-success/5 dark:bg-success/10 rounded-md border border-success/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-success font-medium">{t.new_bio}</span>
                      {needsExpansion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => toggleExpand(change.id)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1" />
                              {t.collapse_bio}
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1" />
                              {t.expand_bio}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <p className={`text-sm ${!isExpanded && needsExpansion ? "line-clamp-3" : ""}`}>
                      {change.new_bio}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
