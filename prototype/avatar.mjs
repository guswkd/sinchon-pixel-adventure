// Original 24×32 pixel art. Royal-blue varsity jacket, ivory sleeves and Y patch.
// Separate from the classic game's hero so its save/art remain untouched.
export const AVATAR_SIZE={width:24,height:32};
export const AVATAR_PALETTE={K:'#243049',H:'#343348',h:'#494255',L:'#655565',S:'#f2c6a0',s:'#d9967f',F:'#ffe0b7',E:'#252d44',B:'#1853aa',b:'#123d80',A:'#3881d5',W:'#fff3dc',w:'#c9d4dc',P:'#303e59',p:'#4a5b75',N:'#f4eee0',n:'#9eaec2'};
const HEAD={
 down:[
 '.....KKKKKK.....','...KKHHHHHHKK...','..KHhhLLhhhhHK..','.KHhLLLLhhhhhHK.',
 '.KHhLLLhhhhhhHK.','.KHHhHHhhhHHHHK.','..KHHSSFSSSHHK..','..KSSSFFSSSSSK..',
 '..KsEKSSSKEsSK..','...KSSSSSSSSK...','....KSSssSSK....','.....KSSSSK.....'
 ],
 up:[
 '.....KKKKKK.....','...KKHHHHHHKK...','..KHhhLLhhhhHK..','.KHhLLLLhhhhhHK.',
 '.KHhLLLhhhhhhHK.','.KHHhhhhhhhhhHK.','..KHhhhhhhhhHK..','..KHHhhhhhhHHK..',
 '...KHHHHHHHHK...','....KHHHHHHK....','.....KssssK.....','.....KSSSSK.....'
 ],
 right:[
 '.....KKKKKK.....','...KKHHHHHHK....','..KHhhLLhhhHK...','..KHhLLLhhhhHK..',
 '..KHHhhhhhhhHK..','..KHHHhhHSSSK...','...KHHHSSSSSK...','...KHHSSSSESK...',
 '....KHsSSSSSSK..','.....KSSSSSSK...','......KSssSK....','......KSSSK.....'
 ]
};
function stamp(grid,x,y,rows){rows.forEach((row,dy)=>[...row].forEach((c,dx)=>{if(c!=='.'&&grid[y+dy]?.[x+dx]!==undefined)grid[y+dy][x+dx]=c;}));}
function rect(g,x,y,w,h,c){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(g[yy]?.[xx]!==undefined)g[yy][xx]=c;}
export function avatarPixels(dir=0,gait='idle',frame=0){
 const g=Array.from({length:32},()=>Array(24).fill('.')),side=dir===1||dir===2,back=dir===3;
 const active=gait!=='idle',phase=active?frame%4:0,swing=active?[1,0,-1,0][phase]:0,run=gait==='run';
 const bob=active&&(phase===0||phase===2)?-1:0,lean=side&&run?1:0;
 // Keep hips connected when the jacket bobs or the stride widens.
 rect(g,side?9:8,22,side?7:9,4,'K');rect(g,side?10:9,22,side?5:7,3,'P');
 // Legs alternate their extension, rather than sliding the whole sprite.
 if(side){
  const spread=swing*(run?3:2);
  rect(g,9-spread,24,4,5,'K');rect(g,10-spread,24,2,4,'P');rect(g,8-spread,28,6,2,'n');rect(g,8-spread,30,6,1,'K');
  rect(g,12+spread,23,4,6,'K');rect(g,13+spread,24,2,4,'p');rect(g,12+spread,28,6,2,'N');rect(g,12+spread,30,6,1,'K');
 }else{
  for(const [x,leg] of [[8,1],[13,-1]]){const lift=swing*leg>0?(run?2:1):0;rect(g,x,24,4,6-lift,'K');rect(g,x+1,24,2,4-lift,leg===1?'P':'p');rect(g,x-1,28-lift,5,2,'N');rect(g,x-1,30-lift,5,1,'K');}
 }
 if(side){
  stamp(g,8+lean,13+bob,['.KKKKKK.','KBWBBAbK','KBBBBAbK','KBBBBBbK','KBBBBBbK','KBBBBBbK','KBBBBBbK','KBBBBbbK','KwwwwwwK','.KbbbbK.']);
  const armY=16+bob-swing*(run?2:1);
  stamp(g,10+lean,armY,['.KKK.','KWWWK','KWWWK','KWWwK','.KwwK','.KBBK','.KSSK','..KK.']);
 }else{
  const torso=back?['.KWWWWWWK.','KBAAAAABbK','KBBBBBBBbK','KBBBBBBBbK','KBBBBBBBbK','KBBBBBBBbK','KBBBBBBBbK','KBBBBBBBbK','KbBBBBBbbK','KWWWWWWWWK','.KbbbbbbK.']:
   ['.KWWSSWWK.','KBAABWAAbK','KBAABWBAbK','KBBBBWBBbK','KBBBBWBBbK','KBBBBWBBbK','KBBBBWBBbK','KBBBBWBBbK','KbBBBWBbbK','KWWWWWWWWK','.KbbbbbbK.'];
  stamp(g,7,13+bob,torso);
  if(back)stamp(g,9,16+bob,['W...W','.W.W.','..W..','..W..','..W..']);
  else stamp(g,8,15+bob,['W.W','.W.','.W.']);
  for(const [x,sign] of [[4,1],[16,-1]]){const y=14+bob+swing*sign*(run?2:1);stamp(g,x,y,['.KK.','KWWK','KWWK','KWwK','KWwK','KBBK','KSSK','.KK.']);}
 }
 stamp(g,4+lean,1+bob,HEAD[side?'right':back?'up':'down']);
 return dir===1?g.map(row=>row.reverse()):g;
}
export function paintAvatar(ctx,dir=0,gait='idle',frame=0){const rows=avatarPixels(dir,gait,frame);for(let y=0;y<32;y++)for(let x=0;x<24;x++){const color=AVATAR_PALETTE[rows[y][x]];if(color){ctx.fillStyle=color;ctx.fillRect(x,y,1,1);}}}
