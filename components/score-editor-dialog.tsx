"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { KOL } from "@/lib/types"
import { Pencil } from "lucide-react"

interface ScoreEditorDialogProps {
  kol: KOL
  onUpdate: () => void
}

export function ScoreEditorDialog({ kol, onUpdate }: ScoreEditorDialogProps) {
  const [open, setOpen] = useState(false)
  const [score, setScore] = useState(kol.manual_score?.toString() || "0")
  const [tier, setTier] = useState(kol.tier || "None")
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/admin/update-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kolId: kol.id,
          score: Number.parseInt(score) || 0,
          tier: tier || null,
        }),
      })

      const data = await response.json()

      if (data.success) {
        onUpdate()
        setOpen(false)
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("[v0] Save error:", error)
      alert("Failed to update KOL")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit KOL Score & Tier</DialogTitle>
          <DialogDescription>Manually adjust the ranking score and tier for {kol.display_name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="score">Manual Score</Label>
            <Input id="score" type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="0" />
            <p className="text-xs text-muted-foreground">Higher scores will boost ranking position</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tier">Tier</Label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger id="tier">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Mid">Mid</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
