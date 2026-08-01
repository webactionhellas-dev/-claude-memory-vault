import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const products = JSON.parse(fs.readFileSync('src/data/products.json','utf8'));
const meta = JSON.parse(fs.readFileSync('src/data/meta.json','utf8'));
const brands = [...meta.brands].sort((a,b)=>b.count-a.count);
const dir = 'src/assets/products';
const slugify = (s)=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

async function cutout(srcFile, outFile){
  const { data, info } = await sharp(srcFile).ensureAlpha().raw().toBuffer({ resolveWithObject:true });
  const { width:w, height:h, channels:c } = info;
  const isWhite=(i)=>{const r=data[i],g=data[i+1],b=data[i+2];const mx=Math.max(r,g,b),mn=Math.min(r,g,b);return mn>=236&&(mx-mn)<=16;};
  const vis=new Uint8Array(w*h), st=[];
  const push=(x,y)=>{if(x<0||y<0||x>=w||y>=h)return;const p=y*w+x;if(vis[p])return;if(!isWhite(p*c))return;vis[p]=1;st.push(p);};
  for(let x=0;x<w;x++){push(x,0);push(x,h-1);} for(let y=0;y<h;y++){push(0,y);push(w-1,y);}
  while(st.length){const p=st.pop();const x=p%w,y=(p/w)|0;push(x+1,y);push(x-1,y);push(x,y+1);push(x,y-1);}
  for(let p=0;p<w*h;p++) if(vis[p]) data[p*c+3]=0;
  await sharp(data,{raw:{width:w,height:h,channels:c}}).trim({threshold:0}).webp({quality:90,alphaQuality:100}).toFile(outFile);
}

const map={};
for(const b of brands){
  const prod = products.find(p=>p.brand===b.name);
  if(!prod) continue;
  const slug = slugify(b.name);
  const out = `public/brands/${slug}.webp`;
  try { await cutout(path.join(dir, prod.images[0]), out); map[b.name]=`/brands/${slug}.webp`; }
  catch(e){ console.log('skip', b.name, e.message); }
}
fs.writeFileSync('src/data/brand-covers.json', JSON.stringify(map,null,2));
console.log('wrote', Object.keys(map).length, 'brand cutouts');
