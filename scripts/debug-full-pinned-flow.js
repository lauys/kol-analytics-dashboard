// Debug script to test the full pinned tweet collection flow
const TWITTER_API_KEY = process.env.TWITTER_API_KEY

if (!TWITTER_API_KEY) {
  console.error("❌ TWITTER_API_KEY not found in environment variables")
  process.exit(1)
}

const TEST_USERNAME = "vitalikbuterin" // Test with a known user

async function testFullFlow() {
  console.log("🔍 Testing Full Pinned Tweet Collection Flow\n")

  try {
    // Step 1: Get user profile to find pinned tweet ID
    console.log("Step 1: Fetching user profile...")
    const profileResponse = await fetch("https://twitter-api45.p.rapidapi.com/screenname.php", {
      method: "POST",
      headers: {
        "x-rapidapi-key": TWITTER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ screenname: TEST_USERNAME }),
    })

    if (!profileResponse.ok) {
      throw new Error(`Profile API failed: ${profileResponse.status}`)
    }

    const profileData = await profileResponse.json()
    console.log("✅ Profile fetched successfully")

    // Extract pinned tweet IDs
    const pinnedTweetIds = profileData?.legacy?.pinned_tweet_ids_str || []
    console.log(`📌 Pinned Tweet IDs: ${JSON.stringify(pinnedTweetIds)}`)
    console.log(`   Count: ${pinnedTweetIds.length}`)

    if (pinnedTweetIds.length === 0) {
      console.log("⚠️  No pinned tweets found in profile")
    }

    // Step 2: Get user tweets
    console.log("\nStep 2: Fetching user tweets...")
    const tweetsResponse = await fetch("https://twitter-api45.p.rapidapi.com/timeline.php", {
      method: "POST",
      headers: {
        "x-rapidapi-key": TWITTER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        screenname: TEST_USERNAME,
        count: "20",
      }),
    })

    if (!tweetsResponse.ok) {
      throw new Error(`Tweets API failed: ${tweetsResponse.status}`)
    }

    const tweetsData = await tweetsResponse.json()
    console.log("✅ Tweets fetched successfully")

    // Parse tweets from timeline
    const timeline = tweetsData?.timeline || {}
    const instructions = timeline.instructions || []

    console.log(`\nStep 3: Parsing tweets from timeline...`)
    console.log(`   Instructions count: ${instructions.length}`)

    const tweets = []
    for (const instruction of instructions) {
      if (instruction.type === "TimelineAddEntries") {
        const entries = instruction.entries || []
        console.log(`   Found ${entries.length} timeline entries`)

        for (const entry of entries) {
          const entryId = entry.entryId || ""
          if (entryId.includes("tweet-")) {
            const content = entry.content
            const itemContent = content?.itemContent
            const tweetResults = itemContent?.tweet_results?.result

            if (tweetResults && tweetResults.rest_id) {
              const tweetId = tweetResults.rest_id
              const legacy = tweetResults.legacy || {}

              // Check if this tweet is pinned
              const isPinned = pinnedTweetIds.includes(tweetId)

              tweets.push({
                tweet_id: tweetId,
                text: legacy.full_text?.substring(0, 60) + "...",
                likes: legacy.favorite_count || 0,
                is_pinned: isPinned,
                pinned_indicator: isPinned ? "📌 PINNED" : "",
              })
            }
          }
        }
      }
    }

    console.log(`\nStep 4: Analysis Results`)
    console.log(`   Total tweets found: ${tweets.length}`)
    console.log(`   Pinned tweets: ${tweets.filter((t) => t.is_pinned).length}`)

    console.log("\n📊 Tweet List:")
    tweets.forEach((tweet, i) => {
      console.log(`   ${i + 1}. ${tweet.pinned_indicator} ID: ${tweet.tweet_id}`)
      console.log(`      Text: ${tweet.text}`)
      console.log(`      Likes: ${tweet.likes}`)
      console.log(`      Is Pinned: ${tweet.is_pinned}`)
      console.log("")
    })

    // Step 5: Verify matching logic
    console.log("Step 5: Testing ID matching logic...")
    if (pinnedTweetIds.length > 0) {
      const pinnedId = pinnedTweetIds[0]
      const tweetIds = tweets.map((t) => t.tweet_id)

      console.log(`   Pinned ID to find: "${pinnedId}" (type: ${typeof pinnedId})`)
      console.log(`   Tweet IDs in list: ${JSON.stringify(tweetIds.slice(0, 3))}...`)
      console.log(`   First tweet ID type: ${typeof tweetIds[0]}`)

      const found = tweetIds.includes(pinnedId)
      const foundStrict = tweetIds.some((id) => id === pinnedId)
      const foundLoose = tweetIds.some((id) => String(id) === String(pinnedId))

      console.log(`   Array.includes() result: ${found}`)
      console.log(`   Strict equality (===) result: ${foundStrict}`)
      console.log(`   String comparison result: ${foundLoose}`)
    }
  } catch (error) {
    console.error("❌ Error during test:", error.message)
    console.error(error)
  }
}

testFullFlow()
