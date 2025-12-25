/**
 * 测试自动采集数据功能
 * 
 * 使用方法：
 * 1. 确保环境变量已配置（.env.local 或 .env.production）
 * 2. 运行: npx tsx scripts/test-cron-collection.ts
 * 
 * 或者使用 Node.js:
 * node --loader ts-node/esm scripts/test-cron-collection.ts
 */

import { createAdminClient } from "../lib/supabase/admin"
import { TwitterAPIClient } from "../lib/twitter-api"

// 检查环境变量
function checkEnvVars() {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TWITTER_API_KEY",
    "ENABLE_AUTO_COLLECTION",
  ]

  const missing: string[] = []
  const warnings: string[] = []

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (process.env.ENABLE_AUTO_COLLECTION !== "true") {
    warnings.push("ENABLE_AUTO_COLLECTION 未设置为 'true'，自动采集将被禁用")
  }

  if (!process.env.CRON_SECRET) {
    warnings.push("CRON_SECRET 未设置，在生产环境中应该设置此值以确保安全")
  }

  if (missing.length > 0) {
    console.error("❌ 缺少必需的环境变量:")
    missing.forEach((key) => console.error(`   - ${key}`))
    process.exit(1)
  }

  if (warnings.length > 0) {
    console.warn("⚠️  警告:")
    warnings.forEach((msg) => console.warn(`   - ${msg}`))
  }

  console.log("✅ 环境变量检查通过")
}

// 测试数据库连接
async function testDatabaseConnection() {
  console.log("\n📊 测试数据库连接...")
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from("kols").select("id, twitter_username").limit(1)

    if (error) {
      throw error
    }

    console.log(`✅ 数据库连接成功 (找到 ${data?.length || 0} 个 KOL)`)
    return true
  } catch (error) {
    console.error("❌ 数据库连接失败:", error)
    return false
  }
}

// 测试 Twitter API
async function testTwitterAPI() {
  console.log("\n🐦 测试 Twitter API...")
  try {
    const apiKey = process.env.TWITTER_API_KEY
    if (!apiKey) {
      throw new Error("TWITTER_API_KEY 未配置")
    }

    const client = new TwitterAPIClient(apiKey)
    // 使用一个已知的测试用户名（例如 elonmusk）
    const testUsername = "elonmusk"
    console.log(`   正在测试获取 @${testUsername} 的数据...`)

    const userData = await client.getUserByUsername(testUsername)

    if (!userData) {
      throw new Error("无法获取用户数据")
    }

    console.log(`✅ Twitter API 测试成功`)
    console.log(`   用户名: @${userData.username}`)
    console.log(`   名称: ${userData.name}`)
    console.log(`   粉丝数: ${userData.followers_count.toLocaleString()}`)
    return true
  } catch (error) {
    console.error("❌ Twitter API 测试失败:", error instanceof Error ? error.message : error)
    return false
  }
}

// 测试获取 KOL 列表
async function testGetKOLs() {
  console.log("\n👥 测试获取 KOL 列表...")
  try {
    const supabase = createAdminClient()
    const { data: kols, error } = await supabase
      .from("kols")
      .select("id, twitter_username, twitter_user_id")
      .eq("is_zombie", false)
      .limit(5)

    if (error) {
      throw error
    }

    if (!kols || kols.length === 0) {
      console.warn("⚠️  数据库中没有 KOL 数据，请先导入 KOL")
      return false
    }

    console.log(`✅ 找到 ${kols.length} 个 KOL (显示前 5 个):`)
    kols.forEach((kol) => {
      console.log(`   - @${kol.twitter_username} (ID: ${kol.id})`)
    })

    return true
  } catch (error) {
    console.error("❌ 获取 KOL 列表失败:", error)
    return false
  }
}

// 测试单个 KOL 数据采集
async function testCollectSingleKOL() {
  console.log("\n🔍 测试单个 KOL 数据采集...")
  try {
    const supabase = createAdminClient()
    const { data: kols, error } = await supabase
      .from("kols")
      .select("id, twitter_username, twitter_user_id")
      .eq("is_zombie", false)
      .limit(1)

    if (error) throw error
    if (!kols || kols.length === 0) {
      console.warn("⚠️  没有可测试的 KOL")
      return false
    }

    const kol = kols[0]
    console.log(`   正在采集 @${kol.twitter_username} 的数据...`)

    const apiKey = process.env.TWITTER_API_KEY!
    const twitterClient = new TwitterAPIClient(apiKey)

    const userData = await twitterClient.getUserByUsername(kol.twitter_username)

    if (!userData) {
      throw new Error("无法获取用户数据")
    }

    console.log(`✅ 成功获取数据:`)
    console.log(`   粉丝数: ${userData.followers_count.toLocaleString()}`)
    console.log(`   关注数: ${userData.following_count.toLocaleString()}`)
    console.log(`   推文数: ${userData.tweet_count.toLocaleString()}`)

    // 测试推文采集（如果有 twitter_user_id）
    if (kol.twitter_user_id) {
      console.log(`\n   正在测试推文采集...`)
      try {
        const tweetsData = await twitterClient.fetchUserTweets(kol.twitter_user_id, 5)
        const instructions = tweetsData?.data?.user?.result?.timeline_v2?.timeline?.instructions || []
        const timelineInstruction = instructions.find((inst: any) => inst.type === "TimelineAddEntries")
        const tweetCount = timelineInstruction?.entries?.filter((e: any) => e.entryId?.startsWith("tweet-")).length || 0
        console.log(`✅ 成功获取推文数据 (找到 ${tweetCount} 条推文)`)
      } catch (error) {
        console.warn(`⚠️  推文采集测试失败:`, error instanceof Error ? error.message : error)
      }
    }

    return true
  } catch (error) {
    console.error("❌ 单个 KOL 数据采集测试失败:", error)
    return false
  }
}

// 主测试函数
async function runTests() {
  console.log("🚀 开始测试自动采集数据功能\n")
  console.log("=" .repeat(60))

  // 检查环境变量
  checkEnvVars()

  // 运行测试
  const results = {
    database: await testDatabaseConnection(),
    twitterAPI: await testTwitterAPI(),
    getKOLs: await testGetKOLs(),
    collectKOL: await testCollectSingleKOL(),
  }

  // 总结
  console.log("\n" + "=".repeat(60))
  console.log("📋 测试总结:")
  console.log(`   数据库连接: ${results.database ? "✅" : "❌"}`)
  console.log(`   Twitter API: ${results.twitterAPI ? "✅" : "❌"}`)
  console.log(`   获取 KOL 列表: ${results.getKOLs ? "✅" : "❌"}`)
  console.log(`   采集 KOL 数据: ${results.collectKOL ? "✅" : "❌"}`)

  const allPassed = Object.values(results).every((r) => r)
  if (allPassed) {
    console.log("\n✅ 所有测试通过！自动采集功能应该可以正常工作。")
    console.log("\n💡 提示:")
    console.log("   - 确保在 Vercel 中配置了定时任务 (vercel.json)")
    console.log("   - 确保 ENABLE_AUTO_COLLECTION=true 在 Production 环境中")
    console.log("   - 确保 CRON_SECRET 已设置（用于安全认证）")
    console.log("   - 定时任务将在每天凌晨 2 点自动执行")
  } else {
    console.log("\n❌ 部分测试失败，请检查上述错误信息并修复问题。")
    process.exit(1)
  }
}

// 运行测试
runTests().catch((error) => {
  console.error("❌ 测试过程中发生错误:", error)
  process.exit(1)
})

