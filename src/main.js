import "./styles.css";
import "../office.css";
import { mountZoreVirtualOffice } from "../index.js";
import { supabase } from "./supabase.js";
import { EMPLOYEE_PROFILES, ORG_DEPARTMENTS, getCharacterState, getCollaborators } from "./employee-character-system.js";
import { buildEmployeeTaskBrief } from "./ai-agent-policy.js";
import { createTaskMp4 } from "./task-video.js";

const app=document.querySelector("#app");
const OWNER_EMAIL="rendareza83@gmail.com";

let officeInstance=null, currentUser=null, officeData={tasks:[],reports:[],activity:[]}, resultRows=[], selectedEmployee=EMPLOYEE_PROFILES[0], syncTimer=null;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=v=>v?new Date(v).toLocaleString("id-ID",{dateStyle:"short",timeStyle:"short"}):"—";
const employeeByIdx=idx=>EMPLOYEE_PROFILES.find(e=>e.idx===Number(idx));
const statusLabel={queued:"Dalam antrean",in_progress:"Sedang dikerjakan",submitted:"Menunggu pemeriksaan",revision:"Perlu revisi",approved:"Disetujui",failed:"Gagal"};
function showNotice(message,type="info"){
  const el=document.querySelector("#global-notice"); if(el){el.textContent=message;el.className="notice "+type;el.hidden=false;}
}
function renderAuth(message=""){
  if(officeInstance){officeInstance.destroy();officeInstance=null;}
  app.innerHTML=`<main class="auth-shell"><section class="auth-card"><div class="auth-brand">ZORE <span>AI</span></div><p class="eyebrow">WORKFORCE MANAGEMENT</p><h1>Masuk ke kantor ZORE AI</h1><p class="auth-copy">Masuk menggunakan akun Google pemilik yang sudah ditetapkan untuk ZORE AI. Jangan membuat akun baru dengan email lain karena data perusahaan hanya dapat dibuka oleh anggota yang berwenang.</p><div class="auth-actions"><button class="primary" id="google-login" type="button">Masuk dengan Google</button></div><p id="auth-message" class="auth-message" role="status" aria-live="polite">${esc(message)}</p><p class="auth-foot">Akses kantor dan data karyawan diperiksa oleh server. Akun Google yang belum diberi peran CEO/anggota tidak akan memperoleh akses. Sembilan profil karyawan dan data pekerjaan tidak dibuat ulang oleh halaman login ini.</p></section></main>`;
  document.querySelector("#google-login").addEventListener("click",async()=>{
    const button=document.querySelector("#google-login");
    const message=document.querySelector("#auth-message");
    button.disabled=true;button.textContent="Menghubungkan ke Google…";message.textContent="";
    const {error}=await supabase.auth.signInWithOAuth({
      provider:"google",
      options:{redirectTo:window.location.origin,queryParams:{login_hint:OWNER_EMAIL,prompt:"select_account"}}
    });
    if(error){message.textContent="Login Google gagal: "+error.message;button.disabled=false;button.textContent="Masuk dengan Google";}
  });
}
function renderOrganization(){
  const card=id=>{const e=EMPLOYEE_PROFILES.find(x=>x.id===id);if(!e)return "";const isBoss=e.level===0;return `<article class="org-person level-${e.level}" style="--accent:${e.accent}"><span class="org-dept">${esc(e.department)}</span><strong>${esc(e.name)}</strong><span>${esc(e.title)}</span><small>${isBoss?"Pimpinan perusahaan":e.level===1?"Melapor kepada Direktur Utama":"Melapor kepada Manajer Kreatif"}</small><button type="button" data-org-profile="${e.id}">Lihat tanggung jawab</button></article>`;};
  return `<section class="org-section"><div class="section-heading"><div><span>ORGANIZATION CHART</span><h2>Struktur Organisasi Karyawan</h2></div><span>09 PERSONEL · 07 UNIT</span></div><div class="org-tree"><div class="org-top">${card("office-employee-0")}</div><div class="org-connector"></div><div class="org-manager">${card("office-employee-1")}</div><div class="org-connector"></div><div class="org-departments">${ORG_DEPARTMENTS.filter(d=>!["Direksi","Manajemen Operasional"].includes(d.name)).map(d=>`<div class="org-unit"><h3>${esc(d.name)}</h3><p>${esc(d.description)}</p><div>${d.members.map(card).join("")}</div></div>`).join("")}</div></div></section>`;
}
function renderProfile(employee){
  const colleagues=getCollaborators(employee.id);
  return `<div class="profile-heading"><span>PROFIL DAN TANGGUNG JAWAB</span><h2>${esc(employee.name)}</h2><p>${esc(employee.title)} · ${esc(employee.department)}</p></div><div class="profile-grid"><div><h3>Misi jabatan</h3><p>${esc(employee.signature)}.</p></div><div><h3>Keahlian utama</h3><p>${employee.skills.map(esc).join(" · ")}</p></div><div><h3>Melapor kepada</h3><p>${employee.reportsTo?esc(EMPLOYEE_PROFILES.find(e=>e.id===employee.reportsTo)?.name):"Pemilik / pemegang keputusan tertinggi"}</p></div><div><h3>Rekan kolaborasi</h3><p>${colleagues.map(e=>esc(e.name)).join(", ")||"Koordinasi langsung dengan tim."}</p></div><div><h3>Identitas karakter 3D</h3><p>${esc(employee.visual?.face||"wajah khas")} · rambut ${esc(employee.visual?.hair||"profesional")} · busana ${esc(employee.visual?.wardrobe||employee.outfit)} · ekspresi ${esc(employee.visual?.expression||employee.traits.join(", "))} · aksesori ${esc(employee.visual?.accessory||employee.accessory)}.</p></div><div><h3>Batas kewenangan</h3><p>Menjalankan pekerjaan sesuai jabatan, menyerahkan hasil untuk pemeriksaan manajer, dan tidak menyetujui pengeluaran atau tindakan eksternal tanpa persetujuan pemilik.</p></div></div>`;
}
function renderEmployeeStage(stage){
  const employee=Number(stage.stage_order||0)===0?employeeByIdx(1):employeeByIdx(stage.employee_idx);
  const status=stage.status||"queued";
  const reports=officeData.reports.filter(r=>r.task_id===stage.id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const results=resultRows.filter(r=>r.task_id===stage.id).sort((a,b)=>b.version-a.version);
  const activities=officeData.activity.filter(a=>a.task_id===stage.id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const author=Number(stage.stage_order||0)===0?"Manajer / perencana alur":(employee?.name||"Karyawan");
  return `<article class="team-stage"><div class="team-stage-head"><div><span class="team-stage-number">TAHAP ${Number(stage.stage_order||0)+1} · ${esc(employee?.title||"Perencanaan manajer")}</span><h4>${esc(stage.title)}</h4><small>Penanggung jawab: ${esc(author)}</small></div><span class="task-status ${esc(status)}">${statusLabel[status]||esc(status)}</span></div>
  <p class="team-stage-instructions">${esc(stage.instructions||"Instruksi tahap tidak tersedia.")}</p>
  <div class="team-stage-meta"><span>Mulai: ${fmt(stage.started_at||stage.locked_at)}</span><span>Diserahkan: ${fmt(stage.completed_at)}</span><span>Versi: ${esc(stage.version||1)}</span></div>
  <section class="employee-report-block"><h5>Laporan karyawan</h5>${reports.length?reports.map(r=>`<div class="employee-report-entry"><div class="report-entry-head"><strong>${esc(r.kind==="final"?"Laporan hasil":r.kind==="issue"?"Kendala":r.kind==="revision"?"Catatan revisi":"Catatan sistem")}</strong><small>${fmt(r.created_at)} · ${esc(author)}</small></div><p>${esc(r.body)}</p><button type="button" class="secondary copy-report" data-copy-text="${encodeURIComponent(r.body)}">Salin laporan</button></div>`).join(""):'<p class="report-empty">Belum ada laporan dari tahap ini.</p>'}</section>
  <section class="employee-deliverables"><h5>Hasil kerja yang diserahkan</h5>${results.length?results.map(r=>`<div class="result-body"><div class="result-toolbar"><small>Versi ${esc(r.version)} · ${fmt(r.created_at)}</small><button type="button" class="secondary copy-report" data-copy-text="${encodeURIComponent(r.content)}">Salin hasil</button>${r.storage_path?`<button type="button" class="secondary download-result" data-download-result="${esc(r.id)}">Unduh ${esc(r.file_name||"berkas hasil")}</button>`:""}</div><pre>${esc(r.content)}</pre></div>`).join(""):'<p class="report-empty">Belum ada hasil kerja yang tersimpan.</p>'}</section>
  <section class="employee-activity-block"><h5>Jejak aktivitas</h5>${activities.length?activities.map(a=>`<p><time>${fmt(a.created_at)}</time> · ${esc(a.message)}</p>`).join(""):'<p class="report-empty">Belum ada aktivitas tercatat untuk tahap ini.</p>'}</section>
  ${stage.last_error?'<p class="task-error">Kendala sistem: '+esc(stage.last_error)+'</p>':""}</article>`;
}
function renderTeamReport(task){
  if(!task.chain_id||Number(task.stage_order||0)!==0)return "";
  const stages=officeData.tasks.filter(t=>t.chain_id===task.chain_id).sort((a,b)=>Number(a.stage_order||0)-Number(b.stage_order||0));
  if(!stages.length)return "";
  const completed=stages.filter(s=>["submitted","approved"].includes(s.status)).length;
  const running=stages.filter(s=>s.status==="in_progress").length;
  const failed=stages.filter(s=>s.status==="failed").length;
  return `<details class="team-report-details" open><summary>Alur kerja & laporan seluruh karyawan · ${stages.length} tahap</summary><div class="team-progress-summary"><strong>${completed}/${stages.length} tahap diserahkan</strong><span>${running} sedang dikerjakan</span><span>${failed} gagal</span></div><p class="team-report-intro">Urutan kerja ditetapkan Manajer Kreatif. Tiap tahap menampilkan penanggung jawab, instruksi khusus, laporan individual, hasil lengkap yang benar-benar tersimpan, file unduhan bila tersedia, dan jejak aktivitas. Tahap berikutnya baru dapat dimulai setelah hasil sebelumnya diserahkan.</p><div class="team-stage-list">${stages.map(renderEmployeeStage).join("")}</div></details>`;
}
function taskCard(task){
  const e=task.chain_id&&Number(task.stage_order||0)===0?employeeByIdx(1):employeeByIdx(task.employee_idx); const status=task.status||"queued"; const progress=Number(task.progress||0); const isAi=task.progress_kind==="ai_generated";
  const results=resultRows.filter(r=>String(r.task_id)===String(task.id)).sort((a,b)=>Number(b.version)-Number(a.version));
  const reports=officeData.reports.filter(r=>String(r.task_id)===String(task.id));
  const isFinalMerge=!!task.chain_id&&Number(task.employee_idx)===1&&/pemeriksaan akhir dan penggabungan hasil tim/i.test(task.title||"")&&["submitted","approved"].includes(status);
  const videoAction=isFinalMerge&&results.length>0?'<div class="task-video-actions"><button type="button" class="secondary make-task-video" data-make-video="'+esc(task.id)+'">Buat MP4 + dubbing hasil gabungan</button><small>MP4 dibuat hanya dari keluaran final manajer setelah pemeriksaan dan penggabungan. Narasi suara Bahasa Indonesia disertakan.</small></div>':"";
  return `<article class="work-card"><div class="work-card-head"><div><span class="work-employee">${esc(e?.name||"Tim ZORE AI")} · Tahap ${Number(task.stage_order||0)+1}</span><h3>${esc(task.title)}</h3></div><span class="task-status ${esc(status)}">${statusLabel[status]||esc(status)}</span></div><p>${esc(task.instructions||"")} </p><div class="task-meta"><span>Prioritas: ${esc(task.priority||"normal")}</span><span>Dibuat: ${fmt(task.created_at)}</span><span>${isAi?"Progres dari proses AI":"Status antrean"}</span></div><div class="progress-track"><i style="width:${Math.max(0,Math.min(100,progress*100))}%"></i></div><div class="progress-caption">${isAi?Math.round(progress*100)+"%":"Progres belum diverifikasi sebagai hasil AI"}</div>${task.last_error?'<p class="task-error">'+esc(task.last_error)+'</p>':""}${reports.length?'<details class="result-details"><summary>Laporan tahap ini ('+reports.length+')</summary>'+reports.map(r=>'<div class="manager-report-wrap"><p class="manager-report"><strong>'+esc(r.kind==="final"?"Laporan hasil":r.kind==="issue"?"Kendala":r.kind==="revision"?"Revisi":"Catatan sistem")+' · '+fmt(r.created_at)+'</strong><br>'+esc(r.body)+'</p><button type="button" class="secondary copy-report" data-copy-text="'+encodeURIComponent(r.body)+'">Salin laporan</button></div>').join("")+'</details>':""}${results.length?'<details class="result-details"><summary>Hasil kerja AI ('+results.length+')</summary>'+results.map(r=>'<div class="result-body"><div class="result-toolbar"><small>Versi '+esc(r.version)+' · '+fmt(r.created_at)+'</small><button type="button" class="secondary copy-report" data-copy-text="'+encodeURIComponent(r.content)+'">Salin hasil</button></div><pre>'+esc(r.content)+'</pre></div>').join("")+'</details>':""}${videoAction}${renderTeamReport(task)}${status==="submitted"?'<div class="review-actions"><button data-approve="'+esc(task.id)+'" class="approve">Setujui hasil</button><button data-revise="'+esc(task.id)+'" class="secondary">Minta revisi</button></div>':""}<div class="task-management"><button type="button" class="delete-task" data-delete-task="${esc(task.id)}" aria-label="Hapus tugas">Hapus tugas</button></div></article>`;
}
function renderGoogleTools(){
  const tools=[
    {name:"Pomelli",tag:"KONTEN & PEMASARAN",desc:"Buat materi kampanye dan konten brand. Ekspor hasil dari Pomelli lalu masukkan ke tugas ZORE AI.",url:"https://labs.google.com/pomelli/about",status:"Gratis saat eksperimen",action:"Buka Pomelli"},
    {name:"Stitch",tag:"DESAIN WEBSITE & UI",desc:"Rancang tampilan website dan prototipe. Ekspor desain atau kode untuk diterapkan ke proyek ZORE AI.",url:"https://stitch.withgoogle.com",status:"Akses sesuai akun Google",action:"Buka Stitch"},
    {name:"Gemini Notebook",tag:"RISET & DOKUMEN",desc:"Analisis PDF, dokumen, catatan, dan sumber riset. Notebook API tersedia gratis selama Public Preview dengan kuota.",url:"https://notebooklm.google.com",status:"Paket gratis tersedia",action:"Buka Gemini Notebook"},
    {name:"Antigravity",tag:"PEMROGRAMAN AI",desc:"Bantu pengembangan dan pemeriksaan kode melalui aplikasi komputer. Bukan layanan yang berjalan langsung di dashboard web.",url:"https://antigravity.google",status:"Aplikasi komputer",action:"Buka Antigravity"},
    {name:"Opal",tag:"STATUS PRODUK",desc:"Google menghentikan Opal pada 17 November 2026. Alur kerja lama tidak berjalan lagi; gunakan fitur Gems di Gemini sebagai pengganti yang tersedia.",url:"https://gemini.google.com",status:"Opal dihentikan",action:"Buka Gemini"}
  ];
  return `<section class="google-tools-panel"><div class="section-heading"><div><span>GOOGLE AI TOOLKIT</span><h2>Alat AI pendukung ZORE AI</h2></div><span>MODE GRATIS</span></div><p class="google-tools-intro">AI TOOL ASSISTANT aktif: saat tugas dikirim, sistem memilih rekomendasi alat pendukung berdasarkan jabatan karyawan dan jenis pekerjaan. Gemini bawaan ZORE AI tetap mengerjakan inti tugas. Alat eksternal dipakai secara manual melalui akun Google dan hasilnya dapat dimasukkan kembali ke laporan.</p><div class="google-tools-grid">${tools.map(t=>`<article class="google-tool-card"><span class="google-tool-tag">${esc(t.tag)}</span><h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p><div class="google-tool-status">${esc(t.status)}</div><a href="${t.url}" target="_blank" rel="noopener noreferrer">${esc(t.action)} ↗</a></article>`).join("")}</div><p class="google-tools-note"><strong>Catatan koneksi:</strong> Bagian ini adalah pintasan resmi dan alur pertukaran file, bukan koneksi API otomatis. Sinkronisasi otomatis memerlukan API/OAuth dan izin akun; tidak akan diaktifkan diam-diam atau memakai layanan berbayar.</p></section>`;
}
function renderWorkspace(){
  if(officeInstance){officeInstance.destroy();officeInstance=null;}
  app.innerHTML=`<header class="topbar"><div><span class="eyebrow">VIRTUAL MANAGEMENT SYSTEM</span><h1>ZORE <span>AI</span></h1><p>Kantor Virtual · Sistem Kerja AI</p></div><div class="top-actions"><span class="signed-in">${esc(currentUser.email||"Pemilik")}</span><button id="signout" class="secondary">Keluar</button></div></header><main><section class="office-intro"><span>EXECUTIVE OFFICE</span><h2>Organisasi dan ruang kerja ZORE AI</h2><p>Setiap karyawan memiliki jabatan, tanggung jawab, alur pelaporan, dan hasil pekerjaan yang tercatat.</p></section>${renderGoogleTools()}<section class="virtual-office-section"><div id="zore-office-mount"></div></section>${renderOrganization()}<section class="profile-panel" id="profile-panel">${renderProfile(selectedEmployee)}</section><section class="task-panel" id="task-panel"><div class="section-heading"><div><span>AI WORK QUEUE</span><h2>Berikan pekerjaan nyata</h2></div><span>AI WORKER AKTIF</span></div><p class="panel-copy">Tugas akan dikirim ke antrean server. Manajer AI membagi pekerjaan ke spesialis, setiap tahap menghasilkan keluaran AI, lalu hasil akhir menunggu persetujuan Anda.</p><form id="task-form"><label>Judul pekerjaan<input id="task-title" maxlength="200" required placeholder="Contoh: Buat naskah animasi edukasi 60 detik"></label><label>Instruksi dan kriteria hasil<textarea id="task-instructions" maxlength="4000" rows="4" placeholder="Jelaskan tujuan, format, audiens, bahan, dan hasil yang diharapkan."></textarea></label><div class="task-form-row"><label>Spesialis prioritas (opsional)<select id="task-employee">${EMPLOYEE_PROFILES.filter(e=>e.idx>0).map(e=>'<option value="'+e.idx+'" '+(e.idx===1?"selected":"")+'>'+esc(e.name)+' — '+esc(e.title)+'</option>').join("")}</select></label></div><button class="primary" type="submit">Kirim ke sistem kerja AI</button><p id="task-message" class="auth-message"></p></form></section><section class="work-monitor"><div class="section-heading"><div><span>REAL WORK MONITOR</span><h2>Pemantauan pekerjaan</h2></div><button id="refresh-work" class="secondary">Perbarui</button></div><div class="work-stats"><div><strong>${officeData.tasks.filter(t=>["queued","in_progress","revision"].includes(t.status)).length}</strong><span>Antrean / berjalan</span></div><div><strong>${officeData.tasks.filter(t=>t.status==="submitted").length}</strong><span>Menunggu tinjauan</span></div><div><strong>${officeData.tasks.filter(t=>t.status==="approved").length}</strong><span>Disetujui</span></div><div><strong>${officeData.tasks.filter(t=>t.status==="failed").length}</strong><span>Gagal</span></div></div><div class="work-list">${officeData.tasks.length?officeData.tasks.map(taskCard).join(""):'<p class="empty-state">Belum ada pekerjaan. Kirim pekerjaan pertama melalui formulir di atas.</p>'}</div></section><section class="activity-feed"><h2>Aktivitas dan laporan tim</h2>${officeData.activity.slice(0,12).map(a=>'<p><span>'+fmt(a.created_at)+'</span> '+esc(a.message)+'</p>').join("")||'<p>Belum ada aktivitas baru.</p>'}</section><div id="global-notice" class="notice" hidden></div></main><footer>ZORE AI · AI EMPLOYEE WORKSPACE</footer>`;
  const host=document.querySelector("#zore-office-mount");
  try{officeInstance=mountZoreVirtualOffice(host,{employees:EMPLOYEE_PROFILES,onEmployeeSelect:employee=>selectEmployee(employee.id)});}catch(e){host.innerHTML='<p class="empty-state">Tampilan 3D tidak dapat dimuat. Panel kerja tetap tersedia.</p>';console.error(e);}
  document.querySelector("#signout").addEventListener("click",async()=>{await supabase.auth.signOut();});
  document.querySelectorAll("[data-org-profile]").forEach(b=>b.addEventListener("click",()=>selectEmployee(b.dataset.orgProfile)));
  document.querySelector("#profile-panel").addEventListener("click",()=>{});
  document.querySelector("#task-form").addEventListener("submit",assignTask);
  document.querySelector("#refresh-work").addEventListener("click",()=>syncOffice(true));
  document.removeEventListener("click",handleWorkListClick,true);
  document.addEventListener("click",handleWorkListClick,true);
}
function selectEmployee(id){selectedEmployee=EMPLOYEE_PROFILES.find(e=>e.id===id)||EMPLOYEE_PROFILES[0];const panel=document.querySelector("#profile-panel");if(panel)panel.innerHTML=renderProfile(selectedEmployee);}
async function syncOffice(redraw=false){
  if(!supabase||!currentUser)return;
  const {data,error}=await supabase.rpc("office_sync");
  if(error){showNotice("Gagal membaca ruang kerja: "+error.message,"error");return;}
  officeData={tasks:data?.tasks||[],reports:data?.reports||[],activity:data?.activity||[]};
  const ids=officeData.tasks.map(t=>t.id).filter(Boolean);
  if(ids.length){const {data:rows,error:resultError}=await supabase.from("office_task_results").select("id,task_id,version,content,model,created_at,storage_path,file_name,content_type").in("task_id",ids).order("version",{ascending:false});if(!resultError)resultRows=rows||[];}
  else resultRows=[];
  if(redraw)renderWorkspace();
  else {
    const monitor=document.querySelector(".work-monitor");
    if(monitor){
      const temp=document.createElement("div");temp.innerHTML=renderWorkspaceSnapshot();
      const updated=temp.querySelector(".work-monitor");monitor.replaceWith(updated);
      updated.querySelector("#refresh-work")?.addEventListener("click",()=>syncOffice(true));
    }
    const feed=document.querySelector(".activity-feed");
    if(feed) feed.innerHTML='<h2>Aktivitas dan laporan tim</h2>'+(officeData.activity.slice(0,12).map(a=>'<p><span>'+fmt(a.created_at)+'</span> '+esc(a.message)+'</p>').join("")||'<p>Belum ada aktivitas baru.</p>');
  }
}
function renderWorkspaceSnapshot(){
  return '<section class="work-monitor"><div class="section-heading"><div><span>REAL WORK MONITOR</span><h2>Pemantauan pekerjaan</h2></div><button id="refresh-work" class="secondary">Perbarui</button></div><div class="work-stats"><div><strong>'+officeData.tasks.filter(t=>["queued","in_progress","revision"].includes(t.status)).length+'</strong><span>Antrean / berjalan</span></div><div><strong>'+officeData.tasks.filter(t=>t.status==="submitted").length+'</strong><span>Menunggu tinjauan</span></div><div><strong>'+officeData.tasks.filter(t=>t.status==="approved").length+'</strong><span>Disetujui</span></div><div><strong>'+officeData.tasks.filter(t=>t.status==="failed").length+'</strong><span>Gagal</span></div></div><div class="work-list">'+(officeData.tasks.length?officeData.tasks.map(taskCard).join(""):'<p class="empty-state">Belum ada pekerjaan.</p>')+'</div></section>';
}
async function assignTask(event){
  event.preventDefault();const button=event.currentTarget.querySelector("button[type=submit]");const msg=document.querySelector("#task-message");
  const title=document.querySelector("#task-title").value.trim(),instructions=document.querySelector("#task-instructions").value.trim(),idx=Number(document.querySelector("#task-employee").value);
  if(!title)return;button.disabled=true;button.textContent="Mengirim pekerjaan…";msg.textContent="";
  const employee=employeeByIdx(idx);
  let agentBrief;
  try{agentBrief=buildEmployeeTaskBrief(employee,title,instructions);}catch(error){button.disabled=false;button.textContent="Kirim ke sistem kerja AI";msg.textContent="Profil agen tidak ditemukan: "+error.message;return;}
  const {data,error}=await supabase.rpc("office_assign_task",{p_idx:idx,p_title:title,p_instr:agentBrief});
  button.disabled=false;button.textContent="Kirim ke sistem kerja AI";
  if(error){msg.textContent="Pekerjaan gagal dikirim: "+error.message;return;}
  msg.textContent="Pekerjaan masuk antrean server. Worker AI akan mengambilnya otomatis.";
  event.currentTarget.reset();
  await syncOffice(true);showNotice("Tugas berhasil masuk antrean. Pantau tahap kerja dan hasil AI di bawah.","success");
}
async function handleWorkListClick(event){
  const target=event.target instanceof Element?event.target:null;
  if(!target)return;
  const downloadButton=target.closest("[data-download-result]");
  if(downloadButton){
    const result=resultRows.find(item=>String(item.id)===String(downloadButton.dataset.downloadResult));
    if(!result?.storage_path){showNotice("Berkas hasil belum tersimpan di penyimpanan.","error");return;}
    const original=downloadButton.textContent;downloadButton.disabled=true;downloadButton.textContent="Menyiapkan unduhan…";
    try{
      if(typeof result.content!=="string"||!result.content.length)throw new Error("Isi hasil belum tersedia untuk diunduh.");
      const blob=new Blob([result.content],{type:result.content_type||"text/plain;charset=utf-8"});
      const url=URL.createObjectURL(blob);
      const link=document.createElement("a");link.href=url;link.download=result.file_name||"hasil-pekerjaan";document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
      downloadButton.textContent="Unduhan dimulai";showNotice("Berkas diunduh dari isi hasil terbaru yang tersimpan, termasuk lampiran gabungan.","success");
    }catch(error){downloadButton.textContent=original;showNotice("Berkas belum dapat diunduh: "+(error?.message||"Kesalahan penyimpanan."),"error");}
    finally{downloadButton.disabled=false;}
    return;
  }
  const videoButton=target.closest("[data-make-video]");
  if(videoButton){await exportTaskMp4(videoButton.dataset.makeVideo,videoButton);return;}
  const cancelButton=target.closest("[data-cancel-delete]");
  if(cancelButton){cancelButton.closest(".delete-confirmation")?.remove();return;}
  const confirmButton=target.closest("[data-confirm-delete]");
  if(confirmButton){
    const taskId=confirmButton.dataset.confirmDelete;
    const card=confirmButton.closest(".work-card");
    const deleteButton=card?.querySelector("[data-delete-task]");
    if(!taskId||!deleteButton){showNotice("Data tugas tidak ditemukan. Muat ulang halaman.","error");return;}
    await performTaskDeletion(taskId,deleteButton);
    return;
  }
  const deleteButton=target.closest("[data-delete-task]");
  if(deleteButton){
    const card=deleteButton.closest(".work-card");
    const taskId=deleteButton.dataset.deleteTask;
    const title=card?.querySelector("h3")?.textContent?.trim()||"tugas ini";
    if(!taskId){showNotice("ID tugas tidak terbaca. Muat ulang halaman lalu coba lagi.","error");return;}
    if(card.querySelector(".delete-confirmation"))return;
    const confirmation=document.createElement("div");
    confirmation.className="delete-confirmation";
    confirmation.style.cssText="margin-top:12px;padding:14px;border:1px solid #d97706;border-radius:10px;background:rgba(217,119,6,.10);display:flex;flex-wrap:wrap;align-items:center;gap:10px";
    const message=document.createElement("span");
    message.textContent='Yakin ingin menghapus "'+title+'"? Tindakan ini tidak dapat dibatalkan.';
    message.style.cssText="flex:1 1 100%;font-weight:600";
    const yes=document.createElement("button");
    yes.type="button";yes.textContent="Ya, hapus permanen";yes.dataset.confirmDelete=taskId;
    yes.style.cssText="padding:10px 14px;border:0;border-radius:8px;background:#b91c1c;color:white;font-weight:700";
    const no=document.createElement("button");
    no.type="button";no.textContent="Batal";no.dataset.cancelDelete="true";
    no.style.cssText="padding:10px 14px;border:1px solid currentColor;border-radius:8px;background:transparent;color:inherit";
    confirmation.append(message,yes,no);
    deleteButton.insertAdjacentElement("afterend",confirmation);
    return;
  }
  const copyButton=target.closest("[data-copy-text]");
  if(copyButton){
    const text=decodeURIComponent(copyButton.dataset.copyText||"");
    try{
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);}
      else{
        const area=document.createElement("textarea");area.value=text;area.style.position="fixed";area.style.opacity="0";
        document.body.appendChild(area);area.select();const copied=document.execCommand("copy");area.remove();
        if(!copied)throw new Error("Clipboard tidak tersedia");
      }
      const original=copyButton.textContent;copyButton.textContent="Tersalin!";copyButton.disabled=true;
      setTimeout(()=>{copyButton.textContent=original;copyButton.disabled=false;},1400);
    }catch(error){showNotice("Tidak dapat menyalin otomatis. Tekan lama teks laporan untuk menyalinnya.","error");}
    return;
  }
  await handleReview(event);
}
async function performTaskDeletion(taskId,deleteButton){
  deleteButton.disabled=true;deleteButton.textContent="Menghapus…";
  const task=officeData.tasks.find(item=>String(item.id)===String(taskId));
  const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let deletion;
  try{
    if(uuidPattern.test(String(taskId))){
      deletion=await supabase.from("office_tasks").delete({count:"exact"}).eq("id",taskId);
    }else if(task?.title&&task?.instructions!=null&&Number.isInteger(Number(task.employee_idx))&&Number.isInteger(Number(task.stage_order))){
      // Older office_sync records may expose a malformed id. Resolve the real DB UUID
      // by an exact composite match; never delete when the match is ambiguous.
      const {data:matches,error:lookupError}=await supabase.from("office_tasks").select("id")
        .eq("title",task.title).eq("instructions",task.instructions)
        .eq("employee_idx",Number(task.employee_idx)).eq("stage_order",Number(task.stage_order));
      if(lookupError)throw lookupError;
      if(!matches||matches.length!==1||!uuidPattern.test(String(matches[0].id))){
        throw new Error(matches?.length>1?"Ditemukan lebih dari satu tugas yang cocok. Tidak ada data yang dihapus.":"Data tugas tidak ditemukan dengan pencocokan aman. Tidak ada data yang dihapus.");
      }
      deletion=await supabase.from("office_tasks").delete({count:"exact"}).eq("id",matches[0].id);
    }else{
      throw new Error("Data tugas belum memiliki informasi yang cukup untuk pencocokan aman. Tidak ada data yang dihapus.");
    }
  }catch(err){
    deleteButton.disabled=false;deleteButton.textContent="Hapus tugas";
    showNotice("Tugas belum terhapus: "+(err?.message||"Koneksi database gagal."),"error");return;
  }
  const {error,count}=deletion||{};
  if(error||count!==1){
    deleteButton.disabled=false;deleteButton.textContent="Hapus tugas";
    showNotice("Tugas belum dapat dipastikan terhapus: "+(error?.message||(count===0?"Data tugas tidak ditemukan.":"Database tidak mengonfirmasi tepat satu tugas terhapus.")),"error");return;
  }
  officeData.tasks=officeData.tasks.filter(item=>String(item.id)!==String(taskId));
  officeData.reports=officeData.reports.filter(item=>String(item.task_id)!==String(taskId));
  resultRows=resultRows.filter(item=>String(item.task_id)!==String(taskId));
  const monitor=document.querySelector(".work-monitor");
  if(monitor){
    const temp=document.createElement("div");temp.innerHTML=renderWorkspaceSnapshot();
    const updated=temp.querySelector(".work-monitor");monitor.replaceWith(updated);
    updated.querySelector("#refresh-work")?.addEventListener("click",()=>syncOffice(true));
  }
  showNotice("Tugas berhasil dihapus dan langsung dihilangkan dari layar.","success");
}
async function exportTaskMp4(taskId,button){
  const task=officeData.tasks.find(item=>String(item.id)===String(taskId));
  const isFinalMerge=!!task?.chain_id&&Number(task.employee_idx)===1&&/pemeriksaan akhir dan penggabungan hasil tim/i.test(task.title||"")&&["submitted","approved"].includes(task.status);
  const results=resultRows.filter(item=>String(item.task_id)===String(taskId)).sort((a,b)=>Number(b.version)-Number(a.version)).slice(0,1);
  if(!isFinalMerge||results.length!==1||!results[0]?.content?.trim()){
    showNotice("MP4 hanya tersedia untuk hasil akhir gabungan yang sudah diperiksa manajer.","error");return;
  }
  const original=button.textContent;
  button.disabled=true;button.textContent="Membuat dubbing dan MP4…";
  try{
    const employee=employeeByIdx(task.employee_idx);
    let cleanText=String(results[0].content||"").trim();
    if(/^\s*<(!doctype\s+html|html\b)/i.test(cleanText)){
      const parsed=new DOMParser().parseFromString(cleanText,"text/html");
      parsed.querySelectorAll("script,style,noscript,template,svg,canvas").forEach(node=>node.remove());
      cleanText=String(parsed.body?.innerText||parsed.body?.textContent||"");
    }else{
      cleanText=cleanText.replace(/```[a-zA-Z0-9_-]*\n?[\s\S]*?```/g,"Bagian kode program disertakan dalam hasil akhir.")
        .replace(/`([^`]+)`/g,"$1").replace(/^\s*#{1,6}\s*/gm,"")
        .replace(/^\s*[-*+]\s+/gm,"").replace(/^\s*\d+[.)]\s+/gm,"")
        .replace(/https?:\/\/\S+/g,"tautan").replace(/<[^>]*>/g," ")
        .replace(/[{}<>_=|#*~]/g," ").replace(/[ \t]+/g," ").trim();
    }
    if(!cleanText)throw new Error("Tidak ditemukan teks narasi yang dapat dibacakan dari hasil akhir.");
    const narration="Hasil penggabungan akhir ZORE AI. Judul pekerjaan: "+task.title+". Pemeriksaan dan penggabungan dilakukan oleh "+(employee?.name||"Manajer ZORE AI")+". Berikut ringkasan isi hasil akhir. "+cleanText;
    if(narration.length>14000)throw new Error("Hasil gabungan terlalu panjang untuk dubbing otomatis. Ringkas hasil final terlebih dahulu, lalu coba lagi.");
    const {data:voiceData,error:voiceError}=await supabase.functions.invoke("office-voice",{body:{text:narration}});
    if(voiceError)throw new Error(voiceError.message||"Layanan dubbing tidak merespons.");
    if(!voiceData?.ok||!voiceData.audio_base64)throw new Error(voiceData?.error||"Audio dubbing tidak berhasil dibuat.");
    button.textContent="Menyusun video dan audio…";
    const blob=await createTaskMp4({
      title:task.title,
      employeeName:employee?.name||"Manajer ZORE AI",
      results,
      audioBase64:voiceData.audio_base64,
      sampleRate:Number(voiceData.sample_rate)||24000
    });
    if(!blob||blob.type!=="video/mp4"||blob.size<1000)throw new Error("File MP4 dengan dubbing tidak berhasil dibuat.");
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    const safeName=String(task.title||"hasil-gabungan-zore-ai").normalize("NFKD").replace(/[^a-zA-Z0-9-_]+/g,"-").replace(/^-+|-+$/g,"").slice(0,70)||"hasil-gabungan-zore-ai";
    link.href=url;link.download=safeName+"-dubbing.mp4";document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    button.textContent="MP4 + dubbing berhasil dibuat";
    showNotice("MP4 hasil penggabungan beserta dubbing Bahasa Indonesia berhasil dibuat.","success");
  }catch(error){
    button.disabled=false;button.textContent=original;
    showNotice("MP4 belum dapat dibuat: "+(error?.message||"Kesalahan tidak diketahui."),"error");
  }
}
async function handleReview(event){
  const approve=event.target.closest("[data-approve]"),revise=event.target.closest("[data-revise]");if(!approve&&!revise)return;
  const id=approve?.dataset.approve||revise?.dataset.revise;let note=null,ok=!!approve;
  if(!ok){note=prompt("Tuliskan bagian yang harus diperbaiki:");if(note===null)return;}
  const {error}=await supabase.rpc("office_review_task",{p_task:id,p_approve:ok,p_note:note});
  if(error){showNotice("Tinjauan gagal disimpan: "+error.message,"error");return;}
  await syncOffice(true);showNotice(ok?"Hasil disetujui.":"Revisi dikirim kembali ke antrean.","success");
}
async function enterWorkspace(user){
  if((user.email||"").toLowerCase()!==OWNER_EMAIL){await supabase.auth.signOut();renderAuth("Akun "+(user.email||"ini")+" bukan akun CEO yang terdaftar. Gunakan "+OWNER_EMAIL+".");return;}
  currentUser=user;
  const {error}=await supabase.rpc("office_sync");
  if(error){renderAuth("Akun masuk, tetapi ruang kerja belum dapat dibuka: "+error.message);return;}
  await syncOffice(false);renderWorkspace();
  if(syncTimer)clearInterval(syncTimer);
  syncTimer=setInterval(()=>syncOffice(false),20000);
}
async function boot(){
  if(!supabase){renderAuth("Konfigurasi koneksi belum tersedia. Periksa pengaturan proyek.");return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(session?.user)await enterWorkspace(session.user);else renderAuth();
  supabase.auth.onAuthStateChange((_event,session)=>{if(session?.user){if(!currentUser||currentUser.id!==session.user.id)setTimeout(()=>enterWorkspace(session.user),0);}else{currentUser=null;if(syncTimer)clearInterval(syncTimer);renderAuth();}});
}
boot();
