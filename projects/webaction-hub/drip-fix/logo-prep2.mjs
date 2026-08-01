import sharp from 'sharp';
import {statSync} from 'node:fs';
const SRC='C:/Users/mikef/Downloads/ChatGPT Image 19 Ιουν 2026, 01_11_53 π.μ..png';
const {data,info}=await sharp(SRC).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const w=info.width,h=info.height,C=info.channels;
// bbox of non-transparent pixels (alpha>16)
let minx=w,miny=h,maxx=0,maxy=0;
for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=data[(y*w+x)*C+3];if(a>16){if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;}}
const pad=Math.round(Math.max(w,h)*0.015); // tiny breathing room
minx=Math.max(0,minx-pad);miny=Math.max(0,miny-pad);maxx=Math.min(w-1,maxx+pad);maxy=Math.min(h-1,maxy+pad);
const cw=maxx-minx+1, ch=maxy-miny+1;
console.log('logo bbox',cw+'x'+ch,'(aspect '+(cw/cw*1).toFixed(2)+') ratio='+(cw/ch).toFixed(3));
// clean: set RGB of fully-transparent pixels to the dominant teal to avoid any dark fringe, keep alpha
// dominant teal = average of strongly-opaque pixels
let sr=0,sg=0,sb=0,n=0;
for(let i=0;i<data.length;i+=C){if(data[i+3]>230){sr+=data[i];sg+=data[i+1];sb+=data[i+2];n++;}}
const TR=Math.round(sr/n),TG=Math.round(sg/n),TB=Math.round(sb/n);
console.log('dominant teal rgb',TR+','+TG+','+TB);
const out=Buffer.alloc(w*h*4);
for(let p=0,q=0;p<data.length;p+=C,q+=4){
  const a=data[p+3];
  if(a<8){out[q]=TR;out[q+1]=TG;out[q+2]=TB;out[q+3]=0;}      // transparent: park RGB at teal (no fringe)
  else {out[q]=data[p];out[q+1]=data[p+1];out[q+2]=data[p+2];out[q+3]=a;}
}
const cropped=await sharp(out,{raw:{width:w,height:h,channels:4}})
  .extract({left:minx,top:miny,width:cw,height:ch}).png().toBuffer();
await sharp(cropped).webp({quality:95,alphaQuality:100}).toFile('logo-clean.webp');
console.log('logo-clean.webp bytes',statSync('logo-clean.webp').size);
await sharp({create:{width:cw,height:ch,channels:3,background:{r:8,g:9,b:10}}}).composite([{input:cropped}]).png().toFile('logo-on-dark.png');
await sharp({create:{width:cw,height:ch,channels:3,background:{r:150,g:150,b:150}}}).composite([{input:cropped}]).png().toFile('logo-on-grey.png');
console.log('done; final',cw+'x'+ch);
