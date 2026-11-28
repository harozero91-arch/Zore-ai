import { createClient } from 'npm:@supabase/supabase-js@2';

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

function inspectSource(name: string, content: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const checks: { name: string; passed: boolean; note: string }[] = [];
  if (ext === 'html') {
    checks.push({ name: 'doctype', passed: /<!doctype\s+html/i.test(content), note: 'Deklarasi HTML5' });
    checks.push({ name: 'html-root', passed: /<html\b/i.test(content) && /<\/html\s*>/i.test(content), note: 'Elemen HTML pembuka dan penutup' });
    checks.push({ name: 'body', passed: /<body\b/i.test(content) && /<\/body\s*>/i.test(content), note: 'Elemen body pembuka dan penutup' });
    checks.push({ name: 'head', passed: /<head\b/i.test(content) && /<\/head\s*>/i.test(content), note: 'Elemen head pembuka dan penutup' });
  } else if (ext === 'json') {
    let valid = true;
    try { JSON.parse(content); } catch { valid = false; }
    checks.push({ name: 'json-parse', passed: valid, note: 'Sintaks JSON dapat diparse' });
  } else if (ext === 'svg') {
    checks.push({ name: 'svg-root', passed: /<svg\b/i.test(content) && /<\/svg\s*>/i.test(content), note: 'Elemen SVG pembuka dan penutup' });
  } else {
    checks.push({ name: 'non-empty', passed: content.trim().length > 0, note: 'File tidak kosong' });
  }
  const passed = checks.every(x => x.passed);
  return { level: 'static', status: passed ? 'passed' : 'needs_review', checks, disclaimer: 'Pemeriksaan struktur statis; build dan validasi runtime ditampilkan terpisah.' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Gunakan POST.' }, 405);
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return reply({ error: 'Sesi login diperlukan.' }, 401);
    const userClient = createClient(url, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData.user) return reply({ error: 'Sesi login tidak valid.' }, 401);
    const ownerId = userData.user.id;
    const body = await req.json().catch(() => ({}));
    const taskId = typeof body.task_id === 'string' ? body.task_id : '';
    const version = Number.isInteger(body.version) && body.version > 0 ? body.version : null;
    if (!taskId || version === null) return reply({ error: 'task_id dan version wajib diisi.' }, 400);

    const { data: result, error: resultError } = await admin.from('office_task_results')
      .select('id,task_id,owner_id,version,file_name,content_type,storage_path,created_at,build_status,build_error,build_workflow_url,build_branch,build_commit_sha')
      .eq('owner_id', ownerId).eq('task_id', taskId).eq('version', version).maybeSingle();
    if (resultError) throw resultError;
    if (!result) return reply({ error: 'Versi hasil tidak ditemukan.' }, 404);

    let mainFile: any = null;
    if (result.storage_path && result.file_name) {
      if (!result.storage_path.startsWith(ownerId + '/' + taskId + '/')) return reply({ error: 'Lokasi file tidak valid.' }, 403);
      const { data: download, error: downloadError } = await admin.storage.from('zore-work-results')
        .createSignedUrl(result.storage_path, 900, { download: result.file_name });
      if (downloadError) throw downloadError;
      const { data: preview, error: previewError } = await admin.storage.from('zore-work-results')
        .createSignedUrl(result.storage_path, 900);
      if (previewError) throw previewError;
      mainFile = {
        name: result.file_name, content_type: result.content_type, download_url: download.signedUrl,
        preview_url: result.build_status === 'passed' && (result.content_type?.startsWith('text/html') || result.content_type?.startsWith('image/') || result.content_type?.startsWith('video/') || result.content_type?.startsWith('audio/')) ? preview.signedUrl : null,
      };
    }

    const { data: rows, error: rowsError } = await admin.from('office_task_artifacts')
      .select('id,relative_path,file_name,content_type,storage_path,size_bytes,sha256,version,created_at')
      .eq('owner_id', ownerId).eq('task_id', taskId).eq('result_id', result.id)
      .order('relative_path', { ascending: true });
    if (rowsError) throw rowsError;

    const artifacts = [];
    for (const row of rows || []) {
      if (!row.storage_path.startsWith(ownerId + '/' + taskId + '/')) continue;
      const { data: download, error: downloadError } = await admin.storage.from('zore-work-results')
        .createSignedUrl(row.storage_path, 900, { download: row.file_name });
      if (downloadError) throw downloadError;
      let previewUrl: string | null = null;
      if (result.build_status === 'passed' && (['text/html','image/svg+xml','image/png','image/jpeg','image/gif','image/webp','video/mp4','audio/wav'].includes(row.content_type))) {
        const { data: preview, error: previewError } = await admin.storage.from('zore-work-results')
          .createSignedUrl(row.storage_path, 900);
        if (previewError) throw previewError;
        previewUrl = preview.signedUrl;
      }
      artifacts.push({
        id: row.id, path: row.relative_path, name: row.file_name, content_type: row.content_type,
        size_bytes: row.size_bytes, sha256: row.sha256, download_url: download.signedUrl, preview_url: previewUrl,
      });
    }

    const { data: builds, error: buildError } = await admin.from('office_build_runs')
      .select('status,workflow_name,github_run_id,branch,commit_sha,preview_url,error_message,log_url,started_at,finished_at,created_at,details')
      .eq('owner_id', ownerId).eq('task_id', taskId).eq('version', version)
      .order('created_at', { ascending: false }).limit(10);
    if (buildError) throw buildError;

    let validation: any = null;
    if (result.storage_path) {
      const { data: fileBlob, error: fileError } = await admin.storage.from('zore-work-results').download(result.storage_path);
      if (!fileError && fileBlob) validation = inspectSource(result.file_name, await fileBlob.text());
    }
    const latestBuild: any = (builds || [])[0] || null;
    const previewBase = latestBuild?.preview_url ? new URL('.', latestBuild.preview_url).toString() : null;
    const mediaExports = previewBase ? {
      preview_gif: new URL('animation-preview.gif', previewBase).toString(),
      mp4: new URL('animation.mp4', previewBase).toString(),
      storyboard: new URL('storyboard.png', previewBase).toString(),
      audio: new URL('sound.wav', previewBase).toString(),
    } : null;
    if (mediaExports) {
      const exports = [
        { path: 'animation-preview.gif', name: 'Pratinjau animasi GIF', content_type: 'image/gif', url: mediaExports.preview_gif },
        { path: 'animation.mp4', name: 'Video animasi MP4', content_type: 'video/mp4', url: mediaExports.mp4 },
        { path: 'storyboard.png', name: 'Storyboard PNG', content_type: 'image/png', url: mediaExports.storyboard },
        { path: 'sound.wav', name: 'Efek suara WAV', content_type: 'audio/wav', url: mediaExports.audio },
      ];
      for (const item of exports) artifacts.push({
        id: 'generated-' + item.path, path: item.path, name: item.name, content_type: item.content_type,
        size_bytes: null, sha256: null, download_url: item.url,
        preview_url: item.content_type === 'image/gif' ? item.url : null,
      });
      if (mainFile) (mainFile as any).animation_preview_url = mediaExports.preview_gif;
    }
    return reply({
      ok: true,
      task_id: taskId, version,
      build: { status: result.build_status, error: result.build_error, workflow_url: result.build_workflow_url, branch: result.build_branch, commit_sha: result.build_commit_sha, preview_url: latestBuild?.preview_url ?? null, media_exports: mediaExports },
      file: mainFile,
      validation,
      artifacts,
      build_runs: builds || [],
    });
  } catch (error) {
    console.error('office-artifact error', error);
    return reply({ error: 'Tidak dapat menyiapkan file hasil saat ini.' }, 500);
  }
});
