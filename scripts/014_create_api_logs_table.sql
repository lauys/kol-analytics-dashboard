-- Create table for recording API calls
create table if not exists public.api_logs (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  method text not null,
  -- optional: authenticated user id, if available
  user_id uuid,
  -- raw query string, for debugging/analysis
  query text,
  -- request identifier for correlation, if needed
  request_id text,
  created_at timestamptz not null default now()
);

-- Helpful index for counting by path/method
create index if not exists api_logs_path_method_created_at_idx
  on public.api_logs (path, method, created_at desc);











