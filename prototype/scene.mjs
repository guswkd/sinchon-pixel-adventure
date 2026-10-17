import * as THREE from './vendor/three.module.min.js';
import {createWorld,toWorld,inside,walkable,findFree,movePlayer,TurnWalkInput,RouteCamera,SCALE} from './world.mjs?v=2';
const $=s=>document.querySelector(s),canvas=$('#scene');
await document.fonts.ready;
const world=createWorld(CITY_GEOGRAPHY),input=new TurnWalkInput();
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'low-power'});}catch(error){$('#loading').textContent='이 브라우저에서는 입체 화면을 켤 수 없어요. 위의 기존 신촌 모험으로 돌아갈 수 있어요.';throw error;}
renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#b8c9ac');
const scene=new THREE.Scene();scene.background=new THREE.Color('#bdcdae');scene.fog=new THREE.Fog('#bdcdae',95,150);
scene.add(new THREE.HemisphereLight('#fff3d5','#8d9c8a',1.3));const sun=new THREE.DirectionalLight('#fff2ce',1.0);sun.position.set(-40,65,30);scene.add(sun);
const camera=new THREE.OrthographicCamera(-24,24,16,-16,.1,200);const view=new RouteCamera(world.spawn);let yaw=view.yaw,zoomed=false;
let player={...world.spawn},facing={x:0,z:1},distance=0,walkClock=0,walking=false,dialog=false,mapOpen=false,last=0,noticeTimer=0;
const visited=new Set(),buildingVisuals=[],actors=[],buildingMeshes=[];
const follow=new THREE.Vector3(player.x,0,player.z-3);
const matCache=new Map();function material(color){if(!matCache.has(color))matCache.set(color,new THREE.MeshLambertMaterial({color}));return matCache.get(color);}
function box(w,h,d,color,x,y,z){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material(color));mesh.position.set(x,y+h/2,z);scene.add(mesh);return mesh;}
function shapeOf(points){const s=new THREE.Shape();points.forEach((p,i)=>i?s.lineTo(p.x,-p.z):s.moveTo(p.x,-p.z));s.closePath();return s;}
function flat(points,color,y=.01,opacity=1){const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(points)),new THREE.MeshLambertMaterial({color,side:THREE.DoubleSide,transparent:opacity<1,opacity,depthWrite:opacity===1}));mesh.rotation.x=-Math.PI/2;mesh.position.y=y;scene.add(mesh);return mesh;}
function disk(x,z,r,color,y=.02,opacity=1){const m=new THREE.Mesh(new THREE.CircleGeometry(r,12),new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,y,z);scene.add(m);return m;}
function ribbon(points,width,color,y){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],l=Math.hypot(b.x-a.x,b.z-a.z);if(l<.01)continue;const nx=-(b.z-a.z)/l*width/2,nz=(b.x-a.x)/l*width/2;flat([{x:a.x+nx,z:a.z+nz},{x:b.x+nx,z:b.z+nz},{x:b.x-nx,z:b.z-nz},{x:a.x-nx,z:a.z-nz}],color,y);}
 for(const p of points)disk(p.x,p.z,width/2,color,y+.0002);
}
function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tex=new THREE.CanvasTexture(c);tex.magFilter=THREE.NearestFilter;tex.minFilter=THREE.NearestFilter;tex.colorSpace=THREE.SRGBColorSpace;return tex;}
const paving=texture(64,64,(c)=>{c.fillStyle='#e2ddc7';c.fillRect(0,0,64,64);c.fillStyle='#d5cfb8';for(let i=0;i<64;i+=16){c.fillRect(0,i,64,1);c.fillRect(i,0,1,64);}c.fillStyle='#eae4d1';for(let i=0;i<24;i++)c.fillRect(i*17%64,i*29%64,1,1);});paving.wrapS=paving.wrapT=THREE.RepeatWrapping;paving.repeat.set(22,26);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(140,160),new THREE.MeshLambertMaterial({map:paving}));ground.rotation.x=-Math.PI/2;ground.position.set(0,-.05,0);scene.add(ground);
for(const p of world.parks)flat(p.points,'#9eb57c',.005);
const motor=world.roads.filter(r=>!r.pedestrian&&!r.area);
for(const r of motor)ribbon(r.points,r.width+1.4,'#f0e6cb',.015);
for(const r of motor)ribbon(r.points,r.width,'#8f9b95',.035);
for(const r of world.roads.filter(r=>r.area))flat(r.points,'#e6d6b5',.018);
// Crossings are surveyed, not generated at arbitrary street intersections.
for(const r of world.roads.filter(r=>r.crossing)){
 for(let i=1;i<r.points.length;i++){const a=r.points[i-1],b=r.points[i],l=Math.hypot(b.x-a.x,b.z-a.z);for(let d=0;d<l;d+=.65){const t=d/l;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.3),material('#f4eaca'));mesh.rotation.set(-Math.PI/2,0,-Math.atan2(b.z-a.z,b.x-a.x)+Math.PI/2);mesh.position.set(a.x+(b.x-a.x)*t,.055,a.z+(b.z-a.z)*t);scene.add(mesh);}}
}
function facadeTexture(type,index){return texture(64,64,c=>{
 const base=type==='uplex'?'#6d989f':type==='hyundai'?'#d8ceb4':['#c5baa2','#b89c87','#b2b3a0','#ccbda5'][index%4];
 c.fillStyle=base;c.fillRect(0,0,64,64);c.fillStyle=type==='uplex'?'#4a707c':'#8d9992';c.fillRect(7,8,20,31);c.fillRect(37,8,20,31);
 c.fillStyle=type==='uplex'?'#a4ced0':'#bdd2c9';c.fillRect(9,10,16,26);c.fillRect(39,10,16,26);c.fillStyle='#e6e9d3';c.fillRect(10,11,3,23);c.fillRect(40,11,3,23);
 c.fillStyle=type==='uplex'?'#426c76':'#f0e5c9';c.fillRect(0,43,64,4);c.fillStyle=type==='uplex'?'#86acac':'#aca28d';c.fillRect(0,62,64,2);c.fillRect(0,0,2,64);
 });}
function textTexture(text,bg='#304f49',fg='#fff4d6',width=256){return texture(width,40,(c,w,h)=>{if(bg){c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle=fg;c.fillRect(2,2,w-4,1);c.fillRect(2,h-3,w-4,1);}c.font='22px Galmuri, monospace';c.textAlign='center';c.textBaseline='middle';c.fillStyle=fg;c.fillText(text,w/2,h/2+1,w-12);});}
function standingSign(text,x,z,y=1.4,width=3,bg='#38564b'){
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:textTexture(text,bg),transparent:true,depthTest:true,depthWrite:false}));sprite.position.set(x,y,z);sprite.scale.set(width,width*40/256,1);scene.add(sprite);return sprite;
}
function facadeSign(b,text){
 let best=null;for(let i=1;i<b.points.length;i++){const a=b.points[i-1],p=b.points[i],len=Math.hypot(p.x-a.x,p.z-a.z);if(len<2)continue;const mid={x:(a.x+p.x)/2,z:(a.z+p.z)/2};const eastScore=mid.x-b.center.x;const score=(b.type==='uplex'?eastScore:mid.z-b.center.z)+len*.14;if(!best||score>best.score)best={a,p,mid,len,score};}
 if(!best)return null;const {a,p,mid,len}=best;let nx=-(p.z-a.z)/len,nz=(p.x-a.x)/len;if(inside({x:mid.x+nx*.2,z:mid.z+nz*.2},b.points)){nx=-nx;nz=-nz;}
 const width=Math.min(7,len*.83),height=width*40/256;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:textTexture(text,b.type==='uplex'?'#244f61':'#455a49'),side:THREE.DoubleSide,transparent:true}));mesh.position.set(mid.x+nx*.035,b.height*.64,mid.z+nz*.035);mesh.rotation.y=Math.atan2(nx,nz);scene.add(mesh);return mesh;
}
for(const b of world.buildings){
 const wall=facadeTexture(b.type,b.index);wall.wrapS=wall.wrapT=THREE.RepeatWrapping;wall.repeat.set(.42,.42);
 const mats=[new THREE.MeshLambertMaterial({color:b.type==='uplex'?'#8fb6b9':b.type==='hyundai'?'#e7dfc9':'#c7c4ad'}),new THREE.MeshLambertMaterial({map:wall})];
 const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shapeOf(b.points),{depth:b.height,bevelEnabled:false,steps:1}),mats);mesh.rotation.x=-Math.PI/2;scene.add(mesh);buildingMeshes.push(mesh);
 flat(b.points.map(p=>({x:p.x+1,z:p.z+.7})),'#5e7463',.008,.13);
 const roofRing=b.points.map(p=>new THREE.Vector3(p.x,b.height+.04,p.z));const rim=new THREE.Line(new THREE.BufferGeometry().setFromPoints(roofRing),new THREE.LineBasicMaterial({color:'#708173'}));scene.add(rim);
 const sign=b.type==='shop'?null:facadeSign(b,b.type==='uplex'?'U-PLEX':'HYUNDAI');
 const details=[];if(inside(b.center,b.points)){
  const ac=box(1.5,.45,1,'#a3ad9d',b.center.x,b.height,b.center.z);details.push(ac);
  const vent=box(1.1,.1,.75,'#7a897e',b.center.x,b.height+.45,b.center.z);details.push(vent);
 }
 buildingVisuals.push({mesh,mats,sign,rim,details});
}
// Original low-poly street furniture; no downloaded game art.
function tree(x,z,size=1){if(!walkable(world,{x,z},.6))return;box(.24,1.1,.24,'#8b7956',x,0,z);const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(size,0),material('#809d63'));mesh.scale.y=1.2;mesh.position.set(x,1.75,z);scene.add(mesh);disk(x,z,.8,'#738566',.012,.22);}
for(const [x,z] of [[242,531],[242,513],[241,494],[241,477],[241,461],[235,436],[224,438],[218,442],[205,540],[195,550],[272,568],[263,548],[253,536],[213,547],[228,485]]){const p=toWorld([x,z]);tree(p.x,p.z,.75);}
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
function spriteTexture(style,dir,step){return texture(16,20,c=>paintSprite(c,0,style==='hero'?0:4,style,dir,step));}
const spriteSets={};for(const style of ['hero','girl','student','guide'])spriteSets[style]=Array.from({length:4},(_,d)=>Array.from({length:3},(_,s)=>spriteTexture(style,d,s)));
function actor(pos,style='hero'){
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:spriteSets[style][0][0],transparent:true,alphaTest:.5,depthWrite:true}));sprite.center.set(.5,0);sprite.scale.set(1.7,2.125,1);sprite.position.set(pos.x,.1,pos.z);scene.add(sprite);const shadow=disk(pos.x,pos.z,.48,'#455c4a',.085,.28);shadow.scale.y=.65;const a={sprite,shadow,style,pos,dir:0};actors.push(a);return a;
}
const hero=actor(player);
for(const [xy,style] of [[[239,535],'guide'],[[237,493],'student'],[[235,448],'girl'],[[205,536],'student']])actor(findFree(world,toWorld(xy)),style);
function setActor(a,pos,dir,step=0){a.sprite.position.set(pos.x,.1,pos.z);a.shadow.position.set(pos.x,.085,pos.z);a.sprite.material.map=spriteSets[a.style][dir][step];}
function showNotice(text){$('#notice').textContent=text;$('#notice').classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('#notice').classList.remove('show'),2600);}
function nearest(){return world.landmarks.map(p=>({...p,d:Math.hypot(player.x-p.x,player.z-p.z)})).sort((a,b)=>a.d-b.d)[0];}
function inspect(){if(mapOpen){toggleMap(false);return;}if(dialog){closeDialog();return;}const p=nearest();if(p.d>5){showNotice('장소 가까이에서 살펴볼 수 있어요.');return;}input.clear();dialog=true;$('#speaker').textContent=p.name;$('#words').textContent=p.text;$('#speech').hidden=false;$('#close-speech').focus();}
function closeDialog(){dialog=false;$('#speech').hidden=true;input.clear();canvas.focus();}
function rotate(delta){view.rotate(delta,player);syncAuto();showNotice(view.enabled?'둘러본 뒤 걸으면 자동 시점으로 돌아와요.':'수동 시점 · C를 누르면 자동으로 돌아와요.');}
function syncAuto(){$('#auto').setAttribute('aria-pressed',String(view.enabled));$('#auto b').textContent=view.enabled?'켜짐':'꺼짐';}
function toggleAuto(){view.toggle(player);syncAuto();canvas.focus();}
function toggleZoom(){zoomed=!zoomed;$('#zoom').innerHTML=(zoomed?'멀리 보기':'가까이 보기')+' <kbd>Z</kbd>';resize();canvas.focus();}
function toggleMap(open=!mapOpen){mapOpen=open;input.clear();$('#map-overlay').hidden=!open;if(open){drawMap();$('#close-map').focus();}else canvas.focus();}
function home(){if(dialog)closeDialog();if(mapOpen)toggleMap(false);player={...world.spawn};input.clear();view.reset(player);yaw=view.yaw;syncAuto();follow.set(player.x,0,player.z-3);showNotice('신촌역 앞으로 돌아왔어요.');canvas.focus();}
const dirs={ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1],ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0]};let running=false;
window.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA','SELECT','A'].includes(e.target?.tagName))return;const code=e.code;if(!dirs[code]&&!['KeyQ','KeyR','KeyC','KeyZ','KeyM','KeyE','Space','Enter','Escape','ShiftLeft','ShiftRight'].includes(code))return;e.preventDefault();if(code.startsWith('Shift')){running=true;return;}if(dirs[code]){if(!dialog&&!mapOpen&&!e.repeat)input.press(code,...dirs[code]);return;}if(e.repeat)return;if(code==='Escape'){if(dialog)closeDialog();if(mapOpen)toggleMap(false);return;}if(['Space','Enter','KeyE'].includes(code)){inspect();return;}if(code==='KeyM'){toggleMap();return;}if(dialog||mapOpen)return;if(code==='KeyQ')rotate(-Math.PI/4);if(code==='KeyR')rotate(Math.PI/4);if(code==='KeyC')toggleAuto();if(code==='KeyZ')toggleZoom();},{capture:true});
window.addEventListener('keyup',e=>{input.release(e.code);if(e.code.startsWith('Shift'))running=false;});
function clear(){input.clear();running=false;}window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
const touchDirs={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
for(const b of document.querySelectorAll('[data-dir]')){b.addEventListener('pointerdown',e=>{e.preventDefault();if(dialog||mapOpen)return;b.setPointerCapture(e.pointerId);input.press('pointer:'+e.pointerId,...touchDirs[b.dataset.dir]);});for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{e.preventDefault();input.release('pointer:'+e.pointerId);});b.addEventListener('contextmenu',e=>e.preventDefault());}
$('#rotate-left').onclick=()=>{rotate(-Math.PI/4);canvas.focus();};$('#rotate-right').onclick=()=>{rotate(Math.PI/4);canvas.focus();};$('#auto').onclick=toggleAuto;$('#zoom').onclick=toggleZoom;$('#inspect').onclick=inspect;$('#touch-inspect').onclick=inspect;$('#close-speech').onclick=closeDialog;$('#map-button').onclick=()=>toggleMap();$('#close-map').onclick=()=>toggleMap(false);$('#home').onclick=home;canvas.addEventListener('pointerdown',()=>canvas.focus());
function resize(){const rect=canvas.parentElement.getBoundingClientRect(),aspect=rect.width/rect.height;const height=rect.width<650?288:320,width=Math.round(height*aspect);renderer.setSize(width,height,false);const view=zoomed?24:32;camera.left=-view*aspect/2;camera.right=view*aspect/2;camera.top=view/2;camera.bottom=-view/2;camera.updateProjectionMatrix();if(mapOpen)drawMap();}
new ResizeObserver(resize).observe(canvas.parentElement);resize();
function drawMap(){const c=$('#mini').getContext('2d'),w=360,h=420,b=world.bounds,s=Math.min((w-36)/(b.maxX-b.minX),(h-68)/(b.maxZ-b.minZ)),ox=(w-(b.maxX-b.minX)*s)/2,oy=34;const p=q=>({x:ox+(q.x-b.minX)*s,y:oy+(q.z-b.minZ)*s});c.fillStyle='#f3ecd9';c.fillRect(0,0,w,h);c.lineJoin=c.lineCap='round';
 for(const r of world.roads.filter(r=>!r.pedestrian)){c.strokeStyle=r.name==='연세로'?'#6e987f':'#b1b7aa';c.lineWidth=Math.max(2,r.width*s);c.beginPath();r.points.forEach((q,i)=>{const a=p(q);i?c.lineTo(a.x,a.y):c.moveTo(a.x,a.y);});c.stroke();}
 for(const f of world.buildings){c.fillStyle=f.type==='uplex'?'#81a9af':f.type==='hyundai'?'#b7aa88':'#d2c8b0';c.beginPath();f.points.forEach((q,i)=>{const a=p(q);i?c.lineTo(a.x,a.y):c.moveTo(a.x,a.y);});c.fill();}
 c.font='12px Galmuri';c.fillStyle='#34574b';c.fillText('N ↑',14,20);for(const f of world.landmarks){const q=p(f);c.fillStyle='#fff7e2';c.fillRect(q.x-10,q.y-20,f.name.length*12+10,19);c.fillStyle='#34574b';c.fillText(f.name,q.x-5,q.y-6);}
 const me=p(player);c.fillStyle='#fff9df';c.beginPath();c.arc(me.x,me.y,6,0,7);c.fill();c.fillStyle='#c85636';c.beginPath();c.arc(me.x,me.y,4,0,7);c.fill();}
const raycaster=new THREE.Raycaster(),direction=new THREE.Vector3();let occlusionFrame=0;
function fadeOccluders(){direction.set(player.x,.9,player.z).sub(camera.position);const length=direction.length();raycaster.set(camera.position,direction.normalize());raycaster.far=length-.4;const hit=new Set(raycaster.intersectObjects(buildingMeshes,false).map(h=>h.object));
 for(const b of buildingVisuals){const fading=hit.has(b.mesh);for(const m of b.mats){m.transparent=fading;m.opacity=fading?.23:1;m.depthWrite=!fading;}b.rim.visible=!fading;if(b.sign)b.sign.visible=!fading;for(const d of b.details)d.visible=!fading;}}
function updateHUD(){const near=nearest();const location=player.z<-25?'U-PLEX · 빨잠 광장':player.x<-5&&player.z<9?'현대백화점 · 연결 골목':'신촌역 · 연세로';$('#place').textContent=location;$('#camera-status').textContent=view.status;$('#steps').textContent=Math.round(distance/SCALE*1.5)+' m 산책';$('#hint').textContent=near.d<5?near.name+' · Space로 살펴보기':'짧게 방향 · 길게 걷기 · Q / R 시점 회전';$('#north').style.transform=`rotate(${-yaw*180/Math.PI}deg)`;
 for(const p of world.landmarks)if(Math.hypot(player.x-p.x,player.z-p.z)<5&&!visited.has(p.id)){visited.add(p.id);document.querySelector(`[data-stop="${p.id}"]`).classList.add('visited');showNotice(visited.size===3?'세 장소를 모두 걸었어요. 다른 시점으로도 둘러보세요.':p.name+'에 도착했어요.');}}
function frame(ms){const dt=Math.min((ms-last)/1000||0,.05);last=ms;
 if(!dialog&&!mapOpen){const control=input.update(dt,yaw);if(control.facing)facing=control.vector;walking=false;if(control.walking){const next=movePlayer(world,player,control.vector,(running?6.8:4.1)*dt),d=Math.hypot(next.x-player.x,next.z-player.z);walking=d>.0001;distance+=d;player=next;if(walking)walkClock+=dt;}
 }else walking=false;
 view.update(player,dt);yaw=view.yaw;
 const look=new THREE.Vector3(player.x-Math.sin(yaw)*3,0,player.z-Math.cos(yaw)*3);follow.lerp(look,Math.min(1,dt*9));camera.position.set(follow.x+Math.sin(yaw)*42,38,follow.z+Math.cos(yaw)*42);camera.lookAt(follow.x,0,follow.z);
 const screenX=facing.x*Math.cos(yaw)-facing.z*Math.sin(yaw),screenZ=facing.x*Math.sin(yaw)+facing.z*Math.cos(yaw),dir=Math.abs(screenX)>Math.abs(screenZ)?(screenX>0?2:1):(screenZ>0?0:3),step=walking?(Math.floor(walkClock*7)%2+1):0;
 setActor(hero,player,dir,step);for(const a of actors.slice(1)){const d=Math.abs(Math.sin(yaw))>.7?(Math.sin(yaw)>0?1:2):0;setActor(a,a.pos,d);}
 if(++occlusionFrame%8===0)fadeOccluders();renderer.render(scene,camera);if(occlusionFrame%8===0)updateHUD();requestAnimationFrame(frame);
}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();clear();$('#loading').hidden=false;$('#loading').textContent='화면 연결이 끊겼어요. 새로고침하면 다시 산책할 수 있어요.';});
$('#loading').hidden=true;updateHUD();requestAnimationFrame(frame);
