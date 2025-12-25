"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, User, Shield } from "lucide-react"
import type { UserProfile } from "@/lib/types"

export function UserNav() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user: authUser },
          error: authError,
        } = await supabase.auth.getUser()

        // Silently handle refresh token errors - these are normal when sessions expire
        if (authError) {
          if (authError.code !== "refresh_token_not_found" && authError.status !== 400) {
            console.error("[v0] Auth error in UserNav:", authError)
          }
          return
        }

        if (authUser) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, email, role")
            .eq("id", authUser.id)
            .single()

          if (profile) {
            setUser(profile as UserProfile)
          }
        }
      } catch (error: any) {
        // Silently handle refresh token errors
        if (error?.code !== "refresh_token_not_found" && error?.status !== 400) {
          console.error("[v0] Unexpected error in UserNav:", error)
        }
      }
    }

    fetchUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  if (!user) {
    return (
      <Button variant="outline" onClick={() => router.push("/auth/login")}>
        Login
      </Button>
    )
  }

  const initials = user.email.split("@")[0].substring(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.email}</p>
            <p className="text-xs leading-none text-muted-foreground flex items-center gap-1">
              {user.role === "admin" ? (
                <>
                  <Shield className="h-3 w-3" /> Admin
                </>
              ) : (
                <>
                  <User className="h-3 w-3" /> User
                </>
              )}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
