'use strict';
// Original pixel drawings with the brighter, taller handheld-RPG proportions
// of fourth-generation field sprites. No game graphics are loaded.
const SPRITE_FRAMES={
 down:[
 '.....KKKKKK.....','....KYYYYYYK....','...KYYWWYYYYK...','...KYYYYYYYYK...',
 '..KKKKKKKKKKKK..','..KHHSSSSSSHHK..','...KSKSSSSKSK...', '...KSSSSSSSSK...',
 '....KSSSSSSK....','...KRRKWWKRRK...','..KSRRKWWKRRKS..','..KSSRKWWKRSSK..',
 '...KRRRRRRRRK...','....KPPKKPPK....','....KPPKKPPK....','...KFFK..KFFK...'
 ],
 up:[
 '.....KKKKKK.....','....KYYYYYYK....','...KYYYYYYYYK...','...KYYWWYYYYK...',
 '...KYYYYYYYYK...','...KKKHHHHKKK...','...KHHHHHHHHK...','....KHHHHHHK....',
 '....KKKKKKKK....','...KRRBBBBRRK...','..KSRKBBBBKRKS..','..KSSKBBWBKSSK..',
 '...KRKBBBBKRK...','....KPPKKPPK....','....KPPKKPPK....','...KFFK..KFFK...'
 ],
 right:[
 '.....KKKKK......','....KYYYYYK.....','...KYYWWYYYK....','...KYYYYYYYYKK..',
 '...KKKKKKKKKKK..','...KHHHSSSSK....','...KHHSSSKSSK...','....KHSSSSSSK...',
 '....KKSSSSSK....','...KBBKRRRRK....','...KBBKRKSSK....','...KBBKRKSSK....',
 '....KKRRRRK.....','.....KPPPPK.....','.....KPKPPK.....','....KFFKKFFK....'
 ]
};
const SPRITE_PALETTES={
 hero:{K:'#263746',Y:'#e85028',W:'#fff5df',H:'#4b3845',S:'#efbc8d',R:'#cf4846',B:'#ba895b',P:'#3d5d83',F:'#3a3d49',J:'#d7544c',C:'#eee0bd'},
 guide:{K:'#303042',Y:'#749569',W:'#e8e4bb',H:'#564239',S:'#e7b784',R:'#748d68',B:'#bf975c',P:'#46536b',F:'#33343e'},
 officer:{K:'#283043',Y:'#54739b',W:'#ece6c1',H:'#30303c',S:'#e8bd92',R:'#597698',B:'#8393a5',P:'#36455b',F:'#292d3a'},
 student:{K:'#303044',Y:'#474253',W:'#b2c1da',H:'#393242',S:'#edc897',R:'#6484b1',B:'#cf9a58',P:'#42465c',F:'#30303e'},
 musician:{K:'#343043',Y:'#674350',W:'#e3b58b',H:'#56394b',S:'#e1ac7b',R:'#9c6a88',B:'#c89858',P:'#41455a',F:'#30303e'},
 girl:{K:'#343047',Y:'#5d3d48',W:'#debaa1',H:'#5d3d48',S:'#ecc498',R:'#9980b5',B:'#cfa069',P:'#6c4d79',F:'#30303e'},
 clerk:{K:'#313746',Y:'#4c4245',W:'#ecebd7',H:'#4c4245',S:'#dfb083',R:'#668675',B:'#b7b7a0',P:'#414d51',F:'#30303d'},
 baker:{K:'#3b333b',Y:'#ece3c2',W:'#fff5d7',H:'#675047',S:'#e5b988',R:'#b78a5a',B:'#d6ba87',P:'#635543',F:'#3b333b'}
};
const heroRow=s=>'.'.repeat(Math.floor((16-s.length)/2))+s+'.'.repeat(16-s.length-Math.floor((16-s.length)/2));
const HERO_FRAMES={
 down:[
  'KKKK','KKRRRRKK','KRRRRRRRRK','KRRWWRRRRK','KKRRRRRRKK','KKKKKKKKKKKKKK',
  'KHHSSSSHHK','KHSSSSSSHK','KSSWSSWSSK','KSSSSSSSSK','KSSKKSSK',
  'KKJJJJJJKK','KJJJJCCJJJJJK','KJJJJCCJJJJJK','KJJJJJJJJJJJK','KJJJJJJJJJJJK',
  'KPPPPPPPPK','KPPK..KPPK','KPPK..KPPK','KKFF....FFKK'
 ].map(heroRow),
 up:[
  'KKKK','KKRRRRKK','KRRRRRRRRK','KRRWWRRRRK','KRRRRRRRRK','KKKKKKKKKKKKKK',
  'KHHHHHHHHK','KHHBBBBHHK','KBBJJJJBBK','KBBJJJJBBK','KBBJCCJBBK','KBBJCCJBBK',
  'KJJJJJJJJK','KJJJJJJJJK','KJJJJJJJJK','KPPPPPPPPK','KPPPPPPPPK',
  'KPPK..KPPK','KPPK..KPPK','KKFF....FFKK'
 ].map(heroRow),
 right:[
  'KKKK','KKRRRRK','KRRRRRRK','KRRRWWRRK','KKRRRRRRKK','KKKKKKKKKKKK',
  'KSSSSSK','KSSWSSK','KSSSSSK','KSSSSSK','KJJJKK','KJJJCCJKK','KJJJCCJKK','KJJJJJKK',
  'KPPPPK','KPPKPPK','KPPKPPK','KPPK','KPPK','KKF..FKK'
 ].map(heroRow)
};
function spritePixels(style='hero',dir=0,step=0){
 const base=(style==='hero'?HERO_FRAMES:SPRITE_FRAMES)[dir===3?'up':dir===1||dir===2?'right':'down'];
 const rows=base.map(r=>r.split(''));
 if(!['hero','officer','baker','guide'].includes(style)){
  // Hair replaces the brim; civilian silhouettes are narrower than the hero's cap.
  rows[4]='...KHHHHHHHHK...'.split('');
  if(dir===1||dir===2)rows[4]='...KHHHHHHHK....'.split('');
 }
 if(style==='girl'&&(dir===0||dir===3)){for(let y=6;y<12;y++){rows[y][3]='H';rows[y][12]='H';}}
 if(step){
  const alt=step===1;
  if(rows.length===20){
   if(dir===1||dir===2){rows[18]=(alt?'....KPPKPPK.....':'.....KPPKPPK....').split('');rows[19]=(alt?'...KFFK.KFFK....':'....KFFK.KFFK...').split('');}
   else{rows[18]=(alt?'...KFFKKPPPK....':'....KPPPKKFFK...').split('');rows[19]=(alt?'....KK...KFFK...':'...KFFK...KK....').split('');}
  }else if(dir===1||dir===2){rows[14]=(alt?'....KPPKPPK.....':'.....KPPKPPK....').split('');rows[15]=(alt?'...KFFK.KFFK....':'....KFFK.KFFK...').split('');}
  else{rows[14]=(alt?'...KFFKKPPPK....':'....KPPPKKFFK...').split('');rows[15]=(alt?'....KK...KFFK...':'...KFFK...KK....').split('');}
 }
 return dir===1?rows.map(r=>r.reverse()):rows;
}
function paintSprite(context,x,y,style='hero',dir=0,step=0,scale=1){const palette=SPRITE_PALETTES[style]||SPRITE_PALETTES.student;const rows=spritePixels(style,dir,step);for(let yy=0;yy<rows.length;yy++)for(let xx=0;xx<16;xx++){const c=palette[rows[yy][xx]];if(c){context.fillStyle=c;context.fillRect(Math.round(x+xx*scale),Math.round(y+yy*scale),scale,scale);}}}
