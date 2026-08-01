import sharp from 'sharp';
const SRC='C:/Users/mikef/Downloads/ChatGPT Image 19 Ιουν 2026, 01_11_53 π.μ..png';
const {data,info}=await sharp(SRC).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const w=info.width,h=info.height,C=info.channels;
function px(x,y){const i=(Math.floor(y)*w+Math.floor(x))*C;return [data[i],data[i+1],data[i+2],data[i+3]];}
console.log('corner(0,0)',px(0,0));
console.log('corner(top-right)',px(w-1,0));
console.log('mid-left bg',px(w*0.03,h*0.5));
console.log('teal D',px(w*0.22,h*0.45));
console.log('between letters(hole)',px(w*0.5,h*0.5));
// alpha histogram
let a0=0,a255=0,amid=0,total=w*h;
for(let i=0;i<data.length;i+=C){const a=data[i+3];if(a<8)a0++;else if(a>247)a255++;else amid++;}
console.log('alpha: transp%',(100*a0/total).toFixed(1),'opaque%',(100*a255/total).toFixed(1),'mid%',(100*amid/total).toFixed(1));
