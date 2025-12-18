-- Drop and recreate the leaderboard view to handle both old and new column names
DROP VIEW IF EXISTS public.leaderboard_24h;

CREATE OR REPLACE VIEW public.leaderboard_24h AS
WITH latest_snapshots AS (
  SELECT DISTINCT ON (kol_id)
    kol_id,
    followers_count AS latest_followers,
    following_count AS latest_following,
    tweet_count AS latest_tweets,
    created_at AS latest_time
  FROM public.snapshots
  ORDER BY kol_id, created_at DESC
),
day_ago_snapshots AS (
  SELECT DISTINCT ON (kol_id)
    kol_id,
    followers_count AS day_ago_followers,
    following_count AS day_ago_following,
    tweet_count AS day_ago_tweets,
    created_at AS day_ago_time
  FROM public.snapshots
  WHERE created_at <= now() - interval '24 hours'
  ORDER BY kol_id, created_at DESC
)
SELECT
  k.id,
  COALESCE(k.username, k.twitter_username) AS twitter_username,
  COALESCE(k.twitter_id, k.twitter_user_id) AS twitter_user_id,
  k.display_name,
  COALESCE(k.profile_image_url, k.avatar_url) AS avatar_url,
  k.bio,
  k.is_zombie,
  COALESCE(ls.latest_followers, k.followers_count, 0) AS latest_followers,
  COALESCE(ls.latest_following, k.following_count, 0) AS latest_following,
  COALESCE(ls.latest_tweets, k.tweet_count, 0) AS latest_tweets,
  ls.latest_time,
  COALESCE(ls.latest_followers - dag.day_ago_followers, 0) AS followers_change_24h,
  COALESCE(ls.latest_following - dag.day_ago_following, 0) AS following_change_24h,
  COALESCE(ls.latest_tweets - dag.day_ago_tweets, 0) AS tweets_change_24h,
  CASE 
    WHEN dag.day_ago_followers > 0 THEN
      round(((COALESCE(ls.latest_followers, k.followers_count, 0) - dag.day_ago_followers)::numeric / dag.day_ago_followers * 100)::numeric, 2)
    ELSE 0
  END AS followers_growth_rate_24h
FROM public.kols k
LEFT JOIN latest_snapshots ls ON k.id = ls.kol_id
LEFT JOIN day_ago_snapshots dag ON k.id = dag.kol_id
ORDER BY COALESCE(ls.latest_followers, k.followers_count, 0) DESC;
