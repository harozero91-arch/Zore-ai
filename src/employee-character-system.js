/**
 * ZORE AI — struktur organisasi dan profil karyawan AI.
 * Daftar dan indeks mengikuti roster backend Supabase office_employees.
 */
export const EMPLOYEE_PROFILES = [
  { id:"office-employee-0", idx:0, name:"Arka Zore", role:"CEO", title:"Direktur Utama", department:"Direksi", reportsTo:null, level:0, skills:["visi perusahaan","strategi","keputusan akhir"], traits:["visioner","tegas","tenang"], communication:"ringkas dan strategis", outfit:"setelan eksekutif", accent:"#C6A15B", accessory:"pin emas", signature:"menetapkan arah dan prioritas", visual:{face:"oval",hair:"side-part",wardrobe:"navy-suit",expression:"calm-leader",accessory:"gold-pin",prop:"executive-folder",renderStyle:"stylized-film-3d",headScale:1.18,identityLocked:true} },
  { id:"office-employee-1", idx:1, name:"Nadia Pratama", role:"AI Creative Manager", title:"Senior AI Creative Manager", seniority:"Senior", department:"Manajemen Operasional", reportsTo:"office-employee-0", level:1, skills:["kepemimpinan kreatif tingkat senior","strategi produksi dan perencanaan proyek","orkestrasi tim multidisiplin","pembagian tugas berbasis keahlian","quality assurance dan quality control","manajemen pipeline produksi","evaluasi risiko, jadwal, dan sumber daya","mentoring dan pengembangan standar kerja"], traits:["disiplin","teratur","kolaboratif"], communication:"jelas dan sistematis", outfit:"blazer navy", accent:"#4B78A8", accessory:"tablet kerja", signature:"membagi tugas dan memeriksa hasil", visual:{face:"soft-oval",hair:"low-bun",wardrobe:"navy-blazer",expression:"organized-confident",accessory:"tablet",prop:"tablet",renderStyle:"stylized-film-3d",headScale:1.18,identityLocked:true} },
  { id:"office-employee-2", idx:2, name:"Raka Wibisono", role:"AI Scriptwriter", title:"Senior AI Scriptwriter", seniority:"Senior", department:"Pra-produksi", reportsTo:"office-employee-1", level:2, skills:["riset dan pengembangan cerita tingkat senior","penulisan skenario profesional","dialog dan karakterisasi mendalam","storytelling lintas format","struktur naratif dan pacing","adaptasi naskah dan world-building"], traits:["imajinatif","puitis","fokus"], communication:"naratif dan kreatif", outfit:"smart casual", accent:"#58A6A6", accessory:"naskah digital", signature:"menyusun cerita dan dialog", visual:{face:"angular",hair:"wavy-medium",wardrobe:"teal-creative",expression:"imaginative",accessory:"notebook",prop:"notebook",renderStyle:"stylized-film-3d",headScale:1.18,identityLocked:true} },
  { id:"office-employee-3", idx:3, name:"Sinta Maharani", role:"AI Storyboard Artist", title:"Senior AI Storyboard Artist", seniority:"Senior", department:"Pra-produksi", reportsTo:"office-employee-1", level:2, skills:["storyboard sinematik tingkat senior","komposisi frame dan visual storytelling","bahasa kamera dan cinematography","blocking serta staging adegan","previsualization 2D/3D","continuity dan shot planning"], traits:["teliti","analitis","visual"], communication:"terstruktur dan visual", outfit:"blus profesional", accent:"#8A78B8", accessory:"stylus", signature:"mengubah naskah menjadi panel adegan", visual:{face:"heart",hair:"long-ponytail",wardrobe:"violet-artist",expression:"analytical",accessory:"digital-stylus",prop:"stylus",renderStyle:"stylized-film-3d",headScale:1.18,identityLocked:true} },
  { id:"office-employee-4", idx:4, name:"Bima Santoso", role:"AI Character Designer", title:"Senior AI Character Designer", seniority:"Senior", department:"Desain Visual", reportsTo:"office-employee-1", level:2, skills:["desain karakter profesional","character anatomy dan proporsi","kostum, material, dan aksesori","ekspresi dan pose library","character turnaround dan model sheet","visual development dan style consistency"], traits:["ekspresif","perfeksionis","antusias"], communication:"detail dan visual", outfit:"jaket kreatif", accent:"#E2A34A", accessory:"sketchbook", signature:"merancang karakter dan gaya visual", visual:{face:"square",hair:"textured-quiff",wardrobe:"ochre-creative",expression:"expressive",accessory:"sketchbook",prop:"sketchbook",renderStyle:"stylized-film-3d",headScale:1.18,identityLocked:true} },
  { id:"office-employee-5", idx:5, name:"Laras Ayu", role:"AI Background Artist", title:"Senior AI Environment & Background Artist", seniority:"Senior", department:"Desain Visual", reportsTo:"office-employee-1", level:2, skills:["environment design tingkat senior","background painting dan digital matte painting","perspektif dan komposisi lingkungan","lighting, atmosfer, dan color scripting","world-building visual","integrasi environment 2D/3D"], traits:["tenang","sabar","detail"], communication:"hangat dan teliti", outfit:"kemeja hijau", accent:"#7C9A58", accessory:"palet warna", signature:"membangun lokasi dan atmosfer", visual:{face:"round",hair:"long-soft-wave",wardrobe:"sage-green",expression:"patient-focused",accessory:"color-tablet",prop:"palette",renderStyle:"stylized-film-3d",headScale:1.18,identityLocked:true} },
  { id:"office-employee-6", idx:6, name:"Dimas Kurniawan", role:"AI 2D Animator", title:"Senior 2D/3D Animator, Creative Coder & Dubbing Specialist", seniority:"Senior", department:"Produksi & Teknologi Animasi", reportsTo:"office-employee-1", level:2, skills:["animasi 2D tingkat senior","storyboard-to-animation","keyframe dan in-between 2D","timing dan easing","frame-by-frame animation","2D compositing","ekspor MP4/GIF dengan FFmpeg","animasi 3D tingkat senior","3D modeling dan sculpting","rigging karakter dan teknis","character animation dan motion design","storytelling visual dan timing tingkat lanjut","coding kreatif untuk animasi","JavaScript dan TypeScript","HTML dan CSS untuk pengalaman interaktif","Python untuk pipeline dan otomasi produksi","Blender Python untuk membuat dan mengedit scene 3D secara otomatis","modeling 3D, material PBR, kamera, lighting, rendering, dan ekspor .blend/.glb","integrasi aset 2D/3D ke aplikasi dan web","sinkronisasi audio dan compositing","dubbing dan pengisian suara karakter","voice direction dan pengarahan dialog","lip-sync 2D/3D dan sinkronisasi gerak bibir","editing dialog, noise cleanup, dan audio mixing","penyesuaian ekspresi serta timing animasi dengan performa suara"], traits:["sangat senior","teknis","eksperimental","teliti","problem-solver"], communication:"teknis, aktif, dan praktis", outfit:"hoodie modern", accent:"#58A6A6", accessory:"drawing tablet dan workstation 3D", signature:"memimpin produksi animasi 2D/3D, otomasi Blender Python, modeling, rigging, ekspor aset .blend/.glb, creative coding, dubbing karakter, pengarahan suara, lip-sync, dan penyelarasan audio-visual", visual:{face:"athletic",hair:"short-spiky",wardrobe:"turquoise-hoodie",expression:"energetic",accessory:"animation-stylus",prop:"stylus",renderStyle:"stylized-film-3d",headScale:1.18,identityLocked:true} },
  { id:"office-employee-7", idx:7, name:"Putri Anindya", role:"AI Cleanup & Color Artist", title:"Senior AI Cleanup & Color Artist", seniority:"Senior", department:"Pasca-produksi", reportsTo:"office-employee-1", level:2, skills:["cleanup line art tingkat profesional","digital inking dan line consistency","color styling dan color grading","shading, lighting, dan rendering pass","quality control frame-by-frame","finishing dan continuity visual"], traits:["sabar","rapi","konsisten"], communication:"akurat dan terukur", outfit:"setelan plum", accent:"#C078A0", accessory:"pen tablet", signature:"merapikan garis dan warna akhir", visual:{face:"heart",hair:"neat-bob",wardrobe:"plum-professional",expression:"precise-focused",accessory:"color-palette",prop:"palette",renderStyle:"stylized-film-3d",headScale:1.18,identityLocked:true} },
  { id:"office-employee-8", idx:8, name:"Fajar Nugroho", role:"AI Graphic Designer & Video Editor", title:"Senior AI Graphic Designer & Video Editor", seniority:"Senior", department:"Teknis dan Multimedia", reportsTo:"office-employee-1", level:2, skills:["art direction dan desain grafis tingkat senior","brand system dan visual communication","video editing dan post-production","motion graphics dan compositing","creative coding dan integrasi desain ke web","optimasi aset digital dan multimedia"], traits:["cepat","adaptif","teknis"], communication:"langsung dan solutif", outfit:"smart casual biru", accent:"#B58B65", accessory:"laptop editing", signature:"mengubah referensi visual menjadi aset digital dan kode", visual:{face:"angular",hair:"short-undercut",wardrobe:"blue-techwear",expression:"technical-alert",accessory:"laptop",prop:"laptop",renderStyle:"stylized-film-3d",headScale:1.18,identityLocked:true} }
];

export const ORG_DEPARTMENTS = [
  { name:"Direksi", description:"Arah strategis dan keputusan akhir", members:["office-employee-0"] },
  { name:"Manajemen Operasional", description:"Perencanaan, pembagian tugas, dan pemeriksaan mutu", members:["office-employee-1"] },
  { name:"Pra-produksi", description:"Riset, naskah, dan storyboard", members:["office-employee-2","office-employee-3"] },
  { name:"Desain Visual", description:"Karakter, latar, dan aset visual", members:["office-employee-4","office-employee-5"] },
  { name:"Produksi", description:"Animasi dan pelaksanaan produksi", members:["office-employee-6"] },
  { name:"Pasca-produksi", description:"Cleanup, pewarnaan, dan finishing", members:["office-employee-7"] },
  { name:"Teknis dan Multimedia", description:"Rekayasa visual, kode, grafis, dan video", members:["office-employee-8"] }
];

export const ANIMATIONS = {
  idle:["breathing","blink","eye-look","head-turn"],
  work:["typing","reading","writing"],
  social:["walking","talking","listening","discussion"],
  presentation:["standing","hand-gesture","pointing"],
  thinking:["head-tilt","chin-touch","look-away"],
  rest:["sitting","stretching","relaxed-breathing"]
};
const MOODS = { task_started:"focused",task_completed:"proud",goal_exceeded:"excited",task_blocked:"concerned",error_found:"serious",clarification_needed:"confused",positive_feedback:"happy",negative_feedback:"disappointed",long_workload:"tired",idea_discovered:"enthusiastic" };
const COLLABORATION = {
  CEO:["AI Creative Manager"],
  "AI Creative Manager":["CEO","AI Scriptwriter","AI Storyboard Artist","AI Character Designer","AI Background Artist","AI 2D Animator","AI Cleanup & Color Artist","AI Graphic Designer & Video Editor"],
  "AI Scriptwriter":["AI Storyboard Artist","AI Creative Manager"],
  "AI Storyboard Artist":["AI Scriptwriter","AI Character Designer","AI Creative Manager"],
  "AI Character Designer":["AI Background Artist","AI Storyboard Artist","AI 2D Animator"],
  "AI Background Artist":["AI Character Designer","AI 2D Animator"],
  "AI 2D Animator":["AI Background Artist","AI Cleanup & Color Artist","AI Creative Manager"],
  "AI Cleanup & Color Artist":["AI 2D Animator","AI Graphic Designer & Video Editor"],
  "AI Graphic Designer & Video Editor":["AI Cleanup & Color Artist","AI Creative Manager"]
};
export function getEmployee(id){ return EMPLOYEE_PROFILES.find(e=>e.id===id)||null; }
export function getMood(event){ return MOODS[event]||"neutral"; }
export function getActivity(task={}) {
  const text=`${task.title||""} ${task.description||""}`.toLowerCase();
  if(/rapat|meeting|diskusi|kolaborasi/.test(text)) return "social";
  if(/presentasi|laporan|demo/.test(text)) return "presentation";
  if(/analisis|strategi|evaluasi|riset/.test(text)) return "thinking";
  if(/istirahat|break|rehat/.test(text)) return "rest";
  if(/coding|program|debug|desain|mengerjakan|animasi|naskah/.test(text)) return "work";
  return "idle";
}
export function getCharacterState(id,task,event){
  const employee=getEmployee(id); if(!employee) return null;
  const activity=getActivity(task);
  return {employeeId:id,mood:getMood(event),activity,animations:ANIMATIONS[activity],color:employee.accent,communication:employee.communication};
}
export function getCollaborators(id){
  const employee=getEmployee(id); if(!employee) return [];
  const roles=COLLABORATION[employee.role]||[];
  return EMPLOYEE_PROFILES.filter(p=>p.id!==id&&roles.includes(p.role));
}
export function getEmployeeRoster(){return EMPLOYEE_PROFILES.map(({id,idx,name,role,title,department,reportsTo})=>({id,idx,name,role,title,department,reportsTo}));}
