// Debug script to inspect the exact structure of pinned tweets from Twitter API
import fetch from "node-fetch"

const API_KEY = process.env.TWITTER_API_KEY
const TEST_USER_ID = "1039833297751302144" // whale_alert as example

async function debugPinnedTweet() {
  console.log("=".repeat(80))
  console.log("DEBUGGING PINNED TWEET STRUCTURE")
  console.log("=".repeat(80))

  if (!API_KEY) {
    console.error("❌ TWITTER_API_KEY not found in environment")
    return
  }

  console.log("✓ API Key found")
  console.log("✓ Testing with user ID:", TEST_USER_ID)

  const apiUrl = `https://twitter.good6.top/api/base/apitools/userTweetsV2?apiKey=${encodeURIComponent(API_KEY)}&userId=${encodeURIComponent(TEST_USER_ID)}&count=20`

  console.log("\n📡 Calling Twitter API...\n")

  const response = await fetch(apiUrl)
  const data = await response.json()

  if (data.code !== 1) {
    console.error("❌ API Error:", data.msg)
    return
  }

  let tweetsData = data.data
  if (typeof tweetsData === "string") {
    tweetsData = JSON.parse(tweetsData)
  }

  const timeline = tweetsData?.data?.user?.result?.timeline_v2?.timeline
  const instructions = timeline?.instructions || []

  console.log("\n📊 TIMELINE STRUCTURE:")
  console.log("─".repeat(80))
  console.log("Total instructions:", instructions.length)
  console.log("Instruction types:", instructions.map((i) => i.type).join(", "))

  // Find TimelinePinEntry
  const pinEntry = instructions.find((i) => i.type === "TimelinePinEntry")

  if (pinEntry) {
    console.log("\n✓ Found TimelinePinEntry!")
    console.log("─".repeat(80))
    console.log("\n📝 FULL TimelinePinEntry STRUCTURE:\n")
    console.log(JSON.stringify(pinEntry, null, 2))
    console.log("\n─".repeat(80))

    // Try to extract tweet ID using all possible paths
    console.log("\n🔍 EXTRACTION ATTEMPTS:")
    console.log("─".repeat(80))

    const paths = [
      { name: "entry.entryId", value: pinEntry.entry?.entryId },
      { name: "entry.content.entryType", value: pinEntry.entry?.content?.entryType },
      { name: "entry.content.itemContent", value: !!pinEntry.entry?.content?.itemContent },
      { name: "entry.content.itemContent.tweet_results", value: !!pinEntry.entry?.content?.itemContent?.tweet_results },
      {
        name: "entry.content.itemContent.tweet_results.result",
        value: !!pinEntry.entry?.content?.itemContent?.tweet_results?.result,
      },
      {
        name: "entry.content.itemContent.tweet_results.result.rest_id",
        value: pinEntry.entry?.content?.itemContent?.tweet_results?.result?.rest_id,
      },
      { name: "entry.content.item.itemContent", value: !!pinEntry.entry?.content?.item?.itemContent },
    ]

    paths.forEach((p) => {
      console.log(`  ${p.name}:`, p.value)
    })

    // Try regex extraction from entryId
    if (pinEntry.entry?.entryId) {
      const match = pinEntry.entry.entryId.match(/(\d{15,})/)
      if (match) {
        console.log("\n✓ Extracted Tweet ID from entryId regex:", match[1])
      }
    }
  } else {
    console.log("\n❌ No TimelinePinEntry found in instructions")
  }

  // Also check TimelineAddEntries for pinned tweets
  const addEntries = instructions.find((i) => i.type === "TimelineAddEntries")
  if (addEntries?.entries) {
    console.log("\n\n📋 CHECKING TimelineAddEntries:")
    console.log("─".repeat(80))
    console.log("Total entries:", addEntries.entries.length)

    const firstFewEntries = addEntries.entries.slice(0, 3)
    firstFewEntries.forEach((entry, idx) => {
      console.log(`\nEntry ${idx + 1}:`)
      console.log("  entryId:", entry.entryId)
      console.log("  sortIndex:", entry.sortIndex)
      console.log("  content.entryType:", entry.content?.entryType)

      if (entry.entryId?.includes("profile-conversation")) {
        console.log("  ⭐ This is a profile-conversation entry (likely pinned!)")
      }

      if (entry.sortIndex === "9223372036854775807") {
        console.log("  ⭐ This has max sortIndex (likely pinned!)")
      }
    })
  }

  // Check profile pinned_tweet_ids_str
  const pinnedIds = tweetsData?.data?.user?.result?.legacy?.pinned_tweet_ids_str || []
  console.log("\n\n📌 PROFILE PINNED_TWEET_IDS_STR:", pinnedIds)

  console.log("\n" + "=".repeat(80))
  console.log("DEBUG COMPLETE")
  console.log("=".repeat(80))
}

debugPinnedTweet().catch(console.error)
