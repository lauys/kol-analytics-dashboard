-- Create materialized view for 24h leaderboard calculations
create or replace view public.leaderboard_24h as
with latest_snapshots as (
  select distinct on (kol_id)
    kol_id,
    followers_count as latest_followers,
    following_count as latest_following,
    tweet_count as latest_tweets,
    created_at as latest_time
  from public.snapshots
  order by kol_id, created_at desc
),
day_ago_snapshots as (
  select distinct on (kol_id)
    kol_id,
    followers_count as day_ago_followers,
    following_count as day_ago_following,
    tweet_count as day_ago_tweets,
    created_at as day_ago_time
  from public.snapshots
  where created_at <= now() - interval '24 hours'
  order by kol_id, created_at desc
)
select
  k.id,
  k.twitter_username,
  k.twitter_user_id,
  k.display_name,
  k.avatar_url,
  k.bio,
  k.is_zombie,
  ls.latest_followers,
  ls.latest_following,
  ls.latest_tweets,
  ls.latest_time,
  coalesce(ls.latest_followers - dag.day_ago_followers, 0) as followers_change_24h,
  coalesce(ls.latest_following - dag.day_ago_following, 0) as following_change_24h,
  coalesce(ls.latest_tweets - dag.day_ago_tweets, 0) as tweets_change_24h,
  case 
    when dag.day_ago_followers > 0 then
      round(((ls.latest_followers - dag.day_ago_followers)::numeric / dag.day_ago_followers * 100)::numeric, 2)
    else 0
  end as followers_growth_rate_24h
from public.kols k
inner join latest_snapshots ls on k.id = ls.kol_id
left join day_ago_snapshots dag on k.id = dag.kol_id
order by ls.latest_followers desc;
