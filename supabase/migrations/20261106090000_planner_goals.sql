-- Editable daily goals: one row per goal instead of three fixed columns on planner_preferences.
-- Applications is built in (counted from the applications table); every other goal is a manual counter.
-- The old goal_* preference columns stay for now so this change can be rolled back.

create table public.planner_goals (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  key         text        not null check (key ~ '^[a-z0-9_]{1,40}$'),
  label       text        not null check (char_length(label) between 1 and 30),
  target      integer     not null default 1 check (target between 0 and 100),
  sort        integer     not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, key)
);
create index planner_goals_user_idx on public.planner_goals (user_id, sort);

alter table public.planner_goals enable row level security;
create policy planner_goals_select on public.planner_goals for select using (auth.uid() = user_id);
create policy planner_goals_insert on public.planner_goals for insert with check (auth.uid() = user_id);
create policy planner_goals_update on public.planner_goals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy planner_goals_delete on public.planner_goals for delete using (auth.uid() = user_id);

create trigger handle_updated_at_planner_goals
  before update on public.planner_goals
  for each row execute procedure extensions.moddatetime(updated_at);

-- Keep each existing user's three goals and targets.
insert into public.planner_goals (user_id, key, label, target, sort)
select user_id, 'applications', 'Applications', goal_applications, 0 from public.planner_preferences
union all
select user_id, 'connections', 'Connections', goal_connections, 1 from public.planner_preferences
union all
select user_id, 'followups', 'Follow-ups', goal_followups, 2 from public.planner_preferences;

-- Logs may now use any goal key, not just the two fixed ones.
alter table public.planner_goal_logs drop constraint planner_goal_logs_goal_key_check;
alter table public.planner_goal_logs add constraint planner_goal_logs_goal_key_check
  check (goal_key ~ '^[a-z0-9_]{1,40}$');
