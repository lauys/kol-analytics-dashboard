"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function AdminSetupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()

      console.log("[v0] Creating admin account for:", email)

      // Sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
        },
      })

      if (signUpError) {
        console.error("[v0] Admin signup error:", signUpError)
        throw signUpError
      }

      console.log("[v0] User created, updating role to admin...")

      if (signUpData.user) {
        // Update user role to admin
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ role: "admin" })
          .eq("id", signUpData.user.id)

        if (updateError) {
          console.error("[v0] Failed to update role:", updateError)
          throw updateError
        }

        console.log("[v0] Admin account created successfully")
        setSuccess(true)
        setTimeout(() => {
          router.push("/auth/login")
        }, 2000)
      }
    } catch (err) {
      console.error("[v0] Admin setup exception:", err)
      setError(err instanceof Error ? err.message : "Failed to create admin account")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create Admin Account</CardTitle>
            <CardDescription>Set up your first administrator account for the KOL Analytics Dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAdmin}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="admin-email">Admin Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Password must be at least 6 characters</p>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}
                {success && (
                  <p className="text-sm text-green-600">Admin account created successfully! Redirecting to login...</p>
                )}

                <Button type="submit" className="w-full" disabled={isLoading || success}>
                  {isLoading ? "Creating..." : success ? "Success!" : "Create Admin Account"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
