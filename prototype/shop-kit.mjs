// One repeatable upper-storey module and one ground-floor module, four palettes.
// These are generic game art, not surveyed floor counts or real shop signs.
export const SHOP_PALETTES=[
 {wall:'#e4d5bd',joint:'#c9bda9',trim:'#f8efda',sign:'#426e64'},
 {wall:'#c98570',joint:'#b77562',trim:'#f1dbc2',sign:'#405a70'},
 {wall:'#d2dce0',joint:'#b4c4cb',trim:'#edf2e9',sign:'#96674f'},
 {wall:'#d9d3b0',joint:'#bbb797',trim:'#f4ecd2',sign:'#646b85'}
];
export function paintShopWall(c,index=0){
 const p=SHOP_PALETTES[index%4];c.fillStyle=p.wall;c.fillRect(0,0,64,64);
 c.fillStyle=p.joint;for(let y=0;y<64;y+=8){c.fillRect(0,y,64,1);for(let x=(y/8%2)*8;x<64;x+=16)c.fillRect(x,y,1,8);}
 for(const x of [7,37]){
  c.fillStyle=p.trim;c.fillRect(x-2,8,24,38);c.fillStyle='#365262';c.fillRect(x,10,20,31);
  c.fillStyle='#8dbbc9';c.fillRect(x+2,12,16,26);c.fillStyle='#cce4e4';c.fillRect(x+3,13,3,22);
  c.fillStyle=p.trim;c.fillRect(x+9,10,2,31);c.fillRect(x,27,20,2);
  c.fillStyle='#8b9290';c.fillRect(x-3,45,26,3);c.fillStyle=p.trim;c.fillRect(x-3,43,26,2);
 }
 c.fillStyle=p.trim;c.fillRect(0,59,64,3);c.fillStyle=p.joint;c.fillRect(0,62,64,2);
}
export function paintShopFront(c,index=0){
 const p=SHOP_PALETTES[index%4];c.fillStyle=p.trim;c.fillRect(0,0,64,32);
 c.fillStyle=p.sign;c.fillRect(1,1,62,7);c.fillStyle='#f6ead0';
 // Abstract sign marks, avoiding fictitious real-world business names.
 for(let i=0;i<4;i++)c.fillRect(20+i*6,3,4,3);
 c.fillStyle='#304b56';c.fillRect(4,11,34,19);c.fillRect(43,10,17,22);
 c.fillStyle='#8dbac3';c.fillRect(6,13,30,13);c.fillRect(45,12,13,15);
 c.fillStyle='#d7e8df';c.fillRect(8,13,2,12);c.fillRect(27,13,2,12);c.fillRect(51,12,1,18);
 c.fillStyle='#e0bf88';c.fillRect(7,24,28,3);c.fillRect(55,22,2,2);
 c.fillStyle=p.sign;for(let x=2;x<62;x+=8)c.fillRect(x,8,5,3);
}
