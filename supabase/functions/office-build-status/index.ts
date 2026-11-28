import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const githubToken = Deno.env.get('GITHUB_ACTIONS_TOKEN') ?? '';
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Gunakan POST.' }, 405);
  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Login diperlukan.' }, 401);
    const userClient = createClient(url, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return reply({ error: 'Sesi login tidak valid.' }, 401);
    if (!githubToken) return reply({ error: 'Integrasi GitHub Actions belum dikonfigurasi di server.' }, 503);

    const body = await req.json().catch(() => ({}));
    const taskId = typeof body.task_id === 'string' ? body.task_id : '';
    const version = Number.isInteger(body.version) && body.version > 0 ? body.version : null;
    if (!taskId || !version) return reply({ error: 'task_id dan version wajib diisi.' }, 400);

    const ownerId = authData.user.id;
    const { data: task } = await admin.from('office_tasks')
      .select('id,owner_id,employee_idx,title,attempts,chain_id')
      .eq('id', taskId).eq('owner_id', ownerId).maybeSingle();
    if (!task) return reply({ error: 'Tugas tidak ditemukan.' }, 404);

    const { data: result } = await admin.from('office_task_results')
      .select('id,build_status,build_run_id,build_workflow_url,build_branch,build_commit_sha,build_error')
      .eq('task_id', taskId).eq('owner_id', ownerId).eq('version', version).maybeSingle();
    if (!result) return reply({ error: 'Versi hasil tidak ditemukan.' }, 404);

    const { data: build } = await admin.from('office_build_runs')
      .select('*').eq('owner_id', ownerId).eq('task_id', taskId).eq('version', version)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!build) return reply({ ok: true, status: result.build_status || 'not_required', message: 'Belum ada proses build untuk versi ini.' });

    let runId = build.github_run_id as number | null;
    let run: any = null;
    const headers = { Authorization: 'Bearer ' + githubToken, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (!runId) {
      const listResponse = await fetch('https://api.github.com/repos/harozero91-arch/Zore-ai/actions/runs?event=workflow_dispatch&branch=main&per_page=30', {
        headers, signal: AbortSignal.timeout(12000),
      });
      if (listResponse.ok) {
        const list = await listResponse.json();
        run = (list.workflow_runs || []).find((item: any) =>
          String(item.display_title || '').includes(taskId) &&
          String(item.display_title || '').includes('v' + version));
        if (run?.id) runId = Number(run.id);
      }
    }
    if (runId) {
      const runResponse = await fetch('https://api.github.com/repos/harozero91-arch/Zore-ai/actions/runs/' + runId, {
        headers, signal: AbortSignal.timeout(12000),
      });
      if (!runResponse.ok) return reply({ error: 'GitHub belum dapat membaca status build.', detail: (await runResponse.text()).slice(0, 250) }, 502);
      run = await runResponse.json();
    }
    if (!run) return reply({ ok: true, status: 'queued', message: 'GitHub Actions sedang menyiapkan runner.', log_url: build.log_url });

    let status = 'queued';
    if (run.status === 'in_progress') status = 'in_progress';
    if (run.status === 'completed') status = run.conclusion === 'success' ? 'passed' : run.conclusion === 'cancelled' ? 'cancelled' : 'failed';

    let errorMessage: string | null = null;
    let failedSteps: string[] = [];
    if (status === 'failed' || status === 'cancelled') {
      const jobsResponse = await fetch('https://api.github.com/repos/harozero91-arch/Zore-ai/actions/runs/' + run.id + '/jobs?per_page=30', {
        headers, signal: AbortSignal.timeout(12000),
      });
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        failedSteps = (jobsData.jobs || []).flatMap((job: any) =>
          (job.steps || []).filter((step: any) => step.conclusion === 'failure')
            .map((step: any) => job.name + ' / ' + step.name));
      }
      errorMessage = 'GitHub Actions ' + (run.conclusion || 'gagal') +
        (failedSteps.length ? ': ' + failedSteps.join('; ') : '. Buka log workflow untuk rincian.');
    }

    const logUrl = run.html_url || build.log_url;
    // The scheduled office-build-monitor is the single writer for persisted build state
    // and retry decisions. This endpoint is read-only so browser refreshes cannot race it.
    return reply({
      ok: true, status, conclusion: run.conclusion, run_id: Number(run.id),
      log_url: logUrl, branch: build.branch, preview_url: build.preview_url || null,
      commit_sha: run.head_sha || build.commit_sha, error: errorMessage,
      failed_steps: failedSteps,
    });
  } catch (error) {
    console.error('office-build-status error', error);
    return reply({ error: 'Gagal membaca status build.' }, 500);
  }
});
