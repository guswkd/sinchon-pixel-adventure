'use strict';
const INK='#293742',CREAM='#fff8e2';
function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
function txt(s,x,y,c=INK,size=10){ctx.font=`${size}px Galmuri9, monospace`;ctx.fillStyle=c;ctx.textAlign='center';ctx.fillText(s,Math.round(x),Math.round(y));}
function outline(x,y,w,h,fill,line=INK){rect(x,y,w,h,line);rect(x+1,y+1,w-2,h-2,fill);}
function drawTile(m,t,x,y,ix,iy){
 if(t===9){
  rect(x,y,16,16,zone==='street'?'#e9e4d7':'#d9d7cb');return;
 }
 if(t===0){rect(x,y,16,16,'#83ad67');const seed=(ix*17+iy*31)%7;if(seed<3){rect(x+3+seed*2,y+5,2,2,'#a2c57b');rect(x+8+seed,y+11,2,2,'#6e9859');}return;}
 if(t===1||t===7){rect(x,y,16,16,t===7?'#d9cda9':'#e8e2d2');if(t===7){rect(x,y+15,16,1,'#c0b38f');rect(x+8*(iy%2),y,1,16,'#c9bd9d');}else{rect(x,y+15,16,1,'#d9d2c1');if((ix+iy)%5===0)rect(x+5,y+5,1,1,'#c9c4b7');}return;}
 if(t===2||t===3){rect(x,y,16,16,'#89969a');if(t===3){const horizontal=m.tiles[iy]?.[ix-1]===2||m.tiles[iy]?.[ix+1]===2;if(horizontal){rect(x,y+2,16,3,'#f0e7cc');rect(x,y+10,16,3,'#f0e7cc');}else{rect(x+2,y,3,16,'#f0e7cc');rect(x+10,y,3,16,'#f0e7cc');}}else if((ix*7+iy*11)%9===0){rect(x+4,y+5,2,1,'#748287');}return;}
 if(t===4||t===5){rect(x,y,16,16,t===4?'#c5d0c8':'#efdfb6');rect(x,y+15,16,1,t===4?'#9ead9f':'#d0bf96');rect(x+15,y,1,16,t===4?'#9ead9f':'#d0bf96');if((ix+iy)%3===0)rect(x+3,y+3,2,2,t===4?'#d7dfd3':'#f8edce');return;}
 if(t===10){rect(x,y,16,16,'#d8d0bd');rect(x+1,y+1,14,14,'#eee7d8');rect(x+1,y+14,14,1,'#c2b8a5');if((ix+iy)%3===0)rect(x+7,y+6,2,4,'#b9a66c');return;}
 if(t===6){rect(x,y,16,16,'#344b58');rect(x+1,y+1,14,14,'#9a967f');for(let i=0;i<4;i++){rect(x+2,y+2+i*3,12,1,'#e9dec0');rect(x+2,y+3+i*3,12,1,'#706f66');}rect(x,y,2,16,'#263944');rect(x+14,y,2,16,'#263944');return;}
 if(t===8&&zone!=='street'){rect(x,y,16,16,'#37434b');if(m.tiles[iy+1]?.[ix]!==8){rect(x,y+10,16,6,'#a9b5b1');rect(x,y+10,16,2,'#dce3d9');rect(x,y+14,16,2,'#708482');}return;}
 if(t===8){rect(x,y,16,16,'#597951');outline(x,y,16,9,'#83a764','#3f614b');rect(x+2,y+2,11,1,'#b0ca7c');rect(x+2,y+5,1,2,'#527148');}
}
function pane(x,y,w,h){outline(x,y,w,h,'#5888b0');rect(x+2,y+2,w-4,h-4,'#a0d0e0');rect(x+2,y+2,Math.max(1,Math.floor(w/3)),h-4,'#d8f0e8');rect(x+Math.floor(w/2),y+1,1,h-2,'#486880');rect(x+1,y+Math.floor(h/2),w-2,1,'#486880');}
function door(x,y,w=16,h=20){outline(x,y,w,h,'#385070');rect(x+2,y+2,w-4,h-3,'#88b8c8');rect(x+2,y+2,3,h-3,'#d8e8d8');rect(x+w/2,y+1,1,h-2,INK);rect(x+w/2-3,y+h/2,2,2,'#f8d878');}
function sign(s,x,y,w,fill='#f8f0d0',ink=INK){outline(x,y,w,14,fill);txt(s,x+w/2,y+11,ink,10);}
function footprintPath(points,cx,cy,offsetX=0,offsetY=0){
 ctx.beginPath();points.forEach(([px,py],i)=>{const x=Math.round(px*T-cx+offsetX),y=Math.round(py*T-cy+offsetY);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();
}
function drawBuilding(b,buildingId,m,cx,cy){
 const x=b.x*T-cx,y=b.y*T-cy,w=b.w*T,h=b.h*T;
 if(b.footprint){
  // Keep OSM outlines, but render each parcel as one calm, crisp roof shape.
  const minX=Math.max(0,Math.floor(cx/T)),maxX=Math.min(m.w-1,Math.ceil((cx+canvas.width)/T));
  const minY=Math.max(0,Math.floor(cy/T)),maxY=Math.min(m.h-1,Math.ceil((cy+canvas.height)/T));
  ctx.save();footprintPath(b.points,cx,cy);ctx.clip();ctx.beginPath();
  for(let ty=minY;ty<=maxY;ty++)for(let tx=minX;tx<=maxX;tx++)if(m.buildingAt[ty][tx]===buildingId)ctx.rect(tx*T-cx,ty*T-cy,T,T);
  ctx.clip();
  const roofPalette=['#b9b8ae','#c1beb3','#b5bab4','#c5c0b2'];
  const fill=b.type==='block'?roofPalette[buildingId%roofPalette.length]:b.type==='hyundai'?'#d9d5c8':b.type==='uplex'?'#79a0a7':b.type==='bookshop'?'#b87667':b.type==='campus'?'#bcb5a5':b.roof;
  rect(x,y,w,h,fill);
  if(b.type==='hyundai'){
   if(w>20&&h>20){rect(x+4,y+4,w-8,h-8,'#e6e1d5');if(h>w){rect(x+w*.64,y+8,Math.max(5,w*.16),h-16,'#91adb0');rect(x+5,y+8,w*.48,4,'#c2c0b5');}else{rect(x+8,y+h*.62,w-16,Math.max(5,h*.16),'#91adb0');rect(x+8,y+5,4,h*.48,'#c2c0b5');}}
   if(b.label&&w>72&&h>64)sign('현대',x+7,y+h-22,Math.min(w-14,54),'#f2eee1','#52636a');
  }else if(b.type==='uplex'){
   if(w>20&&h>20){rect(x+4,y+4,w-8,h-8,'#91b2b6');for(let i=1;i<4;i++)rect(x+5,y+Math.floor(h*i/4),w-10,2,'#71999f');if(w>72&&h>50)outline(x+w*.2,y+h*.34,w*.6,h*.28,'#426b78','#385763');}
   if(b.label&&w>70&&h>55)sign('U-PLEX',x+6,y+h-21,Math.min(w-12,72),'#385a67','#f8f4df');
  }else if(b.type==='bookshop'){
   if(w>20&&h>20){rect(x+4,y+4,w-8,h-8,'#c78c78');if(w>48&&h>40){rect(x+9,y+9,w-18,5,'#ead3ad');rect(x+9,y+21,w-18,Math.max(4,h*.12),'#9b5c52');}}
   if(b.label&&w>42&&h>34)sign('홍익문고',x+4,y+h-19,Math.min(w-8,96),'#934c43','#fff8d8');
  }else if(b.type==='campus'){
   if(w>20&&h>20){rect(x+4,y+4,w-8,h-8,'#d0c9b8');if(w>60&&h>48){rect(x+9,y+9,w-18,6,'#a9a08f');rect(x+9,y+21,Math.max(10,w*.26),Math.max(8,h*.12),'#b8b09e');}}
   if(b.label&&w>74&&h>66)sign(b.label,x+5,y+h-20,Math.min(w-10,104),'#eee8d9','#586064');
  }else if(w>52&&h>48){
   const roofW=Math.min(28,w-18),roofH=Math.min(18,h-18);outline(x+9,y+9,roofW,roofH,'#c9c6bb','#a5a398');rect(x+12,y+12,Math.max(5,roofW-6),2,'#aaa99f');
  }
  ctx.restore();
  ctx.save();footprintPath(b.points,cx,cy);ctx.strokeStyle=b.type==='uplex'?'#476c72':b.type==='hyundai'?'#978f7e':b.type==='bookshop'?'#7e4e48':'#8f8b81';ctx.lineWidth=1;ctx.stroke();ctx.restore();
  return;
 }
 rect(x+4,y+5,w,h,'#786878');outline(x,y,w,h,'#e8d8b0');
 if(b.type==='block'){
  const roofH=Math.max(12,Math.floor(h*.55));
  outline(x+1,y+1,w-2,roofH,b.roof);rect(x+3,y+3,w-6,2,'#d8d0b0');
  for(let j=8;j<roofH-2;j+=5)rect(x+3,y+j,w-6,1,'#686068');
  outline(x+w-15,y+6,10,7,'#c8c8b8');rect(x+w-13,y+8,6,1,'#787880');rect(x+w-13,y+10,6,1,'#787880');
  rect(x+1,y+roofH,w-2,3,INK);
  for(let j=roofH+6;j<h-12;j+=13)for(let i=4;i<w-10;i+=15)pane(x+i,y+j,10,9);
  for(let i=3;i<w-2;i+=7){rect(x+i,y+h-12,6,4,i%2?'#f0d890':b.roof);rect(x+i,y+h-8,6,1,INK);}
  door(x+w/2-5,y+h-8,10,8);return;
 }
 if(b.type==='uplex'){
  // Blue curtain wall, flat roof, big media facade and dark shop frontage.
  rect(x+2,y+2,w-4,h-3,'#7098c0');rect(x+2,y+2,w-4,5,'#d0e8e8');
  for(let j=8;j<h-16;j+=12)for(let i=3;i<w-8;i+=10){rect(x+i,y+j,8,10,(i+j)%3===0?'#c0e0e8':'#80b8d0');rect(x+i+1,y+j,2,8,'#c8e8e8');}
  sign('U-PLEX',x+w/2-25,y+4,50,'#304860','#f8f8e0');
  outline(x+9,y+24,w-18,27,'#304070');
  rect(x+11,y+26,w-22,23,'#6898c0');
  // A little animated, original pixel sky on the media screen.
  for(let i=0;i<4;i++){const xx=x+15+i*16,yy=y+31+[0,-2,0,2][(Math.floor(time/320)+i)%4];rect(xx,yy,8,5,['#f8d068','#f0a0b0','#c8e0a0','#e8d8f0'][i]);rect(xx+2,yy-2,4,2,'#fff0d0');}
  rect(x+2,y+h-23,w-4,21,'#405068');txt('U-PLEX',x+w/2,y+h-14,'#fff8d8',10);door(x+w/2-12,y+h-12,24,12);
  return;
 }
 if(b.type==='hyundai'){
  rect(x+2,y+2,w-4,h-3,'#e8e0c8');outline(x+4,y+4,w-8,12,'#c0b8a8');rect(x+6,y+6,w-12,3,'#f8f0d8');
  for(let j=22;j<h-22;j+=13){rect(x+3,y+j+10,w-6,2,'#b8b0a0');for(let i=7;i<w-20;i+=25)pane(x+i,y+j,19,9);}
  // Curved vertical glass bay on the white stone main building.
  outline(x+w-32,y+16,24,h-19,'#6088a0');rect(x+w-29,y+18,6,h-24,'#c0e0e0');rect(x+w-22,y+18,8,h-24,'#88b8c8');for(let j=23;j<h-7;j+=12)rect(x+w-31,y+j,22,2,'#385870');
  sign('현대백화점',x+9,y+h-28,w-47,'#f8f0d8','#385068');door(x+39,y+h-13,28,13);return;
 }
 if(b.type==='bookshop'){
  outline(x+2,y+2,w-4,17,'#a84840');for(let j=5;j<17;j+=4)rect(x+4,y+j,w-8,1,'#d08860');
  sign('홍익문고',x+3,y+21,w-6,'#b83830','#fff8d8');
  for(let i=4;i<w-20;i+=22){const shelfY=y+h-15;outline(x+i,shelfY,18,14,'#fff0c8');for(let k=0;k<4;k++)rect(x+i+2+k*4,shelfY+2+(k%2),3,8,['#506898','#b85848','#789850','#d8a848'][k]);rect(x+i+1,shelfY+11,16,2,'#786040');}
  door(x+w-19,y+h-13,16,13);return;
 }
 if(['stall','produce','counter'].includes(b.type)){
  // Interiors: shelves and service counters, not roofs on indoor shops.
  rect(x+2,y+2,w-4,h-4,'#f8e8c8');sign(b.label,x+3,y+3,w-6,b.roof,INK);
  for(let j=21;j<h-12;j+=13){rect(x+4,y+j+9,w-8,3,'#806850');for(let i=6;i<w-10;i+=10){const color=b.type==='produce'?['#789840','#d87838','#c84840'][i%3]:['#d0a048','#f0d888','#a87840'][i%3];outline(x+i,y+j,7,8,color,'#886838');}}
  outline(x+2,y+h-11,w-4,10,b.roof);rect(x+4,y+h-10,w-8,2,'#fff0c8');return;
 }
 // Small shops and campus masonry share a limited tile palette but distinct roofs.
 const rh=b.type==='campus'?22:20;
 outline(x+1,y+1,w-2,rh,b.roof);rect(x+3,y+3,w-6,3,'#f0e0a0');
 for(let j=8;j<rh-2;j+=4){rect(x+3,y+j,w-6,1,'#605858');for(let i=8;i<w-4;i+=16)rect(x+i+(j%8?0:8),y+j-3,1,3,'#605858');}
 for(let yy=rh+6;yy<h-25;yy+=6){rect(x+2,y+yy,w-4,1,'#c0b088');for(let xx=5+(yy%12?6:0);xx<w-3;xx+=12)rect(x+xx,y+yy,1,6,'#c0b088');}
 rect(x+1,y+rh,w-2,4,INK);rect(x+3,y+rh+1,w-6,2,'#fff0d0');
 if(b.type==='campus'){
  for(let j=rh+8;j<h-24;j+=19)for(let i=7;i<w-12;i+=19)pane(x+i,y+j,12,14);
  for(let yy=rh+6;yy<h-5;yy+=9){rect(x+2,y+yy,5,5,'#789868');rect(x+w-8,y+yy+2,5,5,'#98b878');}
 }else{for(let i=7;i<w-13;i+=24)pane(x+i,y+rh+8,16,20);}
 sign(b.label,x+4,y+h-24,w-8,b.type==='foodshop'?'#c85840':b.type==='cafe'?'#486850':'#f8e8c0',b.type==='foodshop'||b.type==='cafe'?'#fff8d8':INK);
 door(x+w/2-8,y+h-10,16,10);
 if(b.type!=='campus'){for(let i=5;i<w-5;i+=8){rect(x+i,y+h-9,7,3,i%16<8?'#f8e8b0':b.roof);rect(x+i,y+h-6,7,1,INK);}outline(x+4,y+h-7,9,7,'#986840');rect(x+3,y+h-10,11,4,'#487848');rect(x+6,y+h-12,5,3,'#88b058');outline(x+w-17,y+rh+5,12,8,'#d8d0b8');for(let i=0;i<3;i++)rect(x+w-15,y+rh+7+i*2,8,1,'#888878');}
}
function drawTree(x,y){
 rect(x+6,y+9,5,7,'#806038');rect(x+8,y+11,2,5,'#c09858');
 rect(x+3,y-7,10,19,'#385848');rect(x+1,y-3,14,13,'#385848');
 rect(x+3,y-4,10,12,'#689850');rect(x+5,y-6,6,16,'#689850');
 rect(x+4,y-4,5,3,'#b0d070');rect(x+2,y+1,4,3,'#90b860');rect(x+9,y,4,5,'#487840');rect(x+5,y+7,6,2,'#385848');
}
function drawProp(p,x,y){
 if(p.type==='lamp'){outline(x+6,y-17,3,32,'#c0b890');outline(x+2,y-22,11,8,'#f8d888');rect(x+3,y-21,8,2,'#fff0b0');rect(x+3,y+14,9,2,INK);}
 if(p.type==='periscope'){
  // The red U-PLEX meeting-point sculpture: bent top, large circular face, post.
  rect(x-2,y+12,25,4,'#b09888');outline(x+7,y-22,9,37,'#d84830');rect(x+8,y-20,2,33,'#f88848');
  outline(x-3,y-29,17,15,'#d84830');rect(x-5,y-26,4,9,'#b03028');outline(x-2,y-27,10,11,'#fff0d8');rect(x+2,y-25,1,6,INK);rect(x+2,y-20,3,1,INK);rect(x+7,y-29,8,6,'#f87040');
 }
 if(p.type==='gatepost'){outline(x+1,y-14,14,30,'#d8d0b8');rect(x,y-16,16,5,'#a8a098');rect(x+5,y-10,6,12,'#485890');txt('Y',x+8,y,'#fff8d8',10);rect(x+3,y+12,10,3,'#a8a098');}
 if(p.type==='eagle'){outline(x+3,y+2,12,14,'#a8a0a0');rect(x-3,y-5,24,3,'#586858');rect(x,y-8,18,3,'#788870');rect(x+6,y-10,6,15,'#485848');rect(x+10,y-12,5,4,'#788870');}
 if(p.type==='bench'){outline(x-2,y,22,6,'#c09050');outline(x-2,y+8,22,4,'#c09050');rect(x+1,y+12,3,4,INK);rect(x+15,y+12,3,4,INK);}
 if(p.type==='gate'){outline(x,y-1,12,17,'#98b0a8');rect(x+2,y+1,8,4,'#385868');rect(x+4,y+2,4,2,'#b8e078');rect(x+11,y+7,5,2,'#d87048');}
 if(p.type==='column'){outline(x+3,y+1,10,14,'#8b9290');rect(x+5,y+3,6,10,'#c8ccc0');rect(x+2,y,12,3,'#e8e0c8');rect(x+2,y+14,12,2,'#687078');}
 if(p.type==='platformSign'){rect(x+7,y+4,2,13,INK);outline(x-38,y-9,92,15,'#e8e0c8');txt(p.text,x+8,y+2,INK,8);}
 if(p.type==='table'){outline(x-2,y,20,11,'#f8e0b0');rect(x+1,y+11,3,5,INK);rect(x+13,y+11,3,5,INK);rect(x+5,y+2,6,4,'#789850');}
 if(p.type==='bus'){outline(x,y-9,44,22,'#5078b0');rect(x+2,y-7,40,8,'#c0e0e8');for(let i=10;i<38;i+=9)rect(x+i,y-7,2,8,'#385078');rect(x+3,y+6,37,2,'#f8f0c8');rect(x+6,y+12,7,5,INK);rect(x+31,y+12,7,5,INK);}
 if(p.type==='sign'){const w=Math.max(48,Math.min(144,p.text.length*9+8));rect(x+7,y+5,2,12,INK);sign(p.text,x+8-w/2,y-9,w,'#e8d078');}
}
function drawPortal(p,cx,cy){
 const x=p.x*T-cx,y=p.y*T-cy;
 if(p.exit){
  // Green line-2 pylon plus stair railings, readable without floating place labels.
  outline(x-4,y-19,3,33,'#90a0a0');outline(x-9,y-26,16,15,'#f8f0d0');rect(x-7,y-24,12,5,'#509048');txt(String(p.exit),x-1,y-12,INK,10);
  rect(x,y-1,32,2,'#f8f0d8');rect(x-1,y,2,16,'#687880');rect(x+31,y,2,16,'#687880');
 }else{
  if(p.door){rect(x,y+3,32,2,'#e0c67b');rect(x,y+13,32,2,'#e0c67b');}
  const title=p.sign||(p.target==='store'?'B1 ↑':p.target==='mall'?'B2 ↓':p.target==='station'?'역 →':'지상 ↑');
  sign(title,x-3,y-23,p.sign==='U-PLEX ↑'?57:39,'#fff0c8');
 }
}
function draw(){
 const m=maps[zone],v=visualPosition(),W=canvas.width,H=canvas.height;
 const cx=Math.floor(Math.max(0,Math.min(m.w*T-W,v.x*T-W/2+8))),cy=Math.floor(Math.max(0,Math.min(m.h*T-H,v.y*T-H*.62+8)));
 ctx.clearRect(0,0,W,H);
 for(let y=Math.floor(cy/T);y<Math.min(m.h,Math.ceil((cy+H)/T));y++)for(let x=Math.floor(cx/T);x<Math.min(m.w,Math.ceil((cx+W)/T));x++)drawTile(m,m.tiles[y][x],x*T-cx,y*T-cy,x,y);
 const orderedBuildings=m.orderedBuildings||(m.orderedBuildings=m.buildings.map((b,index)=>({b,index})).sort((a,b)=>(a.b.y+a.b.h)-(b.b.y+b.b.h)));
 for(const {b,index} of orderedBuildings)if(b.x*T<cx+W&&(b.x+b.w)*T>cx&&b.y*T<cy+H&&(b.y+b.h)*T>cy)drawBuilding(b,index,m,cx,cy);
 const objects=[...m.trees.map(o=>({...o,type:'tree'})),...m.props,...m.npcs.map(o=>({...o,type:'npc'})),{...v,type:'hero'}].filter(o=>o.x*T>cx-50&&o.x*T<cx+W+50&&o.y*T>cy-50&&o.y*T<cy+H+50).sort((a,b)=>a.y-b.y);
 for(const o of objects){const x=o.x*T-cx,y=o.y*T-cy;if(o.type==='tree')drawTree(x,y);else if(o.type==='hero'||o.type==='npc'){const hero=o.type==='hero',step=hero&&animation?(player.step%2?1:2):0;paintSprite(ctx,x,y-(hero?5:1),hero?'hero':o.style,hero?player.dir:o.dir,step);}else drawProp(o,x,y);}
 for(const p of m.portals)if(p.x*T>cx-40&&p.x*T<cx+W+40&&p.y*T>cy-30&&p.y*T<cy+H+30)drawPortal(p,cx,cy);
 // Location lettering is on signs and facades; avoid a map-label layer over the field.
 if(zone==='street'&&m.campusGate){const g=m.campusGate;if(Math.abs(player.y-g.y)<14)sign('연세대학교',(g.x+.5)*T-cx-29,g.y*T-cy-22,58,'#e8e0c8');}
 const n=nearby();if(n&&n.kind!=='portal'&&!dialog&&$('#map-overlay').hidden&&$('#journal-overlay').hidden){const x=v.x*T-cx,y=v.y*T-cy;outline(x+3,y-13,10,10,'#fff8d8');txt('!',x+8,y-5,INK,10);}
 $('#hint').textContent=n?(n.kind==='portal'?`${n.label} · 밟으면 입장 · E / Space`:`${n.name} · E / Space`):'짧게 방향 전환 · 길게 걷기 · 계단은 밟으면 입장';
}
function renderMap(){
 const map=$('#world-map');map.width=Math.max(220,Math.round(map.clientWidth||480));map.height=Math.max(260,Math.round(map.clientHeight||460));
 const c=map.getContext('2d'),W=map.width,H=map.height,m=maps[zone],s=Math.min((W-20)/m.w,(H-54)/m.h),ox=(W-m.w*s)/2,oy=25+(H-54-m.h*s)/2;
 c.imageSmoothingEnabled=false;c.fillStyle='#fff8d8';c.fillRect(0,0,W,H);
 const colors=['#83ad67','#e8e2d2','#89969a','#f0e7cc','#c5d0c8','#efdfb6','#344b58','#d9cda9',zone==='street'?'#597951':'#37434b','#b9b6aa','#d8d0bd'];
 const rgb=colors.map(color=>{const value=parseInt(color.slice(1),16);return [(value>>16)&255,(value>>8)&255,value&255];});
 const buildingColors={block:'#b9b8ae',hyundai:'#d9d5c8',uplex:'#79a0a7',bookshop:'#b87667',campus:'#bcb5a5',counter:'#98a79f',stall:'#d2b27a',produce:'#8ea56b'};
 const tileColor=(tx,ty)=>{const t=m.tiles[ty][tx];if(t!==9)return rgb[t];const b=m.buildings[m.buildingAt[ty][tx]];const color=buildingColors[b?.type]||'#b9b6aa',value=parseInt(color.slice(1),16);return [(value>>16)&255,(value>>8)&255,value&255];};
 const image=c.createImageData(W,H),pixels=image.data;
 for(let py=Math.max(0,Math.floor(oy));py<Math.min(H,Math.ceil(oy+m.h*s));py++)for(let px=Math.max(0,Math.floor(ox));px<Math.min(W,Math.ceil(ox+m.w*s));px++){
  const tx=Math.floor((px+.5-ox)/s),ty=Math.floor((py+.5-oy)/s);if(tx<0||ty<0||tx>=m.w||ty>=m.h)continue;
  const color=tileColor(tx,ty),i=(py*W+px)*4;pixels[i]=color[0];pixels[i+1]=color[1];pixels[i+2]=color[2];pixels[i+3]=255;
 }
 c.putImageData(image,0,0);
 // Every anchor comes from the playable map; labels can move, their locations cannot.
 const project=(x,y)=>({x:Math.round(ox+(x+.5)*s),y:Math.round(oy+(y+.5)*s)}),me=project(player.x,player.y);
 const occupied=[{x:me.x-6,y:me.y-6,w:13,h:13}],placed=[];
 c.font='9px Galmuri9, monospace';c.textAlign='center';
 const overlaps=b=>occupied.some(a=>b.x<a.x+a.w+2&&b.x+b.w+2>a.x&&b.y<a.y+a.h+2&&b.y+b.h+2>a.y);
 function label(name,x,y,kind){
  const point=project(x,y),exit=kind==='exit',road=kind==='road',w=exit?9:Math.ceil(c.measureText(name).width)+8,h=exit?11:13;
  const offsets=exit?[[0,0]]:[[0,-11],[0,11],[-w/2-5,0],[w/2+5,0],[0,-19],[0,19]];
  if(exit)for(const d of [12,24,36])offsets.push([0,-d],[0,d],[-d,0],[d,0],[-d,-d],[d,-d],[-d,d],[d,d]);
  if(!exit)offsets.push([-w/2-5,-11],[w/2+5,-11],[-w/2-5,11],[w/2+5,11]);
  let box=null;
  for(const [dx,dy] of offsets){const b={x:Math.round(point.x+dx-w/2),y:Math.round(point.y+dy-h/2),w,h};if(b.x<4||b.x+w>W-4||b.y<24||b.y+h>H-28||overlaps(b))continue;box=b;break;}
  if(!box)return;
  occupied.push(box);placed.push({name,point,box,exit,road,kind});
 }
 if(zone==='street'){
  for(const p of m.portals.filter(p=>p.exit).sort((a,b)=>a.exit-b.exit))label(String(p.exit),p.x,p.y,'exit');
  const priority={station:0,store:1,book:2,shop:3,campus:4,park:5,road:6};
  for(const a of [...m.labels].filter(a=>['store','shop','book','campus','landmark'].includes(a.kind)||['연세로','명물길'].includes(a.name)).sort((a,b)=>(priority[a.kind]??5)-(priority[b.kind]??5)))label(a.name,a.x,a.y,a.kind);
 }else{
  for(const p of m.portals)label(p.sign||(p.exit?String(p.exit)+'번':p.target==='store'?'B1 ↑':p.target==='mall'?'B2 연결':p.target==='street'?'지상 ↑':'신촌역 →'),p.x,p.y,'indoor');
  for(const a of m.labels)label(a.name,a.x,a.y,'indoor');
 }
 // Draw all leaders below labels so a later annotation cannot cross another word.
 c.lineWidth=1;
 for(const {point,box,road,exit} of placed){
  const bx=Math.max(box.x,Math.min(box.x+box.w,point.x)),by=Math.max(box.y,Math.min(box.y+box.h,point.y));
  if(Math.hypot(bx-point.x,by-point.y)>2){c.strokeStyle=exit?'#487840':road?'#989078':'#706858';c.beginPath();c.moveTo(point.x+.5,point.y+.5);c.lineTo(bx+.5,by+.5);c.stroke();c.fillStyle=c.strokeStyle;c.fillRect(point.x-1,point.y-1,3,3);}
 }
 for(const {name,box,exit,road,kind} of placed){
  const fill=exit?'#487840':kind==='station'?'#486840':road?'#e8e0c8':INK;
  c.fillStyle=fill;c.fillRect(box.x,box.y,box.w,box.h);c.fillStyle=road?'#585040':'#fff8d8';c.fillText(name,box.x+box.w/2,box.y+box.h-4);
 }
 c.fillStyle=INK;c.fillRect(me.x-5,me.y-5,11,11);c.fillStyle='#fff8d8';c.fillRect(me.x-4,me.y-4,9,9);c.fillStyle='#e84828';c.fillRect(me.x-2,me.y-2,5,5);
 c.textAlign='left';c.fillStyle=INK;c.fillText('N ↑',10,15);
 c.fillStyle='#e84828';c.fillRect(11,H-17,5,5);c.fillStyle=INK;c.fillText('내 위치',21,H-11);
 if(m.metresPerTile){
  const length=Math.round(100/(m.metresPerTile||6)*s),sx=W-length-12,sy=14;
  c.fillRect(sx,sy,length,2);c.fillRect(sx,sy-3,1,6);c.fillRect(sx+length-1,sy-3,1,6);c.textAlign='right';c.fillText('100 m',W-12,sy-5);
  c.fillStyle='#807860';c.fillText('© OpenStreetMap',W-10,H-11);
 }
 $('#map-location').textContent=`현재 위치 · ${placeAt(zone,player.x,player.y)}`;
}
