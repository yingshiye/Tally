-- Apple Calendar import: per-user integration tokens (hashed) and a display preference.
-- Only a SHA-256 hash of each token is stored; the plain token is shown to the user once.

create table public.planner_integrations (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  kind         text        not null check (kind in ('calendar_sync','calendar_feed')),
  token_hash   text        not null unique,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at   timestamptz
);
-- At most one active token per user and kind.
create unique index planner_integrations_one_active_idx
  on public.planner_integrations (user_id, kind) where revoked_at is null;

alter table public.planner_integrations enable row level security;
-- Signed-in users manage only their own rows. No delete policy: revoking sets revoked_at.
create policy planner_integrations_select on public.planner_integrations
  for select using (auth.uid() = user_id);
create policy planner_integrations_insert on public.planner_integrations
  for insert with check (auth.uid() = user_id);
create policy planner_integrations_update on public.planner_integrations
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Imported calendar events show their titles unless this is turned off ("Busy" only).
alter table public.planner_preferences
  add column show_event_titles boolean not null default true;
