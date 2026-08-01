import { readFileSync, writeFileSync } from 'fs';
const F = 'C:/Users/mikef/Downloads/drip-barbershop-optimized.html';
let h = readFileSync(F, 'utf8');

function sub(name, from, to) {
  if (!h.includes(from)) throw new Error('ANCHOR NOT FOUND: ' + name);
  if (h.split(from).length - 1 !== 1) throw new Error('ANCHOR NOT UNIQUE: ' + name);
  h = h.replace(from, to);
  console.log('OK  ' + name);
}

// 1) Barber/gallery photos: kill the 1px translucent border + any cover hairline once a photo loads
sub('photo-edge-lines',
  `.ph.has-img::before{display:none}`,
  `.ph.has-img::before{display:none}\n.ph.has-img{border-color:transparent;background-color:#0e0e0e;background-clip:padding-box}`);

// 2) iOS scroll smoothness: drop backdrop-filter on touch devices (biggest Safari jank source)
sub('ios-backdrop',
  `.nav-in{display:flex;align-items:center;justify-content:space-between;height:100%;gap:16px}`,
  `.nav-in{display:flex;align-items:center;justify-content:space-between;height:100%;gap:16px}\n` +
  `@media (hover:none){.nav.scrolled{backdrop-filter:none;-webkit-backdrop-filter:none;background:rgba(10,10,10,.97)}` +
  `.mob{backdrop-filter:none;-webkit-backdrop-filter:none;background:#0a0a0a}}`);

// 3) Throttle the WebGL smoke to ~30fps (halves GPU load on iOS; smoke looks identical)
sub('shader-throttle',
  `(function loop(now){ if(visible) draw(now); requestAnimationFrame(loop); })(0);`,
  `var _last=0;(function loop(now){ if(visible && now-_last>=33){ _last=now; draw(now); } requestAnimationFrame(loop); })(0);`);

writeFileSync(F, h);
console.log('\nPatched ' + F);
