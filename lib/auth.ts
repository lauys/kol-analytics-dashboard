import { createServerClient } from "@/lib/supabase/server"

export interface UserProfile {
  id: string
  email: string
  role: "admin" | "user"
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // Silently handle refresh token errors - these are normal when sessions expire
    if (authError) {
      if (authError.code !== "refresh_token_not_found" && authError.status !== 400) {
        console.error("[v0] Auth error in getCurrentUser:", authError)
      }
      return null
    }

    if (!user) return null

    const { data: profile } = await supabase.from("profiles").select("id, email, role").eq("id", user.id).single()

    return profile
  } catch (error: any) {
    // Silently handle refresh token errors
    if (error?.code !== "refresh_token_not_found" && error?.status !== 400) {
      console.error("[v0] Unexpected error in getCurrentUser:", error)
    }
    return null
  }
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === "admin"
}

export async function requireAdmin() {
  const admin = await isAdmin()
  if (!admin) {
    throw new Error("Unauthorized: Admin access required")
  }
}
