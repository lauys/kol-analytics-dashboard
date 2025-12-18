-- Add tier, manual score, and other fields to kols table
ALTER TABLE public.kols 
ADD COLUMN IF NOT EXISTS tier text CHECK (tier IN ('High', 'Mid', 'Low')),
ADD COLUMN IF NOT EXISTS manual_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS followers_count bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS tweet_count bigint DEFAULT 0;

-- Create bio history table to track bio changes
CREATE TABLE IF NOT EXISTS public.bio_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kol_id uuid NOT NULL REFERENCES public.kols(id) ON DELETE CASCADE,
  old_bio text,
  new_bio text,
  changed_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bio_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "bio_history_select_all"
  ON public.bio_history FOR SELECT
  USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS idx_bio_history_kol_id ON public.bio_history(kol_id);
CREATE INDEX IF NOT EXISTS idx_bio_history_changed_at ON public.bio_history(changed_at DESC);

-- Create tweet monitoring table for pinned tweets and task verification
CREATE TABLE IF NOT EXISTS public.tweet_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id text NOT NULL,
  kol_id uuid NOT NULL REFERENCES public.kols(id) ON DELETE CASCADE,
  is_pinned boolean DEFAULT false,
  likes bigint DEFAULT 0,
  retweets bigint DEFAULT 0,
  replies bigint DEFAULT 0,
  quotes bigint DEFAULT 0,
  media_type text,
  text_content text,
  recorded_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tweet_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "tweet_snapshots_select_all"
  ON public.tweet_snapshots FOR SELECT
  USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tweet_snapshots_kol_id ON public.tweet_snapshots(kol_id);
CREATE INDEX IF NOT EXISTS idx_tweet_snapshots_tweet_id ON public.tweet_snapshots(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_snapshots_recorded_at ON public.tweet_snapshots(recorded_at DESC);

COMMENT ON TABLE public.bio_history IS 'Tracks historical changes to KOL bio descriptions';
COMMENT ON TABLE public.tweet_snapshots IS 'Tracks engagement metrics for pinned tweets and task verification';
