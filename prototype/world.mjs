// Continuous world coordinates: the surveyed street geometry is compressed
// uniformly for a walkable diorama, never rasterized into stair-step tiles.
export const SCALE=.42;
export const PLAYER_HEIGHT=2.8;
export const SURVEY_BOUNDS={left:145,right:300,top:422,bottom:616};
export const toWorld=([x,z])=>({x:(x-225)*SCALE,z:(z-525)*SCALE});
export function inside(p,points){let c=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)c=!c;}return c;}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz;const t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/l)):0;return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);}
function intersects(points){return Math.max(...points.map(p=>p[0]))>=145&&Math.min(...points.map(p=>p[0]))<=300&&Math.max(...points.map(p=>p[1]))>=422&&Math.min(...points.map(p=>p[1]))<=616;}
const widths={primary:8.4,secondary:6.6,tertiary:4.6,residential:2.7,living_street:2.7,unclassified:2.5,service:1.8,pedestrian:3.4,footway:1.5,path:1.5,steps:1.4};
export function createWorld(source){
 const bounds={minX:(145-225)*SCALE,maxX:(300-225)*SCALE,minZ:(422-525)*SCALE,maxZ:(616-525)*SCALE};
 const roads=source.roads.filter(r=>intersects(r.points)).map(r=>({...r,points:r.points.map(toWorld),width:(widths[r.kind]||2.5)*SCALE,pedestrian:['footway','path','steps','pedestrian'].includes(r.kind)}));
 const buildings=source.buildings.filter(b=>intersects(b.points)).map((b,i)=>{
  const points=b.points.map(toWorld);const type=b.buildingType==='bridge'?'bridge':b.branch==='신촌점'?'hyundai':b.branch==='U Plex'?'uplex':'shop';
  const center={x:points.reduce((a,p)=>a+p.x,0)/points.length,z:points.reduce((a,p)=>a+p.z,0)/points.length};
  const metresToWorld=SCALE/(source.metresPerTile||1.5),baseHeight=Math.max(0,(b.minHeight||0)*metresToWorld);
  const height=baseHeight>0?Math.max(baseHeight+.2,(b.height||b.minHeight+3)*metresToWorld):type==='hyundai'?7:type==='uplex'?8.2:3+(i%4)*.7;
  return {id:b.id,points,type,center,baseHeight,height,index:i};
 });
 const parks=source.parks.filter(p=>intersects(p.points)).map(p=>({...p,points:p.points.map(toWorld)}));
 const exits=source.exits.map(e=>({...e,...toWorld([e.x,e.y])}));
 const landmarks=[
  {id:'station',name:'신촌역',...toWorld([231,547]),text:'2호선 신촌역 2번 출구. 연세로를 따라 북쪽으로 걸으면 U-PLEX와 빨간 잠망경이 나와요.'},
  {id:'hyundai',name:'현대백화점',...toWorld([201,533]),text:'현대백화점 신촌점 본관. U-PLEX는 본관의 북동쪽에 있고, 지하 연결통로로도 이어져요.'},
  {id:'uplex',name:'빨간 잠망경',...toWorld([232,445]),text:'U-PLEX 북쪽 광장의 약속 장소. 빨잠 출구는 잠망경 서쪽, 건물 출입문은 남쪽에 있어요.'}
 ];
 const world={bounds,roads,buildings,parks,exits,landmarks};
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
export const STREET_ROUTE=[[237.28,551.68],[239.88,468.64],[240.68,431.24]].map(toWorld);
const roadYaw=(a,b)=>Math.atan2(a.x-b.x,a.z-b.z);
export const REGION_YAW={station:roadYaw(STREET_ROUTE[0],STREET_ROUTE[1]),yonsei:roadYaw(STREET_ROUTE[0],STREET_ROUTE[1]),plaza:Math.PI/6};
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
// Position-based blends work in both travel directions and never depend on
// catching a one-frame region-enter event. Stopping also stops route progress.
export function routeCameraPose(p){
 const bend=smooth((STREET_ROUTE[1].z+2-p.z)/4);
 const streetYaw=REGION_YAW.yonsei+angleDelta(REGION_YAW.yonsei,roadYaw(STREET_ROUTE[1],STREET_ROUTE[2]))*bend;
 if(p.z>6)return {region:'station',label:'신촌역',yaw:streetYaw};
 if(p.z>-5)return {region:'entrance',label:'연세로 진입',yaw:streetYaw};
 if(p.z>-24)return {region:'yonsei',label:'연세로',yaw:streetYaw};
 // Turn to show the plaza only after leaving the main road toward U-PLEX.
 const t=smooth((-24-p.z)/8)*smooth((3-p.x)/5);
 return {region:'plaza',label:t>0?'빨잠 광장':'연세로 북쪽',yaw:streetYaw+angleDelta(streetYaw,REGION_YAW.plaza)*t};
}
export class RouteCamera{
 constructor(position){this.reset(position);}
 reset(position){this.pose=routeCameraPose(position);this.yaw=this.targetYaw=this.pose.yaw;this.enabled=true;this.preview=null;}
 rotate(delta,position){this.targetYaw+=delta;if(this.enabled)this.preview={...position};}
 toggle(position){this.enabled=!this.enabled;this.preview=null;if(this.enabled)this.targetYaw=routeCameraPose(position).yaw;}
 update(position,dt){
  this.pose=routeCameraPose(position);
  // Manual looking is temporary while auto is on. Explicitly switching auto
  // off is the only way to keep a fixed manual view while walking.
  if(this.preview&&Math.hypot(position.x-this.preview.x,position.z-this.preview.z)>=.7)this.preview=null;
  if(this.enabled&&!this.preview)this.targetYaw=this.pose.yaw;
  this.yaw+=angleDelta(this.yaw,this.targetYaw)*(1-Math.exp(-5*Math.max(0,dt)));
 }
 get turning(){return Math.abs(angleDelta(this.yaw,this.targetYaw))>Math.PI/180;}
 get status(){if(!this.enabled)return '수동 시점 · 자동 버튼으로 복귀';if(this.preview)return '둘러보는 중 · 걸으면 자동 복귀';return '자동 · '+this.pose.label+(this.turning?' 방향으로 회전 중':' 시점');}
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
