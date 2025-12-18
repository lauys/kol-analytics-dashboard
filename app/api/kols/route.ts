import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get("search") || ""
    const filter = searchParams.get("filter") || "all"

    const supabase = await createServerClient()

    // Check if user is admin
    let isAdmin = false
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
      isAdmin = profile?.role === "admin"
    }

    // Build query with search and filter
    let query = supabase.from("leaderboard_24h").select("*")

    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase().trim()
      query = query.or(
        `twitter_username.ilike.%${searchLower}%,display_name.ilike.%${searchLower}%,bio.ilike.%${searchLower}%`
      )
    }

    // Filter out hidden KOLs for non-admin users
    if (!isAdmin) {
      query = query.eq("is_hidden", false)
    }

    // Apply status filter
    if (filter === "active") {
      query = query.eq("is_zombie", false)
    } else if (filter === "zombie") {
      query = query.eq("is_zombie", true)
    } else if (filter === "growing") {
      query = query.gt("followers_growth_rate_24h", 0)
    }

    const { data: leaderboardData, error: leaderboardError } = await query.order("latest_followers", {
      ascending: false,
    })

    if (!leaderboardError && leaderboardData && leaderboardData.length > 0) {
      return NextResponse.json(leaderboardData)
    }

    // Fallback: fetch directly from kols table with latest snapshot
    let fallbackQuery = supabase.from("kols").select(`
        id,
        username,
        twitter_username,
        twitter_id,
        twitter_user_id,
        display_name,
        profile_image_url,
        avatar_url,
        bio,
        is_zombie,
        is_hidden,
        followers_count,
        following_count,
        tweet_count
      `)

    // Filter out hidden KOLs for non-admin users
    if (!isAdmin) {
      fallbackQuery = fallbackQuery.eq("is_hidden", false)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase().trim()
      fallbackQuery = fallbackQuery.or(
        `username.ilike.%${searchLower}%,twitter_username.ilike.%${searchLower}%,display_name.ilike.%${searchLower}%,bio.ilike.%${searchLower}%`
      )
    }

    // Apply status filter
    if (filter === "active") {
      fallbackQuery = fallbackQuery.eq("is_zombie", false)
    } else if (filter === "zombie") {
      fallbackQuery = fallbackQuery.eq("is_zombie", true)
    }

    const { data: kols, error: kolsError } = await fallbackQuery.order("followers_count", { ascending: false })

    if (kolsError) {
      throw kolsError
    }

    // Transform to match expected format
    const transformedKols = (kols || []).map((kol) => ({
      id: kol.id,
      twitter_username: kol.username || kol.twitter_username,
      twitter_user_id: kol.twitter_id || kol.twitter_user_id,
      display_name: kol.display_name,
      avatar_url: kol.profile_image_url || kol.avatar_url,
      bio: kol.bio,
      is_zombie: kol.is_zombie,
      is_hidden: kol.is_hidden || false,
      latest_followers: kol.followers_count || 0,
      latest_following: kol.following_count || 0,
      latest_tweets: kol.tweet_count || 0,
      latest_time: null,
      followers_change_24h: 0,
      following_change_24h: 0,
      tweets_change_24h: 0,
      followers_growth_rate_24h: 0,
    }))

    return NextResponse.json(transformedKols)
  } catch (error) {
    console.error("[v0] Failed to fetch KOLs:", error)
    return NextResponse.json({ error: "Failed to fetch KOLs" }, { status: 500 })
  }
}
