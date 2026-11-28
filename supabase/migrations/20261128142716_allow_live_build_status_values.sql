alter table public.office_task_results drop constraint if exists office_task_results_build_status_check;
alter table public.office_task_results add constraint office_task_results_build_status_check
  check (build_status in ('not_required','queued','in_progress','passed','failed','skipped','cancelled'));
