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
let googleNotebookAccessToken=null, notebookAutoSyncPaused=false, activeTaskFilter="all";
supabase?.auth.onAuthStateChange((event,session)=>{if(session?.provider_token)googleNotebookAccessToken=session.provider_token;if(event==="SIGNED_OUT")googleNotebookAccessToken=null;});
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=v=>v?new Date(v).toLocaleString("id-ID",{dateStyle:"short",timeStyle:"short"}):"—";
const employeeByIdx=idx=>EMPLOYEE_PROFILES.find(e=>e.idx===Number(idx));
const statusLabel={queued:"Dalam antrean",in_progress:"Sedang dikerjakan",submitted:"Menunggu pemeriksaan",revision:"Perlu revisi",approved:"Disetujui",failed:"Gagal"};
function taskStatusLabel(task){
  const status=task.status||"queued";
  if(status!=="submitted")return statusLabel[status]||status;
  if(!task.chain_id||Number(task.stage_order||0)===0)return "Menunggu persetujuan awal";
  if(Number(task.employee_idx)===1&&/pemeriksaan akhir dan penggabungan hasil tim/i.test(task.title||""))return "Menunggu pemeriksaan akhir";
  return "Diserahkan · lanjut otomatis";
}
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
function previewHtmlFor(result){
  const content=String(result?.content||"").trim();
  if(!content)return null;
  const fenced=content.match(/```(?:html|htm)\s*\n([\s\S]*?)\n```/i);
  if(fenced)return fenced[1];
  const looksLikeHtml=/^\s*(?:<!doctype\s+html|<html\b)/i.test(content);
  const htmlFile=/\.html?$/i.test(String(result?.file_name||""));
  const htmlType=/^text\/html(?:\s*;|$)/i.test(String(result?.content_type||""));
  return looksLikeHtml||htmlFile||htmlType?content:null;
}
function renderResultToolbar(result){
  const preview=previewHtmlFor(result)!==null
    ?'<button type="button" class="secondary preview-result" data-preview-result="'+esc(result.id)+'">Lihat preview</button>'
    :'';
  return '<div class="result-toolbar"><small>Versi '+esc(result.version)+' · '+fmt(result.created_at)+'</small><button type="button" class="secondary copy-report" data-copy-text="'+encodeURIComponent(result.content||"")+'">Salin hasil</button>'+preview+'<button type="button" class="secondary download-result" data-download-result="'+esc(result.id)+'">Unduh '+esc(result.file_name||"hasil-pekerjaan.txt")+'</button></div>';
}
function openResultPreview(result){
  const html=previewHtmlFor(result);
  if(html===null){showNotice("Preview hanya tersedia untuk hasil HTML. Kode sumber tetap dapat dibaca dan diunduh.","error");return;}
  document.querySelector("#result-preview-dialog")?.remove();
  const dialog=document.createElement("dialog");
  dialog.id="result-preview-dialog";
  dialog.className="result-preview-dialog";
  const header=document.createElement("div");
  header.className="result-preview-header";
  const title=document.createElement("strong");
  title.textContent="Preview: "+(result.file_name||"hasil-website.html");
  const close=document.createElement("button");
  close.type="button";close.className="secondary";close.textContent="Tutup";
  close.addEventListener("click",()=>dialog.close());
  header.append(title,close);
  const note=document.createElement("p");
  note.className="result-preview-note";
  note.textContent="Mode pratinjau aman: JavaScript dinonaktifkan dan akses ke halaman utama ZORE AI dibatasi.";
  const frame=document.createElement("iframe");
  frame.className="result-preview-frame";
  frame.title="Pratinjau hasil pekerjaan";
  frame.setAttribute("sandbox","");
  const policy='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: blob:; style-src \'unsafe-inline\'; font-src data:;">';
  const source=/<head\b[^>]*>/i.test(html)
    ?html.replace(/<head\b[^>]*>/i,match=>match+policy)
    :'<!doctype html><html><head><meta charset="utf-8">'+policy+'</head><body>'+html+'</body></html>';
  frame.srcdoc=source;
  dialog.append(header,note,frame);
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener("close",()=>dialog.remove(),{once:true});
  document.body.appendChild(dialog);
  dialog.showModal();
}
function renderEmployeeStage(stage){
  const employee=Number(stage.stage_order||0)===0?employeeByIdx(1):employeeByIdx(stage.employee_idx);
  const status=stage.status||"queued";
  const reports=officeData.reports.filter(r=>r.task_id===stage.id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const results=resultRows.filter(r=>r.task_id===stage.id).sort((a,b)=>b.version-a.version);
  const activities=officeData.activity.filter(a=>a.task_id===stage.id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const author=Number(stage.stage_order||0)===0?"Manajer / perencana alur":(employee?.name||"Karyawan");
  return `<article class="team-stage"><div class="team-stage-head"><div><span class="team-stage-number">TAHAP ${Number(stage.stage_order||0)+1} · ${esc(employee?.title||"Perencanaan manajer")}</span><h4>${esc(stage.title)}</h4><small>Penanggung jawab: ${esc(author)}</small></div><span class="task-status ${esc(status)}">${esc(taskStatusLabel(stage))}</span></div><p class="team-stage-summary">${esc((stage.instructions||"").slice(0,220))}</p><details class="stage-detail"><summary>Lihat detail pekerjaan, laporan, dan hasil</summary>
  <p class="team-stage-instructions">${esc(stage.instructions||"Instruksi tahap tidak tersedia.")}</p>
  <div class="team-stage-meta"><span>Mulai: ${fmt(stage.started_at||stage.locked_at)}</span><span>Diserahkan: ${fmt(stage.completed_at)}</span><span>Versi: ${esc(stage.version||1)}</span></div>
  <section class="employee-report-block"><h5>Laporan karyawan</h5>${reports.length?reports.map(r=>`<div class="employee-report-entry"><div class="report-entry-head"><strong>${esc(r.kind==="final"?"Laporan hasil":r.kind==="issue"?"Kendala":r.kind==="revision"?"Catatan revisi":"Catatan sistem")}</strong><small>${fmt(r.created_at)} · ${esc(author)}</small></div><p>${esc(r.body)}</p><button type="button" class="secondary copy-report" data-copy-text="${encodeURIComponent(r.body)}">Salin laporan</button></div>`).join(""):'<p class="report-empty">Belum ada laporan dari tahap ini.</p>'}</section>
  <section class="employee-deliverables"><h5>Hasil kerja yang diserahkan</h5>${results.length?results.map(r=>`<div class="result-body">${renderResultToolbar(r)}<pre>${esc(r.content)}</pre></div>`).join(""):'<p class="report-empty">Belum ada hasil kerja yang tersimpan.</p>'}</section>
  <section class="employee-activity-block"><h5>Jejak aktivitas</h5>${activities.length?activities.map(a=>`<p><time>${fmt(a.created_at)}</time> · ${esc(a.message)}</p>`).join(""):'<p class="report-empty">Belum ada aktivitas tercatat untuk tahap ini.</p>'}</section>
  </details>${stage.last_error?'<p class="task-error">Kendala sistem: '+esc(stage.last_error)+'</p>':""}${Number(stage.employee_idx)===1&&/pemeriksaan akhir dan penggabungan hasil tim/i.test(stage.title||"")&&status==="submitted"?'<div class="review-actions"><button data-approve="'+esc(stage.id)+'" class="approve">Setujui hasil akhir</button><button data-revise="'+esc(stage.id)+'" class="secondary">Minta revisi akhir</button></div>':""}</article>`;
}
function renderTeamReport(task){
  if(!task.chain_id||Number(task.stage_order||0)!==0)return "";
  const stages=officeData.tasks.filter(t=>t.chain_id===task.chain_id).sort((a,b)=>Number(a.stage_order||0)-Number(b.stage_order||0));
  if(!stages.length)return "";
  const completed=stages.filter(s=>["submitted","approved"].includes(s.status)).length;
  const running=stages.filter(s=>s.status==="in_progress").length;
  const failed=stages.filter(s=>s.status==="failed").length;
  return `<details class="team-report-details" open><summary>Alur kerja & laporan seluruh karyawan · ${stages.length} tahap</summary><div class="team-progress-summary"><strong>${completed}/${stages.length} tahap diserahkan</strong><span>${running} sedang dikerjakan</span><span>${failed} gagal</span></div><p class="team-report-intro">Urutan kerja ditetapkan Manajer Kreatif. Tiap tahap menampilkan penanggung jawab, instruksi khusus, laporan individual, hasil lengkap yang benar-benar tersimpan, file unduhan bila tersedia, dan jejak aktivitas. Tahap spesialis berjalan otomatis berurutan tanpa persetujuan di setiap tahap. Anda cukup menyetujui rencana di awal dan hasil gabungan manajer di akhir. Aktivitas menampilkan nama karyawan, pekerjaan, status, dan ringkasan singkat.</p><section class="notebook-audit-note"><h5>Pemeriksaan sumber & Gemini Notebook</h5><p><strong>Status akses:</strong> Notebook hanya boleh dianggap sebagai sumber jika dokumen benar-benar tersedia melalui sinkronisasi atau akses yang berhasil. Koneksi OAuth saja tidak membuktikan bahwa karyawan telah membaca notebook.</p><p><strong>Standar laporan:</strong> Karyawan wajib memisahkan data internal, dokumen Notebook yang benar-benar dibaca, dan referensi eksternal yang diverifikasi. Cantumkan judul/sumber serta temuan yang digunakan; jika akses terbatas, tulis “belum dapat diakses”. Jangan mengarang kutipan, sumber, atau menyatakan literatur satir klasik digunakan bila tidak ada dokumen yang diperiksa.</p><p><strong>Audit manajer:</strong> Periksa kecocokan sumber dengan brief, keterlacakan klaim, kualitas hasil, bagian yang belum terverifikasi, serta apakah Notebook benar-benar digunakan. Tahan persetujuan atau minta revisi bila sumber tidak jelas.</p></section><div class="team-stage-list">${stages.map(renderEmployeeStage).join("")}</div></details>`;
}
function taskCard(task){
  const e=task.chain_id&&Number(task.stage_order||0)===0?employeeByIdx(1):employeeByIdx(task.employee_idx); const status=task.status||"queued"; const progress=Number(task.progress||0); const isAi=task.progress_kind==="ai_generated";
  const results=resultRows.filter(r=>String(r.task_id)===String(task.id)).sort((a,b)=>Number(b.version)-Number(a.version));
  const reports=officeData.reports.filter(r=>String(r.task_id)===String(task.id));
  const isFinalMerge=!!task.chain_id&&Number(task.employee_idx)===1&&/pemeriksaan akhir dan penggabungan hasil tim/i.test(task.title||"")&&["submitted","approved"].includes(status);
  const videoAction=isFinalMerge&&results.length>0?'<div class="task-video-actions"><button type="button" class="secondary make-task-video" data-make-video="'+esc(task.id)+'">Buat MP4 + dubbing hasil gabungan</button><small>MP4 dibuat hanya dari keluaran final manajer setelah pemeriksaan dan penggabungan. Narasi suara Bahasa Indonesia disertakan.</small></div>':"";
  const isMarketing=/pemasaran|marketing|kampanye|brand|promosi|iklan|caption|konten sosial/i.test((task.title||"")+" "+(task.instructions||""));
  const pomelliAction=isMarketing?'<div class="task-video-actions pomelli-handoff"><button type="button" class="secondary" data-pomelli-task="'+esc(task.id)+'">Siapkan brief karyawan untuk Pomelli</button><small>Nadia: strategi & brief. Fajar: arahan visual & kebutuhan aset. Brief dilengkapi hasil kerja tim yang sudah tersimpan; setelah membuat aset di Pomelli, unggah hasilnya kembali pada tugas ini untuk pemeriksaan Nadia.</small></div>':"";
  return `<article class="work-card"><div class="work-card-head"><div><span class="work-employee">${esc(e?.name||"Tim ZORE AI")} · Tahap ${Number(task.stage_order||0)+1}</span><h3>${esc(task.title)}</h3></div><span class="task-status ${esc(status)}">${esc(taskStatusLabel(task))}</span></div><p>${esc(task.instructions||"")} </p><div class="task-meta"><span>Prioritas: ${esc(task.priority||"normal")}</span><span>Dibuat: ${fmt(task.created_at)}</span><span>${isAi?"Progres dari proses AI":"Status antrean"}</span></div><div class="progress-track"><i style="width:${Math.max(0,Math.min(100,progress*100))}%"></i></div><div class="progress-caption">${isAi?Math.round(progress*100)+"%":"Progres belum diverifikasi sebagai hasil AI"}</div>${task.last_error?'<p class="task-error">'+esc(task.last_error)+'</p>':""}${reports.length?'<details class="result-details"><summary>Laporan tahap ini ('+reports.length+')</summary>'+reports.map(r=>'<div class="manager-report-wrap"><p class="manager-report"><strong>'+esc(r.kind==="final"?"Laporan hasil":r.kind==="issue"?"Kendala":r.kind==="revision"?"Revisi":"Catatan sistem")+' · '+fmt(r.created_at)+'</strong><br>'+esc(r.body)+'</p><button type="button" class="secondary copy-report" data-copy-text="'+encodeURIComponent(r.body)+'">Salin laporan</button></div>').join("")+'</details>':""}${results.length?'<details class="result-details"><summary>Hasil kerja AI ('+results.length+')</summary>'+results.map(r=>'<div class="result-body">'+renderResultToolbar(r)+'<pre>'+esc(r.content)+'</pre></div>').join("")+'</details>':""}${videoAction}${pomelliAction}${renderTeamReport(task)}${status==="submitted"&&(!task.chain_id||Number(task.stage_order||0)===0)?'<div class="review-actions"><button data-approve="'+esc(task.id)+'" class="approve">Setujui rencana kerja awal</button><button data-revise="'+esc(task.id)+'" class="secondary">Ubah rencana</button></div>':""}<div class="task-management"><button type="button" class="delete-task" data-delete-task="${esc(task.id)}" aria-label="Hapus tugas">Hapus tugas</button></div></article>`;
}
async function googleNotebookApi(path,options={}){
  if(!googleNotebookAccessToken)throw new Error("Akun Google Notebook belum dihubungkan. Tekan Hubungkan Google terlebih dahulu.");
  const response=await fetch("https://notebook.googleapis.com/v1"+path,{...options,headers:{"Authorization":"Bearer "+googleNotebookAccessToken,"Content-Type":"application/json",...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error?.message||("Google Notebook API gagal ("+response.status+"). Periksa izin OAuth dan aktivasi API."));
  return data;
}
async function connectGoogleNotebook(){
  if(googleNotebookAccessToken){showNotice("Akun Google sudah memberikan akses Notebook untuk sesi ini.","success");return;}
  const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{scopes:"https://www.googleapis.com/auth/notebook",redirectTo:window.location.origin,queryParams:{access_type:"offline",prompt:"consent"}}});
  if(error)showNotice("Koneksi Google gagal: "+error.message,"error");
}
async function syncFinalWorkToNotebook(automatic=false){
  if(automatic&&(!googleNotebookAccessToken||notebookAutoSyncPaused))return;
  const button=document.querySelector("#notebook-sync");
  if(button){button.disabled=true;button.textContent="Mengirim hasil…";}
  try{
    if(!googleNotebookAccessToken)throw new Error("Hubungkan akun Google terlebih dahulu.");
    const finals=officeData.tasks.filter(t=>t.chain_id&&Number(t.employee_idx)===1&&/pemeriksaan akhir dan penggabungan hasil tim/i.test(t.title||"")&&["submitted","approved"].includes(t.status)).sort((a,b)=>new Date(b.completed_at||b.created_at)-new Date(a.completed_at||a.created_at));
    const task=finals[0];
    if(!task){if(automatic)return;throw new Error("Belum ada hasil akhir gabungan yang sudah diserahkan. Selesaikan satu alur kerja karyawan terlebih dahulu.");}
    const result=resultRows.filter(r=>String(r.task_id)===String(task.id)).sort((a,b)=>Number(b.version)-Number(a.version))[0];
    if(!result?.content){if(automatic)return;throw new Error("Hasil akhir gabungan belum ditemukan di penyimpanan.");}
    const syncedIds=JSON.parse(localStorage.getItem("zoreNotebookSyncedResultIds")||"[]");
    if(syncedIds.includes(String(result.id))){if(!automatic)showNotice("Hasil gabungan ini sudah tersinkron ke Gemini Notebook.","success");return;}
    const list=await googleNotebookApi("/notebooks");
    let notebook=(list.notebooks||[]).find(n=>(n.display_name||n.displayName)==="ZORE AI — Pusat Riset dan Hasil Kerja");
    if(!notebook)notebook=await googleNotebookApi("/notebooks",{method:"POST",body:JSON.stringify({display_name:"ZORE AI — Pusat Riset dan Hasil Kerja"})});
    const content="# "+(task.title||"Hasil gabungan ZORE AI")+"\n\nStatus: "+task.status+"\n\n"+result.content.slice(0,950000);
    const source=await googleNotebookApi("/"+notebook.name+"/sources",{method:"POST",body:JSON.stringify({display_name:"Hasil gabungan ZORE AI — "+(task.title||"Tugas final")+" — "+new Date().toLocaleDateString("id-ID"),mime_type:"text/markdown",text_content:{content}})});
    syncedIds.push(String(result.id));
    localStorage.setItem("zoreNotebookSyncedResultIds",JSON.stringify(syncedIds.slice(-100)));
    notebookAutoSyncPaused=false;
    if(!automatic)showNotice("Berhasil mengirim hasil gabungan ke Gemini Notebook. Status sumber: "+(source.state||"diproses")+".","success");
  }catch(error){if(automatic){notebookAutoSyncPaused=true;console.warn("ZORE Notebook auto-sync paused:",error);}else showNotice("Sinkronisasi Notebook belum berhasil: "+(error?.message||error),"error");}
  finally{if(button){button.disabled=false;button.textContent="Kirim hasil gabungan terakhir ke Notebook";}}
}
function renderGoogleTools(){
  const tools=[
    {name:"Pomelli",tag:"KONTEN & PEMASARAN",desc:"Alur pemasaran bertahap: Nadia menyusun strategi dan brief, Fajar menerjemahkannya menjadi arahan visual, lalu tim memakai Pomelli untuk membuat aset kampanye. Brief mengambil instruksi dan hasil kerja tim yang sudah tersimpan. Aset keluaran Pomelli diunggah kembali ke tugas ZORE AI untuk pemeriksaan manual; belum ada API publik untuk sinkronisasi otomatis.",url:"https://labs.google.com/pomelli/about",status:"Alur karyawan + serah-terima manual",action:"Buka Pomelli"},
    {name:"Stitch",tag:"DESAIN WEBSITE & UI",desc:"Rancang tampilan website dan prototipe. Hasil desain/kode dapat diekspor untuk diterapkan.",url:"https://stitch.withgoogle.com",status:"Bantuan manual",action:"Buka Stitch"},
    {name:"Gemini Notebook",tag:"RISET & DOKUMEN",desc:"API resmi untuk membuat notebook dan mengirim hasil kerja ZORE AI. Public Preview untuk akun Google pribadi.",url:"https://notebooklm.google.com",status:googleNotebookAccessToken?"Google terhubung untuk sesi ini":"Menunggu OAuth Google",action:"Buka Gemini Notebook"},
    {name:"Antigravity",tag:"PEMROGRAMAN AI",desc:"Bantu pengembangan kode melalui aplikasi komputer dan MCP lokal; tidak berjalan otomatis di browser ZORE AI.",url:"https://antigravity.google",status:"Aplikasi komputer",action:"Buka Antigravity"},
    {name:"Gemini",tag:"ASISTEN AI & PRODUKTIVITAS",desc:"Asisten AI Google untuk membantu karyawan menyusun ide, menganalisis informasi, menulis, merangkum, dan mengembangkan solusi. Dibuka melalui Gemini; integrasi otomatis/API belum diaktifkan di ZORE AI.",url:"https://gemini.google.com",status:"Akses melalui aplikasi Gemini",action:"Buka Gemini"}
  ];
  return `<section class="google-tools-panel"><div class="section-heading"><div><span>GOOGLE AI TOOLKIT</span><h2>Alat AI pendukung ZORE AI</h2></div><span>MODE GRATIS / PREVIEW</span></div><p class="google-tools-intro">AI TOOL ASSISTANT memilih rekomendasi alat berdasarkan jabatan dan jenis pekerjaan. Koneksi Gemini Notebook menggunakan OAuth resmi; ZORE AI hanya meminta izin notebook, bukan kata sandi Google.</p><div class="google-tools-grid">${tools.map(t=>`<article class="google-tool-card"><span class="google-tool-tag">${esc(t.tag)}</span><h3>${esc(t.name)}</h3><p>${esc(t.desc)}</p><div class="google-tool-status">${esc(t.status)}</div><a href="${t.url}" target="_blank" rel="noopener noreferrer">${esc(t.action)} ↗</a></article>`).join("")}</div><div class="google-notebook-actions"><button type="button" class="primary" id="notebook-connect">${googleNotebookAccessToken?"Google Notebook terhubung":"Hubungkan Google Notebook (OAuth)"}</button><button type="button" class="secondary" id="notebook-sync">Kirim hasil gabungan terakhir ke Notebook</button><p class="google-tools-note">Sinkronisasi mengirim hasil final gabungan karyawan ke notebook milik akun Google yang Anda izinkan. Ini bukan akses baca otomatis ke seluruh isi Notebook; karyawan hanya boleh mengutip dokumen yang benar-benar tersedia dan berhasil dibaca.</p><p class="google-tools-note"><strong>Batasan saat ini:</strong> akses karyawan ke Notebook masih terbatas pada data internal dan hasil yang disinkronkan. Referensi gaya dari literatur satir klasik hanya boleh disebut jika dokumen/sumbernya benar-benar tersedia dan diperiksa. Sistem akan menandai sumber yang tidak dapat diakses sebagai belum terverifikasi.</p></div><p class="google-tools-note"><strong>Persiapan satu kali:</strong> Gemini Notebook API harus diaktifkan pada Google Cloud project yang dipakai OAuth ZORE AI, dan scope <code>https://www.googleapis.com/auth/notebook</code> harus diizinkan pada layar persetujuan Google. API gratis selama kuota Public Preview; bukan jaminan tanpa batas.</p></section>`;
}
function renderWorkspace(){
  if(officeInstance){officeInstance.destroy();officeInstance=null;}
  app.innerHTML=`<header class="topbar"><div><span class="eyebrow">WORKSPACE</span><h1>ZORE <span>AI</span></h1><p>Ruang kerja dan manajemen AI</p></div><div class="top-actions"><span class="signed-in">${esc(currentUser.email||"Pemilik")}</span><button id="signout" class="secondary">Keluar</button></div></header><nav class="quick-nav" aria-label="Navigasi cepat"><a href="#home">Ringkasan</a><a href="#zore-office-mount">Kantor 3D</a><a href="#organization">Karyawan</a><a href="#task-panel">Buat tugas</a><a href="#work-monitor">Pantau tugas</a><a href="#google-tools">Tools</a></nav><main id="home"><section class="office-intro"><span>DASHBOARD ZORE AI</span><h2>Semua pekerjaan dalam satu tempat</h2><p>Buat tugas, pantau proses karyawan, periksa hasil, dan gunakan alat bantu dari menu cepat.</p><div class="quick-actions"><a href="#task-panel">＋ Buat tugas</a><a href="#work-monitor">▤ Pantau pekerjaan</a><a href="#google-tools">⚙ Buka tools</a></div></section><section class="quick-task-helper"><div><strong>Mulai lebih cepat</strong><span>Pilih jenis pekerjaan untuk mengisi contoh instruksi.</span></div><div class="quick-task-buttons"><button type="button" data-task-preset="video">Video / animasi</button><button type="button" data-task-preset="website">Website / desain</button><button type="button" data-task-preset="research">Riset / dokumen</button><button type="button" data-task-preset="marketing">Konten / pemasaran</button></div></section><div id="google-tools">${renderGoogleTools()}</div><section class="virtual-office-section"><div id="zore-office-mount"></div></section><div id="organization">${renderOrganization()}</div><section class="profile-panel" id="profile-panel">${renderProfile(selectedEmployee)}</section><section class="task-panel" id="task-panel"><div class="section-heading"><div><span>AI WORK QUEUE</span><h2>Berikan pekerjaan nyata</h2></div><span>AI WORKER AKTIF</span></div><p class="panel-copy">Tugas akan dikirim ke antrean server. Manajer AI membagi pekerjaan ke spesialis, setiap tahap menghasilkan keluaran AI, lalu Anda cukup menyetujui rencana di awal dan hasil gabungan di akhir.</p><form id="task-form"><label>Judul pekerjaan<input id="task-title" maxlength="200" required placeholder="Contoh: Buat naskah animasi edukasi 60 detik"></label><label>Instruksi dan kriteria hasil<textarea id="task-instructions" maxlength="4000" rows="4" placeholder="Jelaskan tujuan, format, audiens, bahan, dan hasil yang diharapkan."></textarea></label><div class="task-form-row"><label>Spesialis prioritas (opsional)<select id="task-employee">${EMPLOYEE_PROFILES.filter(e=>e.idx>0).map(e=>'<option value="'+e.idx+'" '+(e.idx===1?"selected":"")+'>'+esc(e.name)+' — '+esc(e.title)+'</option>').join("")}</select></label></div><button class="primary" type="submit">Kirim ke sistem kerja AI</button><p id="task-message" class="auth-message"></p></form></section><section class="work-monitor" id="work-monitor"><div class="section-heading"><div><span>REAL WORK MONITOR</span><h2>Pemantauan pekerjaan</h2></div><button id="refresh-work" class="secondary">Perbarui</button></div>${renderWorkMonitorContent()}</section><section class="activity-feed"><h2>Aktivitas dan laporan tim</h2>${officeData.activity.slice(0,12).map(a=>'<p><span>'+fmt(a.created_at)+'</span> '+esc(a.message)+'</p>').join("")||'<p>Belum ada aktivitas baru.</p>'}</section><div id="global-notice" class="notice" hidden></div></main><footer>ZORE AI · AI EMPLOYEE WORKSPACE</footer>`;
  const host=document.querySelector("#zore-office-mount");
  try{officeInstance=mountZoreVirtualOffice(host,{employees:EMPLOYEE_PROFILES,onEmployeeSelect:employee=>selectEmployee(employee.id)});}catch(e){host.innerHTML='<p class="empty-state">Tampilan 3D tidak dapat dimuat. Panel kerja tetap tersedia.</p>';console.error(e);}
  document.querySelector("#signout").addEventListener("click",async()=>{await supabase.auth.signOut();});
  document.querySelector("#notebook-connect")?.addEventListener("click",connectGoogleNotebook);
  document.querySelector("#notebook-sync")?.addEventListener("click",syncFinalWorkToNotebook);
  document.querySelectorAll("[data-org-profile]").forEach(b=>b.addEventListener("click",()=>selectEmployee(b.dataset.orgProfile)));
  document.querySelector("#profile-panel").addEventListener("click",()=>{});
  document.querySelector("#task-form").addEventListener("submit",assignTask);
  bindWorkMonitor();
  const presets={
    video:{title:"Pembuatan video animasi",instructions:"Buat konsep video lengkap dengan ide cerita, naskah, storyboard per adegan, desain karakter dan latar, arahan animasi, serta hasil akhir yang siap ditinjau. Sertakan struktur adegan dan detail visual."},
    website:{title:"Perancangan website",instructions:"Rancang website yang modern, sederhana, responsif untuk ponsel dan desktop. Jelaskan struktur halaman, navigasi, fitur utama, tampilan UI, dan implementasi teknis. Sertakan kode yang lengkap bila memungkinkan."},
    research:{title:"Riset dan penyusunan dokumen",instructions:"Lakukan riset terstruktur berdasarkan sumber yang dapat diperiksa. Susun ringkasan, temuan utama, analisis, rekomendasi, dan daftar sumber. Tandai informasi yang belum dapat diverifikasi."},
    marketing:{title:"Pembuatan konten pemasaran dengan Pomelli",instructions:"Nadia mengoordinasikan pekerjaan pemasaran. Fajar Nugroho (Senior AI Graphic Designer & Video Editor) menjadi penanggung jawab brief visual dan kampanye. Siapkan strategi brand, target audiens, pesan utama, tujuan kampanye, konsep visual, variasi konten, caption, CTA, dan arahan desain. Susun juga satu PROMPT POMELLI yang lengkap dan siap ditempel ke Google Pomelli. Jangan mengklaim Pomelli sudah digunakan atau hasil visual sudah dibuat sebelum hasilnya benar-benar diimpor dan diperiksa. Setelah brief disiapkan, gunakan tombol Siapkan brief karyawan untuk Pomelli pada kartu tugas."}
  };
  document.querySelectorAll("[data-task-preset]").forEach(button=>button.addEventListener("click",()=>{
    const preset=presets[button.dataset.taskPreset];if(!preset)return;
    document.querySelector("#task-title").value=preset.title;
    document.querySelector("#task-instructions").value=preset.instructions;
    document.querySelector("#task-panel").scrollIntoView({behavior:"smooth",block:"start"});
    document.querySelector("#task-title").focus({preventScroll:true});
  }));
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
  if(googleNotebookAccessToken&&!notebookAutoSyncPaused)void syncFinalWorkToNotebook(true);
  if(redraw)renderWorkspace();
  else {
    const monitor=document.querySelector(".work-monitor");
    if(monitor){
      const temp=document.createElement("div");temp.innerHTML=renderWorkspaceSnapshot();
      const updated=temp.querySelector(".work-monitor");monitor.replaceWith(updated);
      bindWorkMonitor();
    }
    const feed=document.querySelector(".activity-feed");
    if(feed) feed.innerHTML='<h2>Aktivitas dan laporan tim</h2>'+(officeData.activity.slice(0,12).map(a=>'<p><span>'+fmt(a.created_at)+'</span> '+esc(a.message)+'</p>').join("")||'<p>Belum ada aktivitas baru.</p>');
  }
}
function rootWorkTasks(){
  return officeData.tasks.filter(t=>!t.chain_id||Number(t.stage_order||0)===0);
}
function taskMatchesFilter(task,filter){
  if(filter==="queue")return ["queued","in_progress","revision"].includes(task.status);
  return filter==="all"||task.status===filter;
}
function renderWorkMonitorContent(){
  const tasks=rootWorkTasks();
  const filters=[
    {id:"queue",label:"Antrean / berjalan",count:tasks.filter(t=>taskMatchesFilter(t,"queue")).length},
    {id:"submitted",label:"Menunggu tinjauan",count:tasks.filter(t=>t.status==="submitted").length},
    {id:"approved",label:"Disetujui",count:tasks.filter(t=>t.status==="approved").length},
    {id:"failed",label:"Gagal",count:tasks.filter(t=>t.status==="failed").length}
  ];
  const visible=tasks.filter(t=>taskMatchesFilter(t,activeTaskFilter));
  return '<div class="work-stats">'+filters.map(f=>'<button type="button" class="work-stat-filter '+(activeTaskFilter===f.id?'active':'')+'" data-status-filter="'+f.id+'" aria-pressed="'+(activeTaskFilter===f.id)+'"><strong>'+f.count+'</strong><span>'+f.label+'</span></button>').join("")+'</div><div class="work-list">'+(visible.length?visible.map(taskCard).join(""):'<p class="empty-state">'+(tasks.length?'Tidak ada tugas pada kategori ini.':'Belum ada pekerjaan. Kirim pekerjaan pertama melalui formulir di atas.')+'</p>')+'</div>';
}
function bindWorkMonitor(){
  const monitor=document.querySelector(".work-monitor");
  if(!monitor||monitor.dataset.filtersBound==="true")return;
  monitor.dataset.filtersBound="true";
  monitor.addEventListener("click",event=>{
    const filterButton=event.target.closest("[data-status-filter]");
    if(filterButton){
      activeTaskFilter=filterButton.dataset.statusFilter;
      const temp=document.createElement("div");temp.innerHTML=renderWorkMonitorContent();monitor.querySelector(".work-stats")?.replaceWith(temp.querySelector(".work-stats"));monitor.querySelector(".work-list")?.replaceWith(temp.querySelector(".work-list"));
      return;
    }
    if(event.target.closest("#refresh-work"))syncOffice(true);
  });
}
function renderWorkspaceSnapshot(){
  return '<section id="work-monitor" class="work-monitor"><div class="section-heading"><div><span>REAL WORK MONITOR</span><h2>Pemantauan pekerjaan</h2></div><button id="refresh-work" class="secondary">Perbarui</button></div>'+renderWorkMonitorContent()+'</section>';
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
function buildPomelliHandoffBrief(task){
  const stages=task.chain_id?officeData.tasks.filter(item=>item.chain_id===task.chain_id).sort((a,b)=>Number(a.stage_order||0)-Number(b.stage_order||0)):[task];
  const root=stages.find(item=>Number(item.stage_order||0)===0)||task;
  const manager=stages.find(item=>Number(item.employee_idx)===1&&/pemeriksaan akhir|perencanaan|brief/i.test(item.title||""));
  const visual=stages.find(item=>Number(item.employee_idx)===8);
  const collect=(stage,label)=>{
    if(!stage)return label+": belum ada tahap tersimpan.";
    const reports=officeData.reports.filter(item=>String(item.task_id)===String(stage.id)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const results=resultRows.filter(item=>String(item.task_id)===String(stage.id)).sort((a,b)=>Number(b.version)-Number(a.version));
    const parts=[];
    if(reports[0]?.body)parts.push("Laporan terbaru: "+reports[0].body);
    if(results[0]?.content)parts.push("Hasil kerja tersimpan (versi "+(results[0].version||1)+"): "+results[0].content);
    return label+": "+(parts.join("\\n\\n")||"Tahap tersedia, tetapi belum ada laporan/hasil tersimpan.");
  };
  return [
    "BRIEF KAMPANYE ZORE AI — SERAH TERIMA KE GOOGLE POMELLI",
    "PERAN: Nadia Pratama (Manajer Kreatif) memimpin strategi, tujuan, audiens, pesan dan pemeriksaan. Fajar Nugroho (Desainer Grafis & Editor Video Senior) memimpin art direction, identitas visual dan spesifikasi aset.",
    "",
    "TUGAS ASLI: "+(root.title||task.title),
    "INSTRUKSI PEMILIK: "+(root.instructions||task.instructions||"Tidak ada instruksi tambahan."),
    "",
    collect(manager,"MASUKAN NADIA / PERENCANAAN"),
    "",
    collect(visual,"MASUKAN FAJAR / ARAHAN VISUAL"),
    "",
    "INSTRUKSI POMELLI:",
    "1. Susun konsep brand dan kampanye yang konsisten dengan brief, jangan menambah klaim produk yang tidak diberikan.",
    "2. Buat beberapa variasi aset visual yang relevan dengan kanal publikasi dan target audiens.",
    "3. Sertakan headline, caption, CTA, rekomendasi format/rasio, palet warna, tipografi, komposisi dan gaya visual.",
    "4. Jaga konsistensi antar aset dan gunakan teks Bahasa Indonesia yang benar.",
    "5. Pisahkan konsep, aset yang benar-benar berhasil dibuat, dan aset yang masih berupa rekomendasi. Jangan mengaku membuat file yang tidak tersedia.",
    "",
    "HASIL YANG HARUS DIKEMBALIKAN KE ZORE AI:",
    "- File gambar/desain final dan variasinya.",
    "- Caption, headline, CTA dan format publikasi.",
    "- Catatan aset yang belum selesai atau perlu revisi.",
    "- Unggah file dan catatan tersebut pada tugas pemasaran ZORE AI agar Nadia dapat memeriksa kesesuaian brief dan Fajar dapat melakukan revisi."
  ].join("\\n");
}
async function copyPomelliBrief(value){
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return;}
  const area=document.createElement("textarea");area.value=value;area.setAttribute("readonly","");
  area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();
  const copied=document.execCommand("copy");area.remove();
  if(!copied)throw new Error("Clipboard tidak tersedia pada browser ini.");
}
async function handleWorkListClick(event){
  const target=event.target instanceof Element?event.target:null;
  if(!target)return;
  const downloadButton=target.closest("[data-download-result]");
  if(downloadButton){
    const result=resultRows.find(item=>String(item.id)===String(downloadButton.dataset.downloadResult));
    if(!result||typeof result.content!=="string"){showNotice("Isi hasil belum tersedia untuk diunduh.","error");return;}
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
  const previewButton=target.closest("[data-preview-result]");
  if(previewButton){
    const result=resultRows.find(item=>String(item.id)===String(previewButton.dataset.previewResult));
    if(!result){showNotice("Hasil pekerjaan tidak ditemukan. Perbarui daftar pekerjaan.","error");return;}
    openResultPreview(result);return;
  }
  const pomelliButton=target.closest("[data-pomelli-task]");
  if(pomelliButton){
    const task=officeData.tasks.find(item=>String(item.id)===String(pomelliButton.dataset.pomelliTask));
    if(!task){showNotice("Tugas pemasaran tidak ditemukan. Perbarui daftar pekerjaan.","error");return;}
    const prompt=buildPomelliHandoffBrief(task);
    // Open Pomelli directly during the click gesture so the browser does not block the tab.
    const popup=window.open("https://labs.google.com/pomelli/about","_blank");
    try{
      await copyPomelliBrief(prompt);
      showNotice(popup?"Brief Nadia + arahan visual Fajar berhasil disalin. Tempelkan di Pomelli, buat aset, lalu unggah hasilnya kembali ke tugas ZORE AI untuk pemeriksaan.":"Brief berhasil disalin. Jika Pomelli tidak terbuka, buka dari kartu Alat AI Google lalu tempelkan brief.","success");
    }catch(error){
      if(popup)popup.close();
      showNotice("Brief belum tersalin: "+(error?.message||"Clipboard tidak tersedia.")+". Coba salin ulang dari tugas.","error");
    }
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
