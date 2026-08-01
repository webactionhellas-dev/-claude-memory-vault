import sharp from 'sharp';
import {readdirSync,statSync} from 'node:fs';
const dir='C:/Users/mikef/Downloads';
const imgs=readdirSync(dir).filter(f=>/\.(png|webp)$/i.test(f)).map(f=>({f,t:statSync(dir+'/'+f).mtimeMs})).sort((a,b)=>b.t-a.t).slice(0,4);
console.log('recent:',imgs.map(x=>x.f));
