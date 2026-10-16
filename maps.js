'use strict';
// v4: geographic street lines and parcels with authored pixel-art facades.
const TILE = { GRASS:0, PAVEMENT:1, ROAD:2, CROSSING:3, STATION:4, FOOD:5, STAIRS:6, PLAZA:7, WALL:8, BUILDING:9, PASSAGE:10 };
const MAP_NAMES={street:'신촌역 · 연세로',station:'2호선 신촌역',mall:'현대백화점 B2',store:'현대백화점 B1 식품관',campus:'연세대학교 · 백양로'};
const STAMP_IDS=['street','station','mall','store','campus'];
const GEO_SCALE=4;
const geo=(x,y)=>({x:x*GEO_SCALE,y:y*GEO_SCALE});
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
// One north-up geographic grid: 1.5 metres per tile on both axes.
const street=makeMap(CITY_GEOGRAPHY.w,CITY_GEOGRAPHY.h,1);maps.street=street;
street.metresPerTile=CITY_GEOGRAPHY.metresPerTile;
const campusLine=48*GEO_SCALE;
street.campusGate=geo(59,47);
area(street,1,1,street.w-2,campusLine-1,0);
for(const p of CITY_GEOGRAPHY.parks)polygon(street,p.points,0);
const roadRadius={primary:1.25,secondary:.95,tertiary:.65,residential:.25,living_street:.25,unclassified:.2,service:.14,pedestrian:.3,footway:.12,path:.12,steps:.16};
const roadReserve=Array.from({length:street.h},()=>Array(street.w).fill(false));
// Keep sidewalks beside the exact street lines, without erasing adjacent blocks.
for(const r of CITY_GEOGRAPHY.roads){
 if(r.area){polygon(street,r.points,7);continue;}
 const pedestrian=['pedestrian','footway','path','steps'].includes(r.kind);
 stroke(street,r.points,((roadRadius[r.kind]||.2)+(pedestrian?.22:.45))*GEO_SCALE,pedestrian?7:1);
}
for(const r of CITY_GEOGRAPHY.roads){
 if(r.area)continue;
 const pedestrian=['pedestrian','footway','path','steps'].includes(r.kind);
 stroke(street,r.points,(roadRadius[r.kind]||.2)*GEO_SCALE,r.crossing?3:pedestrian?7:2);
}
// Campus avenue has its real northeast tilt; the gate joins Yonsei-ro across Seongsan-ro.
stroke(street,[[59,47],[60,55]].map(([x,y])=>[x*GEO_SCALE,y*GEO_SCALE]),1.2*GEO_SCALE,3);
stroke(street,[[59,47],[65,25],[72,1]].map(([x,y])=>[x*GEO_SCALE,y*GEO_SCALE]),1.5*GEO_SCALE,7);
street.roads=CITY_GEOGRAPHY.roads.filter(r=>!r.area&&['primary','secondary','tertiary'].includes(r.kind));
for(let y=1;y<street.h-1;y++)for(let x=1;x<street.w-1;x++)if([2,3,7].includes(street.tiles[y][x])){
 roadReserve[y][x]=true;
 // Preserve a one-tile walkable edge along every street.
 for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]])roadReserve[y+dy][x+dx]=true;
}
const SURFACE_EXITS=CITY_GEOGRAPHY.exits;
// The concourse diagram keeps each exit's real north-up position and spacing.
const minExitX=Math.min(...SURFACE_EXITS.map(e=>e.x)),minExitY=Math.min(...SURFACE_EXITS.map(e=>e.y));
const exitInside=Object.fromEntries(SURFACE_EXITS.map(e=>[e.number,[Math.round(10+(e.x-minExitX)*.375),Math.round(8+(e.y-minExitY)*.375)]]));
const storefronts=[{...geo(46,137),tx:18,ty:2,label:'현대백화점 B2'},{...geo(56,110),tx:26,ty:2,label:'U-PLEX 지하통로 ↓'}];
for(const e of [...SURFACE_EXITS,...storefronts])for(let y=e.y-3*GEO_SCALE;y<=e.y+2*GEO_SCALE;y++)for(let x=e.x-2*GEO_SCALE;x<=e.x+3*GEO_SCALE;x++)if(roadReserve[y]?.[x]!==undefined)roadReserve[y][x]=true;
// Keep every surveyed footprint separate and render landmarks on their actual OSM outlines.
const roofColors=['#aaa18e'];
const bookPOI=CITY_GEOGRAPHY.pois.find(p=>p.name==='홍익문고');
const bookFootprint=CITY_GEOGRAPHY.buildings.filter(b=>bookPOI&&inPolygon(bookPOI.x+.5,bookPOI.y+.5,b.points)).sort((a,b)=>b.points.length-a.points.length)[0];
for(const b of CITY_GEOGRAPHY.buildings){
 const {x:bx,y:by,w:bw,h:bh}=b.bbox;
 const x0=Math.max(1,bx),y0=Math.max(1,by),x1=Math.min(street.w-1,bx+bw),y1=Math.min(street.h-1,by+bh);
 if(x1<=x0||y1<=y0)continue;
 const id=street.buildings.length;
 const landmarkType=b.branch==='신촌점'?'hyundai':b.branch==='U Plex'?'uplex':b.id===bookFootprint?.id?'bookshop':b.name.includes('공학원 (102)')||b.name.includes('백주년기념관 (201)')?'campus':'block';
 const label=landmarkType==='hyundai'?'현대백화점':landmarkType==='uplex'?'U-PLEX':landmarkType==='bookshop'?'홍익문고':b.name.includes('공학원')?'공학원':b.name.includes('백주년기념관')?'백주년기념관':'';
 street.buildings.push({x:bx,y:by,w:bw,h:bh,label,roof:landmarkType==='hyundai'?'#d1cbbb':landmarkType==='uplex'?'#80a9b8':landmarkType==='bookshop'?'#b87868':landmarkType==='campus'?'#b8b2a2':roofColors[0],type:landmarkType,points:b.points,footprint:true});
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(!roadReserve[y][x]&&![2,3,7,9].includes(street.tiles[y][x])&&inPolygon(x+.5,y+.5,b.points)){street.tiles[y][x]=9;street.buildingAt[y][x]=id;}
}
// Entrances occupy reserved gaps, never generic storefronts.
for(const e of SURFACE_EXITS){const [tx,ty]=exitInside[e.number];addPortal(street,e.x,e.y,'station',tx,ty,`신촌역 ${e.number}번 출구`,{exit:e.number});}
for(const e of storefronts)addPortal(street,e.x,e.y,'mall',e.tx,e.ty,e.label);
// Trees follow park parcels and campus greens, not evenly spaced artificial rows.
for(let y=12;y<street.h-12;y+=12)for(let x=12;x<street.w-12;x+=12)if(street.tiles[y][x]===0&&!roadReserve[y][x]&&street.tiles[y-1][x]===0&&(Math.floor(x/GEO_SCALE)*7+Math.floor(y/GEO_SCALE)*11)%5<2)street.trees.push({x,y});
street.props.push({...geo(55,108),type:'periscope',solid:true,name:'빨간 잠망경',text:['U-PLEX 앞 광장의 빨간 잠망경이다.','바로 옆 지하통로 입구로 내려가면 백화점 B2와 신촌역으로 이어진다.']},{...geo(56,47),type:'gatepost',solid:true},{...geo(62,47),type:'gatepost',solid:true},{...geo(63,41),type:'eagle',solid:true},{...geo(38,114),type:'bench',solid:true},{...geo(44,115),type:'bench',solid:true});
for(const [x,y] of [[58,127],[62,123],[58,103],[62,91],[58,75],[62,61]]){const p=geo(x,y);if(walkable(street,p.x,p.y))street.props.push({...p,type:'lamp'});}
street.props.push({...geo(64,105),type:'sign',text:'명물길 ↗'},{...geo(55,100),type:'sign',text:'연세로 ↑'});
street.labels=[{name:'연세대학교',...geo(59,47),kind:'campus'},{name:'백양로',...geo(65,20),kind:'road'},{name:'성산로',...geo(89,54),kind:'road'},{name:'연세로',...geo(60,81),kind:'road'},{name:'명물길',...geo(81,88),kind:'road'},{name:'신촌로',...geo(90,136),kind:'road'},{name:'서강로',...geo(43,162),kind:'road'},{name:'창천문화공원',...geo(39,115),kind:'park'},{name:'현대백화점',...geo(44,128),kind:'store'},{name:'U-PLEX',...geo(56,116),kind:'shop'},{name:'홍익문고',...geo(63,134),kind:'book'},{name:'신촌역',...geo(60,144),kind:'station'}];
street.spawn=nearestWalkable(street,58*GEO_SCALE,135*GEO_SCALE);
addNPC(street,59*GEO_SCALE,133*GEO_SCALE,'신촌 길잡이',['지금 신촌역 2번 출구 앞이야. 왼쪽 골목 너머가 현대백화점, 오른쪽은 홍익문고야.','연세로를 따라 조금 올라가면 왼쪽에 U-PLEX와 빨간 잠망경이 있어.','명물길 갈림길을 지나 더 올라가서 성산로를 건너면 연세대 정문이 나와.'],'guide');
addNPC(street,59*GEO_SCALE,121*GEO_SCALE,'약속을 기다리는 학생',['빨간 잠망경 앞에서 만나기로 했어. U-PLEX 바로 앞이지.','현대백화점 본관은 남서쪽, 창천문화공원은 서쪽 골목 안에 있어.'],'girl');
addNPC(street,62*GEO_SCALE,109*GEO_SCALE,'거리의 연주자',['여기가 명물길로 갈라지는 곳이야. ♪','연세대는 연세로를 따라 북쪽, 명물길은 오른쪽 위로 걸으면 돼.'],'musician');
addNPC(street,64*GEO_SCALE,35*GEO_SCALE,'책 읽는 학생',['연세대에 도착했구나. 정문에서 이어지는 이 길이 백양로야.','서쪽에 공학원, 북동쪽에는 백주년기념관과 세브란스가 있어.','여기 은행잎 하나 가져가. 오늘 산책을 기억해 줘!'],'student','은행잎');
addNPC(street,64*GEO_SCALE,136*GEO_SCALE,'서점을 찾은 사람',['홍익문고는 신촌역 3번 출구 가까이 있어. 길 건너편이 현대백화점 쪽이야.'],'student');
sealMap(street);
const station=makeMap(56,38,4);maps.station=station;sealMap(station);
// The concourse fans north toward exits 1–4 and south toward 5–8;
// separate direction platforms and tracks sit below the paid area.
area(station,2,7,52,20,4);area(station,3,11,50,11,7);area(station,3,16,50,4,4);
area(station,3,27,50,6,4);
// Separate eastbound and westbound side platforms with paired track beds.
area(station,3,29,50,1,9);area(station,3,30,50,1,9);
for(const x of [5,17,34,46])area(station,x-1,29,4,2,4);
addBuilding(station,24,13,10,3,'고객안내실','#689890','counter');
addBuilding(station,5,9,7,3,'승차권 발매','#7888a0','counter');addBuilding(station,44,9,7,3,'화장실','#a88878','counter');
addBuilding(station,5,22,8,3,'편의점','#889858','counter');addBuilding(station,43,22,8,3,'물품보관함','#9098b0','counter');
for(const x of [16,21,26,31,36,41])station.props.push({x,y:16,type:'gate',solid:true});
for(const x of [6,13,20,27,34,41,48])station.props.push({x,y:12,type:'column',solid:true},{x,y:24,type:'column',solid:true});
station.props.push({x:25,y:27,type:'platformSign',text:'홍대입구 · 신도림 ←'},{x:25,y:32,type:'platformSign',text:'이대 · 시청 →'});
for(const {number} of SURFACE_EXITS){
 const [x,y]=exitInside[number];
 const exit=SURFACE_EXITS.find(e=>e.number===number),arrival=nearestWalkable(street,exit.x,exit.y);
 addPortal(station,x,y,'street',arrival.x,arrival.y,`${number}번 출구`,{exit:number});
}
addPortal(station,16,13,'mall',32,14,'현대백화점 B2 ←');
addNPC(station,28,14,'역무원',['2호선 신촌역 대합실입니다. 북쪽 통로는 1~4번 출구, 남쪽은 5~8번 출구예요.','개찰구를 지나 아래 승강장으로 내려가세요. 1번 출구 안쪽 연결 통로는 현대백화점 B2로 이어집니다.'],'officer');
station.spawn={x:exitInside[2][0],y:exitInside[2][1]+2};
const mall=makeMap(34,26,4);maps.mall=mall;sealMap(mall);
area(mall,15,2,5,21,7);
// The U-PLEX entrance opens onto a marked B2 corridor that bends south
// along the east edge of the shops, then west to the station connection.
area(mall,25,2,8,3,TILE.PASSAGE);area(mall,30,4,3,11,TILE.PASSAGE);area(mall,20,13,13,4,TILE.PASSAGE);
addBuilding(mall,4,4,7,5,'GROUND SINCHON','#9880b0','counter');addBuilding(mall,23,4,7,5,'올리브영','#78a090','counter');addBuilding(mall,4,17,7,5,'LIFESTYLE','#8898c0','counter');
addPortal(mall,32,14,'station',16,13,'신촌역 →');addPortal(mall,16,7,'store',16,23,'B1 식품관 ↑');addPortal(mall,18,2,'street',46*GEO_SCALE,137*GEO_SCALE,'지상 · 현대백화점 ↑',{sign:'현백 ↑'});addPortal(mall,26,2,'street',56*GEO_SCALE,110*GEO_SCALE,'지상 · U-PLEX ↑',{sign:'U-PLEX ↑'});
mall.props.push({x:30,y:5,type:'sign',text:'U-PLEX · B2 연결통로 ↓'},{x:29,y:15,type:'sign',text:'신촌역 →'});
addNPC(mall,19,12,'백화점 안내 직원',['여기는 신촌역과 연결된 B2층이야.','U-PLEX 출구에서 오른쪽 복도를 따라 내려가면 신촌역이야.','식품관은 위쪽 에스컬레이터로 올라가면 돼.'],'clerk');mall.spawn={x:30,y:14};
const store=makeMap(34,26,5);maps.store=store;sealMap(store);
addBuilding(store,3,4,8,4,'베이커리','#d8a048','stall');addBuilding(store,14,4,7,4,'현대식품관','#90a050','stall');addBuilding(store,24,4,7,4,'디저트','#c888a0','stall');
addBuilding(store,3,16,8,6,'청과 · 야채','#789c50','produce');addBuilding(store,24,16,7,6,'푸드코트','#b09060','stall');
addPortal(store,16,23,'mall',16,7,'B2 연결층 ↓');
addNPC(store,7,9,'빵집 사장님',['어서 와! 여기 B1은 식품관이야. 맛있는 냄새가 나지?','많이 걸었으니 소금빵 하나 가져가. 다음에 또 놀러 와!'],'baker','소금빵');
addNPC(store,23,12,'식품관 직원',['지하철로 돌아가려면 아래쪽 에스컬레이터로 B2에 내려가면 돼.'],'clerk');
for(const x of [14,18,22])store.props.push({x,y:15,type:'table',solid:true});store.spawn={x:16,y:20};
function placeAt(zone,x,y){if(zone!=='street')return MAP_NAMES[zone];if(y<campusLine)return MAP_NAMES.campus;if(y>=132*GEO_SCALE)return '신촌역 · 신촌로';if(y>=111*GEO_SCALE&&x<60*GEO_SCALE)return '현대백화점 · U-PLEX';if(x>62*GEO_SCALE&&y<109*GEO_SCALE&&y>66*GEO_SCALE)return '명물길 · 신촌거리';return '연세로 · 신촌거리';}
