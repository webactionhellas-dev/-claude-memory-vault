/* ============================================================
   DRIP — shared shop logic: data, chrome, cart, cards
   ============================================================ */
const DRIP = (() => {
  const money = n => new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const qs = new URLSearchParams(location.search);
  let _cache = null;

  async function products() {
    if (_cache) return _cache;
    const r = await fetch('data/products.json');
    _cache = await r.json();
    return _cache;
  }
  async function categories() {
    const r = await fetch('data/categories.json');
    return r.json();
  }

  /* ---------- cart (localStorage) ---------- */
  const CART_KEY = 'drip_cart_v1';
  const cart = {
    get() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } },
    set(v) { localStorage.setItem(CART_KEY, JSON.stringify(v)); paintCount(); },
    add(item) {
      const c = cart.get();
      const k = item.slug + '|' + item.size;
      const ex = c.find(x => x.slug + '|' + x.size === k);
      if (ex) ex.qty += item.qty || 1; else c.push({ ...item, qty: item.qty || 1 });
      cart.set(c); renderDrawer(); openDrawer();
    },
    remove(k) { cart.set(cart.get().filter(x => x.slug + '|' + x.size !== k)); renderDrawer(); },
    count() { return cart.get().reduce((n, x) => n + x.qty, 0); },
    total() { return cart.get().reduce((n, x) => n + x.price * x.qty, 0); },
  };
  function paintCount() { document.querySelectorAll('.cart-count').forEach(e => { const n = cart.count(); e.textContent = n; e.dataset.n = n; }); }

  /* ---------- chrome ---------- */
  const NAV = [
    ['Home', 'index.html'], ['Shop', 'shop.html'], ['Brands', 'shop.html?view=brands'],
    ['New Arrivals', 'shop.html?c=new-arrivals'], ['Sale', 'shop.html?c=sale', 'sale'],
  ];
  function icon(name) {
    const I = {
      search: '<path d="M21 21l-4.3-4.3M11 19a8 8 0 100-16 8 8 0 000 16z"/>',
      bag: '<path d="M6 7h12l1 14H5L6 7z"/><path d="M9 7a3 3 0 016 0"/>',
      heart: '<path d="M12 21s-7-4.5-9.5-9A5 5 0 0112 5a5 5 0 019.5 7C19 16.5 12 21 12 21z"/>',
      close: '<path d="M6 6l12 12M18 6L6 18"/>', star: '<path d="M12 3l2.7 5.6L21 9.5l-4.5 4.4 1 6.1L12 17l-5.5 3 1-6.1L3 9.5l6.3-.9z"/>',
      truck: '<path d="M3 7h11v8H3zM14 10h4l3 3v2h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/>',
      shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>', arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    };
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${I[name] || ''}</svg>`;
  }
  function header(active) {
    const links = NAV.map(([l, h, c]) => `<a href="${h}" class="${c || ''} ${active === l ? 'active' : ''}">${l}</a>`).join('');
    const mlinks = NAV.map(([l, h, c]) => `<a href="${h}" class="${active === l ? 'active' : ''}">${l}</a>`).join('');
    return `<div class="announce">Free express shipping · 24h delivery in Athens · 100% authenticated</div>
      <header class="site-header glass"><div class="wrap"><div class="bar">
      <a class="brand" href="index.html" aria-label="DRIP home"><img src="assets/brand/drip-logo.png" alt="DRIP"></a>
      <nav class="nav">${links}</nav>
      <div class="hicons">
        <button class="iconbtn" aria-label="Search" onclick="DRIP.toggleSearch()">${icon('search')}</button>
        <button class="iconbtn" aria-label="Wishlist">${icon('heart')}</button>
        <button class="iconbtn" aria-label="Cart" onclick="DRIP.openDrawer()">${icon('bag')}<span class="cart-count" data-n="0"></span></button>
      </div>
    </div><div class="mnav">${mlinks}</div></div></header>`;
  }
  function footer() {
    const col = (h, items) => `<div><h5>${h}</h5>${items.map(i => `<a href="${i[1]}">${i[0]}</a>`).join('')}</div>`;
    return `<footer class="site-footer"><div class="wrap">
      <div class="foot-grid">
        <div><a href="index.html"><img class="foot-logo" src="assets/brand/drip-logo.png" alt="DRIP"></a>
          <p class="muted" style="max-width:300px;margin-top:18px;font-size:13.5px;line-height:1.7">Athens' home for authenticated grails. Every pair inspected by hand, sealed, and at your door in 24 hours. We don't sell sneakers — we move culture.</p></div>
        ${col('Shop', [['All Sneakers', 'shop.html'], ['New Arrivals', 'shop.html?c=new-arrivals'], ['Best Sellers', 'shop.html?c=featured'], ['Sale', 'shop.html?c=sale']])}
        ${col('Brands', [['Air Jordan', 'shop.html?brand=Jordan'], ['Nike', 'shop.html?brand=Nike'], ['Yeezy', 'shop.html?brand=Yeezy'], ['New Balance', 'shop.html?brand=New Balance']])}
        ${col('Help', [['Shipping', '#'], ['Returns', '#'], ['Authenticity', '#'], ['Contact', '#']])}
      </div>
      <div class="foot-bottom">
        <span>© ${new Date().getFullYear()} DRIP — Kifisia, Athens · Authenticated luxury sneakers &amp; streetwear</span>
        <span class="pay">Visa · Mastercard · Apple&nbsp;Pay · Klarna · Prices in&nbsp;€&nbsp;EUR</span>
      </div>
    </div></footer>`;
  }

  /* ---------- cart drawer ---------- */
  function drawerEl() {
    let m = document.getElementById('drip-drawer');
    if (m) return m;
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="drawer-mask" id="drip-mask" onclick="DRIP.closeDrawer()"></div>
      <aside class="drawer" id="drip-drawer">
        <div class="dhead"><h3>Your Bag</h3><button class="iconbtn" onclick="DRIP.closeDrawer()">${icon('close')}</button></div>
        <div class="ditems" id="drip-ditems"></div>
        <div class="dfoot" id="drip-dfoot"></div>
      </aside>`;
    document.body.appendChild(wrap);
    return document.getElementById('drip-drawer');
  }
  function renderDrawer() {
    drawerEl();
    const items = cart.get();
    const box = document.getElementById('drip-ditems');
    const foot = document.getElementById('drip-dfoot');
    if (!items.length) { box.innerHTML = `<div class="dempty">Your bag is empty.<br><br><a class="btn-load" style="display:inline-block;line-height:50px" href="shop.html">Start shopping</a></div>`; foot.innerHTML = ''; return; }
    box.innerHTML = items.map(x => {
      const k = x.slug + '|' + x.size;
      return `<div class="citem"><a href="product.html?handle=${x.slug}"><img loading="lazy" src="${x.image}" alt=""></a>
        <div style="flex:1"><div class="ci-name">${x.name}</div><div class="ci-meta">${x.brand} · Size ${x.size} · Qty ${x.qty}</div><div class="ci-price">${money(x.price * x.qty)}</div></div>
        <button class="ci-rm" onclick="DRIP.cart.remove('${k.replace(/'/g, "\\'")}')">Remove</button></div>`;
    }).join('');
    foot.innerHTML = `<div class="row"><span class="muted">Subtotal</span><b>${money(cart.total())}</b></div>
      <button class="btn-primary" style="width:100%" onclick="DRIP.toast('Checkout is a demo on this build ✦')">Checkout</button>
      <p class="muted" style="text-align:center;font-size:11.5px;margin:12px 0 0">Free express shipping · 24h delivery in Athens</p>`;
  }
  function openDrawer() { drawerEl(); renderDrawer(); document.getElementById('drip-mask').classList.add('open'); document.getElementById('drip-drawer').classList.add('open'); }
  function closeDrawer() { document.getElementById('drip-mask')?.classList.remove('open'); document.getElementById('drip-drawer')?.classList.remove('open'); }

  /* ---------- search overlay ---------- */
  function toggleSearch() {
    let el = document.getElementById('drip-search');
    if (el) { el.remove(); return; }
    el = document.createElement('div');
    el.id = 'drip-search';
    el.style = 'position:fixed;inset:0;z-index:92;background:rgba(3,3,4,.92);backdrop-filter:blur(10px);display:flex;flex-direction:column;align-items:center;padding-top:14vh';
    el.innerHTML = `<div class="wrap" style="width:100%;max-width:720px">
      <input id="drip-search-input" placeholder="Search 311 sneakers…" autofocus
        style="width:100%;background:none;border:none;border-bottom:2px solid var(--accent);color:#fff;font-family:var(--font-display);text-transform:uppercase;font-size:clamp(26px,5vw,46px);padding:14px 0;outline:none">
      <div id="drip-search-res" style="margin-top:24px;max-height:52vh;overflow:auto"></div></div>`;
    el.addEventListener('click', e => { if (e.target === el) el.remove(); });
    document.body.appendChild(el);
    const inp = document.getElementById('drip-search-input'); inp.focus();
    inp.addEventListener('input', async () => {
      const q = inp.value.trim().toLowerCase();
      const res = document.getElementById('drip-search-res');
      if (q.length < 2) { res.innerHTML = ''; return; }
      const list = (await products()).filter(p => (p.name + ' ' + p.brand).toLowerCase().includes(q)).slice(0, 8);
      res.innerHTML = list.length ? list.map(p => `<a href="product.html?handle=${p.slug}" style="display:flex;gap:14px;align-items:center;padding:12px;border-radius:14px" onmouseover="this.style.background='var(--glass)'" onmouseout="this.style.background='none'">
        <img loading="lazy" src="${p.images[0]}" style="width:54px;height:66px;object-fit:cover;border-radius:9px"><div><div style="font-size:14px">${p.name}</div><div class="muted" style="font-size:12px">${p.brand} · ${money(p.price)}</div></div></a>`).join('')
        : `<p class="muted">No matches for "${q}".</p>`;
    });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { el.remove(); document.removeEventListener('keydown', esc); } });
  }

  /* ---------- product card ---------- */
  function card(p) {
    const off = p.compareAtPrice ? Math.round((1 - p.price / p.compareAtPrice) * 100) : 0;
    const badge = p.badge ? `<span class="badge ${p.badge}">${p.badge === 'sale' ? '-' + off + '%' : p.badge}</span>` : '';
    const sw = (p.colors || []).slice(0, 4).map(c => `<span class="swatch" style="background:${c.hex}" title="${c.name}"></span>`).join('');
    return `<article class="card">
      <div class="frame">
        ${badge}
        <button class="wish" aria-label="Wishlist" onclick="event.preventDefault();DRIP.toast('Saved to wishlist ♡')">${icon('heart')}</button>
        <a href="product.html?handle=${p.slug}" aria-label="${p.name}">
          <img loading="lazy" src="${p.images[0]}" alt="${p.name}"
            onerror="this.src='${(p.images[1] || p.images[0])}'">
        </a>
        <div class="glow"></div>
        <a class="quick" href="product.html?handle=${p.slug}">Quick View ${icon('arrow')}</a>
      </div>
      <div class="meta">
        <div class="brandline">${p.brand}</div>
        <a href="product.html?handle=${p.slug}"><div class="name">${p.name}</div></a>
        <div class="priceline"><span class="price">${money(p.price)}</span>${p.compareAtPrice ? `<span class="compare">${money(p.compareAtPrice)}</span><span class="off">-${off}%</span>` : ''}</div>
        ${sw ? `<div class="swatches">${sw}</div>` : ''}
      </div>
    </article>`;
  }

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) {
    let t = document.getElementById('drip-toast');
    if (!t) { t = document.createElement('div'); t.id = 'drip-toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function mountChrome(active) {
    document.getElementById('hdr').innerHTML = header(active);
    document.getElementById('ftr').innerHTML = footer();
    paintCount();
  }

  /* ---------- 360 spin viewer (auto-spin + drag-to-spin) ---------- */
  function spin360(el, frames, opts) {
    opts = opts || {};
    frames.forEach(s => { const i = new Image(); i.src = s; });   // preload
    let idx = 0, auto = opts.auto !== false, dragging = false, lastX = 0, acc = 0;
    const N = frames.length;
    const show = i => { idx = ((i % N) + N) % N; el.src = frames[idx]; };
    show(0);
    const timer = setInterval(() => { if (auto && !dragging) show(idx + 1); }, opts.speed || 85);
    const px = e => e.touches ? e.touches[0].clientX : e.clientX;
    const down = e => { dragging = true; lastX = px(e); auto = false; el.style.cursor = 'grabbing'; };
    const move = e => {
      if (!dragging) return;
      const x = px(e); acc += x - lastX; lastX = x;
      const step = (el.clientWidth || 320) / N;
      while (Math.abs(acc) >= step) { show(idx + (acc > 0 ? 1 : -1)); acc += acc > 0 ? -step : step; }
    };
    const up = () => { if (!dragging) return; dragging = false; el.style.cursor = 'grab'; clearTimeout(up._t); up._t = setTimeout(() => { auto = (opts.auto !== false); }, 2200); };
    el.addEventListener('mousedown', down); el.addEventListener('touchstart', down, { passive: true });
    addEventListener('mousemove', move); addEventListener('touchmove', move, { passive: true });
    addEventListener('mouseup', up); addEventListener('touchend', up);
    return { stop: () => clearInterval(timer) };
  }

  return { money, qs, products, categories, cart, card, icon, header, footer, mountChrome, openDrawer, closeDrawer, renderDrawer, toggleSearch, toast, spin360 };
})();
