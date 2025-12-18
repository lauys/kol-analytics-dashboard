-- Create a view for tweet activity statistics
CREATE OR REPLACE VIEW tweet_activity_stats AS
SELECT 
  k.id,
  k.twitter_username,
  k.display_name,
  k.avatar_url,
  k.bio,
  k.is_zombie,
  -- 为了让前端能按 is_hidden 过滤，这里补充 is_hidden 字段
  k.is_hidden,
  k.tweet_count as total_tweets,
  k.followers_count as latest_followers,
  k.updated_at as latest_time,

  -- Tweet counts in different windows
  COALESCE(COUNT(DISTINCT CASE 
    WHEN ts.recorded_at >= NOW() - INTERVAL '24 hours' THEN ts.tweet_id 
  END), 0) as tweets_today,
  COALESCE(COUNT(DISTINCT CASE 
    WHEN ts.recorded_at >= NOW() - INTERVAL '7 days' THEN ts.tweet_id 
  END), 0) as tweets_7d,
  COALESCE(COUNT(DISTINCT CASE 
    WHEN ts.recorded_at >= NOW() - INTERVAL '30 days' THEN ts.tweet_id 
  END), 0) as tweets_30d,

  -- Likes received in different windows
  COALESCE(SUM(CASE 
    WHEN ts.recorded_at >= NOW() - INTERVAL '24 hours' THEN ts.likes 
    ELSE 0 
  END), 0) as likes_today,
  COALESCE(SUM(CASE 
    WHEN ts.recorded_at >= NOW() - INTERVAL '7 days' THEN ts.likes 
    ELSE 0 
  END), 0) as likes_7d,
  COALESCE(SUM(CASE 
    WHEN ts.recorded_at >= NOW() - INTERVAL '30 days' THEN ts.likes 
    ELSE 0 
  END), 0) as likes_30d,

  -- Replies received in different windows
  COALESCE(SUM(CASE 
    WHEN ts.recorded_at >= NOW() - INTERVAL '24 hours' THEN ts.replies 
    ELSE 0 
  END), 0) as replies_today,
  COALESCE(SUM(CASE 
    WHEN ts.recorded_at >= NOW() - INTERVAL '7 days' THEN ts.replies 
    ELSE 0 
  END), 0) as replies_7d,
  COALESCE(SUM(CASE 
    WHEN ts.recorded_at >= NOW() - INTERVAL '30 days' THEN ts.replies 
    ELSE 0 
  END), 0) as replies_30d

FROM kols k
LEFT JOIN tweet_snapshots ts ON k.id = ts.kol_id
GROUP BY 
  k.id, 
  k.twitter_username, 
  k.display_name, 
  k.avatar_url, 
  k.bio, 
  k.is_zombie, 
  k.is_hidden,
  k.tweet_count, 
  k.followers_count, 
  k.updated_at;

-- Grant access to the view
GRANT SELECT ON tweet_activity_stats TO anon, authenticated;
