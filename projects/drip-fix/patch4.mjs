import { readFileSync, writeFileSync } from 'fs';
const F = 'C:/Users/mikef/Downloads/drip-barbershop-optimized.html';
let h = readFileSync(F, 'utf8');
function sub(name, from, to) {
  const n = h.split(from).length - 1;
  if (n !== 1) throw new Error('ANCHOR bad ('+n+'): ' + name);
  h = h.replace(from, to);
  console.log('OK  ' + name);
}

const NOISE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

const CSS = `
/* ════════ COOL UPGRADES ════════ */
/* 1 · Film grain (cinematic texture) */
.grain{position:fixed;inset:-50%;z-index:9990;pointer-events:none;opacity:.045;
  background-image:url("${NOISE}");background-size:200px 200px}
@media (hover:hover){.grain{animation:grainShift .9s steps(5) infinite}}
@keyframes grainShift{0%{transform:translate(0,0)}20%{transform:translate(-3%,-2%)}40%{transform:translate(2%,-3%)}60%{transform:translate(-2%,2%)}80%{transform:translate(3%,3%)}100%{transform:translate(0,0)}}
@media (prefers-reduced-motion:reduce){.grain{animation:none}}

/* 2 · Tiffany sheen sweeping across "DRIPPING" */
.hero-h1 .drip-word{display:inline-block;position:relative;overflow:hidden}
.hero-h1 .drip-word::after{content:'';position:absolute;top:0;left:0;width:50%;height:100%;
  transform:translateX(-160%) skewX(-16deg);
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.5),transparent);
  mix-blend-mode:screen;pointer-events:none;
  animation:heroSheen 5.5s ease-in-out 2.2s infinite}
@keyframes heroSheen{0%{transform:translateX(-160%) skewX(-16deg)}45%{transform:translateX(330%) skewX(-16deg)}100%{transform:translateX(330%) skewX(-16deg)}}
@media (prefers-reduced-motion:reduce){.hero-h1 .drip-word::after{display:none}}

/* 3 · Photo hover reveal: grayscale -> full colour + zoom (devices that can hover) */
@media (hover:hover){
  .gal .ph,.barber .ph{filter:grayscale(.6) contrast(1.03);transition:filter .6s var(--ease),transform .7s var(--ease)}
  .gal:hover .ph,.barber:hover .ph{filter:grayscale(0) contrast(1)}
  .barber:hover .ph{transform:scale(1.06)}
}
`;

// inject CSS
sub('css', `</style>`, CSS + `\n</style>`);

// inject grain element
sub('grain-el', `<body>`, `<body>\n<div class="grain" aria-hidden="true"></div>`);

// inject cursor-reactive smoke + logo parallax (desktop, motion-safe)
const JS = `
<script>
(function(){
  var smoke = document.getElementById('smoke-global');
  var logo  = document.querySelector('.hero-logo-img');
  if(!smoke) return;
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!fine || reduce) return;
  var tx=0, ty=0, cx=0, cy=0;
  window.addEventListener('mousemove', function(e){
    tx = (e.clientX / window.innerWidth)  - 0.5;
    ty = (e.clientY / window.innerHeight) - 0.5;
  }, {passive:true});
  (function loop(){
    cx += (tx - cx) * 0.045;
    cy += (ty - cy) * 0.045;
    smoke.style.transform = 'scale(1.09) translate(' + (cx*22).toFixed(2) + 'px,' + (cy*22).toFixed(2) + 'px)';
    if(logo) logo.style.transform = 'translate(' + (cx*-12).toFixed(2) + 'px,' + (cy*-9).toFixed(2) + 'px)';
    requestAnimationFrame(loop);
  })();
})();
</script>
`;
sub('cursor-js', `</body>`, JS + `</body>`);

writeFileSync(F, h);
console.log('\nPatched ' + F);
