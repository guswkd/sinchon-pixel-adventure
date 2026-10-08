'use strict';
const TILE = { GRASS:0, PAVEMENT:1, ROAD:2, CROSSING:3, STATION:4, FOOD:5, STAIRS:6, PLAZA:7, WALL:8, BUILDING:9 };
const MAP_NAMES={street:'신촌역 · 연세로',station:'2호선 신촌역',mall:'현대백화점 B2',store:'현대백화점 B1 식품관',campus:'연세대학교 · 백양로'};
const STAMP_IDS=['street','station','mall','store','campus'];
const maps={};
function makeMap(w,h,tile){return {w,h,tiles:Array.from({length:h},()=>Array(w).fill(tile)),buildingAt:Array.from({length:h},()=>Array(w).fill(-1)),buildings:[],trees:[],npcs:[],portals:[],props:[],labels:[],roads:[],spawn:{x:2,y:2}};}
function area(m,x,y,w,h,t){for(let j=Math.max(0,y);j<Math.min(m.h,y+h);j++)for(let i=Math.max(0,x);i<Math.min(m.w,x+w);i++){m.tiles[j][i]=t;if(t!==9)m.buildingAt[j][i]=-1;}}
function inPolygon(x,y,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;}return inside;}
function polygon(m,p,t,building=-1){if(p.length<3)return;const minX=Math.max(1,Math.floor(Math.min(...p.map(a=>a[0])))),maxX=Math.min(m.w-2,Math.ceil(Math.max(...p.map(a=>a[0]))));const minY=Math.max(1,Math.floor(Math.min(...p.map(a=>a[1])))),maxY=Math.min(m.h-2,Math.ceil(Math.max(...p.map(a=>a[1]))));for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(inPolygon(x+.5,y+.5,p)){m.tiles[y][x]=t;m.buildingAt[y][x]=building;}}
function stroke(m,points,r,t){for(let i=1;i<points.length;i++){const [ax,ay]=points[i-1],[bx,by]=points[i];const steps=Math.max(1,Math.ceil(Math.hypot(bx-ax,by-ay)*2));for(let j=0;j<=steps;j++){const x=ax+(bx-ax)*j/steps,y=ay+(by-ay)*j/steps;for(let yy=Math.floor(y-r);yy<=Math.ceil(y+r);yy++)for(let xx=Math.floor(x-r);xx<=Math.ceil(x+r);xx++){if(xx>0&&yy>0&&xx<m.w-1&&yy<m.h-1&&Math.hypot(xx+.5-x,yy+.5-y)<=r+.5){m.tiles[yy][xx]=t;m.buildingAt[yy][xx]=-1;}}}}}
function walkable(m,x,y){return Number.isInteger(x)&&Number.isInteger(y)&&x>0&&y>0&&x<m.w-1&&y<m.h-1&&![8,9].includes(m.tiles[y][x])&&!m.npcs.some(n=>n.x===x&&n.y===y)&&!m.props.some(p=>p.solid&&p.x===x&&p.y===y);}
function nearestWalkable(m,x,y,max=14){for(let r=0;r<=max;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++)if(Math.abs(dx)+Math.abs(dy)===r&&walkable(m,x+dx,y+dy))return {x:x+dx,y:y+dy};throw Error(`No walkable tile at ${x},${y}`);}
function addNPC(m,x,y,name,text,style='student',gift=null){const pos=nearestWalkable(m,x,y);m.npcs.push({...pos,name,text,style,gift,dir:0});}
function addPortal(m,x,y,target,tx,ty,label,extra={}){area(m,x-1,y-1,4,3,m===maps.street?1:4);area(m,x,y,2,1,6);m.portals.push({x,y,target,tx,ty,label,...extra});}
function addBuilding(m,x,y,w,h,label,roof,type='shop'){const id=m.buildings.length;m.buildings.push({x,y,w,h,label,roof,type,rect:true});area(m,x,y,w,h,9);for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)m.buildingAt[yy][xx]=id;}
function sealMap(m){area(m,0,0,m.w,1,8);area(m,0,m.h-1,m.w,1,8);area(m,0,0,1,m.h,8);area(m,m.w-1,0,1,m.h,8);}
const street=makeMap(WORLD_DATA.w,WORLD_DATA.h,1);maps.street=street;
const campusLine=Math.round((WORLD_DATA.bounds.north-37.56045)*111320/6)+2;
area(street,0,0,street.w,campusLine,0);
for(const p of WORLD_DATA.parks)polygon(street,p.points,0);
const roofColors=['#858e9d','#ad866e','#829c91','#b09578','#8999b1','#a38187'];
for(const b of WORLD_DATA.buildings){const id=street.buildings.length;const xs=b.points.map(p=>p[0]),ys=b.points.map(p=>p[1]);const x=Math.floor(Math.min(...xs)),y=Math.floor(Math.min(...ys)),w=Math.ceil(Math.max(...xs))-x,h=Math.ceil(Math.max(...ys))-y;let label='';if(b.branch==='U Plex')label='U-PLEX';else if(b.branch==='신촌점')label='현대백화점';else if(/공학원|백주년기념관|제1공학관|연세암병원/.test(b.name))label=b.name.replace(/ \(.+\)/,'');street.buildings.push({...b,x,y,w,h,label,roof:b.branch==='신촌점'?'#779aaa':b.branch==='U Plex'?'#a57777':roofColors[Number(b.id)%roofColors.length],type:'footprint'});polygon(street,b.points,9,id);}
const radius={primary:1.8,secondary:1.2,tertiary:.8,residential:.3,living_street:.3,service:.18,pedestrian:.85,footway:.08,path:.08,steps:.08,unclassified:.3};
const roads=[...WORLD_DATA.roads].sort((a,b)=>(radius[b.kind]||0)-(radius[a.kind]||0));
// Pavements follow real road geometry, including the bend at Sinchon junction.
for(const r of roads)stroke(street,r.points,(radius[r.kind]||.08)+(['primary','secondary','tertiary'].includes(r.kind)?.65:.18),1);
for(const r of roads){const t=r.crossing?3:['pedestrian','footway','path','steps'].includes(r.kind)?1:2;stroke(street,r.points,radius[r.kind]||.4,t);}
street.roads=roads;
// Geographic POIs, kept distinct from decorative game NPCs and interior layouts.
const worldPOIs=[
 {name:'신촌역 2호선',x:75,y:146,kind:'station'},
 {name:'현대백화점',x:59,y:131,kind:'store'},
 {name:'U-PLEX',x:69,y:119,kind:'shop'},
 {name:'홍익문고',x:76,y:136,kind:'book'},
 {name:'창천문화공원',x:55,y:117,kind:'park'},
 {name:'연세대 정문',x:73,y:49,kind:'campus'},
 {name:'백양로',x:82,y:23,kind:'road'},
 {name:'연세로',x:74,y:100,kind:'road'},
 {name:'명물길',x:99,y:87,kind:'road'},
 {name:'성산로',x:104,y:57,kind:'road'},
 {name:'신촌로',x:100,y:139,kind:'road'},
 {name:'서강로',x:63,y:170,kind:'road'},
];
street.labels=worldPOIs;
// Clear only the footprint of entrances; exact locations are preserved from OSM.
const exitInside={1:[9,5],2:[24,4],3:[33,4],4:[49,5],5:[53,24],6:[38,26],7:[21,26],8:[6,23]};
for(const exit of WORLD_DATA.exits){const [tx,ty]=exitInside[exit.number];addPortal(street,exit.x,exit.y,'station',tx,ty+ (exit.number<=4?2:-2),`신촌역 ${exit.number}번 출구`,{exit:exit.number});}
street.spawn={x:72,y:137};
// Department-store surface entrance beside the actual underground entrance node.
addPortal(street,60,138,'mall',25,6,'현대백화점 지하 입구');
addNPC(street,74,137,'신촌 길잡이',['지금 서 있는 곳은 2호선 신촌역 2번 출구 앞이에요. 위쪽이 북쪽이에요.','북쪽 연세로를 따라가면 명물길 갈림길, 성산로, 연세대학교 정문 순서로 만나게 돼요.','백화점은 역의 북서쪽이에요. 역 안 1번 출구 쪽에서 B2로 연결되고, 식품관은 한 층 위 B1이에요.'],'guide');
addNPC(street,72,117,'거리의 연주자',['여기는 U-PLEX 앞 연세로예요. 잠깐 노래 듣고 가실래요?','M을 누르면 지금 서 있는 위치와 실제 길 모양을 볼 수 있어요.'],'musician');
addNPC(street,78,37,'책 읽는 학생',['성산로를 건너 연세대학교 정문에 도착했네요. 여기서부터 백양로예요.','서쪽에는 공학관, 동쪽에는 백주년기념관과 세브란스가 있어요.','오늘 산책의 기념으로 은행잎을 드릴게요.'],'student','은행잎');
addNPC(street,78,136,'서점을 찾은 사람',['홍익문고는 신촌역 3번 출구 가까이에 있어요.','골목 모양을 기억해두면 다시 올 때 길 찾기가 쉬워지죠.'],'girl');
// Trees and street furniture are decorative and never block a verified road tile.
for(let y=4;y<street.h-4;y+=3)for(let x=4;x<street.w-4;x+=3)if(street.tiles[y][x]===0&&street.tiles[y][x+1]===0&&street.tiles[y+1][x]===0&&(x*13+y*7)%5<2){street.trees.push({x,y});}
for(const [x,y] of [[70,127],[78,126],[71,111],[77,98],[72,78],[77,65]]){const pos=nearestWalkable(street,x,y);street.props.push({...pos,type:'lamp'});}
sealMap(street);
const station=makeMap(60,31,4);maps.station=station;sealMap(station);
area(station,2,12,56,2,7);area(station,2,28,56,2,8);
addBuilding(station,12,7,7,3,'승차권','#628b75');addBuilding(station,40,7,8,3,'안내소','#66868e');
addBuilding(station,10,19,8,4,'편의점','#959b66');addBuilding(station,42,19,7,4,'보관함','#8796a6');
for(const exit of WORLD_DATA.exits){const [x,y]=exitInside[exit.number];const target=nearestWalkable(street,exit.x,exit.y-2);addPortal(station,x,y,'street',target.x,target.y,`${exit.number}번 출구 · ${exit.number===1?'현대백화점':exit.number===2||exit.number===3?'연세로':'신촌로'}`,{exit:exit.number});}
addPortal(station,2,9,'mall',36,18,'← 현대백화점 B2 · 1번 출구 쪽');
for(const x of [22,26,30,34,38])station.props.push({x,y:17,type:'gate',solid:true});
addNPC(station,22,10,'역무원',['2호선 신촌역입니다. 북쪽 2·3번 출구는 연세로와 연세대학교 방향입니다.','현대백화점은 서쪽 1번 출구 안의 연결 통로를 이용하세요. 연결되는 층은 B2입니다.'],'officer');
station.spawn={x:24,y:6};station.labels=[{x:30,y:14,name:'2호선 신촌역',kind:'station'}];
const mall=makeMap(42,29,4);maps.mall=mall;sealMap(mall);
addBuilding(mall,4,4,12,6,'GROUND SINCHON','#927f91');addBuilding(mall,28,4,10,6,'POP-UP','#859c8c');addBuilding(mall,5,20,12,5,'LIFESTYLE','#899dab');
area(mall,18,4,8,21,7);addPortal(mall,39,18,'station',4,9,'신촌역 1번 출구 쪽 →');addPortal(mall,21,7,'store',21,22,'에스컬레이터 · B1 식품관 ↑');addPortal(mall,25,3,'street',60,140,'신촌로 · 지상 ↑');
addNPC(mall,23,13,'백화점 안내 직원',['신촌역 연결층인 B2에 오셨어요.','식품관은 북쪽 에스컬레이터로 한 층 올라가면 됩니다. 역으로 돌아가는 길은 동쪽이에요.'],'clerk');mall.spawn={x:36,y:18};
const store=makeMap(42,29,5);maps.store=store;sealMap(store);
addBuilding(store,4,4,10,5,'델리 · 베이커리','#c39866','stall');addBuilding(store,18,4,9,5,'현대식품관','#8c9c66','stall');addBuilding(store,31,4,7,5,'SWEETS','#bd8a8d','stall');addBuilding(store,4,18,10,6,'청과 · 야채','#7c9e7d','stall');addBuilding(store,29,18,9,6,'푸드코트','#a48b72','stall');
addPortal(store,21,25,'mall',21,9,'에스컬레이터 · B2 연결층 ↓');
addNPC(store,10,10,'빵집 사장님',['어서 오세요. 여기는 현대백화점 B1 식품관이에요.','역에서 오셨다면 B2를 거쳐 올라오셨겠네요. 갓 구운 소금빵 하나 드세요!'],'baker','소금빵');
addNPC(store,28,13,'식품관 직원',['맛있는 냄새를 따라 천천히 둘러보세요.','지하철은 남쪽 에스컬레이터로 B2에 내려가서 동쪽 연결 통로를 이용하면 돼요.'],'clerk');
for(const x of [17,22,27])store.props.push({x,y:15,type:'table',solid:true});store.spawn={x:21,y:22};
function placeAt(zone,x,y){if(zone!=='street')return MAP_NAMES[zone];if(y<campusLine)return MAP_NAMES.campus;if(y>=134)return '신촌역 · 신촌로';if(x>80&&y<110)return '명물길 · 신촌거리';return '연세로 · 신촌거리';}
