export interface KOL {
  id: string
  twitter_username: string
  twitter_user_id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  is_zombie: boolean
  is_hidden?: boolean
  tier?: "High" | "Mid" | "Low" | null
  manual_score?: number
  location?: string | null
  followers_count?: number
  following_count?: number
  tweet_count?: number
  latest_followers: number
  latest_following: number
  latest_tweets: number
  latest_time: string
  followers_change_24h: number
  following_change_24h: number
  tweets_change_24h: number
  followers_growth_rate_24h: number
  followers_change_7d?: number
  followers_growth_rate_7d?: number
  followers_change_30d?: number
  followers_growth_rate_30d?: number
  tweets_today?: number
  tweets_7d?: number
  tweets_30d?: number
  likes_today?: number
  likes_7d?: number
  likes_30d?: number
  replies_today?: number
  replies_7d?: number
  replies_30d?: number
  total_tweets?: number
}

export interface Snapshot {
  id: string
  kol_id: string
  followers_count: number
  following_count: number
  tweet_count: number
  created_at: string
}

export interface ChartDataPoint {
  timestamp: string
  followers: number
  following: number
  tweets: number
}

export interface UserProfile {
  id: string
  email: string
  role: "admin" | "user"
}

export interface Tweet {
  id: string
  kol_id: string
  tweet_id: string
  text_content: string
  likes: number
  retweets: number
  replies: number
  quotes: number
  is_pinned: boolean
  media_type: string | null
  recorded_at: string
}

export interface PinnedTweetHistory {
  tweet_id: string
  text_content: string
  history: Tweet[]
  first_seen: string
  last_seen: string
}

export interface BioChange {
  id: string
  kol_id: string
  old_bio: string | null
  new_bio: string
  changed_at: string
}
