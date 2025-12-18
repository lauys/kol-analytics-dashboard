const apiKey = process.env.TWITTER_API_KEY
const userId = "935742315389444096" // CryptoWendyO

if (!apiKey) {
  console.error("❌ Missing TWITTER_API_KEY environment variable")
  process.exit(1)
}

console.log("[v0] Testing Twitter API for pinned tweet detection")
console.log("[v0] User ID:", userId)

const apiUrl = `https://twitter.good6.top/api/base/apitools/userTweetsV2?apiKey=${encodeURIComponent(apiKey)}&userId=${encodeURIComponent(userId)}&count=20`

fetch(apiUrl)
  .then((res) => res.json())
  .then((data) => {
    if (data.code !== 1) {
      console.error("❌ API Error:", data.msg)
      return
    }

    const tweetsData = typeof data.data === "string" ? JSON.parse(data.data) : data.data

    const timeline = tweetsData?.data?.user?.result?.timeline_v2?.timeline
    const instructions = timeline?.instructions || []

    console.log("\n=== INSTRUCTIONS ===")
    instructions.forEach((inst, idx) => {
      console.log(`\n[${idx}] Type: ${inst.type}`)
      if (inst.type === "TimelinePinEntry") {
        console.log("📌 PINNED TWEET INSTRUCTION FOUND!")
        console.log("Full structure:", JSON.stringify(inst, null, 2))
      }
    })

    console.log("\n=== USER LEGACY DATA ===")
    const userLegacy = tweetsData?.data?.user?.result?.legacy
    if (userLegacy) {
      console.log("pinned_tweet_ids_str:", userLegacy.pinned_tweet_ids_str)
      console.log("All keys:", Object.keys(userLegacy))
    }
  })
  .catch((err) => {
    console.error("❌ Fetch error:", err)
  })
