// Approved low-detail varsity design, rendered from the generated transparent atlas.
export const AVATAR_SIZE={width:24,height:32};
const FRAMES=[[[193, 22, 142, 211], [466, 22, 139, 212], [769, 22, 140, 212], [1051, 22, 142, 211]], [[189, 258, 146, 215], [465, 258, 144, 212], [765, 258, 145, 212], [1048, 258, 144, 215]], [[189, 493, 147, 219], [466, 493, 145, 218], [764, 493, 147, 218], [1048, 493, 144, 219]], [[189, 728, 147, 200], [462, 728, 146, 197], [766, 728, 146, 197], [1041, 728, 151, 200]], [[190, 942, 146, 196], [463, 943, 145, 193], [766, 943, 145, 193], [1048, 943, 144, 195]]];
const WALK=[1,0,2,0],RUN=[3,0,4,0];
export function avatarFrame(dir=0,gait='idle',frame=0){
 const phase=((Math.trunc(frame)%4)+4)%4;
 const row=gait==='idle'?0:(gait==='run'?RUN:WALK)[phase];
 const [x,y,width,height]=FRAMES[row][dir];
 return {x,y,width,height,row,dir};
}
let atlas;
export async function loadAvatar(){
 if(atlas)return;
 const image=new Image();image.src=new URL('./assets/varsity-atlas.png',import.meta.url).href;
 await image.decode();atlas=image;
}
export function paintAvatar(ctx,dir=0,gait='idle',frame=0){
 if(!atlas)throw new Error('Load avatar atlas before drawing');
 const f=avatarFrame(dir,gait,frame),scale=28/215;
 // Shared scale preserves head size; anchor each pose at the same foot baseline.
 const width=Math.round(f.width*scale),height=Math.round(f.height*scale);
 ctx.imageSmoothingEnabled=false;
 ctx.drawImage(atlas,f.x,f.y,f.width,f.height,Math.floor((24-width)/2),31-height,width,height);
}
