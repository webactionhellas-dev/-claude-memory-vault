import sharp from 'sharp';
const slugs = ['nike','jordan','yeezy','new-balance','adidas','asics','ugg','essentials','stone-island','stussy','fear-of-god'];
const COLS=4, CW=300, CH=130;
const rows=Math.ceil(slugs.length/COLS);
const comp=[];
for(let i=0;i<slugs.length;i++){
  const x=(i%COLS)*CW, y=((i/COLS)|0)*CH;
  const thumb=await sharp(`public/brands/logo-${slugs[i]}.webp`).resize(CW-16,CH-30,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).toBuffer();
  comp.push({input:thumb,left:x+8,top:y+24});
  comp.push({input:Buffer.from(`<svg width="${CW}" height="22"><text x="6" y="16" font-family="monospace" font-size="14" fill="#00e0d0">${i}:${slugs[i]}</text></svg>`),left:x,top:y});
}
await sharp({create:{width:COLS*CW,height:rows*CH,channels:4,background:{r:18,g:18,b:20,alpha:1}}}).composite(comp).png().toFile('scripts/logo-check.png');
console.log('wrote scripts/logo-check.png');
