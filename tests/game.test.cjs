const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=['assets/city-geography.js','maps.js','sprites.js','renderer.js','game.js'].map(f=>fs.readFileSync(path.join(root,f),'utf8')).join('\n');
function boot(saved={}){
 const nodes=new Map(),handlers={},documentHandlers={},storage={...saved};
 const context2d=new Proxy({measureText:t=>({width:t.length*8})},{get:(o,k)=>o[k]||(()=>{})});
 function node(selector){if(!nodes.has(selector))nodes.set(selector,{hidden:['#map-overlay','#journal-overlay','#dialog'].includes(selector),width:selector==='#world-map'?480:208,height:selector==='#world-map'?460:176,style:{},dataset:{},textContent:'',tagName:'CANVAS',classList:{toggle(){}},handlers:{},addEventListener(k,fn){this.handlers[k]=fn},setPointerCapture(){},getContext(){return context2d;},setAttribute(k,v){this[k]=v},replaceChildren(){},append(){},focus(){},querySelector(){return node(selector+' .check')}});return nodes.get(selector)}
 const directionButtons=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].map(key=>{const button=node('[data-key="'+key+'"]');button.dataset.key=key;button.tagName='BUTTON';return button;});
 const sandbox={console,document:{querySelector:node,querySelectorAll:s=>s==='[data-key]'?directionButtons:[],createTextNode(){return {}},createElement(){return {}},addEventListener(k,fn){documentHandlers[k]=fn}},window:{addEventListener(k,fn){handlers[k]=fn}},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},setTimeout(){},clearTimeout(){},setInterval(){},clearInterval(){},requestAnimationFrame(){}};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 const run=s=>vm.runInContext(s,sandbox);
 function key(code,key=code,extra={}){const event={code,key,repeat:false,target:{tagName:'CANVAS'},preventDefault(){this.prevented=true},stopPropagation(){},...extra};handlers.keydown(event);return event;}
 function release(code,key=code){handlers.keyup({code,key});}
 let now=0;
 function advance(ms){while(ms>0){const step=Math.min(ms,10);now+=step;run('frame('+now+')');ms-=step;}}
 function pointer(key,type,pointerId=1){const button=directionButtons.find(b=>b.dataset.key===key);assert.ok(button.handlers[type],'registered '+type+' handler');button.handlers[type]({pointerId,preventDefault(){}});}
 return {run,key,release,advance,pointer,nodes,handlers,documentHandlers,storage};
}
// Approach through a real walkable interaction tile instead of baking in map coordinates.
function approach(app,zoneId,kind,match){
 return app.run(`(()=>{
  zone=${JSON.stringify(zoneId)};dialog=null;animation=null;clearControls();
  const target=maps[zone][${JSON.stringify(kind==='npc'?'npcs':kind==='prop'?'props':'portals')}].find(n=>Object.entries(${JSON.stringify(match)}).every(([k,v])=>n[k]===v));
  if(!target)throw Error('Missing target '+JSON.stringify(${JSON.stringify(match)}));
  for(let cell=0;cell<(${JSON.stringify(kind)}==='portal'?2:1);cell++)for(const [dx,dy,dir] of [[0,1,3],[0,-1,0],[1,0,1],[-1,0,2]]){
   if(!walkable(maps[zone],target.x+cell+dx,target.y+dy))continue;
   player={x:target.x+cell+dx,y:target.y+dy,dir,step:0};
   const selected=nearby();if(selected?.kind===${JSON.stringify(kind)}&&selected.x===target.x&&selected.y===target.y)return {...target};
  }
  throw Error('No selectable interaction tile: '+(target.name||target.label));
 })()`);
}
function usePortal(app,zoneId,match){const portal=approach(app,zoneId,'portal',match);app.run('interact()');assert.equal(app.run('zone'),portal.target,portal.label);return portal;}
let app=boot();
app.run(`for(const [direction,rows] of Object.entries({...SPRITE_FRAMES,...Object.fromEntries(Object.entries(HERO_FRAMES).map(([k,v])=>["hero-"+k,v]))})){if(rows.length!==16)throw Error(direction+' wrong height');for(const row of rows)if(row.length!==16)throw Error(direction+' row '+row+' length '+row.length);}`);
console.log('PASS sprite dimensions: three original 16×16 bases, mirrored left, walking variants');
// The U-PLEX stairs are close to the periscope, but inspecting the landmark must
// neither select a diagonal portal nor fall back to an NPC behind the player.
const landmarkTest=boot();
for(const start of [{x:57,y:121,dir:1},{x:56,y:120,dir:0}]){
 landmarkTest.run(`zone='street';player={...${JSON.stringify(start)},step:0};dialog=null;animation=null;clearControls();`);
 const location=landmarkTest.run('JSON.stringify({zone,x:player.x,y:player.y})');
 assert.equal(landmarkTest.run('nearby()?.kind'),'prop','facing the periscope selects the landmark');
 landmarkTest.key('KeyE','ㄷ',{isComposing:true});
 assert.equal(landmarkTest.run('dialog?.name'),'빨간 잠망경','periscope has its own description');
 assert.equal(landmarkTest.run('dialog.text.length'),2,'description has two pages');
 assert.equal(landmarkTest.run('JSON.stringify({zone,x:player.x,y:player.y})'),location,'opening description stays at the landmark');
 landmarkTest.key('Space',' ');landmarkTest.key('KeyE','e');
 assert.equal(landmarkTest.run('dialog'),null,'the landmark dialogue closes');
 assert.equal(landmarkTest.run('JSON.stringify({zone,x:player.x,y:player.y})'),location,'closing description does not teleport');
 landmarkTest.key('KeyE','e');assert.equal(landmarkTest.run('dialog?.name'),'빨간 잠망경','repeated interaction keeps selecting the landmark');
 landmarkTest.key('Escape');
}
for(const start of [{x:57,y:120,dir:3},{x:57,y:119,dir:3},{x:58,y:121,dir:0},{x:58,y:122,dir:3}]){
 landmarkTest.run(`zone='street';player={...${JSON.stringify(start)},step:0};dialog=null;animation=null;clearControls();`);
 assert.ok(landmarkTest.run('walkable(maps.street,player.x,player.y)'),'interaction fixture is reachable');
 const location=landmarkTest.run('JSON.stringify({zone,x:player.x,y:player.y})');
 assert.equal(landmarkTest.run('nearby()??null'),null,'a diagonal, behind or two-tile-away target is not selected');
 landmarkTest.key('Space',' ');
 assert.equal(landmarkTest.run('JSON.stringify({zone,x:player.x,y:player.y})'),location,'unfocused interaction cannot teleport');
 assert.equal(landmarkTest.run('dialog'),null,'unfocused interaction cannot open unrelated dialogue');
}
for(const [x,y,dir] of [[59,119,0],[59,120,3]]){
 landmarkTest.run(`zone='street';player={x:${x},y:${y},dir:${dir},step:0};dialog=null;animation=null;clearControls();`);
 assert.equal(landmarkTest.run('nearby()?.label'),'U-PLEX · 지하 연결','the second tile of the stairs is selectable');
 landmarkTest.key('KeyE','e');assert.equal(landmarkTest.run('zone'),'mall','facing or standing on the stairs enters B2');
}
console.log('PASS periscope regression: inspection stays in place; facing and stair footprint gate all interactions');
app.run(`draw();renderMap();`);
app.key('KeyM','ㅡ',{isComposing:true});assert.equal(app.nodes.get('#map-overlay').hidden,false,'Korean M opens map');
app.key('KeyM','ㅡ',{repeat:true});assert.equal(app.nodes.get('#map-overlay').hidden,false,'repeat does not close');
app.key('KeyM','ㅡ');assert.equal(app.nodes.get('#map-overlay').hidden,true,'Korean M closes map');
approach(app,'street','npc',{style:'guide'});
app.key('KeyE','ㄷ',{isComposing:true});assert.equal(app.nodes.get('#dialog').hidden,false,'Korean E opens nearby NPC');
assert.equal(app.run('dialog.i'),0);
app.key('Space',' ');assert.equal(app.run('dialog.i'),1,'Space advances once');
app.key('Enter','Enter');assert.equal(app.run('dialog.i'),2,'Enter advances once');
app.key('KeyE','E');assert.equal(app.run('dialog'),null,'Caps Lock E closes dialogue');
app.key('KeyM','m',{ctrlKey:true});assert.equal(app.nodes.get('#map-overlay').hidden,true,'browser shortcuts ignored');
app.key('KeyM','m',{target:{tagName:'INPUT'}});assert.equal(app.nodes.get('#map-overlay').hidden,true,'text input ignored');
app.key('','ㅡ');assert.equal(app.nodes.get('#map-overlay').hidden,false,'IME fallback map');app.key('Escape');
console.log('PASS input: Korean IME M/E, repeat, Space, Enter, Caps Lock, modifiers, editable fields, fallback');
// Exercise the registered input handlers and animation loop in an open map area.
function prepareMovement(app){
 return JSON.parse(app.run(`(()=>{
  zone='street';dialog=null;animation=null;clearControls();
  $('#dialog').hidden=true;$('#map-overlay').hidden=true;$('#journal-overlay').hidden=true;
  const m=maps.street;
  for(let y=4;y<m.h-4;y++)for(let x=4;x<m.w-4;x++){
   let open=true;
   for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++)if(!walkable(m,x+dx,y+dy))open=false;
   if(open){player={x,y,dir:0,step:0};return JSON.stringify({x,y});}
  }
  throw Error('No open movement fixture');
 })()`));
}
function position(app){return JSON.parse(app.run('JSON.stringify({x:player.x,y:player.y})'));}
const tapTest=boot();
for(const [code,dir] of [['ArrowUp',3],['ArrowDown',0],['ArrowLeft',1],['ArrowRight',2],['KeyW',3],['KeyS',0],['KeyA',1],['KeyD',2]]){
 const start=prepareMovement(tapTest);
 tapTest.run('player.dir='+(dir===0?3:0));
 tapTest.key(code);assert.equal(tapTest.run('player.dir'),dir,code+' immediately faces the requested direction');
 assert.deepEqual(position(tapTest),start,code+' does not step on keydown');
 tapTest.advance(140);assert.deepEqual(position(tapTest),start,code+' remains in place during a short hold');
 tapTest.release(code);tapTest.advance(300);assert.deepEqual(position(tapTest),start,code+' release cancels the pending step');
 tapTest.key(code);tapTest.advance(140);tapTest.release(code);tapTest.advance(200);
 assert.deepEqual(position(tapTest),start,code+' same-facing tap also stays in place');
}
console.log('PASS direction taps: all arrows/WASD face immediately, including repeated taps, without moving');
const holdTest=boot(),holdStart=prepareMovement(holdTest);
holdTest.key('ArrowUp');holdTest.advance(50);holdTest.key('ArrowUp','ArrowUp',{repeat:true});
holdTest.advance(50);holdTest.key('ArrowUp','ArrowUp',{repeat:true});holdTest.advance(49);
assert.deepEqual(position(holdTest),holdStart,'holding below 150 ms does not move');
holdTest.advance(1);assert.deepEqual(position(holdTest),{x:holdStart.x,y:holdStart.y-1},'150 ms starts the first step; repeat events do not reset the delay');
holdTest.advance(179);assert.equal(holdTest.run('player.y'),holdStart.y-1,'walking waits for the tile animation');
holdTest.advance(1);assert.equal(holdTest.run('player.y'),holdStart.y-2,'continued hold walks every 180 ms');
holdTest.release('ArrowUp');holdTest.advance(400);assert.equal(holdTest.run('player.y'),holdStart.y-2,'release completes the current tile and stops walking');
const runStart=prepareMovement(holdTest);holdTest.key('ShiftLeft','Shift');holdTest.key('ArrowRight');
holdTest.advance(149);assert.deepEqual(position(holdTest),runStart,'Shift does not remove the initial turn delay');
holdTest.advance(1);assert.equal(holdTest.run('player.x'),runStart.x+1);
holdTest.advance(99);assert.equal(holdTest.run('player.x'),runStart.x+1);
holdTest.advance(1);assert.equal(holdTest.run('player.x'),runStart.x+2,'Shift continues walking every 100 ms');
holdTest.release('ArrowRight');holdTest.release('ShiftLeft','Shift');
console.log('PASS held movement: 150 ms turn delay, repeat-independent timing, 180 ms walking and 100 ms Shift steps');
const turnTest=boot(),turnStart=prepareMovement(turnTest);
turnTest.key('ArrowUp');turnTest.advance(100);turnTest.key('ArrowRight');
assert.equal(turnTest.run('player.dir'),2,'latest direction takes priority immediately');
turnTest.advance(149);assert.deepEqual(position(turnTest),turnStart,'a new direction starts its own 150 ms delay');
turnTest.advance(1);assert.deepEqual(position(turnTest),{x:turnStart.x+1,y:turnStart.y},'latest pressed direction wins over earlier held arrows');
turnTest.release('ArrowRight');assert.equal(turnTest.run('player.dir'),3,'releasing the latest direction faces the remaining held direction');
turnTest.advance(149);assert.equal(turnTest.run('player.y'),turnStart.y,'resumed held direction gets a fresh delay');
turnTest.advance(31);assert.deepEqual(position(turnTest),{x:turnStart.x+1,y:turnStart.y-1},'resumed direction walks after the prior tile finishes');
turnTest.release('ArrowUp');
console.log('PASS direction changes: latest key wins; turning and resuming a held direction require a fresh hold');
const interruptTest=boot();
for(const interrupt of ['map','journal','blur','visibility']){
 const start=prepareMovement(interruptTest);interruptTest.key('ArrowDown');interruptTest.advance(100);
 if(interrupt==='map')interruptTest.key('KeyM','m');
 else if(interrupt==='journal')interruptTest.nodes.get('#journal-button').onclick();
 else if(interrupt==='blur')interruptTest.handlers.blur();
 else interruptTest.documentHandlers.visibilitychange();
 assert.equal(interruptTest.run('heldDirections.size'),0,interrupt+' clears pending directional input');
 interruptTest.advance(300);
 if(interrupt==='map'||interrupt==='journal'){
  interruptTest.key('ArrowRight');interruptTest.advance(300);
  assert.equal(interruptTest.run('heldDirections.size'),0,interrupt+' ignores movement while open');
  interruptTest.key('Escape');
 }
 interruptTest.advance(300);assert.deepEqual(position(interruptTest),start,interrupt+' cannot resume stale walking');
}
prepareMovement(interruptTest);approach(interruptTest,'street','npc',{style:'guide'});
const dialogueStart=position(interruptTest);interruptTest.key(['ArrowDown','ArrowLeft','ArrowRight','ArrowUp'][interruptTest.run('player.dir')]);interruptTest.advance(100);interruptTest.key('KeyE','e');
assert.ok(interruptTest.run('dialog'),'interaction opens dialogue');assert.equal(interruptTest.run('heldDirections.size'),0,'dialogue clears pending input');
interruptTest.key('ArrowRight');interruptTest.advance(300);interruptTest.key('Escape');interruptTest.advance(300);
assert.deepEqual(position(interruptTest),dialogueStart,'closing dialogue cannot resume stale walking');
console.log('PASS input interruption: map, journal, dialogue, focus loss and page visibility clear held movement');
const touchTest=boot();
for(const [code,dir] of [['ArrowUp',3],['ArrowDown',0],['ArrowLeft',1],['ArrowRight',2]]){
 const start=prepareMovement(touchTest);touchTest.pointer(code,'pointerdown');assert.equal(touchTest.run('player.dir'),dir);
 touchTest.advance(140);touchTest.pointer(code,'pointerup');touchTest.advance(300);
 assert.deepEqual(position(touchTest),start,code+' touch tap only faces');
}
let touchStart=prepareMovement(touchTest);touchTest.pointer('ArrowRight','pointerdown');touchTest.advance(149);
assert.deepEqual(position(touchTest),touchStart,'touch waits for the same hold threshold');
touchTest.advance(1);assert.equal(touchTest.run('player.x'),touchStart.x+1,'touch hold begins walking');
touchTest.pointer('ArrowRight','pointerup');touchTest.advance(400);assert.equal(touchTest.run('player.x'),touchStart.x+1,'touch release stops walking');
for(const event of ['pointercancel','lostpointercapture']){
 touchStart=prepareMovement(touchTest);touchTest.pointer('ArrowRight','pointerdown');touchTest.advance(100);
 touchTest.pointer('ArrowRight',event);touchTest.advance(300);assert.deepEqual(position(touchTest),touchStart,event+' cancels pending touch movement');
}
touchStart=prepareMovement(touchTest);touchTest.key('ArrowUp');touchTest.advance(100);touchTest.pointer('ArrowRight','pointerdown',2);touchTest.advance(150);
assert.deepEqual(position(touchTest),{x:touchStart.x+1,y:touchStart.y},'latest touch also wins over a held keyboard direction');
touchTest.release('ArrowUp');touchTest.pointer('ArrowRight','pointerup',2);
console.log('PASS touch input: taps, hold threshold, release, pointer cancellation, capture loss and mixed keyboard/touch priority');
const result=app.run(`(()=>{
 const results=[];
 for(const [zoneId,m] of Object.entries(maps)){
  const s=nearestWalkable(m,m.spawn.x,m.spawn.y),q=[[s.x,s.y]],seen=new Set([s.x+','+s.y]);
  for(let i=0;i<q.length;i++){const [x,y]=q[i];for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){const nx=x+dx,ny=y+dy,k=nx+','+ny;if(!seen.has(k)&&walkable(m,nx,ny)){seen.add(k);q.push([nx,ny]);}}}
  for(const target of [...m.portals,...m.npcs,...m.props.filter(p=>Array.isArray(p.text))]){
   let accessible=false;const oldZone=zone,oldPlayer=player;zone=zoneId;
   for(const [x,y] of q){
    if(Math.abs(x-target.x)+Math.abs(y-target.y)>2)continue;
    for(let dir=0;dir<4;dir++){player={x,y,dir,step:0};const selected=nearby();if(selected?.x===target.x&&selected?.y===target.y)accessible=true;}
   }
   zone=oldZone;player=oldPlayer;
   if(!accessible)throw Error('No reachable facing tile: '+zoneId+' '+(target.label||target.name));
  }
  for(const p of m.portals){if(!walkable(maps[p.target],p.tx,p.ty))throw Error('Blocked portal destination: '+zoneId+' '+p.label+' -> '+p.target+' '+p.tx+','+p.ty);}
  if(zoneId==='street'){
   if(!q.some(([x,y])=>Math.abs(x-m.campusGate.x)<=2&&y<m.campusGate.y))throw Error('Campus unreachable');
   if(SURFACE_EXITS.length!==8)throw Error('Missing subway exits');
  }
  results.push(zoneId+': '+q.length+' reachable tiles; all exits and NPCs accessible');
 }
 return results;
})()`);
console.log(result.join('\n'));
// Geographic anchors are verified against the independent, original OSM export.
const reference=JSON.parse(fs.readFileSync(path.join(root,'reference/map-data.json'),'utf8'));
const geographic=JSON.parse(app.run('JSON.stringify(CITY_GEOGRAPHY)'));
assert.equal(geographic.metresPerTile,6);
assert.deepEqual(geographic.exits.map(({number,x,y})=>({number,x,y})),reference.exits.map(({number,x,y})=>({number,x:x-14,y:y-2})),'all exit numbers retain original geographic positions');
const gate=reference.pois.find(p=>p.name==='연세대 정문');
assert.deepEqual(JSON.parse(app.run('JSON.stringify(maps.street.campusGate)')),{x:gate.x-14,y:gate.y-2});
const buildings=JSON.parse(app.run('JSON.stringify(maps.street.buildings)'));
const main=buildings.find(b=>b.type==='hyundai'),uplex=buildings.find(b=>b.type==='uplex'),book=buildings.find(b=>b.type==='bookshop');
assert.ok(main.x+main.w/2<uplex.x+uplex.w/2&&main.y>uplex.y,'Hyundai is southwest of U-PLEX');
assert.ok(book.x>uplex.x+uplex.w&&book.y>uplex.y,'Hongik is east of Yonsei-ro, southeast of U-PLEX');
assert.ok(main.h>main.w,'Hyundai retains its long north-south footprint');
for(const [building,branch] of [[main,'신촌점'],[uplex,'U Plex']]){
 const points=reference.buildings.filter(b=>b.branch===branch).flatMap(b=>b.points);
 const minX=Math.min(...points.map(p=>p[0]))-14,minY=Math.min(...points.map(p=>p[1]))-2,maxX=Math.max(...points.map(p=>p[0]))-14,maxY=Math.max(...points.map(p=>p[1]))-2;
 assert.ok(Math.abs(building.x-minX)<=1&&Math.abs(building.y-minY)<=1&&Math.abs(building.x+building.w-maxX)<=1&&Math.abs(building.y+building.h-maxY)<=1,branch+' footprint preserves reference extent');
}
const myeongmul=geographic.roads.find(r=>r.id==='383258757'),rawMyeongmul=reference.roads.find(r=>r.id===myeongmul.id);
for(const i of [0,-1]){const point=myeongmul.points.at(i),rawPoint=rawMyeongmul.points.at(i);assert.ok(Math.abs(point[0]-(rawPoint[0]-14))<.02&&Math.abs(point[1]-(rawPoint[1]-2))<.02,'Myeongmul junction endpoints retain coordinates');}
assert.ok(myeongmul.points.at(-1)[1]>100,'Myeongmul branches from the station half of Yonsei-ro');
app.run(`(()=>{
 const m=maps.street,junction=CITY_GEOGRAPHY.roads.find(r=>r.id==='383258757').points.at(-1),start=nearestWalkable(m,Math.round(junction[0]),Math.round(junction[1]));
 const queue=[[start.x,start.y]],seen=new Set([start.x+','+start.y]);
 for(let i=0;i<queue.length;i++)for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]){const x=queue[i][0]+dx,y=queue[i][1]+dy,k=x+','+y;if(!seen.has(k)&&walkable(m,x,y)&&[2,3,7].includes(m.tiles[y][x])){seen.add(k);queue.push([x,y]);}}
 if(!queue.some(([x,y])=>Math.abs(x-60)<=1&&Math.abs(y-106)<=1))throw Error('Myeongmul does not connect to Yonsei-ro');
 if(!queue.some(([x,y])=>Math.abs(x-97)<=2&&Math.abs(y-73)<=2))throw Error('Myeongmul diagonal road disconnected');
 if(!queue.some(([x,y])=>Math.abs(x-m.campusGate.x)<=2&&Math.abs(y-m.campusGate.y)<=2))throw Error('Yonsei-ro does not reach campus crossing');
})()`);
console.log('PASS geography: 6 m grid, all eight source exits, landmark footprints, Myeongmul–Yonsei-ro–campus road connections');
// Real connection sequence, separate B2/B1 and return to the same numbered exit.
usePortal(app,'street',{exit:2});
usePortal(app,'station',{target:'mall'});
usePortal(app,'mall',{target:'store'});
approach(app,'store','npc',{gift:'소금빵'});app.run('interact();while(dialog)interact();');assert.equal(app.run("bag.includes('소금빵')"),true);
usePortal(app,'store',{target:'mall'});
usePortal(app,'mall',{target:'station'});
const returnExit=usePortal(app,'station',{exit:2});
assert.equal(app.run('player.x'),returnExit.tx);assert.equal(app.run('player.y'),returnExit.ty);
approach(app,'street','npc',{gift:'은행잎'});app.run('interact();while(dialog)interact();updateUI();');
assert.equal(app.run("bag.includes('은행잎')"),true);assert.equal(app.run('visited.size'),5);
console.log('PASS round-trip: surface ↔ station ↔ B2 ↔ B1; both gifts; five stamps');
app.run('save()');const savedPosition=app.run('JSON.stringify({x:player.x,y:player.y})');
const restored=boot(app.storage);assert.equal(restored.run('JSON.stringify({x:player.x,y:player.y})'),savedPosition);assert.equal(restored.run('bag.length'),2);
const spawn=app.run('JSON.stringify(maps.street.spawn)');
for(const version of ['v1','v2','v3']){
 const legacy=boot({['sinchon-walk-'+version]:JSON.stringify({zone:'campus',x:25,y:20,bag:['소금빵','은행잎','invalid'],visited:['campus','mall','store','invalid']})});
 assert.equal(legacy.run('JSON.stringify({x:player.x,y:player.y})'),spawn,version+' resets position');
 assert.equal(legacy.run('zone'),'street');
 assert.deepEqual(JSON.parse(legacy.run('JSON.stringify(bag)')),['소금빵','은행잎'],version+' preserves valid gifts');
 assert.deepEqual(JSON.parse(legacy.run('JSON.stringify([...visited].sort())')),['campus','mall','store','street'],version+' preserves valid stamps');
 assert.ok(legacy.storage['sinchon-walk-v4'],version+' writes migrated save under v4');
}
const invalid=boot({'sinchon-walk-v4':JSON.stringify({zone:'street',x:-1,y:10000,bag:[]})});assert.equal(invalid.run('JSON.stringify({x:player.x,y:player.y})'),spawn);
console.log('PASS save/load, invalid save recovery, v1/v2/v3 migration preserving gifts and stamps');
const exitsTest=boot();
for(const {number} of reference.exits){
 const surface=usePortal(exitsTest,'street',{exit:number});
 const interior=usePortal(exitsTest,'station',{exit:number});
 assert.equal(exitsTest.run('player.x'),interior.tx);assert.equal(exitsTest.run('player.y'),interior.ty);
 assert.ok(Math.abs(interior.tx-surface.x)+Math.abs(interior.ty-surface.y)<=4,'Exit '+number+' returns to the same surface location');
}
for(const [surfaceLabel,returnLabel] of [['현대백화점 B2','지상 · 현대백화점 ↑'],['U-PLEX · 지하 연결','지상 · U-PLEX ↑']]){
 const surface=usePortal(exitsTest,'street',{label:surfaceLabel});
 assert.equal(exitsTest.run('player.x'),surface.tx);assert.equal(exitsTest.run('player.y'),surface.ty);
 const interior=usePortal(exitsTest,'mall',{label:returnLabel});
 assert.equal(exitsTest.run('player.x'),interior.tx);assert.equal(exitsTest.run('player.y'),interior.ty);
 assert.ok(Math.abs(interior.tx-surface.x)+Math.abs(interior.ty-surface.y)<=2,surfaceLabel+' returns to its own entrance');
}
console.log('PASS eight numbered exit round-trips; Hyundai and U-PLEX each return to their own surface entrance');

const menuTest=boot();
menuTest.run('toggleMap();toggleJournal();');
assert.equal(menuTest.nodes.get('#map-overlay').hidden,true);
assert.equal(menuTest.nodes.get('#map-button')['aria-expanded'],'false');
const before=menuTest.run('player.y');menuTest.key('ArrowUp');assert.equal(menuTest.run('player.y'),before);
menuTest.key('Escape');assert.equal(menuTest.nodes.get('#journal-overlay').hidden,true);
menuTest.nodes.get('#zoom-button').onclick();assert.equal(menuTest.run('canvas.width'),256);
menuTest.nodes.get('#zoom-button').onclick();assert.equal(menuTest.run('canvas.width'),208);
menuTest.run("for(const id of Object.keys(maps)){zone=id;player={...maps[id].spawn,dir:0,step:0};draw();renderMap();}");
console.log('PASS journal pauses movement, Escape closes, map state resets, zoom toggles, all maps render');
const motionTest=boot();
motionTest.run('player.x=32;player.y=60;animation={x:31,y:60,elapsed:44,duration:180}');
assert.equal(motionTest.run('visualPosition().x'),31);
motionTest.run('animation.elapsed=45');assert.equal(motionTest.run('visualPosition().x'),31.25);
motionTest.run('animation.elapsed=89');assert.equal(motionTest.run('visualPosition().x'),31.25);
motionTest.run('animation.elapsed=180');assert.equal(motionTest.run('visualPosition().x'),32);
console.log('PASS movement uses four discrete pixel steps without fractional interpolation');
