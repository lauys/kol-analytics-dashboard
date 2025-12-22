"use client"

import type React from "react"

import { useState, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Upload, Loader2, FileText, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"

interface ImportResult {
  success: string[]
  failed: { username: string; error: string }[]
  skipped: string[]
}

export function ImportKOLsDialog() {
  const [open, setOpen] = useState(false)
  const [usernames, setUsernames] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      // Parse CSV - handle both comma-separated and newline-separated
      const lines = text
        .split(/[\n,]/)
        .map((line) => line.trim().replace(/^["@]+|["]+$/g, ""))
        .filter((line) => line.length > 0 && !line.toLowerCase().includes("username"))
      setUsernames(lines.join("\n"))
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    const usernameList = usernames
      .split("\n")
      .map((line) => line.trim().replace(/^["@]+|["]+$/g, ""))
      .filter((line) => line.length > 0)

    if (usernameList.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one username",
        variant: "destructive",
      })
      return
    }

    setIsImporting(true)
    setProgress(0)
    setResult({
      success: [],
      failed: [],
      skipped: [],
    })

    const BATCH_SIZE = 5 // Process 5 KOLs at a time
    const batches = []
    for (let i = 0; i < usernameList.length; i += BATCH_SIZE) {
      batches.push(usernameList.slice(i, i + BATCH_SIZE))
    }

    try {
      let processedCount = 0
      const totalCount = usernameList.length

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]

        const response = await fetch("/api/admin/import-kols", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: batch }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Import failed")
        }

        const batchResult = await response.json()

        // Accumulate results
        setResult((prev) => ({
          success: [...(prev?.success || []), ...batchResult.success],
          failed: [...(prev?.failed || []), ...batchResult.failed],
          skipped: [...(prev?.skipped || []), ...batchResult.skipped],
        }))

        processedCount += batch.length
        setProgress(Math.round((processedCount / totalCount) * 100))

        // Add delay between batches
        if (i < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      toast({
        title: "Import Complete",
        description: `Processed ${totalCount} KOLs across ${batches.length} batch(es)`,
      })

      // Reload page to show new data
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (error) {
      console.error("[v0] Import error:", error)
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isImporting) {
      setOpen(isOpen)
      if (!isOpen) {
        setResult(null)
        setProgress(0)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import KOLs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Import KOLs</DialogTitle>
          <DialogDescription>
            Enter Twitter usernames (one per line) or upload a CSV file. Large lists will be imported in batches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File upload */}
          <div className="flex gap-2">
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} ref={fileInputRef} className="hidden" />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
              <FileText className="h-4 w-4 mr-2" />
              Upload CSV
            </Button>
            <span className="text-sm text-muted-foreground self-center">or paste usernames below</span>
          </div>

          {/* Username input - 固定高度，内部滚动，避免把底部按钮顶出视口 */}
          <Textarea
            placeholder="@username1&#10;@username2&#10;username3"
            value={usernames}
            onChange={(e) => setUsernames(e.target.value)}
            className="min-h-[200px] max-h-[55vh] font-mono text-sm overflow-y-auto resize-none"
            disabled={isImporting}
          />

          {/* Progress bar */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">Importing in batches... {progress}% complete</p>
            </div>
          )}

          {/* Results */}
          {result && (result.success.length > 0 || result.failed.length > 0 || result.skipped.length > 0) && (
            <div className="space-y-2 p-3 rounded-lg bg-muted">
              <p className="text-sm font-medium">Import Results:</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {result.success.length} imported
                </span>
                <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="h-4 w-4" />
                  {result.skipped.length} skipped
                </span>
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <XCircle className="h-4 w-4" />
                  {result.failed.length} failed
                </span>
              </div>
              {result.failed.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground max-h-32 overflow-y-auto">
                  <p className="font-medium text-destructive">Failed ({result.failed.length}):</p>
                  {result.failed.map((f, i) => (
                    <div key={i} className="mt-1 p-2 rounded bg-destructive/10 border border-destructive/20">
                      <p className="font-medium text-destructive">@{f.username}</p>
                      <p className="text-destructive/80 mt-0.5 break-words">{f.error}</p>
                    </div>
                  ))}
                  <p className="mt-2 text-muted-foreground italic">
                    提示：如果所有导入都失败，请检查网络连接和 Twitter API Key 配置
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              {usernames.split("\n").filter((l) => l.trim()).length} username(s) ready (processed in batches of 5)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleClose(false)} disabled={isImporting}>
                {result && result.success.length > 0 ? "Close" : "Cancel"}
              </Button>
              {(!result || result.success.length === 0) && (
                <Button onClick={handleImport} disabled={isImporting || !usernames.trim()}>
                  {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Import
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
