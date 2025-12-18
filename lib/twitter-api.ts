/**
 * Twitter API Client using utools service
 * Documentation: https://utools.readme.io/reference/getting-started-with-your-api-2
 */

interface TwitterUserData {
  id: string
  username: string
  name: string
  description?: string
  followers_count: number
  following_count: number
  tweet_count: number
  profile_image_url?: string
  verified?: boolean
  public_metrics?: {
    followers_count: number
    following_count: number
    tweet_count: number
  }
}

// 使用 twitter.good6.top 作为主要 API 端点（与项目中其他部分保持一致）
const API_BASE_URL = "https://twitter.good6.top/api"
// 备用端点（如果主要端点失败可以尝试）
const API_BASE_URL_FALLBACK = "https://twitter.utools.me/api"

export class TwitterAPIClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Fetch Twitter user by username with retry mechanism
   */
  async getUserByUsername(username: string, retries = 3): Promise<TwitterUserData | null> {
    // Clean username
    const cleanUsername = username.replace(/^@/, "").trim()

    // 验证 API Key
    if (!this.apiKey || this.apiKey.trim() === "") {
      console.error(`[v0] Twitter API Key is missing or empty`)
      return null
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Create AbortController for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 seconds timeout

        // 尝试使用 twitter.good6.top 的 API 格式（与项目中其他部分保持一致）
        const apiKeyParam = encodeURIComponent(this.apiKey)
        const screenNameParam = encodeURIComponent(cleanUsername)
        let url = `${API_BASE_URL}/base/apitools/userByScreenNameV2?apiKey=${apiKeyParam}&screenName=${screenNameParam}`
        let useFallback = false

        console.log(`[v0] Attempting to fetch ${username} from: ${API_BASE_URL} (attempt ${attempt}/${retries})`)

        let response: Response
        try {
          response = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            signal: controller.signal,
          })
        } catch (fetchError: any) {
          // 如果主要端点失败，尝试备用端点
          if (attempt === 1 && (fetchError.code === "UND_ERR_CONNECT_TIMEOUT" || fetchError.message?.includes("fetch failed"))) {
            console.log(`[v0] Primary endpoint failed, trying fallback: ${API_BASE_URL_FALLBACK}`)
            useFallback = true
            url = `${API_BASE_URL_FALLBACK}/base/apitools/userByScreenName?username=${cleanUsername}`
            response = await fetch(url, {
              method: "GET",
              headers: {
                apiKey: this.apiKey,
                "Content-Type": "application/json",
              },
              signal: controller.signal,
            })
          } else {
            throw fetchError
          }
        }

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text()
          console.error(
            `[v0] Twitter API error for ${username} (attempt ${attempt}/${retries}, endpoint: ${useFallback ? "fallback" : "primary"}): ${response.status} - ${errorText}`,
          )

          // If it's a server error (5xx) or rate limit (429), retry
          if ((response.status >= 500 || response.status === 429) && attempt < retries) {
            const delay = attempt * 2000 // Exponential backoff: 2s, 4s, 6s
            console.log(`[v0] Retrying ${username} after ${delay}ms...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }

          return null
        }

        const result = await response.json()

        // Handle API response structure
        let data: any = null
        let userResult: any = null
        let legacy: any = null

        if (useFallback) {
          // 备用端点格式：result.data || result
          data = result.data || result
          if (!data || (!data.id && !data.id_str && !data.rest_id)) {
            console.error(`[v0] No user data found for ${username} (fallback endpoint)`)
            console.error(`[v0] Response structure:`, JSON.stringify(result).substring(0, 500))
            return null
          }
        } else {
          // twitter.good6.top 格式：{ code: 1, data: "JSON字符串", msg: "success" }
          if (result.code !== 1 || !result.data) {
            console.error(`[v0] API error for ${username}: code=${result.code}, msg=${result.msg || "No message"}`)
            return null
          }

          // data 字段可能是 JSON 字符串，需要解析
          let innerData: any
          if (typeof result.data === "string") {
            try {
              innerData = JSON.parse(result.data)
            } catch (parseError) {
              console.error(`[v0] Failed to parse API response data for ${username}:`, parseError)
              return null
            }
          } else {
            innerData = result.data
          }

          // 导航到实际的用户数据：innerData.data.user.result.legacy
          userResult = innerData?.data?.user?.result
          legacy = userResult?.legacy

          if (!userResult || !legacy) {
            console.error(`[v0] No user data found for ${username}`)
            console.error(`[v0] Response structure keys:`, Object.keys(innerData || {}))
            if (innerData?.data) {
              console.error(`[v0] data keys:`, Object.keys(innerData.data || {}))
            }
            if (innerData?.data?.user) {
              console.error(`[v0] user keys:`, Object.keys(innerData.data.user || {}))
            }
            return null
          }

          data = legacy
        }

        // 提取用户信息
        const twitterUserId = useFallback
          ? data.rest_id || data.id_str || data.id || ""
          : userResult.rest_id || userResult.id_str || userResult.id || ""

        if (!twitterUserId) {
          console.error(`[v0] No Twitter user ID found for ${username}`)
          return null
        }

        return {
          id: twitterUserId,
          username: data.screen_name || cleanUsername,
          name: data.name || cleanUsername,
          description: data.description || null,
          followers_count: data.followers_count || 0,
          following_count: data.friends_count || 0,
          tweet_count: data.statuses_count || 0,
          profile_image_url: data.profile_image_url_https || data.profile_image_url || null,
          verified: data.verified || false,
          public_metrics: {
            followers_count: data.followers_count || 0,
            following_count: data.friends_count || 0,
            tweet_count: data.statuses_count || 0,
          },
        }
      } catch (error: any) {
        const isTimeout = error.name === "AbortError" || error.code === "UND_ERR_CONNECT_TIMEOUT"
        const isConnectionError =
          error.code === "UND_ERR_CONNECT_TIMEOUT" ||
          error.code === "ECONNREFUSED" ||
          error.code === "ENOTFOUND" ||
          error.message?.includes("fetch failed") ||
          error.message?.includes("network") ||
          error.cause?.code === "UND_ERR_CONNECT_TIMEOUT"

        // 构建详细的错误信息
        const errorDetails: string[] = []
        errorDetails.push(`Message: ${error.message || "Unknown error"}`)
        if (error.code) errorDetails.push(`Code: ${error.code}`)
        if (error.name) errorDetails.push(`Name: ${error.name}`)
        if (error.cause) {
          errorDetails.push(`Cause: ${JSON.stringify(error.cause)}`)
        }
        const errorMessage = errorDetails.join(", ")

        if (isTimeout) {
          console.error(
            `[v0] Timeout fetching Twitter data for ${username} (attempt ${attempt}/${retries}): ${errorMessage}`,
          )
        } else if (isConnectionError) {
          console.error(
            `[v0] Connection error fetching Twitter data for ${username} (attempt ${attempt}/${retries}): ${errorMessage}`,
          )
        } else {
          console.error(
            `[v0] Failed to fetch Twitter data for ${username} (attempt ${attempt}/${retries}): ${errorMessage}`,
          )
        }

        // Retry on timeout or connection errors
        if (attempt < retries && (isTimeout || isConnectionError)) {
          const delay = attempt * 2000 // Exponential backoff: 2s, 4s, 6s
          console.log(
            `[v0] Retrying ${username} after ${delay}ms due to ${isTimeout ? "timeout" : "connection error"}...`,
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        // Last attempt failed
        if (attempt === retries) {
          console.error(
            `[v0] All retry attempts failed for ${username}. Error details: ${errorMessage}`,
          )
          return null
        }
      }
    }

    return null
  }

  /**
   * Fetch Twitter user by ID with retry mechanism
   */
  async getUserById(userId: string, retries = 3): Promise<TwitterUserData | null> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Create AbortController for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 seconds timeout

        const response = await fetch(`${API_BASE_URL}/base/apitools/userByRestId?userId=${userId}`, {
          method: "GET",
          headers: {
            apiKey: this.apiKey,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text()
          console.error(
            `[v0] Twitter API error for user ID ${userId} (attempt ${attempt}/${retries}): ${response.status} - ${errorText}`,
          )

          // If it's a server error (5xx) or rate limit (429), retry
          if ((response.status >= 500 || response.status === 429) && attempt < retries) {
            const delay = attempt * 2000 // Exponential backoff: 2s, 4s, 6s
            console.log(`[v0] Retrying user ID ${userId} after ${delay}ms...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }

          return null
        }

        const result = await response.json()
        const data = result.data || result

        if (!data || (!data.id && !data.id_str && !data.rest_id)) {
          console.error(`[v0] No user data found for user ID ${userId}`)
          return null
        }

        return {
          id: data.rest_id || data.id_str || data.id || userId,
          username: data.screen_name || data.legacy?.screen_name || "",
          name: data.name || data.legacy?.name || "",
          description: data.description || data.legacy?.description,
          followers_count: data.followers_count || data.legacy?.followers_count || 0,
          following_count: data.friends_count || data.legacy?.friends_count || 0,
          tweet_count: data.statuses_count || data.legacy?.statuses_count || 0,
          profile_image_url:
            data.profile_image_url_https || data.legacy?.profile_image_url_https || data.profile_image_url,
          verified: data.verified || data.legacy?.verified || false,
          public_metrics: {
            followers_count: data.followers_count || data.legacy?.followers_count || 0,
            following_count: data.friends_count || data.legacy?.friends_count || 0,
            tweet_count: data.statuses_count || data.legacy?.statuses_count || 0,
          },
        }
      } catch (error: any) {
        const isTimeout = error.name === "AbortError" || error.code === "UND_ERR_CONNECT_TIMEOUT"
        const errorMessage = error instanceof Error ? error.message : "Unknown error"

        if (isTimeout) {
          console.error(
            `[v0] Timeout fetching Twitter data for user ID ${userId} (attempt ${attempt}/${retries}): ${errorMessage}`,
          )
        } else {
          console.error(
            `[v0] Failed to fetch Twitter data for user ID ${userId} (attempt ${attempt}/${retries}): ${errorMessage}`,
          )
        }

        // Retry on timeout or connection errors
        if (attempt < retries && (isTimeout || error.code === "UND_ERR_CONNECT_TIMEOUT")) {
          const delay = attempt * 2000 // Exponential backoff: 2s, 4s, 6s
          console.log(
            `[v0] Retrying user ID ${userId} after ${delay}ms due to ${isTimeout ? "timeout" : "connection error"}...`,
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        // Last attempt failed
        if (attempt === retries) {
          return null
        }
      }
    }

    return null
  }

  /**
   * Fetch tweets for a user by their numeric user ID
   */
  async fetchUserTweets(userId: string, count = 20) {
    try {
      const url = `https://twitter.good6.top/api/base/apitools/userTweetsV2?apiKey=${encodeURIComponent(this.apiKey)}&userId=${encodeURIComponent(userId)}&count=${count}`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const apiResponse = await response.json()

      if (apiResponse.code !== 1 || !apiResponse.data) {
        throw new Error(`API error: ${apiResponse.msg || "Unknown error"}`)
      }

      // Parse nested JSON if needed
      let tweetsData = apiResponse.data
      if (typeof tweetsData === "string") {
        tweetsData = JSON.parse(tweetsData)
      }

      return tweetsData
    } catch (error) {
      console.error(`[v0] Failed to fetch tweets for user ID ${userId}:`, error)
      throw error
    }
  }
}

// Legacy function exports for backward compatibility
export async function fetchTwitterUserByUsername(username: string): Promise<TwitterUserData> {
  const apiKey = process.env.TWITTER_API_KEY

  if (!apiKey) {
    throw new Error("TWITTER_API_KEY environment variable is not set")
  }

  const client = new TwitterAPIClient(apiKey)
  const data = await client.getUserByUsername(username)

  if (!data) {
    throw new Error(`Failed to fetch user data for ${username}`)
  }

  return data
}

export async function fetchTwitterUserById(userId: string): Promise<TwitterUserData> {
  const apiKey = process.env.TWITTER_API_KEY

  if (!apiKey) {
    throw new Error("TWITTER_API_KEY environment variable is not set")
  }

  const client = new TwitterAPIClient(apiKey)
  const data = await client.getUserById(userId)

  if (!data) {
    throw new Error(`Failed to fetch user data for ${userId}`)
  }

  return data
}

export async function fetchUserTweets(userId: string, count = 20) {
  const apiKey = process.env.TWITTER_API_KEY

  if (!apiKey) {
    throw new Error("TWITTER_API_KEY environment variable is not set")
  }

  try {
    const url = `https://twitter.good6.top/api/base/apitools/userTweetsV2?apiKey=${encodeURIComponent(apiKey)}&userId=${encodeURIComponent(userId)}&count=${count}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const apiResponse = await response.json()

    if (apiResponse.code !== 1 || !apiResponse.data) {
      throw new Error(`API error: ${apiResponse.msg || "Unknown error"}`)
    }

    // Parse nested JSON if needed
    let tweetsData = apiResponse.data
    if (typeof tweetsData === "string") {
      tweetsData = JSON.parse(tweetsData)
    }

    return tweetsData
  } catch (error) {
    console.error(`[v0] Failed to fetch tweets for user ID ${userId}:`, error)
    throw error
  }
}
