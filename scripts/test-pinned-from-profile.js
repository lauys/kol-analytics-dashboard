const apiKey = process.env.TWITTER_API_KEY
const screenName = "CryptoGodJohn" // Example user

async function testPinnedTweetFromProfile() {
  console.log("[v0] Testing pinned tweet extraction from profile API")
  console.log("[v0] Using screen name:", screenName)

  const url = `https://twitter.good6.top/api/base/apitools/userByScreenNameV2?apiKey=${encodeURIComponent(apiKey)}&screenName=${screenName}`

  const response = await fetch(url)
  const data = await response.json()

  console.log("[v0] API Response code:", data.code)
  console.log("[v0] API Response msg:", data.msg)

  if (data.code === 1 && data.data) {
    const innerData = JSON.parse(data.data)
    console.log("\n[v0] ===== FULL USER DATA STRUCTURE =====")
    console.log(JSON.stringify(innerData, null, 2))

    console.log("\n[v0] ===== LOOKING FOR PINNED TWEET ID =====")
    const user = innerData?.data?.user

    // Check legacy object
    if (user?.result?.legacy) {
      console.log("[v0] legacy.pinned_tweet_ids_str:", user.result.legacy.pinned_tweet_ids_str)
    }

    // Check result directly
    if (user?.result) {
      console.log("[v0] result keys:", Object.keys(user.result))
      if (user.result.pinned_tweet_id) {
        console.log("[v0] ✓ Found pinned_tweet_id:", user.result.pinned_tweet_id)
      }
      if (user.result.pinned_tweet_ids_str) {
        console.log("[v0] ✓ Found pinned_tweet_ids_str:", user.result.pinned_tweet_ids_str)
      }
    }
  }
}

testPinnedTweetFromProfile().catch(console.error)
