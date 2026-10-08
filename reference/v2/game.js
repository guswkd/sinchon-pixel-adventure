'use strict';
const $=s=>document.querySelector(s);
const canvas=$('#game'),ctx=canvas.getContext('2d'),T=16;
ctx.imageSmoothingEnabled=false;
const keys=new Set();
const SAVE_KEY='sinchon-walk-v2';
let zone='street',player={...maps.street.spawn,dir:0,step:0},visited=new Set(['street']),bag=[];
let dialog=null,last=0,time=0,moveTimer=0,toastTimer,music=false,audio,musicTimer,animation=null;
let miniCache=null,priorPlace='',saveNotice='';
try{
 const raw=localStorage.getItem(SAVE_KEY),saved=raw?JSON.parse(raw):null;
 if(saved&&maps[saved.zone]&&walkable(maps[saved.zone],saved.x,saved.y)){
  zone=saved.zone;player={x:saved.x,y:saved.y,dir:0,step:0};visited=new Set((saved.visited||[]).filter(id=>STAMP_IDS.includes(id)));bag=(saved.bag||[]).filter(x=>['소금빵','은행잎'].includes(x));
 }else if(localStorage.getItem('sinchon-walk-v1')){
  const old=JSON.parse(localStorage.getItem('sinchon-walk-v1'));bag=(old.bag||[]).filter(x=>['소금빵','은행잎'].includes(x));
  saveNotice='지도가 바뀌어 신촌역 2번 출구에서 다시 시작합니다. 기념품은 보관했어요.';
 }
}catch{}
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify({zone,x:player.x,y:player.y,visited:[...visited],bag}));}catch{}}
function currentArea(){return zone==='street'&&player.y<campusLine?'campus':zone;}
function updateUI(){
 visited.add(currentArea());$('#place').textContent=placeAt(zone,player.x,player.y);
 $('#progress').textContent=`${visited.size} / ${STAMP_IDS.length}`;
 $('#progress-bar').style.width=`${visited.size/STAMP_IDS.length*100}%`;
 document.querySelectorAll('#stamps li').forEach(li=>{const found=visited.has(li.dataset.zone);li.classList.toggle('found',found);li.querySelector('.check').textContent=found?'✓':'○';});
 $('#mission').textContent=visited.size===STAMP_IDS.length?'✧ 신촌 한 바퀴 완주! 모든 기억을 모았어요.':bag.length?`산책 가방 · ${bag.join(', ')}`:'신촌역에서 시작하는 다섯 곳의 기억';
 $('#map-location').textContent=`현재 위치 · ${placeAt(zone,player.x,player.y)}`;save();
}
function toast(message){const e=$('#location-toast');e.replaceChildren(document.createTextNode(placeAt(zone,player.x,player.y)));const small=document.createElement('small');small.textContent=message||({street:'북쪽 연세로 · 서쪽 현대백화점',station:'1번 출구 쪽 ↔ 현대백화점 B2',mall:'신촌역 연결층 · B1 식품관으로 올라가세요',store:'역으로 가려면 B2 연결층으로',campus:'연세대 정문을 지나 백양로로'})[currentArea()];e.append(small);e.style.opacity=1;clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.style.opacity=0,3600);}
function changeZone(p){zone=p.target;const spawn=nearestWalkable(maps[zone],p.tx,p.ty);player.x=spawn.x;player.y=spawn.y;animation=null;keys.clear();moveTimer=150;priorPlace=placeAt(zone,player.x,player.y);updateUI();toast();tone(660,.12);}
function nearby(){
 const m=maps[zone],facing=[[0,1],[-1,0],[1,0],[0,-1]][player.dir];
 return [...m.npcs.map(n=>({...n,kind:'npc'})),...m.portals.map(p=>({...p,kind:'portal'}))]
 .map(n=>({...n,distance:Math.abs(n.x-player.x)+Math.abs(n.y-player.y),front:Math.sign(n.x-player.x)===facing[0]&&Math.sign(n.y-player.y)===facing[1]}))
 .filter(n=>n.distance<=2).sort((a,b)=>a.distance-b.distance||Number(b.front)-Number(a.front))[0];
}
function interact(){
 if(!$('#map-overlay').hidden){toggleMap();return;}
 if(dialog){dialog.i++;if(dialog.i>=dialog.text.length){if(dialog.gift&&!bag.includes(dialog.gift)){bag.push(dialog.gift);updateUI();toast(`${dialog.gift}을 산책 가방에 넣었어요.`);}dialog=null;$('#dialog').hidden=true;}else $('#speech').textContent=dialog.text[dialog.i];return;}
 const n=nearby();if(!n){$('#hint').textContent='사람이나 계단에 한 걸음 더 가까이 가세요.';return;}
 if(n.kind==='portal'){changeZone(n);return;}
 dialog={...n,i:0};$('#speaker').textContent=n.name;$('#speech').textContent=n.text[0];$('#dialog').hidden=false;keys.clear();tone(440,.05);
}
function toggleMap(){const open=$('#map-overlay').hidden;$('#map-overlay').hidden=!open;$('#map-button').setAttribute('aria-expanded',String(open));keys.clear();if(open){renderMap();$('#close-map').focus();}else canvas.focus();}
function visualPosition(){if(!animation)return {x:player.x,y:player.y};const t=Math.min(1,animation.elapsed/animation.duration);return {x:animation.x+(player.x-animation.x)*t,y:animation.y+(player.y-animation.y)*t};}
function move(dx,dy,dir){if(dialog||!$('#map-overlay').hidden)return;player.dir=dir;moveTimer=keys.has('Shift')?82:145;if(!walkable(maps[zone],player.x+dx,player.y+dy))return;const start=visualPosition();player.x+=dx;player.y+=dy;player.step++;animation={...start,elapsed:0,duration:moveTimer};const area=currentArea();if(!visited.has(area))visited.add(area);const place=placeAt(zone,player.x,player.y);if(place!==priorPlace){priorPlace=place;toast();}updateUI();}
const DIRECTIONS={ArrowUp:[0,-1,3],KeyW:[0,-1,3],ArrowDown:[0,1,0],KeyS:[0,1,0],ArrowLeft:[-1,0,1],KeyA:[-1,0,1],ArrowRight:[1,0,2],KeyD:[1,0,2]};
// KeyboardEvent.code remains KeyM/KeyE even with Korean IME or Caps Lock enabled.
function physicalKey(e){if(e.code&&e.code!=='Unidentified'){if(e.code==='ShiftLeft'||e.code==='ShiftRight')return 'Shift';return e.code;}const aliases={m:'KeyM',M:'KeyM','ㅡ':'KeyM',e:'KeyE',E:'KeyE','ㄷ':'KeyE',w:'KeyW','ㅈ':'KeyW',a:'KeyA','ㅁ':'KeyA',s:'KeyS','ㄴ':'KeyS',d:'KeyD','ㅇ':'KeyD',' ':'Space'};return aliases[e.key]||e.key;}
function handleKeyDown(e){
 if(e.metaKey||e.ctrlKey||e.altKey||e.target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
 const k=physicalKey(e);if(!DIRECTIONS[k]&&!['KeyE','KeyM','Space','Enter','Escape','Shift'].includes(k))return;
 // Prevent Space/Enter from both advancing dialogue and clicking a focused button.
 e.preventDefault();e.stopPropagation();
 if(k==='Escape'){if(!$('#map-overlay').hidden)toggleMap();else if(dialog){dialog=null;$('#dialog').hidden=true;canvas.focus();}return;}
 if(k==='KeyM'){if(!e.repeat)toggleMap();return;}
 if(['KeyE','Space','Enter'].includes(k)){if(!e.repeat)interact();return;}
 keys.add(k);if(DIRECTIONS[k]&&!e.repeat)move(...DIRECTIONS[k]);
}
window.addEventListener('keydown',handleKeyDown,{capture:true});
window.addEventListener('keyup',e=>keys.delete(physicalKey(e)),{capture:true});
window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>keys.clear());
canvas.addEventListener('pointerdown',()=>canvas.focus());
$('#next-dialog').onclick=()=>{interact();canvas.focus();};$('#map-button').onclick=toggleMap;$('#close-map').onclick=toggleMap;$('#interact-button').onclick=()=>{interact();canvas.focus();};
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
function txt(s,x,y,c='#edf0d2',size=8){ctx.font=`${size}px monospace`;ctx.fillStyle=c;ctx.textAlign='center';ctx.fillText(s,Math.round(x),Math.round(y));}
function drawTile(m,t,x,y,ix,iy){
 const r=(ix*73+iy*37)%11;
 if(t===0){rect(x,y,16,16,'#a7c779');if(r<7){rect(x+3,y+5,1,2,'#85ae64');rect(x+5,y+6,1,2,'#85ae64');}if(r===2){rect(x+11,y+11,2,2,'#e3dc97');}return;}
 if(t===1||t===7){rect(x,y,16,16,t===7?'#b9b898':'#d5d2b6');rect(x,y+15,16,1,'#bcc0a1');rect(x+(iy%2)*8,y,1,16,'#bec2a5');if(t===7)rect(x+4,y+4,8,8,'#d8d4b8');return;}
 if(t===2||t===3){rect(x,y,16,16,'#929d9c');rect(x+2,y+6,1,1,'#82918c');if(t===3){rect(x+2,y+1,4,14,'#ece7c9');rect(x+10,y+1,4,14,'#ece7c9');}return;}
 if(t===4||t===5){rect(x,y,16,16,t===4?'#c1cbbc':'#e1d5b2');rect(x,y+15,16,1,t===4?'#aab8a9':'#c7bda2');rect(x+15,y,1,16,t===4?'#aab8a9':'#c7bda2');if(t===5&&(ix+iy)%2===0)rect(x+2,y+2,12,12,'#d9caa7');return;}
 if(t===6){rect(x,y,16,16,'#344b48');for(let j=0;j<4;j++)rect(x+1,y+j*4,14,2,'#d2d7b7');return;}
 if(t===8){rect(x,y,16,16,'#5a7162');rect(x,y+1,16,2,'#819983');return;}
 if(t===9){const id=m.buildingAt[iy][ix],b=m.buildings[id];const roof=b?.roof||'#8c9293';rect(x,y,16,16,roof);const bottom=iy+1>=m.h||m.buildingAt[iy+1][ix]!==id,top=iy===0||m.buildingAt[iy-1][ix]!==id;const left=ix===0||m.buildingAt[iy][ix-1]!==id,right=ix===m.w-1||m.buildingAt[iy][ix+1]!==id;
  if(bottom){rect(x,y+1,16,15,'#d9d5b9');rect(x,y,16,3,'#53645d');rect(x+3,y+5,10,8,'#3e5c64');rect(x+4,y+5,8,5,'#95bdc1');rect(x+7,y+5,1,8,'#dbe7d0');rect(x+2,y+13,12,2,'#b1ad8c');rect(x,y+15,16,1,'#5c675e');}
  else{rect(x,y+7,16,1,'#e6e2c42e');rect(x+((iy%2)*8),y,1,7,'#3b4c4a22');rect(x+8-((iy%2)*8),y+8,1,7,'#3b4c4a22');if(r===3){rect(x+5,y+4,6,5,'#516665');rect(x+6,y+4,4,2,'#abb9b1');}}
  if(top)rect(x,y,16,2,'#e9e7cd');if(left)rect(x,y,1,16,'#566761');if(right)rect(x+15,y,1,16,'#566761');
 }
}
function drawTree(x,y){rect(x+5,y+8,6,8,'#74684a');rect(x+7,y+10,2,6,'#aa9260');rect(x,y+11,17,4,'#667e5144');rect(x+1,y-3,14,14,'#2e624a');rect(x+3,y-7,10,18,'#2e624a');rect(x+2,y-2,12,10,'#4b8658');rect(x+4,y-5,8,11,'#6a9c5f');rect(x+4,y-3,5,3,'#92bd70');rect(x+10,y+2,3,4,'#3b704f');}
function drawProp(p,x,y){
 if(p.type==='lamp'){rect(x+7,y-13,2,28,'#4a6155');rect(x+4,y-16,8,7,'#344c45');rect(x+5,y-15,6,4,'#f5dda0');rect(x+5,y+14,6,2,'#425b4a');}
 if(p.type==='gate'){rect(x+1,y-2,12,18,'#789689');rect(x+2,y,10,5,'#3b6158');rect(x+4,y+1,5,2,'#b6d892');rect(x+12,y+7,4,3,'#cf805f');rect(x+3,y+9,8,5,'#a6b6a1');}
 if(p.type==='table'){rect(x-2,y,21,12,'#987e5d');rect(x-1,y-1,19,10,'#eee0b9');rect(x+2,y+12,3,4,'#635a4c');rect(x+12,y+12,3,4,'#635a4c');rect(x+5,y+1,6,4,'#829970');}
}
function drawIndoorBuilding(b,cx,cy){if(!b.rect)return;const x=b.x*T-cx,y=b.y*T-cy,w=b.w*T,h=b.h*T;rect(x+1,y+1,w-2,h-2,b.roof);for(let j=5;j<h-20;j+=8)rect(x+2,y+j,w-4,1,'#ffffff22');rect(x,y+h-25,w,25,'#ece2bb');rect(x,y+h-25,w,3,'#54675b');if(b.type==='stall'){for(let i=4;i<w-4;i+=10){rect(x+i,y+h-18,7,6,i%3?'#d2a955':'#9ba764');rect(x+i,y+h-7,7,2,'#9c8d6a');}}else for(let i=8;i<w-15;i+=22){rect(x+i,y+h-18,15,14,'#7b9b94');rect(x+i+2,y+h-16,10,6,'#b4d0ba');}txt(b.label,x+w/2,y+15,'#fff0cf',8);}
function label(text,x,y,color='#f7f0d3',font=8){ctx.font=`${font}px monospace`;const width=Math.ceil(ctx.measureText(text).width)+10;rect(x-width/2,y-10,width,14,'#354e469e');txt(text,x,y,color,font);}
function draw(){
 const m=maps[zone],v=visualPosition(),W=canvas.width,H=canvas.height;
 const cx=Math.floor(Math.max(0,Math.min(m.w*T-W,v.x*T-W/2+8))),cy=Math.floor(Math.max(0,Math.min(m.h*T-H,v.y*T-H/2+8)));
 ctx.clearRect(0,0,W,H);
 for(let y=Math.floor(cy/T);y<Math.min(m.h,Math.ceil((cy+H)/T));y++)for(let x=Math.floor(cx/T);x<Math.min(m.w,Math.ceil((cx+W)/T));x++)drawTile(m,m.tiles[y][x],x*T-cx,y*T-cy,x,y);
 if(zone==='street'){
  // Dashed centre lines use the very same geographic road segments as collision tiles.
  for(const road of m.roads){if(!['primary','secondary','tertiary'].includes(road.kind))continue;ctx.strokeStyle='#e4d79b';ctx.lineWidth=1;ctx.setLineDash([7,9]);ctx.beginPath();road.points.forEach(([x,y],i)=>i?ctx.lineTo(x*T-cx,y*T-cy):ctx.moveTo(x*T-cx,y*T-cy));ctx.stroke();}ctx.setLineDash([]);
 }else for(const b of m.buildings)if(b.x*T<cx+W&&b.y*T<cy+H&&(b.x+b.w)*T>cx&&(b.y+b.h)*T>cy)drawIndoorBuilding(b,cx,cy);
 const objects=[...m.trees.map(o=>({...o,type:'tree'})),...m.props,...m.npcs.map(o=>({...o,type:'npc'})),{...v,type:'hero'}].filter(o=>o.x*T>cx-32&&o.x*T<cx+W+32&&o.y*T>cy-32&&o.y*T<cy+H+32).sort((a,b)=>a.y-b.y);
 for(const o of objects){const x=o.x*T-cx,y=o.y*T-cy;if(o.type==='tree')drawTree(x,y);else if(o.type==='hero'||o.type==='npc'){rect(x+3,y+13,10,3,'#30493455');const step=o.type==='hero'&&animation?(player.step%2?1:2):0;paintSprite(ctx,x,y-2,o.type==='hero'?'hero':o.style,o.type==='hero'?player.dir:o.dir,step);}else drawProp(o,x,y);}
 for(const p of m.portals){const x=p.x*T-cx,y=p.y*T-cy;if(x<-100||x>W+30||y<-30||y>H+30)continue;
  if(p.exit){rect(x,y-15,12,12,'#f8dc6b');rect(x+1,y-14,10,10,'#e5bf43');txt(String(p.exit),x+6,y-6,'#283d39',8);if(zone!=='street')label(`${p.exit}번 출구`,x+16,y-20);}
  else label(p.label,x+16,y-6,'#f4e3b8',7);
 }
 if(zone==='street')for(const b of m.buildings){if(!b.label)continue;const x=(b.x+b.w/2)*T-cx,y=(b.y+b.h)*T-cy-15;if(x>-70&&x<W+70&&y>5&&y<H)label(b.label,x,y);}
 if(zone==='street')for(const p of m.labels.filter(p=>['road','campus','book'].includes(p.kind))){const x=p.x*T-cx,y=p.y*T-cy;if(x>0&&x<W&&y>10&&y<H)label(p.name,x,y,'#fff3c5',7);}
 const n=nearby();if(n&&!dialog&&$('#map-overlay').hidden){const x=v.x*T-cx,y=v.y*T-cy;rect(x,y-16,17,11,'#fff7d7');txt('E',x+8,y-8,'#304c40',8);}
 $('#hint').textContent=n?`E / Space · ${n.kind==='portal'?n.label:n.name+'와 대화'}`:'방향키 / WASD 이동 · E / Space 대화 · M 지도';
 $('#compass').textContent='N ↑';
}
function renderMap(){
 const map=$('#world-map');map.width=Math.max(280,Math.round(map.clientWidth||480));map.height=Math.max(320,Math.round(map.clientHeight||460));const c=map.getContext('2d'),W=map.width,H=map.height;c.imageSmoothingEnabled=false;c.fillStyle='#f2eedb';c.fillRect(0,0,W,H);
 if(zone==='street'){
  const m=maps.street,s=Math.min((W-44)/m.w,(H-60)/m.h),ox=(W-m.w*s)/2,oy=(H-m.h*s)/2;
  const colors=['#adc58a','#ddd8bb','#abb4ab','#ede8d0','#c3cab8','#daceaa','#4c725e','#bcb895','#71876e','#939787'];
  for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){c.fillStyle=colors[m.tiles[y][x]];c.fillRect(Math.floor(ox+x*s),Math.floor(oy+y*s),Math.ceil(s),Math.ceil(s));}
  // Labels are geographically anchored; offsets keep the crowded station readable.
  const labels=[['연세대학교',73,26,36,-7],['정문',73,49,-46,0],['성산로',103,57,28,-8],['연세로',74,80,-35,0],['명물길',98,91,25,-3],['U-PLEX',69,119,26,-8],['현대백화점',59,131,-53,-9],['신촌역 2호선',75,146,40,15],['신촌로',110,135,30,-4],['서강로',63,170,-35,0]];
  c.font='bold 11px sans-serif';c.textAlign='center';for(const [text,x,y,dx,dy] of labels){const px=ox+x*s,py=oy+y*s;const tx=Math.max(40,Math.min(W-40,px+dx)),ty=py+dy;c.strokeStyle='#71856a';c.lineWidth=1;c.beginPath();c.moveTo(px,py);c.lineTo(tx,ty);c.stroke();const width=c.measureText(text).width+10;c.fillStyle='#fbf6e6';c.fillRect(tx-width/2,ty-10,width,16);c.fillStyle='#354f40';c.fillText(text,tx,ty+2);}
  for(const p of WORLD_DATA.exits){c.fillStyle='#b4994c';c.fillRect(ox+p.x*s-2,oy+p.y*s-2,4,4);}
  const px=ox+(player.x+.5)*s,py=oy+(player.y+.5)*s;c.fillStyle='#fff5d1';c.beginPath();c.arc(px,py,7,0,Math.PI*2);c.fill();c.fillStyle='#c95745';c.beginPath();c.arc(px,py,4,0,Math.PI*2);c.fill();c.fillStyle='#355740';c.textAlign='left';c.font='bold 12px monospace';c.fillText('N ↑',20,25);
  // A real 100 m scale at six metres per tile.
  c.fillRect(20,H-20,100/6*s,2);c.font='10px monospace';c.fillText('100 m',20,H-25);
 }else{
  const m=maps[zone],s=Math.min((W-36)/m.w,(H-95)/m.h),ox=(W-m.w*s)/2,oy=40;
  const colors={4:'#c5ccba',5:'#e0d2af',6:'#5e8266',7:'#a5baa0',8:'#657b65',9:'#9b927d'};
  for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){c.fillStyle=colors[m.tiles[y][x]]||'#c6c9b4';c.fillRect(ox+x*s,oy+y*s,Math.ceil(s),Math.ceil(s));}
  c.font='10px sans-serif';c.textAlign='center';for(const p of m.portals){const x=ox+p.x*s,y=oy+p.y*s;c.fillStyle='#faf2d9';const title=p.exit?`${p.exit}번`:p.target==='store'?'B1 ↑':p.target==='mall'?'B2 연결':'지상 / 역';const tw=c.measureText(title).width+8;c.fillRect(x-tw/2,y-15,tw,13);c.fillStyle='#354e3b';c.fillText(title,x,y-5);}
  c.fillStyle='#c95745';c.beginPath();c.arc(ox+(player.x+.5)*s,oy+(player.y+.5)*s,5,0,Math.PI*2);c.fill();c.font='12px sans-serif';c.fillStyle='#354f40';c.fillText(MAP_NAMES[zone],W/2,22);c.font='11px sans-serif';c.fillText('신촌역 서쪽 ↔ 현대백화점 B2 ↕ B1 식품관',W/2,H-26);
 }
 $('#map-location').textContent=`현재 위치 · ${placeAt(zone,player.x,player.y)}`;
}
window.addEventListener('resize',()=>{if(!$('#map-overlay').hidden)renderMap();});
function frame(now){const dt=Math.min(now-last,60);last=now;time+=dt;moveTimer-=dt;if(animation){animation.elapsed+=dt;if(animation.elapsed>=animation.duration)animation=null;}
 if(!dialog&&$('#map-overlay').hidden&&moveTimer<=0){for(const [key,direction] of Object.entries(DIRECTIONS))if(keys.has(key)){move(...direction);break;}}
 $('#clock').textContent=`14:${String(30+Math.floor(time/60000)%30).padStart(2,'0')}`;draw();requestAnimationFrame(frame);
}
function tone(freq,duration){if(!music||!audio)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type='triangle';osc.frequency.value=freq;gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);}
$('#sound').onclick=()=>{music=!music;$('#sound').textContent=music?'♫ 소리 켜짐':'♫ 소리 꺼짐';$('#sound').setAttribute('aria-pressed',String(music));if(music){audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();let i=0;const melody=[392,494,587,494,440,523,659,523,392,494,587,784,659,587,494,440];musicTimer=setInterval(()=>tone(melody[i++%melody.length],.25),330);}else clearInterval(musicTimer);};
$('#reset').onclick=()=>{zone='street';player={...maps.street.spawn,dir:0,step:0};animation=null;visited=new Set(['street']);bag=[];dialog=null;$('#dialog').hidden=true;$('#map-overlay').hidden=true;$('#map-button').setAttribute('aria-expanded','false');keys.clear();updateUI();toast();canvas.focus();};
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);const k=b.dataset.key;if(k==='KeyE')interact();else if(k==='KeyM')toggleMap();else{keys.add(k);if(DIRECTIONS[k])move(...DIRECTIONS[k]);}});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys.delete(b.dataset.key));});
if(!walkable(maps[zone],player.x,player.y)){zone='street';Object.assign(player,nearestWalkable(maps.street,maps.street.spawn.x,maps.street.spawn.y));}
priorPlace=placeAt(zone,player.x,player.y);updateUI();toast(saveNotice);requestAnimationFrame(frame);
