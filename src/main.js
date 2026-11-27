import "./styles.css";
import "../office.css";
import { mountZoreVirtualOffice } from "../index.js";
import { supabase } from "./supabase.js";
import { EMPLOYEE_PROFILES, ORG_DEPARTMENTS, getCharacterState, getCollaborators } from "./employee-character-system.js";
import { buildEmployeeTaskBrief } from "./ai-agent-policy.js";

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
  return `<div class="profile-heading"><span>PROFIL DAN TANGGUNG JAWAB</span><h2>${esc(employee.name)}</h2><p>${esc(employee.title)} · ${esc(employee.department)}</p></div><div class="profile-grid"><div><h3>Misi jabatan</h3><p>${esc(employee.signature)}.</p></div><div><h3>Keahlian utama</h3><p>${employee.skills.map(esc).join(" · ")}</p></div><div><h3>Melapor kepada</h3><p>${employee.reportsTo?esc(EMPLOYEE_PROFILES.find(e=>e.id===employee.reportsTo)?.name):"Pemilik / pemegang keputusan tertinggi"}</p></div><div><h3>Rekan kolaborasi</h3><p>${colleagues.map(e=>esc(e.name)).join(", ")||"Koordinasi langsung dengan tim."}</p></div><div><h3>Batas kewenangan</h3><p>Menjalankan pekerjaan sesuai jabatan, menyerahkan hasil untuk pemeriksaan manajer, dan tidak menyetujui pengeluaran atau tindakan eksternal tanpa persetujuan pemilik.</p></div></div>`;
}
function taskCard(task){
  const e=employeeByIdx(task.employee_idx); const status=task.status||"queued"; const progress=Number(task.progress||0); const isAi=task.progress_kind==="ai_generated";
  const results=resultRows.filter(r=>r.task_id===task.id).sort((a,b)=>b.version-a.version);
  const report=officeData.reports.find(r=>r.task_id===task.id&&r.kind==="final");
  return `<article class="work-card"><div class="work-card-head"><div><span class="work-employee">${esc(e?.name||"Tim ZORE AI")} · Tahap ${Number(task.stage_order||0)+1}</span><h3>${esc(task.title)}</h3></div><span class="task-status ${esc(status)}">${statusLabel[status]||esc(status)}</span></div><p>${esc(task.instructions||"")} </p><div class="task-meta"><span>Prioritas: ${esc(task.priority||"normal")}</span><span>Dibuat: ${fmt(task.created_at)}</span><span>${isAi?"Progres dari proses AI":"Status antrean"}</span></div><div class="progress-track"><i style="width:${Math.max(0,Math.min(100,progress*100))}%"></i></div><div class="progress-caption">${isAi?Math.round(progress*100)+"%":"Progres belum diverifikasi sebagai hasil AI"}</div>${task.last_error?'<p class="task-error">'+esc(task.last_error)+'</p>':""}${results.length?'<details class="result-details"><summary>Lihat hasil kerja AI ('+results.length+')</summary>'+results.map(r=>'<div class="result-body"><div class="result-toolbar"><small>Versi '+esc(r.version)+' · '+fmt(r.created_at)+'</small><button type="button" class="secondary copy-report" data-copy-text="'+encodeURIComponent(r.content)+'">Salin hasil</button></div><pre>'+esc(r.content)+'</pre></div>').join("")+'</details>':""}${report?'<div class="manager-report-wrap"><p class="manager-report"><strong>Laporan:</strong> '+esc(report.body)+'</p><button type="button" class="secondary copy-report" data-copy-text="'+encodeURIComponent(report.body)+'">Salin laporan</button></div>':""}${status==="submitted"?'<div class="review-actions"><button data-approve="'+esc(task.id)+'" class="approve">Setujui hasil</button><button data-revise="'+esc(task.id)+'" class="secondary">Minta revisi</button></div>':""}<div class="task-management"><button type="button" class="delete-task" data-delete-task="${esc(task.id)}" aria-label="Hapus tugas">Hapus tugas</button></div></article>`;
}
function renderWorkspace(){
  if(officeInstance){officeInstance.destroy();officeInstance=null;}
  app.innerHTML=`<header class="topbar"><div><span class="eyebrow">VIRTUAL MANAGEMENT SYSTEM</span><h1>ZORE <span>AI</span></h1><p>Kantor Virtual · Sistem Kerja AI</p></div><div class="top-actions"><span class="signed-in">${esc(currentUser.email||"Pemilik")}</span><button id="signout" class="secondary">Keluar</button></div></header><main><section class="office-intro"><span>EXECUTIVE OFFICE</span><h2>Organisasi dan ruang kerja ZORE AI</h2><p>Setiap karyawan memiliki jabatan, tanggung jawab, alur pelaporan, dan hasil pekerjaan yang tercatat.</p></section><section class="virtual-office-section"><div id="zore-office-mount"></div></section>${renderOrganization()}<section class="profile-panel" id="profile-panel">${renderProfile(selectedEmployee)}</section><section class="task-panel" id="task-panel"><div class="section-heading"><div><span>AI WORK QUEUE</span><h2>Berikan pekerjaan nyata</h2></div><span>AI WORKER AKTIF</span></div><p class="panel-copy">Tugas akan dikirim ke antrean server. Manajer AI membagi pekerjaan ke spesialis, setiap tahap menghasilkan keluaran AI, lalu hasil akhir menunggu persetujuan Anda.</p><form id="task-form"><label>Judul pekerjaan<input id="task-title" maxlength="200" required placeholder="Contoh: Buat naskah animasi edukasi 60 detik"></label><label>Instruksi dan kriteria hasil<textarea id="task-instructions" maxlength="4000" rows="4" placeholder="Jelaskan tujuan, format, audiens, bahan, dan hasil yang diharapkan."></textarea></label><div class="task-form-row"><label>Penanggung jawab awal<select id="task-employee">${EMPLOYEE_PROFILES.filter(e=>e.idx>0).map(e=>'<option value="'+e.idx+'" '+(e.idx===1?"selected":"")+'>'+esc(e.name)+' — '+esc(e.title)+'</option>').join("")}</select></label></div><button class="primary" type="submit">Kirim ke sistem kerja AI</button><p id="task-message" class="auth-message"></p></form></section><section class="work-monitor"><div class="section-heading"><div><span>REAL WORK MONITOR</span><h2>Pemantauan pekerjaan</h2></div><button id="refresh-work" class="secondary">Perbarui</button></div><div class="work-stats"><div><strong>${officeData.tasks.filter(t=>["queued","in_progress","revision"].includes(t.status)).length}</strong><span>Antrean / berjalan</span></div><div><strong>${officeData.tasks.filter(t=>t.status==="submitted").length}</strong><span>Menunggu tinjauan</span></div><div><strong>${officeData.tasks.filter(t=>t.status==="approved").length}</strong><span>Disetujui</span></div><div><strong>${officeData.tasks.filter(t=>t.status==="failed").length}</strong><span>Gagal</span></div></div><div class="work-list">${officeData.tasks.length?officeData.tasks.map(taskCard).join(""):'<p class="empty-state">Belum ada pekerjaan. Kirim pekerjaan pertama melalui formulir di atas.</p>'}</div></section><section class="activity-feed"><h2>Aktivitas dan laporan tim</h2>${officeData.activity.slice(0,12).map(a=>'<p><span>'+fmt(a.created_at)+'</span> '+esc(a.message)+'</p>').join("")||'<p>Belum ada aktivitas baru.</p>'}</section><div id="global-notice" class="notice" hidden></div></main><footer>ZORE AI · AI EMPLOYEE WORKSPACE</footer>`;
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
  if(ids.length){const {data:rows,error:resultError}=await supabase.from("office_task_results").select("id,task_id,version,content,model,created_at").in("task_id",ids).order("version",{ascending:false});if(!resultError)resultRows=rows||[];}
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
