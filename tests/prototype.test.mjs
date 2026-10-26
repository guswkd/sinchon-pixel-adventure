import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createWorld,toWorld,inside,walkable,movePlayer,cameraVector,TurnWalkInput,OcclusionCamera,OCCLUSION_ANGLES,SURVEY_BOUNDS,sectionAt,angleDelta} from '../prototype/world.mjs';
const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../assets/city-geography.js',import.meta.url),'utf8')+';this.data=CITY_GEOGRAPHY;',sandbox);const world=createWorld(sandbox.data);
assert.ok(walkable(world,world.spawn));assert.equal(world.exits.length,8);
assert.ok(world.buildings.some(b=>b.type==='hyundai'));assert.ok(world.buildings.some(b=>b.type==='uplex'));
// Connected ground navigation is tested at sub-tile precision against polygon collision.
const step=.6,start=world.spawn,queue=[start],seen=new Set(['0,0']),reachable=[];
for(let i=0;i<queue.length;i++){const p=queue[i];reachable.push(p);for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]){const q={x:p.x+dx,z:p.z+dz},key=Math.round((q.x-start.x)/step)+','+Math.round((q.z-start.z)/step);if(!seen.has(key)&&walkable(world,q)){seen.add(key);queue.push(q);}}}
for(const l of world.landmarks)assert.ok(reachable.some(p=>Math.hypot(p.x-l.x,p.z-l.z)<4),l.name+' is reachable from the station');
console.log('PASS surveyed outdoor scene:',world.buildings.length,'buildings,',world.roads.length,'roads;',world.landmarks.length,'landmarks reachable');
for(const yaw of [0,Math.PI/4,Math.PI/2,Math.PI]){const v=cameraVector(1,-1,yaw);assert.ok(Math.abs(Math.hypot(v.x,v.z)-1)<1e-9,'diagonals do not run faster');const right=cameraVector(1,0,yaw),up=cameraVector(0,-1,yaw);assert.ok(Math.abs(right.x*up.x+right.z*up.z)<1e-9);}
const input=new TurnWalkInput();input.press('up',0,-1);assert.equal(input.update(.1,0).walking,false);assert.equal(input.update(.049,0).walking,false);assert.equal(input.update(.001,0).walking,true);const rotated=input.update(.1,Math.PI/2);assert.ok(Math.abs(rotated.vector.x)<1e-9&&Math.abs(rotated.vector.z+1)<1e-9,'held up keeps its initial world heading');assert.ok(rotated.walking,'camera rotation does not restart the turn delay');input.release('up');assert.equal(input.update(.1,1).walking,false);input.press('right',1,0);assert.equal(input.update(.1,1).walking,false);input.clear();assert.equal(input.update(1,1).walking,false);
input.press('touch1',0,-1);input.press('touch2',1,0);const diagonal=input.update(.2,0);assert.ok(diagonal.walking);assert.ok(Math.abs(diagonal.vector.x+diagonal.vector.z)<1e-9);input.release('touch1');assert.equal(input.update(.05,0).walking,false,'changing touch direction gets a fresh turn delay');
console.log('PASS camera-relative input: tap, hold, normalized diagonal, press-time camera heading and multitouch');
const simple={bounds:{minX:-10,maxX:10,minZ:-10,maxZ:10},buildings:[{points:[{x:0,z:-2},{x:3,z:-2},{x:3,z:2},{x:0,z:2}]}]};
const stopped=movePlayer(simple,{x:-3,z:0},{x:1,z:0},10);assert.ok(stopped.x<-.27,'swept collision prevents crossing a whole building');
const slide=movePlayer(simple,{x:-.4,z:-1},{x:Math.SQRT1_2,z:Math.SQRT1_2},2);assert.ok(slide.x<0&&slide.z>-.2,'diagonal movement slides along a wall');
assert.equal(inside({x:1,z:0},simple.buildings[0].points),true);assert.ok(Math.abs(angleDelta(Math.PI-.1,-Math.PI+.1)-.2)<1e-9);
console.log('PASS continuous collision, corner sliding, shortest-angle rotation');

const {RunControl}=await import('../prototype/world.mjs');
const {avatarFrame,AVATAR_SIZE}=await import('../prototype/avatar.mjs');
const sprint=new RunControl();assert.equal(sprint.speed,4.1);
sprint.press('ShiftLeft');sprint.press('ShiftRight');sprint.release('ShiftLeft');assert.ok(sprint.active,'right shift stays active when left is released');
sprint.clearHeld();assert.equal(sprint.active,false,'blur clears held run keys');
sprint.toggle();assert.equal(sprint.speed,7.4);sprint.clearHeld();assert.ok(sprint.active,'mobile toggle survives focus loss');sprint.toggle();assert.equal(sprint.active,false);
const open={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},buildings:[]};
const walkDistance=movePlayer(open,{x:0,z:0},cameraVector(1,-1,0),sprint.speed);sprint.toggle();const runDistance=movePlayer(open,{x:0,z:0},cameraVector(1,-1,0),sprint.speed);
assert.ok(Math.abs(Math.hypot(runDistance.x,runDistance.z)/Math.hypot(walkDistance.x,walkDistance.z)-7.4/4.1)<1e-8);
assert.ok(movePlayer(simple,{x:-3,z:0},{x:1,z:0},sprint.speed).x<-.27,'running also stops at building walls');
for(const gait of ['idle','walk','run'])for(let dir=0;dir<4;dir++)for(let frame=0;frame<4;frame++){
 const pose=avatarFrame(dir,gait,frame);assert.equal(pose.dir,dir);
 assert.ok(pose.x>=0&&pose.y>=0&&pose.x+pose.width<=1375&&pose.y+pose.height<=1144,'atlas crop is inside the source image');
 assert.ok(pose.width*28/215<AVATAR_SIZE.width&&pose.height*28/215<AVATAR_SIZE.height,'pose fits the game canvas');
}
assert.notDeepEqual(avatarFrame(2,'run',0),avatarFrame(2,'walk',0),'running uses separate poses');
assert.notDeepEqual(avatarFrame(0,'walk',0),avatarFrame(0,'walk',2),'walking alternates steps');
assert.deepEqual(avatarFrame(0,'walk',1),avatarFrame(0,'idle',0),'neutral contact frame separates steps');
console.log('PASS run toggle, both Shift keys, focus reset, speed ratio, running collisions and all varsity sprite frames');

// Holding a keyboard/touch direction is a world-straight line even when the
// camera turns. Releasing/re-pressing reads the new visible camera, including
// a release/press pair that happens between animation frames.
for(const id of ['ArrowUp','pointer:1'])for(const [x,z] of [[0,-1],[0,1],[-1,0],[1,0],[1,-1]]){
 const held=new TurnWalkInput(),initialYaw=-.6;held.press(id,x,z);held.update(.15,initialYaw);
 const expected=cameraVector(x,z,initialYaw);
 for(let angle=-Math.PI*2;angle<=Math.PI*2;angle+=.07){
  const control=held.update(1/60,angle);
  assert.deepEqual(control.vector,expected,'camera cannot steer a held direction');
  assert.ok(control.walking);
 }
 held.release(id);held.press(id,x,z);
 const next=held.update(.05,1.2);assert.equal(next.walking,false);assert.deepEqual(next.vector,cameraVector(x,z,1.2),'fresh press follows current screen');
 held.clear();assert.equal(held.update(.3,0).walking,false);
}
console.log('PASS held-direction stability, release/repress at current camera and touch');

// Current fixed-front camera: clear street walking stays straight at all rates.
for(const speed of [4.1,7.4])for(const hz of [30,60,120]){
 const start=toWorld([240,543]),keys=new TurnWalkInput(),camera=new OcclusionCamera();let p={...start};
 keys.press('up',0,-1);
 for(let i=0;i<hz*4;i++){
  const control=keys.update(1/hz,camera.yaw);
  if(control.walking)p=movePlayer(world,p,control.vector,speed/hz);
  camera.update(p,1/hz);
  assert.ok(Math.abs(p.x-start.x)<1e-9,'current camera does not steer held input');
 }
 assert.ok(start.z-p.z>speed*3.8,'clear street stays walkable at walking and running speeds');
}
console.log('PASS current-camera street walk/run at 30/60/120 Hz');

const bridge=world.buildings.find(b=>b.id==='1041227528');
assert.equal(bridge.type,'bridge');assert.ok(Math.abs(bridge.baseHeight-3.64)<1e-9);assert.ok(Math.abs(bridge.height-4.48)<1e-9);
const under=toWorld([203.8,478]),south=toWorld([203.8,487]),north=toWorld([203.8,472]);
assert.ok(inside(under,bridge.points),'regression route actually crosses the elevated footprint');
assert.ok(walkable(world,under),'the ground underneath the 4F bridge is open');
for(const [start,end] of [[south,north],[north,south]]){
 const distance=Math.hypot(end.x-start.x,end.z-start.z),vector={x:(end.x-start.x)/distance,z:(end.z-start.z)/distance};
 const finish=movePlayer(world,start,vector,distance);
 assert.ok(Math.hypot(finish.x-end.x,finish.z-end.z)<1e-8,'walk/run through the entire underpass in both directions');
 assert.ok(reachable.some(p=>Math.hypot(p.x-start.x,p.z-start.z)<.6),'underpass entrance is reachable from station');
}
assert.equal(walkable(world,toWorld([209,488])),false,'adjacent shops still block the player');
assert.equal(walkable(world,toWorld([190,505])),false,'Hyundai main building stays solid');
const overhead={...simple,buildings:[{...simple.buildings[0],baseHeight:2}]};assert.equal(walkable(overhead,{x:1,z:0}),false,'too-low structures are not passable');
overhead.buildings[0].baseHeight=3.64;assert.equal(walkable(overhead,{x:1,z:0}),true);
console.log('PASS surveyed 4F bridge clearance, reachable underpass, two-way traversal and adjacent wall collisions');

// Section 02 follows the saved survey, remains connected across the old edge,
// and keeps both arterial routes open in both directions.
assert.equal(SURVEY_BOUNDS.top,-45);assert.equal(sectionAt(toWorld([241,410])),2);
assert.equal(sectionAt(world.spawn),1);
assert.ok(world.buildings.some(b=>b.name==='창천교회'&&b.type==='church'));
const STREET_ROUTE=world.roads.find(r=>r.id==='383312033').points;
const MYEONGMUL_ROUTE=[[273.24,399.4],[310.88,365.6],[346.28,331.4]].map(toWorld);
const namedRoads=world.roads.filter(r=>r.name==='연세로'||r.name==='명물길');
for(const point of [...STREET_ROUTE,...MYEONGMUL_ROUTE])assert.ok(namedRoads.some(r=>r.points.some(p=>Math.hypot(p.x-point.x,p.z-point.z)<1e-8)),'camera route point must come from survey');
for(const route of [STREET_ROUTE,MYEONGMUL_ROUTE,[toWorld([240.68,431.24]),toWorld([240.64,416.88])]])for(const path of [route,[...route].reverse()]){
 let p={...path[0]};assert.ok(walkable(world,p));
 for(const end of path.slice(1)){const d=Math.hypot(end.x-p.x,end.z-p.z),v={x:(end.x-p.x)/d,z:(end.z-p.z)/d};p=movePlayer(world,p,v,d);assert.ok(Math.hypot(p.x-end.x,p.z-end.z)<1e-7,'surveyed street must be walkable across section boundaries');}
}

console.log('PASS section 02 survey anchors, bidirectional main/branch roads, old-edge connection');

assert.ok(world.sceneryBuildings.length>0,'real blocks continue beyond the playable border');
assert.ok(world.sceneryBuildings.every(b=>!world.buildings.some(p=>p.id===b.id)),'background blocks are not duplicated');
assert.equal(walkable(world,{x:7.5,z:world.bounds.minZ-.5}),false,'visible next-section background is not yet playable');

// Section 03: cross the surveyed diagonal crossing, enter the saved gate POI,
// then follow Baekyang-ro. Test exact paths in both directions, not just BFS.
assert.equal(sectionAt(toWorld([243,257])),3);
assert.equal(sectionAt(toWorld([243,259])),2);
const gatePOI=sandbox.data.pois.find(p=>p.id==='5799952872');
assert.deepEqual(world.landmarks.find(p=>p.id==='yonsei').x,toWorld([gatePOI.x,gatePOI.y]).x);
assert.deepEqual(world.landmarks.find(p=>p.id==='yonsei').z,toWorld([gatePOI.x,gatePOI.y]).z);
const crossing=world.roads.find(r=>r.id==='1182081723');
const campus=world.roads.find(r=>r.id==='123432894');
assert.ok(crossing.crossing);assert.equal(campus.name,'백양로');
const sectionThreeRoute=[...[[243,268],[244.6,259.52],[244.08,235.68],[249.08,234.92]].map(toWorld),...crossing.points.slice(0,-1).reverse(),toWorld([234.76,189.12]),toWorld([243,157])];
for(const path of [sectionThreeRoute,[...sectionThreeRoute].reverse()]){
 let p={...path[0]};
 for(const end of path.slice(1)){const d=Math.hypot(end.x-p.x,end.z-p.z);p=movePlayer(world,p,{x:(end.x-p.x)/d,z:(end.z-p.z)/d},d);assert.ok(Math.hypot(p.x-end.x,p.z-end.z)<1e-7,'crossing and campus route are unobstructed');}
}
assert.ok(world.buildings.some(b=>b.type==='campus'));assert.ok(world.buildings.some(b=>b.type==='hospital'));
console.log('PASS section 03 gate POI, real crosswalk, two-way campus approach');

assert.equal(sectionAt(toWorld([245,144])),4);
assert.equal(sectionAt(toWorld([245,146])),3);
const innerPath=[[243,157],[252.36,120.48],[254.68,110.28],[260.72,87.56],[266.84,62.76],[272,43]].map(toWorld);
for(const path of [innerPath,[...innerPath].reverse()]){
 let p={...path[0]};
 for(const end of path.slice(1)){const d=Math.hypot(end.x-p.x,end.z-p.z);p=movePlayer(world,p,{x:(end.x-p.x)/d,z:(end.z-p.z)/d},d);assert.ok(Math.hypot(p.x-end.x,p.z-end.z)<1e-7,'section 04 main promenade stays open in both directions');}
}
assert.ok(world.buildings.some(b=>b.id==='324328422'&&b.type==='campus'));
assert.ok(world.landmarks.some(p=>p.id==='centennial'));
console.log('PASS section 04 seam, bidirectional surveyed promenade and centennial building');

const {DETAIL_ZONES,detailZoneAtSurvey}=await import('../prototype/building-survey.mjs');
assert.equal(DETAIL_ZONES.length,24);
assert.equal(new Set(DETAIL_ZONES.map(z=>z.id)).size,24);
assert.equal(detailZoneAtSurvey(224,462).id,'01-A');
const uplex=world.buildings.find(b=>b.id==='356392577');
assert.equal(uplex.survey.floors,12);
assert.equal(uplex.survey.basements,7);
assert.ok(Math.abs(uplex.height-60*.42/1.5)<1e-9);
assert.equal(uplex.baseHeight,0);
assert.ok(world.buildings.some(b=>!b.survey),'unknown building heights stay explicitly unverified');
console.log('PASS twenty-four detail zones and sourced U-PLEX twelve-storey height');
const hyundai=world.buildings.find(b=>b.id==='19696463');
assert.equal(hyundai.survey.floors,12);
assert.ok(Math.abs(hyundai.height-57*.42/1.5)<1e-9);
assert.equal(hyundai.baseHeight,0);
assert.deepEqual(hyundai.points,sandbox.data.buildings.find(b=>b.id==='19696463').points.map(toWorld));
console.log('PASS Hyundai main building sourced storeys, height and unchanged footprint');
assert.equal(sectionAt(toWorld([291,-25])),5);
assert.equal(SURVEY_BOUNDS.right,460);
assert.equal(sectionAt(toWorld([349,320])),2);
assert.equal(sectionAt(toWorld([351,320])),6);
assert.equal(detailZoneAtSurvey(445,300).id,'06-D');
const eastPath=[[310.88,365.6],[346.28,331.4],[356.16,323],[375.08,305.8],[387.36,293.88],[397.64,289.52],[402.32,288.76],[445.52,287.68]].map(toWorld);
for(const path of [eastPath,[...eastPath].reverse()]){
 let p={...path[0]};const camera=new OcclusionCamera();
 for(const end of path.slice(1)){const d=Math.hypot(end.x-p.x,end.z-p.z);p=movePlayer(world,p,{x:(end.x-p.x)/d,z:(end.z-p.z)/d},d);assert.ok(Math.hypot(p.x-end.x,p.z-end.z)<1e-7,'surveyed east connection stays open');camera.update(p,.1);assert.equal(camera.yaw,0);}
}
console.log('PASS section 06 surveyed east route, boundary and fixed camera in both directions');
const occ=new OcclusionCamera(),visible=OCCLUSION_ANGLES.map(angle=>({angle,score:0}));
for(let i=0;i<120;i++)occ.update({x:i,z:-i},1/60,visible);assert.equal(occ.yaw,0,'walking and turns alone never rotate camera');
const blocked=OCCLUSION_ANGLES.map(angle=>({angle,score:angle<0?0:1}));
for(let i=0;i<20;i++)occ.update({},1/60,blocked);assert.equal(occ.targetYaw,0,'brief occlusion ignored');
for(let i=0;i<120;i++){const y=occ.yaw;occ.update({},1/60,blocked);assert.ok(Math.abs(occ.yaw-y)<=.55/60+1e-9);}
assert.equal(occ.targetYaw,-Math.PI/9,'smallest clear angle wins');
for(let i=0;i<30;i++)occ.update({},1/60,visible);assert.notEqual(occ.targetYaw,0,'brief clearance does not cause wobble');
for(let i=0;i<300;i++)occ.update({},1/60,visible);assert.ok(Math.abs(occ.yaw)<.001,'returns to front after clearance');
occ.reset();for(let i=0;i<120;i++)occ.update({},1/60,OCCLUSION_ANGLES.map(angle=>({angle,score:1})));assert.equal(occ.yaw,0,'no pointless rotation when all angles blocked');
occ.rotate(.4);for(let i=0;i<120;i++)occ.update({},1/60,blocked);assert.equal(occ.targetYaw,.4,'manual view is respected');occ.toggle();assert.equal(occ.targetYaw,0);
console.log('PASS occlusion-only camera: fixed front, debounce, bounded turn, delayed return, blocked fallback and manual override');

const uplexFront=toWorld([235,450]);
occ.reset();for(let i=0;i<120;i++)occ.update(uplexFront,1/60,visible);
assert.equal(occ.yaw,0,'U-PLEX still stays front-facing without obstruction');
const rightClear=OCCLUSION_ANGLES.map(angle=>({angle,score:angle>0?0:1}));
for(let i=0;i<180;i++)occ.update(uplexFront,1/60,rightClear);
assert.equal(occ.targetYaw,-Math.PI/9,'U-PLEX turns opposite to the former positive angle');
for(let i=0;i<180;i++)occ.update(uplexFront,1/60,rightClear);
assert.equal(occ.targetYaw,-Math.PI/9,'U-PLEX side stays stable while blocked');
for(let i=0;i<300;i++)occ.update(uplexFront,1/60,visible);
assert.ok(Math.abs(occ.yaw)<.001,'U-PLEX returns to front when clear');
occ.reset();for(let i=0;i<180;i++)occ.update(toWorld([275,400]),1/60,rightClear);
assert.equal(occ.targetYaw,Math.PI/9,'other streets retain visibility-based direction');
console.log('PASS U-PLEX opposite turn, stable side, clear-front return and other-street isolation');
const bend=[{id:'bend',name:'Bend',kind:'tertiary',points:[{x:0,z:20},{x:0,z:0},{x:8,z:-16},{x:24,z:-24}]}];
const west=new OcclusionCamera(bend[0].points[0],bend),east=new OcclusionCamera(bend[0].points.at(-1),bend);
for(const cam of [west,east])for(let i=0;i<360;i++)cam.update({x:8,z:-16},1/60,visible);
assert.ok(Math.abs(west.targetYaw)>.3,'road bend rotates camera');
assert.ok(Math.abs(angleDelta(west.yaw,east.yaw))<.001,'same road has same view from opposite entries');
for(let i=0;i<360;i++)west.update({x:0,z:20},1/60,visible);
assert.ok(Math.abs(west.yaw)<.001,'reverse travel returns to same road heading');
const roadView=new OcclusionCamera(uplexFront,world.roads);
for(let i=0;i<180;i++)roadView.update(uplexFront,1/60,rightClear);
assert.equal(roadView.offsetYaw,-Math.PI/9,'U-PLEX reverse correction remains relative to street');
const steady=new TurnWalkInput();steady.press('up',0,-1);const heading=steady.update(.2,roadView.yaw).vector;
for(let i=0;i<120;i++){roadView.update(toWorld([310,365]),1/60,visible);assert.deepEqual(steady.update(1/60,roadView.yaw).vector,heading);}
console.log('PASS restored road camera: bend, opposite entry, reverse travel, U-PLEX offset and held input');
