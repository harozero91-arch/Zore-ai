import * as THREE from "three";

const OFFICE = { name: "Kantor Terpadu", x: 0, z: 0, w: 42, d: 30 };

const COLORS = {
  marble: 0xe9e3d7, mahogany: 0x4b2c20, gold: 0xc7a56a,
  ivory: 0xf4efdf, emerald: 0x1f5b48, dark: 0x211b18
};

function material(color, roughness = 0.65, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function mountZoreVirtualOffice(host, options = {}) {
  if (!host) throw new Error("Elemen host kantor virtual tidak ditemukan.");
  const employees = Array.isArray(options.employees) ? options.employees : [];
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  host.classList.add("zore-office");
  host.innerHTML = `
    <div class="zore-office__top">
      <div><div class="zore-office__eyebrow">ZORE AI · EXECUTIVE CAMPUS</div><strong>Kantor Virtual 3D</strong></div>
      <div class="zore-office__actions">
        <button type="button" data-action="day">☀ Siang</button>
        <button type="button" data-action="night">☾ Malam</button>
        <button type="button" data-action="sound" aria-pressed="false">♫ Suara: Off</button>
      </div>
    </div>
    <div class="zore-office__layout zore-office__layout--single">
      <div class="zore-office__viewport">
        <div class="zore-office__canvas"></div>
        <div class="zore-office__room-label" aria-live="polite">Kantor Terpadu · Semua Divisi</div>\n        <div class="zore-office__social-status">● Karyawan aktif · berjalan & berinteraksi otomatis</div>
        <div class="zore-office__views" aria-label="Sudut pandang kantor">
          <button type="button" data-view="front" class="is-active">Depan</button>
          <button type="button" data-view="left">Sektor kiri</button>
          <button type="button" data-view="right">Sektor kanan</button>
        </div>
        <label class="zore-office__light">Intensitas cahaya <input data-light type="range" min="0.35" max="2.2" step="0.05" value="1.25"></label>
        <div class="zore-office__help">Tampilan tetap · satu area kantor terbuka</div>
      </div>
    </div>
    <div class="zore-office__footer"><span>MODERN CLASSIC · MARBLE · MAHOGANY · CHAMPAGNE GOLD</span><span data-staff-count>${employees.length} karyawan terhubung</span></div>
  `;

  const canvasHost = host.querySelector(".zore-office__canvas");
  const label = host.querySelector(".zore-office__room-label");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd8d0c1);
  scene.fog = new THREE.Fog(0xd8d0c1, 65, 115);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
  camera.position.set(38, 40, 43);
  camera.lookAt(0, 1.5, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = options.shadows !== false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  canvasHost.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xfff4df, 0x594536, 1.45));
  const sun = new THREE.DirectionalLight(0xffe4b8, 2.1);
  sun.position.set(-22, 35, 18); sun.castShadow = renderer.shadowMap.enabled;
  sun.shadow.mapSize.set(1024, 1024); scene.add(sun);
  const chandelier = new THREE.PointLight(0xffd99a, 38, 45);
  chandelier.position.set(0, 9, 0); scene.add(chandelier);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(48, 36), material(COLORS.marble, 0.24, 0.12));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.16; floor.receiveShadow = true; scene.add(floor);

  const building = new THREE.Group(); scene.add(building);
  const wallMat = material(COLORS.ivory);
  const woodMat = material(COLORS.mahogany, 0.38);
  const goldMat = material(COLORS.gold, 0.3, 0.65);
  const darkMat = material(COLORS.dark, 0.5);
  const emeraldMat = material(COLORS.emerald, 0.7);

  function box(parent, x, y, z, w, h, d, mat, cast = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function cylinder(parent, x, y, z, r1, r2, h, mat) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 20), mat);
    mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
  }

  // Isometric open-plan ZORE campus inspired by the supplied reference.
  // Keep one connected floor, open front, roofless walls and transparent glass dividers.
  box(building, 0, 0.08, 0, OFFICE.w, 0.25, OFFICE.d, woodMat, false);

  // Warm herringbone-inspired floor strips.
  const floorLight = material(0xd8b98d, 0.72);
  const floorDark = material(0xb88f61, 0.72);
  for (let row = 0; row < 15; row++) {
    const z = -14 + row * 2;
    for (let col = 0; col < 10; col++) {
      const x = -19 + col * 4;
      const tile = box(building, x, 0.218, z, 3.85, 0.025, 1.82,
        (row + col) % 2 ? floorLight : floorDark, false);
      tile.rotation.y = (row % 2) * 0.025;
    }
  }

  // Rear and side walls; front stays open for a dollhouse/isometric view.
  box(building, 0, 3.1, -15, 42, 6.2, 0.3, wallMat);
  box(building, -21, 3.1, 0, 0.3, 30, 6.2, wallMat);
  box(building, 21, 3.1, 0, 0.3, 30, 6.2, wallMat);
  // Wall skirting and architectural trim.
  box(building, 0, 0.34, -14.78, 41.7, 0.22, 0.12, goldMat, false);
  box(building, -20.78, 0.34, 0, 0.12, 0.22, 29.5, goldMat, false);
  box(building, 20.78, 0.34, 0, 0.12, 0.22, 29.5, goldMat, false);

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x9fc5bd, transparent: true, opacity: 0.22, roughness: 0.16, metalness: 0.12
  });
  const frameMat = material(0x242c2b, 0.35, 0.55);
  function glassPartition(x, z, length, alongX = true, height = 3.0) {
    const panel = box(building, x, height / 2 + 0.2, z,
      alongX ? length : 0.12, height, alongX ? 0.12 : length, glassMat, false);
    panel.material = glassMat;
    const count = Math.max(2, Math.floor(length / 1.7));
    for (let i = 0; i <= count; i++) {
      const offset = -length / 2 + length * i / count;
      box(building, x + (alongX ? offset : 0), height / 2 + 0.2,
        z + (alongX ? 0 : offset), 0.09, height + 0.12, 0.09, frameMat, false);
    }
    box(building, x, 0.28, z, alongX ? length : 0.14, 0.12, alongX ? 0.14 : length, frameMat, false);
    box(building, x, height + 0.26, z, alongX ? length : 0.14, 0.12, alongX ? 0.14 : length, frameMat, false);
  }

  // Glass team pods on both sides, with wide walkways between them.
  glassPartition(-15.2, -6.4, 8.0, false, 2.7);
  glassPartition(-8.6, -10.1, 6.2, true, 2.7);
  glassPartition(8.8, -10.0, 6.4, true, 2.7);
  glassPartition(15.3, -5.8, 8.2, false, 2.7);
  glassPartition(-15.0, 3.1, 7.2, false, 2.7);
  glassPartition(15.0, 3.1, 7.2, false, 2.7);

  const deskTop = material(0xb98250, 0.42);
  const deskEdge = material(0x70452e, 0.48);
  const screenMat = material(0x172b3a, 0.22, 0.25);
  const screenGlow = material(0x39a6c3, 0.28, 0.2);
  const chairMat = material(0x315d78, 0.58);
  const plantLeaf = material(0x39764c, 0.78);
  const potMat = material(0xd6c7ad, 0.8);

  function addMonitor(x, z, rotation = 0, scale = 1) {
    const group = new THREE.Group();
    group.position.set(x, 0.3, z); group.rotation.y = rotation; building.add(group);
    box(group, 0, 1.12 * scale, 0, 1.22 * scale, 0.76 * scale, 0.09, screenMat);
    box(group, 0, 1.12 * scale, 0.052, 1.08 * scale, 0.61 * scale, 0.012, screenGlow, false);
    box(group, 0, 0.68 * scale, 0.02, 0.09 * scale, 0.2 * scale, 0.12, darkMat);
    box(group, 0, 0.56 * scale, 0.02, 0.48 * scale, 0.06 * scale, 0.28 * scale, darkMat);
    // Small chart bars on the glowing display.
    for (let i = 0; i < 4; i++) box(group, (-0.32 + i * 0.2) * scale,
      (0.91 + (i % 3) * 0.09) * scale, 0.064, 0.07 * scale,
      (0.12 + (i % 3) * 0.18) * scale, 0.012, goldMat, false);
  }

  function addDesk(x, z, rotation = 0, chairColor = chairMat, width = 3.25) {
    const group = new THREE.Group();
    group.position.set(x, 0, z); group.rotation.y = rotation; building.add(group);
    box(group, 0, 0.94, 0, width, 0.16, 1.45, deskTop);
    box(group, 0, 0.83, 0, width + 0.08, 0.07, 1.5, deskEdge);
    for (const dx of [-width / 2 + 0.18, width / 2 - 0.18]) {
      box(group, dx, 0.46, 0, 0.13, 0.78, 1.18, darkMat);
    }
    addMonitor(x - 0.25 * Math.cos(rotation), z - 0.25 * Math.sin(rotation), rotation, 0.85);
    // Keyboard and desk accessories.
    box(group, 0.35, 1.045, 0.48, 0.72, 0.035, 0.24, darkMat, false);
    const mug = cylinder(group, -width / 2 + 0.45, 1.12, 0.42, 0.12, 0.12, 0.18, wallMat);
    mug.rotation.z = 0;
    // Rolling chair behind the desk.
    const chair = new THREE.Group(); chair.position.set(0, 0, 1.35); group.add(chair);
    box(chair, 0, 0.78, 0, 0.78, 0.18, 0.72, chairColor);
    box(chair, 0, 1.28, 0.28, 0.78, 0.92, 0.16, chairColor);
    cylinder(chair, 0, 0.38, 0, 0.09, 0.09, 0.55, darkMat);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      box(chair, Math.cos(a) * 0.28, 0.12, Math.sin(a) * 0.28, 0.48, 0.07, 0.08, darkMat);
    }
  }

  // Eight individual workstations arranged in glass-fronted team areas.
  const deskSpots = [
    [-16.5,-11.2,0],[-10.7,-11.2,0],[-16.5,-2.1,0],[-10.7,-2.1,0],
    [10.7,-11.2,Math.PI],[16.5,-11.2,Math.PI],[10.7,-2.1,Math.PI],[16.5,-2.1,Math.PI],
    [-5.4,-11.2,0],[0,-11.2,0],[5.4,-11.2,0]
  ];
  deskSpots.forEach((p, i) => addDesk(p[0], p[1], p[2], i % 2 ? emeraldMat : chairMat, 2.8));

  // Central round meeting table, chairs, laptops and presentation display.
  const meeting = new THREE.Group(); meeting.position.set(0, 0, 1.0); building.add(meeting);
  cylinder(meeting, 0, 0.92, 0, 2.65, 2.65, 0.2, deskTop);
  cylinder(meeting, 0, 0.48, 0, 0.34, 0.5, 0.75, woodMat);
  cylinder(meeting, 0, 0.34, 0, 1.05, 1.05, 0.12, deskEdge);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const seat = new THREE.Group();
    seat.position.set(Math.cos(a) * 3.45, 0, Math.sin(a) * 3.45);
    seat.rotation.y = -a + Math.PI / 2; meeting.add(seat);
    box(seat, 0, 0.58, 0, 0.92, 0.18, 0.86, i % 2 ? emeraldMat : material(0x7b3946));
    box(seat, 0, 1.2, -0.34, 0.92, 1.15, 0.18, i % 2 ? emeraldMat : material(0x7b3946));
    cylinder(seat, 0, 0.25, 0, 0.08, 0.08, 0.5, darkMat);
  }
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    box(meeting, Math.cos(a) * 1.45, 1.06, Math.sin(a) * 1.45, 0.58, 0.05, 0.38, screenMat, false);
  }
  // Meeting-room rug.
  const rug = new THREE.Mesh(new THREE.CircleGeometry(6.0, 48), material(0x263f55, 0.95));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.24, 1); building.add(rug);

  // Reception desk and branded wall at the open entrance, left side.
  const reception = new THREE.Group(); reception.position.set(-14.3, 0, 10.4); reception.rotation.y = Math.PI / 2; building.add(reception);
  box(reception, 0, 0.58, 0, 4.5, 1.1, 1.35, woodMat);
  box(reception, 0, 1.18, 0, 4.7, 0.16, 1.48, material(0xe8dfd0, 0.25));
  box(reception, 0, 0.6, 0.7, 4.25, 0.68, 0.08, goldMat, false);
  const logoCanvas = document.createElement("canvas"); logoCanvas.width = 512; logoCanvas.height = 128;
  const logoCtx = logoCanvas.getContext("2d"); logoCtx.fillStyle = "#f4d99f";
  logoCtx.font = "bold 76px Georgia"; logoCtx.textAlign = "center"; logoCtx.fillText("ZORE AI",256,88);
  const logoTexture = new THREE.CanvasTexture(logoCanvas); logoTexture.colorSpace = THREE.SRGBColorSpace;
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(3.4,0.85), new THREE.MeshBasicMaterial({map:logoTexture,transparent:true}));
  logo.position.set(0, 0.72, 0.755); reception.add(logo);

  // Lounge area in the front-right corner: sofa, coffee table and carpet.
  const loungeRug = new THREE.Mesh(new THREE.CircleGeometry(5.2, 40), material(0x2b6070, 0.95));
  loungeRug.rotation.x = -Math.PI / 2; loungeRug.position.set(12.0, 0.24, 10.0); building.add(loungeRug);
  const sofaMat = material(0x294d69, 0.72);
  box(building, 12, 0.72, 12.4, 8.2, 0.55, 1.25, sofaMat);
  box(building, 12, 1.25, 13.0, 8.2, 1.05, 0.38, sofaMat);
  box(building, 7.95, 0.95, 11.2, 0.42, 1.0, 2.8, sofaMat);
  box(building, 16.05, 0.95, 11.2, 0.42, 1.0, 2.8, sofaMat);
  box(building, 12, 0.62, 8.5, 3.3, 0.18, 1.8, deskTop);
  for (const x of [10.9,13.1]) box(building, x, 0.32, 8.5, 0.12, 0.55, 0.12, darkMat);
  box(building, 12, 0.74, 8.35, 0.8, 0.07, 0.5, material(0xeee4d2), false);

  // Indoor plants: tapered pots and layered foliage.
  function addPlant(x, z, scale = 1) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38*scale,0.28*scale,0.72*scale,18), potMat);
    pot.position.set(x,0.58*scale,z); building.add(pot);
    cylinder(building,x,0.98*scale,z,0.13*scale,0.13*scale,0.6*scale,woodMat);
    for (let i=0;i<7;i++) {
      const a=i*Math.PI*2/7;
      const leaf=new THREE.Mesh(new THREE.SphereGeometry(0.22*scale,10,8),plantLeaf);
      leaf.scale.set(0.55,1.9,0.42);
      leaf.position.set(x+Math.cos(a)*0.45*scale,1.5*scale+(i%3)*0.16*scale,z+Math.sin(a)*0.45*scale);
      leaf.rotation.z=Math.cos(a)*0.45; leaf.rotation.x=Math.sin(a)*0.35; building.add(leaf);
    }
  }
  [[-19,-13,1.2],[-19,7,1.0],[-7,-14,0.9],[7,-14,0.9],[19,-12,1.1],
    [19,5,1.0],[-19,13,1.1],[19,14,1.0],[4,7,0.8]].forEach(p=>addPlant(...p));

  // Wall art and large dashboard panels add the polished creative-office character.
  function wallScreen(x, y, z, rotation = 0, width = 3.2, height = 1.8) {
    const panel = new THREE.Group(); panel.position.set(x,y,z); panel.rotation.y=rotation; building.add(panel);
    box(panel,0,0,0,width+0.18,height+0.18,0.12,frameMat);
    box(panel,0,0,0.075,width,height,0.025,screenMat,false);
    for(let i=0;i<4;i++) box(panel,-width*0.32+i*width*0.2,-height*0.22+(i%3)*0.12,0.095,0.12,0.18+(i%3)*0.12,0.015,screenGlow,false);
  }
  wallScreen(-12.5,3.9,-14.78,0,3.5,2.0);
  wallScreen(12.5,3.9,-14.78,0,3.5,2.0);
  wallScreen(-20.78,3.6,-7.5,Math.PI/2,2.8,1.7);
  wallScreen(20.78,3.6,-7.5,-Math.PI/2,2.8,1.7);

  // Ceiling is intentionally omitted so the complete interior remains visible.
  // Warm architectural lighting.
  const pendant = new THREE.PointLight(0xffd69a, 28, 28);
  pendant.position.set(0,5.8,-5); scene.add(pendant);
  const entranceLight = new THREE.PointLight(0xffe2b4, 18, 20);
  entranceLight.position.set(-14,4,10); scene.add(entranceLight);

  // Living employee agents: distinct appearance, autonomous walking and social conversations.
  const employeeObjects = [];
  const walkBounds = { minX: -18, maxX: 18, minZ: -12, maxZ: 12 };
  const dialogueLines = [
    ["Bagaimana perkembangan tugasmu?", "Sudah berjalan. Aku sedang memeriksa detailnya."],
    ["Aku punya ide untuk proyek ini.", "Menarik. Coba jelaskan, kita kembangkan bersama."],
    ["Bisa bantu analisis sebentar?", "Tentu, mari kita lihat datanya bersama."],
    ["Apa prioritas berikutnya?", "Kita selesaikan yang paling penting lebih dulu."],
    ["Terima kasih atas bantuannya.", "Sama-sama, kerja tim membuat semuanya lebih mudah."]
  ];
  const roleTopics = {
    "Direktur Utama": "arah strategi perusahaan",
    "Manajer Operasional": "alur kerja tim",
    "Programmer": "pengembangan sistem",
    "Analis Data": "temuan data",
    "Peneliti": "hasil riset",
    "Desainer Kreatif": "konsep desain",
    "Pemasaran": "kampanye pemasaran",
    "Keuangan": "rencana anggaran",
    "Administrasi": "jadwal dan dokumen"
  };
  const collabRoles = {
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
  const makeBubble = (message) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(255,249,232,0.97)";
    ctx.strokeStyle = "#c7a56a"; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.roundRect(8, 8, 496, 108, 25); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#35251b"; ctx.font = "bold 27px Arial";
    let text = message;
    while (ctx.measureText(text).width > 450 && text.length > 8) text = text.slice(0, -2) + "…";
    ctx.fillText(text, 28, 72);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map:texture, transparent:true, depthTest:false}));
    sprite.scale.set(5.0, 1.25, 1); sprite.position.y = 3.05;
    sprite.userData.texture = texture;
    return sprite;
  };
  employees.slice(0, 9).forEach((employee, i) => {
    const group = new THREE.Group();
    const staffSpots = [[-16,-12],[-10,-2],[-16,-2],[-10,-12],[10,-12],[16,-12],[10,-2],[16,-2],[-5,-7]];
    const [staffX, staffZ] = staffSpots[i] || [0,0];
    group.position.set(staffX, 0.12, staffZ);
    const outfitColor = employee.accent || (i % 2 ? "#345c50" : "#70513a");
    const bodyMat = material(new THREE.Color(outfitColor), 0.58, 0.04);
    const skinMat = material(i % 3 === 0 ? 0xd5a17d : i % 3 === 1 ? 0xc99570 : 0xe0b18e);
    const darkMatLocal = material(0x29201c);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.68, 4, 10), bodyMat);
    body.position.y = 0.92; body.castShadow = true; group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 16), skinMat);
    head.position.y = 1.62; head.castShadow = true; group.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.275, 16, 10, 0, Math.PI*2, 0, Math.PI*0.55), darkMatLocal);
    hair.position.y = 1.72; group.add(hair);
    const eyeMat = material(0x241b17);
    for (const x of [-0.105, 0.105]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), eyeMat);
      eye.position.set(x, 1.64, 0.245); group.add(eye);
    }
    const arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.43, 3, 8), skinMat);
      arm.position.set(side * 0.39, 0.95, 0);
      arm.rotation.z = side * -0.18; group.add(arm); arms.push(arm);
    }
    const legs = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.105, 0.36, 3, 8), darkMatLocal);
      leg.position.set(side * 0.14, 0.35, 0); group.add(leg); legs.push(leg);
    }
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), goldMat);
    marker.position.y = 2.12; group.add(marker);
    const nameCanvas = document.createElement("canvas");
    nameCanvas.width = 320; nameCanvas.height = 64;
    const nameCtx = nameCanvas.getContext("2d");
    nameCtx.fillStyle = "#fff3d8"; nameCtx.font = "bold 34px Arial";
    nameCtx.textAlign = "center"; nameCtx.fillText(employee.name || "Karyawan", 160, 43);
    const nameTexture = new THREE.CanvasTexture(nameCanvas);
    const nameTag = new THREE.Sprite(new THREE.SpriteMaterial({map:nameTexture, transparent:true, depthTest:false}));
    nameTag.scale.set(2.2, 0.44, 1); nameTag.position.y = 2.48; group.add(nameTag);
    group.userData = {
      employee, arms, legs, target: new THREE.Vector3(staffX, 0.12, staffZ),
      speed: 1.25 + (i % 4) * 0.12, phase: i * 0.8, state: "walking",
      bubble: null, bubbleUntil: 0, partner: null
    };
    scene.add(group); employeeObjects.push(group);
  });

  const socialState = { nextAt: 5, pair: null, until: 0 };
  function beginConversation(now) {
    if (employeeObjects.length < 2) return;
    const firstIndex = Math.floor(Math.random() * employeeObjects.length);
    const first = employeeObjects[firstIndex];
    const eligible = employeeObjects.filter((candidate, index) =>
      index !== firstIndex &&
      (collabRoles[first.userData.employee.role] || []).includes(candidate.userData.employee.role)
    );
    const second = eligible.length ? eligible[Math.floor(Math.random() * eligible.length)]
      : employeeObjects[(firstIndex + 1) % employeeObjects.length];
    const midpoint = first.position.clone().add(second.position).multiplyScalar(0.5);
    const angle = Math.random() * Math.PI * 2;
    const meetA = midpoint.clone().add(new THREE.Vector3(Math.cos(angle)*0.85, 0, Math.sin(angle)*0.85));
    const meetB = midpoint.clone().add(new THREE.Vector3(-Math.cos(angle)*0.85, 0, -Math.sin(angle)*0.85));
    for (const [person, target] of [[first, meetA], [second, meetB]]) {
      person.userData.target.set(
        THREE.MathUtils.clamp(target.x, walkBounds.minX, walkBounds.maxX), 0.12,
        THREE.MathUtils.clamp(target.z, walkBounds.minZ, walkBounds.maxZ)
      );
      person.userData.partner = person === first ? second : first;
      person.userData.state = "meeting";
      person.userData.spoke = false;
    }
    const lines = dialogueLines[Math.floor(Math.random() * dialogueLines.length)];
    const topicA = roleTopics[first.userData.employee.role] || "pekerjaan";
    const topicB = roleTopics[second.userData.employee.role] || "pekerjaan";
    first.userData.conversation = lines[0].replace("proyek ini", topicA);
    second.userData.conversation = lines[1].replace("datanya", topicB);
    socialState.pair = [first, second]; socialState.until = now + 18000;
  }

  function showSpeech(person, message, now) {
    if (person.userData.bubble) {
      person.remove(person.userData.bubble);
      person.userData.bubble.material.map?.dispose();
      person.userData.bubble.material.dispose();
    }
    const bubble = makeBubble(message);
    person.add(bubble);
    person.userData.bubble = bubble;
    person.userData.bubbleUntil = now + 3600;
  }

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  renderer.domElement.addEventListener("click", event => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(employeeObjects, true);
    const obj = hits.find(h => h.object.parent?.userData.employee)?.object.parent;
    if (obj) options.onEmployeeSelect?.(obj.userData.employee);
  });

  host.querySelector('[data-action="day"]').addEventListener("click", () => {
    scene.background.set(0xd8d0c1); scene.fog.color.set(0xd8d0c1);
    sun.intensity = 2.1; chandelier.intensity = 24;
  });
  host.querySelector('[data-action="night"]').addEventListener("click", () => {
    scene.background.set(0x171d28); scene.fog.color.set(0x171d28);
    sun.intensity = 0.28; chandelier.intensity = 65;
  });
  // Elevated fixed viewpoints stay inside the open-plan footprint so side walls
  // do not block the view into the roofless office.
  const viewPositions = {
    front: new THREE.Vector3(0, 27, 36),
    left: new THREE.Vector3(-16, 29, 9),
    right: new THREE.Vector3(16, 29, 9)
  };
  host.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => {
      const position = viewPositions[button.dataset.view];
      if (!position) return;
      camera.position.copy(position);
      camera.lookAt(0, 1.5, 0);
      host.querySelectorAll("[data-view]").forEach(item => item.classList.toggle("is-active", item === button));
    });
  });

  host.querySelector("[data-light]").addEventListener("input", e => {
    const value = Number(e.target.value);
    sun.intensity = value * 1.55; chandelier.intensity = value * 28;
  });

  // Optional ambience: caller may provide an audio URL. No sound starts without user action.
  let audio = null;
  const soundButton = host.querySelector('[data-action="sound"]');
  if (options.ambienceUrl) {
    audio = new Audio(options.ambienceUrl); audio.loop = true; audio.volume = 0.22;
    soundButton.addEventListener("click", async () => {
      if (audio.paused) { try { await audio.play(); soundButton.textContent = "♫ Suara: On"; soundButton.setAttribute("aria-pressed","true"); } catch {} }
      else { audio.pause(); soundButton.textContent = "♫ Suara: Off"; soundButton.setAttribute("aria-pressed","false"); }
    });
  } else {
    soundButton.disabled = true; soundButton.title = "Tambahkan ambienceUrl dari aplikasi untuk mengaktifkan suara.";
  }

  const resize = () => {
    const w = Math.max(1, canvasHost.clientWidth), h = Math.max(1, canvasHost.clientHeight);
    camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false);
  };
  const observer = new ResizeObserver(resize); observer.observe(canvasHost); resize();
  let frame = 0, disposed = false;
  const animate = () => {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const now = performance.now();
    if (!reducedMotion) {
      if (!socialState.pair && now >= socialState.nextAt) beginConversation(now);
      if (socialState.pair) {
        const [a, b] = socialState.pair;
        if (now > socialState.until) {
          for (const person of [a, b]) {
            person.userData.partner = null; person.userData.state = "walking";
            person.userData.target.set(
              THREE.MathUtils.randFloat(walkBounds.minX, walkBounds.maxX), 0.12,
              THREE.MathUtils.randFloat(walkBounds.minZ, walkBounds.maxZ)
            );
            if (person.userData.bubble) { person.remove(person.userData.bubble); person.userData.bubble = null; }
          }
          socialState.pair = null; socialState.nextAt = now + THREE.MathUtils.randFloat(8500, 14500);
        } else if (a.position.distanceTo(b.position) < 2.5 && !a.userData.spoke) {
          showSpeech(a, a.userData.conversation, now);
          showSpeech(b, b.userData.conversation, now + 900);
          a.userData.spoke = b.userData.spoke = true;
        }
      }
      employeeObjects.forEach((o, i) => {
        const data = o.userData;
        const delta = data.target.clone().sub(o.position); delta.y = 0;
        const distance = delta.length();
        if (distance < 0.35 && !data.partner) {
          data.target.set(THREE.MathUtils.randFloat(walkBounds.minX, walkBounds.maxX), 0.12,
            THREE.MathUtils.randFloat(walkBounds.minZ, walkBounds.maxZ));
        }
        const moving = distance > 0.18;
        if (moving) {
          delta.normalize();
          const step = Math.min(distance, data.speed * 0.016);
          o.position.addScaledVector(delta, step);
          o.rotation.y = Math.atan2(delta.x, delta.z);
        }
        o.position.y = 0.12 + (moving ? Math.abs(Math.sin(now*0.009 + data.phase))*0.045 : Math.sin(now*0.002 + data.phase)*0.018);
        data.legs.forEach((leg, index) => { leg.rotation.x = moving ? Math.sin(now*0.012 + data.phase + index*Math.PI)*0.55 : 0; });
        data.arms.forEach((arm, index) => { arm.rotation.x = moving ? -Math.sin(now*0.012 + data.phase + index*Math.PI)*0.38 : Math.sin(now*0.002 + data.phase)*0.06; });
        if (data.bubble && now > data.bubbleUntil) {
          o.remove(data.bubble); data.bubble.material.map?.dispose(); data.bubble.material.dispose(); data.bubble = null;
        }
        if (data.partner && data.state === "meeting") {
          const toward = data.partner.position.clone().sub(o.position);
          if (toward.lengthSq() > 0.01) o.rotation.y = Math.atan2(toward.x, toward.z);
        }
      });
    }
    renderer.render(scene, camera);
  };
  animate();

  return {
    setEmployees(nextEmployees) {
      // Re-mount is recommended when employee identities change; this avoids stale visual references.
      console.info("ZORE Office: panggil mount ulang dengan array karyawan terbaru.", nextEmployees?.length || 0);
    },
    destroy() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect();
      if (audio) { audio.pause(); audio.src = ""; }
      renderer.dispose();
      host.innerHTML = ""; host.classList.remove("zore-office");
    }
  };
}
