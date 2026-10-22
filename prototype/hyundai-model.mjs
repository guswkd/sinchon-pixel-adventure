// Photo-guided simplification; exact facade dimensions are not surveyed.
export function addHyundaiDetails(THREE,scene,b,{texture,textTexture,inside}){
 const objects=[],floor=b.height/12;
 const add=m=>{scene.add(m);objects.push(m);return m;};
 const facadeTexture=front=>texture(192,240,c=>{
  c.fillStyle='#ecece5';c.fillRect(0,0,192,240);
  c.fillStyle='#c8d0ce';for(let y=0;y<240;y+=5)c.fillRect(0,y,192,1);for(let x=0;x<192;x+=8)c.fillRect(x,0,1,240);
  // Retail floors are largely opaque; no invented rows of apartment windows.
  c.fillStyle='#998a80';c.fillRect(0,220,192,20);
  if(front){
   for(let y=27;y<80;y+=18){c.fillStyle='#386e79';c.fillRect(20,y,152,10);c.fillStyle='#9bc4c7';for(let x=22;x<171;x+=9)c.fillRect(x,y+1,2,8);}
   for(const x of [20,61,130,171]){c.fillStyle='#829ba0';c.fillRect(x,102,3,95);c.fillStyle='#c5d7d6';c.fillRect(x+1,102,1,95);}
   c.fillStyle='#334f58';c.fillRect(69,220,54,20);c.fillStyle='#8fb7bc';for(let x=72;x<122;x+=10)c.fillRect(x,223,7,17);
  }
 });
 const frontTex=facadeTexture(true),rearTex=facadeTexture(false);
 const points=b.points.slice(0,-1).filter((p,i,arr)=>{const a=arr[(i+arr.length-1)%arr.length],q=arr[(i+1)%arr.length];return Math.abs((p.x-a.x)*(q.z-p.z)-(p.z-a.z)*(q.x-p.x))/(Math.hypot(p.x-a.x,p.z-a.z)*Math.hypot(q.x-p.x,q.z-p.z))>.035;});points.push(points[0]);
 for(let i=1;i<points.length;i++){
  const a=points[i-1],p=points[i],len=Math.hypot(p.x-a.x,p.z-a.z);if(len<.1)continue;
  const x=(a.x+p.x)/2,z=(a.z+p.z)/2;let nx=-(p.z-a.z)/len,nz=(p.x-a.x)/len;if(inside({x:x+nx*.15,z:z+nz*.15},b.points)){nx=-nx;nz=-nz;}
  const front=nz>.3||nx>.7;
  const panel=(w,h,y,map,depth=.035)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshLambertMaterial({map,side:THREE.DoubleSide,transparent:true,alphaTest:.05}));m.position.set(x+nx*depth,y,z+nz*depth);m.rotation.y=Math.atan2(nx,nz);return add(m);};
  panel(len,b.height,b.height/2,front?frontTex:rearTex);
  if(front&&len>5){
   panel(Math.min(8,len*.82),.7,b.height-.65,textTexture('현대백화점','#e7e9e3','#35564f'),.07);
   if(nz>.3)panel(Math.min(2.8,len*.2),floor*3.3,b.height*.47,texture(64,112,c=>{c.fillStyle='#607b71';c.fillRect(0,0,64,112);c.fillStyle='#e8d7aa';c.fillRect(5,5,54,102);c.fillStyle='#759687';c.beginPath();c.arc(32,40,23,0,7);c.fill();c.fillStyle='#395f59';c.font='11px sans-serif';c.fillText('SINCHON',5,85);}),.08);
  }
 }
 // Glazed cylindrical corner on the south-east tip, a shallow decorative projection; ground collision uses the surveyed footprint.
 const tip=b.points.reduce((a,p)=>p.z>a.z?p:a,b.points[0]);
 const dx=b.center.x-tip.x,dz=b.center.z-tip.z,l=Math.hypot(dx,dz),r=.85;
 const x=tip.x+dx/l*.4,z=tip.z+dz/l*.4;
 const shaft=new THREE.Mesh(new THREE.CylinderGeometry(r,r,b.height-floor*1.1,16),new THREE.MeshLambertMaterial({color:'#6aa7b3'}));shaft.position.set(x,(b.height-floor*1.1)/2,z);add(shaft);
 for(let f=1;f<12;f++){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(r+.025,.045,4,16),new THREE.MeshLambertMaterial({color:'#d0dfda'}));ring.rotation.x=Math.PI/2;ring.position.set(x,f*floor*.91,z);add(ring);
 }
 for(let i=0;i<12;i++){const a=i*Math.PI/6,m=new THREE.Mesh(new THREE.BoxGeometry(.045,b.height-floor*1.1,.045),new THREE.MeshLambertMaterial({color:'#c1dbd8'}));m.position.set(x+Math.cos(a)*r,(b.height-floor*1.1)/2,z+Math.sin(a)*r);add(m);}
 return objects;
}
