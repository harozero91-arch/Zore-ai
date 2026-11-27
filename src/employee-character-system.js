
/**
 * ZORE AI - Employee Character System
 * Data karakter, kepribadian, aktivitas, dan kolaborasi 9 karyawan.
 */

export const EMPLOYEE_PROFILES = [
  {
    id: "employee-01",
    name: "Arka",
    role: "Direktur Utama",
    skills: ["kepemimpinan", "strategi", "pengambilan keputusan"],
    traits: ["visioner", "tegas", "tenang"],
    communication: "singkat dan berwibawa",
    outfit: "setelan eksekutif hitam",
    accent: "#C6A15B",
    accessory: "pin emas",
    signature: "anggukan yakin"
  },
  {
    id: "employee-02",
    name: "Nara",
    role: "Manajer Operasional",
    skills: ["koordinasi", "perencanaan", "pengawasan"],
    traits: ["disiplin", "teratur", "protektif"],
    communication: "jelas dan sistematis",
    outfit: "blazer navy",
    accent: "#4B78A8",
    accessory: "tablet",
    signature: "menyilangkan tangan saat mengevaluasi"
  },
  {
    id: "employee-03",
    name: "Raka",
    role: "Programmer",
    skills: ["JavaScript", "coding", "debugging"],
    traits: ["logis", "penasaran", "fokus"],
    communication: "teknis dan langsung",
    outfit: "hoodie modern",
    accent: "#58A6A6",
    accessory: "kacamata",
    signature: "memiringkan kepala saat berpikir"
  },
  {
    id: "employee-04",
    name: "Saira",
    role: "Analis Data",
    skills: ["analisis data", "statistik", "pelaporan"],
    traits: ["teliti", "objektif", "sabar"],
    communication: "berdasarkan bukti",
    outfit: "blus krem formal",
    accent: "#8A78B8",
    accessory: "kacamata bulat",
    signature: "menunjuk detail layar"
  },
  {
    id: "employee-05",
    name: "Dimas",
    role: "Peneliti",
    skills: ["riset", "verifikasi fakta", "analisis"],
    traits: ["kritis", "ingin tahu", "tekun"],
    communication: "eksploratif",
    outfit: "kemeja hijau zaitun",
    accent: "#7C9A58",
    accessory: "buku catatan",
    signature: "mengangkat alis saat menemukan ide"
  },
  {
    id: "employee-06",
    name: "Keira",
    role: "Desainer Kreatif",
    skills: ["desain visual", "UI UX", "storytelling"],
    traits: ["imajinatif", "ekspresif", "adaptif"],
    communication: "hangat dan penuh ide",
    outfit: "jaket modern plum",
    accent: "#C078A0",
    accessory: "stylus digital",
    signature: "tersenyum saat mendapat ide"
  },
  {
    id: "employee-07",
    name: "Bima",
    role: "Pemasaran",
    skills: ["kampanye", "copywriting", "riset audiens"],
    traits: ["energik", "persuasif", "optimistis"],
    communication: "antusias dan komunikatif",
    outfit: "smart casual biru",
    accent: "#E2A34A",
    accessory: "headset",
    signature: "gestur tangan saat presentasi"
  },
  {
    id: "employee-08",
    name: "Tania",
    role: "Keuangan",
    skills: ["anggaran", "pembukuan", "evaluasi risiko"],
    traits: ["hati-hati", "konsisten", "bertanggung jawab"],
    communication: "tenang dan akurat",
    outfit: "setelan abu-abu",
    accent: "#6C9B83",
    accessory: "folder laporan",
    signature: "memeriksa catatan sebelum menyetujui"
  },
  {
    id: "employee-09",
    name: "Farel",
    role: "Administrasi",
    skills: ["dokumentasi", "penjadwalan", "arsip"],
    traits: ["ramah", "cekatan", "membantu"],
    communication: "sopan dan responsif",
    outfit: "kemeja putih dan rompi cokelat",
    accent: "#B58B65",
    accessory: "clipboard",
    signature: "senyum menyapa rekan"
  }
];

export const ANIMATIONS = {
  idle: ["breathing", "blink", "eye-look", "head-turn"],
  work: ["typing", "reading", "writing"],
  social: ["walking", "talking", "listening", "discussion"],
  presentation: ["standing", "hand-gesture", "pointing"],
  thinking: ["head-tilt", "chin-touch", "look-away"],
  rest: ["sitting", "stretching", "relaxed-breathing"]
};

const MOODS = {
  task_started: "focused",
  task_completed: "proud",
  goal_exceeded: "excited",
  task_blocked: "concerned",
  error_found: "serious",
  clarification_needed: "confused",
  positive_feedback: "happy",
  negative_feedback: "disappointed",
  long_workload: "tired",
  idea_discovered: "enthusiastic"
};

export function getEmployee(id) {
  return EMPLOYEE_PROFILES.find(employee => employee.id === id) || null;
}

export function getMood(event) {
  return MOODS[event] || "neutral";
}

export function getActivity(task = {}) {
  const text = `${task.title || ""} ${task.description || ""}`.toLowerCase();

  if (/rapat|meeting|diskusi|kolaborasi/.test(text)) return "social";
  if (/presentasi|laporan|demo/.test(text)) return "presentation";
  if (/analisis|strategi|evaluasi|riset/.test(text)) return "thinking";
  if (/istirahat|break|rehat/.test(text)) return "rest";
  if (/coding|program|debug|desain|mengerjakan/.test(text)) return "work";

  return "idle";
}

export function getCharacterState(id, task, event) {
  const employee = getEmployee(id);
  if (!employee) return null;

  const activity = getActivity(task);

  return {
    employeeId: id,
    mood: getMood(event),
    activity,
    animations: ANIMATIONS[activity],
    color: employee.accent,
    communication: employee.communication
  };
}

const COLLABORATION = {
  "Direktur Utama": ["Manajer Operasional", "Keuangan", "Analis Data"],
  "Manajer Operasional": ["Direktur Utama", "Administrasi", "Programmer"],
  "Programmer": ["Analis Data", "Peneliti", "Manajer Operasional"],
  "Analis Data": ["Keuangan", "Peneliti", "Direktur Utama"],
  "Peneliti": ["Analis Data", "Desainer Kreatif", "Programmer"],
  "Desainer Kreatif": ["Pemasaran", "Peneliti", "Programmer"],
  "Pemasaran": ["Desainer Kreatif", "Analis Data", "Direktur Utama"],
  "Keuangan": ["Direktur Utama", "Analis Data", "Manajer Operasional"],
  "Administrasi": ["Manajer Operasional", "Direktur Utama", "Keuangan"]
};

export function getCollaborators(id) {
  const employee = getEmployee(id);
  if (!employee) return [];

  const roles = COLLABORATION[employee.role] || [];

  return EMPLOYEE_PROFILES.filter(person =>
    person.id !== id && roles.includes(person.role)
  );
}

export function getEmployeeRoster() {
  return EMPLOYEE_PROFILES.map(({ id, name, role }) => ({
    id, name, role
  }));
}
