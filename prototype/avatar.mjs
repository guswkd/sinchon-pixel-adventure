import {ETHAN_FRAMES,SOURCE_PALETTE} from './assets/ethan-frames.mjs';

export const AVATAR_SIZE={width:24,height:32};
// Only the two red clothing shades change. All outlines, skin, hair, cap,
// highlights and original pose pixels retain the source values.
export const AVATAR_PALETTE={...SOURCE_PALETTE,K:'#2860b8',N:'#659be2'};
const CYCLE=[1,0,2,0];
export function avatarPixels(dir=0,gait='idle',frame=0){
 const poses=ETHAN_FRAMES[gait==='run'?'run':'walk'][dir];
 const pose=gait==='idle'?0:CYCLE[((Math.trunc(frame)%4)+4)%4];
 return poses[pose].map(row=>[...row]);
}
export function paintAvatar(ctx,dir=0,gait='idle',frame=0){
 const rows=avatarPixels(dir,gait,frame);
 for(let y=0;y<AVATAR_SIZE.height;y++)for(let x=0;x<AVATAR_SIZE.width;x++){
  const color=AVATAR_PALETTE[rows[y][x]];
  if(color){ctx.fillStyle=color;ctx.fillRect(x,y,1,1);}
 }
}
