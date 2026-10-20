// Original field sprite inspired by HGSS Ethan's compact silhouette and poses.
// Backward cap + Yonsei-style varsity jacket; no game sprite is loaded at runtime.
export const AVATAR_SIZE={width:24,height:32};
export const AVATAR_PALETTE={K:'#252b3a',N:'#303e50',n:'#50617a',Y:'#edc54c',y:'#b98b38',G:'#ffdf76',H:'#30313d',h:'#50505c',S:'#efbd94',s:'#c98770',F:'#ffe0b2',E:'#202738',e:'#5d5660',B:'#2359aa',b:'#173e7c',A:'#4186d4',W:'#fff4dc',w:'#bfcfda',P:'#303f58',p:'#526783',T:'#faf3de',t:'#99aec0'};
// Fixed anchors across rows and views keep the face and feet from wobbling.
const HEAD={
 down:[
 '......KKKKKK........',
 '....KKNNNYYYKK......',
 '...KNnnNYYGYYNK.....',
 '..KNnnNNYYGYYNNK....',
 '..KnnNNNYYYYYNNK....',
 '..KNNNNNNyyyyNNK....',
 '.KKNNNNNNNNNNNNKK...',
 'KNNNNNKKKKKKKKNNNK..',
 '.KKKKKHHhHhhHHKKK...',
 '...KHHSSFFFSSHHK....',
 '..KSHSFFFSFFSHSK....',
 '..KsSSFFSSFFSSsK....',
 '...KSSSSSSSSSSK.....',
 '....KSSSSFSSSK......',
 '.....KSSssSSK.......',
 '......KSSSSK........'
 ],
 up:[
 '......KKKKKK........',
 '....KKNNNYYYKK......',
 '...KNnnNYYGYYNK.....',
 '..KNnnNNYYGYYNNK....',
 '..KnnNNNYYYYYNNK....',
 '..KNNNNNYYYYYNNK....',
 '..KNNNNNyyyyyNNK....',
 '...KNNNNNNNNNNK.....',
 '...KNNNWWWWNNNK.....',
 '...KHHHNNNNHHHK.....',
 '...KHHhhhhhhHHK.....',
 '....KHHhhhhHHK......',
 '....KHHHHHHHHK......',
 '.....KHHHHHHK.......',
 '......KssssK........',
 '......KSSSSK........'
 ],
 right:[
 '......KKKKK.........',
 '....KKNNYYYKK.......',
 '...KNnnNYYGYYK......',
 '..KNnnNNYYGYYNK.....',
 '..KnnNNNYYYYYNK.....',
 '..KNNNNNNyyyyNK.....',
 '.KKNNNNNNNNNNNK.....',
 'KNNNNKKKKKKKKKK.....',
 '.KKKKHHhhHSSSK......',
 '...KHHhhhSFFSSK.....',
 '...KHHHhSSFWESK.....',
 '....KHHsSSSEeSK.....',
 '.....KHSSSSSSSK.....',
 '......KSSSFSSK......',
 '.......KSSssK.......',
 '.......KSSSK........'
 ]
};
const BODY={
 down:['...KWWSSWWK.....','..KWABBBBAWK....','.KWWBBBBBBWWK...','.KwWBBBBBBWwK...','.KwwBBBBBBwwK...','..KSKBBBBKSK....','...KWWWWWWK.....','....KbbbbK......'],
 up:['...KWWWWWWK.....','..KWAAAAAAWK....','.KWWBBBBBBWWK...','.KwwBWBBWBwwK...','.KwwBBWWBBwwK...','..KSKBBWBKSK....','...KWWWWWWK.....','....KbbbbK......'],
 right:['....KWWBBK......','...KBABBBbK.....','...KBBWWWbK.....','...KBBWwwbK.....','...KBBKwwbK.....','....KBKSSK......','....KWWWWK......','.....KbbbK......']
};
function stamp(grid,x,y,rows){rows.forEach((row,dy)=>[...row].forEach((c,dx)=>{if(c!=='.'&&grid[y+dy]?.[x+dx]!==undefined)grid[y+dy][x+dx]=c;}));}
function rect(g,x,y,w,h,c){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(g[yy]?.[xx]!==undefined)g[yy][xx]=c;}
export function avatarPixels(dir=0,gait='idle',frame=0){
 const g=Array.from({length:32},()=>Array(24).fill('.')),side=dir===1||dir===2,back=dir===3;
 const active=gait!=='idle',phase=active?frame%4:1,swing=active?[1,0,-1,0][phase]:0,run=gait==='run';
 const bob=active&&swing!==0?-1:0,lean=side&&run?1:0;
 // Short hips and bent legs. Each stride stays connected to the same waist.
 if(side){
  rect(g,9,24,8,3,'K');rect(g,10,24,6,2,'P');
  const spread=swing*(run?2:1);
  stamp(g,8-spread,26,['.KPPK.','KPPK..','KtttK.','.KKKK.']);
  stamp(g,12+spread,26,['KppK..','KppK..','KTTTTK','.KKKK.']);
 }else{
  stamp(g,8,25,['KPPKKppK','KPPKKppK','KPPKKppK']);
  const leftLift=swing>0?(run?2:1):0,rightLift=swing<0?(run?2:1):0;
  stamp(g,7,28-leftLift,['KTTTK.','KtttK.','.KKK..']);stamp(g,13,28-rightLift,['KTTTK.','KtttK.','.KKK..']);
 }
 stamp(g,4+lean,18+bob,BODY[side?'right':back?'up':'down']);
 // Front chest patch and larger back Y stay readable instead of a white tie.
 if(!side){
  if(back)stamp(g,10,20+bob,['W..W','.WW.','.WW.','.WW.']);
  else stamp(g,9,20+bob,['W.W','.W.','.W.']);
  if(swing){for(const [x,sign] of [[5,1],[16,-1]]){
   const y=20+bob+swing*sign*(run?1:0);stamp(g,x,y,['WW','Ww','bK','SK']);
  }}
 }else if(run){stamp(g,12+lean,20+bob-swing,['.KK.','KWWK','KwwK','KSSK','.KK.']);}
 stamp(g,2+lean,3+bob,HEAD[side?'right':back?'up':'down']);
 if(!side&&!back){stamp(g,8,14+bob,['WE','EE']);stamp(g,13,14+bob,['WE','EE']);}
 return dir===1?g.map(row=>row.reverse()):g;
}
export function paintAvatar(ctx,dir=0,gait='idle',frame=0){const rows=avatarPixels(dir,gait,frame);for(let y=0;y<32;y++)for(let x=0;x<24;x++){const color=AVATAR_PALETTE[rows[y][x]];if(color){ctx.fillStyle=color;ctx.fillRect(x,y,1,1);}}}
