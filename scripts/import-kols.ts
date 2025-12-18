import { createClient } from "@supabase/supabase-js"
import { TwitterAPIClient } from "../lib/twitter-api"
import fs from "fs"
import path from "path"

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// Initialize Twitter API client
const twitterClient = new TwitterAPIClient(process.env.TWITTER_API_KEY!)

interface ImportResult {
  success: string[]
  failed: { username: string; error: string }[]
  skipped: string[]
}

async function importKOLs(): Promise<ImportResult> {
  const result: ImportResult = {
    success: [],
    failed: [],
    skipped: [],
  }

  // Read CSV file
  const csvPath = path.join(process.cwd(), "data", "kol-list.csv")
  const csvContent = fs.readFileSync(csvPath, "utf-8")

  // Parse usernames from CSV (clean up @ symbols, quotes, and whitespace)
  const usernames = csvContent
    .split("\n")
    .map((line) => line.trim().replace(/^["@]+|["]+$/g, "")) // Remove leading @/" and trailing "
    .filter((username) => username.length > 0)

  console.log(`[v0] Found ${usernames.length} usernames to import`)
  console.log("[v0] Usernames:", usernames)

  for (const username of usernames) {
    console.log(`[v0] Processing ${username}...`)

    try {
      // Check if KOL already exists
      const { data: existing } = await supabase.from("kols").select("id").eq("username", username).single()

      if (existing) {
        console.log(`[v0] ${username} already exists, skipping`)
        result.skipped.push(username)
        continue
      }

      // Fetch user data from Twitter API
      const userData = await twitterClient.getUserByUsername(username)

      if (!userData) {
        throw new Error("User not found or API error")
      }

      // Insert KOL into database
      const { error: insertError } = await supabase.from("kols").insert({
        twitter_id: userData.id,
        username: userData.username,
        display_name: userData.name,
        bio: userData.description || null,
        profile_image_url: userData.profile_image_url || null,
        followers_count: userData.public_metrics?.followers_count || 0,
        following_count: userData.public_metrics?.following_count || 0,
        tweet_count: userData.public_metrics?.tweet_count || 0,
        is_zombie: false,
      })

      if (insertError) {
        throw insertError
      }

      // Create initial snapshot
      const { data: kol } = await supabase.from("kols").select("id").eq("username", username).single()

      if (kol) {
        await supabase.from("snapshots").insert({
          kol_id: kol.id,
          followers_count: userData.public_metrics?.followers_count || 0,
          following_count: userData.public_metrics?.following_count || 0,
          tweet_count: userData.public_metrics?.tweet_count || 0,
        })
      }

      console.log(`[v0] ✓ Successfully imported ${username}`)
      result.success.push(username)

      // Add delay to avoid rate limiting (1 second between requests)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error(`[v0] ✗ Failed to import ${username}:`, errorMessage)
      result.failed.push({ username, error: errorMessage })
    }
  }

  return result
}

// Run the import
importKOLs()
  .then((result) => {
    console.log("\n=== Import Summary ===")
    console.log(`✓ Success: ${result.success.length}`)
    console.log(`⊘ Skipped: ${result.skipped.length}`)
    console.log(`✗ Failed: ${result.failed.length}`)

    if (result.failed.length > 0) {
      console.log("\nFailed imports:")
      result.failed.forEach(({ username, error }) => {
        console.log(`  - ${username}: ${error}`)
      })
    }

    process.exit(result.failed.length > 0 ? 1 : 0)
  })
  .catch((error) => {
    console.error("Import failed:", error)
    process.exit(1)
  })
