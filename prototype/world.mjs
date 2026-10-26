import {BUILDING_SURVEY} from './building-survey.mjs?v=4';
// Continuous world coordinates: the surveyed street geometry is compressed
// uniformly for a walkable diorama, never rasterized into stair-step tiles.
export const SCALE=.42;
export const PLAYER_HEIGHT=2.8;
export const SURVEY_BOUNDS={left:115,right:460,top:-45,bottom:616};
const ORIGINAL_BOUNDS={left:145,right:300,top:422,bottom:616};
export const toWorld=([x,z])=>({x:(x-225)*SCALE,z:(z-525)*SCALE});
export function inside(p,points){let c=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)c=!c;}return c;}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz;const t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l)):0;return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
function intersects(points,b=SURVEY_BOUNDS){return Math.max(...points.map(p=>p[0]))>=b.left&&Math.min(...points.map(p=>p[0]))<=b.right&&Math.max(...points.map(p=>p[1]))>=b.top&&Math.min(...points.map(p=>p[1]))<=b.bottom;}
export function sectionAt(p){return p.x>toWorld([350,0]).x?6:p.z<toWorld([0,25]).z?5:p.z<toWorld([0,145]).z?4:p.z<toWorld([0,258]).z?3:p.z<toWorld([0,422]).z?2:1;}
const widths={primary:8.4,secondary:6.6,tertiary:4.6,residential:2.7,living_street:2.7,unclassified:2.5,service:1.8,pedestrian:3.4,footway:1.5,path:1.5,steps:1.4};
export function createWorld(source){
 const bounds={minX:(SURVEY_BOUNDS.left-225)*SCALE,maxX:(SURVEY_BOUNDS.right-225)*SCALE,minZ:(SURVEY_BOUNDS.top-525)*SCALE,maxZ:(SURVEY_BOUNDS.bottom-525)*SCALE};
 const makeRoad=r=>({...r,points:r.points.map(toWorld),width:(widths[r.kind]||2.5)*SCALE,pedestrian:['footway','path','steps','pedestrian'].includes(r.kind)});
 const roads=source.roads.filter(r=>intersects(r.points)).map(makeRoad);
 const oldStyles=new Map(source.buildings.filter(b=>intersects(b.points,ORIGINAL_BOUNDS)).map((b,i)=>[b.id,i]));
 const makeBuilding=b=>{
  const index=oldStyles.get(b.id)??Number(b.id)%97;
  const points=b.points.map(toWorld);const type=b.buildingType==='bridge'?'bridge':b.branch==='신촌점'?'hyundai':b.branch==='U Plex'?'uplex':b.name==='창천교회'?'church':(b.name==='공학원 (102)'||/공학관|백주년기념관|스포츠과학관/.test(b.name))?'campus':b.name==='연세암병원'?'hospital':'shop';
  const center={x:points.reduce((a,p)=>a+p.x,0)/points.length,z:points.reduce((a,p)=>a+p.z,0)/points.length};
  const metresToWorld=SCALE/(source.metresPerTile||1.5),baseHeight=Math.max(0,(b.minHeight||0)*metresToWorld);
  const survey=BUILDING_SURVEY[b.id];
  const height=survey?survey.heightMetres*metresToWorld:baseHeight>0?Math.max(baseHeight+.2,(b.height||b.minHeight+3)*metresToWorld):type==='hyundai'?7:type==='uplex'?8.2:type==='church'?6.8:type==='campus'?7.5:type==='hospital'?10:3+(index%4)*.7;
  return {id:b.id,name:b.name,points,type,center,baseHeight,height,survey,index,newSection:!oldStyles.has(b.id)};
 };
 const buildings=source.buildings.filter(b=>intersects(b.points)).map(makeBuilding);
 // Keep real surrounding blocks visible beyond the playable edge, so the next
 // section does not look like roads floating in an empty field.
 const backdropBounds={left:SURVEY_BOUNDS.left-60,right:SURVEY_BOUNDS.right+60,top:SURVEY_BOUNDS.top-60,bottom:SURVEY_BOUNDS.bottom+60};
 const sceneryBuildings=source.buildings.filter(b=>!intersects(b.points)&&intersects(b.points,backdropBounds)).map(b=>({...makeBuilding(b),scenery:true}));
 const sceneryRoads=source.roads.filter(r=>!intersects(r.points)&&intersects(r.points,backdropBounds)).map(makeRoad);
 const parks=source.parks.filter(p=>intersects(p.points)).map(p=>({...p,points:p.points.map(toWorld)}));
 const exits=source.exits.map(e=>({...e,...toWorld([e.x,e.y])}));
 const landmarks=[
  {id:'station',name:'신촌역',...toWorld([231,547]),text:'2호선 신촌역 2번 출구. 연세로를 따라 북쪽으로 걸으면 U-PLEX와 빨간 잠망경이 나와요.'},
  {id:'hyundai',name:'현대백화점',...toWorld([201,533]),text:'현대백화점 신촌점 본관. U-PLEX는 본관의 북동쪽에 있고, 지하 연결통로로도 이어져요.'},
  {id:'uplex',name:'빨간 잠망경',...toWorld([232,445]),text:'U-PLEX 북쪽 광장의 약속 장소. 북쪽 연세로사거리에서 직진하면 연세로, 오른쪽 대각선 길로 가면 명물길이에요.'},
  {id:'crossroad',name:'연세로사거리',...toWorld([241,424]),text:'연세로와 명물길이 갈라지는 곳이에요. 북쪽으로 연세로 상가와 창천교회, 동북쪽으로 명물길이 이어져요.'},
  {id:'myeongmul',name:'명물길',...toWorld([310.88,365.6]),text:'연세로에서 동북쪽으로 뻗는 명물길이에요. 연결 골목으로 연세로에 다시 돌아갈 수 있어요. 동쪽 06 구간을 따라 신촌역로까지 이어져요.'},
  {id:'church',name:'창천교회 앞',...toWorld([267,282]),text:'창천교회는 연세로 38에 있어요. 연세로 북쪽과 명물길 사이 상가 구간을 걸어 여기까지 왔네요. 건물 안은 아직 들어갈 수 없어요.'},
  {id:'north',name:'연세로 북쪽',...toWorld([243,268]),text:'03 구간으로 이어지는 길이에요. 성산로 횡단보도를 건너면 연세대 정문과 백양로 초입에 닿아요.'},
  {id:'crossing',name:'성산로 횡단보도',...toWorld([249.08,234.92]),text:'연세로 북쪽 끝의 성산로예요. 표시된 횡단보도를 따라 북쪽 정문 광장으로 건너갈 수 있어요.'},
  {id:'yonsei',name:'연세대 정문',...toWorld([235,189]),text:'연세대학교 신촌캠퍼스 정문에 도착했어요. 신촌역에서 연세로와 성산로를 지나 이어지는 길이에요. 안쪽의 백양로 초입까지 걸어볼 수 있어요.'},
  {id:'baekyang',name:'백양로 초입',...toWorld([243,157]),text:'백양로의 첫 구간이에요. 왼쪽에는 공학원, 오른쪽에는 의료원 방향 길이 있어요. 북쪽으로 더 걸으면 공학관 앞과 백주년기념관 방향으로 이어져요.'}
  ,{id:'engineering',name:'공학관 앞',...toWorld([245,113]),text:'백양로 서쪽의 공학관 구간이에요. 실제 건물 외곽과 연결 보행로를 따라 돌아볼 수 있어요. 강의동 내부는 아직 열리지 않았어요.'}
  ,{id:'centennial',name:'백주년기념관 앞',...toWorld([281,86]),text:'백양로 동쪽의 백주년기념관 앞이에요. 정문 쪽으로 돌아가려면 백양로를 따라 남쪽으로 내려가면 돼요.'}
  ,{id:'baekyang-north',name:'백양로 산책길',...toWorld([272,43]),text:'04 구간의 북쪽 산책 지점이에요. 이번에는 공학관과 백주년기념관 구간까지 열었어요. 이제 더 북쪽의 05 산책 구간으로 이어져요. 지하는 아직 열리지 않았어요.'},  {id:'campus-north',name:'백양로 북쪽 산책길',...toWorld([291,-25]),text:'05 구간의 백양로예요. 저장된 지도 보행로를 따라 확장했어요. 건물 내부와 백양누리 지하는 아직 열리지 않았어요.'},
  {id:'sports',name:'스포츠과학관 주변',...toWorld([169,20]),text:'스포츠과학관 주변의 지상 산책 구간이에요. 건물 외관과 층수는 아직 상세화 전이에요.'},
  {id:'myeongmul-east',name:'명물길 동쪽 갈림길',...toWorld([387.36,293.88]),text:'명물길이 동쪽으로 꺾이는 06 구간이에요. 기존 연세로 방향으로도 다시 걸어갈 수 있어요.'},
  {id:'sinchon-station-road',name:'신촌역로 연결부',...toWorld([445.52,287.68]),text:'명물길과 신촌역로가 이어지는 지점이에요. 이번 동쪽 산책 구간의 끝이에요.'},
  {id:'sinchon-road-east',name:'신촌로 동쪽',...toWorld([450.72,506.96]),text:'신촌로 동쪽 구간이에요. 서쪽으로 돌아가면 신촌오거리와 현대백화점 방향이에요. 주변 건물의 외관과 층수는 순차 확인 중이에요.'}

 ];
 const world={bounds,roads,buildings,sceneryBuildings,sceneryRoads,parks,exits,landmarks};
 world.spawn=findFree(world,toWorld([235,543]));
 return world;
}
export function walkable(world,p,r=.28){
 const b=world.bounds;if(p.x<b.minX+r||p.x>b.maxX-r||p.z<b.minZ+r||p.z>b.maxZ-r)return false;
 if((world.obstacles||[]).some(o=>Math.hypot(p.x-o.x,p.z-o.z)<r+o.r))return false;
 return !world.buildings.some(b=>(b.baseHeight||0)<PLAYER_HEIGHT+.1&&(inside(p,b.points)||b.points.some((a,i)=>segmentDistance(p,a,b.points[(i+1)%b.points.length])<r)));
}
export function findFree(world,p){if(walkable(world,p))return {...p};for(let r=.5;r<10;r+=.5)for(let a=0;a<Math.PI*2;a+=Math.PI/12){const q={x:p.x+Math.cos(a)*r,z:p.z+Math.sin(a)*r};if(walkable(world,q))return q;}throw Error('No accessible starting point');}
export function cameraVector(x,z,yaw){const l=Math.hypot(x,z);if(!l)return {x:0,z:0};return {x:(x*Math.cos(yaw)+z*Math.sin(yaw))/l,z:(-x*Math.sin(yaw)+z*Math.cos(yaw))/l};}
export function movePlayer(world,p,vector,distance){
 // Small swept steps prevent tunneling at corners and low frame rates.
 const n=Math.max(1,Math.ceil(distance/.12)),dx=vector.x*distance/n,dz=vector.z*distance/n;let q={...p};
 for(let i=0;i<n;i++){const full={x:q.x+dx,z:q.z+dz};if(walkable(world,full)){q=full;continue;}if(walkable(world,{x:q.x+dx,z:q.z}))q.x+=dx;if(walkable(world,{x:q.x,z:q.z+dz}))q.z+=dz;}
 return q;
}
export class TurnWalkInput{
 constructor(){this.held=new Map();this.age=0;this.signature='';this.heading=null;}
 press(id,x,z){this.held.set(id,{x,z});}
 release(id){this.held.delete(id);if(!this.held.size)this.clear();}
 clear(){this.held.clear();this.age=0;this.signature='';this.heading=null;}
 update(dt,yaw){let x=0,z=0;for(const v of this.held.values()){x+=v.x;z+=v.z;}x=Math.sign(x);z=Math.sign(z);const signature=x+','+z;
  if(signature!==this.signature){this.age=0;this.signature=signature;this.heading=yaw;}
  // A new direction uses the visible camera. Holding it keeps a straight world
  // heading: an automatic camera blend must never steer the player's feet.
  const vector=cameraVector(x,z,this.heading??yaw),moving=(x!==0||z!==0);this.age+=dt;
  return {vector,facing:moving,walking:moving&&this.age>=.15};
 }
}
export function angleDelta(a,b){return Math.atan2(Math.sin(b-a),Math.cos(b-a));}
// Surveyed Yonsei-ro centreline (OSM way 383312033), south to north.
// Keep the road upright instead of introducing a decorative 35° steering arc.
export const STREET_ROUTE=[[237.28,551.68],[239.88,468.64],[240.68,431.24],[240.64,416.88],[240.12,395.08],[239.96,391.4],[240.4,332.44],[240.52,306.12],[240.88,298.96],[242.4,295.32],[242.8,291.88],[243,272.28]].map(toWorld);
export const MYEONGMUL_ROUTE=[[273.24,399.4],[310.88,365.6],[346.28,331.4]].map(toWorld);
const roadYaw=(a,b)=>Math.atan2(a.x-b.x,a.z-b.z);
export const REGION_YAW={station:roadYaw(STREET_ROUTE[0],STREET_ROUTE[1]),yonsei:roadYaw(STREET_ROUTE[0],STREET_ROUTE[1])};
// Camera paths use the same surveyed polylines that draw the streets. Join
// survey-way boundaries only when their tangents continue the same road.
export function cameraRoads(roads){
 const eligible=roads.filter(r=>r.points.length>1&&!r.area&&!r.crossing&&r.name&&!['steps','path','footway'].includes(r.kind));
 return eligible.map(r=>{
  let points=[...r.points];
  for(const end of [0,1]){
   const tip=end?points.at(-1):points[0],inner=end?points.at(-2):points[1];
   const dx=tip.x-inner.x,dz=tip.z-inner.z,l=Math.hypot(dx,dz);let best=null,score=.85;
   for(const other of eligible){if(other===r||other.name!==r.name)continue;
    for(const chain of [other.points,[...other.points].reverse()]){
     if(Math.hypot(chain[0].x-tip.x,chain[0].z-tip.z)>.05)continue;
     const vx=chain[1].x-tip.x,vz=chain[1].z-tip.z,d=(dx*vx+dz*vz)/(l*Math.hypot(vx,vz));
     if(d>score){score=d;best=chain.slice(1);}
    }
   }
   if(best)points=end?[...points,...best]:[...best].reverse().concat(points);
  }
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));
  return {...r,points,lengths};
 });
}
function pathPoint(road,d){
 d=Math.max(0,Math.min(road.lengths.at(-1),d));
 for(let i=1;i<road.points.length;i++)if(d<=road.lengths[i]){
  const a=road.points[i-1],b=road.points[i],t=(d-road.lengths[i-1])/(road.lengths[i]-road.lengths[i-1]||1);
  return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
 }
 return road.points.at(-1);
}
function projectRoad(p,road){
 let distance=Infinity,along=0,segment=0;
 for(let i=1;i<road.points.length;i++){
  const a=road.points[i-1],b=road.points[i],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);if(!l)continue;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(l*l))),d=Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
  if(d<distance){segment=i-1;distance=d;along=road.lengths[i-1]+t*l;}
 }
 // A short arc-length window rounds survey vertices without replacing an
 // entire curved street with its end-to-end bearing.
 const a=pathPoint(road,along-4),b=pathPoint(road,along+4);
 const raw=roadYaw(a,b),base=road.bearings?.[segment];
 return {road,distance,point:pathPoint(road,along),yaw:base===undefined?raw:equivalentYaw(raw,base)};
}
function equivalentYaw(yaw,reference){
 const delta=angleDelta(reference,yaw);return reference+(Math.abs(delta)>Math.PI/2?angleDelta(reference,yaw+Math.PI):delta);
}
const fallbackRoads=cameraRoads([{id:'yonsei',name:'연세로',points:STREET_ROUTE},{id:'myeongmul',name:'명물길',points:MYEONGMUL_ROUTE}]);
export function routeCameraPose(p,roads=fallbackRoads,reference=0){
 const closest=roads.map(r=>projectRoad(p,r)).sort((a,b)=>a.distance-b.distance)[0];
 return roadPose(closest,reference);
}
function roadPose(hit,reference){
 if(!hit)return {region:'street',label:'거리',yaw:reference};
 return {region:hit.road.name==='명물길'?'myeongmul':'street',label:hit.road.name,roadId:hit.road.id,yaw:hit.road.bearings?hit.yaw:equivalentYaw(hit.yaw,reference)};
}
export class RouteCamera{
 constructor(position,roads){this.roads=roads?cameraRoads(roads):fallbackRoads;this.reset(position);}
 reset(position){this.pose=routeCameraPose(position,this.roads);this.selected=this.pose.roadId;this.yaw=this.targetYaw=this.pose.yaw;this.enabled=true;this.preview=null;this.sample={...position};this.motion=null;}
 rotate(delta,position){this.targetYaw+=delta;if(this.enabled)this.preview={...position};}
 toggle(position){this.enabled=!this.enabled;this.preview=null;if(this.enabled)this.targetYaw=this.pose.yaw;}
 update(position,dt){
  const dx=position.x-this.sample.x,dz=position.z-this.sample.z,d=Math.hypot(dx,dz);
  if(d>=.3){
   this.motion={x:dx/d,z:dz/d};this.sample={...position};
   const hits=this.roads.map(r=>projectRoad(position,r));
   for(const h of hits){
    const alignment=Math.abs(Math.sin(h.yaw)*this.motion.x+Math.cos(h.yaw)*this.motion.z);
    h.score=h.distance+3*(1-alignment)-(h.road.id===this.selected ? .8 : 0);
   }
   hits.sort((a,b)=>a.score-b.score);
   const current=hits.find(h=>h.road.id===this.selected),best=hits[0];
   // Retain the current street in open squares and while standing still.
   // Nearby parallel roads and crosswalks must not attract the camera.
   if(best&&best.distance<Math.max(3,(best.road.width||1)/2+2)&&(!current||(best.score+.35<current.score&&best.distance+.6<current.distance)))this.selected=best.road.id;
  }
  const road=this.roads.find(r=>r.id===this.selected);
  if(road)this.pose=roadPose(projectRoad(position,road),this.pose.yaw);
  if(this.preview&&Math.hypot(position.x-this.preview.x,position.z-this.preview.z)>=.7)this.preview=null;
  if(this.enabled&&!this.preview)this.targetYaw=this.pose.yaw;
  // Bounded angular speed prevents a sharp junction from whipping the view.
  const delta=angleDelta(this.yaw,this.targetYaw),step=delta*(1-Math.exp(-3*Math.max(0,dt))),limit=.75*Math.max(0,dt);
  this.yaw+=Math.max(-limit,Math.min(limit,step));
 }
 get turning(){return Math.abs(angleDelta(this.yaw,this.targetYaw))>Math.PI/180;}
 get status(){if(!this.enabled)return '수동 시점 · 자동 버튼으로 복귀';if(this.preview)return '둘러보는 중 · 걸으면 자동 복귀';return '자동 · '+this.pose.label+' 길 따라가기'+(this.turning?' · 회전 중':'');}
}

export class RunControl{
 constructor(){this.toggled=false;this.held=new Set();}
 press(code){this.held.add(code);}
 release(code){this.held.delete(code);}
 clearHeld(){this.held.clear();}
 toggle(){this.toggled=!this.toggled;}
 get active(){return this.toggled||this.held.size>0;}
 get speed(){return this.active?7.4:4.1;}
}

// Gameplay default: travel direction never chooses a camera heading.
export class StableCamera{
 constructor(){this.reset();}
 reset(){this.yaw=this.targetYaw=0;this.enabled=true;this.preview=null;this.pose={region:'street',label:'북쪽 기준',yaw:0};}
 rotate(delta){this.enabled=false;this.targetYaw+=delta;}
 toggle(){this.enabled=!this.enabled;if(this.enabled)this.targetYaw=0;}
 update(position,dt){const delta=angleDelta(this.yaw,this.targetYaw),limit=1.5*Math.max(0,dt);this.yaw+=Math.max(-limit,Math.min(limit,delta));}
 get turning(){return Math.abs(angleDelta(this.yaw,this.targetYaw))>.001;}
 get status(){return this.enabled?'북쪽 고정 · 왕복해도 같은 방향':'수동 고정 · C로 북쪽 복귀';}
}

// Each named street has a deterministic orientation, independent of entry history.
// Unwrap its local tangents once, so crossing east/west cannot flip the view.
export class RoadAlignedCamera extends RouteCamera{
 constructor(position,roads){
  super(position,roads);
  const anchors=new Map();
  for(const road of this.roads){const old=anchors.get(road.name);if(!old||road.lengths.at(-1)>old.lengths.at(-1))anchors.set(road.name,road);}
  for(const road of this.roads){
   const anchor=anchors.get(road.name),reference=equivalentYaw(roadYaw(anchor.points[0],anchor.points.at(-1)),0);
   road.bearings=[];let previous=reference;
   for(let i=1;i<road.points.length;i++){previous=equivalentYaw(roadYaw(road.points[i-1],road.points[i]),previous);road.bearings.push(previous);}
  }
  this.reset(position);
 }
 reset(position){super.reset(position);this.guide=null;}
 guideMotion(position,vector,signature,dt){
  // Only longitudinal input follows the road. Lateral/diagonal input always
  // leaves the guide immediately, so branches and free exploration stay explicit.
  if(!this.enabled||!['0,-1','0,1'].includes(signature)){this.guide=null;return vector;}
  const road=this.roads.find(r=>r.id===this.selected);if(!road)return vector;
  const hit=projectRoad(position,road),t={x:-Math.sin(hit.yaw),z:-Math.cos(hit.yaw)};
  const dot=vector.x*t.x+vector.z*t.z;
  if(hit.distance>Math.max(2.4,(road.width||1)/2+1)){this.guide=null;return vector;}
  if(!this.guide||this.guide.signature!==signature){
   if(Math.abs(dot)<.85){this.guide=null;return vector;}
   this.guide={signature,sign:dot<0?-1:1,x:vector.x,z:vector.z};
  }
  const g=this.guide,forward={x:t.x*g.sign,z:t.z*g.sign};
  if(forward.x*g.x+forward.z*g.z<.5){this.guide=null;return vector;}
  // Ease toward the surveyed centreline to avoid clipping the U-PLEX corner;
  // never snap the character or alter building collisions.
  const nx=-forward.z,nz=forward.x,error=(hit.point.x-position.x)*nx+(hit.point.z-position.z)*nz;
  const correction=Math.max(-.35,Math.min(.35,error*.35));
  const target=Math.atan2(forward.x+nx*correction,forward.z+nz*correction),current=Math.atan2(g.x,g.z);
  const turn=Math.max(-1.5*dt,Math.min(1.5*dt,angleDelta(current,target))),angle=current+turn;
  g.x=Math.sin(angle);g.z=Math.cos(angle);return {x:g.x,z:g.z};
 }
 rotate(delta){this.enabled=false;this.preview=null;this.guide=null;this.targetYaw+=delta;}
 get status(){return this.enabled?'길 따라 회전 · '+this.pose.label+(this.turning?' · 부드럽게 전환 중':''):'수동 시점 · C로 길 따라 회전';}
}

export const OCCLUSION_ANGLES=[0,-Math.PI/9,Math.PI/9,-Math.PI*7/36,Math.PI*7/36];
// U-PLEX east frontage and north plaza: use the opposite side of the building.
export function uplexFrontCameraZone(position){
 const x=position.x/SCALE+225,z=position.z/SCALE+525;
 return x>=215&&x<=255&&z>=430&&z<=485;
}
export class OcclusionCamera extends StableCamera{
 reset(){super.reset();this.blockedFor=0;this.clearFor=0;this.holdFor=0;}
 update(position,dt,scores=[]){
  dt=Math.max(0,Math.min(dt,.1));this.holdFor=Math.max(0,this.holdFor-dt);
  if(this.enabled&&scores.length){
   const front=scores.find(s=>s.angle===0)?.score??0;
   this.blockedFor=front>0?this.blockedFor+dt:0;
   this.clearFor=front===0?this.clearFor+dt:0;
   if(this.clearFor>=1){this.targetYaw=0;this.holdFor=0;}
   else if(this.blockedFor>=.45&&this.holdFor===0){
    const current=scores.find(s=>Math.abs(s.angle-this.targetYaw)<.001)?.score??front;
    const best=[...scores].sort((a,b)=>a.score-b.score||Math.abs(a.angle)-Math.abs(b.angle))[0];
    if(uplexFrontCameraZone(position)){
     // Keep the requested side stable; the existing fade handles residual cover.
     this.targetYaw=-Math.PI/9;this.holdFor=1.2;
    }else if(best.score+.15<current){this.targetYaw=best.angle;this.holdFor=1.2;}
   }
  }
  const delta=angleDelta(this.yaw,this.targetYaw),step=delta*(1-Math.exp(-3*dt));this.yaw+=Math.max(-.55*dt,Math.min(.55*dt,step));
 }
 rotate(delta){super.rotate(delta);this.blockedFor=this.clearFor=0;}
 toggle(){super.toggle();this.blockedFor=this.clearFor=this.holdFor=0;}
 get status(){return !this.enabled?'수동 시점 · C로 가림 보정 복귀':Math.abs(this.targetYaw)>.01?'건물 가림 보정 · 잠시 옆으로 보기':Math.abs(this.yaw)>.02?'정면으로 복귀 중':'정면 고정 · 건물이 가릴 때만 회전';}
}
