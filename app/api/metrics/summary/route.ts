import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET() {
  try {
    const supabase = await createClient()

    // 统计所有与官方账号相关的推文互动数据
    // 注意：这里应该统计KOL对官方推文的互动次数，而不是推文收到的互动数
    const { data, error } = await supabase
      .from("tweet_snapshots")
      .select("likes, retweets, replies, quotes, text_content")
      // 仅统计与 @Brain_KOL_DAO 官方账号相关的推文互动
      .or("text_content.ilike.%@brain_kol_dao%,text_content.ilike.%brain_kol_dao%")

    if (error) {
      console.error("[v0] Error fetching tweet_snapshots for metrics:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 统计KOL对官方推文的互动次数，而不是推文收到的互动数
    // 每条推文如果是对官方推文的互动，则计数1次，而不是累加推文收到的互动数
    let totalLikes = 0
    let totalRetweets = 0
    let totalReplies = 0
    let totalQuotes = 0

    for (const row of data || []) {
      const textContent = (row.text_content || "").toLowerCase()
      
      // 判断这条推文是否是对官方推文的互动，以及互动类型
      // 注意：这里统计的是KOL对官方推文的互动次数，每条互动推文计数1次
      // 仅统计与 @Brain_KOL_DAO 官方账号相关的互动
      const isBrainKolDao = textContent.includes("@brain_kol_dao") || textContent.includes("brain_kol_dao")
      
      if (isBrainKolDao) {
        let interactionType: "retweet" | "quote" | "reply" | "like" | null = null
        
        // 检查是否是转发
        // 转发通常以 "RT @username: " 开头
        if (textContent.startsWith("rt @brain_kol_dao") || 
            (textContent.startsWith("rt ") && textContent.includes("@brain_kol_dao"))) {
          interactionType = "retweet"
        }
        // 检查是否是引用
        else if (textContent.includes("quote @brain_kol_dao") || 
                 textContent.includes("引用 @brain_kol_dao")) {
          interactionType = "quote"
        }
        // 检查是否是回复（更宽松的匹配）
        // 包括明确的回复标记，以及包含官方账号但非转发/引用的推文（可能是回复）
        else if (textContent.includes("reply @brain_kol_dao") || 
                 textContent.includes("回复 @brain_kol_dao") ||
                 textContent.includes("comment @brain_kol_dao") ||
                 textContent.includes("评论 @brain_kol_dao")) {
          interactionType = "reply"
        }
        // 检查是否是点赞
        else if (textContent.includes("like @brain_kol_dao") || 
                 textContent.includes("点赞 @brain_kol_dao") ||
                 textContent.includes("favorite @brain_kol_dao")) {
          interactionType = "like"
        }
        // 如果包含官方账号，但不是转发、引用、回复、点赞，可能是回复或链接
        // 根据数据收集逻辑：
        // - 如果推文的 in_reply_to_status_id_str 是官方推文ID，会被标记为 "reply"
        // - 如果原始文本不包含 @Brain_KOL_DAO，会添加 "Reply @Brain_KOL_DAO " 前缀
        // - 如果原始文本已经包含 @Brain_KOL_DAO，就不会添加前缀
        // 所以，如果文本包含官方账号的 @mention，但不是转发/引用，很可能是回复
        else if (textContent.includes("@brain_kol_dao")) {
          // 包含官方账号的 @mention，但不是转发/引用/明确的回复标记，可能是回复
          // 注意：这可能会包含一些链接，但根据数据收集逻辑，真实的回复通常会被正确标记
          interactionType = "reply"
        }
        // 如果只包含 "brain_kol_dao"（没有@），可能是链接或提及，不计入统计
        
        // 根据互动类型计数
        if (interactionType === "retweet") {
          totalRetweets += 1
        } else if (interactionType === "quote") {
          totalQuotes += 1
        } else if (interactionType === "reply") {
          totalReplies += 1
        } else if (interactionType === "like") {
          totalLikes += 1
        }
      }
    }

    const totalInteractions = totalLikes + totalRetweets + totalReplies + totalQuotes

    return NextResponse.json({
      totalInteractions,
      totalLikes,
      totalRetweets,
      totalReplies,
      totalQuotes,
    })
  } catch (error) {
    console.error("[v0] Error in metrics summary API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}


