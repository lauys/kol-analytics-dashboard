// Test script to verify Twitter API connectivity
// Based on utools.readme.io documentation

const TWITTER_API_KEY = process.env.TWITTER_API_KEY
const AUTH_TOKEN = "a92092aede379b215b1739d9d3df9fa2ff2549c2"

async function testEndpoint(name, url, method = "GET", headers = {}) {
  console.log(`\n[v0] Testing: ${name}`)
  console.log(`[v0] Method: ${method}`)
  console.log(`[v0] URL: ${url}`)

  try {
    const options = {
      method,
      headers: {
        accept: "*/*",
        ...headers,
      },
    }

    const response = await fetch(url, options)

    console.log(`[v0] Status: ${response.status} ${response.statusText}`)
    console.log(`[v0] Content-Type: ${response.headers.get("content-type")}`)

    const text = await response.text()

    // Only show first 500 chars if HTML
    if (text.startsWith("<")) {
      console.log(`[v0] Response (HTML): ${text.substring(0, 200)}...`)
      return { success: false, isJson: false }
    }

    try {
      const data = JSON.parse(text)
      console.log(`[v0] ✓ Got JSON response:`)
      console.log(JSON.stringify(data, null, 2).substring(0, 1500))
      return { success: response.ok, isJson: true, data }
    } catch (e) {
      console.log(`[v0] Response (non-JSON): ${text.substring(0, 500)}`)
      return { success: false, isJson: false }
    }
  } catch (error) {
    console.log(`[v0] ✗ Error: ${error.message}`)
    return { success: false, isJson: false }
  }
}

async function runTests() {
  console.log("[v0] ==========================================")
  console.log("[v0] Testing Twitter API (utools) connectivity")
  console.log("[v0] ==========================================")
  console.log("[v0] API Key:", TWITTER_API_KEY ? `Found (${TWITTER_API_KEY.substring(0, 8)}...)` : "Missing ✗")
  console.log("[v0] Auth Token:", AUTH_TOKEN ? `Found (${AUTH_TOKEN.substring(0, 8)}...)` : "Missing ✗")

  if (!TWITTER_API_KEY) {
    console.error("[v0] ERROR: TWITTER_API_KEY environment variable is not set")
    console.error("[v0] Please add it in the Vars panel")
    process.exit(1)
  }

  const testUsername = "whale_alert"
  const apiKey = encodeURIComponent(TWITTER_API_KEY)
  const authToken = encodeURIComponent(AUTH_TOKEN)

  // Based on utools.readme.io documentation
  const tests = [
    // From documentation: /api/base/apitools/userByScreenNameV2
    {
      name: "Doc Format 1: userByScreenNameV2 (GET with screenName)",
      url: `https://twitter.good6.top/api/base/apitools/userByScreenNameV2?apiKey=${apiKey}&screenName=${testUsername}`,
      method: "GET",
    },
    {
      name: "Doc Format 2: userByScreenNameV2 with auth_token",
      url: `https://twitter.good6.top/api/base/apitools/userByScreenNameV2?apiKey=${apiKey}&screenName=${testUsername}&auth_token=${authToken}`,
      method: "GET",
    },
    {
      name: "Doc Format 3: userByScreenNameV2 (POST)",
      url: `https://twitter.good6.top/api/base/apitools/userByScreenNameV2?apiKey=${apiKey}&screenName=${testUsername}`,
      method: "POST",
    },
    // From documentation: getUserByIdOrNameLookup
    {
      name: "Doc Format 4: getUserByIdOrNameLookup with username",
      url: `https://twitter.good6.top/api/base/apitools/getUserByIdOrNameLookup?apiKey=${apiKey}&username=${testUsername}`,
      method: "GET",
    },
    {
      name: "Doc Format 5: getUserByIdOrNameLookup with screenName",
      url: `https://twitter.good6.top/api/base/apitools/getUserByIdOrNameLookup?apiKey=${apiKey}&screenName=${testUsername}`,
      method: "GET",
    },
    // userTimeline endpoint (from documentation curl example)
    {
      name: "Doc Format 6: userTimeline with userId (POST)",
      url: `https://twitter.good6.top/api/base/apitools/userTimeline?apiKey=${apiKey}&userId=1574242047661207552`,
      method: "POST",
    },
    // Try different parameter names
    {
      name: "Doc Format 7: userByScreenNameV2 with screen_name",
      url: `https://twitter.good6.top/api/base/apitools/userByScreenNameV2?apiKey=${apiKey}&screen_name=${testUsername}`,
      method: "GET",
    },
    {
      name: "Doc Format 8: userByScreenNameV2 with name",
      url: `https://twitter.good6.top/api/base/apitools/userByScreenNameV2?apiKey=${apiKey}&name=${testUsername}`,
      method: "GET",
    },
    // Try getUserByIdOrNameShow (deprecated but might work)
    {
      name: "Doc Format 9: getUserByIdOrNameShow",
      url: `https://twitter.good6.top/api/base/apitools/getUserByIdOrNameShow?apiKey=${apiKey}&screenName=${testUsername}`,
      method: "GET",
    },
    // Try different base paths
    {
      name: "Doc Format 10: /base/apitools/userByScreenName (no V2)",
      url: `https://twitter.good6.top/api/base/apitools/userByScreenName?apiKey=${apiKey}&screenName=${testUsername}`,
      method: "GET",
    },
    {
      name: "Doc Format 11: /base/apitools/user with screenName",
      url: `https://twitter.good6.top/api/base/apitools/user?apiKey=${apiKey}&screenName=${testUsername}`,
      method: "GET",
    },
    // Try with auth_token in different positions
    {
      name: "Doc Format 12: userByScreenNameV2 with all params",
      url: `https://twitter.good6.top/api/base/apitools/userByScreenNameV2?apiKey=${apiKey}&screenName=${testUsername}&auth_token=${authToken}&resFormat=json`,
      method: "POST",
    },
  ]

  let foundWorking = false

  for (const test of tests) {
    const result = await testEndpoint(test.name, test.url, test.method, test.headers)

    if (result.isJson && result.success) {
      console.log("\n[v0] ========================================")
      console.log("[v0] ✓✓✓ FOUND WORKING API FORMAT! ✓✓✓")
      console.log("[v0] ========================================")
      console.log(`[v0] Use this format: ${test.name}`)
      console.log(`[v0] URL: ${test.url}`)
      console.log(`[v0] Method: ${test.method}`)
      foundWorking = true
      break
    }

    // If we got JSON but with error, note it
    if (result.isJson) {
      console.log("[v0] → Got JSON response (check if it contains useful data)")
    }

    // Wait between requests
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  if (!foundWorking) {
    console.log("\n[v0] ========================================")
    console.log("[v0] No fully working format found yet")
    console.log("[v0] Check the JSON responses above for clues")
    console.log("[v0] ========================================")
  }

  console.log("\n[v0] Test completed.")
}

runTests()
