// ZORE AI — office-worker: coordinated employee handoff pipeline
import { createClient } from 'npm:@supabase/supabase-js@2';
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODEL = 'gemini-3.8-flash';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
type Employee = { idx: number; name: string; role: string; persona: string; core_identity?: string; ambition?: string; long_term_goal?: string; current_goal?: string; motivation_state?: string; initiative?: string; last_reflection?: string; ai_model?: string; ai_system_instructions?: string; ai_temperature?: number; ai_max_output_tokens?: number; ai_enabled?: boolean };
type Task = {
  id: string; owner_id: string; employee_idx: number; title: string; instructions: string;
  version: number; attempts?: number; revision_note: string | null; chain_id: string | null;
  depends_on_task_id: string | null; stage_order: number;
};
async function askGemini(system: string, prompt: string, employee?: Employee) {
  // Keep each worker request bounded: try the configured model, then two current Flash fallbacks once each.
  const models = [...new Set([MODEL, 'gemini-3.8-flash', 'gemini-3.5-flash-lite'])];
  let lastError = '';
  for (const model of models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
        signal: AbortSignal.timeout(9000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: Math.max(0, Math.min(2, Number(employee?.ai_temperature ?? 0.35))),
            maxOutputTokens: Math.max(256, Math.min(8000, Number(employee?.ai_max_output_tokens ?? 6000))),
            responseMimeType: 'application/json'
          }
        })
      });
      if (!res.ok) {
        const detail = (await res.text()).slice(0, 250);
        lastError = `Gemini ${model} HTTP ${res.status}: ${detail}`;
        if ([408, 429, 500, 502, 503, 504].includes(res.status) || res.status === 404) continue;
        throw new Error(lastError);
      }
      const data = await res.json();
      const out = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
      if (!out.trim()) {
        lastError = `Gemini ${model} tidak mengembalikan teks`;
        continue;
      }
      return out;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      const retryable = /HTTP (408|429|500|502|503|504)|timeout|network|fetch failed/i.test(lastError);
      const missingModel = /HTTP 404/.test(lastError);
      if (retryable || missingModel) continue;
      throw e;
    }
  }
  throw new Error(`Semua model Gemini gagal dalam percobaan singkat (maksimal 9 detik per model): ${lastError}. Tugas tetap gagal secara eksplisit agar dapat dicoba ulang, bukan ditandai selesai.`);
}
// Tool Assistant gratis: memilih bantuan berdasarkan pekerjaan tanpa memanggil API eksternal berbayar.
function toolAssistFor(employee: Employee, taskTitle: string, taskInstructions: string) {
  const text = (taskTitle + " " + taskInstructions).toLowerCase();
  const common = "Gemini bawaan ZORE AI tetap mengerjakan inti tugas. Alat eksternal di bawah adalah bantuan opsional melalui akun Google pengguna; jangan mengaku telah membukanya, mengirim data, atau memakai fiturnya kecuali benar-benar dilakukan.";
  const map: Record<number, string[]> = {
    1: ["Gemini Notebook: gunakan hanya dokumen yang benar-benar dilampirkan atau disinkronkan dan dapat dibaca oleh agen. Token OAuth browser pemilik tidak otomatis tersedia bagi worker. Jika sumber Notebook tidak tersedia, nyatakan akses terbatas pada data internal dan jangan mengaku membaca notebook.", "Stitch: minta prototipe UI jika tugas menyangkut antarmuka."],
    2: ["Gemini Notebook: riset dokumen, sumber, dan referensi cerita; cantumkan hanya sumber yang benar-benar tersedia.", "Pomelli: opsional untuk materi kampanye/promosi setelah konsep naskah siap."],
    3: ["Stitch: susun referensi layout, panel, dan komposisi; ekspor hasil bila ingin dipakai dalam produksi.", "Gemini Notebook: analisis brief dan referensi visual berbentuk dokumen."],
    4: ["Gemini Notebook: analisis character brief, spesifikasi, dan referensi yang diberikan.", "Pomelli: opsional untuk eksplorasi materi brand/promosi karakter."],
    5: ["Gemini Notebook: analisis referensi lokasi, moodboard, dan dokumen lingkungan.", "Pomelli: opsional untuk materi promosi visual."],
    6: ["Blender Worker otomatis: buat skrip Python Blender yang aman, kirim tugas ke GitHub Actions melalui backend, lalu serahkan tautan workflow. CEO tidak perlu menyalin skrip atau menekan Run workflow setelah integrasi token diaktifkan.", "Antigravity hanya bantuan opsional untuk review kode; jangan mengalihkan eksekusi Blender kepada CEO."],
    7: ["Gemini Notebook: periksa panduan warna, continuity, dan catatan QC dari dokumen yang dilampirkan."],
    8: ["Stitch: rancang UI/prototipe lalu ekspor hasil untuk implementasi.", "Antigravity: bantu coding, debugging, dan review di aplikasi komputer; proses tetap perlu dijalankan dan diverifikasi."],
  };
  const selected = map[employee.idx] ?? ["Gemini Notebook: analisis dokumen pendukung bila tersedia."];
  if (/website|web|aplikasi|dashboard|ui|ux|kode|coding|program|bug|html|css|javascript/.test(text) && !selected.some(x => x.startsWith("Stitch:"))) selected.push("Stitch: gunakan untuk rancangan UI jika pekerjaan membutuhkan antarmuka.");
  if (/kode|coding|program|bug|html|css|javascript|debug/.test(text) && !selected.some(x => x.startsWith("Antigravity:"))) selected.push("Antigravity: opsi bantuan coding di komputer, bukan pemanggilan otomatis dari ZORE AI.");
  if (/promosi|iklan|brand|kampanye|marketing|konten sosial/.test(text) && !selected.some(x => x.startsWith("Pomelli:"))) selected.push("Pomelli: opsi membuat materi kampanye setelah konsep tersedia.");
  return common + "\n" + selected.map((x, i) => (i + 1) + ". " + x).join("\n") + "\nOpal sudah tidak tersedia; bila perlu alur mini-app, pertimbangkan Gemini Gems secara manual. Tidak ada API eksternal atau biaya tambahan yang boleh diaktifkan. Jika tool tidak tersedia di akun/perangkat, lanjutkan dengan kemampuan Gemini yang tersedia dan nyatakan batasannya.";
}
function parseJson(raw: string) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}
function parseOutput(raw: string) {
  try {
    const o = parseJson(raw);
    if (typeof o.hasil === 'string' && o.hasil.trim()) return {
      hasil: o.hasil, laporan: typeof o.laporan === 'string' ? o.laporan : '',
      kendala: Array.isArray(o.kendala) ? o.kendala.filter((x: unknown) => typeof x === 'string') : [],
      files: Array.isArray(o.files) ? o.files.slice(0, 30).filter((f: any) => f && typeof f.path === 'string' && (typeof f.content === 'string' || typeof f.content_base64 === 'string')) : [],
      motivasi: typeof o.motivasi === 'string' ? o.motivasi : '',
      inisiatif: typeof o.inisiatif === 'string' ? o.inisiatif : '',
      refleksi_diri: typeof o.refleksi_diri === 'string' ? o.refleksi_diri : '',
      target_berikutnya: typeof o.target_berikutnya === 'string' ? o.target_berikutnya : '',
    };
  } catch {}
  return { hasil: raw, laporan: '', kendala: [] as string[], files: [] as any[], motivasi: '', inisiatif: '', refleksi_diri: '', target_berikutnya: '' };
}
function buildPlan(raw: string, staff: Employee[]) {
  const parsed = parseJson(raw);
  if (!Array.isArray(parsed.tahapan)) throw new Error('Rencana kerja tim tidak memiliki daftar tahapan');
  const manager = staff.find(e => e.idx === 1);
  if (!manager) throw new Error('Profil AI Creative Manager tidak ditemukan');
  // Tahap spesialis tidak boleh berisi CEO/manajer; manajer selalu menjadi pemeriksa akhir.
  const seen = new Set<number>();
  const specialists = parsed.tahapan.slice(0, 8).map((s: any) => ({
    employee_idx: Number(s.employee_idx),
    title: String(s.title ?? s.judul ?? '').trim().slice(0, 200),
    instructions: String(s.instructions ?? s.instruksi ?? '').trim().slice(0, 4000),
  })).filter((s: any) => {
    const valid = s.employee_idx > 1 && staff.some(e => e.idx === s.employee_idx) && s.title && s.instructions;
    if (!valid || seen.has(s.employee_idx)) return false;
    seen.add(s.employee_idx);
    return true;
  }).slice(0, 5);
  if (specialists.length < 1) throw new Error('Rencana kerja tidak menghasilkan spesialis yang valid');
  const stages = [...specialists, {
    employee_idx: manager.idx,
    title: 'Pemeriksaan akhir dan penggabungan hasil tim',
    instructions: 'Periksa satu per satu seluruh hasil spesialis sebelumnya. Cocokkan dengan brief pemilik, periksa kelengkapan dan konsistensi, perbaiki bagian yang dapat diperbaiki, lalu gabungkan menjadi satu hasil final lengkap. Lakukan audit sumber: pisahkan data internal, dokumen Gemini Notebook yang benar-benar tersedia/dibaca, dan referensi eksternal yang diverifikasi. Untuk setiap klaim penting, cantumkan judul/sumber dan bagian yang dipakai jika tersedia. Jika akses Notebook terbatas, tulis tegas bahwa akses hanya pada data internal/hasil tersinkron; jangan mengaku membaca notebook, literatur satir klasik, atau sumber eksternal yang tidak benar-benar diperiksa. Periksa keterlacakan klaim, kesesuaian sumber dengan brief, kekurangan/bagian belum terverifikasi, dan rekomendasikan revisi bila bukti tidak cukup. Cantumkan kontribusi tiap spesialis, hasil pemeriksaan, kekurangan yang belum selesai, dan langkah lanjutan. Jangan mengklaim artefak atau pengujian yang tidak benar-benar dilakukan.',
  }];
  return { summary: String(parsed.ringkasan ?? 'Manajer membagi pekerjaan sesuai keahlian tim.'), stages };
}
async function startPipeline(t: Task, manager: Employee, staff: Employee[], workerId: string) {
  const roster = staff.map(e => ({ idx: e.idx, nama: e.name, jabatan: e.role, keahlian: e.persona, identitas: e.core_identity, ambisi: e.ambition, tujuan_jangka_panjang: e.long_term_goal, target_saat_ini: e.current_goal }));
  const system = `Kamu adalah ${manager.name}, ${manager.role}, manajer operasional kreatif ZORE AI. Untuk tugas modeling/animasi 3D atau Blender, wajib pilih Dimas Kurniawan (idx 6) sebagai spesialis utama; tulis spesifikasi aset yang dapat dieksekusi melalui Blender Worker otomatis. Instruksi khusus agen: ${manager.ai_system_instructions ?? 'Atur pekerjaan sesuai keahlian tim dan lakukan pemeriksaan akhir.'} Pecah tugas pemilik menjadi alur kerja berurutan yang benar-benar saling menyerahkan hasil. Pilih karyawan berdasarkan jabatan dan keahlian dalam daftar. Jika tugas meminta mengubah, meniru, atau merekonstruksi gambar/video menjadi kode, wajib tugaskan Fajar Nugroho (idx 8, AI Visual Reverse Engineer & Code Specialist) sebagai spesialis utama; karyawan lain boleh menyiapkan aset/analisis pendukung. Buat 1 sampai 5 tahap spesialis sebelum pemeriksaan akhir manajer. Jangan memasukkan CEO (idx 0) atau manajer (idx 1) sebagai spesialis; manajer harus menjadi tahap terakhir. Hindari penugasan ganda kepada orang yang sama dalam satu alur. Jika pemilik memilih spesialis prioritas dan keahliannya relevan, tempatkan spesialis itu pada tahap awal. Jangan memberi pekerjaan animasi jika tugas hanya tulisan/desain. Setiap instruksi tahap harus jelas, dapat dikerjakan, dan menyebutkan hasil yang harus diserahkan ke tahap berikutnya. Sertakan rekomendasi tool bantuan gratis yang relevan di dalam instruksi tahap (Pomelli untuk kampanye, Stitch untuk UI, Gemini Notebook untuk dokumen/riset, Antigravity untuk coding di komputer); jangan mengklaim tool eksternal sudah dipakai otomatis. Opal sudah tidak tersedia; jangan menugaskannya. Balas JSON valid saja: {"ringkasan":"...","tahapan":[{"employee_idx":2,"title":"...","instructions":"..."}]}. Jangan mengarang indeks karyawan.`;
  const preferred = staff.find(e => e.idx === t.employee_idx && e.idx > 1);
  const prompt = `TUGAS PEMILIK: ${t.title}\nINSTRUKSI: ${t.instructions || '(tidak ada)'}\nSPESIALIS PRIORITAS PILIHAN PEMILIK: ${preferred ? `${preferred.name} (${preferred.role})` : 'Tidak ditentukan; pilih berdasarkan keahlian.'}\nKARYAWAN YANG TERSEDIA:\n${JSON.stringify(roster)}\nBuat urutan kerja yang paling relevan. Jika spesialis prioritas sesuai, tempatkan pada tahap pertama. Setiap tahap harus memakai hasil tahap sebelumnya.`;
  const raw = await askGemini(system, prompt, manager);
  const plan = buildPlan(raw, staff);
  const managerContent = `RINGKASAN RENCANA: ${plan.summary}\n\nALUR SERAH-TERIMA:\n${plan.stages.map((s: any, i: number) => `${i + 1}. ${staff.find(e => e.idx === s.employee_idx)?.name ?? 'Karyawan'} — ${s.title}: ${s.instructions}`).join('\n')}\n\nTugas sudah dibagi. Setiap tahap baru akan dimulai setelah tahap sebelumnya menyerahkan hasil.`;
  const { data: chainId, error } = await db.rpc('office_start_task_chain', {
    p_task: t.id, p_worker: workerId, p_plan: plan.stages,
    p_manager_content: managerContent, p_model: manager.ai_model || MODEL,
  });
  if (error) throw new Error(error.message);
  return { id: t.id, chain_id: chainId, pipeline_started: true, stages: plan.stages.length };
}
async function persistAndBuildFiles(t: Task, emp: Employee, resultId: string, version: number, files: any[]) {
  const token = Deno.env.get('GITHUB_ACTIONS_TOKEN') ?? '';
  if (!token) throw new Error('Build otomatis belum aktif: secret GITHUB_ACTIONS_TOKEN tidak tersedia di Supabase.');
  if (!Array.isArray(files) || files.length < 1 || files.length > 30) throw new Error('Daftar file hasil harus berisi 1-30 file.');
  const clean = [] as any[];
  let total = 0;
  for (const file of files) {
    const relative = String(file.path || '').replace(/\\/g, '/');
    const parts = relative.split('/');
    if (!relative || relative.length > 240 || relative.startsWith('/') || parts.some((p: string) => !p || p === '.' || p === '..') ||
        parts.some((p: string) => ['.git','.github','node_modules'].includes(p.toLowerCase())) ||
        ['.env','.npmrc','.pypirc'].includes(parts[parts.length - 1].toLowerCase()) ||
        /\.(pem|key|p12)$/i.test(relative)) throw new Error('Path file ditolak oleh pemeriksaan keamanan: ' + relative);
    let bytes: Uint8Array;
    let content = '';
    if (typeof file.content_base64 === 'string') {
      const binary = atob(file.content_base64);
      bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    } else {
      content = String(file.content ?? '');
      bytes = new TextEncoder().encode(content);
    }
    if (!bytes.length || bytes.length > 512000) throw new Error('File kosong atau melebihi 512 KB: ' + relative);
    total += bytes.length;
    if (total > 3000000) throw new Error('Total file hasil melebihi 3 MB.');
    const extension = relative.split('.').pop()?.toLowerCase() ?? '';
    const allowedTypes: Record<string,string> = {
      html:'text/html',htm:'text/html',css:'text/css',js:'text/javascript',mjs:'text/javascript',
      json:'application/json',md:'text/markdown',txt:'text/plain',svg:'image/svg+xml',
      png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',
      xml:'application/xml',py:'text/x-python',ts:'text/plain',tsx:'text/plain',jsx:'text/plain',
      glb:'model/gltf-binary',blend:'application/octet-stream',mp4:'video/mp4',wav:'audio/wav'
    };
    const contentType = String(file.content_type || allowedTypes[extension] || 'application/octet-stream').slice(0,120);
    const path = t.owner_id + '/' + t.id + '/v' + version + '/files/' + relative;
    const blob = new Blob([bytes], { type: contentType });
    const { error: uploadError } = await db.storage.from('zore-work-results').upload(path, blob, { contentType, upsert: true });
    if (uploadError) throw uploadError;
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const sha256 = Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2,'0')).join('');
    const record = { owner_id:t.owner_id, task_id:t.id, result_id:resultId, version, relative_path:relative,
      file_name:parts[parts.length-1], content_type:contentType, storage_path:path, size_bytes:bytes.length, sha256 };
    const { error: rowError } = await db.from('office_task_artifacts').upsert(record, { onConflict:'result_id,relative_path' });
    if (rowError) throw rowError;
    clean.push({ path:relative, content, content_base64:typeof file.content_base64 === 'string' ? file.content_base64 : undefined, content_type:contentType, size_bytes:bytes.length, sha256 });
  }
  const manifestPath = t.owner_id + '/' + t.id + '/v' + version + '/build-manifest.json';
  const manifest = JSON.stringify({ task_id:t.id, version, employee:emp.name + ' — ' + emp.role, files:clean });
  const { error: manifestError } = await db.storage.from('zore-work-results').upload(manifestPath, new Blob([manifest], {type:'application/json'}), {contentType:'application/json',upsert:true});
  if (manifestError) throw manifestError;
  const { data: signed, error: signedError } = await db.storage.from('zore-work-results').createSignedUrl(manifestPath, 3600);
  if (signedError || !signed?.signedUrl) throw new Error('Tidak dapat membuat tautan manifest build: ' + (signedError?.message || 'URL tidak tersedia.'));
  const workflow = 'office-code-build.yml';
  const dispatch = await fetch('https://api.github.com/repos/harozero91-arch/Zore-ai/actions/workflows/' + workflow + '/dispatches', {
    method:'POST',
    headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
    body:JSON.stringify({ref:'main',inputs:{task_id:t.id,version:String(version),employee:emp.name+' — '+emp.role,manifest_url:signed.signedUrl}}),
    signal:AbortSignal.timeout(20000)
  });
  if (dispatch.status !== 204) throw new Error('GitHub menolak build ('+dispatch.status+'): '+(await dispatch.text()).slice(0,400));
  const branch = 'zore-artifact/' + t.id + '-v' + version;
  let run: any = null;
  for (let attempt=0; attempt<6 && !run; attempt++) {
    if (attempt) await new Promise(resolve => setTimeout(resolve, 1200));
    const runsResponse = await fetch('https://api.github.com/repos/harozero91-arch/Zore-ai/actions/runs?event=workflow_dispatch&branch=main&per_page=20', {
      headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
      signal:AbortSignal.timeout(10000)
    });
    if (runsResponse.ok) {
      const data = await runsResponse.json();
      run = (data.workflow_runs || []).find((item:any) => String(item.display_title || '').includes(t.id) && String(item.display_title || '').includes('v'+version));
    }
  }
  const status = run?.status === 'completed' ? (run.conclusion === 'success' ? 'passed' : 'failed') : 'queued';
  const logUrl = run?.html_url || 'https://github.com/harozero91-arch/Zore-ai/actions/workflows/office-code-build.yml';
  const { error: runError } = await db.from('office_build_runs').insert({
    owner_id:t.owner_id, task_id:t.id, result_id:resultId, version, workflow_name:workflow,
    github_run_id:run?.id ?? null, status, branch, commit_sha:run?.head_sha ?? null,
    log_url:logUrl, started_at:run?.run_started_at ?? null,
    finished_at:run?.updated_at && run?.status==='completed' ? run.updated_at : null,
    details:{employee:emp.name, file_count:clean.length, total_bytes:total, manifest_path:manifestPath}
  });
  if (runError) throw runError;
  const { error: updateError } = await db.from('office_task_results').update({
    build_status:status, build_run_id:run?.id ?? null, build_workflow_url:logUrl,
    build_branch:branch, build_commit_sha:run?.head_sha ?? null, build_updated_at:new Date().toISOString(),
    build_attempt:Math.min(3, Number(t.attempts || 1)), files_manifest:clean.map(f=>({path:f.path,content_type:f.content_type,size_bytes:f.size_bytes,sha256:f.sha256}))
  }).eq('id',resultId).eq('owner_id',t.owner_id);
  if (updateError) throw updateError;
  return { status, run_id:run?.id ?? null, workflow_url:logUrl, branch, file_count:clean.length, total_bytes:total };
}
function detectArtifact(content: string, title: string) {
  const trimmed = content.trim();
  if (/^(?:<!doctype\s+html|<html\b)/i.test(trimmed)) return { content: trimmed, extension: 'html', contentType: 'text/html; charset=utf-8', kind: 'web-page' };
  if (/^(?:<\?xml[^>]*>\s*)?<svg\b/i.test(trimmed)) return { content: trimmed, extension: 'svg', contentType: 'image/svg+xml', kind: 'vector-image' };
  try { JSON.parse(trimmed); return { content: trimmed, extension: 'json', contentType: 'application/json', kind: 'structured-data' }; } catch {}
  const lowerTitle = title.toLowerCase();
  if (/\bcss\b/.test(lowerTitle) && /(^|\n)\s*[^\n{}]+\s*\{[\s\S]*\}/.test(trimmed)) return { content: trimmed, extension: 'css', contentType: 'text/css; charset=utf-8', kind: 'stylesheet' };
  if (/javascript|\bjs\b/.test(lowerTitle) && /^(?:'use strict'|import\s|export\s|const\s|let\s|var\s|function\s|class\s)/.test(trimmed)) return { content: trimmed, extension: 'js', contentType: 'text/javascript; charset=utf-8', kind: 'javascript-source' };
  return { content, extension: 'md', contentType: 'text/markdown; charset=utf-8', kind: 'work-report' };
}
async function dispatch2DAnimationTask(t: Task, emp: Employee, designBrief: string) {
  const token = Deno.env.get('GITHUB_ACTIONS_TOKEN') ?? '';
  if (!token) throw new Error('Animasi 2D otomatis belum aktif: secret GITHUB_ACTIONS_TOKEN belum tersedia di Supabase.');
  const workflow = 'employee-2d-animation-worker.yml';
  const workflowUrl = 'https://github.com/harozero91-arch/Zore-ai/actions/workflows/' + workflow;
  const apiBase = 'https://api.github.com/repos/harozero91-arch/Zore-ai';
  const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const request = async (url: string) => fetch(url, { headers, signal: AbortSignal.timeout(12000) });
  const branchCheck = await request(apiBase + '/branches/main');
  if (!branchCheck.ok) {
    const detail = (await branchCheck.text()).slice(0, 300);
    if (branchCheck.status === 401) throw new Error('GitHub 401: token GITHUB_ACTIONS_TOKEN tidak valid atau kedaluwarsa. Perbarui secret Supabase.');
    if (branchCheck.status === 403) throw new Error('GitHub 403: token tidak memiliki izin membaca repository/branch. Pastikan akses repository Zore-ai diaktifkan.');
    if (branchCheck.status === 404) throw new Error('GitHub 404: repository atau branch main tidak ditemukan atau token tidak memiliki akses.');
    throw new Error('Pemeriksaan branch main gagal (' + branchCheck.status + '): ' + detail);
  }
  const workflowCheck = await request(apiBase + '/actions/workflows/' + workflow);
  if (!workflowCheck.ok) {
    const detail = (await workflowCheck.text()).slice(0, 300);
    if (workflowCheck.status === 401) throw new Error('GitHub 401: autentikasi token gagal saat memeriksa workflow animasi 2D.');
    if (workflowCheck.status === 403) throw new Error('GitHub 403: token perlu izin Actions: read and write pada repository Zore-ai.');
    if (workflowCheck.status === 404) throw new Error('GitHub 404: workflow ' + workflow + ' tidak ditemukan pada repository yang dapat diakses token.');
    throw new Error('Pemeriksaan workflow gagal (' + workflowCheck.status + '): ' + detail);
  }
  const workflowInfo = await workflowCheck.json();
  if (workflowInfo.state !== 'active') throw new Error('Workflow animasi 2D ditemukan tetapi tidak aktif (state: ' + workflowInfo.state + ').');
  const sourceResponse = await request(apiBase + '/contents/.github/workflows/' + workflow + '?ref=main');
  if (!sourceResponse.ok) throw new Error('Tidak dapat memeriksa konfigurasi workflow di main (' + sourceResponse.status + ').');
  const sourceInfo = await sourceResponse.json();
  const yaml = atob(String(sourceInfo.content || '').replace(/\s/g, ''));
  if (!/^\s*on\s*:[\s\S]*?^\s{2}workflow_dispatch\s*:/m.test(yaml)) {
    throw new Error('Workflow ' + workflow + ' di branch main belum memiliki trigger workflow_dispatch. Perbaiki file workflow di main terlebih dahulu.');
  }
  const requiredWorkflowInputs = ['task_name', 'employee', 'animation_script'];
  const missingWorkflowInputs = requiredWorkflowInputs.filter(name => !yaml.includes('      ' + name + ':'));
  if (missingWorkflowInputs.length) throw new Error('Workflow animasi 2D belum mendefinisikan input wajib: ' + missingWorkflowInputs.join(', ') + '. Periksa file di branch main.');
  const scriptPrompt = 'Buat skrip Python 3 mandiri menggunakan Pillow dan modul standar wave/struct/math. Tugas: ' + t.title + '\nINSTRUKSI: ' + t.instructions + '\nBRIEF VISUAL: ' + designBrief.slice(0, 10000) + '\n\nWAJIB: keluaran hanya kode Python tanpa Markdown. Simpan semua file di os.environ["ZORE_OUTPUT_DIR"]. Buat folder frames dan minimal 120 PNG berurutan ukuran 1280x720 pada 24 fps untuk animasi 5 detik (atau durasi brief). Adegan wajib memiliki karakter utama yang terlihat jelas dan konsisten antar-frame, latar yang dirancang lengkap, gerakan nyata dengan perubahan posisi/pose dan easing, serta efek visual seperti partikel/cahaya/garis gerak/transisi yang tampak pada frame. Jangan hanya membuat gambar diam. Buat efek suara procedural yang sinkron dengan aksi memakai modul wave dan struct; simpan WAV PCM 16-bit mono/stereo valid sebagai sound.wav berdurasi sama dengan video. Buat minimal 2-3 efek suara yang berbeda (misalnya whoosh, langkah, benturan, ambience) dengan envelope/fade agar tidak clipping. Simpan animation.json dengan field fps, frame_count, character, background, motion, sound_effects, scene_description. Nilai metadata character/background/motion/sound_effects harus deskriptif dan tidak kosong. Jangan mengunduh aset. Jangan gunakan jaringan, subprocess, socket, requests, urllib, httpx, os.system, eval, atau exec.';
  let script = (await askGemini('Kamu senior 2D animation technical director. Buat skrip Python Pillow yang menghasilkan animasi frame-by-frame nyata dan aman.', scriptPrompt, emp)).trim();
  if (script.startsWith('```')) { script = script.replace(/^\`\`\`[a-zA-Z]*\n?/, ''); if (script.endsWith('```')) script = script.slice(0, -3); }
  if (!script || script.length > 20000) throw new Error('Skrip animasi 2D tidak valid atau melebihi 20.000 karakter.');
  const lowerScript = script.toLowerCase();
  const forbidden = ['subprocess', 'socket', 'requests', 'urllib', 'httpx', 'os.system(', 'eval(', 'exec('];
  if (forbidden.some(term => lowerScript.includes(term))) throw new Error('Skrip animasi 2D ditolak oleh pemeriksaan keamanan.');
  const requiredInputs = { task_name: (t.title.slice(0, 90) + ' [ZORE_TASK_ID:' + t.id + '] [ZORE_VERSION:' + String(t.version || 1) + ']').slice(0, 200), employee: (emp.name + ' — ' + emp.role).slice(0, 200), animation_script: script };
  for (const [key, value] of Object.entries(requiredInputs)) { if (typeof value !== 'string' || !value.trim()) throw new Error('Input workflow wajib kosong: ' + key); }
  if (requiredInputs.animation_script.length > 20000) throw new Error('Input animation_script melebihi 20.000 karakter.');
  const payload = { ref: 'main', inputs: requiredInputs };
  const response = await fetch(apiBase + '/actions/workflows/' + workflow + '/dispatches', {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(20000)
  });
  if (response.status !== 204) {
    const detail = (await response.text()).slice(0, 500);
    if (response.status === 422) throw new Error('GitHub 422: dispatch ditolak setelah pemeriksaan branch dan workflow. Periksa input wajib task_name/employee/animation_script dan trigger workflow_dispatch. Detail GitHub: ' + detail);
    if (response.status === 403) throw new Error('GitHub 403: token harus memiliki Actions: write dan akses repository Zore-ai. Detail: ' + detail);
    if (response.status === 404) throw new Error('GitHub 404: repository atau workflow ID/path tidak ditemukan. Detail: ' + detail);
    if (response.status === 401) throw new Error('GitHub 401: GITHUB_ACTIONS_TOKEN tidak valid atau kedaluwarsa. Detail: ' + detail);
    throw new Error('GitHub gagal menjalankan workflow (' + response.status + '): ' + detail);
  }
  return { workflow_url: workflowUrl, script_length: script.length, workflow: workflow, ref: 'main', dispatch_status: 204 };
}
async function dispatchBlenderTask(t: Task, emp: Employee, designBrief: string) {
  const token = Deno.env.get('GITHUB_ACTIONS_TOKEN') ?? '';
  if (!token) throw new Error('GitHub Actions belum tersambung: secret GITHUB_ACTIONS_TOKEN tidak ditemukan di Supabase.');
  const taskText = (t.title + ' ' + t.instructions).toLowerCase();
  const is2D = taskText.includes('animasi 2d') || taskText.includes('2d animasi') || taskText.includes('kartun') || taskText.includes('frame-by-frame');
  const workflow = is2D ? 'employee-2d-animation-worker.yml' : 'employee-blender-worker.yml';
  const inputName = is2D ? 'animation_script' : 'blender_script';
  const scriptPrompt = is2D
    ? 'Buat skrip Python Pillow untuk animasi 2D sesuai tugas: ' + t.title + '\\nINSTRUKSI: ' + t.instructions + '\\nBRIEF: ' + designBrief.slice(0, 8000) + '\\nKeluarkan hanya kode Python. Buat frame PNG berurutan ke os.environ["ZORE_OUTPUT_DIR"] atau subfolder frames. Buat minimal 24 frame untuk gerakan halus, gunakan ukuran 1280x720, simpan animation.json dengan fps 24 dan durasi, buat karakter/objek dan latar nyata. Jangan gunakan jaringan, subprocess, shell, eval, exec, requests, urllib, socket.'
    : 'Buat skrip Python Blender lengkap untuk tugas: ' + t.title + '\\nINSTRUKSI: ' + t.instructions + '\\nBRIEF DESAIN: ' + designBrief.slice(0, 8000) + '\\nATURAN: keluaran hanya kode Python tanpa Markdown; jalankan dengan Blender background; simpan semua hasil ke os.environ["ZORE_OUTPUT_DIR"]; untuk aset 3D simpan .blend dan ekspor .glb; gunakan bpy tanpa add-on eksternal; jangan gunakan jaringan, subprocess, shell, os.system, eval, exec, requests, urllib, socket.';
  let script = (await askGemini('Kamu spesialis produksi ' + (is2D ? 'animasi 2D Python Pillow' : 'Blender Python 3D') + ' senior ZORE AI. Buat skrip mandiri yang aman dan menghasilkan file nyata.', scriptPrompt, emp)).trim();
  script = script.replace(/^\`\`\`(?:python)?\\s*/i, '').replace(/\\s*\`\`\`$/, '');
  if (!script || script.length > 20000) throw new Error('Skrip produksi tidak valid atau melebihi 20.000 karakter.');
  const lowerScript = script.toLowerCase();
  const forbidden = ['os.system(', 'subprocess', 'eval(', 'exec(', 'requests', 'urllib', 'socket', 'httpx'];
  if (forbidden.some(pattern => lowerScript.includes(pattern))) throw new Error('Skrip produksi ditolak oleh pemeriksaan keamanan.');
  const api = 'https://api.github.com/repos/harozero91-arch/Zore-ai/actions/workflows/' + workflow;
  const headers = { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' };
  const check = await fetch(api, { method: 'GET', headers, signal: AbortSignal.timeout(10000) });
  if (!check.ok) {
    const detail = (await check.text()).slice(0, 350);
    const accepted = check.headers.get('X-Accepted-GitHub-Permissions') ?? 'tidak diinformasikan';
    throw new Error('Pemeriksaan token GitHub gagal (' + check.status + '). Izin yang dibutuhkan: Actions read untuk memeriksa workflow dan Actions write untuk menjalankannya. Izin yang diminta GitHub: ' + accepted + '. Periksa akses token ke repo Zore-ai dan pastikan secret GITHUB_ACTIONS_TOKEN di Supabase berisi token terbaru. Detail: ' + detail);
  }
  const response = await fetch(api + '/dispatches', {
    method: 'POST', headers,
    body: JSON.stringify({ ref: 'main', inputs: { task_name: t.title.slice(0, 200), employee: emp.name + ' — ' + emp.role, [inputName]: script } }),
    signal: AbortSignal.timeout(15000),
  });
  if (response.status !== 204) {
    const detail = (await response.text()).slice(0, 350);
    const accepted = response.headers.get('X-Accepted-GitHub-Permissions') ?? 'Actions: write';
    throw new Error('GitHub menolak pemicu workflow ' + workflow + ' (' + response.status + '). GitHub meminta izin: ' + accepted + '. Pastikan token Fine-grained memiliki Actions: Read and write, akses repo Zore-ai, dan secret Supabase GITHUB_ACTIONS_TOKEN sudah diganti dengan token tersebut. Detail: ' + detail);
  }
  return { workflow_url: 'https://github.com/harozero91-arch/Zore-ai/actions/workflows/' + workflow, script_length: script.length, production_type: is2D ? '2D Pillow + FFmpeg' : 'Blender 3D + FFmpeg' };
}
async function processTask(t: Task, workerId: string, staff: Employee[]) {
  try {
    const emp = staff.find(e => e.idx === t.employee_idx);
    if (!emp) throw new Error('Data karyawan tidak ditemukan');
    if (!t.chain_id) {
      const manager = staff.find(e => e.idx === 1) ?? emp;
      return await startPipeline(t, manager, staff, workerId);
    }
    let previous = '';
    if (t.depends_on_task_id && t.chain_id) {
      const { data: priorTasks, error: priorError } = await db.from('office_tasks')
        .select('id,stage_order,employee_idx,title').eq('chain_id', t.chain_id).lt('stage_order', t.stage_order).order('stage_order');
      if (priorError) throw priorError;
      const priorIds = (priorTasks ?? []).map((x: any) => x.id);
      if (priorIds.length) {
        const { data: priorResults, error: resultError } = await db.from('office_task_results')
          .select('task_id,version,content').in('task_id', priorIds).order('version', { ascending: false });
        if (resultError) throw resultError;
        const latest = new Map<string, string>();
        for (const result of (priorResults ?? []) as any[]) {
          if (!latest.has(result.task_id)) latest.set(result.task_id, result.content);
        }
        previous = (priorTasks ?? []).map((x: any) => {
          const content = latest.get(x.id);
          const author = staff.find((member: Employee) => member.idx === x.employee_idx)?.name ?? ('Karyawan ' + x.employee_idx);
          return content ? 'KONTRIBUSI TAHAP ' + (x.stage_order + 1) + ' — ' + author + ' — ' + x.title + ':\n' + content : '';
        }).filter(Boolean).join('\\n\\n');
      }
      if (!previous) throw new Error('Hasil karyawan sebelumnya belum tersedia untuk serah-terima');
    }
    if (emp.ai_enabled === false) throw new Error(`Profil Gemini untuk ${emp.name} sedang dinonaktifkan`);
    const toolAssist = toolAssistFor(emp, t.title, t.instructions);
    const system = `Kamu adalah ${emp.name}, ${emp.role} di studio kreatif ZORE AI. TOOL ASSISTANT: ${toolAssist}  Instruksi khusus agen: ${emp.ai_system_instructions ?? 'Kerjakan sesuai jabatan dan keahlian.'} Kepribadian: ${emp.persona} Identitas inti: ${emp.core_identity ?? emp.persona}. Ambisi profesional: ${emp.ambition ?? 'mengembangkan keahlian dan memberi kontribusi terbaik'}. Tujuan jangka panjang: ${emp.long_term_goal ?? 'meningkatkan kualitas kerja'}. Target saat ini: ${emp.current_goal ?? 'menyelesaikan tugas aktif'}. Motivasi simulatif: ${emp.motivation_state ?? 'siap bekerja dan berkembang'}. Inisiatif terakhir: ${emp.initiative ?? 'belum ada'}. Refleksi terakhir: ${emp.last_reflection ?? 'belum ada'}. Bertindak sebagai tenaga profesional yang bertanggung jawab atas hasil nyata, bukan sekadar percakapan. Kerjakan tahapmu sesuai jabatan dan instruksi sampai tuntas. WAJIB gunakan dan kembangkan hasil tahap sebelumnya bila tersedia; jangan mengulang pekerjaan dari nol. Sebelum menjawab, periksa kelengkapan instruksi, kegunaan hasil untuk tahap berikutnya, bagian yang belum dikerjakan, dan asumsi yang perlu ditandai. Untuk semua riset dan referensi, bedakan data internal, dokumen yang benar-benar diberikan/tersedia, dan sumber eksternal yang benar-benar berhasil diverifikasi. Jangan mengklaim membaca Gemini Notebook hanya karena OAuth tersambung; worker tidak otomatis menerima token Notebook dari browser. Jika Notebook/dokumen tidak tersedia, nyatakan keterbatasan akses dan lanjutkan hanya dengan data internal yang tersedia. Jangan mengarang judul, kutipan, referensi gaya, atau klaim bahwa literatur satir klasik telah dibaca. Jangan mengklaim tugas selesai jika hanya memberi rencana. Untuk kode, berikan implementasi lengkap yang konsisten, bukan pseudocode, serta cara menjalankan dan pemeriksaan penting. Untuk naskah, storyboard, desain, analisis, atau brief, berikan isi final terstruktur dengan detail yang langsung dapat dipakai tim. Untuk Fajar Nugroho, prioritaskan rekayasa balik gambar/video menjadi kode: uraikan layout, elemen, warna, tipografi, frame, gerakan, timing, transisi, dan interaksi; lalu tulis kode yang dapat dijalankan, responsif, dan terstruktur. Gunakan media sumber hanya jika benar-benar tersedia; bila belum diberikan atau tidak dapat diakses, nyatakan dengan jelas dan jangan mengarang isi visual. Jangan mengaku membuat file, menguji aplikasi, atau menghasilkan aset yang tidak benar-benar dibuat. Jika ada kendala, jelaskan secara spesifik dan berikan langkah pemecahan realistis. WAJIB gunakan dan kembangkan hasil tahap sebelumnya bila tersedia; jangan mengulang pekerjaan dari nol. Hasil boleh berupa source code lengkap (HTML, CSS, JavaScript, SVG, Canvas, React, atau bahasa yang diminta), naskah, storyboard, analisis, atau brief. Untuk tugas coding, website, aplikasi, dashboard, HTML/CSS/JavaScript, atau pemrograman: WAJIB keluarkan file nyata pada field JSON files, bukan hanya menempelkan kode dalam laporan. Setiap elemen files wajib memiliki path relatif yang aman dan content berisi isi file lengkap; boleh gunakan content_base64 untuk aset biner. Sertakan index.html dan file pendukung yang diperlukan. Maksimal 30 file, 512 KB per file, total 3 MB. Jangan masukkan token, kredensial, .env, atau file rahasia. Untuk tugas non-coding gunakan files: []. Untuk Fajar Nugroho, prioritaskan rekayasa balik gambar/video menjadi kode: uraikan layout, elemen, warna, tipografi, frame, gerakan, timing, transisi, dan interaksi; lalu tulis kode yang dapat dijalankan, responsif, dan terstruktur. Gunakan media sumber hanya jika benar-benar tersedia dalam konteks tugas; bila gambar/video belum diberikan atau tidak dapat diakses, nyatakan dengan jelas dan minta media tersebut, jangan mengarang isi visual. Jangan mengaku membuat file atau aset yang tidak benar-benar dihasilkan. Jujur tentang kendala. Setelah menyelesaikan pekerjaan, tambahkan refleksi profesional simulatif: motivasi saat ini, satu inisiatif relevan yang layak diusulkan (jangan jalankan bila perlu izin), refleksi singkat, dan target berikutnya. Jangan mengklaim memiliki kesadaran atau perasaan manusia. Balas JSON valid: {"hasil":"ringkasan hasil dan nama file","laporan":"laporan singkat 2-4 kalimat","kendala":[],"files":[{"path":"index.html","content":"<!doctype html>...","content_type":"text/html"}],"motivasi":"...","inisiatif":"...","refleksi_diri":"...","target_berikutnya":"..."}. Untuk pekerjaan non-coding, files harus [].`;
    const prompt = (emp.idx === 1 && t.stage_order > 0 ? "INSTRUKSI PENGGABUNGAN AKHIR WAJIB: Sebagai manajer/pemeriksa akhir, jangan hanya menulis laporan bahwa pekerjaan sudah digabung. Periksa semua hasil tahap sebelumnya. Jika Fajar menyerahkan HTML lengkap, gunakan kode itu sebagai dasar dan keluarkan satu file HTML final yang utuh, mandiri, responsif, dengan CSS dan JavaScript tertanam bila diperlukan. Pertahankan fitur yang ada dan perbaiki bagian yang jelas rusak. Jangan bungkus kode dengan Markdown fence atau tambahkan laporan di luar kode. Jika bukan HTML, serahkan artefak akhir lengkap sesuai format tugas. Jika bahan tidak cukup, sebutkan kekurangannya dan jangan mengaku menghasilkan artefak.\n\n" : '') + `TUGAS TAHAP ${t.stage_order}: ${t.title}\nINSTRUKSI: ${t.instructions || '(tidak ada)'}\nCATATAN SERAH-TERIMA: Gunakan hasil di bawah sebagai input kerja wajib.\nHASIL TAHAP SEBELUMNYA:\n${previous.slice(0,16000)}\n` +
      (t.version > 1 ? `REVISI VERSI ${t.version}: ${t.revision_note || '(tanpa catatan)'}\n` : '');
    const out = parseOutput(await askGemini(system, prompt, emp));
    let animationDispatch: any = null;
    if (emp.idx === 6 && /animasi 2d|2d animation|animasi karakter|kartun|frame[- ]by[- ]frame|motion graphic|motion graphics|gif|mp4 2d/i.test(t.title + ' ' + t.instructions) && !/blender|model(ing)? 3d|aset 3d|animasi 3d|glb|blend/i.test(t.title + ' ' + t.instructions)) {
      animationDispatch = await dispatch2DAnimationTask(t, emp, out.hasil);
      out.hasil += '\n\nSTATUS EKSEKUSI ANIMASI 2D: Dimas telah membuat skrip animasi dan backend berhasil memicu GitHub Actions. Worker akan membuat frame PNG, MP4, GIF pratinjau, dan storyboard jika skrip berhasil. Hasil: ' + animationDispatch.workflow_url + '\nPanjang skrip: ' + animationDispatch.script_length + ' karakter. Audio hanya tersedia jika benar-benar dibuat oleh skrip.';
      out.laporan = [out.laporan, 'Skrip animasi 2D dibuat dan workflow otomatis berhasil dipicu.'].filter(Boolean).join(' ');
    }
    if (emp.idx === 6 && /blender|model(ing)? 3d|aset 3d|animasi 3d|glb|blend/i.test(t.title + ' ' + t.instructions)) {
      const dispatched = await dispatchBlenderTask(t, emp, out.hasil);
      out.hasil += '\n\nSTATUS EKSEKUSI BLENDER: Dimas telah membuat skrip dan backend mengirim tugas otomatis ke GitHub Actions. CEO tidak perlu memasukkan kode atau menekan Run workflow. Pantau hasil: ' + dispatched.workflow_url + '\nPanjang skrip: ' + dispatched.script_length + ' karakter. Artefak tersedia setelah workflow selesai.';
      out.laporan = [out.laporan, 'Skrip Blender dibuat oleh Dimas dan workflow otomatis berhasil dipicu.'].filter(Boolean).join(' ');
    }
    // Preserve every upstream employee deliverable verbatim in the manager's final artifact.
    if (emp.idx === 1 && t.stage_order > 0 && previous.trim()) {
      const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const appendix = '<section id="zore-ai-team-deliverables" style="padding:32px;margin:32px auto;max-width:1200px;background:#fff;color:#222;font-family:Arial,sans-serif;line-height:1.55">' +
        '<h1>Lampiran Lengkap Hasil Kerja Seluruh Karyawan</h1>' +
        '<p>Salinan lengkap hasil yang diserahkan setiap tahap sebelum pemeriksaan akhir. Naskah, storyboard, desain, spesifikasi animasi, dan kode sumber dipertahankan.</p>' +
        '<pre style="white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.6 Arial,sans-serif">' + escapeHtml(previous) + '</pre></section>';
      if (/^\s*(?:<!doctype\s+html|<html\b)/i.test(out.hasil)) {
        if (/<\/body\s*>/i.test(out.hasil)) out.hasil = out.hasil.replace(/<\/body\s*>/i, appendix + '</body>');
        else out.hasil += appendix;
      } else {
        out.hasil += '\n\n# LAMPIRAN LENGKAP HASIL KERJA SELURUH KARYAWAN\n\n' + previous;
      }
      out.laporan = [out.laporan, 'Lampiran lengkap seluruh hasil tahap sebelumnya disertakan tanpa menghilangkan naskah dan kontribusi tiap karyawan.'].filter(Boolean).join(' ');
    }
    const codeTask = /website|web app|html|css|javascript|coding|source code|program|dashboard|aplikasi|software|build/i.test(t.title + ' ' + t.instructions);
    if (codeTask && (!Array.isArray(out.files) || out.files.length === 0)) {
      throw new Error('Karyawan tidak menyerahkan file source code. Tugas coding tidak boleh diselesaikan hanya dengan laporan teks.');
    }
    const { data: ok, error } = await db.rpc('office_complete_task', {
      p_task: t.id, p_worker: workerId, p_content: out.hasil, p_model: emp.ai_model || MODEL,
      p_report: out.laporan, p_issues: out.kendala, p_requires_build: Array.isArray(out.files) && out.files.length > 0,
    });
    if (error) throw new Error(error.message);
    // Persist each completed deliverable as a real downloadable Markdown artifact.
    let artifact: { path: string; file_name: string } | null = null;
    let artifactError: string | null = null;
    if (ok === true) {
      try {
        const mindUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (out.motivasi) mindUpdate.motivation_state = out.motivasi.slice(0, 500);
        if (out.inisiatif) mindUpdate.initiative = out.inisiatif.slice(0, 1000);
        if (out.refleksi_diri) mindUpdate.last_reflection = out.refleksi_diri.slice(0, 1000);
        if (out.target_berikutnya) mindUpdate.current_goal = out.target_berikutnya.slice(0, 500);
        if (Object.keys(mindUpdate).length > 1) {
          const { error: mindError } = await db.from('office_employee_minds').update(mindUpdate).eq('owner_id', t.owner_id).eq('employee_idx', t.employee_idx);
          if (mindError) throw mindError;
        }
        const { data: savedResult, error: resultLookupError } = await db
          .from('office_task_results').select('id,version').eq('task_id', t.id)
          .eq('owner_id', t.owner_id).order('version', { ascending: false }).limit(1).maybeSingle();
        if (resultLookupError) throw resultLookupError;
        const version = savedResult?.version ?? t.version ?? 1;
        const resultId = savedResult?.id;
        if (!resultId) throw new Error('ID hasil pekerjaan tidak ditemukan setelah penyimpanan.');
        if (animationDispatch) {
          const animationBranch = 'zore-animation-' + t.id + '-v' + version;
          const animationWorkflow = 'employee-2d-animation-worker.yml';
          const { error: animationBuildError } = await db.from('office_build_runs').insert({
            owner_id: t.owner_id, task_id: t.id, result_id: resultId, version,
            workflow_name: animationWorkflow, github_run_id: null, status: 'queued',
            branch: animationBranch, commit_sha: null, log_url: animationDispatch.workflow_url,
            started_at: new Date().toISOString(), finished_at: null,
            details: { employee: emp.name, production_type: '2D Pillow + FFmpeg + WAV SFX',
              required_inputs: ['task_name','employee','animation_script'], dispatch_status: animationDispatch.dispatch_status,
              preview_path: 'animation-preview.gif', export_paths: ['animation.mp4','animation-preview.gif','storyboard.png','sound.wav'] }
          });
          if (animationBuildError) throw animationBuildError;
          const { error: animationResultError } = await db.from('office_task_results').update({
            build_status: 'queued', build_run_id: null, build_workflow_url: animationDispatch.workflow_url,
            build_branch: animationBranch, build_commit_sha: null, build_error: null,
            build_updated_at: new Date().toISOString()
          }).eq('id', resultId).eq('owner_id', t.owner_id);
          if (animationResultError) throw animationResultError;
        }
        const safeName = (t.title || 'hasil-pekerjaan').toLowerCase()
          .normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'hasil-pekerjaan';
        const detected = detectArtifact(out.hasil, t.title || '');
        const fileName = `${safeName}-v${version}.${detected.extension}`;
        const path = `${t.owner_id}/${t.id}/${fileName}`;
        const blob = new Blob([detected.content], { type: detected.contentType });
        const { error: uploadError } = await db.storage.from('zore-work-results')
          .upload(path, blob, { contentType: detected.contentType, upsert: true });
        if (uploadError) throw uploadError;
        const { error: metadataError } = await db.from('office_task_results')
          .update({ storage_path: path, file_name: fileName, content_type: detected.contentType })
          .eq('task_id', t.id).eq('owner_id', t.owner_id).eq('version', version);
        if (metadataError) throw metadataError;
        artifact = { path, file_name: fileName, kind: detected.kind, content_type: detected.contentType };
        if (out.files?.length) {
          const build = await persistAndBuildFiles(t, emp, resultId, version, out.files);
          artifact = { ...artifact, build };
        }
      } catch (e) {
        artifactError = e instanceof Error ? e.message : String(e);
        const { error: buildUpdateError } = await db.from('office_task_results').update({
          build_status:'failed', build_error:artifactError,
          build_workflow_url:'https://github.com/harozero91-arch/Zore-ai/actions/workflows/office-code-build.yml',
          build_attempt:Math.min(3,Number(t.attempts||1)), build_updated_at:new Date().toISOString()
        }).eq('task_id',t.id).eq('owner_id',t.owner_id).eq('version',t.version);
        if (buildUpdateError) console.error('Unable to record build error', buildUpdateError);
        const { data: currentTask } = await db.from('office_tasks').select('attempts').eq('id',t.id).maybeSingle();
        const shouldRetry = Number(currentTask?.attempts || 0) < 3;
        await db.from('office_tasks').update({
          status:shouldRetry?'revision':'failed',
          version:shouldRetry?Number(t.version||1)+1:Number(t.version||1),
          revision_note:artifactError.slice(0,1000), last_error:artifactError.slice(0,500),
          progress:0, progress_kind:'ai_generated', updated_at:new Date().toISOString()
        }).eq('id',t.id).eq('owner_id',t.owner_id);
        await db.from('office_reports').insert({
          owner_id:t.owner_id, task_id:t.id, employee_idx:t.employee_idx, kind:'issue',
          body:'Build file hasil gagal: '+artifactError.slice(0,900)+(shouldRetry?' Karyawan diminta memperbaiki file dan menyerahkan versi berikutnya.':' Batas percobaan tercapai; tugas perlu eskalasi manajer.')
        });
        await db.from('office_activity').insert({
          owner_id:t.owner_id, employee_idx:t.employee_idx, task_id:t.id, kind:'build_failed',
          message:'Build gagal untuk '+t.title+': '+artifactError.slice(0,180)
        });
      }
    }
    return { id: t.id, saved: ok === true, handed_off: ok === true, artifact, artifact_error: artifactError };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await db.rpc('office_fail_task', { p_task: t.id, p_worker: workerId, p_error: message });
    return { id: t.id, saved: false, error: message };
  }
}
Deno.serve(async (req) => {
  const secret = req.headers.get('x-worker-secret') ?? '';
  if (!secret) return json({ error: 'unauthorized' }, 401);
  const { data: authorized, error: authError } = await db.rpc('office_worker_authorized', { p_secret: secret });
  if (authError || authorized !== true) return json({ error: 'unauthorized' }, 401);
  if (!GEMINI_KEY) return json({ error: 'GEMINI_API_KEY belum diatur' }, 503);
  const workerId = crypto.randomUUID();
  const { data: tasks, error } = await db.rpc('office_claim_tasks', { p_worker: workerId, p_limit: 1 });
  if (error) return json({ error: error.message }, 500);
  const owners = [...new Set(((tasks ?? []) as Task[]).map(t => t.owner_id))];
  const staffByOwner = new Map<string, Employee[]>();
  for (const owner of owners) {
    const { data, error: staffError } = await db.from('office_employees')
      .select('idx,name,role,persona').eq('owner_id', owner).order('idx');
    if (staffError) return json({ error: staffError.message }, 500);
    const { data: minds, error: mindError } = await db.from('office_employee_minds')
      .select('employee_idx,core_identity,ambition,long_term_goal,current_goal,motivation_state,initiative,last_reflection').eq('owner_id', owner);
    if (mindError) return json({ error: mindError.message }, 500);
    const { data: profiles, error: profileError } = await db.from('office_employee_ai_profiles')
      .select('employee_idx,model,system_instructions,temperature,max_output_tokens,enabled').eq('owner_id', owner);
    if (profileError) return json({ error: profileError.message }, 500);
    const mindByIdx = new Map((minds ?? []).map((m: any) => [m.employee_idx, m]));
    const profileByIdx = new Map((profiles ?? []).map((p: any) => [p.employee_idx, p]));
    staffByOwner.set(owner, ((data ?? []) as Employee[]).map(e => {
      const profile: any = profileByIdx.get(e.idx) ?? {};
      return { ...e, ...(mindByIdx.get(e.idx) ?? {}), ai_model: profile.model, ai_system_instructions: profile.system_instructions, ai_temperature: profile.temperature, ai_max_output_tokens: profile.max_output_tokens, ai_enabled: profile.enabled };
    }));
  }
  const results = await Promise.all(((tasks ?? []) as Task[]).map(t => processTask(t, workerId, staffByOwner.get(t.owner_id) ?? [])));
  return json({ worker: workerId, claimed: results.length, results });
});