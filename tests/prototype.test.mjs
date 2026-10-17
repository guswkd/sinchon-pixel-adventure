import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createWorld,toWorld,inside,walkable,movePlayer,cameraVector,TurnWalkInput,cameraRegion,angleDelta} from '../prototype/world.mjs';
const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../assets/city-geography.js',import.meta.url),'utf8')+';this.data=CITY_GEOGRAPHY;',sandbox);const world=createWorld(sandbox.data);
assert.ok(walkable(world,world.spawn));assert.equal(world.exits.length,8);
assert.ok(world.buildings.some(b=>b.type==='hyundai'));assert.ok(world.buildings.some(b=>b.type==='uplex'));
// Connected ground navigation is tested at sub-tile precision against polygon collision.
const step=.6,start=world.spawn,queue=[start],seen=new Set(['0,0']),reachable=[];
for(let i=0;i<queue.length;i++){const p=queue[i];reachable.push(p);for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]]){const q={x:p.x+dx,z:p.z+dz},key=Math.round((q.x-start.x)/step)+','+Math.round((q.z-start.z)/step);if(!seen.has(key)&&walkable(world,q)){seen.add(key);queue.push(q);}}}
for(const l of world.landmarks)assert.ok(reachable.some(p=>Math.hypot(p.x-l.x,p.z-l.z)<4),l.name+' is reachable from the station');
console.log('PASS surveyed outdoor scene:',world.buildings.length,'buildings,',world.roads.length,'roads; all 3 landmarks reachable');
for(const yaw of [0,Math.PI/4,Math.PI/2,Math.PI]){const v=cameraVector(1,-1,yaw);assert.ok(Math.abs(Math.hypot(v.x,v.z)-1)<1e-9,'diagonals do not run faster');const right=cameraVector(1,0,yaw),up=cameraVector(0,-1,yaw);assert.ok(Math.abs(right.x*up.x+right.z*up.z)<1e-9);}
const input=new TurnWalkInput();input.press('up',0,-1);assert.equal(input.update(.1,0).walking,false);assert.equal(input.update(.049,0).walking,false);assert.equal(input.update(.001,0).walking,true);const locked=input.update(.1,Math.PI/2);assert.deepEqual(locked.vector,{x:0,z:-1},'camera rotation must not steer a held key');input.release('up');assert.equal(input.update(.1,1).walking,false);input.press('right',1,0);assert.equal(input.update(.1,1).walking,false);input.clear();assert.equal(input.update(1,1).walking,false);
input.press('touch1',0,-1);input.press('touch2',1,0);const diagonal=input.update(.2,0);assert.ok(diagonal.walking);assert.ok(Math.abs(diagonal.vector.x+diagonal.vector.z)<1e-9);input.release('touch1');assert.equal(input.update(.05,0).walking,false,'changing touch direction gets a fresh turn delay');
console.log('PASS camera-relative input: tap, hold, normalized diagonal, held-heading lock and multitouch');
const simple={bounds:{minX:-10,maxX:10,minZ:-10,maxZ:10},buildings:[{points:[{x:0,z:-2},{x:3,z:-2},{x:3,z:2},{x:0,z:2}]}]};
const stopped=movePlayer(simple,{x:-3,z:0},{x:1,z:0},10);assert.ok(stopped.x<-.27,'swept collision prevents crossing a whole building');
const slide=movePlayer(simple,{x:-.4,z:-1},{x:Math.SQRT1_2,z:Math.SQRT1_2},2);assert.ok(slide.x<0&&slide.z>-.2,'diagonal movement slides along a wall');
assert.equal(inside({x:1,z:0},simple.buildings[0].points),true);assert.equal(cameraRegion(toWorld([232,445])),'plaza');assert.ok(Math.abs(angleDelta(Math.PI-.1,-Math.PI+.1)-.2)<1e-9);
console.log('PASS continuous collision, corner sliding, region camera and shortest-angle rotation');
