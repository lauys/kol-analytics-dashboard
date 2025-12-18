-- Fix the kols table to match the API data structure
-- First, add missing columns if they don't exist
ALTER TABLE public.kols 
  ADD COLUMN IF NOT EXISTS twitter_id text,
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS profile_image_url text,
  ADD COLUMN IF NOT EXISTS followers_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tweet_count integer DEFAULT 0;

-- Update twitter_id from twitter_user_id if exists
UPDATE public.kols 
SET twitter_id = twitter_user_id 
WHERE twitter_id IS NULL AND twitter_user_id IS NOT NULL;

-- Update username from twitter_username if exists  
UPDATE public.kols 
SET username = twitter_username 
WHERE username IS NULL AND twitter_username IS NOT NULL;

-- Create unique index on username
CREATE UNIQUE INDEX IF NOT EXISTS idx_kols_username ON public.kols(username);

-- Create index on twitter_id
CREATE INDEX IF NOT EXISTS idx_kols_twitter_id ON public.kols(twitter_id);

-- Allow admins to insert/update/delete KOLs
DROP POLICY IF EXISTS "kols_admin_insert" ON public.kols;
CREATE POLICY "kols_admin_insert"
  ON public.kols FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "kols_admin_update" ON public.kols;
CREATE POLICY "kols_admin_update"
  ON public.kols FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "kols_admin_delete" ON public.kols;
CREATE POLICY "kols_admin_delete"
  ON public.kols FOR DELETE
  USING (true);
