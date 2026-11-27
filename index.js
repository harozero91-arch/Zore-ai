import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const ROOMS = [
  { id: "director", name: "Ruang Direktur", x: 0, z: 0, w: 8, d: 7, color: 0xb58a4b },
  { id: "meeting", name: "Ruang Rapat", x: -11, z: -8, w: 9, d: 7 },
  { id: "collab", name: "Ruang Kolaborasi", x: 11, z: -8, w: 9, d: 7 },
  { id: "lounge", name: "Lounge & Istirahat", x: -11, z: 8, w: 9, d: 7 },
  { id: "library", name: "Perpustakaan & Riset", x: 11, z: 8, w: 9, d: 7 },
  { id: "reception", name: "Penerimaan Tamu", x: 0, z: 16, w: 10, d: 5 },
  ...Array.from({ length: 9 }, (_, i) => ({
    id: `staff-${i + 1}`, name: `Ruang Kerja ${i + 1}`,
    x: (i % 3 - 1) * 12, z: -19 - Math.floor(i / 3) * 8, w: 7, d: 5,
    staffSlot: i
  }))
];

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
    <div class="zore-office__layout">
      <nav class="zore-office__nav" aria-label="Navigasi ruangan">
        <div class="zore-office__nav-title">JELAJAHI KANTOR</div>
        <div class="zore-office__room-list"></div>
        <label class="zore-office__light">Intensitas cahaya <input data-light type="range" min="0.35" max="2.2" step="0.05" value="1.25"></label>
        <p class="zore-office__hint">Geser untuk memutar kamera · cubit untuk zoom · pilih ruangan untuk berpindah.</p>
      </nav>
      <div class="zore-office__viewport">
        <div class="zore-office__canvas"></div>
        <div class="zore-office__room-label" aria-live="polite">Atrium Utama</div>
        <div class="zore-office__help">Drag: putar · Scroll/cubit: zoom</div>
      </div>
    </div>
    <div class="zore-office__footer"><span>MODERN CLASSIC · MARBLE · MAHOGANY · CHAMPAGNE GOLD</span><span data-staff-count>${employees.length} karyawan terhubung</span></div>
  `;

  const canvasHost = host.querySelector(".zore-office__canvas");
  const roomList = host.querySelector(".zore-office__room-list");
  const label = host.querySelector(".zore-office__room-label");
  ROOMS.forEach(room => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "zore-office__room";
    b.textContent = room.name; b.dataset.room = room.id;
    b.addEventListener("click", () => visitRoom(room));
    roomList.appendChild(b);
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd8d0c1);
  scene.fog = new THREE.Fog(0xd8d0c1, 65, 115);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 180);
  camera.position.set(27, 25, 35);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = options.shadows !== false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  canvasHost.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 12; controls.maxDistance = 78;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xfff4df, 0x594536, 1.45));
  const sun = new THREE.DirectionalLight(0xffe4b8, 2.1);
  sun.position.set(-22, 35, 18); sun.castShadow = renderer.shadowMap.enabled;
  sun.shadow.mapSize.set(1024, 1024); scene.add(sun);
  const chandelier = new THREE.PointLight(0xffd99a, 38, 45);
  chandelier.position.set(0, 9, 0); scene.add(chandelier);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(75, 75), material(COLORS.marble, 0.24, 0.12));
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

  // Atrium and three balanced wings
  box(building, 0, 0.08, 0, 13, 0.25, 12, woodMat, false);
  for (const x of [-6.4, 6.4]) for (const z of [-5.8, 5.8]) {
    cylinder(building, x, 3.1, z, 0.62, 0.78, 6.2, wallMat);
    cylinder(building, x, 6.25, z, 0.82, 0.82, 0.22, goldMat);
    cylinder(building, x, 0.18, z, 0.82, 0.82, 0.25, goldMat);
  }
  box(building, 0, 6.8, 0, 14, 0.35, 13, goldMat, false);
  // Symmetric corridors
  for (const z of [-10, 10, -19, -27]) {
    box(building, 0, 0.02, z, 34, 0.18, 0.35, woodMat, false);
  }
  for (const x of [-17, 17]) box(building, x, 0.02, -10, 0.35, 0.18, 39, woodMat, false);

  // Room footprints, low walls, mahogany panels, brass trim
  ROOMS.forEach((r, index) => {
    const g = new THREE.Group(); g.position.set(r.x, 0, r.z); building.add(g);
    box(g, 0, 0.02, 0, r.w, 0.14, r.d, material(index % 2 ? 0xded5c4 : 0xe8dfcf, 0.3), false);
    const wallH = 2.65, t = 0.22;
    box(g, 0, wallH/2, -r.d/2, r.w, wallH, t, wallMat);
    box(g, -r.w/2, wallH/2, 0, t, wallH, r.d, wallMat);
    box(g, r.w/2, wallH/2, 0, t, wallH, r.d, wallMat);
    box(g, 0, 0.75, -r.d/2 + 0.13, r.w - 0.6, 1.1, 0.08, woodMat);
    box(g, 0, 0.17, 0, r.w - 0.7, 0.08, r.d - 0.7, goldMat, false);
    // Desk and seating as architectural props
    box(g, 0, 1.05, 0, Math.min(2.7, r.w * 0.42), 0.14, 1.15, woodMat);
    box(g, 0, 0.55, 0.45, 0.65, 1.0, 0.65, darkMat);
    box(g, 0, 0.2, -r.d/2 + 0.55, Math.min(3, r.w*0.5), 0.22, 0.5, emeraldMat);
    if (r.id === "director") {
      for (const dx of [-3.2, 3.2]) cylinder(g, dx, 1.2, -2.6, 0.16, 0.16, 2.4, goldMat);
    }
  });

  // Crystal chandelier
  const chandelierGroup = new THREE.Group(); chandelierGroup.position.set(0, 5.6, 0); scene.add(chandelierGroup);
  cylinder(chandelierGroup, 0, 0, 0, 0.13, 0.13, 2.2, goldMat);
  for (let i=0; i<8; i++) {
    const a = i * Math.PI / 4;
    const arm = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.045, 8, 24, Math.PI), goldMat);
    arm.rotation.x = Math.PI/2; arm.rotation.z = a; chandelierGroup.add(arm);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), material(0xfff2d5, 0.12, 0.2));
    crystal.position.set(Math.cos(a)*1.2, -0.75, Math.sin(a)*1.2); chandelierGroup.add(crystal);
  }

  // Employees are visual markers linked to real employee records supplied by the host app.
  const employeeObjects = [];
  employees.slice(0, 9).forEach((employee, i) => {
    const room = ROOMS.find(r => r.staffSlot === i) || ROOMS[5];
    const group = new THREE.Group();
    group.position.set(room.x + (i%2 ? 1.2 : -1.2), 0.12, room.z + 0.5);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.72, 4, 8), material(i%2 ? 0x345c50 : 0x70513a));
    body.position.y = 0.85; body.castShadow = true; group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 16, 12), material(0xc99570));
    head.position.y = 1.52; group.add(head);
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), goldMat);
    marker.position.y = 2.05; group.add(marker);
    group.userData.employee = employee;
    scene.add(group); employeeObjects.push(group);
  });

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

  let activeRoom = null;
  function visitRoom(room) {
    activeRoom = room;
    label.textContent = room.name;
    roomList.querySelectorAll("button").forEach(b => b.classList.toggle("is-active", b.dataset.room === room.id));
    const target = new THREE.Vector3(room.x, 0, room.z);
    controls.target.copy(target);
    const destination = target.clone().add(new THREE.Vector3(12, 10, 14));
    camera.position.lerp(destination, 0.82);
    options.onRoomChange?.(room);
  }
  roomList.querySelectorAll("button").forEach((b, i) => {
    b.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") visitRoom(ROOMS[i]);
    });
  });

  host.querySelector('[data-action="day"]').addEventListener("click", () => {
    scene.background.set(0xd8d0c1); scene.fog.color.set(0xd8d0c1);
    sun.intensity = 2.1; chandelier.intensity = 24;
  });
  host.querySelector('[data-action="night"]').addEventListener("click", () => {
    scene.background.set(0x171d28); scene.fog.color.set(0x171d28);
    sun.intensity = 0.28; chandelier.intensity = 65;
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
    controls.update();
    if (!reducedMotion) {
      chandelierGroup.rotation.y += 0.0008;
      employeeObjects.forEach((o, i) => { o.position.y = 0.12 + Math.sin(performance.now()*0.001 + i)*0.025; });
    }
    renderer.render(scene, camera);
  };
  animate();
  visitRoom(ROOMS[0]);

  return {
    visitRoom,
    setEmployees(nextEmployees) {
      // Re-mount is recommended when employee identities change; this avoids stale visual references.
      console.info("ZORE Office: panggil mount ulang dengan array karyawan terbaru.", nextEmployees?.length || 0);
    },
    destroy() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      if (audio) { audio.pause(); audio.src = ""; }
      renderer.dispose();
      host.innerHTML = ""; host.classList.remove("zore-office");
    }
  };
}
