-- A row here means the user chose to share their NeetCode 150 progress publicly.
-- Deleting the row (or regenerating the token) revokes the link.
create table public.prep_shares (
  user_id      uuid        primary key references auth.users(id) on delete cascade,
  token        text        not null unique
                           default replace(gen_random_uuid()::text, '-', ''),
  display_name text        check (display_name is null or char_length(display_name) between 1 and 40),
  created_at   timestamptz not null default now()
);

alter table public.prep_shares enable row level security;

create policy "prep_shares_select" on public.prep_shares
  for select using (auth.uid() = user_id);

create policy "prep_shares_insert" on public.prep_shares
  for insert with check (auth.uid() = user_id);

create policy "prep_shares_update" on public.prep_shares
  for update using (auth.uid() = user_id)
             with check (auth.uid() = user_id);

create policy "prep_shares_delete" on public.prep_shares
  for delete using (auth.uid() = user_id);

-- Public read path. Returns only the display name, the ids of completed
-- problems, and a 7-day count. Notes, review flags, and the user id are never exposed.
create or replace function public.get_public_prep_share(p_token text)
returns table (
  display_name text,
  completed_ids text[],
  solved_last_7d integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.display_name,
    coalesce(
      array_agg(p.task_id order by p.task_id) filter (where p.status = 'completed'),
      '{}'::text[]
    ),
    (count(*) filter (
      where p.status = 'completed' and p.completed_at >= now() - interval '7 days'
    ))::integer
  from public.prep_shares s
  left join public.study_task_progress p on p.user_id = s.user_id
  where s.token = p_token
  group by s.user_id, s.display_name;
$$;

revoke all on function public.get_public_prep_share(text) from public;
grant execute on function public.get_public_prep_share(text) to anon, authenticated;
