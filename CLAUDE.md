# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Project overview

A full-stack internship search tracker, live in production. Users log applications and track status, keep a library of resume blocks and build tailored one-page resumes, work through a NeetCode 150 OA-prep list, and watch company careers pages for changes.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres + Auth + Realtime) · Vercel · TypeScript · Tailwind CSS v4 · shadcn/ui (Nova preset)

This is not the Next.js you know — read `AGENTS.md` and the relevant guide in `node_modules/next/dist/docs/` before framework-level changes.

## Before changing UI

Read **`DESIGN.md`** (design language, patterns, tables, status colors) and **`TASTE.md`** (review checklist) first. They are the source of truth for UI; do not restate their rules here. Workflow for UI work:

1. Inspect the current route, components, and data flow.
2. Show a visual mockup with fictional data first; do not change the site until the user picks an option.
3. Implement only what was picked, one surface at a time, reusing existing components and tokens.
4. Verify in the logged-in local browser: wide, narrow (390px), dark mode, plus empty/long-text cases.

## Common commands

```bash
npm run dev                # dev server at localhost:3000
npm run build              # production build
npm run lint               # ESLint (the repo-wide run is noisy from .claude/worktrees; lint touched files)
npx tsc --noEmit           # type check (there is no type-check script)
npm test                   # unit tests (tsx --test)
npm run test:e2e           # Playwright

# Supabase
npx supabase start | stop
npx supabase db reset                                        # local reset + re-run migrations
npx supabase gen types typescript --local > src/types/supabase.ts
npx supabase migration new <name>
npx supabase db push                                         # remote — only with explicit user approval
```

## Architecture

```
src/
  app/
    page.tsx              # marketing landing page (the only glass-styled page)
    (auth)/               # login, signup, forgot/reset password — split layout, no nav shell
    (dashboard)/          # protected pages inside DashboardShell (sidebar)
      dashboard/          # applications: stats funnel, weekly chart, table, upcoming
      prep/               # NeetCode 150 tracker
      watchlist/          # careers-page monitoring
      resumes/            # resume list + /resumes/[resumeId] editor
      resume-blocks/      # reusable block library
    api/
      cron/check-jobs/    # scheduled watchlist check (see vercel.json)
      extract-job/        # JD paste-to-autofill
  components/
    ui/                   # shadcn primitives
    features/             # domain components; resume-editor/ holds the editor
  lib/
    supabase/             # client.ts (browser singleton), server.ts (cookies)
    resume/               # editor domain logic, measurement, versions, export (unit-tested)
    prep/                 # NeetCode 150 data
    format/relative.ts    # relative day helpers (formatUntil / formatAgo)
    applications/         # next-event helper
  types/supabase.ts       # generated — never hand-edit
  proxy.ts                # Next.js 16 proxy (replaces middleware.ts): refreshes the session and guards /dashboard; the other (dashboard) pages redirect to /login themselves in their server component
supabase/migrations/      # schema source of truth
e2e/                      # Playwright specs
```

### Supabase integration pattern

- **Server Components / Route Handlers:** import from `lib/supabase/server.ts` (reads cookies via `next/headers`).
- **Client Components:** import from `lib/supabase/client.ts` (singleton browser client).
- **Auth:** email/password and Google via Supabase Auth; `@supabase/ssr` keeps the JWT in cookies. `proxy.ts` calls `supabase.auth.getUser()` on every request to refresh the token and guard protected routes.
- **RLS:** every table has RLS enabled; user data policies are `auth.uid() = user_id`. RLS is the security boundary.
- **Types:** import from `src/types/supabase.ts`; regenerate after any schema change and commit the result.
- Some resume operations go through Postgres RPC functions (e.g. `create_resume`, `update_resume_metadata`); `applications.submitted_resume_version_id` is writable only via `set_application_resume_version`.

### Data model

Tables (see `src/types/supabase.ts` and `supabase/migrations/` for columns): `applications`, `events`, `user_watchlist`, `url_snapshots`, `study_task_progress`, `user_field_options`, `resumes`, `resume_headers`, `resume_sections`, `resume_entries`, `resume_entry_bullets`, `resume_versions`, `resume_library_blocks`, `resume_library_bullets`.

Application status is one of `wishlist | applied | oa | interview | offer | rejected`.

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server-only; never expose to client
ANTHROPIC_API_KEY=           # /api/extract-job (server-only)
CRON_SECRET=                 # authorizes /api/cron/check-jobs (server-only)
```

`.env.local` for local dev; mirror in Vercel project settings for production.

## Key conventions

- App Router only — no `pages/` directory.
- Default to Server Components; add `"use client"` only for interactivity or browser APIs.
- All DB reads/writes go through the Supabase client — no custom API layer beyond the routes above.
- Migrations are the schema source of truth — never mutate the production DB directly.
- `updated_at` is maintained by a Postgres trigger (`moddatetime`), not application code.
- Preserve routes, Supabase behavior, data contracts, and business logic unless a task explicitly changes them.
- Use design tokens from `src/app/globals.css`, not hardcoded colors.

## Working agreements

- Do not start a next step, or touch the remote Supabase project, without explicit user approval.
- Do not add a `Co-Authored-By: Claude` trailer to commits or PRs.
- Commit only when asked, and only the files you changed.
- Mockups, screenshots, and demo pages use fictional data; remove temporary preview routes when done.
