-- Create RPC functions for 7-day and 30-day growth rankings
-- These functions calculate growth metrics without needing materialized views

CREATE OR REPLACE FUNCTION get_7d_growth_ranking()
RETURNS TABLE (
  id UUID,
  twitter_username TEXT,
  twitter_user_id TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_zombie BOOLEAN,
  tier TEXT,
  latest_time TIMESTAMP WITH TIME ZONE,
  latest_followers BIGINT,
  latest_following BIGINT,
  latest_tweets BIGINT,
  followers_change_7d BIGINT,
  following_change_7d BIGINT,
  tweets_change_7d BIGINT,
  followers_growth_rate_7d NUMERIC
) AS $$
BEGIN
  RETURN QUERY
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
    
    -- 7-day change: use week_ago if available, otherwise use earliest snapshot, otherwise use kols table value
    COALESCE(latest.followers_count, k.followers_count) - COALESCE(week_ago.followers_count, earliest.followers_count, k.followers_count) as followers_change_7d,
    COALESCE(latest.following_count, k.following_count) - COALESCE(week_ago.following_count, earliest.following_count, k.following_count) as following_change_7d,
    COALESCE(latest.tweet_count, k.tweet_count) - COALESCE(week_ago.tweet_count, earliest.tweet_count, k.tweet_count) as tweets_change_7d,
    
    -- 7-day growth rate
    CASE 
      WHEN COALESCE(week_ago.followers_count, earliest.followers_count, k.followers_count) > 0 
      THEN ((COALESCE(latest.followers_count, k.followers_count)::numeric - COALESCE(week_ago.followers_count, earliest.followers_count, k.followers_count)) / COALESCE(week_ago.followers_count, earliest.followers_count, k.followers_count)) * 100
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
  ) week_ago ON true
  LEFT JOIN LATERAL (
    SELECT followers_count, following_count, tweet_count
    FROM snapshots
    WHERE kol_id = k.id
    ORDER BY created_at ASC
    LIMIT 1
  ) earliest ON true
  ORDER BY followers_growth_rate_7d DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_30d_growth_ranking()
RETURNS TABLE (
  id UUID,
  twitter_username TEXT,
  twitter_user_id TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_zombie BOOLEAN,
  tier TEXT,
  latest_time TIMESTAMP WITH TIME ZONE,
  latest_followers BIGINT,
  latest_following BIGINT,
  latest_tweets BIGINT,
  followers_change_30d BIGINT,
  following_change_30d BIGINT,
  tweets_change_30d BIGINT,
  followers_growth_rate_30d NUMERIC
) AS $$
BEGIN
  RETURN QUERY
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
    
    -- 30-day change: use month_ago if available, otherwise use earliest snapshot, otherwise use kols table value
    COALESCE(latest.followers_count, k.followers_count) - COALESCE(month_ago.followers_count, earliest.followers_count, k.followers_count) as followers_change_30d,
    COALESCE(latest.following_count, k.following_count) - COALESCE(month_ago.following_count, earliest.following_count, k.following_count) as following_change_30d,
    COALESCE(latest.tweet_count, k.tweet_count) - COALESCE(month_ago.tweet_count, earliest.tweet_count, k.tweet_count) as tweets_change_30d,
    
    -- 30-day growth rate
    CASE 
      WHEN COALESCE(month_ago.followers_count, earliest.followers_count, k.followers_count) > 0 
      THEN ((COALESCE(latest.followers_count, k.followers_count)::numeric - COALESCE(month_ago.followers_count, earliest.followers_count, k.followers_count)) / COALESCE(month_ago.followers_count, earliest.followers_count, k.followers_count)) * 100
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
  ) month_ago ON true
  LEFT JOIN LATERAL (
    SELECT followers_count, following_count, tweet_count
    FROM snapshots
    WHERE kol_id = k.id
    ORDER BY created_at ASC
    LIMIT 1
  ) earliest ON true
  ORDER BY followers_growth_rate_30d DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;
