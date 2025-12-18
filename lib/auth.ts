import { createServerClient } from "@/lib/supabase/server"

export interface UserProfile {
  id: string
  email: string
  role: "admin" | "user"
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase.from("profiles").select("id, email, role").eq("id", user.id).single()

  return profile
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
