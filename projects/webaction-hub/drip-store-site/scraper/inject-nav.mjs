// Add a capture-phase link interceptor so the homepage's SPA routes
// map to the real static pages (shop.html / product.html). Idempotent.
import { readFile, writeFile } from 'node:fs/promises';
const U = new URL('../index.html', import.meta.url);
let html = await readFile(U, 'utf8');
if (html.includes('id="drip-nav"')) {
  const s = html.indexOf('<script id="drip-nav">');
  const e = html.indexOf('</script>', s) + 9;
  html = html.slice(0, s) + html.slice(e);
}
const BS = String.fromCharCode(92);
const NAV = `<script id="drip-nav">
(function(){
  var BRAND={nike:'Nike',jordan:'Jordan','air-jordan':'Jordan',adidas:'Adidas',asics:'ASICS','new-balance':'New Balance',salomon:'Salomon',yeezy:'Yeezy',ugg:'UGG'};
  function clean(h){ h=h.split('?')[0].split('#')[0]; while(h.charAt(h.length-1)==='/') h=h.slice(0,-1); return h; }
  function map(href){
    if(!href) return null;
    if(href.charAt(0)==='#') return null;
    if(href==='/'||href==='') return 'index.html';
    if(href.indexOf('/product/')===0){ var h=clean(href).slice(9); return h?('product.html?handle='+encodeURIComponent(h)):'shop.html'; }
    if(href.indexOf('/shop')===0){
      var q=href.indexOf('?')>=0?href.slice(href.indexOf('?')+1):'';
      var sp=new URLSearchParams(q);
      if(sp.get('c')) return 'shop.html?c='+encodeURIComponent(sp.get('c'));
      if(sp.get('b')){ var s=sp.get('b').toLowerCase(); return BRAND[s]?('shop.html?brand='+encodeURIComponent(BRAND[s])):'shop.html?view=brands'; }
      return 'shop.html';
    }
    return null;
  }
  window.__dripNav=0;
  document.addEventListener('click',function(e){
    var t=e.target; var a=(t&&t.closest)?t.closest('a[href]'):null;
    if(!a) return;
    var dest=map(a.getAttribute('href'));
    if(dest===null) return;
    window.__dripNav++;
    e.preventDefault(); e.stopImmediatePropagation();
    window.location.assign(dest);
  },true);
})();
</script>`;
html = html.replace('</body>', NAV + '</body>');
await writeFile(U, html);
console.log('nav interceptor injected (fixed). marker BS ok:', BS === String.fromCharCode(92));
