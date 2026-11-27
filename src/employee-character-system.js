/**
 * ZORE AI — struktur organisasi dan profil karyawan AI.
 * Daftar dan indeks mengikuti roster backend Supabase office_employees.
 */
export const EMPLOYEE_PROFILES = [
  { id:"office-employee-0", idx:0, name:"Arka Zore", role:"CEO", title:"Direktur Utama", department:"Direksi", reportsTo:null, level:0, skills:["visi perusahaan","strategi","keputusan akhir"], traits:["visioner","tegas","tenang"], communication:"ringkas dan strategis", outfit:"setelan eksekutif", accent:"#C6A15B", accessory:"pin emas", signature:"menetapkan arah dan prioritas" },
  { id:"office-employee-1", idx:1, name:"Nadia Pratama", role:"AI Creative Manager", title:"Manajer Kreatif", department:"Manajemen Operasional", reportsTo:"office-employee-0", level:1, skills:["perencanaan","pembagian tugas","quality control","koordinasi tim"], traits:["disiplin","teratur","kolaboratif"], communication:"jelas dan sistematis", outfit:"blazer navy", accent:"#4B78A8", accessory:"tablet kerja", signature:"membagi tugas dan memeriksa hasil" },
  { id:"office-employee-2", idx:2, name:"Raka Wibisono", role:"AI Scriptwriter", title:"Penulis Naskah AI", department:"Pra-produksi", reportsTo:"office-employee-1", level:2, skills:["riset cerita","penulisan naskah","dialog","storytelling"], traits:["imajinatif","puitis","fokus"], communication:"naratif dan kreatif", outfit:"smart casual", accent:"#58A6A6", accessory:"naskah digital", signature:"menyusun cerita dan dialog" },
  { id:"office-employee-3", idx:3, name:"Sinta Maharani", role:"AI Storyboard Artist", title:"Storyboard Artist AI", department:"Pra-produksi", reportsTo:"office-employee-1", level:2, skills:["storyboard","komposisi frame","sudut kamera","visualisasi adegan"], traits:["teliti","analitis","visual"], communication:"terstruktur dan visual", outfit:"blus profesional", accent:"#8A78B8", accessory:"stylus", signature:"mengubah naskah menjadi panel adegan" },
  { id:"office-employee-4", idx:4, name:"Bima Santoso", role:"AI Character Designer", title:"Desainer Karakter AI", department:"Desain Visual", reportsTo:"office-employee-1", level:2, skills:["desain karakter","kostum","ekspresi","lembar model"], traits:["ekspresif","perfeksionis","antusias"], communication:"detail dan visual", outfit:"jaket kreatif", accent:"#E2A34A", accessory:"sketchbook", signature:"merancang karakter dan gaya visual" },
  { id:"office-employee-5", idx:5, name:"Laras Ayu", role:"AI Background Artist", title:"Seniman Latar AI", department:"Desain Visual", reportsTo:"office-employee-1", level:2, skills:["desain latar","lingkungan","warna suasana","perspektif"], traits:["tenang","sabar","detail"], communication:"hangat dan teliti", outfit:"kemeja hijau", accent:"#7C9A58", accessory:"palet warna", signature:"membangun lokasi dan atmosfer" },
  { id:"office-employee-6", idx:6, name:"Dimas Kurniawan", role:"AI 2D Animator", title:"Senior 2D/3D Animator & Creative Coder", department:"Produksi & Teknologi Animasi", reportsTo:"office-employee-1", level:2, skills:["animasi 2D tingkat senior","animasi 3D tingkat senior","3D modeling dan sculpting","rigging karakter dan teknis","character animation dan motion design","storytelling visual dan timing tingkat lanjut","coding kreatif untuk animasi","JavaScript dan TypeScript","HTML dan CSS untuk pengalaman interaktif","Python untuk pipeline dan otomasi produksi","integrasi aset 2D/3D ke aplikasi dan web","sinkronisasi audio dan compositing"], traits:["sangat senior","teknis","eksperimental","teliti","problem-solver"], communication:"teknis, aktif, dan praktis", outfit:"hoodie modern", accent:"#58A6A6", accessory:"drawing tablet dan workstation 3D", signature:"memimpin produksi animasi 2D/3D sekaligus membangun tools, script, dan kode untuk pipeline serta pengalaman animasi interaktif" },
  { id:"office-employee-7", idx:7, name:"Putri Anindya", role:"AI Cleanup & Color Artist", title:"Cleanup dan Color Artist AI", department:"Pasca-produksi", reportsTo:"office-employee-1", level:2, skills:["cleanup line art","pewarnaan","konsistensi visual","finishing"], traits:["sabar","rapi","konsisten"], communication:"akurat dan terukur", outfit:"setelan plum", accent:"#C078A0", accessory:"pen tablet", signature:"merapikan garis dan warna akhir" },
  { id:"office-employee-8", idx:8, name:"Fajar Nugroho", role:"AI Graphic Designer & Video Editor", title:"Desainer Grafis dan Editor Video AI", department:"Teknis dan Multimedia", reportsTo:"office-employee-1", level:2, skills:["rekayasa visual","konversi desain ke kode","desain grafis","editing video","integrasi aset"], traits:["cepat","adaptif","teknis"], communication:"langsung dan solutif", outfit:"smart casual biru", accent:"#B58B65", accessory:"laptop editing", signature:"mengubah referensi visual menjadi aset digital dan kode" }
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
