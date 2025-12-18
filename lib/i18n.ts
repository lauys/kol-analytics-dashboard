"use client"

import { useState } from "react"

export type Language = "en" | "zh"

export const translations = {
  en: {
    // Header
    dashboard_title: "KOL Analytics Dashboard",
    dashboard_subtitle: "Track and analyze Twitter influencer metrics",
    search_placeholder: "Search KOLs by name or username...",
    filter_all: "All KOLs",
    filter_active: "Active Only",
    filter_zombie: "Zombies Only",
    filter_growing: "High Growth",
    collect_all_data: "Collect All Data",
    collecting: "Collecting...",
    import_kols: "Import KOLs",
    task_verifier: "Task Verifier",

    collecting_kol_data: "Collecting KOL data and tweets...",
    collection_failed: "Data collection failed",
    collection_error: "An error occurred during collection",
    collection_complete: "✓ Data Collection Complete",
    successful_kols: "Successfully collected",
    failed_kols: "Failed",
    kols: "KOLs",
    collection_note: "Note: Tweet data has been collected and saved to the database",

    // Stats
    total_kols: "Total KOLs",
    total_kols_help:
      "Number of KOL records currently tracked in the system (including both active and zombie accounts).",
    active_kols: "Active KOLs",
    active_kols_help: "KOLs that are not marked as zombie accounts and are considered active.",
    zombie_accounts: "Zombie Accounts",
    zombie_accounts_help: "Accounts marked as zombie due to long-term inactivity or low-quality behavior.",
    avg_growth_24h: "Avg Growth (24h)",
    avg_growth_24h_help:
      "Average 24h follower growth rate across all KOLs (including those with negative growth).",

    // Table
    rank: "Rank",
    kol: "KOL",
    followers: "Followers",
    following: "Following",
    tweets: "Tweets",
    tweet_count: "Tweet Count",
    change_24h: "24h Change",
    growth_rate: "Growth Rate",
    tier: "Tier",
    actions: "Actions",
    view_details: "View Details",
    mark_zombie: "Mark Zombie",
    unmark_zombie: "Unmark Zombie",

    // KOL Detail
    profile: "Profile",
    engagement: "Engagement",
    follower_ratio: "Follower Ratio",
    total_tweets: "Total Tweets",
    growth_24h: "24h Growth",
    growth_analytics: "Growth Analytics",
    recent_activity: "Recent Activity",
    view_on_twitter: "View on Twitter",
    manual_score: "Manual Score",
    zombie_account: "Zombie Account",

    "24hChange": "24-Hour Change Analysis",
    "24hAgo": "24h ago",
    current: "Current",
    overallTrend: "Overall Trend",
    growing: "Growing",
    declining: "Declining",
    stable: "Stable",

    // Tweets
    pinned_tweet: "Pinned",
    collect_tweets: "Collect Tweets",
    no_tweets: "No tweets available",
    likes: "Likes",
    retweets: "Retweets",
    replies: "Replies",
    quotes: "Quotes",

    pinned_tweet_analytics: "Pinned Tweet Analytics",
    pinned_records: "Pinned Records",
    previous_pinned_tweets: "Previous Pinned Tweets",
    no_pinned_history: "No pinned tweet history available",
    data_points: "data points",
    current_pinned_tweet: "Current Pinned Tweet",
    pinned: "Pinned",
    engagement_trend: "Engagement Trend",
    first_seen: "First Seen",
    last_updated: "Last Updated",
    collect_tweets_first: "Please collect tweets data first to see pinned tweet analytics",
    view_original_tweet: "View Original Tweet on Twitter",

    // Pinned Tweet Placeholder Translations
    pinned_tweet_detected: "Pinned Tweet Detected",
    pinned_tweet_old_explanation:
      "This KOL has a pinned tweet, but it's not in their recent 20 tweets (it's an older tweet). Click the button below to view the original tweet on Twitter.",
    detected_at: "Detected at",
    pinned_tweet_tip:
      "The pinned tweet will be fully tracked when it's updated or when more historical data collection features are added.",

    // Messages
    no_kols_match: "No KOLs match your filters",
    no_data_available: "No KOL data available",
    click_import_to_add: 'Click "Import KOLs" in the header to add KOLs to track',
    loading_analytics: "Loading analytics...",
    no_historical_data: "No historical data available",

    // Time
    days_7: "7D",
    days_30: "30D",
    days_90: "90D",

    // Ranking Tabs
    total_ranking: "Total Ranking",
    growth_ranking: "Growth Ranking",
    governance_activity: "Activity Ranking",
    time_24h: "24 Hours",
    time_7d: "7 Days",
    time_30d: "30 Days",
    net_growth: "Net Growth",
    post_count: "Post Count",
    last_active: "Last Active",
    last_reply: "Last Reply",
    status: "Status",
    normal: "Normal",
    zombie: "Zombie",
    suspended: "Suspended",
    inactive_warning: "Inactive for 7+ days",
    account_count: "Account Count",
    fan_power: "Fan Power",
    growth_power: "Growth Power",
    activity_status: "Activity Status",

    tweets_today: "Tweets Today",
    tweets_7d: "Tweets (7d)",
    likes_received: "Likes Received",
    replies_received: "Replies Received",

    // Contribution Ranking
    contribution: "Contribution",
    contribution_score: "Contribution Score",
    interaction_rate: "Interaction Rate",
    engagement_breakdown: "Engagement Breakdown",
    participation: "Participation",
    core_contributor: "Core Contributor",
    low_interaction: "Low Interaction",
    active: "Active",

    // KOL Detail Page
    follower_ratio: "Follower Ratio",
    follower_ratio_tooltip: "The ratio of followers to following. A higher ratio indicates greater influence and account quality.",
    interaction_history: "Interaction History",
    no_interactions_detected: "No recent interactions with @Titannet_dao have been detected yet.",
    replied_to_official_post: "Replied to official post",
    view: "View",
    tier_label: "Tier",
    hidden: "Hidden",
    show: "Show",
    hide: "Hide",
    delete_kol: "Delete KOL",
    loading_analytics: "Loading analytics...",
    loading_charts: "Loading charts...",
    export_exporting: "Exporting...",
    export_kol_history: "Export KOL History",
    confirm_delete: "Confirm Delete",
    delete_confirmation_message: "Are you sure you want to delete KOL \"{name}\"? This action cannot be undone and will delete all related data (snapshots, history, etc.).",
    cancel: "Cancel",
    deleting: "Deleting...",
    confirm_delete_button: "Delete",
    growth_metrics: "Growth Metrics",
    growth_rate_24h: "24h Growth Rate",
    mark_as_zombie: "Mark as Zombie",
    unmark_as_zombie: "Unmark as Zombie",
    days_7_full: "7 Days",
    days_30_full: "30 Days",
    days_90_full: "90 Days",
    time_24h_label: "(24h)",
    operation_failed: "Operation failed",
    delete_failed: "Failed to delete KOL",
    export_failed: "Export failed, this KOL may have no historical data yet",
    export_error: "An error occurred during export",
    time_minutes_ago: "{n}m ago",
    time_hours_ago: "{n}h ago",
    time_days_ago: "{n}d ago",
    followers_over_time: "Followers Over Time",
    following_over_time: "Following Over Time",
    tweets_over_time: "Tweets Over Time",

    // Bio History
    bio_change_history: "Bio Change History",
    bio_changes: "changes",
    old_bio: "Old Bio",
    new_bio: "New Bio",
    no_bio_changes: "No bio changes recorded yet",
    expand_bio: "Expand",
    collapse_bio: "Collapse",
    bio_history_error: "Failed to load bio history",
  },
  zh: {
    // Header
    dashboard_title: "KOL 分析仪表板",
    dashboard_subtitle: "追踪和分析 Twitter 影响力指标",
    search_placeholder: "按名称或用户名搜索 KOL...",
    filter_all: "全部 KOL",
    filter_active: "仅活跃",
    filter_zombie: "仅僵尸号",
    filter_growing: "高增长",
    collect_all_data: "采集所有数据",
    collecting: "采集中...",
    import_kols: "导入 KOL",
    task_verifier: "任务验证",

    collecting_kol_data: "正在采集 KOL 数据和推文...",
    collection_failed: "数据采集失败",
    collection_error: "采集过程中出现错误",
    collection_complete: "✓ 数据采集完成",
    successful_kols: "成功采集",
    failed_kols: "失败",
    kols: "个 KOL",
    collection_note: "注意：推文数据已同步采集并保存到数据库",

    // Stats
    total_kols: "总 KOL 数",
    total_kols_help: "当前系统中记录的 KOL 总数量（包含活跃账号和僵尸账号）。",
    active_kols: "活跃 KOL",
    active_kols_help: "未被标记为僵尸账号的 KOL 数量，视为仍在活跃的账号。",
    zombie_accounts: "僵尸账号",
    zombie_accounts_help: "被标记为僵尸的账号数量，通常为长期不活跃或低质量账号。",
    avg_growth_24h: "平均增长 (24h)",
    avg_growth_24h_help: "所有 KOL 过去 24 小时粉丝增长率的平均值（包含为负的增长）。",

    // Table
    rank: "排名",
    kol: "KOL",
    followers: "粉丝数",
    following: "关注数",
    tweets: "推文数",
    tweet_count: "推文数",
    change_24h: "24h 变化",
    growth_rate: "增长率",
    tier: "等级",
    actions: "操作",
    view_details: "查看详情",
    mark_zombie: "标记僵尸号",
    unmark_zombie: "取消僵尸号",

    // KOL Detail
    profile: "个人资料",
    engagement: "互动数据",
    follower_ratio: "粉丝比率",
    total_tweets: "推文总数",
    growth_24h: "24h 增长",
    growth_analytics: "增长分析",
    recent_activity: "最近动态",
    view_on_twitter: "在 Twitter 查看",
    manual_score: "手动评分",
    zombie_account: "僵尸账号",

    "24hChange": "24小时变化分析",
    "24hAgo": "24小时前",
    current: "当前",
    overallTrend: "整体趋势",
    growing: "增长中",
    declining: "下降中",
    stable: "稳定",

    // Tweets
    pinned_tweet: "置顶",
    collect_tweets: "采集推文",
    no_tweets: "暂无推文",
    likes: "点赞",
    retweets: "转发",
    replies: "回复",
    quotes: "引用",

    pinned_tweet_analytics: "置顶推文分析",
    pinned_records: "条置顶记录",
    previous_pinned_tweets: "历史置顶推文",
    no_pinned_history: "暂无置顶推文历史数据",
    data_points: "个数据点",
    current_pinned_tweet: "当前置顶推文",
    pinned: "置顶",
    engagement_trend: "互动趋势",
    first_seen: "首次发现",
    last_updated: "最后更新",
    collect_tweets_first: "请先采集推文数据以查看置顶推文分析",
    view_original_tweet: "在 Twitter 查看原推文",

    // Pinned Tweet Placeholder Translations
    pinned_tweet_detected: "检测到置顶推文",
    pinned_tweet_old_explanation:
      "该 KOL 设置了置顶推文，但该推文不在最近的20条推文中（是较早的旧推文）。点击下方按钮在 Twitter 查看原推文。",
    detected_at: "检测时间",
    pinned_tweet_tip: "当置顶推文更新或添加更多历史数据采集功能后，将完整追踪置顶推文的数据。",

    // Messages
    no_kols_match: "没有匹配的 KOL",
    no_data_available: "暂无 KOL 数据",
    click_import_to_add: "点击顶部的「导入 KOL」按钮添加要追踪的 KOL",
    loading_analytics: "加载分析数据中...",
    no_historical_data: "暂无历史数据",

    // Time
    days_7: "7天",
    days_30: "30天",
    days_90: "90天",

    // Ranking Tabs
    total_ranking: "粉丝实力榜",
    growth_ranking: "增长魄力榜",
    governance_activity: "活跃榜",
    time_24h: "24小时",
    time_7d: "7天",
    time_30d: "30天",
    net_growth: "增长量",
    post_count: "发推数量",
    last_active: "最近活跃",
    last_reply: "最近回复",
    status: "状态",
    normal: "正常",
    zombie: "僵尸号",
    suspended: "封号",
    inactive_warning: "超过7天未活跃",
    account_count: "账号数量",
    fan_power: "粉丝实力",
    growth_power: "增长魄力",
    activity_status: "活跃状态",

    tweets_today: "今日发推数",
    tweets_7d: "7日发推数",
    likes_received: "被点赞数",
    replies_received: "被评论数",

    // Contribution Ranking
    contribution: "贡献度",
    contribution_score: "贡献分数",
    interaction_rate: "互动率",
    engagement_breakdown: "互动明细",
    participation: "参与度",
    core_contributor: "核心贡献者",
    low_interaction: "低互动",
    active: "活跃",

    // KOL Detail Page
    follower_ratio: "粉丝比率",
    follower_ratio_tooltip: "粉丝数除以关注数的比值，表示粉丝数相对于关注数的倍数。比率越高，通常表示账号影响力越大、质量越好。",
    interaction_history: "互动历史",
    no_interactions_detected: "尚未检测到与 @Titannet_dao 的近期互动。",
    replied_to_official_post: "回复了官方推文",
    view: "查看",
    tier_label: "等级",
    hidden: "已隐藏",
    show: "显示",
    hide: "隐藏",
    delete_kol: "删除KOL",
    loading_analytics: "加载分析数据中...",
    loading_charts: "加载图表中...",
    export_exporting: "导出中...",
    export_kol_history: "导出该 KOL 历史",
    confirm_delete: "确认删除",
    delete_confirmation_message: "确定要删除 KOL \"{name}\" 吗？此操作不可撤销，将同时删除所有相关数据（快照、历史记录等）。",
    cancel: "取消",
    deleting: "删除中...",
    confirm_delete_button: "确认删除",
    growth_metrics: "增长指标",
    growth_rate_24h: "24h 增长率",
    mark_as_zombie: "标记为僵尸号",
    unmark_as_zombie: "取消僵尸号标记",
    days_7_full: "7天",
    days_30_full: "30天",
    days_90_full: "90天",
    time_24h_label: "(24小时)",
    operation_failed: "操作失败",
    delete_failed: "删除失败",
    export_failed: "导出失败，可能该 KOL 暂无历史数据",
    export_error: "导出过程中出现错误",
    time_minutes_ago: "{n}分钟前",
    time_hours_ago: "{n}小时前",
    time_days_ago: "{n}天前",
    followers_over_time: "粉丝数随时间变化",
    following_over_time: "关注数随时间变化",
    tweets_over_time: "推文数随时间变化",

    // Bio History
    bio_change_history: "简介变更历史",
    bio_changes: "次变更",
    old_bio: "旧简介",
    new_bio: "新简介",
    no_bio_changes: "暂无简介变更记录",
    expand_bio: "展开",
    collapse_bio: "收起",
    bio_history_error: "加载简介历史失败",
  },
}

export function useTranslation() {
  const [language, setLanguage] = useState<Language>("zh")

  const t = (key: keyof typeof translations.en): string => {
    return translations[language][key] || key
  }

  return { t, language, setLanguage }
}

export function getTranslation(language: Language) {
  return (key: keyof typeof translations.en): string => {
    return translations[language][key] || key
  }
}
