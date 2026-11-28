alter table public.office_task_results
  add column if not exists build_status text not null default 'not_required',
  add column if not exists build_run_id bigint,
  add column if not exists build_workflow_url text,
  add column if not exists build_branch text,
  add column if not exists build_commit_sha text,
  add column if not exists build_error text,
  add column if not exists build_updated_at timestamptz,
  add column if not exists build_attempt integer not null default 0,
  add column if not exists files_manifest jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'office_task_results_build_status_check') then
    alter table public.office_task_results add constraint office_task_results_build_status_check
      check (build_status in ('not_required','queued','running','passed','failed','skipped','in_progress','cancelled'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'office_task_results_build_attempt_check') then
    alter table public.office_task_results add constraint office_task_results_build_attempt_check
      check (build_attempt >= 0 and build_attempt <= 3);
  end if;
end $$;

create table if not exists public.office_task_artifacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.office_tasks(id) on delete cascade,
  result_id uuid not null references public.office_task_results(id) on delete cascade,
  version integer not null check (version > 0),
  relative_path text not null check (char_length(relative_path) between 1 and 240),
  file_name text not null check (char_length(file_name) between 1 and 180),
  content_type text not null default 'application/octet-stream',
  storage_path text not null,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  sha256 text,
  created_at timestamptz not null default now(),
  unique (result_id, relative_path),
  unique (storage_path)
);

create index if not exists office_task_artifacts_task_version_idx
  on public.office_task_artifacts(task_id, version, created_at desc);

create table if not exists public.office_build_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.office_tasks(id) on delete cascade,
  result_id uuid not null references public.office_task_results(id) on delete cascade,
  version integer not null check (version > 0),
  workflow_name text not null,
  github_run_id bigint unique,
  status text not null default 'queued'
    check (status in ('queued','in_progress','passed','failed','cancelled')),
  branch text,
  commit_sha text,
  preview_url text,
  error_message text,
  log_url text,
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists office_build_runs_task_version_idx
  on public.office_build_runs(task_id, version, created_at desc);

alter table public.office_task_artifacts enable row level security;
alter table public.office_build_runs enable row level security;

drop policy if exists office_task_artifacts_owner_select on public.office_task_artifacts;
create policy office_task_artifacts_owner_select on public.office_task_artifacts
  for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists office_build_runs_owner_select on public.office_build_runs;
create policy office_build_runs_owner_select on public.office_build_runs
  for select to authenticated using (owner_id = (select auth.uid()));
