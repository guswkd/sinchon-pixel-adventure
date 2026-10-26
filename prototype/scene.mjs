import {paintShopWall,paintShopFront} from './shop-kit.mjs';
import {addHyundaiDetails} from './hyundai-model.mjs';
import {DETAIL_ZONES,detailZoneAtSurvey} from './building-survey.mjs?v=4';
import {addUplexDetails} from './uplex-model.mjs';
import * as THREE from './vendor/three.module.min.js';
import {createWorld,toWorld,inside,segmentDistance,sectionAt,walkable,findFree,movePlayer,TurnWalkInput,OcclusionCamera,OCCLUSION_ANGLES,RunControl,SCALE,PLAYER_HEIGHT} from './world.mjs?v=19';
import {paintAvatar,loadAvatar} from './avatar.mjs?v=5';
const sprint=new RunControl();
const $=s=>document.querySelector(s),canvas=$('#scene');
await Promise.all([document.fonts.ready,loadAvatar()]);
const world=createWorld(CITY_GEOGRAPHY),input=new TurnWalkInput();
$('#route-stops').innerHTML=world.landmarks.map((p,i)=>`<span data-stop="${p.id}">${String(i+1).padStart(2,'0')} ${p.name}</span>`).join('');
$('#map-legend').innerHTML=world.landmarks.map((p,i)=>`<span><b>${i+1}</b> ${p.name}</span>`).join('');
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'low-power'});}catch(error){$('#loading').textContent='이 브라우저에서는 입체 화면을 켤 수 없어요. 위의 기존 신촌 모험으로 돌아갈 수 있어요.';throw error;}
renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#c5e5fa');
const scene=new THREE.Scene();scene.background=new THREE.Color('#c5e5fa');scene.fog=new THREE.Fog('#c5e5fa',95,150);
scene.add(new THREE.HemisphereLight('#ffffff','#a8bdd8',2.0));const sun=new THREE.DirectionalLight('#fff9ee',1.1);sun.position.set(-40,65,30);scene.add(sun);
const camera=new THREE.OrthographicCamera(-24,24,16,-16,.1,200);const view=new OcclusionCamera();let yaw=view.yaw,zoomed=false;
let player={...world.spawn},facing={x:0,z:1},distance=0,walkClock=0,walking=false,dialog=false,mapOpen=false,last=0,noticeTimer=0;
const visited=new Set(),buildingVisuals=[],actors=[],buildingMeshes=[];
const follow=new THREE.Vector3(player.x,0,player.z);
const matCache=new Map();function material(color){if(!matCache.has(color))matCache.set(color,new THREE.MeshLambertMaterial({color}));return matCache.get(color);}
function box(w,h,d,color,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));mesh.position.set(x,y+h/2,z);scene.add(mesh);return mesh;}
function shapeOf(points){const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(p.x,-p.z):s.moveTo(p.x,-p.z));s.closePath();return s;}
function flat(points,color,y=.01,opacity=1){const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(points)),new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide,transparent:opacity<1,opacity,depthWrite:opacity===1}));mesh.rotation.x=-Math.PI/2;mesh.position.y=y;scene.add(mesh);return mesh;}
function disk(x,z,r,color,y=.02,opacity=1,lit=false){const DiskMaterial=lit?THREE.MeshLambertMaterial:THREE.MeshBasicMaterial;const m=new THREE.Mesh(new THREE.CircleGeometry(r,12),new DiskMaterial({color,transparent:opacity<1,opacity,depthWrite:opacity===1}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);scene.add(m);return m;}
function ribbon(points,width,color,y){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],l=Math.hypot(b.x-a.x,b.z-a.z);if(l<.01)continue;const nx=-(b.z-a.z)/l*width/2,nz=(b.x-a.x)/l*width/2;flat([{x:a.x+nx,z:a.z+nz},{x:b.x+nx,z:b.z+nz},{x:b.x-nx,z:b.z-nz},{x:a.x-nx,z:a.z-nz}],color,y);}
 // Joins need the same lighting as the ribbon; unlit caps appear as pale dots.
 for(const p of points)disk(p.x,p.z,width/2,color,y+.0002,1,true);
}
function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tex=new THREE.CanvasTexture(c);tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;tex.colorSpace=THREE.SRGBColorSpace;return tex;}
const paving=texture(64,64,(c)=>{c.fillStyle='#eee8dc';c.fillRect(0,0,64,64);c.fillStyle='#d7d9d8';for(let i=0;i<64;i+=16){c.fillRect(0,i,64,1);c.fillRect(i,0,1,64);}c.fillStyle='#fff9ed';for(let i=0;i<24;i++)c.fillRect(i*17%64,i*29%64,1,1);});paving.wrapS=paving.wrapT=THREE.RepeatWrapping;paving.repeat.set(22,26);
const groundWidth=world.bounds.maxX-world.bounds.minX+48,groundDepth=world.bounds.maxZ-world.bounds.minZ+48;
paving.repeat.set(groundWidth/6.36,groundDepth/6.15);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(groundWidth,groundDepth),new THREE.MeshLambertMaterial({map:paving}));ground.rotation.x=-Math.PI/2;ground.position.set((world.bounds.minX+world.bounds.maxX)/2,-.05,(world.bounds.minZ+world.bounds.maxZ)/2);scene.add(ground);
for(const p of world.parks)flat(p.points,'#89c96b',.005);
const renderRoads=[...world.roads,...world.sceneryRoads];
const motor=renderRoads.filter(r=>!r.pedestrian&&!r.area);
for(const r of motor)ribbon(r.points,r.width+1.4,'#faf3e4',.015);
for(const r of motor)ribbon(r.points,r.width,'#8295ac',.035);
// Surveyed walking paths continue across the campus lawns.
for(const r of renderRoads.filter(r=>r.pedestrian&&!r.area&&!r.crossing&&r.points.some(p=>sectionAt(p)>=3)))ribbon(r.points,r.name==='백양로'?3.2:r.width,'#f7e5ce',.025);
for(const r of renderRoads.filter(r=>r.area))flat(r.points,'#f3dcc4',.018);
// Crossings are surveyed, not generated at arbitrary street intersections.
for(const r of renderRoads.filter(r=>r.crossing)){
 for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],l=Math.hypot(b.x-a.x,b.z-a.z);for(let d=0;d<l;d+=.65){const t=d/l;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.3),material('#fffdf4'));mesh.rotation.set(-Math.PI/2,0,-Math.atan2(b.z-a.z,b.x-a.x)+Math.PI/2);mesh.position.set(a.x+(b.x-a.x)*t,.055,a.z+(b.z-a.z)*t);scene.add(mesh);}}
}
function facadeTexture(type,index){return texture(64,64,c=>{
 if(type==='church'){
  c.fillStyle='#b9aa91';c.fillRect(0,0,64,64);c.fillStyle='#d4c7af';
  for(let y=0;y<64;y+=8){c.fillRect(0,y,64,1);for(let x=(y/8%2)*8;x<64;x+=16)c.fillRect(x,y,1,8);}
  for(const x of [10,38]){c.fillStyle='#eee1c7';c.fillRect(x-2,17,20,39);c.beginPath();c.arc(x+8,17,10,Math.PI,0);c.fill();c.fillStyle='#496a72';c.fillRect(x,18,16,35);c.beginPath();c.arc(x+8,18,8,Math.PI,0);c.fill();c.fillStyle='#cebda0';c.fillRect(x+7,10,2,44);c.fillRect(x,32,16,2);}return;
 }
 if(type==='bridge'){
  c.fillStyle='#6f939e';c.fillRect(0,0,64,64);c.fillStyle='#abd1d1';for(let x=3;x<64;x+=16)c.fillRect(x,5,11,53);
  c.fillStyle='#e1e2cf';for(let x=0;x<64;x+=16)c.fillRect(x,0,2,64);c.fillRect(0,0,64,4);c.fillRect(0,60,64,4);return;
 }
 const base=type==='uplex'?'#65adca':type==='hyundai'?'#f3e8d9':['#f0d8c2','#e6ad98','#c4dbe8','#f2e4b9'][index%4];
 c.fillStyle=base;c.fillRect(0,0,64,64);c.fillStyle=type==='uplex'?'#4a707c':'#688ca9';c.fillRect(7,8,20,31);c.fillRect(37,8,20,31);
 c.fillStyle=type==='uplex'?'#a4ced0':'#a3d8ef';c.fillRect(9,10,16,26);c.fillRect(39,10,16,26);c.fillStyle='#f3fcff';c.fillRect(10,11,3,23);c.fillRect(40,11,3,23);
 c.fillStyle=type==='uplex'?'#426c76':'#fff5e4';c.fillRect(0,43,64,4);c.fillStyle=type==='uplex'?'#86acac':'#b4b5c3';c.fillRect(0,62,64,2);c.fillRect(0,0,2,64);
 });}
function textTexture(text,bg='#304f49',fg='#fff4d6',width=256){return texture(width,40,(c,w,h)=>{if(bg){c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle=fg;c.fillRect(2,2,w-4,1);c.fillRect(2,h-3,w-4,1);}c.font='22px Galmuri, monospace';c.textAlign='center';c.textBaseline='middle';c.fillStyle=fg;c.fillText(text,w/2,h/2+1,w-12);});}
function standingSign(text,x,z,y=1.4,width=3,bg='#38564b'){
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:textTexture(text,bg),transparent:true,depthTest:true,depthWrite:false}));sprite.position.set(x,y,z);sprite.scale.set(width,width*40/256,1);scene.add(sprite);return sprite;
}
function facadeSign(b,text){
 let best=null;for(let i=1;i<b.points.length;i++){const a=b.points[i-1],p=b.points[i],len=Math.hypot(p.x-a.x,p.z-a.z);if(len<2)continue;const mid={x:(a.x+p.x)/2,z:(a.z+p.z)/2};const eastScore=mid.x-b.center.x;const score=(b.type==='uplex'?eastScore:b.type==='church'?-eastScore:mid.z-b.center.z)+len*.14;if(!best||score>best.score)best={a,p,mid,len,score};}
 if(!best)return null;const {a,p,mid,len}=best;let nx=-(p.z-a.z)/len,nz=(p.x-a.x)/len;if(inside({x:mid.x+nx*.2,z:mid.z+nz*.2},b.points)){nx=-nx;nz=-nz;}
 const width=Math.min(7,len*.83),height=width*40/256;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:textTexture(text,b.type==='uplex'?'#244f61':'#455a49'),side:THREE.DoubleSide,transparent:true}));mesh.position.set(mid.x+nx*.035,b.height*.64,mid.z+nz*.035);mesh.rotation.y=Math.atan2(nx,nz);scene.add(mesh);return mesh;
}
const shopWalls=Array.from({length:4},(_,i)=>{const t=texture(64,64,c=>paintShopWall(c,i));t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(.42,.42);return t;});
const shopWindows=Array.from({length:4},(_,i)=>texture(64,32,c=>paintShopFront(c,i)));
function shopFront(b){
 let best=null;
 for(let i=1;i<b.points.length;i++){
  const a=b.points[i-1],p=b.points[i],len=Math.hypot(p.x-a.x,p.z-a.z);if(len<1.8)continue;
  const mid={x:(a.x+p.x)/2,z:(a.z+p.z)/2};let distance=Infinity;
  for(const road of motor)for(let j=1;j<road.points.length;j++)distance=Math.min(distance,segmentDistance(mid,road.points[j-1],road.points[j]));
  if(distance<5&&(!best||distance<best.distance))best={a,p,len,mid,distance};
 }
 if(!best)return null;
 const {a,p,len,mid}=best;let nx=-(p.z-a.z)/len,nz=(p.x-a.x)/len;
 if(inside({x:mid.x+nx*.15,z:mid.z+nz*.15},b.points)){nx=-nx;nz=-nz;}
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(len*.85,4.5),1.35),new THREE.MeshBasicMaterial({map:shopWindows[b.index%4]}));
 mesh.position.set(mid.x+nx*.04,.76,mid.z+nz*.04);mesh.rotation.y=Math.atan2(nx,nz);scene.add(mesh);return mesh;
}
for(const b of [...world.buildings,...world.sceneryBuildings]){
 const wall=b.type==='shop'?shopWalls[b.index%4]:facadeTexture(b.type,b.index);if(b.type!=='shop'){wall.wrapS=wall.wrapT=THREE.RepeatWrapping;wall.repeat.set(.42,b.type==='bridge'?1/(b.height-b.baseHeight):.42);}
 const mats=[new THREE.MeshLambertMaterial({color:b.type==='uplex'?'#79c8e2':b.type==='hyundai'?'#f6e8d5':['#afc7df','#d6a292','#95bbb9','#d0c0a3'][b.index%4]}),new THREE.MeshLambertMaterial({map:wall})];
 const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shapeOf(b.points),{depth:b.height-b.baseHeight,bevelEnabled:false,steps:1}),mats);mesh.rotation.x=-Math.PI/2;mesh.position.y=b.baseHeight;scene.add(mesh);buildingMeshes.push(mesh);
 flat(b.points.map(p=>({x:p.x+1,z:p.z+.7})),'#5e7463',.008,.13);
 const roofRing=b.points.map(p=>new THREE.Vector3(p.x,b.height+.04,p.z));const rim=new THREE.Line(new THREE.BufferGeometry().setFromPoints(roofRing),new THREE.LineBasicMaterial({color:'#6f859f'}));scene.add(rim);
 const sign=b.survey?null:b.type==='shop'?(!b.scenery?shopFront(b):null):b.type==='bridge'?null:facadeSign(b,b.type==='uplex'?'U-PLEX':b.type==='church'?'창천교회':b.type==='campus'?b.name.replace(/ \(.*\)/,''):b.type==='hospital'?'연세암병원':'HYUNDAI');
 const details=[];if(b.survey?.model==='hyundai'){
  details.push(...addHyundaiDetails(THREE,scene,b,{texture,textTexture,inside}));
 }else if(b.survey?.model==='uplex'){
  details.push(...addUplexDetails(THREE,scene,b,{texture,textTexture,inside,flat}));
 }else if(b.type==='bridge'){
  const lowerRim=new THREE.Line(new THREE.BufferGeometry().setFromPoints(b.points.map(p=>new THREE.Vector3(p.x,b.baseHeight,p.z))),new THREE.LineBasicMaterial({color:'#50646b'}));scene.add(lowerRim);details.push(lowerRim);
 }else if(b.type==='church'){
  details.push(box(.18,1.5,.18,'#e4d8b9',b.center.x,b.height,b.center.z),box(.9,.18,.18,'#e4d8b9',b.center.x,b.height+1.05,b.center.z));
 }else if(!b.scenery&&inside(b.center,b.points)&&(!b.newSection||b.index%3===0)){
  const ac=box(1.5,.45,1,'#c5d5e0',b.center.x,b.height,b.center.z);details.push(ac);
  const vent=box(1.1,.1,.75,'#8d9eb4',b.center.x,b.height+.45,b.center.z);details.push(vent);
 }
 buildingVisuals.push({mesh,mats,sign,rim,details});
}
// Original low-poly street furniture; no downloaded game art.
function tree(x,z,size=1){if(!walkable(world,{x,z},.6))return;box(.24,1.1,.24,'#8b7956',x,0,z);const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(size,0),material('#63b958'));mesh.scale.y=1.2;mesh.position.set(x,1.75,z);scene.add(mesh);disk(x,z,.8,'#738566',.012,.22);}
for(const [x,z] of [[242,531],[242,513],[241,494],[241,477],[241,461],[235,436],[224,438],[218,442],[205,540],[195,550],[272,568],[263,548],[253,536],[213,547],[228,485]]){const p=toWorld([x,z]);tree(p.x,p.z,.75);}
for(const [x,z] of [[245,408],[236,380],[245,356],[236,342],[246,318],[237,303],[250,270],[267,270],[291,272],[283,388],[307,370],[330,345]]){const p=toWorld([x,z]);tree(p.x,p.z,.65);}
for(const [text,xy] of [['연세로 ↑ · 명물길 ↗',[244,420]],['명물길',[313,368]],['연세대 정문 방면 ↑',[245,266]],['성산로 · 횡단보도',[252,238]],['연세대학교',[226,191]],['백양로 ↑',[246,165]],['공학관 ←',[248,114]],['백주년기념관 →',[277,89]],['백양로 산책길',[275,44]],['백양로 북쪽',[296,-25]],['스포츠과학관 주변',[169,20]],['명물길 동쪽 →',[385,299]],['신촌역로',[447,292]],['신촌로 동쪽',[449,513]]]){
 const p=toWorld(xy);standingSign(text,p.x,p.z,2.2,4.2);
}
// Trees use surveyed garden interiors, not invented rows across paths.
for(const park of world.parks){if(!park.points.some(p=>sectionAt(p)>=3))continue;const center={x:park.points.reduce((v,p)=>v+p.x,0)/park.points.length,z:park.points.reduce((v,p)=>v+p.z,0)/park.points.length};if(inside(center,park.points)&&center.z<toWorld([0,200]).z&&center.z>world.bounds.minZ)tree(center.x,center.z,.9);}
for(const e of world.exits){
 box(.16,2,.16,'#486952',e.x,0,e.z);standingSign('② '+e.number,e.x,e.z,2.2,1.65,'#3c8054');
 // A compact, correctly positioned mouth; interiors stay in the original version.
 const stair=flat([{x:e.x-.5,z:e.z-.1},{x:e.x+.5,z:e.z-.1},{x:e.x+.5,z:e.z+.7},{x:e.x-.5,z:e.z+.7}],'#53645a',.07);
 for(let i=0;i<4;i++)box(.9,.05,.06,'#d3d8bd',e.x,.08,e.z+i*.16);
}
const red=toWorld([232,445]);box(.25,2.7,.25,'#d65a3c',red.x,0,red.z);box(1.15,.65,.45,'#d65a3c',red.x-.36,2.45,red.z);
const clockTex=texture(32,32,c=>{c.fillStyle='#d65a3c';c.fillRect(0,0,32,32);c.fillStyle='#fff2d0';c.beginPath();c.arc(16,16,12,0,Math.PI*2);c.fill();c.fillStyle='#354c47';c.fillRect(15,7,2,10);c.fillRect(16,15,7,2);});
const clock=new THREE.Mesh(new THREE.PlaneGeometry(.58,.58),new THREE.MeshBasicMaterial({map:clockTex,side:THREE.DoubleSide}));clock.position.set(red.x-.66,2.78,red.z+.235);scene.add(clock);
world.obstacles=[{...red,r:.4}];
function spriteTexture(style,dir,step){return texture(16,20,c=>paintSprite(c,0,4,style,dir,step));}
const spriteSets={};for(const style of ['girl','student','guide'])spriteSets[style]=Array.from({length:4},(_,d)=>Array.from({length:3},(_,s)=>spriteTexture(style,d,s)));
const heroTextures=Object.fromEntries(['idle','walk','run'].map(gait=>[gait,Array.from({length:4},(_,dir)=>Array.from({length:4},(_,frame)=>texture(24,32,c=>paintAvatar(c,dir,gait,frame))))]));
function actor(pos,style='hero'){
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:style==='hero'?heroTextures.idle[0][0]:spriteSets[style][0][0],transparent:true,alphaTest:.5,depthWrite:true}));sprite.center.set(.5,0);sprite.scale.set(style==='hero'?2.1:1.7,style==='hero'?PLAYER_HEIGHT:2.125,1);sprite.position.set(pos.x,.1,pos.z);scene.add(sprite);const shadow=disk(pos.x,pos.z,.48,'#455c4a',.085,.28);shadow.scale.y=.65;const a={sprite,shadow,style,pos,dir:0};actors.push(a);return a;
}
const hero=actor(player);
for(const [xy,style] of [[[239,535],'guide'],[[237,493],'student'],[[235,448],'girl'],[[205,536],'student']])actor(findFree(world,toWorld(xy)),style);
for(const [xy,style] of [[[237,370],'student'],[[305,371],'girl'],[[266,272],'guide'],[[228,192],'guide'],[[246,160],'student'],[[249,110],'student'],[[282,87],'guide'],[[270,47],'girl'],[[386,297],'student'],[[444,292],'guide'],[[447,510],'girl']])actor(findFree(world,toWorld(xy)),style);
function setActor(a,pos,dir,step=0,gait='idle'){a.sprite.position.set(pos.x,.1,pos.z);a.shadow.position.set(pos.x,.085,pos.z);a.sprite.material.map=a.style==='hero'?heroTextures[gait][dir][step]:spriteSets[a.style][dir][step];}
function showNotice(text){$('#notice').textContent=text;$('#notice').classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').classList.remove('show'),2600);}
function nearest(){return world.landmarks.map(p=>({...p,d:Math.hypot(player.x-p.x,player.z-p.z)})).sort((a,b)=>a.d-b.d)[0];}
function inspect(){if(mapOpen){toggleMap(false);return;}if(dialog){closeDialog();return;}const p=nearest();if(p.d>5){showNotice('장소 가까이에서 살펴볼 수 있어요.');return;}input.clear();dialog=true;$('#speaker').textContent=p.name;$('#words').textContent=p.text;$('#speech').hidden=false;$('#close-speech').focus();}
function closeDialog(){dialog=false;$('#speech').hidden=true;input.clear();canvas.focus();}
function rotate(delta){view.rotate(delta);syncAuto();showNotice(view.enabled?'건물이 가릴 때만 시점을 보정해요.':'수동 시점 · C를 누르면 가림 보정으로 돌아와요.');}
function syncAuto(){$('#auto').setAttribute('aria-pressed',String(view.enabled));$('#auto b').textContent=view.enabled?'켜짐':'꺼짐';}
function toggleAuto(){view.toggle();syncAuto();canvas.focus();}
function toggleZoom(){zoomed=!zoomed;$('#zoom').innerHTML=(zoomed?'멀리 보기':'가까이 보기')+' <kbd>Z</kbd>';resize();canvas.focus();}
function toggleMap(open=!mapOpen){mapOpen=open;input.clear();$('#map-overlay').hidden=!open;if(open){drawMap();$('#close-map').focus();}else canvas.focus();}
function home(){if(dialog)closeDialog();if(mapOpen)toggleMap(false);player={...world.spawn};input.clear();view.reset();yaw=view.yaw;syncAuto();follow.set(player.x,0,player.z);showNotice('신촌역 앞으로 돌아왔어요.');canvas.focus();}
const dirs={ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]};
window.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA','SELECT','A'].includes(e.target?.tagName))return;const code=e.code;if(e.target?.tagName==='BUTTON'&&['Space','Enter'].includes(code))return;if(!dirs[code]&&!['KeyQ','KeyR','KeyC','KeyZ','KeyM','KeyE','Space','Enter','Escape','ShiftLeft','ShiftRight'].includes(code))return;e.preventDefault();if(code.startsWith('Shift')){sprint.press(code);return;}if(dirs[code]){if(!dialog&&!mapOpen&&!e.repeat)input.press(code,...dirs[code]);return;}if(e.repeat)return;if(code==='Escape'){if(dialog)closeDialog();if(mapOpen)toggleMap(false);return;}if(['Space','Enter','KeyE'].includes(code)){inspect();return;}if(code==='KeyM'){toggleMap();return;}if(dialog||mapOpen)return;if(code==='KeyQ')rotate(-Math.PI/4);if(code==='KeyR')rotate(Math.PI/4);if(code==='KeyC')toggleAuto();if(code==='KeyZ')toggleZoom();},{capture:true});
window.addEventListener('keyup',e=>{input.release(e.code);if(e.code.startsWith('Shift'))sprint.release(e.code);});
function clear(){input.clear();sprint.clearHeld();}window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
const touchDirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
for(const b of document.querySelectorAll('[data-dir]')){b.addEventListener('pointerdown',e=>{e.preventDefault();if(dialog||mapOpen)return;b.setPointerCapture(e.pointerId);input.press('pointer:'+e.pointerId,...touchDirs[b.dataset.dir]);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{e.preventDefault();input.release('pointer:'+e.pointerId);});b.addEventListener('contextmenu',e=>e.preventDefault());}
$('#rotate-left').onclick=()=>{rotate(-Math.PI/4);canvas.focus();};$('#rotate-right').onclick=()=>{rotate(Math.PI/4);canvas.focus();};$('#auto').onclick=toggleAuto;$('#run-toggle').onclick=()=>{sprint.toggle();syncRun();canvas.focus();};$('#zoom').onclick=toggleZoom;$('#inspect').onclick=inspect;$('#touch-inspect').onclick=inspect;$('#close-speech').onclick=closeDialog;$('#map-button').onclick=()=>toggleMap();$('#close-map').onclick=()=>toggleMap(false);$('#home').onclick=home;canvas.addEventListener('pointerdown',()=>canvas.focus());
function resize(){const rect=canvas.parentElement.getBoundingClientRect(),aspect=rect.width/rect.height;const height=rect.width<650?288:320,width=Math.round(height*aspect);renderer.setSize(width,height,false);const view=zoomed?24:32;camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;camera.updateProjectionMatrix();if(mapOpen)drawMap();}
new ResizeObserver(resize).observe(canvas.parentElement);resize();
function drawMap(){const c=$('#mini').getContext('2d'),w=360,h=420,b=world.bounds,s=Math.min((w-36)/(b.maxX-b.minX),(h-68)/(b.maxZ-b.minZ)),ox=(w-(b.maxX-b.minX)*s)/2,oy=34;const p=q=>({x:ox+(q.x-b.minX)*s,y:oy+(q.z-b.minZ)*s});c.fillStyle='#f3ecd9';c.fillRect(0,0,w,h);c.lineJoin=c.lineCap='round';
 const seam=p(toWorld([0,422])).y,campusSeam=p(toWorld([0,258])).y,innerSeam=p(toWorld([0,145])).y;c.fillStyle='#e4ecdb';c.fillRect(ox,oy,(b.maxX-b.minX)*s,seam-oy);c.fillStyle='#dcecf9';c.fillRect(ox,oy,(b.maxX-b.minX)*s,campusSeam-oy);c.fillStyle='#e3efcf';c.fillRect(ox,oy,(b.maxX-b.minX)*s,innerSeam-oy);c.save();c.beginPath();c.rect(ox,oy,(b.maxX-b.minX)*s,(b.maxZ-b.minZ)*s);c.clip();
 for(const r of world.roads.filter(r=>!r.pedestrian||r.crossing||r.name==='백양로')){c.strokeStyle=r.name==='백양로'?'#458cbd':r.crossing?'#ffffff':r.name==='연세로'?'#6e987f':'#b1b7aa';c.lineWidth=Math.max(2,r.width*s);c.beginPath();r.points.forEach((q,i)=>{const a=p(q);i?c.lineTo(a.x,a.y):c.moveTo(a.x,a.y);});c.stroke();}
 for(const f of world.buildings){c.fillStyle=f.type==='uplex'?'#81a9af':f.type==='hyundai'?'#b7aa88':'#d2c8b0';c.beginPath();f.points.forEach((q,i)=>{const a=p(q);i?c.lineTo(a.x,a.y):c.moveTo(a.x,a.y);});if(f.baseHeight>=PLAYER_HEIGHT+.1){c.strokeStyle='#568b92';c.lineWidth=1;c.setLineDash([3,2]);c.stroke();c.setLineDash([]);}else c.fill();}
 c.restore();c.font='10px Galmuri';c.fillStyle='#34574b';c.fillText('N ↑',14,20);c.fillText('05 캠퍼스 북쪽',ox,oy-10);c.strokeStyle='#92a88c';c.setLineDash([4,4]);c.beginPath();c.moveTo(ox,seam);c.lineTo(w-ox,seam);c.moveTo(ox,campusSeam);c.lineTo(w-ox,campusSeam);c.moveTo(ox,innerSeam);c.lineTo(w-ox,innerSeam);c.stroke();c.setLineDash([]);
 for(const zone of DETAIL_ZONES){const a=p(toWorld([zone.left,zone.top])),d=p(toWorld([zone.right,zone.bottom]));c.strokeStyle='#758b90';c.lineWidth=.7;c.setLineDash([2,3]);c.strokeRect(a.x,a.y,d.x-a.x,d.y-a.y);c.setLineDash([]);c.fillStyle=zone.id==='01-A'?'#275b86':'#596e70';c.font='9px Galmuri';c.fillText(zone.id,a.x+3,a.y+10);}
 for(const [i,f] of world.landmarks.entries()){const q=p(f);c.fillStyle=i<3?'#42674f':'#426b87';c.beginPath();c.arc(q.x,q.y,7,0,Math.PI*2);c.fill();c.fillStyle='#fff8e2';c.textAlign='center';c.fillText(String(i+1),q.x,q.y+3);}c.textAlign='start';
 const me=p(player);c.fillStyle='#fff9df';c.beginPath();c.arc(me.x,me.y,6,0,7);c.fill();c.fillStyle='#c85636';c.beginPath();c.arc(me.x,me.y,4,0,7);c.fill();}
const raycaster=new THREE.Raycaster(),direction=new THREE.Vector3();let occlusionFrame=0;
const visibilityRay=new THREE.Raycaster(),visibilityOrigin=new THREE.Vector3(),visibilityDirection=new THREE.Vector3();let visibilityAge=1,visibilityScores=[];
function sampleVisibility(){
 // Test the opaque building envelopes even when the fallback fade is active.
 // Match the rendered camera offset; sample body, head and a short stretch ahead.
 scene.updateMatrixWorld(true);
 return OCCLUSION_ANGLES.map(angle=>{
  visibilityOrigin.set(follow.x+Math.sin(angle)*39,38,follow.z+Math.cos(angle)*39);let score=0;
  for(const [height,ahead,weight] of [[.9,0,.4],[2.3,0,.4],[.3,2,.2]]){
   visibilityDirection.set(player.x,height,player.z-ahead).sub(visibilityOrigin);const length=visibilityDirection.length();
   visibilityRay.set(visibilityOrigin,visibilityDirection.normalize());visibilityRay.far=length-.25;
   if(visibilityRay.intersectObjects(buildingMeshes,false).length)score+=weight;
  }
  return {angle,score};
 });
}

function fadeOccluders(){direction.set(player.x,.9,player.z).sub(camera.position);const length=direction.length();raycaster.set(camera.position,direction.normalize());raycaster.far=length-.4;const hit=new Set(raycaster.intersectObjects(buildingMeshes,false).map(h=>h.object));
 hero.sprite.renderOrder=hit.size?10:0;hero.sprite.material.depthTest=hit.size===0;
 for(const b of buildingVisuals){const fading=hit.has(b.mesh);for(const m of b.mats){if(m.transparent!==fading)m.needsUpdate=true;m.transparent=fading;m.opacity=fading?.23:1;m.depthWrite=!fading;}b.rim.visible=!fading;if(b.sign)b.sign.visible=!fading;for(const d of b.details)d.visible=!fading;}}
function syncRun(){$('#run-toggle').setAttribute('aria-pressed',String(sprint.toggled));$('#run-toggle').textContent=sprint.toggled?'달리기 켜짐':'달리기 켜기';$('#pace').textContent=sprint.active?'달리기 · 방향을 누르면 출발':'걷기 · Shift를 누르면 달리기';}
function updateHUD(){
 const zone=detailZoneAtSurvey(player.x/SCALE+225,player.z/SCALE+525);$('#detail-zone').textContent=zone?`${zone.id} · ${zone.id==='01-A'?'유플렉스 외관 1차 반영':zone.id==='01-C'?'현백 본관 외관 1차 반영':'건물 상세화 예정'}`:'';
 syncRun();const near=nearest(),section=sectionAt(player),underBridge=world.buildings.some(b=>b.baseHeight>=PLAYER_HEIGHT+.1&&inside(player,b.points));
 const location=section===6?(player.z<toWorld([0,350]).z?'06 · 명물길 동쪽 · 신촌역로':'06 · 신촌 동쪽'):section===5?'05 · 캠퍼스 북쪽 · 스포츠과학관':section===4?(player.x>toWorld([275,0]).x?'04 · 백주년기념관':'04 · 백양로 · 공학관'):section===3?(player.z<toWorld([0,189]).z?'03 · 백양로 초입':player.z<toWorld([0,205]).z?'03 · 연세대 정문':'03 · 성산로 횡단'):section===2?(player.x>toWorld([275,0]).x?'02 · 명물길':player.z<-94?'02 · 창천교회 앞':'02 · 연세로 상가'):underBridge?'현백–U-PLEX · 연결통로 아래':player.z<-25?'U-PLEX · 빨잠 광장':player.x<-5&&player.z<9?'현대백화점 · 연결 골목':'신촌역 · 연세로';
 $('#place').textContent=location;$('#camera-status').textContent=view.status;$('#steps').textContent=Math.round(distance/SCALE*1.5)+' m 산책';$('#hint').textContent=near.d<5?near.name+' · Space로 살펴보기':'짧게 방향 · 길게 '+(sprint.active?'달리기':'걷기')+' · Q / R 시점 회전';$('#north').style.transform=`rotate(${-yaw*180/Math.PI}deg)`;
 for(const el of document.querySelectorAll('[data-section]')){if(Number(el.dataset.section)===section)el.setAttribute('aria-current','location');else el.removeAttribute('aria-current');}
 for(const p of world.landmarks)if(Math.hypot(player.x-p.x,player.z-p.z)<5&&!visited.has(p.id)){visited.add(p.id);document.querySelector(`[data-stop="${p.id}"]`).classList.add('visited');showNotice(visited.size===world.landmarks.length?'열린 구간의 모든 장소를 걸었어요.':p.name+'에 도착했어요.');}
}
function frame(ms){const dt=Math.min((ms-last)/1000||0,.05);last=ms;
 if(!dialog&&!mapOpen){const control=input.update(dt,yaw);if(control.facing)facing=control.vector;walking=false;if(control.walking){const next=movePlayer(world,player,control.vector,sprint.speed*dt),d=Math.hypot(next.x-player.x,next.z-player.z);walking=d>.0001;distance+=d;player=next;if(walking)walkClock+=dt;}
 }else walking=false;
 visibilityAge+=dt;if(view.enabled&&visibilityAge>=.2){visibilityScores=sampleVisibility();visibilityAge=0;}
 view.update(player,dt,visibilityScores);yaw=view.yaw;
 // Smooth the player's anchor, not the rotating look-ahead offset. Otherwise
 // turning the camera alone makes the stationary hero drift across the screen.
 follow.lerp(new THREE.Vector3(player.x,0,player.z),1-Math.exp(-9*dt));
 const lookX=follow.x-Math.sin(yaw)*3,lookZ=follow.z-Math.cos(yaw)*3;
 camera.position.set(lookX+Math.sin(yaw)*42,38,lookZ+Math.cos(yaw)*42);camera.lookAt(lookX,0,lookZ);
 const screenX=facing.x*Math.cos(yaw)-facing.z*Math.sin(yaw),screenZ=facing.x*Math.sin(yaw)+facing.z*Math.cos(yaw),dir=Math.abs(screenX)>Math.abs(screenZ)?(screenX>0?2:1):(screenZ>0?0:3),gait=walking?(sprint.active?'run':'walk'):'idle',step=walking?Math.floor(walkClock*(sprint.active?12:8))%4:0;
 setActor(hero,player,dir,step,gait);for(const a of actors.slice(1)){const d=Math.abs(Math.sin(yaw))>.7?(Math.sin(yaw)>0?1:2):0;setActor(a,a.pos,d);}
 if(++occlusionFrame%8===0)fadeOccluders();renderer.render(scene,camera);if(occlusionFrame%8===0)updateHUD();requestAnimationFrame(frame);
}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();clear();$('#loading').hidden=false;$('#loading').textContent='화면 연결이 끊겼어요. 새로고침하면 다시 산책할 수 있어요.';});
$('#loading').hidden=true;updateHUD();requestAnimationFrame(frame);
