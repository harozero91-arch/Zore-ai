import * as pc from "playcanvas";

const canvas=document.getElementById("renderCanvas");
const viewport=document.getElementById("viewport");
const stats=document.getElementById("stats");
const status=document.getElementById("engineStatus");
const qualitySelect=document.getElementById("quality");
const mobile=matchMedia("(max-width:760px)").matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
let disposed=false,quality="auto",frameCount=0,lastFpsTime=performance.now(),fps=0;
const app=new pc.Application(canvas,{graphicsDeviceOptions:{antialias:!mobile,alpha:false,powerPreference:"high-performance"}});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.scene.ambientLight=new pc.Color(.34,.30,.25);
app.scene.toneMapping=pc.TONEMAP_FILMIC;
app.scene.gammaCorrection=pc.GAMMA_SRGB;

const camera=new pc.Entity("ZORE Orbit Camera");
camera.addComponent("camera",{clearColor:new pc.Color(.31,.28,.24),fov:48,nearClip:.1,farClip:120});
app.root.addChild(camera);
let yaw=0,pitch=22,distance=30,targetX=0,targetY=2,targetZ=0;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function updateCamera(){const p=pitch*Math.PI/180,y=yaw*Math.PI/180;camera.setPosition(targetX+distance*Math.cos(p)*Math.sin(y),targetY+distance*Math.sin(p),targetZ+distance*Math.cos(p)*Math.cos(y));camera.lookAt(targetX,targetY,targetZ);}
updateCamera();
const sun=new pc.Entity("Warm directional light");
sun.addComponent("light",{type:"directional",color:new pc.Color(1,.86,.68),intensity:1.35,castShadows:!mobile,shadowResolution:mobile?512:1024,normalOffsetBias:.05});
sun.setEulerAngles(48,32,0);app.root.addChild(sun);
const fill=new pc.Entity("Soft ambient fill");fill.addComponent("light",{type:"omni",color:new pc.Color(.66,.75,1),intensity:.18,range:45});fill.setPosition(0,8,3);app.root.addChild(fill);
function material(name,hex,metalness=0,shininess=35){const c=new pc.Color(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);const m=new pc.StandardMaterial();m.name=name;m.diffuse=c;m.specular=new pc.Color(.32,.28,.22);m.metalness=metalness;m.shininess=shininess;m.update();return m;}
const marble=material("Ivory marble","#d8cebd",.12,70),wood=material("Mahogany wood","#4a2b20",.08,48),gold=material("Champagne gold","#c5a36b",.72,90),wall=material("Warm plaster","#b9a78f",0,18),green=material("Emerald upholstery","#205846",0,22),dark=material("Dark details","#211b18",.05,25),skin=material("Natural skin","#c58d68",0,18),navy=material("Navy suit","#263544",0,24),screen=material("Monitor glass","#263a42",.25,80);
function primitive(name,type,x,y,z,sx,sy,sz,mat){const e=new pc.Entity(name);e.addComponent("render",{type,material:mat,castShadows:!mobile,receiveShadows:true});e.setPosition(x,y,z);e.setLocalScale(sx,sy,sz);app.root.addChild(e);return e;}
const box=(n,x,y,z,sx,sy,sz,m)=>primitive(n,"box",x,y,z,sx,sy,sz,m);
const cylinder=(n,x,y,z,sx,sy,sz,m)=>primitive(n,"cylinder",x,y,z,sx,sy,sz,m);
const sphere=(n,x,y,z,sx,sy,sz,m)=>primitive(n,"sphere",x,y,z,sx,sy,sz,m);
// Executive office architecture: marble floor, classic timber wall panels and gold trims.
box("Marble floor",0,-.2,0,30,.35,22,marble);box("Rear plaster wall",0,3.8,-11,30,8,.45,wall);box("Left plaster wall",-15,3.8,0,.45,8,22,wall);
for(let x=-13.5;x<=13.5;x+=1.5){box("Timber wall panel",x,3.6,-10.72,.09,6.8,.08,wood);box("Gold panel trim",x+.12,3.6,-10.66,.025,6.8,.035,gold);}
box("Crown molding",0,7.2,-10.8,30,.22,.5,gold);box("Feature wood panel",0,4.3,-10.55,10,3.8,.12,wood);box("Brand plaque",0,5.6,-10.42,5,.9,.15,gold);box("Plaque inset",0,5.6,-10.31,4.75,.68,.16,dark);
for(let x=-12;x<=12;x+=6)box("Marble floor inlay",x,0,0,.035,.012,20,gold);for(let z=-8;z<=8;z+=4)box("Marble floor inlay",0,0,z,28,.012,.035,gold);
// Director desk, monitor, and executive chair.
box("Executive desk",0,1.65,-4,5,.28,2.2,wood);box("Gold desk edge",0,1.79,-4,5.04,.055,2.23,gold);for(const x of [-2,2])box("Desk pedestal",x,.85,-4,.48,1.5,1.8,wood);
box("Desk writing pad",0,1.82,-4,2.6,.035,1.05,green);box("Monitor housing",0,2.45,-3.45,1.55,1,.12,dark);box("Monitor screen",0,2.47,-3.37,1.38,.82,.025,screen);box("Monitor stand",0,2.12,-3.48,.16,.42,.16,gold);
for(const x of [-1.15,1.15]){cylinder("Chair base",x,.18,-.65,.72,.12,.72,dark);cylinder("Chair column",x,.5,-.65,.12,.65,.12,gold);box("Executive chair seat",x,.95,-.65,1.25,.25,1.1,green);box("Executive chair back",x,1.7,-1.12,1.25,1.35,.22,green);}
// Meeting table and chairs oriented toward the tabletop.
box("Meeting table",0,1.35,5,8,.22,2.2,wood);box("Meeting table gold rim",0,1.49,5,8.05,.05,2.24,gold);for(const x of [-3,3])box("Meeting table support",x,.65,5,.35,1.25,1.5,dark);
for(const x of [-3,-1.5,1.5,3])for(const z of [2.9,7.1]){box("Meeting chair seat",x,.78,z,1,.2,.95,green);box("Meeting chair back",x,1.32,z+(z<5?-.38:.38),1,1,.18,green);}
box("Wooden partition",-10,1.2,1,.18,2.4,9,wood);box("Partition gold cap",-10,2.45,1,.28,.12,9,gold);
for(const x of [-10,0,10]){cylinder("Gold column",x,3.5,-8,.16,7,.16,gold);cylinder("Column base",x,.12,-8,.42,.16,.42,wood);}
for(const x of [-8,0,8]){box("Ceiling light",x,7.5,-2,3,.08,.55,gold);box("Light diffuser",x,7.43,-2,2.7,.04,.42,marble);}
function employee(x,z,cloth,rotation=0){const root=new pc.Entity("Virtual employee");root.setPosition(x,0,z);root.setEulerAngles(0,rotation,0);app.root.addChild(root);const torso=new pc.Entity("Employee torso");torso.addComponent("render",{type:"capsule",material:cloth});torso.setLocalScale(.7,1.35,.48);torso.setPosition(0,1.08,0);root.addChild(torso);const head=new pc.Entity("Employee head");head.addComponent("render",{type:"sphere",material:skin});head.setLocalScale(.56,.56,.56);head.setPosition(0,2.08,0);root.addChild(head);const hair=new pc.Entity("Employee hair");hair.addComponent("render",{type:"sphere",material:dark});hair.setLocalScale(.58,.25,.58);hair.setPosition(0,2.32,0);root.addChild(hair);for(const side of [-1,1]){const leg=new pc.Entity("Employee leg");leg.addComponent("render",{type:"cylinder",material:dark});leg.setLocalScale(.19,.65,.19);leg.setPosition(side*.2,.32,0);root.addChild(leg);}return root;}
const workers=[employee(-5,-2,navy,18),employee(5,-2,green,-18),employee(-8,4,navy,28),employee(8,4,green,-28)];
// Subtle idle movement without continuous expensive skeletal animation.
let elapsed=0;app.on("update",dt=>{elapsed+=dt;workers.forEach((w,i)=>{w.setLocalPosition(w.getLocalPosition().x,Math.sin(elapsed*1.2+i)*.025,w.getLocalPosition().z);});frameCount++;const now=performance.now();if(now-lastFpsTime>=1000){fps=Math.round(frameCount*1000/(now-lastFpsTime));frameCount=0;lastFpsTime=now;stats.textContent=fps+" FPS · "+(mobile?"Android/mobile":"desktop")+" · "+quality;}});

function applyQuality(next){quality=next;const ratio=next==="high"?1:next==="low"?(mobile?.65:.8):(mobile?.78:.9);app.graphicsDevice.maxPixelRatio=ratio;const light=sun.light;if(light){light.castShadows=next==="high"&&!mobile;if(light.castShadows)light.shadowResolution=1024;}app.resizeCanvas();}
qualitySelect.addEventListener("change",()=>applyQuality(qualitySelect.value));applyQuality("auto");
document.getElementById("reset").addEventListener("click",()=>{yaw=0;pitch=22;distance=30;targetX=0;targetY=2;targetZ=0;updateCamera();});
const pointers=new Map();let previous=null,previousPinch=0;
canvas.addEventListener("pointerdown",e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});previous={x:e.clientX,y:e.clientY};if(pointers.size===2){const p=[...pointers.values()];previousPinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}});
canvas.addEventListener("pointermove",e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1&&previous){yaw-= (e.clientX-previous.x)*.35;pitch=clamp(pitch+(e.clientY-previous.y)*.22,12,43);updateCamera();}else if(pointers.size===2){const p=[...pointers.values()];const pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(previousPinch){distance=clamp(distance-(pinch-previousPinch)*.045,22,48);updateCamera();}previousPinch=pinch;}previous={x:e.clientX,y:e.clientY};});
function endPointer(e){pointers.delete(e.pointerId);previous=null;previousPinch=0;}canvas.addEventListener("pointerup",endPointer);canvas.addEventListener("pointercancel",endPointer);
canvas.addEventListener("wheel",e=>{e.preventDefault();distance=clamp(distance+e.deltaY*.018,22,48);updateCamera();},{passive:false});
const resizeObserver=new ResizeObserver(()=>{if(!disposed){app.resizeCanvas(canvas.clientWidth,canvas.clientHeight);}});resizeObserver.observe(viewport);
window.addEventListener("error",e=>{status.textContent="Kesalahan grafis: "+(e.message||"render gagal");stats.textContent="Mesin 3D mengalami kesalahan. Muat ulang halaman.";});
window.addEventListener("unhandledrejection",e=>{status.textContent="Kesalahan mesin: "+String(e.reason||"inisialisasi gagal");stats.textContent="Mesin 3D gagal dijalankan.";});
app.start();
app.resizeCanvas();
status.textContent="PlayCanvas Engine aktif · kantor sedang dirender";
window.addEventListener("beforeunload",()=>{disposed=true;resizeObserver.disconnect();app.destroy();});
