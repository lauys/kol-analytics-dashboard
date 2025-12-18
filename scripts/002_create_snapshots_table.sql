-- Create snapshots table to store historical Twitter metrics
create table if not exists public.snapshots (
  id uuid primary key default gen_random_uuid(),
  kol_id uuid not null references public.kols(id) on delete cascade,
  followers_count bigint not null,
  following_count bigint not null,
  tweet_count bigint not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.snapshots enable row level security;

-- Allow public read access to snapshots
create policy "snapshots_select_all"
  on public.snapshots for select
  using (true);

-- Create indexes for performance
create index idx_snapshots_kol_id on public.snapshots(kol_id);
create index idx_snapshots_created_at on public.snapshots(created_at desc);
create index idx_snapshots_kol_created on public.snapshots(kol_id, created_at desc);
