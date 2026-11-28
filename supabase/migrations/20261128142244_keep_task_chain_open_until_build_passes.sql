create or replace function public.office_complete_task(
  p_task uuid,p_worker text,p_content text,p_model text,
  p_report text default null,p_issues text[] default '{}'::text[],p_requires_build boolean default false
)
returns boolean language plpgsql security definer set search_path to 'public','pg_temp'
as $function$
declare t public.office_tasks; nm text; iss text;
begin
  if coalesce(btrim(p_content),'')='' then return false; end if;
  select * into t from public.office_tasks where id=p_task and status='in_progress' and locked_by=p_worker for update;
  if not found then return false; end if;
  insert into public.office_task_results(owner_id,task_id,version,content,model,build_status,build_error,build_updated_at)
  values(t.owner_id,t.id,t.version,p_content,p_model,case when p_requires_build then 'queued' else 'not_required' end,null,now())
  on conflict(task_id,version) do update set content=excluded.content,model=excluded.model,
    build_status=excluded.build_status,build_error=null,build_run_id=null,build_workflow_url=null,
    build_branch=null,build_commit_sha=null,build_updated_at=now();
  if not exists(select 1 from public.office_task_results where task_id=t.id and version=t.version) then return false; end if;
  update public.office_tasks set status='submitted',progress=1,progress_kind='ai_generated',completed_at=now(),
    locked_by=null,locked_at=null,last_error=null,updated_at=now() where id=t.id;
  select name into nm from public.office_employees where owner_id=t.owner_id and idx=t.employee_idx;
  insert into public.office_reports(owner_id,task_id,employee_idx,kind,body)
  values(t.owner_id,t.id,t.employee_idx,'final',coalesce(nullif(btrim(p_report),''),'Hasil tugas "'||t.title||'" tersimpan dan menunggu tinjauan.'));
  foreach iss in array coalesce(p_issues,'{}') loop
    if coalesce(btrim(iss),'')<>'' then
      insert into public.office_reports(owner_id,task_id,employee_idx,kind,body)
      values(t.owner_id,t.id,t.employee_idx,'issue','Kendala/catatan: '||iss);
    end if;
  end loop;
  insert into public.office_activity(owner_id,employee_idx,task_id,kind,message)
  values(t.owner_id,t.employee_idx,t.id,'submitted',coalesce(nm,'Karyawan')||' mengirim hasil "'||t.title||'" (v'||t.version||')');
  if t.chain_id is not null and not exists (
    select 1 from public.office_tasks x where x.chain_id=t.chain_id and (
      x.status not in ('submitted','approved')
      or exists (select 1 from public.office_task_results result where result.task_id=x.id and result.version=x.version and result.build_status not in ('not_required','passed'))
    )
  ) then update public.office_task_chains set status='completed',updated_at=now() where id=t.chain_id; end if;
  return true;
end
$function$;
