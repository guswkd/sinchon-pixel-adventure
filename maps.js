'use strict';
// v4: geographic street lines and parcels with authored pixel-art facades.
const TILE = { GRASS:0, PAVEMENT:1, ROAD:2, CROSSING:3, STATION:4, FOOD:5, STAIRS:6, PLAZA:7, WALL:8, BUILDING:9, PASSAGE:10 };
const MAP_NAMES={street:'신촌역 · 연세로',station:'신촌역 지하 대합실',uplex:'U-PLEX 1F 출입 로비',mall:'현대백화점 · U-PLEX B2',store:'현대백화점 B1 식품관',campus:'연세대학교 · 백양로'};
const STAMP_IDS=['street','station','mall','store','campus'];
const GEO_SCALE=4;
const geo=(x,y)=>({x:x*GEO_SCALE,y:y*GEO_SCALE});
function mapPoint(name){const p=CITY_GEOGRAPHY.pois.find(p=>p.name===name);if(!p)throw Error('Missing surveyed location: '+name);return {x:p.x,y:p.y};}
const LANDMARKS={gate:mapPoint('연세대 정문'),periscope:mapPoint('빨잠 (빨간 잠망경)'),uplexEntrance:mapPoint('신촌역 빨잠 출구'),hyundaiEntrance:mapPoint('현대백화점 신촌역 지하통로'),bookshop:mapPoint('홍익문고'),junction:mapPoint('연세로사거리')};
// Indoor maps retain the surface grid's north and 1.5 m tile scale.
const INDOOR_LAYOUT={station:{origin:[175,530],w:120,h:85},mall:{origin:[145,435],w:100,h:120},store:{origin:[145,475],w:65,h:80},uplex:{origin:[223,447],w:14,h:15}};
function undergroundPoint(id,zone){const p=UNDERGROUND_GEOGRAPHY.nodes[id].point,o=zone?INDOOR_LAYOUT[zone].origin:[0,0];return {x:Math.round(p[0]-o[0]),y:Math.round(p[1]-o[1])};}
function localPoint(zone,x,y){const o=INDOOR_LAYOUT[zone].origin;return {x:x-o[0],y:y-o[1]};}
const maps={};
function makeMap(w,h,tile){return {w,h,tiles:Array.from({length:h},()=>Array(w).fill(tile)),buildingAt:Array.from({length:h},()=>Array(w).fill(-1)),buildings:[],trees:[],npcs:[],portals:[],props:[],labels:[],roads:[],spawn:{x:2,y:2}};}
function area(m,x,y,w,h,t){for(let j=Math.max(0,y);j<Math.min(m.h,y+h);j++)for(let i=Math.max(0,x);i<Math.min(m.w,x+w);i++){m.tiles[j][i]=t;if(t!==9)m.buildingAt[j][i]=-1;}}
function inPolygon(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}return inside;}
function polygon(m,p,t,building=-1){if(p.length<3)return;const minX=Math.max(1,Math.floor(Math.min(...p.map(a=>a[0])))),maxX=Math.min(m.w-2,Math.ceil(Math.max(...p.map(a=>a[0]))));const minY=Math.max(1,Math.floor(Math.min(...p.map(a=>a[1])))),maxY=Math.min(m.h-2,Math.ceil(Math.max(...p.map(a=>a[1]))));for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(inPolygon(x+.5,y+.5,p)){m.tiles[y][x]=t;m.buildingAt[y][x]=building;}}
function stroke(m,points,r,t){for(let i=1;i<points.length;i++){const [ax,ay]=points[i-1],[bx,by]=points[i];const steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)*2));for(let j=0;j<=steps;j++){const x=ax+(bx-ax)*j/steps,y=ay+(by-ay)*j/steps;for(let yy=Math.floor(y-r);yy<=Math.ceil(y+r);yy++)for(let xx=Math.floor(x-r);xx<=Math.ceil(x+r);xx++){if(xx>0&&yy>0&&xx<m.w-1&&yy<m.h-1&&Math.hypot(xx+.5-x,yy+.5-y)<=r+.5){m.tiles[yy][xx]=t;m.buildingAt[yy][xx]=-1;}}}}}
function walkable(m,x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>0&&y>0&&x<m.w-1&&y<m.h-1&&![8,9].includes(m.tiles[y][x])&&!m.trees.some(t=>t.x===x&&t.y===y)&&!m.npcs.some(n=>n.x===x&&n.y===y)&&!m.props.some(p=>p.solid&&p.x===x&&p.y===y);}
function nearestWalkable(m,x,y,max=14){for(let r=0;r<=max;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(Math.abs(dx)+Math.abs(dy)===r&&walkable(m,x+dx,y+dy))return {x:x+dx,y:y+dy};throw Error(`No walkable tile at ${x},${y}`);}
function addNPC(m,x,y,name,text,style='student',gift=null){const pos=nearestWalkable(m,x,y);m.npcs.push({...pos,name,text,style,gift,dir:0});}
function addPortal(m,x,y,target,tx,ty,label,extra={}){area(m,x-1,y-1,4,3,m===maps.street?1:4);area(m,x,y,2,1,extra.door?TILE.PASSAGE:TILE.STAIRS);m.portals.push({x,y,target,tx,ty,label,...extra});}
function addBuilding(m,x,y,w,h,label,roof,type='shop'){const id=m.buildings.length;m.buildings.push({x,y,w,h,label,roof,type,rect:true});area(m,x,y,w,h,9);for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)m.buildingAt[yy][xx]=id;}
function sealMap(m){area(m,0,0,m.w,1,8);area(m,0,m.h-1,m.w,1,8);area(m,0,0,1,m.h,8);area(m,m.w-1,0,1,m.h,8);}
// One north-up geographic grid: 1.5 metres per tile on both axes.
const street=makeMap(CITY_GEOGRAPHY.w,CITY_GEOGRAPHY.h,1);maps.street=street;
street.metresPerTile=CITY_GEOGRAPHY.metresPerTile;
const campusLine=LANDMARKS.gate.y+4;
street.campusGate={...LANDMARKS.gate};
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
// Campus paths and the Seongsan-ro crossing come from the same surveyed roads.
street.roads=CITY_GEOGRAPHY.roads.filter(r=>!r.area&&['primary','secondary','tertiary'].includes(r.kind));
for(let y=1;y<street.h-1;y++)for(let x=1;x<street.w-1;x++)if([2,3,7].includes(street.tiles[y][x])){
 roadReserve[y][x]=true;
 // Preserve a one-tile walkable edge along every street.
 for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]])roadReserve[y+dy][x+dx]=true;
}
const SURFACE_EXITS=CITY_GEOGRAPHY.exits;
// Each numbered portal uses the lower end of its actual staircase.
const exitInside=Object.fromEntries(UNDERGROUND_GEOGRAPHY.exits.map(e=>{const p=undergroundPoint(e.landing,'station');return [e.number,[p.x,p.y]];}));
const storefronts=[
 {...undergroundPoint('12557603701'),target:'mall',landing:'13185495411',label:'빨잠 출구 ↓'},
 {...undergroundPoint('13200478453'),target:'uplex',landing:'13200478453',label:'U-PLEX 1F 입구',door:true},
 {...undergroundPoint('13200578591'),target:'station',landing:'13200578590',label:'현대백화점 앞 지하통로 ↓'}
];
// Only clear the actual two-tile entrance and its approach, not a 30 m square.
for(const e of [...SURFACE_EXITS,...storefronts])for(let y=e.y-1;y<=e.y+1;y++)for(let x=e.x-1;x<=e.x+2;x++)if(roadReserve[y]?.[x]!==undefined)roadReserve[y][x]=true;
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
for(const e of storefronts){const p=undergroundPoint(e.landing,e.target);addPortal(street,e.x,e.y,e.target,p.x,p.y,e.label,{door:!!e.door,sign:e.door?'U-PLEX':'지하 ↓'});}
// Trees follow park parcels and campus greens, not evenly spaced artificial rows.
for(let y=12;y<street.h-12;y+=12)for(let x=12;x<street.w-12;x+=12)if(street.tiles[y][x]===0&&!roadReserve[y][x]&&street.tiles[y-1][x]===0&&(Math.floor(x/GEO_SCALE)*7+Math.floor(y/GEO_SCALE)*11)%5<2)street.trees.push({x,y});
street.props.push({...LANDMARKS.periscope,type:'periscope',solid:true,name:'빨간 잠망경',text:['U-PLEX 북쪽 광장의 빨간 잠망경이다.','서쪽 빨잠 출구로 내려가면 긴 지하통로가 본관과 신촌역으로 이어진다.']},{x:LANDMARKS.gate.x-12,y:LANDMARKS.gate.y,type:'gatepost',solid:true},{x:LANDMARKS.gate.x+12,y:LANDMARKS.gate.y,type:'gatepost',solid:true});
for(const [x,y] of [[58,127],[62,123],[58,103],[62,91],[58,75],[62,61]]){const p=geo(x,y);if(walkable(street,p.x,p.y))street.props.push({...p,type:'lamp'});}
street.props.push({...geo(64,105),type:'sign',text:'명물길 ↗'},{...geo(55,100),type:'sign',text:'연세로 ↑'});
street.labels=[{name:'연세대학교',...geo(59,47),kind:'campus'},{name:'백양로',...geo(65,20),kind:'road'},{name:'성산로',...geo(89,54),kind:'road'},{name:'연세로',...geo(60,81),kind:'road'},{name:'명물길',...geo(81,88),kind:'road'},{name:'신촌로',...geo(90,136),kind:'road'},{name:'서강로',...geo(43,162),kind:'road'},{name:'창천문화공원',...geo(39,115),kind:'park'},{name:'현대백화점',...geo(44,128),kind:'store'},{name:'U-PLEX',...geo(56,116),kind:'shop'},{name:'홍익문고',...geo(63,134),kind:'book'},{name:'신촌역',...geo(60,144),kind:'station'}];
for(const [name,point] of [['연세대학교',LANDMARKS.gate],['홍익문고',LANDMARKS.bookshop]])Object.assign(street.labels.find(l=>l.name===name),point);
for(const [name,type] of [['현대백화점','hyundai'],['U-PLEX','uplex']]){const b=street.buildings.find(b=>b.type===type);Object.assign(street.labels.find(l=>l.name===name),{x:b.x+b.w/2,y:b.y+b.h/2});}
street.labels.push({name:'빨잠',...LANDMARKS.periscope,kind:'landmark'});
const exitTwo=SURFACE_EXITS.find(e=>e.number===2);
street.spawn=nearestWalkable(street,exitTwo.x,exitTwo.y-2);
addNPC(street,exitTwo.x+2,exitTwo.y-3,'신촌 길잡이',['지금 신촌역 2번 출구 앞이야. 왼쪽 골목 너머가 현대백화점, 오른쪽은 홍익문고야.','연세로를 따라 조금 올라가면 왼쪽에 U-PLEX와 빨간 잠망경이 있어.','명물길 갈림길을 지나 더 올라가서 성산로를 건너면 연세대 정문이 나와.'],'guide');
addNPC(street,LANDMARKS.periscope.x+2,LANDMARKS.periscope.y+2,'약속을 기다리는 학생',['빨간 잠망경 앞에서 만나기로 했어. U-PLEX 바로 앞이지.','현대백화점 본관은 남서쪽, 창천문화공원은 서쪽 골목 안에 있어.'],'girl');
addNPC(street,LANDMARKS.junction.x+4,LANDMARKS.junction.y+2,'거리의 연주자',['여기가 명물길로 갈라지는 곳이야. ♪','연세대는 연세로를 따라 북쪽, 명물길은 오른쪽 위로 걸으면 돼.'],'musician');
addNPC(street,64*GEO_SCALE,35*GEO_SCALE,'책 읽는 학생',['연세대에 도착했구나. 정문에서 이어지는 이 길이 백양로야.','서쪽에 공학원, 북동쪽에는 백주년기념관과 세브란스가 있어.','여기 은행잎 하나 가져가. 오늘 산책을 기억해 줘!'],'student','은행잎');
addNPC(street,64*GEO_SCALE,136*GEO_SCALE,'서점을 찾은 사람',['홍익문고는 신촌역 3번 출구 가까이 있어. 길 건너편이 현대백화점 쪽이야.'],'student');
sealMap(street);
function mappedInterior(id){const layout=INDOOR_LAYOUT[id],m=makeMap(layout.w,layout.h,TILE.WALL);m.origin=layout.origin;m.metresPerTile=1.5;maps[id]=m;return m;}
function mappedCorridors(m,id){for(const r of UNDERGROUND_GEOGRAPHY.corridors[id])stroke(m,r.points.map(([x,y])=>[x-m.origin[0],y-m.origin[1]]),1.7,TILE.PASSAGE);}
function mappedFootprint(m,type,tile){const b=street.buildings.find(b=>b.type===type);polygon(m,b.points.map(([x,y])=>[x-m.origin[0],y-m.origin[1]]),tile);}
function portalAt(m,id,target,targetId,label,extra={}){const zone=Object.keys(maps).find(k=>maps[k]===m),p=undergroundPoint(id,zone),q=undergroundPoint(targetId,target==='street'?null:target);addPortal(m,p.x,p.y,target,q.x,q.y,label,extra);}
const station=mappedInterior('station');mappedCorridors(station,'station');
// No invented track beds, fare gates or shops on the public exit concourse.
for(const e of UNDERGROUND_GEOGRAPHY.exits)portalAt(station,e.landing,'street',e.surface,`${e.number}번 출구`,{exit:e.number});
portalAt(station,'13200578590','street','13200578591','현대백화점 앞 지상 ↑');
portalAt(station,'2364556158','mall','2364556158','현대백화점 B2 연결',{door:true,sign:'본관 B2'});
const stationGuide=undergroundPoint('13185495408','station');
addNPC(station,stationGuide.x+2,stationGuide.y,'역무원',['신촌역 출구 대합실입니다. 녹색 번호 표지가 지상 출구예요.','현대백화점 연결통로는 대합실 서쪽으로 이어집니다. 지상으로 나가지 않고 본관 B2에 들어갈 수 있어요.'],'officer');
station.spawn={x:exitInside[2][0],y:exitInside[2][1]};
for(const [id,text] of [['13185495408','1·2 ←  3·4 →'],['13200657191','현대백화점 ↖'],['13200712349','5·6 →'],['13200657188','7·8 ↙']]){const p=undergroundPoint(id,'station');station.props.push({...p,type:'sign',text});}
const mall=mappedInterior('mall');mappedFootprint(mall,'hyundai',4);mappedFootprint(mall,'uplex',4);mappedCorridors(mall,'mall');
// Furnish only inside the surveyed shell, leaving the surveyed through-route clear.
function interiorCounter(m,worldX,worldY,w,h,label,type='counter'){
 const p={x:worldX-m.origin[0],y:worldY-m.origin[1]};
 for(let y=p.y-1;y<p.y+h+1;y++)for(let x=p.x-1;x<p.x+w+1;x++)if(!m.tiles[y]||![4,5].includes(m.tiles[y][x]))return;
 addBuilding(m,p.x,p.y,w,h,label,type==='stall'?'#c5ab80':'#9caeab',type);
}
for(const b of [[160,523,5,7,'대행사장'],[169,529,5,4,'GROUND'],[172,492,5,4,'의류'],[180,501,5,5,'의류'],[184,514,5,5,'잡화']])interiorCounter(mall,...b);
// U-PLEX B2 currently has a central tenant under preparation, not an open shop.
interiorCounter(mall,220,464,8,6,'오픈 준비 중');
portalAt(mall,'2364556158','station','2364556158','신촌역 연결',{door:true,sign:'신촌역'});
portalAt(mall,'13185495411','street','12557603701','빨잠 광장 ↑',{sign:'빨잠 ↑'});
portalAt(mall,'13206248860','uplex','13200478454','U-PLEX 1F ↑',{sign:'1F ↑'});
const escalator=localPoint('mall',178,516),foodEscalator=localPoint('store',178,516);
addPortal(mall,escalator.x,escalator.y,'store',foodEscalator.x,foodEscalator.y,'B1 식품관 ↑',{sign:'B1 ↑'});
for(const [id,text] of [['13200712313','신촌역 ↓'],['13200712323','본관 ↙  U-PLEX ↗'],['13200478455','빨잠 ↖  1F →']]){const p=undergroundPoint(id,'mall');mall.props.push({...p,type:'sign',text});}
const guide=undergroundPoint('13206245651','mall');addNPC(mall,guide.x+3,guide.y,'백화점 안내 직원',['남서쪽은 현대백화점 본관, 북동쪽 긴 연결통로 끝은 U-PLEX예요.','빨잠 광장 계단과 U-PLEX 건물 안 에스컬레이터는 서로 다른 출입구예요.','본관 B1 식품관은 본관 안 에스컬레이터로 올라가세요.'],'clerk');
mall.spawn=undergroundPoint('2364556158','mall');
const uplex=mappedInterior('uplex');mappedCorridors(uplex,'uplex');
portalAt(uplex,'13200478453','street','13200478453','U-PLEX 광장 출입문',{door:true,sign:'광장 ↑'});
portalAt(uplex,'13200478454','mall','13206248860','B2 연결통로 ↓',{sign:'B2 ↓'});uplex.spawn=undergroundPoint('13200478453','uplex');
const store=mappedInterior('store');mappedFootprint(store,'hyundai',5);
for(const b of [[164,523,5,5,'베이커리'],[179,524,5,4,'델리'],[172,492,5,5,'청과'],[180,500,5,5,'식품'],[184,513,5,5,'푸드코트']])interiorCounter(store,...b,'stall');
addPortal(store,foodEscalator.x,foodEscalator.y,'mall',escalator.x,escalator.y,'B2 연결층 ↓',{sign:'B2 ↓'});
const baker=localPoint('store',168,521);addNPC(store,baker.x,baker.y,'빵집 사장님',['어서 와! 여기 B1은 식품관이야. 맛있는 냄새가 나지?','많이 걸었으니 소금빵 하나 가져가. 다음에 또 놀러 와!'],'baker','소금빵');
const clerk=localPoint('store',181,512);addNPC(store,clerk.x,clerk.y,'식품관 직원',['신촌역과 U-PLEX 연결통로는 본관 B2로 내려가서 이용해 주세요.'],'clerk');store.spawn={...foodEscalator};
for(const m of [station,mall,store,uplex])sealMap(m);
function placeAt(zone,x,y){if(zone!=='street')return MAP_NAMES[zone];if(y<campusLine)return MAP_NAMES.campus;if(y>=132*GEO_SCALE)return '신촌역 · 신촌로';if(y>=111*GEO_SCALE&&x<60*GEO_SCALE)return '현대백화점 · U-PLEX';if(x>62*GEO_SCALE&&y<109*GEO_SCALE&&y>66*GEO_SCALE)return '명물길 · 신촌거리';return '연세로 · 신촌거리';}
