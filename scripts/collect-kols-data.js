// Standalone script to collect KOL data from Twitter API and save to Supabase
// This script reads the KOL list and fetches real Twitter data

const TWITTER_API_KEY = process.env.TWITTER_API_KEY
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// KOL usernames from the CSV
const KOL_USERNAMES = [
  "whale_alert",
  "WatcherGuru",
  "tier10k",
  "CryptoRank_io",
  "BabyDogeCoin",
  "AltcoinGordon",
  "CryptoBusy",
  "TraderKoz",
  "CryptoBull",
  "KookCapitalLLC",
  "CryptoGodJohn",
  "AltcoinSara",
  "TheCryptoDog",
  "CryptoWendyO",
  "CryptoKaleo",
  "TechDev_52",
  "CryptoCobain",
  "TheWolfOfAllStreets",
  "IvanOnTech",
  "Davincij15",
]

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchTwitterUser(username) {
  console.log(`[v0] Fetching data for @${username}...`)

  const url = `https://twitter.good6.top/api/base/apitools/userByScreenNameV2?apiKey=${encodeURIComponent(TWITTER_API_KEY)}&screenName=${encodeURIComponent(username)}`

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const apiResponse = await response.json()
    console.log(`[v0] API response code: ${apiResponse.code}, msg: ${apiResponse.msg}`)

    if (apiResponse.code !== 1 || !apiResponse.data) {
      throw new Error(`API error: ${apiResponse.msg || "Unknown error"}`)
    }

    // Parse the nested JSON string
    let innerData
    if (typeof apiResponse.data === "string") {
      innerData = JSON.parse(apiResponse.data)
    } else {
      innerData = apiResponse.data
    }

    // Navigate to the actual user data
    const userResult = innerData?.data?.user?.result
    if (!userResult) {
      throw new Error("No user result in response")
    }

    const legacy = userResult.legacy
    if (!legacy) {
      throw new Error("No legacy data in response")
    }

    const result = {
      twitter_id: userResult.rest_id || legacy.id_str || String(Date.now()),
      twitter_user_id: userResult.rest_id || legacy.id_str || String(Date.now()),
      twitter_username: legacy.screen_name || username,
      username: legacy.screen_name || username,
      display_name: legacy.name || username,
      bio: legacy.description || "",
      followers_count: Number.parseInt(legacy.followers_count || 0, 10),
      following_count: Number.parseInt(legacy.friends_count || 0, 10),
      tweet_count: Number.parseInt(legacy.statuses_count || 0, 10),
      avatar_url: (legacy.profile_image_url_https || "").replace("_normal", "_400x400"),
      profile_image_url: (legacy.profile_image_url_https || "").replace("_normal", "_400x400"),
    }

    console.log(`[v0] ✓ Parsed @${username}: ${result.followers_count} followers, ${result.following_count} following`)
    return result
  } catch (error) {
    console.error(`[v0] Failed to fetch @${username}:`, error.message)
    throw error
  }
}

async function saveKOLToDatabase(kolData) {
  console.log(`[v0] Saving @${kolData.twitter_username} to database...`)

  // Check if KOL already exists by twitter_id or twitter_user_id
  const checkUrl = `${SUPABASE_URL}/rest/v1/kols?or=(twitter_id.eq.${kolData.twitter_id},twitter_user_id.eq.${kolData.twitter_user_id})&select=id`
  const checkResponse = await fetch(checkUrl, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })

  const existing = await checkResponse.json()

  if (existing && existing.length > 0) {
    console.log(`[v0] @${kolData.twitter_username} already exists, updating...`)

    const updateUrl = `${SUPABASE_URL}/rest/v1/kols?id=eq.${existing[0].id}`
    const updateResponse = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        display_name: kolData.display_name,
        bio: kolData.bio,
        followers_count: kolData.followers_count,
        following_count: kolData.following_count,
        tweet_count: kolData.tweet_count,
        avatar_url: kolData.avatar_url,
        profile_image_url: kolData.profile_image_url,
        updated_at: new Date().toISOString(),
      }),
    })

    if (!updateResponse.ok) {
      const error = await updateResponse.text()
      console.error(`[v0] Update failed: ${error}`)
    }

    // Create new snapshot for historical tracking
    await createSnapshot(existing[0].id, kolData)

    return { updated: true, id: existing[0].id }
  }

  const insertUrl = `${SUPABASE_URL}/rest/v1/kols`
  const insertBody = {
    twitter_id: kolData.twitter_id,
    twitter_user_id: kolData.twitter_user_id,
    twitter_username: kolData.twitter_username,
    username: kolData.username,
    display_name: kolData.display_name,
    bio: kolData.bio,
    followers_count: kolData.followers_count,
    following_count: kolData.following_count,
    tweet_count: kolData.tweet_count,
    avatar_url: kolData.avatar_url,
    profile_image_url: kolData.profile_image_url,
    is_zombie: false,
  }

  console.log(`[v0] Inserting KOL data:`, JSON.stringify(insertBody, null, 2))

  const insertResponse = await fetch(insertUrl, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(insertBody),
  })

  if (!insertResponse.ok) {
    const error = await insertResponse.text()
    throw new Error(`Failed to insert: ${error}`)
  }

  const inserted = await insertResponse.json()
  const kolId = inserted[0].id
  console.log(`[v0] ✓ Inserted KOL with ID: ${kolId}`)

  // Create initial snapshot
  await createSnapshot(kolId, kolData)

  return { inserted: true, id: kolId }
}

async function createSnapshot(kolId, kolData) {
  const snapshotUrl = `${SUPABASE_URL}/rest/v1/snapshots`
  const snapshotBody = {
    kol_id: kolId,
    followers_count: kolData.followers_count,
    following_count: kolData.following_count,
    tweet_count: kolData.tweet_count,
  }

  console.log(`[v0] Creating snapshot for KOL ${kolId}`)

  const snapshotResponse = await fetch(snapshotUrl, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(snapshotBody),
  })

  if (!snapshotResponse.ok) {
    const error = await snapshotResponse.text()
    console.error(`[v0] Failed to create snapshot: ${error}`)
  } else {
    console.log(`[v0] ✓ Snapshot created`)
  }
}

async function main() {
  console.log("[v0] ==========================================")
  console.log("[v0] Starting KOL data collection...")
  console.log("[v0] ==========================================")
  console.log(`[v0] API Key: ${TWITTER_API_KEY ? "Found" : "MISSING!"}`)
  console.log(`[v0] Supabase URL: ${SUPABASE_URL ? "Found" : "MISSING!"}`)
  console.log(`[v0] Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY ? "Found" : "MISSING!"}`)
  console.log(`[v0] Total KOLs to process: ${KOL_USERNAMES.length}`)
  console.log("[v0] ==========================================\n")

  if (!TWITTER_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[v0] Missing required environment variables!")
    return
  }

  let insertCount = 0
  let updateCount = 0
  let failCount = 0

  for (let i = 0; i < KOL_USERNAMES.length; i++) {
    const username = KOL_USERNAMES[i]
    console.log(`\n[v0] [${i + 1}/${KOL_USERNAMES.length}] Processing @${username}...`)

    try {
      const userData = await fetchTwitterUser(username)
      const result = await saveKOLToDatabase(userData)

      if (result.inserted) {
        insertCount++
      } else if (result.updated) {
        updateCount++
      }

      console.log(`[v0] Waiting 1.5s before next request...`)
      await sleep(1500)
    } catch (error) {
      console.error(`[v0] ✗ Failed to process @${username}:`, error.message)
      failCount++
      // Still add delay even on failure
      await sleep(1000)
    }
  }

  console.log("\n[v0] ==========================================")
  console.log("[v0] Collection complete!")
  console.log(`[v0] Inserted: ${insertCount}`)
  console.log(`[v0] Updated: ${updateCount}`)
  console.log(`[v0] Failed: ${failCount}`)
  console.log(`[v0] Total: ${KOL_USERNAMES.length}`)
  console.log("[v0] ==========================================")
}

main().catch(console.error)
