import sharp from 'sharp';
import {statSync} from 'node:fs';
const SRC='C:/Users/mikef/Downloads/ChatGPT Image 19 Ιουν 2026, 01_11_53 π.μ..png';
const m=await sharp(SRC).metadata();
console.log('src',m.width+'x'+m.height,'channels',m.channels,'hasAlpha',m.hasAlpha);
const {data,info}=await sharp(SRC).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const w=info.width,h=info.height,C=info.channels;
// sample corner (bg) + a teal core (center-left of the D)
const corner=[data[0],data[1],data[2]];
const cx=Math.floor(w*0.22),cy=Math.floor(h*0.45);
const ci=(cy*w+cx)*C;
console.log('corner rgb',corner.join(','),'| teal sample',data[ci],data[ci+1],data[ci+2]);

// white-removal: alpha from how non-white the pixel is (min channel), then unmultiply white halo
const out=Buffer.alloc(w*h*4);
const SCALE=1.18, WHITE=255;
for(let p=0,q=0;p<data.length;p+=C,q+=4){
  const r=data[p],g=data[p+1],b=data[p+2];
  let a=Math.round((255-Math.min(r,g,b))*SCALE);
  if(a>255)a=255; if(a<0)a=0;
  if(a===0){out[q]=0;out[q+1]=0;out[q+2]=0;out[q+3]=0;continue;}
  const af=a/255;
  let nr=(r-WHITE*(1-af))/af, ng=(g-WHITE*(1-af))/af, nb=(b-WHITE*(1-af))/af;
  out[q]  =Math.max(0,Math.min(255,Math.round(nr)));
  out[q+1]=Math.max(0,Math.min(255,Math.round(ng)));
  out[q+2]=Math.max(0,Math.min(255,Math.round(nb)));
  out[q+3]=a;
}
// trim transparent border, export crisp webp
let img=sharp(out,{raw:{width:w,height:h,channels:4}}).trim({threshold:10});
const trimmed=await img.png().toBuffer();
const tm=await sharp(trimmed).metadata();
console.log('trimmed to',tm.width+'x'+tm.height,'(aspect '+(tm.width/tm.height).toFixed(2)+')');
await sharp(trimmed).webp({quality:95,alphaQuality:100}).toFile('logo-clean.webp');
console.log('logo-clean.webp bytes',statSync('logo-clean.webp').size);
// QA composites: over dark hero + over a mid grey (halo check)
await sharp({create:{width:tm.width,height:tm.height,channels:3,background:{r:8,g:9,b:10}}}).composite([{input:trimmed}]).png().toFile('logo-on-dark.png');
await sharp({create:{width:tm.width,height:tm.height,channels:3,background:{r:120,g:120,b:120}}}).composite([{input:trimmed}]).png().toFile('logo-on-grey.png');
console.log('wrote logo-on-dark.png + logo-on-grey.png');
