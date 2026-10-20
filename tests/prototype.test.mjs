import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createWorld,toWorld,inside,walkable,movePlayer,cameraVector,TurnWalkInput,RouteCamera,routeCameraPose,REGION_YAW,angleDelta} from '../prototype/world.mjs';
const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../assets/city-geography.js',import.meta.url),'utf8')+';this.data=CITY_GEOGRAPHY;',sandbox);const world=createWorld(sandbox.data);
assert.ok(walkable(world,world.spawn));assert.equal(world.exits.length,8);
assert.ok(world.buildings.some(b=>b.type==='hyundai'));assert.ok(world.buildings.some(b=>b.type==='uplex'));
// Connected ground navigation is tested at sub-tile precision against polygon collision.
const step=.6,start=world.spawn,queue=[start],seen=new Set(['0,0']),reachable=[];
for(let i=0;i<queue.length;i++){const p=queue[i];reachable.push(p);for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]){const q={x:p.x+dx,z:p.z+dz},key=Math.round((q.x-start.x)/step)+','+Math.round((q.z-start.z)/step);if(!seen.has(key)&&walkable(world,q)){seen.add(key);queue.push(q);}}}
for(const l of world.landmarks)assert.ok(reachable.some(p=>Math.hypot(p.x-l.x,p.z-l.z)<4),l.name+' is reachable from the station');
console.log('PASS surveyed outdoor scene:',world.buildings.length,'buildings,',world.roads.length,'roads; all 3 landmarks reachable');
for(const yaw of [0,Math.PI/4,Math.PI/2,Math.PI]){const v=cameraVector(1,-1,yaw);assert.ok(Math.abs(Math.hypot(v.x,v.z)-1)<1e-9,'diagonals do not run faster');const right=cameraVector(1,0,yaw),up=cameraVector(0,-1,yaw);assert.ok(Math.abs(right.x*up.x+right.z*up.z)<1e-9);}
const input=new TurnWalkInput();input.press('up',0,-1);assert.equal(input.update(.1,0).walking,false);assert.equal(input.update(.049,0).walking,false);assert.equal(input.update(.001,0).walking,true);const rotated=input.update(.1,Math.PI/2);assert.ok(Math.abs(rotated.vector.x+1)<1e-9&&Math.abs(rotated.vector.z)<1e-9,'held up follows the current camera');assert.ok(rotated.walking,'camera rotation does not restart the turn delay');input.release('up');assert.equal(input.update(.1,1).walking,false);input.press('right',1,0);assert.equal(input.update(.1,1).walking,false);input.clear();assert.equal(input.update(1,1).walking,false);
input.press('touch1',0,-1);input.press('touch2',1,0);const diagonal=input.update(.2,0);assert.ok(diagonal.walking);assert.ok(Math.abs(diagonal.vector.x+diagonal.vector.z)<1e-9);input.release('touch1');assert.equal(input.update(.05,0).walking,false,'changing touch direction gets a fresh turn delay');
console.log('PASS camera-relative input: tap, hold, normalized diagonal, live camera heading and multitouch');
const simple={bounds:{minX:-10,maxX:10,minZ:-10,maxZ:10},buildings:[{points:[{x:0,z:-2},{x:3,z:-2},{x:3,z:2},{x:0,z:2}]}]};
const stopped=movePlayer(simple,{x:-3,z:0},{x:1,z:0},10);assert.ok(stopped.x<-.27,'swept collision prevents crossing a whole building');
const slide=movePlayer(simple,{x:-.4,z:-1},{x:Math.SQRT1_2,z:Math.SQRT1_2},2);assert.ok(slide.x<0&&slide.z>-.2,'diagonal movement slides along a wall');
assert.equal(inside({x:1,z:0},simple.buildings[0].points),true);assert.equal(routeCameraPose(toWorld([232,445])).region,'plaza');assert.ok(Math.abs(angleDelta(Math.PI-.1,-Math.PI+.1)-.2)<1e-9);
console.log('PASS continuous collision, corner sliding, region camera and shortest-angle rotation');

// The first section must visibly rotate on approach and restore on the return.
const rig=new RouteCamera(world.spawn),origin={...world.spawn};
assert.ok(Math.abs(rig.yaw-REGION_YAW.station)<1e-9);
let previous=rig.yaw;
for(let z=6;z>=-6;z-=.1){rig.update({x:origin.x,z},1/60);assert.ok(rig.yaw>=previous-1e-9);assert.ok(rig.yaw-previous<.03,'no abrupt boundary snap');previous=rig.yaw;}
for(let i=0;i<120;i++)rig.update({x:origin.x,z:-6},1/60);
assert.ok(Math.abs(rig.yaw)<.001,'northward approach reaches the road view');
for(let z=-6;z<=8;z+=.1)rig.update({x:origin.x,z},1/60);
for(let i=0;i<120;i++)rig.update(origin,1/60);
assert.ok(Math.abs(rig.yaw-REGION_YAW.station)<.001,'return trip restores station view');
for(const z of [6,-5,-24,-32])assert.ok(Math.abs(routeCameraPose({z:z+.00001}).yaw-routeCameraPose({z:z-.00001}).yaw)<.00001,'boundary oscillation must not snap');
rig.rotate(Math.PI/4,origin);assert.equal(rig.enabled,true,'looking around must not silently disable auto');
rig.update(origin,1);assert.ok(rig.preview);assert.match(rig.status,/걸으면/);
rig.update({x:origin.x+.8,z:origin.z},.1);assert.equal(rig.preview,null);assert.equal(rig.targetYaw,REGION_YAW.station);
rig.toggle(origin);rig.rotate(Math.PI/4,origin);const manual=rig.targetYaw;rig.update({x:origin.x,z:-10},1);assert.equal(rig.targetYaw,manual,'explicit manual mode holds its angle');
rig.toggle({x:origin.x,z:-10});rig.update({x:origin.x,z:-10},1);assert.equal(rig.targetYaw,0,'auto restoration works without a new region boundary crossing');
rig.reset(origin);assert.equal(rig.enabled,true);assert.equal(rig.preview,null);assert.equal(rig.yaw,REGION_YAW.station);
console.log('PASS automatic camera: forward/return, continuous boundaries, temporary manual look, explicit manual mode, auto restoration and reset');

const {RunControl}=await import('../prototype/world.mjs');
const {avatarPixels,AVATAR_PALETTE}=await import('../prototype/avatar.mjs');
const sprint=new RunControl();assert.equal(sprint.speed,4.1);
sprint.press('ShiftLeft');sprint.press('ShiftRight');sprint.release('ShiftLeft');assert.ok(sprint.active,'right shift stays active when left is released');
sprint.clearHeld();assert.equal(sprint.active,false,'blur clears held run keys');
sprint.toggle();assert.equal(sprint.speed,7.4);sprint.clearHeld();assert.ok(sprint.active,'mobile toggle survives focus loss');sprint.toggle();assert.equal(sprint.active,false);
const open={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},buildings:[]};
const walkDistance=movePlayer(open,{x:0,z:0},cameraVector(1,-1,0),sprint.speed);sprint.toggle();const runDistance=movePlayer(open,{x:0,z:0},cameraVector(1,-1,0),sprint.speed);
assert.ok(Math.abs(Math.hypot(runDistance.x,runDistance.z)/Math.hypot(walkDistance.x,walkDistance.z)-7.4/4.1)<1e-8);
assert.ok(movePlayer(simple,{x:-3,z:0},{x:1,z:0},sprint.speed).x<-.27,'running also stops at building walls');
for(const gait of ['idle','walk','run'])for(let dir=0;dir<4;dir++)for(let frame=0;frame<4;frame++){
 const rows=avatarPixels(dir,gait,frame);assert.equal(rows.length,32);assert.ok(rows.every(row=>row.length===24));
 for(const row of rows)for(const c of row)assert.ok(c==='.'||AVATAR_PALETTE[c],`unknown avatar color ${c}`);

}
assert.notDeepEqual(avatarPixels(2,'run',0),avatarPixels(2,'walk',0),'run has its own stride');
assert.notDeepEqual(avatarPixels(0,'walk',0),avatarPixels(0,'walk',2),'walking alternates the feet');
console.log('PASS run toggle, both Shift keys, focus reset, speed ratio, running collisions and all varsity sprite frames');

// A held key or finger always projects back onto the requested SCREEN direction,
// throughout automatic camera blends and repeated manual rotations.
for(const id of ['ArrowUp','pointer:1'])for(const [x,z] of [[0,-1],[0,1],[-1,0],[1,0],[1,-1]]){
 const held=new TurnWalkInput();held.press(id,x,z);held.update(.15,0);
 for(let angle=-Math.PI*2;angle<=Math.PI*2;angle+=.07){
  const control=held.update(1/60,angle),v=control.vector,l=Math.hypot(x,z);
  const screenX=v.x*Math.cos(angle)-v.z*Math.sin(angle),screenZ=v.x*Math.sin(angle)+v.z*Math.cos(angle);
  assert.ok(Math.abs(screenX-x/l)<1e-9&&Math.abs(screenZ-z/l)<1e-9,'input follows current screen axes');
  assert.ok(control.walking,'rotation never interrupts walking or running');
 }
 held.release(id);assert.equal(held.update(1/60,1).walking,false);
 held.press(id,x,z);assert.equal(held.update(.05,2).walking,false,'a fresh press still only turns');
}
console.log('PASS held keyboard/touch follows camera through full rotations without speed changes or turn-delay resets');

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
