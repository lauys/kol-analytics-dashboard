-- Create views for 7-day and 30-day growth rankings
-- These views calculate growth metrics over different time periods

-- 7-day growth view
CREATE OR REPLACE VIEW leaderboard_7d AS
SELECT 
  k.id,
  k.twitter_username,
  k.twitter_user_id,
  k.display_name,
  k.avatar_url,
  k.bio,
  k.is_zombie,
  k.tier,
  k.updated_at as latest_time,
  
  -- Latest metrics
  COALESCE(latest.followers_count, k.followers_count) as latest_followers,
  COALESCE(latest.following_count, k.following_count) as latest_following,
  COALESCE(latest.tweet_count, k.tweet_count) as latest_tweets,
  
  -- 7-day change
  COALESCE(latest.followers_count, k.followers_count) - COALESCE(week_ago.followers_count, k.followers_count) as followers_change_7d,
  COALESCE(latest.following_count, k.following_count) - COALESCE(week_ago.following_count, k.following_count) as following_change_7d,
  COALESCE(latest.tweet_count, k.tweet_count) - COALESCE(week_ago.tweet_count, k.tweet_count) as tweets_change_7d,
  
  -- 7-day growth rate
  CASE 
    WHEN COALESCE(week_ago.followers_count, k.followers_count) > 0 
    THEN ((COALESCE(latest.followers_count, k.followers_count)::numeric - COALESCE(week_ago.followers_count, k.followers_count)) / COALESCE(week_ago.followers_count, k.followers_count)) * 100
    ELSE 0
  END as followers_growth_rate_7d
  
FROM kols k
LEFT JOIN LATERAL (
  SELECT followers_count, following_count, tweet_count
  FROM snapshots
  WHERE kol_id = k.id
  ORDER BY created_at DESC
  LIMIT 1
) latest ON true
LEFT JOIN LATERAL (
  SELECT followers_count, following_count, tweet_count
  FROM snapshots
  WHERE kol_id = k.id 
    AND created_at <= NOW() - INTERVAL '7 days'
  ORDER BY created_at DESC
  LIMIT 1
) week_ago ON true;

-- 30-day growth view
CREATE OR REPLACE VIEW leaderboard_30d AS
SELECT 
  k.id,
  k.twitter_username,
  k.twitter_user_id,
  k.display_name,
  k.avatar_url,
  k.bio,
  k.is_zombie,
  k.tier,
  k.updated_at as latest_time,
  
  -- Latest metrics
  COALESCE(latest.followers_count, k.followers_count) as latest_followers,
  COALESCE(latest.following_count, k.following_count) as latest_following,
  COALESCE(latest.tweet_count, k.tweet_count) as latest_tweets,
  
  -- 30-day change
  COALESCE(latest.followers_count, k.followers_count) - COALESCE(month_ago.followers_count, k.followers_count) as followers_change_30d,
  COALESCE(latest.following_count, k.following_count) - COALESCE(month_ago.following_count, k.following_count) as following_change_30d,
  COALESCE(latest.tweet_count, k.tweet_count) - COALESCE(month_ago.tweet_count, k.tweet_count) as tweets_change_30d,
  
  -- 30-day growth rate
  CASE 
    WHEN COALESCE(month_ago.followers_count, k.followers_count) > 0 
    THEN ((COALESCE(latest.followers_count, k.followers_count)::numeric - COALESCE(month_ago.followers_count, k.followers_count)) / COALESCE(month_ago.followers_count, k.followers_count)) * 100
    ELSE 0
  END as followers_growth_rate_30d
  
FROM kols k
LEFT JOIN LATERAL (
  SELECT followers_count, following_count, tweet_count
  FROM snapshots
  WHERE kol_id = k.id
  ORDER BY created_at DESC
  LIMIT 1
) latest ON true
LEFT JOIN LATERAL (
  SELECT followers_count, following_count, tweet_count
  FROM snapshots
  WHERE kol_id = k.id 
    AND created_at <= NOW() - INTERVAL '30 days'
  ORDER BY created_at DESC
  LIMIT 1
) month_ago ON true;
