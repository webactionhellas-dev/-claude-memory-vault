import { readFileSync, writeFileSync } from 'fs';
const F = 'C:/Users/mikef/Downloads/drip-barbershop-optimized.html';
let h = readFileSync(F, 'utf8');

function sub(name, from, to) {
  const n = h.split(from).length - 1;
  if (n === 0) throw new Error('ANCHOR NOT FOUND: ' + name);
  if (n !== 1) throw new Error('ANCHOR NOT UNIQUE (' + n + '): ' + name);
  h = h.replace(from, to);
  console.log('OK  ' + name);
}

// ── SMOKE MORE VISIBLE: lighten the hero scrim ───────────────
// Was a strong radial (.05 -> .5 -> .88) biased hard to the left + a heavy
// linear (.18 -> .42 -> .8). Lighten both so the tiffany smoke shows through
// across the whole hero, keeping just enough darkening at the bottom for the CTAs.
sub('scrim-radial',
  `    radial-gradient(110% 95% at 26% 30%, rgba(10,10,10,.05), rgba(10,10,10,.5) 48%, rgba(10,10,10,.88) 100%),`,
  `    radial-gradient(125% 105% at 42% 30%, rgba(10,10,10,0), rgba(10,10,10,.24) 58%, rgba(10,10,10,.6) 100%),`);
sub('scrim-linear',
  `    linear-gradient(180deg, rgba(10,10,10,.18) 0%, rgba(10,10,10,.42) 55%, rgba(10,10,10,.8) 100%),`,
  `    linear-gradient(180deg, rgba(10,10,10,.04) 0%, rgba(10,10,10,.20) 58%, rgba(10,10,10,.58) 100%),`);

// ── DRIPS: bigger + meltier ──────────────────────────────────
sub('drip-size',
  `width:clamp(8px,1.05vw,13px);height:clamp(8px,1.05vw,13px);`,
  `width:clamp(10px,1.3vw,16px);height:clamp(10px,1.3vw,16px);`);

// Stretch as they fall (round at top -> elongated/melty at the bottom) + more opaque
sub('drip-kf-0',
  `  0%{transform:translateY(0) scaleY(1.5) rotate(45deg) scale(var(--s,1));opacity:0}`,
  `  0%{transform:translateY(0) scaleY(1.4) rotate(45deg) scale(var(--s,1));opacity:0}`);
sub('drip-kf-8',
  `  8%{opacity:.7}`,
  `  8%{opacity:.9}`);
sub('drip-kf-92',
  `  92%{opacity:.55}`,
  `  92%{opacity:.7}`);
sub('drip-kf-100',
  `  100%{transform:translateY(112vh) scaleY(1.5) rotate(45deg) scale(var(--s,1));opacity:0}`,
  `  100%{transform:translateY(112vh) scaleY(2.6) rotate(45deg) scale(var(--s,1));opacity:0}`);

// ── DRIPS: more of them, slower (more viscous) ───────────────
sub('drip-count',  `    for(var i=0;i<16;i++){`, `    for(var i=0;i<28;i++){`);
sub('drip-left',   `      var left = (i/16*100) + (Math.sin(i*3)*3);`, `      var left = (i/28*100) + (Math.sin(i*3)*3);`);
sub('drip-dur',    `      var dur = 6.5 + (i%5)*2.2;`, `      var dur = 7.5 + (i%5)*2.6;`);
sub('drip-delay',  `      var delay = (i*0.7)%9;`, `      var delay = (i*0.5)%10;`);
sub('drip-scale',  `      var sc = 0.55 + (i%4)*0.35;`, `      var sc = 0.6 + (i%4)*0.4;`);

writeFileSync(F, h);
console.log('\nPatched ' + F);
