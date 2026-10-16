'use strict';
// v4: geographic street lines and parcels with authored pixel-art facades.
const TILE = { GRASS:0, PAVEMENT:1, ROAD:2, CROSSING:3, STATION:4, FOOD:5, STAIRS:6, PLAZA:7, WALL:8, BUILDING:9 };
const MAP_NAMES={street:'신촌역 · 연세로',station:'2호선 신촌역',mall:'현대백화점 B2',store:'현대백화점 B1 식품관',campus:'연세대학교 · 백양로'};
const STAMP_IDS=['street','station','mall','store','campus'];
const maps={};
function makeMap(w,h,tile){return {w,h,tiles:Array.from({length:h},()=>Array(w).fill(tile)),buildingAt:Array.from({length:h},()=>Array(w).fill(-1)),buildings:[],trees:[],npcs:[],portals:[],props:[],labels:[],roads:[],spawn:{x:2,y:2}};}
function area(m,x,y,w,h,t){for(let j=Math.max(0,y);j<Math.min(m.h,y+h);j++)for(let i=Math.max(0,x);i<Math.min(m.w,x+w);i++){m.tiles[j][i]=t;if(t!==9)m.buildingAt[j][i]=-1;}}
function inPolygon(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}return inside;}
function polygon(m,p,t,building=-1){if(p.length<3)return;const minX=Math.max(1,Math.floor(Math.min(...p.map(a=>a[0])))),maxX=Math.min(m.w-2,Math.ceil(Math.max(...p.map(a=>a[0]))));const minY=Math.max(1,Math.floor(Math.min(...p.map(a=>a[1])))),maxY=Math.min(m.h-2,Math.ceil(Math.max(...p.map(a=>a[1]))));for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(inPolygon(x+.5,y+.5,p)){m.tiles[y][x]=t;m.buildingAt[y][x]=building;}}
function stroke(m,points,r,t){for(let i=1;i<points.length;i++){const [ax,ay]=points[i-1],[bx,by]=points[i];const steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)*2));for(let j=0;j<=steps;j++){const x=ax+(bx-ax)*j/steps,y=ay+(by-ay)*j/steps;for(let yy=Math.floor(y-r);yy<=Math.ceil(y+r);yy++)for(let xx=Math.floor(x-r);xx<=Math.ceil(x+r);xx++){if(xx>0&&yy>0&&xx<m.w-1&&yy<m.h-1&&Math.hypot(xx+.5-x,yy+.5-y)<=r+.5){m.tiles[yy][xx]=t;m.buildingAt[yy][xx]=-1;}}}}}
function walkable(m,x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>0&&y>0&&x<m.w-1&&y<m.h-1&&![8,9].includes(m.tiles[y][x])&&!m.trees.some(t=>t.x===x&&t.y===y)&&!m.npcs.some(n=>n.x===x&&n.y===y)&&!m.props.some(p=>p.solid&&p.x===x&&p.y===y);}
function nearestWalkable(m,x,y,max=14){for(let r=0;r<=max;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(Math.abs(dx)+Math.abs(dy)===r&&walkable(m,x+dx,y+dy))return {x:x+dx,y:y+dy};throw Error(`No walkable tile at ${x},${y}`);}
function addNPC(m,x,y,name,text,style='student',gift=null){const pos=nearestWalkable(m,x,y);m.npcs.push({...pos,name,text,style,gift,dir:0});}
function addPortal(m,x,y,target,tx,ty,label,extra={}){area(m,x-1,y-1,4,3,m===maps.street?1:4);area(m,x,y,2,1,6);m.portals.push({x,y,target,tx,ty,label,...extra});}
function addBuilding(m,x,y,w,h,label,roof,type='shop'){const id=m.buildings.length;m.buildings.push({x,y,w,h,label,roof,type,rect:true});area(m,x,y,w,h,9);for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)m.buildingAt[yy][xx]=id;}
function sealMap(m){area(m,0,0,m.w,1,8);area(m,0,m.h-1,m.w,1,8);area(m,0,0,1,m.h,8);area(m,m.w-1,0,1,m.h,8);}
// One north-up geographic grid: six metres per tile on both axes.
const street=makeMap(CITY_GEOGRAPHY.w,CITY_GEOGRAPHY.h,1);maps.street=street;
street.metresPerTile=CITY_GEOGRAPHY.metresPerTile;
const campusLine=48;
street.campusGate={x:59,y:47};
area(street,1,1,street.w-2,campusLine-1,0);
for(const p of CITY_GEOGRAPHY.parks)polygon(street,p.points,0);
const roadRadius={primary:1.25,secondary:.95,tertiary:.65,residential:.25,living_street:.25,unclassified:.2,service:.14,pedestrian:.3,footway:.12,path:.12,steps:.16};
const roadReserve=Array.from({length:street.h},()=>Array(street.w).fill(false));
// Keep sidewalks beside the exact street lines, without erasing adjacent blocks.
for(const r of CITY_GEOGRAPHY.roads){
 if(r.area){polygon(street,r.points,7);continue;}
 const pedestrian=['pedestrian','footway','path','steps'].includes(r.kind);
 stroke(street,r.points,(roadRadius[r.kind]||.2)+(pedestrian?.22:.45),pedestrian?7:1);
}
for(const r of CITY_GEOGRAPHY.roads){
 if(r.area)continue;
 const pedestrian=['pedestrian','footway','path','steps'].includes(r.kind);
 stroke(street,r.points,roadRadius[r.kind]||.2,r.crossing?3:pedestrian?7:2);
}
// Campus avenue has its real northeast tilt; the gate joins Yonsei-ro across Seongsan-ro.
stroke(street,[[59,47],[60,55]],1.2,3);
stroke(street,[[59,47],[65,25],[72,1]],1.5,7);
street.roads=CITY_GEOGRAPHY.roads.filter(r=>!r.area&&['primary','secondary','tertiary'].includes(r.kind));
for(let y=1;y<street.h-1;y++)for(let x=1;x<street.w-1;x++)if([2,3,7].includes(street.tiles[y][x])){
 roadReserve[y][x]=true;
 // Preserve a one-tile walkable edge along every street.
 for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]])roadReserve[y+dy][x+dx]=true;
}
const SURFACE_EXITS=CITY_GEOGRAPHY.exits;
const exitInside={1:[5,4],2:[16,4],3:[24,4],4:[34,4],5:[36,21],6:[27,22],7:[16,22],8:[5,21]};
const storefronts=[{x:46,y:137,tx:18,ty:4,label:'현대백화점 B2'},{x:58,y:120,tx:26,ty:3,label:'U-PLEX · 지하 연결'}];
for(const e of [...SURFACE_EXITS,...storefronts])for(let y=e.y-3;y<=e.y+2;y++)for(let x=e.x-2;x<=e.x+3;x++)if(roadReserve[y]?.[x]!==undefined)roadReserve[y][x]=true;
function landmark(x,y,w,h,name,type,roof){addBuilding(street,x,y,w,h,name,roof,type);}
// Facades are drawn as whole buildings at their surveyed footprints.
landmark(38,121,12,15,'현대백화점','hyundai','#c8c0a8');
landmark(53,113,6,6,'U-PLEX','uplex','#72b0c8');
landmark(61,132,4,3,'홍익문고','bookshop','#b05850');
landmark(30,32,19,15,'연세공학원','campus','#a0a0b0');
landmark(72,10,11,15,'백주년기념관','campus','#a0a0b0');
// Keep every surveyed footprint as a separate building. The renderer clips
// the roof and facade to its actual outline, preserving the narrow alleys.
const roofColors=['#a89868','#8898a8','#b08070','#889878','#a88898','#a8a088'];
const ignoredBuildings=new Set(['1436163437','1436163440','1436159554','1436159556','1436179997','1436179994','1436170974','1436170957','1436159561']);
const heroBuildings=[{x:38,y:121,w:12,h:15},{x:53,y:113,w:6,h:6},{x:61,y:132,w:4,h:3},{x:30,y:32,w:19,h:15},{x:72,y:10,w:11,h:15}];
for(const b of CITY_GEOGRAPHY.buildings){
 if(ignoredBuildings.has(b.id)||b.branch==='U Plex'||b.branch==='신촌점')continue;
 const {x:bx,y:by,w:bw,h:bh}=b.bbox,cx=bx+bw/2,cy=by+bh/2;
 if(heroBuildings.some(r=>cx>=r.x&&cx<r.x+r.w&&cy>=r.y&&cy<r.y+r.h))continue;
 const x0=Math.max(1,bx),y0=Math.max(1,by),x1=Math.min(street.w-1,bx+bw),y1=Math.min(street.h-1,by+bh);
 if(x1<=x0||y1<=y0)continue;
 const id=street.buildings.length;
 street.buildings.push({x:bx,y:by,w:bw,h:bh,label:'',roof:roofColors[Number(b.id)%roofColors.length],type:'block',points:b.points,footprint:true});
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(!roadReserve[y][x]&&![2,3,7,9].includes(street.tiles[y][x])&&inPolygon(x+.5,y+.5,b.points)){street.tiles[y][x]=9;street.buildingAt[y][x]=id;}
}
// Entrances occupy reserved gaps, never generic storefronts.
for(const e of SURFACE_EXITS){const [tx,ty]=exitInside[e.number];addPortal(street,e.x,e.y,'station',tx,ty+(e.number<=4?2:-2),`신촌역 ${e.number}번 출구`,{exit:e.number});}
for(const e of storefronts)addPortal(street,e.x,e.y,'mall',e.tx,e.ty,e.label);
// Trees follow park parcels and campus greens, not evenly spaced artificial rows.
for(let y=3;y<street.h-3;y+=3)for(let x=3;x<street.w-3;x+=3)if(street.tiles[y][x]===0&&!roadReserve[y][x]&&street.tiles[y-1][x]===0&&(x*7+y*11)%5<2)street.trees.push({x,y});
street.props.push({x:56,y:121,type:'periscope',solid:true,name:'빨간 잠망경',text:['U-PLEX 앞의 빨간 잠망경이다. 이 앞에서 만나기로 한 사람들이 주변을 둘러보고 있다.','지하로 내려가려면 오른쪽의 B2 계단 앞에서 입구를 바라보자.']},{x:56,y:47,type:'gatepost',solid:true},{x:62,y:47,type:'gatepost',solid:true},{x:63,y:41,type:'eagle',solid:true},{x:38,y:114,type:'bench',solid:true},{x:44,y:115,type:'bench',solid:true});
for(const [x,y] of [[58,127],[62,123],[58,103],[62,91],[58,75],[62,61]])if(walkable(street,x,y))street.props.push({x,y,type:'lamp'});
street.props.push({x:64,y:105,type:'sign',text:'명물길 ↗'},{x:55,y:100,type:'sign',text:'연세로 ↑'});
street.labels=[{name:'연세대학교',x:59,y:47,kind:'campus'},{name:'백양로',x:65,y:20,kind:'road'},{name:'성산로',x:89,y:54,kind:'road'},{name:'연세로',x:60,y:81,kind:'road'},{name:'명물길',x:81,y:88,kind:'road'},{name:'신촌로',x:90,y:136,kind:'road'},{name:'서강로',x:43,y:162,kind:'road'},{name:'창천문화공원',x:39,y:115,kind:'park'},{name:'현대백화점',x:44,y:128,kind:'store'},{name:'U-PLEX',x:56,y:116,kind:'shop'},{name:'홍익문고',x:63,y:134,kind:'book'},{name:'신촌역',x:60,y:144,kind:'station'}];
street.spawn=nearestWalkable(street,58,135);
addNPC(street,59,133,'신촌 길잡이',['지금 신촌역 2번 출구 앞이야. 왼쪽 골목 너머가 현대백화점, 오른쪽은 홍익문고야.','연세로를 따라 조금 올라가면 왼쪽에 U-PLEX와 빨간 잠망경이 있어.','명물길 갈림길을 지나 더 올라가서 성산로를 건너면 연세대 정문이 나와.'],'guide');
addNPC(street,59,121,'약속을 기다리는 학생',['빨간 잠망경 앞에서 만나기로 했어. U-PLEX 바로 앞이지.','현대백화점 본관은 남서쪽, 창천문화공원은 서쪽 골목 안에 있어.'],'girl');
addNPC(street,62,109,'거리의 연주자',['여기가 명물길로 갈라지는 곳이야. ♪','연세대는 연세로를 따라 북쪽, 명물길은 오른쪽 위로 걸으면 돼.'],'musician');
addNPC(street,64,35,'책 읽는 학생',['연세대에 도착했구나. 정문에서 이어지는 이 길이 백양로야.','서쪽에 공학원, 북동쪽에는 백주년기념관과 세브란스가 있어.','여기 은행잎 하나 가져가. 오늘 산책을 기억해 줘!'],'student','은행잎');
addNPC(street,64,136,'서점을 찾은 사람',['홍익문고는 신촌역 3번 출구 가까이 있어. 길 건너편이 현대백화점 쪽이야.'],'student');
sealMap(street);
const station=makeMap(56,38,4);maps.station=station;sealMap(station);
// The concourse fans north toward exits 1–4 and south toward 5–8;
// separate direction platforms and tracks sit below the paid area.
area(station,2,7,52,20,4);area(station,3,11,50,11,7);area(station,3,16,50,4,4);
area(station,3,27,50,6,4);
// Separate eastbound and westbound side platforms with paired track beds.
area(station,3,29,50,1,9);area(station,3,30,50,1,9);
for(const x of [5,17,34,46])area(station,x-1,29,4,2,4);
addBuilding(station,23,8,10,3,'고객안내실','#689890','counter');
addBuilding(station,5,9,7,3,'승차권 발매','#7888a0','counter');addBuilding(station,44,9,7,3,'화장실','#a88878','counter');
addBuilding(station,5,22,8,3,'편의점','#889858','counter');addBuilding(station,43,22,8,3,'물품보관함','#9098b0','counter');
for(const x of [16,21,26,31,36,41])station.props.push({x,y:16,type:'gate',solid:true});
for(const x of [6,13,20,27,34,41,48])station.props.push({x,y:12,type:'column',solid:true},{x,y:24,type:'column',solid:true});
station.props.push({x:25,y:27,type:'platformSign',text:'홍대입구 · 신도림 ←'},{x:25,y:32,type:'platformSign',text:'이대 · 시청 →'});
for(const [number,x,y] of [[1,5,4],[2,17,4],[3,34,4],[4,46,4],[5,46,33],[6,34,33],[7,17,33],[8,5,33]]){
 const exit=SURFACE_EXITS.find(e=>e.number===number),arrival=nearestWalkable(street,exit.x,exit.y-2);
 addPortal(station,x,y,'street',arrival.x,arrival.y,`${number}번 출구`,{exit:number});
}
addPortal(station,2,16,'mall',18,4,'현대백화점 B2 ←');
addNPC(station,28,14,'역무원',['2호선 신촌역 대합실입니다. 북쪽 통로는 1~4번 출구, 남쪽은 5~8번 출구예요.','개찰구를 지나 아래 승강장으로 내려가세요. 1번 출구 안쪽 연결 통로는 현대백화점 B2로 이어집니다.'],'officer');
station.spawn={x:5,y:15};
const mall=makeMap(34,26,4);maps.mall=mall;sealMap(mall);
area(mall,15,2,5,21,7);addBuilding(mall,4,4,7,5,'GROUND','#9880b0','counter');addBuilding(mall,23,4,7,5,'POP-UP','#78a090','counter');addBuilding(mall,4,17,7,5,'LIFESTYLE','#8898c0','counter');
addPortal(mall,32,14,'station',4,11,'신촌역 →');addPortal(mall,16,7,'store',16,20,'B1 식품관 ↑');addPortal(mall,18,2,'street',46,139,'지상 · 현대백화점 ↑',{sign:'현백 ↑'});addPortal(mall,26,2,'street',58,122,'지상 · U-PLEX ↑',{sign:'U-PLEX ↑'});
addNPC(mall,19,12,'백화점 안내 직원',['여기는 신촌역과 연결된 B2층이야.','식품관은 위쪽 에스컬레이터로 올라가면 돼. 역으로 돌아가려면 오른쪽으로 가!'],'clerk');mall.spawn={x:30,y:14};
const store=makeMap(34,26,5);maps.store=store;sealMap(store);
addBuilding(store,3,4,8,4,'베이커리','#d8a048','stall');addBuilding(store,14,4,7,4,'현대식품관','#90a050','stall');addBuilding(store,24,4,7,4,'디저트','#c888a0','stall');
addBuilding(store,3,16,8,6,'청과 · 야채','#789c50','produce');addBuilding(store,24,16,7,6,'푸드코트','#b09060','stall');
addPortal(store,16,23,'mall',16,9,'B2 연결층 ↓');
addNPC(store,7,9,'빵집 사장님',['어서 와! 여기 B1은 식품관이야. 맛있는 냄새가 나지?','많이 걸었으니 소금빵 하나 가져가. 다음에 또 놀러 와!'],'baker','소금빵');
addNPC(store,23,12,'식품관 직원',['지하철로 돌아가려면 아래쪽 에스컬레이터로 B2에 내려가면 돼.'],'clerk');
for(const x of [14,18,22])store.props.push({x,y:15,type:'table',solid:true});store.spawn={x:16,y:20};
function placeAt(zone,x,y){if(zone!=='street')return MAP_NAMES[zone];if(y<campusLine)return MAP_NAMES.campus;if(y>=132)return '신촌역 · 신촌로';if(y>=111&&x<60)return '현대백화점 · U-PLEX';if(x>62&&y<109&&y>66)return '명물길 · 신촌거리';return '연세로 · 신촌거리';}
