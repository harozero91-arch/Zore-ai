import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const OFFICE = { name: "Kantor Terpadu", x: 0, z: 0, w: 42, d: 30 };

const COLORS = {
  marble: 0xe9e3d7, mahogany: 0x4b2c20, gold: 0xc7a56a,
  ivory: 0xf4efdf, emerald: 0x1f5b48, dark: 0x211b18
};

function material(color, roughness = 0.65, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 0.85 });
}

function createSurfaceTexture(kind, baseColor, repeatX = 2, repeatY = 2, maxAnisotropy = 4) {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = baseColor; ctx.fillRect(0, 0, 512, 512);
  if (kind === "marble") {
    for (let i = 0; i < 15; i++) {
      const x = (i * 83 + 29) % 512, y = (i * 137 + 41) % 512;
      ctx.beginPath(); ctx.moveTo(x - 170, y - 90);
      ctx.bezierCurveTo(x - 60, y - 150, x + 40, y + 130, x + 180, y + 80);
      ctx.strokeStyle = i % 3 === 0 ? "rgba(154,126,94,0.24)" : "rgba(255,255,255,0.52)";
      ctx.lineWidth = i % 4 === 0 ? 3 : 1.4; ctx.stroke();
    }
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = i % 2 ? "rgba(90,75,60,0.035)" : "rgba(255,255,255,0.06)";
      ctx.fillRect((i * 97) % 512, (i * 193) % 512, 2, 2);
    }
  } else if (kind === "fabric") {
    // Fine woven threads create a subtle textile response under grazing light.
    for (let i = 0; i < 512; i += 4) {
      ctx.strokeStyle = i % 8 === 0 ? "rgba(255,255,255,0.12)" : "rgba(12,20,24,0.10)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
      ctx.strokeStyle = i % 8 === 0 ? "rgba(255,255,255,0.09)" : "rgba(12,20,24,0.08)";
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    for (let i = 0; i < 1800; i++) {
      ctx.fillStyle = i % 2 ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.035)";
      ctx.fillRect((i * 97) % 512, (i * 193) % 512, 1, 1);
    }
  } else {
    for (let i = 0; i < 46; i++) {
      const y = i * 11 + (i % 3) * 2;
      ctx.beginPath(); ctx.moveTo(0, y);
      ctx.bezierCurveTo(150, y + Math.sin(i) * 4, 340, y - Math.cos(i) * 5, 512, y + Math.sin(i * 0.7) * 3);
      ctx.strokeStyle = i % 4 === 0 ? "rgba(55,25,12,0.16)" : "rgba(255,220,170,0.12)";
      ctx.lineWidth = i % 5 === 0 ? 3 : 1; ctx.stroke();
    }
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeatX, repeatY);
  map.anisotropy = maxAnisotropy;
  const bumpMap = map.clone();
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.needsUpdate = true;
  return { map, bumpMap };
}

export function mountZoreVirtualOffice(host, options = {}) {
  if (!host) throw new Error("Elemen host kantor virtual tidak ditemukan.");
  const employees = Array.isArray(options.employees) ? options.employees : [];
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  host.classList.add("zore-office");
  host.innerHTML = `
    <div class="zore-office__top">
      <div><div class="zore-office__eyebrow">ZORE AI · EXECUTIVE CAMPUS</div><strong>Kantor Virtual 3D</strong></div>
      <div class="zore-office__top-right">
        <div class="zore-office__clock" aria-live="polite">
          <strong data-server-clock>--:--:--</strong>
          <span data-server-date>Memuat waktu server…</span>
          <small data-server-status>MENYINKRONKAN SERVER</small>
        </div>
        <div class="zore-office__actions">
          <button type="button" data-action="sound" aria-pressed="false">♫ Suara: Off</button>
          <button type="button" data-action="meeting">▣ Mulai rapat</button>
        </div>
      </div>
    </div>
    <div class="zore-office__layout zore-office__layout--single">
      <div class="zore-office__viewport">
        <div class="zore-office__canvas"></div>
        <div class="zore-office__room-label" aria-live="polite">Kantor Terpadu · Semua Divisi</div>
        <div class="zore-office__social-status">● Karyawan aktif · berjalan & berinteraksi otomatis</div>
        <div class="zore-office__touch-hint">Geser satu jari untuk melihat sisi · cubit dua jari untuk zoom</div>
        <div class="zore-office__help">Tampilan tetap · satu area kantor terbuka</div>
      </div>
    </div>
    <div class="zore-office__footer"><span>MODERN CLASSIC · MARBLE · MAHOGANY · CHAMPAGNE GOLD</span><span data-staff-count>${employees.length} karyawan terhubung</span></div>
  `;

  const canvasHost = host.querySelector(".zore-office__canvas");
  const label = host.querySelector(".zore-office__room-label");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd8d0c1);
  scene.fog = new THREE.Fog(0xd8d0c1, 105, 185);
  const isMobile = window.matchMedia?.("(max-width: 760px)").matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
  const camera = new THREE.PerspectiveCamera(isMobile ? 52 : 46, 1, 0.1, 220);
  camera.position.set(34, 37, 39);
  camera.lookAt(0, 1.5, 0);

  const deviceCores = navigator.hardwareConcurrency || 4;
  const qualityTier = !isMobile && deviceCores >= 8 ? "high" : deviceCores <= 4 ? "low" : "balanced";
  const renderer = new THREE.WebGLRenderer({
    antialias: qualityTier !== "low", alpha: false, powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.45 : qualityTier === "high" ? 2 : 1.6));
  renderer.shadowMap.enabled = options.shadows !== false;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.94;
  canvasHost.appendChild(renderer.domElement);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const environmentRoom = new RoomEnvironment();
  const environmentTarget = pmremGenerator.fromScene(environmentRoom, 0.04);
  scene.environment = environmentTarget.texture;
  scene.environmentIntensity = qualityTier === "high" ? 0.46 : 0.34;
  environmentRoom.dispose?.();
  pmremGenerator.dispose();

  let composer = null;
  if (qualityTier === "high" && !isMobile) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const ssaoPass = new SSAOPass(scene, camera, 1, 1);
    ssaoPass.kernelRadius = 6;
    ssaoPass.minDistance = 0.004;
    ssaoPass.maxDistance = 0.12;
    composer.addPass(ssaoPass);
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.025, 0.12, 0.96));
    composer.addPass(new OutputPass());
  }

  // Layered architectural lighting: soft sky fill, warm key light and cool bounce.
  const skyFill = new THREE.HemisphereLight(0xfff5e7, 0x46372d, 0.92);
  scene.add(skyFill);
  scene.add(new THREE.AmbientLight(0xfff4e8, 0.14));
  const sun = new THREE.DirectionalLight(0xffe6c6, 1.35);
  sun.position.set(-22, 35, 18); sun.castShadow = renderer.shadowMap.enabled;
  const bounceLight = new THREE.DirectionalLight(0xc6ddff, 0.24);
  bounceLight.position.set(25, 16, 8); scene.add(bounceLight);
  const warmFill = new THREE.PointLight(0xffd7a1, 8, 30, 1.8);
  warmFill.position.set(-11, 5.1, -3); scene.add(warmFill);
  const neutralFill = new THREE.PointLight(0xffedda, 7, 28, 1.8);
  neutralFill.position.set(11, 5.0, -3); scene.add(neutralFill);
  const conferenceBounce = new THREE.PointLight(0xffd49a, 6, 19, 1.65);
  conferenceBounce.position.set(0, 5.6, 1); scene.add(conferenceBounce);
  const loungeBounce = new THREE.PointLight(0xd8e8ff, 4, 22, 1.8);
  loungeBounce.position.set(12, 4.4, 10); scene.add(loungeBounce);
  const receptionFill = new THREE.PointLight(0xffd9ad, 5, 18, 1.8);
  receptionFill.position.set(-14, 4.2, 10); scene.add(receptionFill);
  const shadowResolution = qualityTier === "high" ? 2048 : 1024;
  const shadowSize = isMobile ? 1024 : shadowResolution === 2048 ? 3072 : 2048;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  sun.shadow.camera.left = -28; sun.shadow.camera.right = 28;
  sun.shadow.camera.top = 24; sun.shadow.camera.bottom = -24;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.00012; sun.shadow.normalBias = 0.025;
  sun.shadow.radius = qualityTier === "high" ? 4 : 3;
  scene.add(sun);
  const chandelier = new THREE.PointLight(0xffd99a, 17, 45);
  chandelier.position.set(0, 9, 0); scene.add(chandelier);

  const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), qualityTier === "high" ? 8 : 4);
  const marbleTexture = createSurfaceTexture("marble", "#e9e3d7", 3, 2, maxAnisotropy);
  const woodTexture = createSurfaceTexture("wood", "#70452e", 2, 2, maxAnisotropy);
  const fabricTexture = createSurfaceTexture("fabric", "#315d78", 7, 7, maxAnisotropy);
  const apparelTexture = createSurfaceTexture("fabric", "#eee9df", 5, 5, maxAnisotropy);
  const marbleMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: marbleTexture.map, bumpMap: marbleTexture.bumpMap,
    bumpScale: 0.018, roughness: 0.28, metalness: 0.035,
    clearcoat: 0.24, clearcoatRoughness: 0.32, envMapIntensity: 0.9
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(48, 36), marbleMaterial);
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.16; floor.receiveShadow = true; scene.add(floor);

  const building = new THREE.Group(); scene.add(building);
  const wallMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.ivory, roughness: 0.82, metalness: 0.015, clearcoat: 0.08, clearcoatRoughness: 0.7
  });
  const woodMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: woodTexture.map, bumpMap: woodTexture.bumpMap,
    bumpScale: 0.026, roughness: 0.39, metalness: 0.025,
    clearcoat: 0.2, clearcoatRoughness: 0.48, envMapIntensity: 0.85
  });
  const goldMat = new THREE.MeshPhysicalMaterial({
    color: COLORS.gold, roughness: 0.28, metalness: 0.72,
    clearcoat: 0.32, clearcoatRoughness: 0.24, envMapIntensity: 1.15
  });
  const darkMat = material(COLORS.dark, 0.5);
  const emeraldMat = material(COLORS.emerald, 0.7);

  function box(parent, x, y, z, w, h, d, mat, cast = true) {
    const bevel = Math.max(0.003, Math.min(0.075, Math.min(w, h, d) * 0.14));
    const geometry = new RoundedBoxGeometry(w, h, d, 2, bevel);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  }
  function cylinder(parent, x, y, z, r1, r2, h, mat) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 32, 1), mat);
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

  // Modern-classic architectural detailing: fluted pilasters, framed wall panels,
  // layered cornices and champagne-metal reveals. The roof remains intentionally open.
  const trimIvory = material(0xf0e8d8, 0.48, 0.025);
  const shadowWalnut = material(0x3b261d, 0.52, 0.08);
  const brassSoft = material(0xb9955e, 0.3, 0.68);
  function addPilaster(x, z, alongSide = false) {
    const column = new THREE.Group();
    column.position.set(x, 0, z);
    building.add(column);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 5.55, 20, 1), trimIvory);
    shaft.position.y = 3.05;
    shaft.castShadow = true; shaft.receiveShadow = true; column.add(shaft);
    for (const [y, radius, height] of [[0.48,0.39,0.18],[0.62,0.31,0.12],[5.78,0.34,0.16],[5.94,0.43,0.18]]) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,height,20), brassSoft);
      ring.position.y = y; ring.castShadow = true; column.add(ring);
    }
    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.82,0.2,0.62), trimIvory);
    capital.position.y = 6.08; capital.castShadow = true; column.add(capital);
    if (alongSide) column.rotation.y = Math.PI / 2;
  }
  [-18,-7,7,18].forEach(x=>addPilaster(x,-14.35));
  [-9,1,11].forEach(z=>{addPilaster(-20.35,z,true);addPilaster(20.35,z,true);});

  // Recessed-looking wall panels and continuous crown molding add depth to the rear elevation.
  for (const x of [-13.1,-4.35,4.35,13.1]) {
    box(building,x,2.9,-14.79,7.55,4.65,0.055,shadowWalnut,false);
    box(building,x,2.9,-14.70,7.28,4.38,0.06,trimIvory,false);
    box(building,x,2.9,-14.64,6.98,4.08,0.035,wallMat,false);
    for (const dx of [-3.42,3.42]) box(building,x+dx,2.9,-14.59,0.045,3.85,0.035,brassSoft,false);
    for (const y of [0.99,4.81]) box(building,x,y,-14.59,6.86,0.045,0.035,brassSoft,false);
  }
  box(building,0,6.12,-14.55,41.5,0.18,0.42,trimIvory,false);
  box(building,0,6.23,-14.31,41.5,0.08,0.12,brassSoft,false);
  for (const sideX of [-20.38,20.38]) {
    box(building,sideX,6.12,0,0.42,0.18,29.3,trimIvory,false);
    box(building,sideX+(sideX<0?0.12:-0.12),6.23,0,0.12,0.08,29.3,brassSoft,false);
  }

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xb9d8d2, transparent: true, opacity: 0.28,
    roughness: 0.12, metalness: 0.06, transmission: 0.18,
    thickness: 0.12, ior: 1.46, envMapIntensity: 1.1
  });
  const frameMat = material(0x242c2b, 0.35, 0.55);
  function woodPanelPartition(x, z, length, alongX = true, height = 2.35) {
    const spanX = alongX ? length : 0.22;
    const spanZ = alongX ? 0.22 : length;
    const centerY = height / 2 + 0.2;
    // Solid walnut divider with a recessed dark reveal and warm wood face panels on both sides.
    box(building, x, centerY, z, spanX, height, spanZ, shadowWalnut, false);
    const panelCount = Math.max(2, Math.floor(length / 1.45));
    const panelWidth = length / panelCount;
    for (let i = 0; i < panelCount; i++) {
      const offset = -length / 2 + panelWidth * (i + 0.5);
      const px = x + (alongX ? offset : 0);
      const pz = z + (alongX ? 0 : offset);
      for (const side of [-1, 1]) {
        box(building, px, centerY, pz + (alongX ? side * 0.116 : 0),
          alongX ? panelWidth - 0.12 : 0.035, height - 0.3,
          alongX ? 0.035 : panelWidth - 0.12, woodMat, false);
        // Fine vertical fluting adds a crafted architectural wood-panel finish.
        for (const edge of [-1, 1]) {
          const ex = px + (alongX ? edge * (panelWidth / 2 - 0.055) : side * 0.116);
          const ez = pz + (alongX ? side * 0.116 : edge * (panelWidth / 2 - 0.055));
          box(building, ex, centerY, ez, alongX ? 0.035 : 0.028,
            height - 0.28, alongX ? 0.028 : 0.035, brassSoft, false);
        }
      }
    }
    // Continuous lower plinth, upper cap and narrow champagne-gold reveal.
    box(building, x, 0.34, z, spanX + (alongX ? 0 : 0.05), 0.22,
      spanZ + (alongX ? 0.05 : 0), goldMat, false);
    box(building, x, height + 0.2, z, spanX + 0.12, 0.16, spanZ + 0.12, trimIvory, false);
    box(building, x, height + 0.29, z, spanX + 0.12, 0.035, spanZ + 0.12, brassSoft, false);
  }

  // Warm walnut divider walls define each work zone while keeping the central circulation open.
  woodPanelPartition(-15.2, -6.4, 8.0, false, 2.35);
  woodPanelPartition(-8.6, -10.1, 6.2, true, 2.35);
  woodPanelPartition(8.8, -10.0, 6.4, true, 2.35);
  woodPanelPartition(15.3, -5.8, 8.2, false, 2.35);
  woodPanelPartition(-15.0, 3.1, 7.2, false, 2.35);
  woodPanelPartition(15.0, 3.1, 7.2, false, 2.35);

  const deskTop = material(0xb98250, 0.42);
  const deskEdge = material(0x70452e, 0.48);
  const screenMat = material(0x172b3a, 0.22, 0.25);
  const screenGlow = material(0x39a6c3, 0.28, 0.2);
  const chairMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: fabricTexture.map, bumpMap: fabricTexture.bumpMap,
    bumpScale: 0.012, roughness: 0.88, metalness: 0.0,
    clearcoat: 0.025, clearcoatRoughness: 0.95, envMapIntensity: 0.42
  });
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
  // Thin brass reveal around the polished tabletop and a dark inset foot plinth.
  const tableRim = new THREE.Mesh(new THREE.TorusGeometry(2.57, 0.035, 10, 72), goldMat);
  tableRim.rotation.x = Math.PI / 2; tableRim.position.y = 1.015; tableRim.castShadow = true; meeting.add(tableRim);
  const tableInlay = new THREE.Mesh(new THREE.TorusGeometry(2.22, 0.012, 8, 72), brassSoft);
  tableInlay.rotation.x = Math.PI / 2; tableInlay.position.y = 1.025; meeting.add(tableInlay);
  cylinder(meeting, 0, 0.48, 0, 0.34, 0.5, 0.75, woodMat);
  cylinder(meeting, 0, 0.34, 0, 1.05, 1.05, 0.12, deskEdge);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const seat = new THREE.Group();
    seat.position.set(Math.cos(a) * 3.45, 0, Math.sin(a) * 3.45);
    // The chair's local +Z direction is its front: point it radially inward at the table.
    seat.rotation.y = -a - Math.PI / 2; meeting.add(seat);
    const upholstery = i % 2 ? emeraldMat : material(0x7b3946, 0.72, 0.015);
    box(seat, 0, 0.58, 0, 0.92, 0.18, 0.86, upholstery);
    box(seat, 0, 1.2, -0.34, 0.92, 1.15, 0.18, upholstery);
    // Upholstered armrests and champagne-metal supports make the meeting chairs read as executive furniture.
    for (const side of [-1, 1]) {
      box(seat, side * 0.49, 0.91, 0.02, 0.13, 0.12, 0.72, upholstery);
      box(seat, side * 0.49, 0.72, 0.03, 0.045, 0.34, 0.055, goldMat, false);
      box(seat, side * 0.49, 0.55, -0.32, 0.045, 0.52, 0.055, goldMat, false);
    }
    // Subtle tailored piping across the chair back.
    box(seat, 0, 1.68, -0.235, 0.72, 0.025, 0.025, goldMat, false);
    cylinder(seat, 0, 0.25, 0, 0.08, 0.08, 0.5, darkMat);
  }
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    box(meeting, Math.cos(a) * 1.45, 1.06, Math.sin(a) * 1.45, 0.58, 0.05, 0.38, screenMat, false);
  }
  // Meeting-room rug.
  const rug = new THREE.Mesh(new THREE.CircleGeometry(6.0, 64), material(0x263f55, 0.95));
  rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.24, 1); building.add(rug);
  const rugBorder = new THREE.Mesh(new THREE.TorusGeometry(5.72, 0.035, 8, 96), brassSoft);
  rugBorder.rotation.x = Math.PI / 2; rugBorder.position.set(0, 0.255, 1); building.add(rugBorder);

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
  const sofaMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, map: fabricTexture.map, bumpMap: fabricTexture.bumpMap,
    bumpScale: 0.016, roughness: 0.91, metalness: 0.0,
    clearcoat: 0.015, clearcoatRoughness: 0.98, envMapIntensity: 0.38
  });
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

  // Department identity panels: make each work zone legible from the isometric camera.
  function addDepartmentSign(x, y, z, text, rotation = 0, width = 4.6) {
    const canvas = document.createElement("canvas");
    canvas.width = 768; canvas.height = 180;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#211b18"; ctx.fillRect(0,0,768,180);
    ctx.strokeStyle = "#c7a56a"; ctx.lineWidth = 8; ctx.strokeRect(9,9,750,162);
    ctx.fillStyle = "#f4efdf"; ctx.font = "bold 42px Arial";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text,384,90,710);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width,1.08),
      new THREE.MeshBasicMaterial({map:texture, toneMapped:false}));
    panel.position.set(x,y,z); panel.rotation.y=rotation; building.add(panel);
    panel.userData.texture=texture;
  }
  addDepartmentSign(-12.8,4.85,-14.78,"INVESTMENT & RESEARCH");
  addDepartmentSign(12.8,4.85,-14.78,"FINANCIAL ANALYSIS");
  addDepartmentSign(0,3.35,-5.8,"EXECUTIVE MEETING",0,4.0);
  addDepartmentSign(-20.78,4.7,7.0,"CEO & MANAGEMENT",Math.PI/2,4.0);
  addDepartmentSign(20.78,4.7,7.0,"COLLABORATION LOUNGE",-Math.PI/2,4.0);

  // Subtle floor inlays distinguish work, meeting, and lounge zones without blocking movement.
  const zoneGold = material(0xb99762,0.48,0.28);
  const zoneDark = material(0x314d4a,0.72);
  function floorInlay(x,z,w,d,mat) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat);
    mesh.rotation.x=-Math.PI/2; mesh.position.set(x,0.245,z); building.add(mesh);
  }
  floorInlay(-13.2,-6.5,13.6,15.0,zoneDark);
  floorInlay(13.2,-6.5,13.6,15.0,zoneDark);
  floorInlay(0,1.0,13.0,12.5,zoneGold);
  floorInlay(12.0,10.0,10.2,8.8,zoneDark);

  // Executive identity wall behind reception, visible from the open entrance.
  const executivePlaque = new THREE.Group();
  executivePlaque.position.set(-20.78,3.1,0.0);
  executivePlaque.rotation.y=Math.PI/2; building.add(executivePlaque);
  box(executivePlaque,0,0,0,5.6,2.2,0.16,woodMat,false);
  addDepartmentSign(-20.65,3.1,0.0,"ZERO AI · EXECUTIVE CAMPUS",Math.PI/2,5.0);

  // Panoramic glazing and champagne-metal frames bring natural daylight into the open-plan office.
  const windowGlass = new THREE.MeshPhysicalMaterial({
    color: 0xc6e0e4, transparent: true, opacity: 0.34, roughness: 0.1,
    metalness: 0.04, transmission: 0.24, thickness: 0.08, ior: 1.48, envMapIntensity: 1.2
  });
  const windowFrame = material(0x9a794d, 0.27, 0.72);
  for (const wx of [-5.2, 5.2]) {
    box(building, wx, 3.65, -14.79, 4.35, 2.15, 0.055, windowGlass, false);
    for (const dx of [-2.2, 2.2]) box(building, wx + dx, 3.65, -14.73, 0.075, 2.32, 0.12, windowFrame, false);
    for (const wy of [2.55, 4.75]) box(building, wx, wy, -14.73, 4.45, 0.075, 0.12, windowFrame, false);
    box(building, wx, 3.65, -14.70, 0.055, 2.1, 0.12, windowFrame, false);
  }

  // Ceiling is intentionally omitted so the complete interior remains visible.
  // Warm architectural lighting.
  const pendant = new THREE.PointLight(0xffd69a, 28, 28);
  pendant.position.set(0,5.8,-5); scene.add(pendant);

  // A visible sculptural brass chandelier over the meeting table (no ceiling mesh).
  const chandelierRig = new THREE.Group();
  chandelierRig.position.set(0,5.75,1);
  building.add(chandelierRig);
  const chandelierRing = new THREE.Mesh(new THREE.TorusGeometry(1.55,0.055,12,64),brassSoft);
  chandelierRing.rotation.x=Math.PI/2; chandelierRig.add(chandelierRing);
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.92,0.035,10,48),goldMat);
  innerRing.rotation.x=Math.PI/2; chandelierRig.add(innerRing);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    const drop=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.025,0.72,8),brassSoft);
    drop.position.set(Math.cos(a)*1.55,-0.42,Math.sin(a)*1.55);chandelierRig.add(drop);
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.12,14,10),
      new THREE.MeshBasicMaterial({color:0xffe1a5}));
    bulb.position.set(Math.cos(a)*1.55,-0.82,Math.sin(a)*1.55);chandelierRig.add(bulb);
  }
  const centerStem=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.85,10),brassSoft);
  centerStem.position.y=-0.42;chandelierRig.add(centerStem);
  const chandelierCap=new THREE.Mesh(new THREE.SphereGeometry(0.2,16,12),goldMat);
  chandelierCap.position.y=-0.9;chandelierRig.add(chandelierCap);

  const entranceLight = new THREE.PointLight(0xffe2b4, 18, 20);
  entranceLight.position.set(-14,4,10); scene.add(entranceLight);
  // Soft focused illumination gives the conference table a warmer architectural focal point.
  const meetingFill = new THREE.PointLight(0xffdfb0, qualityTier === "high" ? 24 : 15, 15, 2);
  meetingFill.position.set(0, 5.1, 1); scene.add(meetingFill);
  const loungeFill = new THREE.PointLight(0xd6e6ff, qualityTier === "high" ? 12 : 7, 12, 2);
  loungeFill.position.set(12, 4.2, 9.5); scene.add(loungeFill);

  // Living employee agents: distinct appearance, autonomous walking and social conversations.
  const employeeObjects = [];
  const walkBounds = { minX: -18, maxX: 18, minZ: -12, maxZ: 12 };
  // Collision map: staff must walk around walls, glass dividers and furniture.
  const solidAreas = [
    // Outer walls
    { minX: -21.5, maxX: -20.35, minZ: -15.5, maxZ: 15.5 },
    { minX: 20.35, maxX: 21.5, minZ: -15.5, maxZ: 15.5 },
    { minX: -21.5, maxX: 21.5, minZ: -15.55, maxZ: -14.35 },
    // Glass partitions
    { minX: -15.48, maxX: -14.92, minZ: -10.45, maxZ: -2.35 },
    { minX: -11.75, maxX: -5.45, minZ: -10.42, maxZ: -9.78 },
    { minX: 5.55, maxX: 11.95, minZ: -10.32, maxZ: -9.68 },
    { minX: 15.02, maxX: 15.58, minZ: -9.9, maxZ: -1.7 },
    { minX: -15.28, maxX: -14.72, minZ: -0.5, maxZ: 6.7 },
    { minX: 14.72, maxX: 15.28, minZ: -0.5, maxZ: 6.7 },
    // Workstation desks (chairs are separate colliders below)
    ...[[-16.5,-11.2],[-10.7,-11.2],[-16.5,-2.1],[-10.7,-2.1],
      [10.7,-11.2],[16.5,-11.2],[10.7,-2.1],[16.5,-2.1],
      [-5.4,-11.2],[0,-11.2],[5.4,-11.2]].map(([x,z]) =>
        ({ minX:x-1.55,maxX:x+1.55,minZ:z-0.9,maxZ:z+0.9 })),
    // Meeting table and individual meeting chairs
    { circleX: 0, circleZ: 1, radius: 2.95 },
    ...Array.from({length:8},(_,i)=>({circleX:Math.cos(i*Math.PI/4)*3.45,circleZ:1+Math.sin(i*Math.PI/4)*3.45,radius:0.72})),
    // Reception, lounge sofa and coffee table
    { minX:-15.2,maxX:-13.4,minZ:8.0,maxZ:12.8 },
    { minX:7.55,maxX:16.45,minZ:11.45,maxZ:13.65 },
    { minX:10.15,maxX:13.85,minZ:7.45,maxZ:9.55 },
    // Indoor plant pots
    ...[[-19,-13,1.2],[-19,7,1.0],[-7,-14,0.9],[7,-14,0.9],[19,-12,1.1],[19,5,1.0],[-19,13,1.1],[19,14,1.0],[4,7,0.8]]
      .map(([x,z,r])=>({circleX:x,circleZ:z,radius:0.48*r+0.42}))
  ];
  // Lounge seating for employee-to-employee conversations.
  const loungeSeats = [
    {x:9.05,z:10.45,yaw:Math.PI/2},
    {x:15.05,z:10.45,yaw:-Math.PI/2}
  ];
  loungeSeats.forEach((seat,index)=>{
    const chair=new THREE.Group();
    const wood=material(0x68452f,0.72,0.02);
    const cushion=material(index===0?0x49645b:0x806044,0.82,0.01);
    const seatBase=new THREE.Mesh(new THREE.BoxGeometry(1.15,0.18,0.95),cushion);
    seatBase.position.y=0.55;seatBase.castShadow=true;seatBase.receiveShadow=true;chair.add(seatBase);
    const back=new THREE.Mesh(new THREE.BoxGeometry(1.15,1.05,0.16),cushion);
    back.position.set(0,1.08,-0.39);back.castShadow=true;chair.add(back);
    for(const x of [-0.47,0.47])for(const z of [-0.36,0.36]){
      const leg=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.52,0.1),wood);
      leg.position.set(x,0.26,z);chair.add(leg);
    }
    chair.position.set(seat.x,0,seat.z);chair.rotation.y=seat.yaw;scene.add(chair);
  });
  const STAFF_RADIUS = 0.48;
  function hitsSolidArea(x,z) {
    return solidAreas.some(area => {
      if (area.circleX !== undefined) {
        return Math.hypot(x-area.circleX,z-area.circleZ) < area.radius + STAFF_RADIUS;
      }
      return x > area.minX-STAFF_RADIUS && x < area.maxX+STAFF_RADIUS &&
        z > area.minZ-STAFF_RADIUS && z < area.maxZ+STAFF_RADIUS;
    });
  }
  function hitsAnotherEmployee(x,z, current) {
    return employeeObjects.some(other => other !== current &&
      Math.hypot(x-other.position.x,z-other.position.z) < STAFF_RADIUS*1.75);
  }
  function chooseWalkTarget(person) {
    for (let attempt=0; attempt<35; attempt++) {
      const x=THREE.MathUtils.randFloat(walkBounds.minX,walkBounds.maxX);
      const z=THREE.MathUtils.randFloat(walkBounds.minZ,walkBounds.maxZ);
      if (!hitsSolidArea(x,z) && !hitsAnotherEmployee(x,z,person)) {
        person.userData.target.set(x,0.12,z);
        return true;
      }
    }
    return false;
  }

  const dialogueLines = [
    ["Bagaimana perkembangan tugasmu?", "Sudah berjalan. Aku sedang memeriksa detailnya."],
    ["Aku punya ide untuk proyek ini.", "Menarik. Coba jelaskan, kita kembangkan bersama."],
    ["Bisa bantu analisis sebentar?", "Tentu, mari kita lihat datanya bersama."],
    ["Apa prioritas berikutnya?", "Kita selesaikan yang paling penting lebih dulu."],
    ["Terima kasih atas bantuannya.", "Sama-sama, kerja tim membuat semuanya lebih mudah."]
  ];
  const roleTopics = {
    "CEO": "arah strategi perusahaan",
    "AI Creative Manager": "alur kerja dan kualitas tim",
    "AI Scriptwriter": "naskah dan dialog",
    "AI Storyboard Artist": "panel storyboard dan kamera",
    "AI Character Designer": "desain karakter dan kostum",
    "AI Background Artist": "latar dan atmosfer visual",
    "AI 2D Animator": "animasi 2D/3D senior, rigging, creative coding, dubbing karakter, voice direction, lip-sync, dan audio-visual editing",
    "AI Cleanup & Color Artist": "cleanup dan konsistensi warna",
    "AI Graphic Designer & Video Editor": "aset grafis, kode, dan editing video"
  };
  const collabRoles = {
    "CEO": ["AI Creative Manager"],
    "AI Creative Manager": ["CEO", "AI Scriptwriter", "AI Storyboard Artist", "AI Character Designer", "AI Background Artist", "AI 2D Animator", "AI Cleanup & Color Artist", "AI Graphic Designer & Video Editor"],
    "AI Scriptwriter": ["AI Storyboard Artist", "AI Creative Manager"],
    "AI Storyboard Artist": ["AI Scriptwriter", "AI Character Designer", "AI Creative Manager"],
    "AI Character Designer": ["AI Background Artist", "AI Storyboard Artist", "AI 2D Animator"],
    "AI Background Artist": ["AI Character Designer", "AI 2D Animator"],
    "AI 2D Animator": ["AI Background Artist", "AI Cleanup & Color Artist"],
    "AI Cleanup & Color Artist": ["AI 2D Animator", "AI Graphic Designer & Video Editor"],
    "AI Graphic Designer & Video Editor": ["AI Cleanup & Color Artist", "AI Creative Manager"]
  };
  const makeBubble = (message) => {
    // Render dialogue at high resolution and wrap it into readable lines.
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 320;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = "rgba(255,252,242,0.99)";
    ctx.strokeStyle = "#a98248"; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.roundRect(12, 12, 1000, 296, 34); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#24180f";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const words = String(message || "").trim().split(/\\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? line + " " + word : word;
      if (ctx.measureText(candidate).width > 900 && line) {
        lines.push(line); line = word;
      } else line = candidate;
    }
    if (line) lines.push(line);
    const visibleLines = lines.slice(0, 3);
    if (lines.length > 3) {
      let last = visibleLines[2];
      while (ctx.measureText(last + "…").width > 880 && last.length) last = last.slice(0, -1);
      visibleLines[2] = last.trimEnd() + "…";
    }
    const lineHeight = 76;
    const startY = 160 - ((visibleLines.length - 1) * lineHeight) / 2;
    visibleLines.forEach((text, index) => ctx.fillText(text, 54, startY + index * lineHeight));
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({map:texture, transparent:true, depthTest:false}));
    sprite.scale.set(7.8, 2.44, 1); sprite.position.y = 3.85;
    sprite.userData.texture = texture;
    return sprite;
  };
  employees.slice(0, 9).forEach((employee, i) => {
    const group = new THREE.Group();
    const staffSpots = [[-13,-8],[-8,-7],[-13,0],[-8,1],[8,-8],[13,-8],[8,0],[13,1],[-4,7]];
    const [staffX, staffZ] = staffSpots[i] || [0,0];
    group.position.set(staffX, 0.12, staffZ);
    const outfitColor = employee.accent || (i % 2 ? "#345c50" : "#70513a");
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(outfitColor), map: apparelTexture.map,
      bumpMap: apparelTexture.bumpMap, bumpScale: 0.009,
      roughness: 0.82, metalness: 0.0, clearcoat: 0.035,
      clearcoatRoughness: 0.9, envMapIntensity: 0.38
    });
    const skinMat = new THREE.MeshPhysicalMaterial({
      color: i % 3 === 0 ? 0xd5a17d : i % 3 === 1 ? 0xc99570 : 0xe0b18e,
      roughness: 0.68, metalness: 0.0, clearcoat: 0.055,
      clearcoatRoughness: 0.72, envMapIntensity: 0.48
    });
    const darkMatLocal = material(0x29201c);
    // Sculpted torso silhouette: broad shoulders, natural chest, tapered waist and hips.
    const torsoProfile = [
      new THREE.Vector2(0.16,-0.66), new THREE.Vector2(0.22,-0.61),
      new THREE.Vector2(0.265,-0.48), new THREE.Vector2(0.235,-0.27),
      new THREE.Vector2(0.245,-0.08), new THREE.Vector2(0.29,0.16),
      new THREE.Vector2(0.35,0.39), new THREE.Vector2(0.315,0.55),
      new THREE.Vector2(0.22,0.68)
    ];
    const body = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 32), bodyMat);
    const bodyBuilds = [
      [1.02,1.00,1.00],[1.00,1.00,0.98],[0.98,1.00,0.98],
      [0.98,1.00,0.98],[1.06,1.00,1.02],[1.00,1.00,1.00],
      [1.04,1.00,1.02],[0.98,1.00,0.98],[1.02,1.00,1.00]
    ];
    body.scale.set(...(bodyBuilds[i] || [1,1,1]));
    body.position.y = 0.92; body.castShadow = true; body.receiveShadow = true; group.add(body);
    const visual = employee.visual || {};
    const faceGeometry = new THREE.SphereGeometry(0.29, 32, 24);
    const faceShapes = {
      oval:[0.96,1.16,0.91], "soft-oval":[1.02,1.13,0.94], angular:[0.98,1.12,0.91],
      heart:[1.02,1.12,0.92], square:[1.08,1.08,0.94], round:[1.08,1.08,1.0], athletic:[1.0,1.13,0.92]
    };
    const head = new THREE.Mesh(faceGeometry, skinMat);
    head.scale.set(...(faceShapes[visual.face] || faceShapes.oval));
    head.scale.y *= (visual.headScale || 1.08);
    head.position.y = 1.65; head.castShadow = true; group.add(head);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.105,0.13,0.22,16), skinMat);
    neck.position.set(0,1.34,0.015); neck.castShadow=true; group.add(neck);
    const earParts = [];
    for (const side of [-1,1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.075,16,12), skinMat);
      ear.scale.set(0.55,0.9,0.55); ear.position.set(side*0.275,1.62,0.015);
      group.add(ear); earParts.push(ear);
      const innerEar = new THREE.Mesh(new THREE.SphereGeometry(0.035,10,8), material(0xb97868,0.82));
      innerEar.scale.set(0.5,0.9,0.4); innerEar.position.set(side*0.292,1.62,0.045); group.add(innerEar);
    }
    const hairPalette = [0x29201c,0x30251f,0x211b19,0x3b2922,0x251d1b,0x3a2a22,0x29221e,0x2a2025,0x252329];
    const hairMat = new THREE.MeshPhysicalMaterial({
      color: hairPalette[i] || 0x29201c, roughness: 0.7,
      metalness: 0.0, clearcoat: 0.12, clearcoatRoughness: 0.58,
      sheen: 0.18, sheenRoughness: 0.82, envMapIntensity: 0.42
    });
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.292, 28, 20, 0, Math.PI*2, 0, Math.PI*0.61), hairMat);
    hair.position.y = 1.76; hair.scale.set(1.04,1.02,1.02); hair.castShadow=true; group.add(hair);
    // Distinct, repeatable hairstyles and silhouettes for each named employee.
    const hairStyle = visual.hair || "classic";
    if (["low-bun","long-ponytail"].includes(hairStyle)) {
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.16,14,10),hairMat);
      tail.scale.set(0.8,1.7,0.8); tail.position.set(0,1.53,-0.19); group.add(tail);
      if (hairStyle==="low-bun") {
        const bun = new THREE.Mesh(new THREE.SphereGeometry(0.13,14,10),hairMat);
        bun.position.set(0,1.69,-0.28); group.add(bun);
      }
    } else if (hairStyle==="long-soft-wave") {
      for (const side of [-1,1]) {
        const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.075,0.28,4,8),hairMat);
        lock.position.set(side*0.235,1.55,0.015); lock.rotation.z=side*-0.12; group.add(lock);
      }
    } else if (hairStyle==="short-spiky" || hairStyle==="textured-quiff" || hairStyle==="short-undercut") {
      for (let k=0;k<3;k++) {
        const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.105,0.25,8),hairMat);
        tuft.position.set((k-1)*0.12,1.99-(k===1?0.02:0.07),0.025);
        tuft.rotation.z=(k-1)*-0.22; group.add(tuft);
      }
      if(hairStyle==="short-undercut"){
        const sideFade=material(0x4b403a,0.9);
        for(const side of [-1,1]){
          const fade=new THREE.Mesh(new THREE.SphereGeometry(0.19,12,10),sideFade);
          fade.scale.set(0.4,0.8,0.9);fade.position.set(side*0.23,1.68,0);group.add(fade);
        }
      }
    } else {
      const fringe = new THREE.Mesh(new THREE.SphereGeometry(0.17,14,10),hairMat);
      fringe.scale.set(1.0,0.5,0.55); fringe.position.set(0,1.84,0.205); group.add(fringe);
    }
    // Fine curved hair fibers add a groomed silhouette at close range.
    const fiberMat = new THREE.MeshStandardMaterial({color:hairPalette[i]||0x29201c,roughness:0.82});
    for(let strand=0;strand<5;strand++){
      const side=(strand-2)*0.075;
      const curve=new THREE.CatmullRomCurve3([
        new THREE.Vector3(side*0.55,1.91,0.17),
        new THREE.Vector3(side*0.9,1.98,0.13),
        new THREE.Vector3(side,2.005,0.045),
        new THREE.Vector3(side*1.08,1.94,-0.02)
      ]);
      const fiber=new THREE.Mesh(new THREE.TubeGeometry(curve,12,0.009,5,false),fiberMat);
      fiber.castShadow=true; group.add(fiber);
    }
    // Expressive eyes, brows, nose and a subtle smile make the face readable at office scale.
    const eyeWhite = material(0xfff8ed,0.28);
    const eyeMat = material([0x38261d,0x30251e,0x463329,0x263b45][i%4],0.3);
    const browMat = hairMat;
    const eyes = [], eyelids = [];
    for (const x of [-0.112, 0.112]) {
      const eyeGroup = new THREE.Group(); eyeGroup.position.set(x,1.67,0.252); group.add(eyeGroup);
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.054,16,12),eyeWhite);
      white.scale.set(1.08,0.78,0.62); eyeGroup.add(white);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.029,14,10),eyeMat);
      iris.position.set(0,0,0.039); eyeGroup.add(iris);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.014,10,8),material(0x171311,0.22));
      pupil.position.set(0,0,0.062); eyeGroup.add(pupil);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.009,8,6),material(0xffffff,0.15));
      glint.position.set(-0.009,0.012,0.074); eyeGroup.add(glint);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.057,14,10),skinMat);
      lid.scale.set(1.1,0.02,0.66); lid.position.set(x,1.67,0.263); group.add(lid);
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.012,0.075,3,8),browMat);
      brow.position.set(x,1.755,0.25); brow.rotation.z=x<0?0.10:-0.10; group.add(brow);
      eyes.push(eyeGroup); eyelids.push(lid);
    }
    const noseBridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.018,0.075,3,8),skinMat);
    noseBridge.position.set(0,1.61,0.282); noseBridge.rotation.x=Math.PI/2; group.add(noseBridge);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.037,14,10),skinMat);
    nose.scale.set(0.82,0.72,0.72); nose.position.set(0,1.575,0.307); group.add(nose);
    const lipMat = new THREE.MeshPhysicalMaterial({color:0x985b58,roughness:0.48,clearcoat:0.12});
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.047,20,14),material(0x321d1b,0.82));
    mouth.scale.set(1.0,0.12,0.24); mouth.position.set(0,1.523,0.284); group.add(mouth);
    const upperLip = new THREE.Mesh(new THREE.TorusGeometry(0.046,0.008,8,24,Math.PI),lipMat);
    upperLip.position.set(0,1.526,0.287); upperLip.rotation.z=Math.PI; group.add(upperLip);
    const lowerLip = new THREE.Mesh(new THREE.SphereGeometry(0.035,14,10),lipMat);
    lowerLip.scale.set(1.05,0.18,0.32); lowerLip.position.set(0,1.505,0.286); group.add(lowerLip);
    const cheekMat = new THREE.MeshPhysicalMaterial({color:0xc98275,roughness:0.82,transparent:true,opacity:0.22});
    for(const side of [-1,1]){
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.052,14,10),cheekMat);
      cheek.scale.set(1.35,0.58,0.22); cheek.position.set(side*0.17,1.555,0.252); group.add(cheek);
    }
    // Tailored clothing layers, lapels and a role-specific uniform silhouette.
    const shirtMat = material(0xf1e9d8,0.72);
    if (["navy-suit","navy-blazer","plum-professional"].includes(visual.wardrobe)) {
      const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.17,0.62,0.035),shirtMat);
      shirt.position.set(0,0.98,0.305);group.add(shirt);
      const lapelMat=material(0xd7c6a7,0.52);
      for(const side of [-1,1]){
        const lapel=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.47,0.045),bodyMat);
        lapel.position.set(side*0.12,1.02,0.3);lapel.rotation.z=side*0.22;group.add(lapel);
      }
      if(visual.wardrobe==="navy-suit"){
        const tie=new THREE.Mesh(new THREE.ConeGeometry(0.055,0.34,4),goldMat);
        tie.position.set(0,0.92,0.34);group.add(tie);
      }
    } else if (visual.wardrobe==="blue-techwear" || visual.wardrobe==="turquoise-hoodie") {
      const seam=material(0xe1d4bd,0.55);
      const zipper=new THREE.Mesh(new THREE.BoxGeometry(0.018,0.56,0.025),seam);
      zipper.position.set(0,0.96,0.32);group.add(zipper);
    }
    const accessoryMat=material(employee.accent||0xc7a56a,0.42,0.12);
    const shoesMat=material(0x272321,0.62);
    for(const side of [-1,1]){
      const shoe=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.14,0.38),shoesMat);
      shoe.position.set(side*0.14,0.105,0.075);group.add(shoe);
    }
    // Each employee carries a recognizable profession-specific prop.
    const propGroup=new THREE.Group();propGroup.position.set(0.43,0.92,0.18);group.add(propGroup);
    const prop=visual.prop||"badge";
    if(prop==="tablet"||prop==="laptop"){
      const device=new THREE.Mesh(new THREE.BoxGeometry(prop==="laptop"?0.48:0.32,prop==="laptop"?0.3:0.42,0.045),material(0x273746,0.28,0.35));
      device.rotation.z=-0.12;propGroup.add(device);
      const screen=new THREE.Mesh(new THREE.BoxGeometry(prop==="laptop"?0.4:0.27,prop==="laptop"?0.24:0.34,0.008),material(0x56a9b9,0.24,0.18));
      screen.position.z=0.028;propGroup.add(screen);
    } else if(prop==="notebook"||prop==="sketchbook"){
      const book=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.38,0.055),material(prop==="notebook"?0x2e716e:0xc58b42,0.78));
      book.rotation.z=-0.16;propGroup.add(book);
      for(let k=0;k<3;k++){
        const stroke=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.012,0.008),shirtMat);
        stroke.position.set(0,0.09-k*0.07,0.032);propGroup.add(stroke);
      }
    } else if(prop==="palette"){
      const palette=new THREE.Mesh(new THREE.CircleGeometry(0.19,18),material(0xe6d8bd,0.82));
      palette.scale.set(1.15,0.8,0.25);propGroup.add(palette);
      [0xe7a35c,0x7c9a58,0x8a78b8,0x4b78a8].forEach((c,k)=>{
        const dot=new THREE.Mesh(new THREE.SphereGeometry(0.035,8,6),material(c));
        dot.position.set(-0.09+(k%2)*0.18,0.06-Math.floor(k/2)*0.12,0.045);propGroup.add(dot);
      });
    } else if(prop==="stylus"){
      const pen=new THREE.Mesh(new THREE.CylinderGeometry(0.018,0.012,0.46,8),material(0x282c32,0.35,0.45));
      pen.rotation.z=-0.24;propGroup.add(pen);
    } else {
      const folder=new THREE.Mesh(new THREE.BoxGeometry(0.32,0.4,0.05),accessoryMat);propGroup.add(folder);
      const clasp=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.035,0.02),goldMat);
      clasp.position.set(0,0.1,0.04);propGroup.add(clasp);
    }
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.13,0.16,0.025),goldMat);
    badge.position.set(-0.17,1.18,0.32);group.add(badge);
    const arms = [], hands = [], elbows = [];
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.13,14,10),bodyMat);
      shoulder.position.set(side*0.34,1.18,0); group.add(shoulder);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.092,0.54,6,14),bodyMat);
      arm.position.set(side*0.39,0.95,0); arm.rotation.z=side*-0.16; arm.castShadow=true; group.add(arm); arms.push(arm);
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.078,16,12),bodyMat);
      elbow.position.set(side*0.43,0.72,0.015); group.add(elbow); elbows.push(elbow);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085,14,10),skinMat);
      hand.scale.set(0.78,0.72,0.9); hand.position.set(side*0.43,0.55,0.035); group.add(hand); hands.push(hand);
      for(let finger=0;finger<3;finger++){
        const digit=new THREE.Mesh(new THREE.CapsuleGeometry(0.018,0.055,3,6),skinMat);
        digit.position.set(side*0.43+(finger-1)*0.035,0.48,0.07); group.add(digit);
      }
    }
    const legs = [];
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.122, 0.42, 5, 12), darkMatLocal);
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
      employee, body, head, eyes, eyelids, mouth, hands, elbows, arms, legs, target: new THREE.Vector3(staffX, 0.12, staffZ),
      speed: 1.25 + (i % 4) * 0.12, phase: i * 0.8, state: "walking",
      bubble: null, bubbleUntil: 0, partner: null, seated: false, seat: null,
      isSpeaking: false, speakingUntil: 0, gestureUntil: 0
    };
    scene.add(group); employeeObjects.push(group);
  });

  function setSeatedPose(person,seated){
    const d=person.userData;
    if(d.seated===seated)return;
    d.seated=seated;
    if(seated){
      d.body.position.y=0.78;d.head.position.y=1.39;
      d.arms.forEach((arm,index)=>{
        arm.position.y=0.73;arm.position.z=0.12;
        arm.rotation.x=-0.38;arm.rotation.z=index===0?-0.12:0.12;
      });
      d.legs.forEach((leg,index)=>{
        leg.position.set(index===0?-0.14:0.14,0.29,0.27);
        leg.rotation.x=Math.PI/2;
      });
    }else{
      d.body.position.y=0.92;d.head.position.y=1.62;
      d.arms.forEach((arm,index)=>{
        arm.position.set(index===0?-0.39:0.39,0.95,0);
        arm.rotation.set(0,0,index===0?0.18:-0.18);
      });
      d.legs.forEach((leg,index)=>{
        leg.position.set(index===0?-0.14:0.14,0.35,0);
        leg.rotation.set(0,0,0);
      });
      person.position.y=0.12;
    }
  }
  const personalityDialogue={
    "AI Creative Manager":[
      ["Kita cek target dan tenggat dulu. Bagian mana yang masih tertinggal?","Aku sudah menyiapkan dua opsi. Kita pilih yang paling realistis."],
      ["Tolong pastikan hasil akhirnya sesuai brief.","Siap. Aku rapikan detailnya sebelum dikirim."]
    ],
    "AI Scriptwriter":[
      ["Aku membayangkan pembuka yang lebih emosional agar penonton langsung terhubung.","Menarik. Beri ruang agar visual ikut bercerita."],
      ["Konflik kecil bisa membuat tokohnya terasa lebih hidup.","Setuju. Aku catat lalu kembangkan dialognya."]
    ],
    "AI Storyboard Artist":[["Adegan ini lebih kuat dengan close-up lalu wide shot.","Aku sesuaikan komposisi panel agar transisinya jelas."]],
    "AI Character Designer":[["Ekspresi tokohnya perlu lebih mudah dibaca.","Aku punya beberapa alternatif bentuk dan kostum."]],
    "AI Background Artist":[["Cahaya sore bisa membuat suasana lebih hangat.","Aku jaga perspektif dan palet warnanya tetap konsisten."]],
    "AI 2D Animator":[["Gerakannya terasa kaku. Aku ingin coba timing lebih lentur.","Coba tambah anticipation sedikit, lalu kita bandingkan."]],
    "AI Cleanup & Color Artist":[["Garis tepinya belum seragam. Aku cek frame satu per satu.","Setelah itu aku samakan warna dan ketebalannya."]],
    "AI Graphic Designer & Video Editor":[["Aku bisa buat versi ringkas untuk layar ponsel.","Pastikan teks tetap terbaca dan ritme editnya nyaman."]],
    "CEO":[["Bagaimana perkembangan proyek? Keputusan penting tetap menunggu persetujuanku.","Tim siap. Kami menyiapkan analisis dan rekomendasi untuk Anda."]
    ]
  };
  function conversationFor(first,second){
    const role=first.userData.employee.role;
    const choices=personalityDialogue[role]||[["Aku sedang mengerjakan "+(roleTopics[role]||"tugas tim")+". Ada masukan?","Aku akan bantu cek dari sisi "+(roleTopics[second.userData.employee.role]||"pekerjaan")+"."]];
    return choices[Math.floor(Math.random()*choices.length)];
  }
  // Autonomous desk-work schedule: employees periodically sit, type and review work.
  const deskSeats = [
    {x:-16.5,z:-9.55,yaw:Math.PI},{x:-10.7,z:-9.55,yaw:Math.PI},
    {x:-16.5,z:-0.45,yaw:Math.PI},{x:-10.7,z:-0.45,yaw:Math.PI},
    {x:10.7,z:-12.85,yaw:0},{x:16.5,z:-12.85,yaw:0},
    {x:10.7,z:-3.75,yaw:0},{x:16.5,z:-3.75,yaw:0},
    {x:-5.4,z:-9.55,yaw:Math.PI},{x:0,z:-9.55,yaw:Math.PI},{x:5.4,z:-9.55,yaw:Math.PI}
  ];

  // Nine named personal studios: one dedicated visual workspace per roster member.
  // The studios use distinct floor inlays, identity plaques and role-specific equipment
  // while preserving the existing open-plan architecture, walkways and furniture layout.
  const studioSpecs = [
    {title:"ARKA ZORE · CEO",subtitle:"EXECUTIVE STRATEGY OFFICE",color:0xc7a56a,kind:"executive"},
    {title:"NADIA PRATAMA",subtitle:"CREATIVE MANAGEMENT OFFICE",color:0x4b78a8,kind:"manager"},
    {title:"RAKA WIBISONO",subtitle:"SCRIPTWRITING STUDIO",color:0x58a6a6,kind:"writing"},
    {title:"SINTA MAHARANI",subtitle:"STORYBOARD STUDIO",color:0x8a78b8,kind:"storyboard"},
    {title:"BIMA SANTOSO",subtitle:"CHARACTER DESIGN ATELIER",color:0xe2a34a,kind:"character"},
    {title:"LARAS AYU",subtitle:"ENVIRONMENT ART STUDIO",color:0x7c9a58,kind:"environment"},
    {title:"DIMAS KURNIAWAN",subtitle:"2D · 3D · CODING · DUBBING",color:0x58a6a6,kind:"animation"},
    {title:"PUTRI ANINDYA",subtitle:"CLEANUP & COLOR STUDIO",color:0xc078a0,kind:"color"},
    {title:"FAJAR NUGROHO",subtitle:"GRAPHIC & VIDEO SUITE",color:0xb58b65,kind:"multimedia"}
  ];
  function addStudioPlaque(x,z,spec){
    const canvas=document.createElement("canvas");canvas.width=900;canvas.height=220;
    const ctx=canvas.getContext("2d");
    ctx.fillStyle="#211b18";ctx.fillRect(0,0,900,220);
    ctx.strokeStyle="#c7a56a";ctx.lineWidth=9;ctx.strokeRect(10,10,880,200);
    ctx.fillStyle="#f4efdf";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.font="bold 42px Arial";ctx.fillText(spec.title,450,83,830);
    ctx.fillStyle="#d9bd87";ctx.font="bold 25px Arial";ctx.fillText(spec.subtitle,450,151,830);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const plaque=new THREE.Mesh(new THREE.PlaneGeometry(4.6,1.12),
      new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
    plaque.position.set(x,3.0,z);plaque.rotation.y=0;building.add(plaque);
  }
  function addPrivateStudioShell(seat,spec){
    const x=seat.x, deskZ=seat.z-1.65;
    const width=5.05, depth=5.35, backZ=deskZ-2.55, frontZ=deskZ+2.55, sideMat=frameMat;
    const glass=new THREE.MeshStandardMaterial({color:spec.color,transparent:true,opacity:0.24,roughness:0.2,metalness:0.12});
    // Three glass walls and a clear front entrance make each workstation read as a private office.
    const wall=(wx,wz,ww,wd,mat=glass)=>{
      const panel=box(building,wx,1.72,wz,ww,2.85,wd,mat,false);
      panel.material=mat;return panel;
    };
    wall(x,backZ,width,0.13);
    wall(x-width/2,deskZ,0.13,depth);
    wall(x+width/2,deskZ,0.13,depth);
    // Dark architectural posts and gold top rails make the room boundaries readable.
    for(const px of [x-width/2,x+width/2]){
      box(building,px,1.72,backZ,0.16,3.05,0.16,sideMat,false);
      box(building,px,1.72,frontZ,0.16,3.05,0.16,sideMat,false);
    }
    box(building,x,3.18,backZ,width,0.13,0.18,goldMat,false);
    // A low side panel leaves a visible doorway at the front for employee movement.
    wall(x-width/2+0.7,frontZ,1.4,0.12,sideMat);
    wall(x+width/2-0.7,frontZ,1.4,0.12,sideMat);
    box(building,x,0.31,deskZ,width-0.22,0.06,depth-0.22,material(spec.color,0.72,0.08),false);
    addStudioPlaque(x,backZ+0.09,spec);
  }
  function addStudioEquipment(seat,spec,index){
    const x=seat.x,z=seat.z-1.45;
    const accent=material(spec.color,0.38,0.22);
    // Individual desk identity strip and specialist equipment, kept clear of the chair path.
    box(building,x,1.055,z+0.48,1.05,0.045,0.34,accent,false);
    if(spec.kind==="executive"||spec.kind==="manager"){
      addMonitor(x-0.82,z-0.08,seat.yaw,0.68);
      addMonitor(x+0.82,z-0.08,seat.yaw,0.68);
      box(building,x,1.12,z+0.05,0.62,0.045,0.42,accent,false);
    }else if(spec.kind==="writing"){
      for(let n=0;n<3;n++)box(building,x-0.8+n*0.32,1.13,z+0.42,0.24,0.16,0.34,accent,false);
      box(building,x+0.9,1.13,z+0.12,0.68,0.055,0.46,darkMat,false);
    }else if(spec.kind==="storyboard"||spec.kind==="character"||spec.kind==="environment"||spec.kind==="color"){
      box(building,x+0.88,1.13,z+0.1,0.9,0.045,0.62,accent,false);
      for(let n=0;n<4;n++)box(building,x-0.95+n*0.34,1.14,z+0.42,0.27,0.035,0.24,n%2?accent:goldMat,false);
    }else if(spec.kind==="animation"){
      addMonitor(x-0.92,z-0.08,seat.yaw,0.66);
      addMonitor(x,z-0.08,seat.yaw,0.66);
      addMonitor(x+0.92,z-0.08,seat.yaw,0.66);
      // Compact acoustic recording station: microphone, stand and audio interface.
      cylinder(building,x+1.12,1.22,z+0.5,0.075,0.075,0.34,darkMat);
      box(building,x+1.12,1.43,z+0.5,0.16,0.22,0.16,accent,false);
      box(building,x-1.15,1.12,z+0.48,0.55,0.12,0.38,darkMat,false);
    }else if(spec.kind==="multimedia"){
      addMonitor(x-0.65,z-0.08,seat.yaw,0.72);
      addMonitor(x+0.65,z-0.08,seat.yaw,0.72);
      box(building,x,1.12,z+0.5,0.78,0.07,0.34,accent,false);
    }
    // A small floor inset marks the employee's own studio without enclosing the walkway.
    const inset=new THREE.Mesh(new THREE.PlaneGeometry(5.0,4.1),
      material(spec.color,0.9,0.02));
    inset.rotation.x=-Math.PI/2;inset.position.set(seat.x,0.252,seat.z-0.15);
    inset.material.transparent=true;inset.material.opacity=0.11;building.add(inset);
    addStudioPlaque(seat.x,seat.z-3.0,spec);
  }
  studioSpecs.forEach((spec,index)=>{
    const seat=deskSeats[index];
    if(seat){
      addPrivateStudioShell(seat,spec);
      addStudioEquipment(seat,spec,index);
    }
  });
  // Each employee receives one permanent workstation, in the same order as the employee roster.
  // A worker always returns to this assigned chair instead of choosing a random desk.
  employeeObjects.forEach((person,index)=>{
    person.userData.assignedSeat={...deskSeats[index % deskSeats.length],index:index % deskSeats.length};
  });
  let nextWorkActivity=12;
  function sendEmployeeToDesk(person,now){
    const seat=person.userData.assignedSeat;
    if(!seat)return; 
    person.userData.seat={...seat};
    person.userData.state="going_to_desk";
    person.userData.partner=null;
    person.userData.spoke=false;
    setSeatedPose(person,false);
    person.userData.target.set(seat.x,0.12,seat.z);
    person.userData.workUntil=now+THREE.MathUtils.randFloat(25000,40000);
  }
  function startDeskActivity(now){
    const available=employeeObjects.filter(p=>!p.userData.partner&&!p.userData.seated&&(p.userData.state==="walking"||p.userData.state==="idle"));
    if(!available.length)return;
    const person=available[Math.floor(Math.random()*available.length)];
    sendEmployeeToDesk(person,now);
    nextWorkActivity=now+THREE.MathUtils.randFloat(9000,15000);
  }
  const meetingState = { active:false, participants:[], agenda:[], index:0, nextAt:45000, nextLineAt:0, endsAt:0 };
  const meetingButton=host.querySelector('[data-action="meeting"]');
  function startTeamMeeting(now){
    if(meetingState.active || employeeObjects.length<2)return;
    const available=employeeObjects.filter(p=>!p.userData.partner && (p.userData.state==="walking" || p.userData.state==="idle" || p.userData.state==="working"));
    if(available.length<2)return;
    const chosen=available.slice().sort(()=>Math.random()-0.5).slice(0,Math.min(8,available.length));
    const lead=chosen.find(p=>p.userData.employee.role==="AI Creative Manager")||chosen[0];
    const others=chosen.filter(p=>p!==lead);
    meetingState.participants=chosen;
    meetingState.agenda=[
      [lead,"Rapat dimulai. Kita tinjau progres, kendala, dan prioritas berikutnya."],
      ...others.map((p)=>[p,({
        "CEO":"Saya akan meninjau rekomendasi. Keputusan akhir tetap berada pada CEO.",
        "AI Scriptwriter":"Naskah dan dialog sudah saya evaluasi. Saya siapkan revisi yang lebih kuat.",
        "AI Storyboard Artist":"Storyboard sudah saya cek. Saya usulkan alur visual yang lebih jelas.",
        "AI Character Designer":"Desain karakter saya rapikan agar konsisten di setiap adegan.",
        "AI Background Artist":"Latar dan pencahayaan saya sesuaikan dengan suasana cerita.",
        "AI 2D Animator":"Timing animasi perlu diperhalus agar gerakan terasa natural.",
        "AI Cleanup & Color Artist":"Saya pastikan garis dan warna konsisten sebelum hasil akhir.",
        "AI Graphic Designer & Video Editor":"Materi grafis dan hasil editing akan saya periksa untuk kualitas akhir."
      })[p.userData.employee.role]||"Saya akan menyampaikan perkembangan dan rekomendasi pekerjaan saya."])
    ];
    meetingState.index=0;meetingState.active=true;meetingState.nextLineAt=now+900;
    meetingState.endsAt=now+Math.max(18000,meetingState.agenda.length*4200+2500);
    meetingState.nextAt=now+90000;
    if(socialState.pair){
      for(const p of socialState.pair){p.userData.partner=null;p.userData.state="walking";setSeatedPose(p,false);p.userData.seat=null;if(p.userData.bubble){p.remove(p.userData.bubble);p.userData.bubble=null;}chooseWalkTarget(p);}
      socialState.pair=null;socialState.nextAt=now+18000;
    }
    chosen.forEach((p,i)=>{
      const angle=(i/chosen.length)*Math.PI*2-Math.PI/2;
      const seat={x:Math.cos(angle)*3.45,z:1+Math.sin(angle)*3.45,yaw:-angle-Math.PI/2};
      const approach={x:Math.cos(angle+0.34)*4.65,z:1+Math.sin(angle+0.34)*4.65};
      setSeatedPose(p,false);p.userData.partner=null;p.userData.seat=seat;
      p.userData.state="going_to_meeting";p.userData.target.set(approach.x,0.12,approach.z);
      p.userData.meetingSeat=seat;p.userData.spoke=false;
    });
    label.textContent="Ruang Rapat · Presentasi & Evaluasi Tim";
    meetingButton.textContent="● Rapat berlangsung";
  }
  meetingButton.addEventListener("click",()=>startTeamMeeting(performance.now()));
  function updateTeamMeeting(now){
    if(!meetingState.active)return;
    const allArrived=meetingState.participants.every(p=>p.userData.state==="in_meeting");
    if(allArrived && now>=meetingState.nextLineAt && meetingState.index<meetingState.agenda.length){
      const [speaker,line]=meetingState.agenda[meetingState.index];
      showSpeech(speaker,line,now);meetingState.index++;meetingState.nextLineAt=now+3900;
    }
    if(now>=meetingState.endsAt || (meetingState.index>=meetingState.agenda.length && now>=meetingState.nextLineAt+1500)){
      meetingState.participants.forEach(p=>{
        setSeatedPose(p,false);p.userData.seat=null;p.userData.meetingSeat=null;p.userData.state="walking";
        if(p.userData.bubble){p.remove(p.userData.bubble);p.userData.bubble=null;}
        chooseWalkTarget(p);
      });
      meetingState.active=false;meetingState.participants=[];meetingState.nextAt=now+90000;
      meetingButton.textContent="▣ Mulai rapat";label.textContent="Kantor Terpadu · Semua Divisi";
    }
  }
  const socialState = { nextAt: 3500, pair: null, until: 0, turn: 0, nextSpeechAt: 0 };
  function beginConversation(now) {
    // Choose from employees who are genuinely free, then prefer colleagues
    // whose roles naturally collaborate. This avoids random busy employees
    // repeatedly cancelling the conversation scheduler.
    const available=employeeObjects.filter(person=>(person.userData.state==="walking"||person.userData.state==="idle")&&!person.userData.partner);
    if(available.length<2){socialState.nextAt=now+2500;return;}
    const first=available[Math.floor(Math.random()*available.length)];
    const related=available.filter(candidate=>candidate!==first&&(collabRoles[first.userData.employee.role]||[]).includes(candidate.userData.employee.role));
    const pool=related.length?related:available.filter(candidate=>candidate!==first);
    const second=pool[Math.floor(Math.random()*pool.length)];
    if(!second){socialState.nextAt=now+2500;return;}
    // Most chats happen face-to-face in the open office; some move to the lounge.
    const sitDown=Math.random()<0.35;
    const midpoint=first.position.clone().add(second.position).multiplyScalar(0.5);
    const targets=sitDown?loungeSeats.map(seat=>new THREE.Vector3(seat.x,0.12,seat.z)):[
      midpoint.clone().add(new THREE.Vector3(-0.9,0,0)),
      midpoint.clone().add(new THREE.Vector3(0.9,0,0))
    ];
    for(const [index,person] of [first,second].entries()){
      setSeatedPose(person,false);
      person.userData.target.copy(targets[index]);
      person.userData.partner=index===0?second:first;
      person.userData.state=sitDown?"approaching_seat":"meeting";
      person.userData.seat=sitDown?loungeSeats[index]:null;
      person.userData.spoke=false;
    }
    const lines=conversationFor(first,second);
    first.userData.conversation=lines[0];
    second.userData.conversation=lines[1];
    socialState.mode=sitDown?"seated":"standing";
    socialState.pair=[first,second];
    socialState.turn=0;
    socialState.nextSpeechAt=now+(sitDown?3000:1200);
    socialState.until=now+(sitDown?28000:24000);
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
    const spokenWords=String(message||"").trim().split(/\s+/).filter(Boolean).length;
    const speechDuration=THREE.MathUtils.clamp(spokenWords*310,2600,7200);
    person.userData.bubbleUntil = now + Math.max(5800,speechDuration);
    person.userData.isSpeaking = true;
    person.userData.speakingUntil = now + speechDuration;
    person.userData.gestureUntil = now + Math.min(speechDuration,3200);
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

  // Daylight and interior lighting are driven by the synchronized server clock below.
  // Bounded touch orbit + pinch zoom. Camera cannot rotate freely or zoom indefinitely.
  const orbitTarget = new THREE.Vector3(0, 1.5, 0);
  const initialOffset = camera.position.clone().sub(orbitTarget);
  const spherical = new THREE.Spherical().setFromVector3(initialOffset);
  const baseAzimuth = spherical.theta;
  const basePolar = spherical.phi;
  // Slightly wider default framing, a little more camera orbit range and sensitivity.
  const orbit = { theta: baseAzimuth, phi: basePolar, radius: spherical.radius * 0.98 };
  const limits = {
    minTheta: baseAzimuth - THREE.MathUtils.degToRad(45),
    maxTheta: baseAzimuth + THREE.MathUtils.degToRad(45),
    minPhi: Math.max(THREE.MathUtils.degToRad(26), basePolar - THREE.MathUtils.degToRad(14)),
    maxPhi: Math.min(THREE.MathUtils.degToRad(74), basePolar + THREE.MathUtils.degToRad(14)),
    minRadius: spherical.radius * 0.58,
    maxRadius: spherical.radius * 1.55
  };
  const touchSurface = renderer.domElement;
  const pointers = new Map();
  let lastX = 0, lastY = 0, pinchDistance = 0;
  const applyCamera = () => {
    const offset = new THREE.Vector3().setFromSpherical(
      new THREE.Spherical(orbit.radius, orbit.phi, orbit.theta)
    );
    camera.position.copy(orbitTarget).add(offset);
    camera.lookAt(orbitTarget);
  };
  const distanceBetweenPointers = () => {
    const pts = [...pointers.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };
  touchSurface.style.touchAction = "none";
  touchSurface.style.cursor = "grab";
  touchSurface.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    lastX = event.clientX; lastY = event.clientY;
    if (pointers.size === 2) pinchDistance = distanceBetweenPointers();
    touchSurface.style.cursor = pointers.size === 1 ? "grabbing" : "zoom-in";
    touchSurface.setPointerCapture(event.pointerId);
  });
  touchSurface.addEventListener("pointermove", event => {
    if (!pointers.has(event.pointerId)) return;
    const previous = pointers.get(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) {
      const nextDistance = distanceBetweenPointers();
      if (pinchDistance > 0 && nextDistance > 0) {
        // Pinch outward zooms in; pinch inward zooms out, within strict bounds.
        orbit.radius = THREE.MathUtils.clamp(
          orbit.radius * (pinchDistance / nextDistance),
          limits.minRadius,
          limits.maxRadius
        );
      }
      pinchDistance = nextDistance;
      applyCamera();
      return;
    }
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    orbit.theta = THREE.MathUtils.clamp(orbit.theta - dx * 0.0058, limits.minTheta, limits.maxTheta);
    orbit.phi = THREE.MathUtils.clamp(orbit.phi + dy * 0.004, limits.minPhi, limits.maxPhi);
    applyCamera();
  });
  const stopPointer = event => {
    pointers.delete(event.pointerId);
    pinchDistance = pointers.size === 2 ? distanceBetweenPointers() : 0;
    touchSurface.style.cursor = "grab";
  };
  touchSurface.addEventListener("pointerup", stopPointer);
  touchSurface.addEventListener("pointercancel", stopPointer);
  touchSurface.addEventListener("lostpointercapture", stopPointer);
  // Desktop wheel zoom follows the same bounded distance limits.
  touchSurface.addEventListener("wheel", event => {
    event.preventDefault();
    orbit.radius = THREE.MathUtils.clamp(
      orbit.radius * (1 + Math.sign(event.deltaY) * 0.06),
      limits.minRadius,
      limits.maxRadius
    );
    applyCamera();
  }, { passive: false });

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
    if (composer) composer.setSize(w,h);
  };
  const observer = new ResizeObserver(resize); observer.observe(canvasHost); resize();
  // Synchronize the office clock with the deployment server, then advance it
  // smoothly using performance.now() between periodic server corrections.
  const clockNode = host.querySelector("[data-server-clock]");
  const dateNode = host.querySelector("[data-server-date]");
  const statusNode = host.querySelector("[data-server-status]");
  let serverTimeBase = Date.now();
  let serverPerfBase = performance.now();
  let serverClockSynced = false;
  let lastLightingMinute = -1;
  const getOfficeNow = () => serverTimeBase + (performance.now() - serverPerfBase);
  const updateClockAndLighting = () => {
    const nowDate = new Date(getOfficeNow());
    const timeText = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false
    }).format(nowDate);
    const dateText = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric"
    }).format(nowDate);
    clockNode.textContent = timeText;
    dateNode.textContent = dateText + " · WIB";
    statusNode.textContent = serverClockSynced ? "● WAKTU SERVER TERSINKRON" : "○ MENUNGGU SERVER";
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(nowDate);
    const hour = Number(parts.find(part => part.type === "hour")?.value || 0);
    const minute = Number(parts.find(part => part.type === "minute")?.value || 0);
    const minuteKey = hour * 60 + minute;
    if (minuteKey !== lastLightingMinute) {
      lastLightingMinute = minuteKey;
      const daylight = THREE.MathUtils.clamp(Math.sin(((hour + minute / 60) - 6) / 12 * Math.PI), 0, 1);
      const sky = new THREE.Color(0x171d28).lerp(new THREE.Color(0xd8d0c1), daylight);
      scene.background.copy(sky);
      scene.fog.color.copy(sky);
      sun.intensity = 0.12 + daylight * 1.18;
      chandelier.intensity = 27 - daylight * 13;
      warmFill.intensity = 6 + daylight * 2;
      neutralFill.intensity = 5 + daylight * 2;
      conferenceBounce.intensity = 4 + daylight * 2;
      loungeBounce.intensity = 3 + daylight;
      receptionFill.intensity = 4 + daylight;
      sun.position.set(-22 + daylight * 8, 12 + daylight * 23, 18);
    }
  };
  const syncServerClock = async () => {
    try {
      const response = await fetch("/api/time", { cache: "no-store", headers: { "Accept": "application/json" } });
      if (!response.ok) throw new Error("Server time unavailable");
      const payload = await response.json();
      if (!Number.isFinite(payload.now)) throw new Error("Invalid server timestamp");
      serverTimeBase = payload.now;
      serverPerfBase = performance.now();
      serverClockSynced = true;
      updateClockAndLighting();
    } catch {
      serverClockSynced = false;
      updateClockAndLighting();
    }
  };
  updateClockAndLighting();
  syncServerClock();
  const clockInterval = setInterval(updateClockAndLighting, 1000);
  const syncInterval = setInterval(syncServerClock, 60000);

  let frame = 0, disposed = false;
  let qualitySampleStart = performance.now();
  let qualityFrameCount = 0;
  let adaptivePixelRatio = renderer.getPixelRatio();
  const maxPixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 1.35 : qualityTier === "high" ? 1.85 : 1.55);
  const animate = () => {
    if (disposed) return;
    frame = requestAnimationFrame(animate);
    const now = performance.now();
    if (isMobile) {
      qualityFrameCount++;
      const sampleDuration = now - qualitySampleStart;
      if (sampleDuration >= 3000) {
        const fps = qualityFrameCount * 1000 / sampleDuration;
        const targetRatio = fps < 38 ? 0.9 : fps < 47 ? 1.0 : fps > 56 ? maxPixelRatio : adaptivePixelRatio;
        if (Math.abs(targetRatio - adaptivePixelRatio) > 0.06) {
          adaptivePixelRatio = targetRatio;
          renderer.setPixelRatio(adaptivePixelRatio);
          renderer.setSize(Math.max(1,canvasHost.clientWidth),Math.max(1,canvasHost.clientHeight),false);
        }
        qualityFrameCount = 0;
        qualitySampleStart = now;
      }
    }
    if (!reducedMotion) {
      if(!meetingState.active && now>=meetingState.nextAt)startTeamMeeting(now);
      updateTeamMeeting(now);

      if (!meetingState.active && !socialState.pair && now >= socialState.nextAt) beginConversation(now);
      if (!meetingState.active && !socialState.pair && now>=nextWorkActivity)startDeskActivity(now);
      if (socialState.pair) {
        const [a, b] = socialState.pair;
        if (now > socialState.until) {
          for (const person of [a, b]) {
            person.userData.partner=null;person.userData.state="walking";
            setSeatedPose(person,false);person.userData.seat=null;
            chooseWalkTarget(person);
            if (person.userData.bubble) { person.remove(person.userData.bubble); person.userData.bubble = null; }
          }
          socialState.pair = null; socialState.nextAt = now + THREE.MathUtils.randFloat(5500, 9000);
        } else if(socialState.mode!=="seated" || (a.position.distanceTo(a.userData.target)<0.45 && b.position.distanceTo(b.userData.target)<0.45)){
          if(socialState.mode==="seated" && a.userData.state!=="chatting"){
            for(const person of [a,b]){
              const seat=person.userData.seat;
              if(seat){person.position.set(seat.x,0.5,seat.z);person.rotation.y=seat.yaw;setSeatedPose(person,true);person.userData.state="chatting";}
            }
          }
          // Take turns speaking so each employee's line is readable above their head.
          if(now>=socialState.nextSpeechAt && socialState.turn<2){
            const speaker=socialState.turn===0?a:b;
            showSpeech(speaker,speaker.userData.conversation,now);
            socialState.turn++;
            socialState.nextSpeechAt=now+3900;
            if(socialState.turn>=2){a.userData.spoke=b.userData.spoke=true;}
          }
        }
      }
      employeeObjects.forEach((o, i) => {
        const data = o.userData;
        const delta = data.target.clone().sub(o.position); delta.y = 0;
        const distance = delta.length();
        // Preserve reserved destinations while an employee is approaching a desk or meeting seat.
        if (distance < 0.35 && !data.partner && data.state === "walking") { data.state="idle"; data.idleUntil=now+THREE.MathUtils.randFloat(7000,14000); }
        if (data.state==="idle" && now >= (data.idleUntil||0)) { data.state="walking"; chooseWalkTarget(o); }
        if(data.state==="going_to_meeting" && distance<0.48 && data.meetingSeat){
          o.position.set(data.meetingSeat.x,0.5,data.meetingSeat.z);
          o.rotation.y=data.meetingSeat.yaw;
          data.target.set(data.meetingSeat.x,0.5,data.meetingSeat.z);
          setSeatedPose(o,true);data.state="in_meeting";
        }
        if(data.state==="going_to_desk" && distance<0.35 && data.seat){
          o.position.set(data.seat.x,0.5,data.seat.z);
          o.rotation.y=data.seat.yaw;
          setSeatedPose(o,true);
          data.state="working";
        }
        if(data.state==="working" && now>data.workUntil){
          setSeatedPose(o,false);data.seat=null;data.state="walking";chooseWalkTarget(o);
        }
        const moving = distance > 0.18 && data.state!=="chatting" && data.state!=="working" && data.state!=="in_meeting";
        if (moving) {
          delta.normalize();
          const step = Math.min(distance, data.speed * 0.016);
          const nextX = o.position.x + delta.x * step;
          const nextZ = o.position.z + delta.z * step;
          // Slide along a clear axis when a direct route is blocked. This preserves
          // the reserved desk/meeting destination instead of sending the employee elsewhere.
          const clearX = !hitsSolidArea(nextX,o.position.z) && !hitsAnotherEmployee(nextX,o.position.z,o);
          const clearZ = !hitsSolidArea(o.position.x,nextZ) && !hitsAnotherEmployee(o.position.x,nextZ,o);
          if (!hitsSolidArea(nextX,nextZ) && !hitsAnotherEmployee(nextX,nextZ,o)) {
            o.position.x = nextX;
            o.position.z = nextZ;
          } else if (clearX && Math.abs(delta.x) >= Math.abs(delta.z)) {
            o.position.x = nextX;
          } else if (clearZ) {
            o.position.z = nextZ;
          } else if (clearX) {
            o.position.x = nextX;
          } else if (!data.partner && data.state === "walking") {
            chooseWalkTarget(o);
          }
          if (o.position.x !== nextX || o.position.z !== nextZ) {
            // Keep the character facing the direction of actual travel.
            const movedX = o.position.x - (nextX - delta.x * step);
            const movedZ = o.position.z - (nextZ - delta.z * step);
            if (Math.hypot(movedX,movedZ)>0.001) o.rotation.y = Math.atan2(movedX,movedZ);
          } else {
            o.rotation.y = Math.atan2(delta.x, delta.z);
          }
        }
        if(!data.seated && data.state!=="chatting")o.position.y=0.12+(moving?Math.abs(Math.sin(now*0.009+data.phase))*0.045:Math.sin(now*0.002+data.phase)*0.018);
        // Natural blinking and subtle eye/head micro-movements keep faces from looking static.
        const blinkCycle=(now*0.001+data.phase*1.7)%4.8;
        const blink=blinkCycle>4.52?Math.sin((blinkCycle-4.52)/0.28*Math.PI):0;
        data.eyelids?.forEach(lid=>{lid.scale.y=0.02+blink*0.74;lid.position.y=1.67-blink*0.012;});
        data.eyes?.forEach((eye,index)=>{eye.position.y=1.67+Math.sin(now*0.0012+data.phase+index)*0.004;});
        if(data.isSpeaking && now>data.speakingUntil)data.isSpeaking=false;
        const speechPulse=data.isSpeaking?Math.pow(Math.max(0,Math.sin(now*0.021+data.phase)),1.25):0;
        if(data.mouth){
          data.mouth.scale.y=0.12+speechPulse*0.62;
          data.mouth.scale.x=1+speechPulse*0.12;
          data.mouth.position.y=1.523-speechPulse*0.012;
        }
        if(data.head && data.state!=="working"){
          data.head.rotation.y=Math.sin(now*0.0007+data.phase)*0.055;
          data.head.rotation.x=Math.sin(now*0.0009+data.phase*1.3)*0.018+(data.isSpeaking?0.025:0);
        }
        if(!data.seated){
          data.legs.forEach((leg,index)=>{leg.rotation.x=moving?Math.sin(now*0.012+data.phase+index*Math.PI)*0.55:0;});
          data.arms.forEach((arm,index)=>{
            const walkSwing=moving?-Math.sin(now*0.012+data.phase+index*Math.PI)*0.38:Math.sin(now*0.002+data.phase)*0.06;
            const talkGesture=data.isSpeaking?Math.sin(now*0.009+data.phase+index*Math.PI)*0.2:0;
            arm.rotation.x=walkSwing+talkGesture;
            arm.rotation.z=(index===0?0.18:-0.18)+(data.isSpeaking && index===0?-0.22:0);
          });
        }else if(data.state==="working"){
          data.arms.forEach((arm,index)=>{
            arm.rotation.x=-0.45+Math.sin(now*0.012+data.phase+index*1.7)*0.12;
            arm.rotation.z=(index===0?-0.08:0.08)+Math.sin(now*0.009+data.phase)*0.035;
          });
          data.head.rotation.x=0.08+Math.sin(now*0.003+data.phase)*0.025;
        }else{
          data.arms.forEach((arm,index)=>{
            const gesture=data.isSpeaking && now<data.gestureUntil && index===0?0.3+Math.sin(now*0.012+data.phase)*0.12:0;
            arm.rotation.z=(index===0?-0.12:0.12)+Math.sin(now*0.004+data.phase)*0.08+(index===0?gesture:0);
            arm.rotation.x=data.isSpeaking?Math.sin(now*0.01+data.phase+index)*0.18:0;
          });
        }
        if (data.bubble && now > data.bubbleUntil) {
          o.remove(data.bubble); data.bubble.material.map?.dispose(); data.bubble.material.dispose(); data.bubble = null;
        }
        if (data.partner && data.state === "meeting") {
          const toward = data.partner.position.clone().sub(o.position);
          if (toward.lengthSq() > 0.01) o.rotation.y = Math.atan2(toward.x, toward.z);
        }
      });
    }
    if (composer) composer.render();
    else renderer.render(scene, camera);
  };
  animate();

  return {
    setEmployees(nextEmployees) {
      // Re-mount is recommended when employee identities change; this avoids stale visual references.
      console.info("ZORE Office: panggil mount ulang dengan array karyawan terbaru.", nextEmployees?.length || 0);
    },
    destroy() {
      disposed = true; cancelAnimationFrame(frame); clearInterval(clockInterval); clearInterval(syncInterval); observer.disconnect();
      if (audio) { audio.pause(); audio.src = ""; }
      renderer.dispose();
      composer?.dispose();
      environmentTarget.dispose();
      marbleTexture.map.dispose(); marbleTexture.bumpMap.dispose();
      woodTexture.map.dispose(); woodTexture.bumpMap.dispose();
      fabricTexture.map.dispose(); fabricTexture.bumpMap.dispose();
      apparelTexture.map.dispose(); apparelTexture.bumpMap.dispose();
      host.innerHTML = ""; host.classList.remove("zore-office");
    }
  };
}
