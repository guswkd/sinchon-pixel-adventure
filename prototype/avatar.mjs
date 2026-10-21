// Original 24×32 campus character, drawn on a clean grid. No imported game frames.
export const AVATAR_SIZE={width:24,height:32};
export const AVATAR_PALETTE={o:'#233149',h:'#303443',H:'#50546a',s:'#f3c6a2',S:'#d99578',e:'#202f47',b:'#286ac5',B:'#4e91e6',d:'#204985',c:'#fff0d4',C:'#d9c9b5',p:'#35445c',P:'#566983',w:'#f4f7fa'};
export function avatarPixels(dir=0,gait='idle',frame=0){
 const rows=Array.from({length:32},()=>Array(24).fill('.'));
 const phase=((Math.trunc(frame)%4)+4)%4,step=gait==='idle'?0:[-1,0,1,0][phase],running=gait==='run';
 const bob=gait==='idle'?0:(phase%2===0?-1:0),stride=step*(running?3:1);
 const dot=(x,y,c)=>{if(x>=0&&x<24&&y>=0&&y<32)rows[y][x]=c;};
 const rect=(x,y,w,h,c)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)dot(x+i,y+j,c);};
 const stamp=(x,y,art)=>art.forEach((r,j)=>[...r].forEach((c,i)=>{if(c!=='.')dot(x+i,y+j,c);}));
 const shoe=(x,y)=>{rect(x,y,5,3,'o');rect(x,y,4,1,'P');rect(x,y+2,5,1,'w');};
 if(dir===0||dir===3){
  // Straight trousers and low-top sneakers, with an independent running stride.
  const lx=running?6:7,rx=running?14:13;
  const ly=28+(step<0?-(running?3:1):0),ry=28+(step>0?-(running?3:1):0);
  rect(lx,23+bob,5,ly-22-bob,'o');rect(lx+1,24+bob,3,ly-23-bob,'P');
  rect(rx,23+bob,5,ry-22-bob,'o');rect(rx+1,24+bob,3,ry-23-bob,'p');
  shoe(lx,ly);shoe(rx,ry);
  const arm=running?step*2:step;
  rect(4,15+bob+arm,4,8,'o');rect(5,15+bob+arm,3,6,'c');rect(5,21+bob+arm,3,1,'d');rect(5,22+bob+arm,3,2,'s');
  rect(17,15+bob-arm,4,8,'o');rect(17,15+bob-arm,3,6,'C');rect(17,21+bob-arm,3,1,'d');rect(17,22+bob-arm,3,2,'s');
  rect(7,14+bob,11,11,'o');rect(8,15+bob,9,8,'b');rect(8,15+bob,3,6,'B');rect(8,23+bob,9,1,'c');
  if(dir===0){
   rect(11,14+bob,3,2,'c');rect(12,16+bob,1,7,'d');for(const y of [17,20,22])dot(13,y+bob,'w');
   stamp(8,17+bob,['c.c','.c.','.c.']);rect(15,21+bob,2,1,'d');
   stamp(5,2+bob,['....oooooo....','..oohhHHhhoo..','.ohhhHHHhhhho.','ohhhHHhhhhhhho','ohhhhhhhhhsSho','ohhhsshhssSsSo','.ohssssssssho.','..osesssesso..','..osssssssSo..','...osssssSo...','....oSSSSo....','.....oooo.....']);
  }else{
   stamp(10,17+bob,['c...c','c...c','.c.c.','..c..','..c..']);
   stamp(5,2+bob,['....oooooo....','..oohhHHhhoo..','.ohhhHHHhhhho.','ohhhHHhhhhhhho','ohhhhhhhhhhhho','ohhhhhhhhhhhho','.ohhhhhhhhho..','..ohhhhhhhho..','..ohhhhhhhho..','...ohhhhhoo...','....oSSSSo....','.....oooo.....']);
  }
 }else{
  const lean=running?1:0;
  rect(9-stride,23+bob,4,6,'o');rect(10-stride,24+bob,2,4,'P');shoe(8-stride,28-(step>0?1:0));
  rect(12+stride,23+bob,4,6,'o');rect(13+stride,24+bob,2,4,'p');shoe(11+stride,28-(step<0?1:0));
  rect(8-lean,14+bob,10,11,'o');rect(9-lean,15+bob,8,8,'b');rect(9-lean,15+bob,2,7,'B');rect(9-lean,23+bob,8,1,'c');
  const ax=11+step*(running?3:1),ay=16+bob-(running?1:0);
  rect(ax,ay,4,8,'o');rect(ax,ay,3,6,'c');rect(ax,ay+6,3,1,'d');rect(ax,ay+7,3,2,'s');
  stamp(4-lean,2+bob,['.....oooooo....','...oohHHhhhoo..','..ohHHHhhhhhho.','.ohHHhhhhhhhho.','.ohhhsssshhhho.','..ossesssshhho.','.osssssssshhho.','.ossssssSshho..','..ossssSSSho...','...osssSSoo....','....oSSSo......','.....ooo.......']);
  if(dir===2)for(const row of rows)row.reverse();
 }
 return rows;
}
export function paintAvatar(ctx,dir=0,gait='idle',frame=0){
 const rows=avatarPixels(dir,gait,frame);
 for(let y=0;y<32;y++)for(let x=0;x<24;x++){const c=AVATAR_PALETTE[rows[y][x]];if(c){ctx.fillStyle=c;ctx.fillRect(x,y,1,1);}}
}
