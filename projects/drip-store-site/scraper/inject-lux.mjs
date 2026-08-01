// Stage 5: inject an additive "luxury" CSS+JS layer (no React/JS-logic changes).
import { readFile, writeFile } from 'node:fs/promises';
const HTMLU = new URL('../index.html', import.meta.url);
let html = await readFile(HTMLU, 'utf8');

const GRAIN = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

const STYLE = `<style id="drip-lux">
/* ============ DRIP — luxury layer (additive, non-destructive) ============ */
:root{ --lux:var(--accent,#00e5ff); }
@media (prefers-reduced-motion:no-preference){ html{scroll-behavior:smooth} }
*{ -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }
body{ text-rendering:optimizeLegibility; }
::selection{ background:var(--lux); color:#04181c; }

/* — refined scrollbar — */
*{ scrollbar-width:thin; scrollbar-color:rgba(0,229,255,.5) transparent; }
::-webkit-scrollbar{ width:10px; height:10px; }
::-webkit-scrollbar-track{ background:#070708; }
::-webkit-scrollbar-thumb{ background:linear-gradient(#0b3c44,#009fb6); border-radius:20px; border:2px solid #070708; }
::-webkit-scrollbar-thumb:hover{ background:linear-gradient(#0e525e,var(--lux)); }

/* — considered focus states — */
a:focus-visible,button:focus-visible,[tabindex]:focus-visible{
  outline:2px solid var(--lux); outline-offset:3px; border-radius:12px;
}

/* — cinematic product imagery: ken-burns zoom on the framed card image — */
@media (prefers-reduced-motion:no-preference){
  .group:hover .glass img{ transform:scale(1.06); }
}
.group:hover .glass img{ filter:saturate(1.06) contrast(1.03); }

/* — elevate the card frame on hover (does NOT touch the JS tilt transform) — */
.group > .glass{ transition:box-shadow .55s cubic-bezier(.2,.7,.2,1), border-color .55s ease; will-change:box-shadow; }
.group:hover > .glass{
  box-shadow:0 44px 90px -34px rgba(0,229,255,.34), 0 18px 44px -20px rgba(0,0,0,.72);
  border-color:rgba(0,229,255,.28);
}

/* — richer glassmorphism depth — */
.glass,.glass-strong{ backdrop-filter:blur(18px) saturate(1.5); -webkit-backdrop-filter:blur(18px) saturate(1.5); }

/* — luxury blur-up for lazy images — */
img.lux-in{ animation:luxIn .9s cubic-bezier(.2,.7,.2,1) both; }
@keyframes luxIn{ from{opacity:0;filter:blur(14px) saturate(.55);transform:scale(1.045)} to{opacity:1;filter:none;transform:none} }

/* — ambient cinematic grain + vignette (pseudo-els on <html>; never block input) — */
html::before{ content:"";position:fixed;inset:0;z-index:35;pointer-events:none;opacity:.045;mix-blend-mode:overlay;background-image:url("${GRAIN}");background-size:160px 160px; }
html::after{ content:"";position:fixed;inset:0;z-index:34;pointer-events:none;background:radial-gradient(135% 115% at 50% -5%,transparent 55%,rgba(0,0,0,.5) 100%); }

/* — top scroll-progress filament — */
#lux-progress{ position:fixed;top:0;left:0;height:2px;width:0;z-index:70;pointer-events:none;
  background:linear-gradient(90deg,rgba(0,229,255,0),var(--lux));box-shadow:0 0 14px rgba(0,229,255,.9); }

/* — crisp, premium image base — */
img{ image-rendering:-webkit-optimize-contrast; }
</style>`;

const SCRIPT = `<script id="drip-lux-js">
(function(){
  // scroll-progress filament (appended to <html> so React never reconciles it away)
  var bar=document.createElement('div'); bar.id='lux-progress';
  document.documentElement.appendChild(bar);
  var ticking=false;
  function upd(){ var d=document.documentElement, max=d.scrollHeight-d.clientHeight;
    bar.style.width=(max>0?(d.scrollTop/max*100):0)+'%'; ticking=false; }
  addEventListener('scroll',function(){ if(!ticking){ requestAnimationFrame(upd); ticking=true; } },{passive:true});
  // luxury blur-up: fade lazy images in as they decode
  function watch(img){ if(img.dataset.luxSeen) return; img.dataset.luxSeen='1';
    var run=function(){ if(img.naturalWidth>2){ img.classList.add('lux-in'); } };
    if(img.complete) run(); else img.addEventListener('load',run,{once:true}); }
  function scan(){ document.querySelectorAll('img[loading="lazy"]').forEach(watch); }
  if(document.readyState!=='loading') scan(); else addEventListener('DOMContentLoaded',scan);
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>`;

if (html.includes('id="drip-lux"')) { console.log('lux layer already present — skipping'); process.exit(0); }
html = html.replace('</head>', STYLE + '</head>');
html = html.replace('</body>', SCRIPT + '</body>');
await writeFile(HTMLU, html);
console.log('Injected luxury CSS+JS layer.');
