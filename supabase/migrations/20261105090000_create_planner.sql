-- DayPilot planner tables. All prefixed planner_; existing tables are untouched.
-- Every table: user_id + RLS (auth.uid() = user_id). Times are timestamptz (UTC).

-- ─── planner_preferences (one row per user) ──────────────────────────────────
create table public.planner_preferences (
  user_id          uuid        primary key references auth.users(id) on delete cascade,
  timezone         text        not null default 'America/Los_Angeles',
  work_start       time        not null default '09:00',
  work_end         time        not null default '21:00',
  buffer_min       integer     not null default 10 check (buffer_min >= 0),
  starter_min      integer     not null default 15 check (starter_min > 0),
  deep_work_min    integer     not null default 60 check (deep_work_min > 0),
  deep_work_max    integer     not null default 90,
  top_n            integer     not null default 3  check (top_n between 1 and 10),
  goal_applications integer    not null default 5  check (goal_applications >= 0),
  goal_connections integer     not null default 5  check (goal_connections >= 0),
  goal_followups   integer     not null default 3   check (goal_followups >= 0),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (work_end > work_start),
  check (deep_work_max >= deep_work_min)
);

-- ─── planner_projects ────────────────────────────────────────────────────────
create table public.planner_projects (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  kind        text        not null default 'other'
                          check (kind in ('job_search','grad_school','coursework','internship','teaching','personal','other')),
  color       text,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index planner_projects_user_idx on public.planner_projects (user_id) where archived_at is null;

-- ─── planner_tasks ───────────────────────────────────────────────────────────
create table public.planner_tasks (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  project_id   uuid        references public.planner_projects(id) on delete set null,
  parent_id    uuid        references public.planner_tasks(id) on delete cascade,
  title        text        not null,
  notes        text,
  importance   smallint    not null default 2 check (importance between 1 and 3),
  estimate_min integer     check (estimate_min is null or estimate_min > 0),
  due_at       timestamptz,
  status       text        not null default 'todo'
                           check (status in ('todo','doing','done','dropped')),
  first_step   text,
  top3_date    date,       -- local date this task is pinned as a top priority
  source       text        not null default 'manual',
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index planner_tasks_user_status_idx on public.planner_tasks (user_id, status);
create index planner_tasks_user_top3_idx   on public.planner_tasks (user_id, top3_date) where top3_date is not null;
create index planner_tasks_user_due_idx    on public.planner_tasks (user_id, due_at) where due_at is not null;
create index planner_tasks_project_idx     on public.planner_tasks (project_id);

-- ─── planner_inbox_items ─────────────────────────────────────────────────────
create table public.planner_inbox_items (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  raw_text   text        not null,
  status     text        not null default 'new' check (status in ('new','triaged','discarded')),
  task_id    uuid        references public.planner_tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index planner_inbox_user_status_idx on public.planner_inbox_items (user_id, status, created_at);

-- ─── planner_blocks ──────────────────────────────────────────────────────────
create table public.planner_blocks (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  task_id    uuid        references public.planner_tasks(id) on delete cascade,
  title      text        not null,
  start_at   timestamptz not null,
  end_at     timestamptz not null,
  kind       text        not null default 'task' check (kind in ('task','starter','break')),
  status     text        not null default 'planned' check (status in ('planned','done','skipped')),
  locked     boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);
create index planner_blocks_user_time_idx on public.planner_blocks (user_id, start_at);
create index planner_blocks_task_idx      on public.planner_blocks (task_id);

-- ─── planner_calendar_events (manual for now; sync comes later) ──────────────
create table public.planner_calendar_events (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  title       text        not null,
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  all_day     boolean     not null default false,
  source      text        not null default 'manual',
  external_id text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_at > start_at),
  unique (user_id, source, external_id)
);
create index planner_calendar_events_user_time_idx on public.planner_calendar_events (user_id, start_at);

-- ─── planner_changes (append-only log; postpone counts are derived from it) ──
create table public.planner_changes (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  entity_type text        not null,
  entity_id   uuid        not null,
  action      text        not null
                          check (action in ('create','move','resize','postpone','complete','drop','pin','unpin')),
  before      jsonb,
  after       jsonb,
  reason      text,
  created_at  timestamptz not null default now()
);
create index planner_changes_entity_idx on public.planner_changes (user_id, entity_type, entity_id, created_at);

-- ─── planner_goal_logs (applications are counted from the applications table) ─
create table public.planner_goal_logs (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  goal_key   text        not null check (goal_key in ('connections','followups')),
  local_date date        not null,
  count      integer     not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, goal_key, local_date)
);

-- ─── Row-level security ──────────────────────────────────────────────────────
-- Every table is locked by default; each policy lets a signed-in user touch
-- only rows where user_id equals their own auth.uid().
alter table public.planner_preferences     enable row level security;
alter table public.planner_projects        enable row level security;
alter table public.planner_tasks           enable row level security;
alter table public.planner_inbox_items     enable row level security;
alter table public.planner_blocks          enable row level security;
alter table public.planner_calendar_events enable row level security;
alter table public.planner_changes         enable row level security;
alter table public.planner_goal_logs       enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'planner_preferences','planner_projects','planner_tasks','planner_inbox_items',
    'planner_blocks','planner_calendar_events','planner_goal_logs'
  ] loop
    execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', t || '_select', t);
    execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', t || '_insert', t);
    execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_update', t);
    execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', t || '_delete', t);
  end loop;
end $$;

-- planner_changes is append-only: select and insert only (no update, no delete).
create policy planner_changes_select on public.planner_changes
  for select using (auth.uid() = user_id);
create policy planner_changes_insert on public.planner_changes
  for insert with check (auth.uid() = user_id);

-- ─── updated_at triggers ─────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'planner_preferences','planner_projects','planner_tasks','planner_inbox_items',
    'planner_blocks','planner_calendar_events','planner_goal_logs'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute procedure extensions.moddatetime(updated_at)',
      'handle_updated_at_' || t, t);
  end loop;
end $$;
