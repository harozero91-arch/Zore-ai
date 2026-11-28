import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const githubToken = Deno.env.get('GITHUB_ACTIONS_TOKEN') ?? '';
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
});
const ghHeaders = {
  Authorization: 'Bearer ' + githubToken,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

async function monitorOne(build: any) {
  let runId = build.github_run_id as number | null;
  let run: any = null;
  if (!runId) {
    const listResponse = await fetch('https://api.github.com/repos/harozero91-arch/Zore-ai/actions/runs?event=workflow_dispatch&branch=main&per_page=30', {
      headers: ghHeaders, signal: AbortSignal.timeout(12000),
    });
    if (listResponse.ok) {
      const list = await listResponse.json();
      run = (list.workflow_runs || []).find((item: any) =>
        String(item.display_title || '').includes(build.task_id) &&
        String(item.display_title || '').includes('v' + build.version));
      if (run?.id) runId = Number(run.id);
    }
  }
  if (runId && !run) {
    const response = await fetch('https://api.github.com/repos/harozero91-arch/Zore-ai/actions/runs/' + runId, {
      headers: ghHeaders, signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error('GitHub run lookup HTTP ' + response.status);
    run = await response.json();
  }
  if (!run) return { id: build.id, status: 'queued', waiting: true };

  let status = 'queued';
  if (run.status === 'in_progress') status = 'in_progress';
  if (run.status === 'completed') status = run.conclusion === 'success' ? 'passed' : run.conclusion === 'cancelled' ? 'cancelled' : 'failed';

  const jobsResponse = await fetch('https://api.github.com/repos/harozero91-arch/Zore-ai/actions/runs/' + run.id + '/jobs?per_page=30', {
    headers: ghHeaders, signal: AbortSignal.timeout(12000),
  });
  let jobs: any[] = [];
  if (jobsResponse.ok) {
    const jobsData = await jobsResponse.json();
    jobs = (jobsData.jobs || []).map((job: any) => ({
      name: job.name, status: job.status, conclusion: job.conclusion,
      steps: (job.steps || []).map((step: any) => ({ name: step.name, status: step.status, conclusion: step.conclusion })),
    }));
  }
  const failedSteps = jobs.flatMap((job: any) => job.steps.filter((step: any) => step.conclusion === 'failure').map((step: any) => job.name + ' / ' + step.name));
  const errorMessage = status === 'failed' || status === 'cancelled'
    ? 'GitHub Actions ' + (run.conclusion || 'gagal') + (failedSteps.length ? ': ' + failedSteps.join('; ') : '. Buka log workflow untuk rincian.')
    : null;
  let previewUrl: string | null = build.preview_url || null;
  let previewLookupAttempts = Number(build.details?.preview_lookup_attempts || 0);
  let previewLookupComplete = !!build.details?.preview_lookup_complete;
  let artifactCommitSha: string | null = build.commit_sha || null;
  if (status === 'passed' && build.branch && !previewUrl && !previewLookupComplete) {
    previewLookupAttempts += 1;
    try {
      const refResponse = await fetch('https://api.github.com/repos/harozero91-arch/Zore-ai/git/ref/heads/' + encodeURIComponent(build.branch), {
        headers: ghHeaders, signal: AbortSignal.timeout(8000),
      });
      if (refResponse.ok) {
        const refData = await refResponse.json();
        artifactCommitSha = refData.object?.sha || artifactCommitSha;
      }
      const deploymentsResponse = await fetch('https://api.github.com/repos/harozero91-arch/Zore-ai/deployments?ref=' + encodeURIComponent(build.branch) + '&per_page=5', {
        headers: ghHeaders, signal: AbortSignal.timeout(8000),
      });
      if (deploymentsResponse.ok) {
        const deployments = await deploymentsResponse.json();
        for (const deployment of deployments || []) {
          const statusResponse = await fetch('https://api.github.com/repos/harozero91-arch/Zore-ai/deployments/' + deployment.id + '/statuses?per_page=10', {
            headers: ghHeaders, signal: AbortSignal.timeout(8000),
          });
          if (!statusResponse.ok) continue;
          const statuses = await statusResponse.json();
          const ready = (statuses || []).find((item:any) => item.state === 'success' && item.environment_url);
          if (ready?.environment_url) {
            previewUrl = new URL('/work-results/' + build.task_id + '/v' + build.version + '/animation-preview.gif', ready.environment_url).toString();
            break;
          }
        }
      }
    } catch (previewError) {
      console.warn('Vercel preview lookup pending', previewError);
    }
    if (previewLookupAttempts >= 30) previewLookupComplete = true;
  }
  const totalSteps = jobs.reduce((sum: number, job: any) => sum + job.steps.length, 0);
  const doneSteps = jobs.reduce((sum: number, job: any) => sum + job.steps.filter((step: any) => ['success','failure','cancelled','skipped'].includes(step.conclusion)).length, 0);
  const progress = totalSteps ? Math.round(doneSteps * 100 / totalSteps) : 0;
  const logUrl = run.html_url || build.log_url;
  const oldTerminal = ['passed','failed','cancelled'].includes(build.status);
  const update = {
    github_run_id: Number(run.id), status, branch: build.branch,
    commit_sha: artifactCommitSha || build.commit_sha || run.head_sha, preview_url:previewUrl,
    log_url: logUrl, error_message: errorMessage,
    started_at: run.run_started_at || build.started_at,
    finished_at: run.status === 'completed' ? run.updated_at : null,
    details: { ...(build.details || {}), jobs, progress_percent: progress, conclusion: run.conclusion, failed_steps: failedSteps,
      preview_lookup_attempts:previewLookupAttempts, preview_lookup_complete:previewLookupComplete },
    updated_at: new Date().toISOString(),
  };
  const { data: claimedUpdate, error: runError } = await admin.from('office_build_runs')
    .update(update).eq('id', build.id).eq('status', build.status).eq('updated_at', build.updated_at)
    .select('id').maybeSingle();
  if (runError) throw runError;
  if (!claimedUpdate) return { id: build.id, status: 'already_updated_by_another_monitor' };
  const { error: resultError } = await admin.from('office_task_results').update({
    build_status: status, build_run_id: Number(run.id), build_workflow_url: logUrl,
    build_branch: build.branch, build_commit_sha: build.commit_sha || run.head_sha,
    build_error: errorMessage, build_updated_at: new Date().toISOString(),
  }).eq('id', build.result_id).eq('owner_id', build.owner_id);
  if (resultError) throw resultError;

  if (status === 'passed') {
    const { data: taskForChain } = await admin.from('office_tasks').select('chain_id').eq('id',build.task_id).eq('owner_id',build.owner_id).maybeSingle();
    if (taskForChain?.chain_id) {
      const { data: stages } = await admin.from('office_tasks').select('id,status,version').eq('chain_id',taskForChain.chain_id);
      const stageIds = (stages || []).map((stage:any)=>stage.id);
      const { data: stageResults } = stageIds.length
        ? await admin.from('office_task_results').select('task_id,version,build_status').in('task_id',stageIds)
        : { data: [] };
      const latest = new Map<string,any>();
      for (const item of stageResults || []) latest.set(item.task_id+':'+item.version,item);
      const allReady = (stages || []).every((stage:any) =>
        ['submitted','approved'].includes(stage.status) &&
        ['not_required','passed'].includes(latest.get(stage.id+':'+stage.version)?.build_status));
      if (allReady) await admin.from('office_task_chains').update({status:'completed',updated_at:new Date().toISOString()}).eq('id',taskForChain.chain_id);
    }
  }

  if ((status === 'failed' || status === 'cancelled') && !oldTerminal) {
    const { data: task } = await admin.from('office_tasks').select('id,owner_id,employee_idx,title,attempts,chain_id,version')
      .eq('id', build.task_id).eq('owner_id', build.owner_id).maybeSingle();
    if (task) {
      const retry = Number(task.attempts || 0) < 3;
      await admin.from('office_tasks').update({
        status: retry ? 'revision' : 'failed',
        version: retry ? Number(task.version || build.version) + 1 : Number(task.version || build.version),
        revision_note: (errorMessage || 'Build gagal').slice(0,1000),
        last_error: (errorMessage || 'Build gagal').slice(0,500),
        progress: 0, progress_kind: 'ai_generated', updated_at: new Date().toISOString(),
      }).eq('id', task.id).eq('owner_id', task.owner_id);
      if (!retry && task.chain_id) {
        await admin.from('office_task_chains').update({ status:'failed', updated_at:new Date().toISOString() }).eq('id', task.chain_id);
      }
      await admin.from('office_reports').insert({
        owner_id: task.owner_id, task_id: task.id, employee_idx: task.employee_idx, kind:'issue',
        body:'Build otomatis gagal pada versi '+build.version+': '+(errorMessage || 'Tidak ada detail')+
          (retry?' Karyawan menerima tugas perbaikan otomatis; build akan diulang.':' Batas tiga percobaan tercapai; perlu pemeriksaan manajer.'),
      });
      await admin.from('office_activity').insert({
        owner_id: task.owner_id, employee_idx: task.employee_idx, task_id: task.id, kind:'build_failed',
        message:'Build gagal untuk '+task.title+'. '+(errorMessage || ''),
      });
    }
  }
  return { id: build.id, status, run_id: Number(run.id), progress_percent: progress, failed_steps: failedSteps };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return reply({ error: 'POST only' }, 405);
  try {
    const secret = req.headers.get('x-worker-secret') ?? '';
    if (!secret) return reply({ error: 'unauthorized' }, 401);
    const { data: authorized, error: authError } = await admin.rpc('office_worker_authorized', { p_secret: secret });
    if (authError || authorized !== true) return reply({ error: 'unauthorized' }, 401);
    if (!githubToken) return reply({ error: 'GITHUB_ACTIONS_TOKEN belum dikonfigurasi' }, 503);

    const { data: builds, error } = await admin.from('office_build_runs')
      .select('*').in('status', ['queued','in_progress','passed']).order('created_at', { ascending: true }).limit(50);
    if (error) throw error;
    const results = [];
    for (const build of (builds || []).filter((item:any) => item.status !== 'passed' || (!item.preview_url && !item.details?.preview_lookup_complete)).slice(0,20)) {
      try { results.push(await monitorOne(build)); }
      catch (err) { results.push({ id: build.id, status: build.status, error: err instanceof Error ? err.message : String(err) }); }
    }
    return reply({ ok: true, checked: results.length, results });
  } catch (error) {
    console.error('office-build-monitor error', error);
    return reply({ error: 'Gagal memantau build GitHub Actions.' }, 500);
  }
});
