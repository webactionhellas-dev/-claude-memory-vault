import { readFile, writeFile } from 'node:fs/promises';
const U = new URL('../index.html', import.meta.url);
let html = await readFile(U, 'utf8');
const start = html.indexOf('<script id="drip-lux-js">');
const end = html.indexOf('</script>', start) + '</script>'.length;
if (start < 0) throw new Error('lux-js not found');
const NEW = `<script id="drip-lux-js">
(function(){
  function ensureBar(){ var b=document.getElementById('lux-progress');
    if(!b){ b=document.createElement('div'); b.id='lux-progress'; (document.body||document.documentElement).appendChild(b); }
    return b; }
  // Universal scroll metric: works with native scroll AND Lenis/transform scroll.
  function progress(){ var top=document.body.getBoundingClientRect().top;
    var max=document.body.scrollHeight-window.innerHeight;
    return max>0?Math.min(1,Math.max(0,(-top)/max)):0; }
  function loop(){ ensureBar().style.width=(progress()*100).toFixed(2)+'%'; requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
  // luxury blur-up for lazy images as they decode
  function watch(img){ if(img.dataset.luxSeen) return; img.dataset.luxSeen='1';
    var run=function(){ if(img.naturalWidth>2) img.classList.add('lux-in'); };
    if(img.complete) run(); else img.addEventListener('load',run,{once:true}); }
  function scan(){ ensureBar(); document.querySelectorAll('img[loading="lazy"]').forEach(watch); }
  if(document.readyState!=='loading') scan(); else addEventListener('DOMContentLoaded',scan);
  new MutationObserver(scan).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>`;
html = html.slice(0,start) + NEW + html.slice(end);
await writeFile(U, html);
console.log('patched lux-js (rAF universal scroll progress).');
