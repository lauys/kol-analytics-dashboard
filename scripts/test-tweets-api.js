// Test script to verify Twitter tweets API
const TWITTER_API_KEY = process.env.TWITTER_API_KEY

if (!TWITTER_API_KEY) {
  console.log("[v0] Error: TWITTER_API_KEY environment variable is not set")
  process.exit(1)
}

console.log("[v0] Testing Twitter Tweets API")
console.log("[v0] API Key:", TWITTER_API_KEY.substring(0, 10) + "...")

async function testTweetsAPI() {
  const screenName = "whale_alert"
  const apiUrl = `https://twitter.good6.top/api/base/apitools/userTweetsV2?apiKey=${encodeURIComponent(TWITTER_API_KEY)}&screenName=${encodeURIComponent(screenName)}&count=20`

  console.log("[v0] Testing endpoint:", apiUrl.replace(TWITTER_API_KEY, "API_KEY"))

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    console.log("[v0] Response status:", response.status)
    console.log("[v0] Response headers:", Object.fromEntries(response.headers.entries()))

    const data = await response.json()
    console.log("[v0] Response data keys:", Object.keys(data))
    console.log("[v0] Response success:", data.success)

    // Parse nested data if it's a string
    let tweetsData = data.data
    if (typeof tweetsData === "string") {
      console.log("[v0] Data is a string, parsing...")
      tweetsData = JSON.parse(tweetsData)
    }

    console.log("[v0] Parsed data keys:", Object.keys(tweetsData || {}))
    console.log("[v0] Full response:", JSON.stringify(data, null, 2))

    // Navigate through the data structure
    const timeline = tweetsData?.data?.user?.result?.timeline_v2?.timeline
    console.log("[v0] Timeline found:", !!timeline)

    if (timeline) {
      console.log("[v0] Timeline instructions:", timeline.instructions?.length)
      const entries = timeline.instructions?.[1]?.entries || []
      console.log("[v0] Total entries:", entries.length)

      let tweetCount = 0
      let pinnedCount = 0

      for (const entry of entries) {
        if (entry.entryId?.startsWith("tweet-")) {
          tweetCount++
          const tweet = entry.content?.itemContent?.tweet_results?.result
          if (tweet && tweet.typename !== "TweetUnavailable") {
            const tweetData = tweet.legacy || tweet.tweet?.legacy
            if (tweetData) {
              console.log(`[v0] Tweet ${tweetCount}:`, {
                id: tweet.rest_id,
                text: tweetData.full_text?.slice(0, 50) + "...",
                likes: tweetData.favorite_count,
                retweets: tweetData.retweet_count,
                sortIndex: entry.sortIndex,
                isPinned: entry.sortIndex === "9223372036854775807",
              })

              if (entry.sortIndex === "9223372036854775807") {
                pinnedCount++
              }
            }
          }
        }
      }

      console.log("[v0] ✓ Successfully parsed tweets")
      console.log("[v0] Total tweets:", tweetCount)
      console.log("[v0] Pinned tweets:", pinnedCount)
    }
  } catch (error) {
    console.error("[v0] Error:", error.message)
  }
}

testTweetsAPI()
