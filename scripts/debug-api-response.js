// Debug script to see the full API response structure

const TWITTER_API_KEY = process.env.TWITTER_API_KEY

async function debugApiResponse() {
  const username = "whale_alert"

  console.log("[v0] ==========================================")
  console.log("[v0] Debugging API response for @" + username)
  console.log("[v0] ==========================================")

  const url = `https://twitter.good6.top/api/base/apitools/userByScreenNameV2?apiKey=${encodeURIComponent(TWITTER_API_KEY)}&screenName=${encodeURIComponent(username)}`

  console.log("[v0] Request URL:", url.replace(TWITTER_API_KEY, "***"))

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    })

    console.log("[v0] Status:", response.status, response.statusText)
    console.log("[v0] Content-Type:", response.headers.get("content-type"))

    const text = await response.text()
    console.log("[v0] Raw response length:", text.length, "chars")
    console.log("[v0] Raw response (first 2000 chars):")
    console.log(text.substring(0, 2000))

    // Try to parse as JSON
    try {
      const data = JSON.parse(text)
      console.log("\n[v0] ==========================================")
      console.log("[v0] Parsed JSON structure:")
      console.log("[v0] Top-level keys:", Object.keys(data))

      if (data.data) {
        console.log("[v0] data keys:", Object.keys(data.data))
        if (data.data.user) {
          console.log("[v0] data.user keys:", Object.keys(data.data.user))
          if (data.data.user.result) {
            console.log("[v0] data.user.result keys:", Object.keys(data.data.user.result))
            if (data.data.user.result.legacy) {
              console.log("[v0] data.user.result.legacy keys:", Object.keys(data.data.user.result.legacy))
              console.log("[v0] LEGACY DATA:", JSON.stringify(data.data.user.result.legacy, null, 2))
            }
            if (data.data.user.result.rest_id) {
              console.log("[v0] rest_id:", data.data.user.result.rest_id)
            }
          }
        }
      }

      // Print full structure
      console.log("\n[v0] ==========================================")
      console.log("[v0] Full JSON (pretty):")
      console.log(JSON.stringify(data, null, 2))
    } catch (e) {
      console.log("[v0] Failed to parse JSON:", e.message)
    }
  } catch (error) {
    console.error("[v0] Request failed:", error.message)
  }
}

debugApiResponse()
