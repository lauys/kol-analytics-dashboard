-- Create KOLs table to store Twitter influencer information
create table if not exists public.kols (
  id uuid primary key default gen_random_uuid(),
  twitter_username text unique not null,
  twitter_user_id text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  is_zombie boolean default false,
  zombie_marked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS (even though this is read-only data, it's a best practice)
alter table public.kols enable row level security;

-- Allow public read access to KOLs
create policy "kols_select_all"
  on public.kols for select
  using (true);

-- Create index for faster lookups
create index idx_kols_twitter_username on public.kols(twitter_username);
create index idx_kols_is_zombie on public.kols(is_zombie);
