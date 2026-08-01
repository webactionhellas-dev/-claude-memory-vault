import sharp from 'sharp';
import { readFileSync } from 'fs';
const b64 = p => readFileSync(p).toString('base64');
const fonts = {
  s8: b64('ig/fonts/Sora-800.ttf'),
  s4: b64('ig/fonts/Sora-400.ttf'),
  j4: b64('ig/fonts/Jost-400.ttf'),
};
const svg = `<svg width="540" height="540" xmlns="http://www.w3.org/2000/svg">
<defs><style>
@font-face{font-family:'Sora';font-weight:800;src:url(data:font/ttf;base64,${fonts.s8}) format('truetype');}
@font-face{font-family:'Sora';font-weight:400;src:url(data:font/ttf;base64,${fonts.s4}) format('truetype');}
@font-face{font-family:'Jost';font-weight:400;src:url(data:font/ttf;base64,${fonts.j4}) format('truetype');}
</style></defs>
<rect width="540" height="540" fill="#000"/>
<text x="40" y="120" font-family="Sora" font-weight="800" font-size="64" fill="#fff">Web Action</text>
<text x="40" y="200" font-family="Sora" font-weight="400" font-size="32" fill="#3366FF">Design · Code · Action</text>
<text x="40" y="280" font-family="Jost" font-weight="400" font-size="28" fill="#ccc">Athens · Greece</text>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile('ig/out/_fonttest.png');
console.log('done');
