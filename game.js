'use strict';
const $=s=>document.querySelector(s);
const canvas=$('#game'),ctx=canvas.getContext('2d'),T=16;
ctx.imageSmoothingEnabled=false;
const keys=new Set();
const TURN_HOLD_MS=150,heldDirections=new Map();
function clearControls(){keys.clear();heldDirections.clear();}
const SAVE_KEY='sinchon-walk-v5';
let zone='street',player={...maps.street.spawn,dir:0,step:0},visited=new Set(['street']),bag=[];
let dialog=null,last=0,time=0,moveTimer=0,toastTimer,music=false,audio,musicTimer,animation=null;
let miniCache=null,priorPlace='',saveNotice='';
try{
 const raw=localStorage.getItem(SAVE_KEY),saved=raw?JSON.parse(raw):null;
 if(saved&&maps[saved.zone]){
  zone=saved.zone;let position=maps[zone].spawn;
  if(walkable(maps[zone],saved.x,saved.y))position={x:saved.x,y:saved.y};
  else{if(Number.isInteger(saved.x)&&Number.isInteger(saved.y)){try{position=nearestWalkable(maps[zone],saved.x,saved.y);}catch{}}saveNotice='지도 보정으로 걸을 수 있는 위치에서 다시 시작합니다. 기념품은 보관했어요.';}
  player={...position,dir:0,step:0};visited=new Set((saved.visited||[]).filter(id=>STAMP_IDS.includes(id)));bag=(saved.bag||[]).filter(x=>['소금빵','은행잎'].includes(x));
 }else if(['v4','v3','v2','v1'].some(version=>localStorage.getItem('sinchon-walk-'+version))){
  const version=['v4','v3','v2','v1'].find(version=>localStorage.getItem('sinchon-walk-'+version));
  const old=JSON.parse(localStorage.getItem('sinchon-walk-'+version));bag=(old.bag||[]).filter(x=>['소금빵','은행잎'].includes(x));
  visited=new Set((old.visited||[]).filter(id=>STAMP_IDS.includes(id)));
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
function changeZone(p){zone=p.target;const spawn=nearestWalkable(maps[zone],p.tx,p.ty);player.x=spawn.x;player.y=spawn.y;animation=null;clearControls();moveTimer=150;priorPlace=placeAt(zone,player.x,player.y);updateUI();toast();tone(660,.12);}
function nearby(){
 const m=maps[zone],facing=[[0,1],[-1,0],[1,0],[0,-1]][player.dir];
 const frontX=player.x+facing[0],frontY=player.y+facing[1];
 const targets=[...m.npcs.map(n=>({...n,kind:'npc'})),...m.props.filter(p=>Array.isArray(p.text)).map(p=>({...p,kind:'prop'})),...m.portals.map(p=>({...p,kind:'portal'}))];
 // Face the actual object or stair tile; nearby entrances behind/diagonal to
 // the player must never intercept an interaction with a street landmark.
 const occupies=(n,x,y)=>y===n.y&&x>=n.x&&x<n.x+(n.kind==='portal'?2:1);
 return targets.find(n=>occupies(n,frontX,frontY))||targets.find(n=>n.kind==='portal'&&occupies(n,player.x,player.y));
}
function interact(){
 if(!$('#map-overlay').hidden){toggleMap();return;}if(!$('#journal-overlay').hidden){toggleJournal();return;}
 if(dialog){dialog.i++;if(dialog.i>=dialog.text.length){if(dialog.gift&&!bag.includes(dialog.gift)){bag.push(dialog.gift);updateUI();toast(`${dialog.gift}을 산책 가방에 넣었어요.`);}dialog=null;$('#dialog').hidden=true;}else $('#speech').textContent=dialog.text[dialog.i];return;}
 const n=nearby();if(!n){$('#hint').textContent='바로 앞의 사람·사물·계단을 바라보고 누르세요.';return;}
 if(n.kind==='portal'){changeZone(n);return;}
 dialog={...n,i:0};$('#speaker').textContent=n.name;$('#speech').textContent=n.text[0];$('#dialog').hidden=false;clearControls();tone(440,.05);
}
function toggleMap(){const open=$('#map-overlay').hidden;$('#map-overlay').hidden=!open;$('#map-button').setAttribute('aria-expanded',String(open));clearControls();if(open){$('#journal-overlay').hidden=true;renderMap();$('#close-map').focus();}else canvas.focus();}
function visualPosition(){if(!animation)return {x:player.x,y:player.y};const t=Math.min(1,Math.floor(animation.elapsed/animation.duration*4)/4);return {x:animation.x+(player.x-animation.x)*t,y:animation.y+(player.y-animation.y)*t};}
function move(dx,dy,dir){if(dialog||!$('#map-overlay').hidden||!$('#journal-overlay').hidden)return;player.dir=dir;moveTimer=keys.has('Shift')?100:180;if(!walkable(maps[zone],player.x+dx,player.y+dy))return;const start=visualPosition();player.x+=dx;player.y+=dy;player.step++;const portal=maps[zone].portals.find(p=>player.y===p.y&&player.x>=p.x&&player.x<p.x+2);if(portal){changeZone(portal);return;}animation={...start,elapsed:0,duration:moveTimer};const area=currentArea();if(!visited.has(area))visited.add(area);const place=placeAt(zone,player.x,player.y);if(place!==priorPlace){priorPlace=place;toast();}updateUI();}
const DIRECTIONS={ArrowUp:[0,-1,3],KeyW:[0,-1,3],ArrowDown:[0,1,0],KeyS:[0,1,0],ArrowLeft:[-1,0,1],KeyA:[-1,0,1],ArrowRight:[1,0,2],KeyD:[1,0,2]};
function controlsBlocked(){return !!dialog||!$('#map-overlay').hidden||!$('#journal-overlay').hidden;}
function beginDirection(key,source='keyboard:'+key){
 if(controlsBlocked()||heldDirections.has(source))return;
 heldDirections.set(source,{key,elapsed:0});keys.add(key);
 // A tap faces the new direction. Walking starts only after a deliberate hold.
 player.dir=DIRECTIONS[key][2];
}
function endDirection(source){
 const released=heldDirections.get(source);if(!released)return;
 const wasActive=source===[...heldDirections.keys()].at(-1);
 heldDirections.delete(source);
 if(![...heldDirections.values()].some(input=>input.key===released.key))keys.delete(released.key);
 if(wasActive){const next=[...heldDirections.values()].at(-1);if(next){next.elapsed=0;player.dir=DIRECTIONS[next.key][2];}}
}
// KeyboardEvent.code remains KeyM/KeyE even with Korean IME or Caps Lock enabled.
function physicalKey(e){if(e.code&&e.code!=='Unidentified'){if(e.code==='ShiftLeft'||e.code==='ShiftRight')return 'Shift';return e.code;}const aliases={m:'KeyM',M:'KeyM','ㅡ':'KeyM',e:'KeyE',E:'KeyE','ㄷ':'KeyE',w:'KeyW','ㅈ':'KeyW',a:'KeyA','ㅁ':'KeyA',s:'KeyS','ㄴ':'KeyS',d:'KeyD','ㅇ':'KeyD',' ':'Space'};return aliases[e.key]||e.key;}
function handleKeyDown(e){
 if(e.metaKey||e.ctrlKey||e.altKey||e.target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName))return;
 const k=physicalKey(e);if(!DIRECTIONS[k]&&!['KeyE','KeyM','Space','Enter','Escape','Shift'].includes(k))return;
 // Prevent Space/Enter from both advancing dialogue and clicking a focused button.
 e.preventDefault();e.stopPropagation();
 if(k==='Escape'){if(!$('#journal-overlay').hidden)toggleJournal();else if(!$('#map-overlay').hidden)toggleMap();else if(dialog){dialog=null;$('#dialog').hidden=true;canvas.focus();}return;}
 if(k==='KeyM'){if(!e.repeat)toggleMap();return;}
 if(['KeyE','Space','Enter'].includes(k)){if(!e.repeat)interact();return;}
 if(DIRECTIONS[k]){if(!e.repeat)beginDirection(k);return;}
 keys.add(k);
}
window.addEventListener('keydown',handleKeyDown,{capture:true});
window.addEventListener('keyup',e=>{const k=physicalKey(e);if(DIRECTIONS[k])endDirection('keyboard:'+k);else keys.delete(k);},{capture:true});
window.addEventListener('blur',clearControls);document.addEventListener('visibilitychange',clearControls);
canvas.addEventListener('pointerdown',()=>canvas.focus());
$('#next-dialog').onclick=()=>{interact();canvas.focus();};$('#map-button').onclick=toggleMap;$('#close-map').onclick=toggleMap;$('#interact-button').onclick=()=>{interact();canvas.focus();};
window.addEventListener('resize',()=>{if(!$('#map-overlay').hidden)renderMap();});
function frame(now){const dt=Math.min(now-last,60);last=now;time+=dt;moveTimer-=dt;if(animation){animation.elapsed+=dt;if(animation.elapsed>=animation.duration)animation=null;}
 if(!controlsBlocked()){
  const input=[...heldDirections.values()].at(-1);
  if(input){input.elapsed+=dt;if(input.elapsed>=TURN_HOLD_MS&&moveTimer<=0&&!animation)move(...DIRECTIONS[input.key]);}
 }
 $('#clock').textContent=`14:${String(30+Math.floor(time/60000)%30).padStart(2,'0')}`;draw();requestAnimationFrame(frame);
}
function tone(freq,duration){if(!music||!audio)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type='triangle';osc.frequency.value=freq;gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);}
$('#sound').onclick=()=>{music=!music;$('#sound').textContent=music?'♫ 소리 켜짐':'♫ 소리 꺼짐';$('#sound').setAttribute('aria-pressed',String(music));if(music){audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();let i=0;const melody=[392,494,587,494,440,523,659,523,392,494,587,784,659,587,494,440];musicTimer=setInterval(()=>tone(melody[i++%melody.length],.25),330);}else clearInterval(musicTimer);};
$('#reset').onclick=()=>{zone='street';player={...maps.street.spawn,dir:0,step:0};animation=null;visited=new Set(['street']);bag=[];dialog=null;$('#dialog').hidden=true;$('#map-overlay').hidden=true;$('#journal-overlay').hidden=true;$('#map-button').setAttribute('aria-expanded','false');clearControls();updateUI();toast();canvas.focus();};
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);const k=b.dataset.key;if(k==='KeyE')interact();else if(k==='KeyM')toggleMap();else if(DIRECTIONS[k])beginDirection(k,'pointer:'+e.pointerId);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>endDirection('pointer:'+e.pointerId));for(const event of ['contextmenu','selectstart'])b.addEventListener(event,e=>e.preventDefault());});
function toggleJournal(){const open=$('#journal-overlay').hidden;$('#journal-overlay').hidden=!open;clearControls();if(open){$('#map-overlay').hidden=true;$('#map-button').setAttribute('aria-expanded','false');$('#close-journal').focus();}else canvas.focus();}
$('#journal-button').onclick=toggleJournal;$('#close-journal').onclick=toggleJournal;
$('#zoom-button').onclick=()=>{const wide=canvas.width===256;canvas.width=wide?320:256;canvas.height=wide?240:192;ctx.imageSmoothingEnabled=false;$('#zoom-button').textContent=wide?'확대 +':'축소 −';canvas.focus();};
if(document.fonts)document.fonts.load('10px Galmuri9');
if(!walkable(maps[zone],player.x,player.y)){zone='street';Object.assign(player,nearestWalkable(maps.street,maps.street.spawn.x,maps.street.spawn.y));}
priorPlace=placeAt(zone,player.x,player.y);updateUI();toast(saveNotice);requestAnimationFrame(frame);
