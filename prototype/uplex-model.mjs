// Simplified surveyed envelope; facade depths are illustrative, not measured.
export function addUplexDetails(THREE,scene,b,{texture,textTexture,inside,flat}){
 const objects=[],floor=b.height/b.survey.floors;
 const glass=texture(128,192,c=>{
  c.fillStyle='#326c87';c.fillRect(0,0,128,192);
  // Twelve distinct storeys, with finer curtain-wall mullions within each.
  for(let f=0;f<12;f++){
   const y=f*16;c.fillStyle=f<8?'#43859f':'#579bb0';c.fillRect(0,y+2,128,12);
   for(let x=0;x<128;x+=8){c.fillStyle=(x/8+f)%4===0?'#82b7c7':'#5494ae';c.fillRect(x+1,y+3,6,10);}
   c.fillStyle='#b4c8cd';c.fillRect(0,y,128,1);
  }
  c.fillStyle='#d3e1df';for(let x=0;x<128;x+=32)c.fillRect(x,0,2,192);
 });
 const add=(mesh)=>{scene.add(mesh);objects.push(mesh);return mesh;};
 // Survey entrance nodes split straight walls; combine them only for facade panels.
 const facade=b.points.slice(0,-1).filter((p,i,points)=>{
  const a=points[(i+points.length-1)%points.length],q=points[(i+1)%points.length];
  const ax=p.x-a.x,az=p.z-a.z,bx=q.x-p.x,bz=q.z-p.z;
  return Math.abs(ax*bz-az*bx)/(Math.hypot(ax,az)*Math.hypot(bx,bz))>.035;
 });facade.push(facade[0]);
 for(let i=1;i<facade.length;i++){
  const a=facade[i-1],p=facade[i],len=Math.hypot(p.x-a.x,p.z-a.z);if(len<.2)continue;
  const mx=(a.x+p.x)/2,mz=(a.z+p.z)/2;let nx=-(p.z-a.z)/len,nz=(p.x-a.x)/len;
  if(inside({x:mx+nx*.1,z:mz+nz*.1},b.points)){nx=-nx;nz=-nz;}
  const face=(w,h,y,depth,map,color='#ffffff')=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshLambertMaterial({map,color,side:THREE.DoubleSide,transparent:true,alphaTest:.05}));m.position.set(mx+nx*depth,y,mz+nz*depth);m.rotation.y=Math.atan2(nx,nz);return add(m);};
  face(len,b.height,b.height/2,.025,glass);
  // Shallow projecting lower facade on the plaza/street-facing long edges.
  if(len>3&&(nz<-.45||nx>.7)){
   const pod=new THREE.Mesh(new THREE.BoxGeometry(len*.78,floor*2,.24),new THREE.MeshLambertMaterial({color:'#578b9d'}));
   pod.position.set(mx+nx*.13,floor*4.1,mz+nz*.13);pod.rotation.y=Math.atan2(nx,nz);add(pod);
   face(len*.76,floor*1.84,floor*4.1,.27,texture(96,48,c=>{c.fillStyle='#305e75';c.fillRect(0,0,96,48);c.fillStyle='#a7cbd4';for(let x=0;x<96;x+=6)c.fillRect(x,0,1,48);}));
   face(len*.75,.65,b.height-.9,.06,textTexture('U-PLEX',null,'#ffffff'));
   if(nz<-.45){
    // Neutral artwork; no copied advertising creative.
    face(len*.69,floor*1.55,floor*4.15,.29,texture(128,64,c=>{c.fillStyle='#163c65';c.fillRect(0,0,128,64);c.fillStyle='#5cd0ca';c.beginPath();c.arc(96,18,35,0,7);c.fill();c.fillStyle='#ffcf80';c.fillRect(12,13,5,38);c.fillStyle='#fff9ed';c.font='bold 18px sans-serif';c.fillText('SINCHON',24,36);}));
   }
   // Glazed ground-level bays stay on the existing footprint.
   face(len*.8,floor*.8,floor*.42,.05,texture(128,32,c=>{c.fillStyle='#264f61';c.fillRect(0,0,128,32);c.fillStyle='#b4d8de';for(let x=0;x<128;x+=16){c.fillRect(x+2,3,12,26);c.fillStyle='#7195a4';c.fillRect(x+2,23,12,6);c.fillStyle='#b4d8de';}}));
  }
 }
 const roof=b.points.map(p=>({x:b.center.x+(p.x-b.center.x)*.78,z:b.center.z+(p.z-b.center.z)*.78}));
 objects.push(flat(roof,'#7aab86',b.height+.05));
 // Rooftop railing: the garden is not represented as a thirteenth full floor.
 for(let i=1;i<roof.length;i++){
  const a=roof[i-1],p=roof[i],l=Math.hypot(p.x-a.x,p.z-a.z);const rail=new THREE.Mesh(new THREE.BoxGeometry(l,.26,.035),new THREE.MeshLambertMaterial({color:'#d5e1e1'}));rail.position.set((a.x+p.x)/2,b.height+.2,(a.z+p.z)/2);rail.rotation.y=-Math.atan2(p.z-a.z,p.x-a.x);add(rail);
 }
 return objects;
}
