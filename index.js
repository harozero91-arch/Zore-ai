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
  camera.position.set(35, 31, 39);
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

  // One unified open-plan office: no separate rooms or internal partitions.
  box(building, 0, 0.08, 0, OFFICE.w, 0.25, OFFICE.d, woodMat, false);
  box(building, 0, 3.1, -OFFICE.d/2, OFFICE.w, 6.2, 0.28, wallMat);
  box(building, -OFFICE.w/2, 3.1, 0, 0.28, 6.2, OFFICE.d, wallMat);
  box(building, OFFICE.w/2, 3.1, 0, 0.28, 6.2, OFFICE.d, wallMat);

  // Open-plan workstations distributed across one shared floor.
  for (let i = 0; i < 9; i++) {
    const x = (i % 3 - 1) * 10;
    const z = Math.floor(i / 3) * 8 - 7;
    box(building, x, 0.92, z, 3.2, 0.14, 1.45, woodMat);
    box(building, x, 0.48, z + 0.78, 0.75, 0.88, 0.75, darkMat);
    box(building, x, 1.48, z - 0.12, 1.35, 0.08, 0.08, goldMat);
  }
  // Shared meeting table and lounge seating remain open to the main office.
  box(building, -12, 0.78, 9, 5.2, 0.16, 2.2, woodMat);
  for (const x of [-14, -10]) for (const z of [7, 11]) {
    box(building, x, 0.42, z, 0.9, 0.75, 0.9, emeraldMat);
  }
  box(building, 12, 0.72, 9, 4.5, 0.18, 1.8, woodMat);
  box(building, 12, 0.38, 11, 5.2, 0.65, 0.8, emeraldMat);

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

  // Living employee agents: distinct appearance, autonomous walking and social conversations.
  const employeeObjects = [];
  const walkBounds = { minX: -17, maxX: 17, minZ: -11, maxZ: 11 };
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
    const staffX = (i % 3 - 1) * 10;
    const staffZ = Math.floor(i / 3) * 8 - 7 + 1.8;
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
    }
    const lines = dialogueLines[Math.floor(Math.random() * dialogueLines.length)];
    const topicA = roleTopics[first.userData.employee.role] || "pekerjaan";
    const topicB = roleTopics[second.userData.employee.role] || "pekerjaan";
    first.userData.conversation = lines[0].replace("proyek ini", topicA);
    second.userData.conversation = lines[1].replace("datanya", topicB);
    socialState.pair = [first, second]; socialState.until = now + 9000;
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
