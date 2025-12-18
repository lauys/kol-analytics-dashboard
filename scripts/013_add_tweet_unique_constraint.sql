-- Add unique constraint to tweet_snapshots table for upsert functionality
-- This allows us to use ON CONFLICT to update existing tweets instead of inserting duplicates

ALTER TABLE public.tweet_snapshots 
ADD CONSTRAINT tweet_snapshots_kol_tweet_unique 
UNIQUE (kol_id, tweet_id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tweet_snapshots_recorded_at 
ON public.tweet_snapshots(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_tweet_snapshots_pinned 
ON public.tweet_snapshots(kol_id, is_pinned) 
WHERE is_pinned = true;
