import {
  Engine, Scene, Vector3, Color3, Color4, HemisphericLight, DirectionalLight,
  MeshBuilder, PBRMaterial, ArcRotateCamera, ShadowGenerator, TransformNode
} from "@babylonjs/core";

const canvas=document.getElementById("renderCanvas");
const viewport=document.getElementById("viewport");
const stats=document.getElementById("stats");
const status=document.getElementById("engineStatus");
const qualitySelect=document.getElementById("quality");
const mobile=matchMedia("(max-width:760px)").matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
let quality="auto",disposed=false,lastFrame=performance.now(),frames=0,fps=0;
const engine=new Engine(canvas,false,{preserveDrawingBuffer:false,stencil:false,antialias:!mobile,powerPreference:"high-performance"},false);
const scene=new Scene(engine);
scene.clearColor=new Color4(0,0,0,0);
scene.ambientColor=new Color3(.22,.20,.17);
const camera=new ArcRotateCamera("zoreCamera",-Math.PI/4,1.02,35,new Vector3(0,2,0),scene);
camera.lowerRadiusLimit=22;camera.upperRadiusLimit=48;
camera.lowerBetaLimit=.72;camera.upperBetaLimit=1.38;
camera.lowerAlphaLimit=-Math.PI*.82;camera.upperAlphaLimit=Math.PI*.32;
camera.panningSensibility=95;camera.wheelPrecision=45;camera.pinchPrecision=90;
camera.attachControl(canvas,true);
const hemi=new HemisphericLight("softAmbient",new Vector3(0,1,0),scene);hemi.intensity=.82;hemi.groundColor=new Color3(.30,.25,.20);
const sun=new DirectionalLight("warmKey",new Vector3(-.45,-1,.35),scene);sun.position=new Vector3(-12,20,-8);sun.intensity=mobile?.8:1.05;
function mat(name,color,rough=.7,metal=0){
 const m=new PBRMaterial(name,scene);m.albedoColor=Color3.FromHexString(color);m.roughness=rough;m.metallic=metal;return m;
}
const marble=mat("ivory marble","#ddd4c4",.32,.08),wood=mat("mahogany","#4b2c20",.43,.08),gold=mat("champagne gold","#c7a56a",.28,.72),wall=mat("warm plaster","#b7a58d",.88),green=mat("emerald upholstery","#1f5b48",.76),dark=mat("dark details","#211b18",.55),skin=mat("skin","#c58d68",.8),suit=mat("navy suit","#263544",.78),glass=mat("glass","#81949a",.2,.2);
function box(name,w,h,d,x,y,z,material,opts={}){const m=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d,...opts},scene);m.position.set(x,y,z);m.material=material;return m;}
function cylinder(name,diam,height,x,y,z,material,tess=20){const m=MeshBuilder.CreateCylinder(name,{diameter:diam,height,tessellation:tess},scene);m.position.set(x,y,z);m.material=material;return m;}
function sphere(name,diam,x,y,z,material){const m=MeshBuilder.CreateSphere(name,{diameter:diam,segments:12},scene);m.position.set(x,y,z);m.material=material;return m;}
// Ruang utama dengan lantai marmer, dinding panel kayu, dan aksen metal.
box("marble floor",30,.35,22,0,-.2,0,marble);
box("rear wall",30,8,.45,0,3.8,-11,wall);
box("left wall",.45,8,22,-15,3.8,0,wall);
for(let x=-13.5;x<=13.5;x+=1.5){box("wall wood panel",.09,6.8,.08,x,3.6,-10.72,wood);box("panel gold trim",.025,6.8,.035,x+.12,3.6,-10.66,gold);}
box("wall crown",30,.22,.5,0,7.2,-10.8,gold);
box("back feature panel",10,3.8,.12,0,4.3,-10.55,wood);
box("brand plaque",5,.9,.15,0,5.6,-10.42,gold);
box("brand inset",4.75,.68,.16,0,5.6,-10.31,dark);
for(let x=-12;x<=12;x+=6){box("floor inlay",.035,.012,20,x,.0,0,gold);}
for(let z=-8;z<=8;z+=4){box("floor inlay",28,.012,.035,0,.0,z,gold);}
// Meja direktur dan workstation.
box("executive desk top",5,.28,2.2,0,1.65,-4,wood);
box("desk gold edge",5.04,.055,2.23,0,1.79,-4,gold);
for(const x of [-2,2])box("desk pedestal",.48,1.5,1.8,x,.85,-4,wood);
box("desk blotter",2.6,.035,1.05,0,1.82,-4,green);
box("monitor body",1.55,1,.12,0,2.45,-3.45,dark);
box("monitor screen",1.38,.82,.025,0,2.47,-3.37,glass);
box("monitor stand",.16,.42,.16,0,2.12,-3.48,gold);
for(const x of [-1.15,1.15]){cylinder("chair base",.72,.12,x, .18,-.65,dark,24);cylinder("chair post",.12,.65,x,.5,-.65,gold);box("chair seat",1.25,.25,1.1,x,.95,-.65,green);box("chair back",1.25,1.35,.22,x,1.7,-1.12,green);}
function worker(x,z,shirt,turn=0){
 const root=new TransformNode("employee",scene);root.position.set(x,0,z);root.rotation.y=turn;
 const body=MeshBuilder.CreateCapsule("employee body",{height:1.45,radius:.34},scene);body.position.y=1.12;body.material=shirt;body.parent=root;
 const head=MeshBuilder.CreateSphere("employee head",{diameter:.58,segments:16},scene);head.position.y=2.12;head.material=skin;head.parent=root;
 const hair=MeshBuilder.CreateSphere("employee hair",{diameter:.6,segments:12,slice:0.48},scene);hair.position.y=2.32;hair.material=dark;hair.parent=root;
 for(const sx of [-.2,.2]){const leg=MeshBuilder.CreateBox("employee leg",{width:.2,height:.65,depth:.24},scene);leg.position.set(sx,.32,0);leg.material=dark;leg.parent=root;}
 return root;
}
worker(-5,-2,suit,.3);worker(5,-2,green,-.3);worker(-8,4,suit,.5);worker(8,4,green,-.5);
// Area rapat: meja panjang dan kursi menghadap meja.
box("meeting table",8,.22,2.2,0,1.35,5,wood);box("meeting gold rim",8.05,.05,2.24,0,1.49,5,gold);
for(const x of [-3,3])box("meeting table support",.35,1.25,1.5,x,.65,5,dark);
for(const x of [-3,-1.5,1.5,3])for(const z of [2.9,7.1]){box("meeting chair seat",1,.2,.95,x,.78,z,green);box("meeting chair back",1,1,.18,x,1.32,z+(z<5?-.38:.38),green);cylinder("meeting chair stem",.12,.55,x,.38,z,dark);}
box("meeting divider",.18,2.4,9,-10,1.2,1,wood);box("divider cap",.28,.12,9,-10,2.45,1,gold);
// Lighting fixtures and columns.
for(const x of [-10,0,10]){cylinder("gold column",.16,7,x,3.5,-8,gold,16);cylinder("column base",.42,.16,x,.12,-8,wood,20);}
for(const x of [-8,0,8]){box("ceiling light",3,.08,.55,x,7.5,-2,gold);box("light diffuser",2.7,.04,.42,x,7.43,-2,marble);}
let shadows=null;
if(!mobile){shadows=new ShadowGenerator(1024,sun);shadows.useBlurExponentialShadowMap=true;shadows.blurKernel=16;for(const mesh of scene.meshes){if(mesh.name.includes("employee")||mesh.name.includes("desk")||mesh.name.includes("chair"))shadows.addShadowCaster(mesh);}}
function applyQuality(next){
 quality=next;
 const level=next==="high"?1:next==="low"?(mobile?2.2:1.6):(mobile?1.65:1.15);
 engine.setHardwareScalingLevel(level);
 if(shadows)shadows.getShadowMap().refreshRate=next==="low"?2:1;
}
qualitySelect.addEventListener("change",()=>applyQuality(qualitySelect.value));
applyQuality("auto");
document.getElementById("reset").addEventListener("click",()=>{camera.alpha=-Math.PI/4;camera.beta=1.02;camera.radius=35;camera.target.set(0,2,0);});
const resizeObserver=new ResizeObserver(()=>engine.resize());resizeObserver.observe(viewport);
document.addEventListener("visibilitychange",()=>{if(document.hidden){engine.stopRenderLoop();}else if(!disposed)engine.runRenderLoop(render);});
function render(){if(disposed||document.hidden)return;scene.render();frames++;const now=performance.now();if(now-lastFrame>=1000){fps=Math.round(frames*1000/(now-lastFrame));frames=0;lastFrame=now;stats.textContent=fps+" FPS · "+(mobile?"Android/mobile":"desktop")+" · "+quality+" · "+engine.getRenderWidth()+"×"+engine.getRenderHeight();}}
engine.runRenderLoop(render);
status.textContent="Babylon.js aktif · prototipe uji";
window.addEventListener("beforeunload",()=>{disposed=true;resizeObserver.disconnect();engine.dispose();});
