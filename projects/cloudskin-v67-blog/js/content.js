/* content.js - applies owner-edited overrides (CLOUDSKIN Content Studio).
   Two jobs:
   1) TEXT + IMAGES: swap [data-content] textContent and [data-content-img] src
      (plus the saved focal point in <key>.pos), so edited copy/photos win in every
      language. Runs after i18n / shell so overrides land last.
   2) PRODUCT CONTROLS: merge the owner's per-product Best Seller / New / gender /
      display-order edits onto window.CLOUDSKIN_PRODUCTS (overriding the static
      curate.js defaults), then ask the homepage + collection controllers to
      re-render so badges, filtering and order reflect the edits.

   FIRST-PAINT SNAPSHOT (js/content-snapshot.js, baked at deploy time):
   If window.CLOUDSKIN_CONTENT_SNAPSHOT is present, we SEED from it synchronously
   right now - merging the owner's photos/flags onto the catalog, applying her
   text/link/image overrides, and firing content-ready - so the home rails and the
   collection grid paint the FINAL, owner-edited data on the very first frame with
   NO network wait and NO fallback to catalogue defaults. We THEN still fetch
   Supabase live to pick up any edits made AFTER the deploy and apply only the delta
   (if the live data equals the snapshot we do nothing; if it differs we update once,
   reusing the same content-ready / products-updated path so there is no flash).

   If NO snapshot is present (script not baked), this falls back to exactly the
   previous behaviour: the page controllers hold their first paint until we fetch and
   fire content-ready, or fail-open on a short timeout. Either way the site is never
   left blank and never broken. */
(function () {
  var C = window.CLOUDSKIN || (window.CLOUDSKIN = {});

  /* ---- readiness signal ----
     Dispatch `cloudskin:content-ready` exactly once, the moment the final product data
     is settled: after the owner's overrides are merged (from the snapshot, or from the
     live fetch), or immediately when Supabase is not configured / unreachable / errors
     (fail-open). The home rails and collection grid hold their first paint until this
     fires (or their own short timeout elapses), so the shopper never sees the default
     set reshuffle into the override-applied set. */
  var readySignalled = false;
  function signalReady() {
    if (readySignalled) return;
    readySignalled = true;
    C.contentReady = true;
    var ev;
    try { ev = new CustomEvent('cloudskin:content-ready'); }
    catch (e) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('cloudskin:content-ready', true, false, null); }
    document.dispatchEvent(ev);
  }

  /* ---- link-target overrides ----
     The Studio lets the owner choose where a merchandising image/button opens, saved
     as a collection SLUG under keys like home.collbanner.link / home.cat.tile1.link /
     home.editorial.link / nav.women.feature.link. We only ever rewrite the href to a
     known collection slug; an empty or unknown value leaves the element's built-in
     href untouched (fail-open, a link never breaks). */
  var LINK_SLUGS = {
    collection: 1, women: 1, men: 1, trending: 1, 'new': 1, bestsellers: 1,
    tops: 1, bottoms: 1, dresses: 1, skirts: 1, shorts: 1, bras: 1, layers: 1,
    tennis: 1, padel: 1, studio: 1, train: 1
  };

  /* ---- text + image + link swaps ---- */
  function apply(map) {
    document.querySelectorAll('[data-content]').forEach(function (el) {
      if (el.classList.contains('vlm-editing')) return;   // never stomp text the owner is actively editing in Vellum (a delayed re-apply could otherwise roll back a fresh commit mid-keystroke)
      var v = map[el.getAttribute('data-content')];
      if (v != null && v !== '') el.textContent = v;
    });
    document.querySelectorAll('[data-content-img]').forEach(function (el) {
      var key = el.getAttribute('data-content-img');
      var v = map[key];
      var pos = map[key + '.pos'];
      // SMOOTH SWAP for EVERY merchandising slot: decode the owner's newly-chosen photo BEFORE
      // swapping, then apply the image + focal in the SAME frame. This stops the old-then-new
      // flash / reposition-jump when the owner changes any slot's photo in /studio or /creator
      // (the built-in image would otherwise paint first, then pop to the new one, sometimes
      // repositioning to the new focal before the new pixels arrive). Was hero-only; now covers
      // the about hero, about ethos ("our story"), collbanner, editorial, category tiles, mega
      // feature and any other [data-content-img]. (The durable zero-swap is the first-paint bake in
      // scripts/deploy.mjs; this decode-then-swap is the runtime smooth-swap for photos changed after deploy.)
      if (v && el.src !== v && el.currentSrc !== v) {
        var pic = el.closest('picture');
        var pre = new Image(), done = false;
        var applyImg = function () {
          if (done) return; done = true;
          el.src = v; el.removeAttribute('srcset');
          if (pic) pic.querySelectorAll('source').forEach(function (s) { s.srcset = v; });
          if (pos) el.style.objectPosition = pos;
        };
        if (pre.decode) { pre.src = v; pre.decode().then(applyImg).catch(applyImg); }
        else { pre.onload = applyImg; pre.onerror = applyImg; pre.src = v; }
        return;
      }
      // No new photo (or the slot already shows it): just apply the saved focal (no-op when none).
      if (pos) el.style.objectPosition = pos;
    });
    document.querySelectorAll('[data-content-link]').forEach(function (el) {
      var slug = map[el.getAttribute('data-content-link')];
      if (slug == null) return;
      slug = String(slug).trim();
      // page targets (Our Story / Home) in addition to collection slugs; empty/unknown
      // leaves the element's built-in href untouched (fail-open, a link never breaks).
      if (slug === '__about') el.setAttribute('href', 'about.html');
      else if (slug === '__home') el.setAttribute('href', 'home.html');
      else if (slug && LINK_SLUGS[slug]) el.setAttribute('href', 'collection.html?c=' + slug);
    });
    // CSS-background pictures (e.g. the newsletter band): the section's background photo is a
    // --vlm-bg CSS var layered under the darkening gradient in main.css, so the owner can swap
    // the picture without losing the overlay/framing. Empty/absent keeps the built-in default.
    document.querySelectorAll('[data-content-bg]').forEach(function (el) {
      var v = map[el.getAttribute('data-content-bg')];
      if (v) el.style.setProperty('--vlm-bg', 'url("' + String(v).replace(/["\\]/g, encodeURIComponent) + '")');
    });
    // HERO FADE: the owner-chosen strength of the hero darkening scrim (for wordmark legibility),
    // saved 0-100% under home.hero.fade. main.css scales the scrim alpha by --hero-fade-mult, where
    // 50% == the built-in default (multiplier 1). An ABSENT or empty value leaves the multiplier
    // unset, so the scrim renders EXACTLY as designed (backward-compatible: the hero never changes
    // for anyone until the owner sets a value). Applied to whatever element carries the key.
    document.querySelectorAll('[data-content-fade]').forEach(function (el) {
      var v = map[el.getAttribute('data-content-fade')];
      if (v == null || v === '') { el.style.removeProperty('--hero-fade-mult'); return; }
      var p = parseFloat(v); if (isNaN(p)) return;
      if (p < 0) p = 0; else if (p > 100) p = 100;
      el.style.setProperty('--hero-fade-mult', (p / 50).toString());
    });
    // Announce that a content pass just ran so the Vellum editor (armed session only) can re-assert
    // the owner's in-session edits over it. No listener exists on the public site, so this is a no-op there.
    try { document.dispatchEvent(new CustomEvent('cloudskin:content-applied')); }
    catch (e) { try { var ev = document.createEvent('CustomEvent'); ev.initCustomEvent('cloudskin:content-applied', false, false, null); document.dispatchEvent(ev); } catch (e2) {} }
  }

  /* ---- product-control merge ----
     Tri-state flags: '1' forces on, '0' forces off, key absent = keep the curate.js
     default. Gender 'Unisex' = shown under BOTH Women and Men (matches the collection
     predicates in config.js). Order is a 1-based position; the controllers read
     p._orderOverride and fall back to the static curate order when it is absent. */
  function isFlagKey(k) { return /^product\.[^.]+\.(bestSeller|isNew|trending|hidden|gender|order|category)$/.test(k); }
  function isImgKey(k) { return /^product\.[^.]+\.images(\.|$)/.test(k); }
  function hasProductOverrides(map) {
    for (var k in map) { if (map.hasOwnProperty(k) && isFlagKey(k)) return true; }
    return false;
  }
  function mergeProducts(map) {
    var list = window.CLOUDSKIN_PRODUCTS || [];
    list.forEach(function (p) {
      if (!p || !p.handle) return;
      var pre = 'product.' + p.handle + '.';
      var touched = false;
      var bs = map[pre + 'bestSeller'];
      if (bs === '1') { p.bestSeller = true; touched = true; } else if (bs === '0') { p.bestSeller = false; touched = true; }
      var nw = map[pre + 'isNew'];
      if (nw === '1') { p.isNew = true; touched = true; } else if (nw === '0') { p.isNew = false; touched = true; }
      // Trending: owner-CURATED (independent control, not derived). '1' pins into the
      // Trending rail, '0'/absent leaves it out. content.js only reads it; the home rail
      // and the trending collection predicate consume p.trending (config.js / home.js).
      var tr = map[pre + 'trending'];
      if (tr === '1') { p.trending = true; touched = true; } else if (tr === '0') { p.trending = false; touched = true; }
      // Hidden: owner pulls a product from every shopper-facing surface. Feeds
      // CLOUDSKIN.isShopVisible via p._hidden (config.js HIDDEN_HANDLES stays static).
      var hd = map[pre + 'hidden'];
      if (hd === '1') { p._hidden = true; touched = true; } else if (hd === '0') { p._hidden = false; touched = true; }
      var g = map[pre + 'gender'];
      if (g === 'Women' || g === 'Men' || g === 'Unisex') { p.gender = g; touched = true; }
      // shop-by-category bucket: the value is stored directly (Tops/Bottoms/Dresses), which the
      // config.js collection predicates already match (tops includes "Tops", etc.). Independent
      // of the badge, so it does not set `touched`.
      var cat = map[pre + 'category'];
      if (cat === 'Tops' || cat === 'Bottoms' || cat === 'Dresses') p.category = cat;
      // re-derive the badge exactly like curate.js (New wins over Best Seller), but ONLY
      // for products the owner actually edited, so a non-flag badge on an untouched
      // product (e.g. the "Test" item, or a Sale tag) is never clobbered.
      if (touched) {
        if (p.isNew) p.badge = 'New';
        else if (p.bestSeller) p.badge = 'Best Seller';
        else if (p.badge === 'New' || p.badge === 'Best Seller') p.badge = null;
      }
      var ord = map[pre + 'order'];
      if (ord != null && ord !== '' && !isNaN(+ord)) p._orderOverride = +ord;
    });
  }

  /* ---- product photo merge ----
     Attach the owner's Content Studio photos (per colour) onto each product so the shared card
     factory (shell.js cardHTML) uses photo #1 as the card/preview image, matching the first image
     on the product page. Key shape: product.<handle>.images.<colourSlug> (flat -> slug ''). */
  function mergeStudioImages(map) {
    var list = window.CLOUDSKIN_PRODUCTS || [];
    list.forEach(function (p) {
      if (!p || !p.handle) return;
      var flatKey = 'product.' + p.handle + '.images';
      var colourPrefix = flatKey + '.';
      var imgs = null;
      Object.keys(map).forEach(function (k) {
        var slug;
        if (k === flatKey) slug = '';
        else if (k.indexOf(colourPrefix) === 0) slug = k.slice(colourPrefix.length);
        else return;
        var urls = String(map[k] || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (urls.length) { (imgs || (imgs = {}))[slug] = urls; }
      });
      if (imgs) p._studioImgs = imgs;
    });
  }
  function hasImageKeys(map) {
    for (var k in map) { if (map.hasOwnProperty(k) && isImgKey(k)) return true; }
    return false;
  }

  function announce(map) {
    var detail = { map: map };
    var ev;
    try { ev = new CustomEvent('cloudskin:products-updated', { detail: detail }); }
    catch (e) { ev = document.createEvent('CustomEvent'); ev.initCustomEvent('cloudskin:products-updated', true, false, detail); }
    document.dispatchEvent(ev);
  }

  /* ---- delta helpers (snapshot vs live) ---- */
  function eqVal(a, b) { return (a == null ? '' : String(a)) === (b == null ? '' : String(b)); }
  function mapsEqual(a, b) {
    var ak = Object.keys(a), bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    for (var i = 0; i < ak.length; i++) {
      var k = ak[i];
      if (!b.hasOwnProperty(k) || !eqVal(a[k], b[k])) return false;
    }
    return true;
  }
  // Did any PRODUCT-affecting key (flag or photo) change between two maps? Text/link/banner
  // changes are handled by apply() and must NOT trigger a grid/rail re-render on their own.
  function productKeysChanged(a, b) {
    var seen = {}, ks = Object.keys(a).concat(Object.keys(b));
    for (var i = 0; i < ks.length; i++) {
      var k = ks[i];
      if (seen[k]) continue; seen[k] = 1;
      if ((isFlagKey(k) || isImgKey(k)) && !eqVal(a[k], b[k])) return true;
    }
    return false;
  }

  /* Merge a content map onto the catalog + fire products-updated when product data is present.
     Used for the live fetch (and, when there is no snapshot, for the one-and-only paint). */
  function mergeAndAnnounce(map) {
    var hasFlags = hasProductOverrides(map), hasImgs = hasImageKeys(map);
    if (hasFlags) mergeProducts(map);
    if (hasImgs) mergeStudioImages(map);
    if (hasFlags || hasImgs) announce(map);
  }

  /* =========================================================================
     1) SNAPSHOT SEED - synchronous, instant, correct first paint.
     ========================================================================= */
  var snap = window.CLOUDSKIN_CONTENT_SNAPSHOT || null;
  if (snap) window.CLOUDSKIN_CONTENT_LIVE = snap;   // best-known content until the live fetch resolves; the Vellum editor reads this to seed the Complete-the-Look picker from the owner's published picks
  if (snap) {
    // The catalog is enriched with the owner's FINAL photos + flags BEFORE anything paints...
    if (hasProductOverrides(snap)) mergeProducts(snap);
    if (hasImageKeys(snap)) mergeStudioImages(snap);
    // ...her text/link/image chrome is swapped in (content.js is deferred, so the DOM exists)...
    apply(snap);
    // ...and the held first paint is released with the final data. No network was involved.
    signalReady();
  }

  /* =========================================================================
     2) LIVE FETCH - pick up edits made AFTER the deploy, apply only the delta.
     ========================================================================= */
  var cfg = window.CLOUDSKIN_SB || {};
  if (!cfg.url || !cfg.anonKey || !window.supabase) {
    // No backend configured. If we seeded from the snapshot we already painted the correct
    // data and signalled ready; otherwise fail-open so consumers paint the curate defaults.
    signalReady();
    return;
  }
  var sb = window.CLOUDSKIN_SB_CLIENT || window.supabase.createClient(cfg.url, cfg.anonKey);
  window.CLOUDSKIN_SB_CLIENT = sb;

  sb.from('cloudskin_content').select('key,value').then(function (res) {
    if (res.error || !res.data) { signalReady(); return; }   // fail-open (snapshot already applied, if any)
    var map = {}; res.data.forEach(function (r) { map[r.key] = r.value == null ? '' : String(r.value); });
    window.CLOUDSKIN_CONTENT_LIVE = map;   // the authoritative live content; Vellum seeds the Complete-the-Look picker from this so a new pick extends her real list instead of replacing it

    if (snap && mapsEqual(map, snap)) return;   // live == snapshot: nothing to do, no reshuffle

    if (snap) {
      // DELTA path: the owner edited content after the deploy. Re-render the grid/rail ONCE, and
      // only if a product flag/photo actually changed (a pure text/banner edit is applied below
      // without touching the catalog, so the grid never reshuffles for a copy tweak).
      if (hasImageKeys(map)) mergeStudioImages(map);
      if (hasProductOverrides(map)) mergeProducts(map);
      if (productKeysChanged(snap, map)) announce(map);
    } else {
      // NO snapshot: this is the one-and-only settle. Merge + announce, then release first paint.
      mergeAndAnnounce(map);
      signalReady();
    }
    // Text/image/link overrides land LAST so edited copy always wins over the rendered headings.
    apply(map);
    setTimeout(function () { apply(map); }, 400);   // re-apply once in case i18n/shell re-rendered late
  }).catch(function () { signalReady(); });   // network/promise failure: fail-open (snapshot stands, if any)
})();
