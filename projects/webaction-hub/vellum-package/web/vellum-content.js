/* =====================================================================
   VELLUM / vellum-content.js - the PUBLIC content applier.
   ---------------------------------------------------------------------
   Applies the owner's saved overrides onto the rendered page. Include on
   EVERY public page, deferred, after window.VELLUM_CFG (vellum.config.js)
   and the supabase-js UMD build. Fail-open everywhere: if the backend is
   missing, unreachable, or a value is empty, the site's built-in content
   stands and the page is never blank or broken.

   1) TEXT + IMAGES + LINKS + BACKGROUNDS: swap [data-content] textContent,
      [data-content-img] src (plus the saved focal point in <key>.pos),
      [data-content-link] href (through the cfg.linkTargets whitelist ONLY),
      and [data-content-bg] via the --vlm-bg CSS variable.
      SECURITY INVARIANT: text applies with textContent ONLY (never
      innerHTML); images/links apply as attributes only; background URLs
      are escaped before entering url("..."). Do not weaken any of these.
   2) OPTIONAL PRODUCT CONTROLS (cfg.products present): merge the owner's
      per-product flags (bestSeller / isNew / trending / hidden / gender /
      category / order) and per-colour photo lists onto the live catalog
      returned by cfg.products.list(), then fire "vellum:products-updated"
      so the site's own controllers re-render. With no cfg.products, every
      product path is skipped entirely (a marketing site never runs it).

   FIRST-PAINT SNAPSHOT (optional, baked at deploy time): if
   window.VELLUM_SNAPSHOT is present (a plain {key: value} map), we seed
   from it synchronously, apply, and fire "vellum:content-ready" with no
   network wait; the live fetch then applies only the delta. Without a
   snapshot, consumers may hold first paint until content-ready fires (or
   their own short timeout elapses). Either way: never blank, never broken.
   ===================================================================== */
(function () {
  var cfg = window.VELLUM_CFG || {};
  var V = window.VELLUM || (window.VELLUM = {});
  var TABLE = cfg.contentTable || "site_content";
  var LT = cfg.linkTargets || {};
  var P = (cfg.products && typeof cfg.products.list === "function") ? cfg.products : null;

  function prodList() {
    if (!P) return [];
    try { var a = P.list(); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }

  /* ---- readiness signal ----
     Dispatch "vellum:content-ready" exactly once, the moment the final
     content is settled: after overrides are merged (snapshot or live), or
     immediately when the backend is not configured / unreachable (fail-open). */
  var readySignalled = false;
  function signalReady() {
    if (readySignalled) return;
    readySignalled = true;
    V.contentReady = true;
    var ev;
    try { ev = new CustomEvent("vellum:content-ready"); }
    catch (e) { ev = document.createEvent("CustomEvent"); ev.initCustomEvent("vellum:content-ready", true, false, null); }
    document.dispatchEvent(ev);
  }

  /* ---- text + image + link + background swaps ---- */
  function apply(map) {
    document.querySelectorAll("[data-content]").forEach(function (el) {
      if (el.classList && el.classList.contains("vlm-editing")) return;   // never clobber a field the owner is editing right now
      var v = map[el.getAttribute("data-content")];
      if (v != null && v !== "") el.textContent = v;   // textContent ONLY: the load-bearing XSS guard
    });
    document.querySelectorAll("[data-content-img]").forEach(function (el) {
      var key = el.getAttribute("data-content-img");
      var v = map[key];
      if (v) {
        el.src = v; el.removeAttribute("srcset");
        var pic = el.closest("picture");
        if (pic) pic.querySelectorAll("source").forEach(function (s) { s.srcset = v; });
      }
      // focal point saved by the editor: reframe the image (unchanged when none saved)
      var pos = map[key + ".pos"];
      if (pos) el.style.objectPosition = pos;
    });
    // The stored value is a SLUG resolved through the cfg.linkTargets whitelist,
    // never a raw URL. Empty/unknown leaves the element's built-in href untouched
    // (fail-open, a link never breaks).
    document.querySelectorAll("[data-content-link]").forEach(function (el) {
      var slug = map[el.getAttribute("data-content-link")];
      if (slug == null) return;
      slug = String(slug).trim();
      if (slug && Object.prototype.hasOwnProperty.call(LT, slug) && LT[slug]) el.setAttribute("href", LT[slug]);
    });
    // CSS-background sections: the photo is a --vlm-bg CSS var layered under the
    // site's own gradients/framing, so the owner can swap the picture without
    // losing the overlay. Empty/absent keeps the built-in default. Quotes and
    // backslashes are escaped before entering url("...").
    document.querySelectorAll("[data-content-bg]").forEach(function (el) {
      var v = map[el.getAttribute("data-content-bg")];
      if (v) el.style.setProperty("--vlm-bg", 'url("' + String(v).replace(/["\\]/g, encodeURIComponent) + '")');
    });
    // Announce every apply pass. The editor (when armed) re-asserts the owner's
    // fresh session edits on top, so the delayed re-apply below can never roll a
    // just-committed edit back to the previously-published value.
    var ev;
    try { ev = new CustomEvent("vellum:content-applied"); }
    catch (e) { ev = document.createEvent("CustomEvent"); ev.initCustomEvent("vellum:content-applied", true, false, null); }
    document.dispatchEvent(ev);
  }

  /* ---- product-control merge (only when cfg.products is present) ----
     Tri-state flags: '1' forces on, '0' forces off, key absent = keep the
     site's default. gender/category values are stored as chosen in the
     editor; the site's own collection predicates give them meaning. Order
     is a 1-based position; controllers read p._orderOverride and fall back
     to their static order when absent. Hidden feeds p._hidden. */
  function isFlagKey(k) { return /^product\.[^.]+\.(bestSeller|isNew|trending|hidden|gender|order|category)$/.test(k); }
  function isImgKey(k) { return /^product\.[^.]+\.images(\.|$)/.test(k); }
  function hasProductOverrides(map) {
    for (var k in map) { if (map.hasOwnProperty(k) && isFlagKey(k)) return true; }
    return false;
  }
  function mergeProducts(map) {
    prodList().forEach(function (p) {
      if (!p || !p.handle) return;
      var pre = "product." + p.handle + ".";
      var touched = false;
      var bs = map[pre + "bestSeller"];
      if (bs === "1") { p.bestSeller = true; touched = true; } else if (bs === "0") { p.bestSeller = false; touched = true; }
      var nw = map[pre + "isNew"];
      if (nw === "1") { p.isNew = true; touched = true; } else if (nw === "0") { p.isNew = false; touched = true; }
      // Trending is owner-CURATED (independent control, not derived from best/new).
      var tr = map[pre + "trending"];
      if (tr === "1") { p.trending = true; touched = true; } else if (tr === "0") { p.trending = false; touched = true; }
      // Hidden: the owner pulls a product from every shopper-facing surface (p._hidden).
      var hd = map[pre + "hidden"];
      if (hd === "1") { p._hidden = true; touched = true; } else if (hd === "0") { p._hidden = false; touched = true; }
      var g = map[pre + "gender"];
      if (g != null && String(g).trim()) { p.gender = String(g).trim(); touched = true; }
      // category bucket: stored verbatim; the site's collection predicates match it.
      // Independent of the badge, so it does not set `touched`.
      var cat = map[pre + "category"];
      if (cat != null && String(cat).trim()) p.category = String(cat).trim();
      // re-derive the badge (New wins over Best Seller), but ONLY for products the
      // owner actually edited, so a non-flag badge on an untouched product (e.g. a
      // Sale tag) is never clobbered.
      if (touched) {
        if (p.isNew) p.badge = "New";
        else if (p.bestSeller) p.badge = "Best Seller";
        else if (p.badge === "New" || p.badge === "Best Seller") p.badge = null;
      }
      var ord = map[pre + "order"];
      if (ord != null && ord !== "" && !isNaN(+ord)) p._orderOverride = +ord;
    });
  }

  /* ---- product photo merge ----
     Attach the owner's photos (per colour) onto each product as p._vlmImgs so the
     site's card factory can use photo #1 as the card image, matching the first
     image on the product page. Key shape: product.<handle>.images.<colourSlug>
     (flat key -> slug ''), value = newline-joined URLs. */
  function mergeOwnerImages(map) {
    prodList().forEach(function (p) {
      if (!p || !p.handle) return;
      var flatKey = "product." + p.handle + ".images";
      var colourPrefix = flatKey + ".";
      var imgs = null;
      Object.keys(map).forEach(function (k) {
        var slug;
        if (k === flatKey) slug = "";
        else if (k.indexOf(colourPrefix) === 0) slug = k.slice(colourPrefix.length);
        else return;
        var urls = String(map[k] || "").split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (urls.length) { (imgs || (imgs = {}))[slug] = urls; }
      });
      if (imgs) p._vlmImgs = imgs;
    });
  }
  function hasImageKeys(map) {
    for (var k in map) { if (map.hasOwnProperty(k) && isImgKey(k)) return true; }
    return false;
  }

  function announce(map) {
    var detail = { map: map };
    var ev;
    try { ev = new CustomEvent("vellum:products-updated", { detail: detail }); }
    catch (e) { ev = document.createEvent("CustomEvent"); ev.initCustomEvent("vellum:products-updated", true, false, detail); }
    document.dispatchEvent(ev);
  }

  /* ---- delta helpers (snapshot vs live) ---- */
  function eqVal(a, b) { return (a == null ? "" : String(a)) === (b == null ? "" : String(b)); }
  function mapsEqual(a, b) {
    var ak = Object.keys(a), bk = Object.keys(b);
    if (ak.length !== bk.length) return false;
    for (var i = 0; i < ak.length; i++) {
      var k = ak[i];
      if (!b.hasOwnProperty(k) || !eqVal(a[k], b[k])) return false;
    }
    return true;
  }
  // Did any PRODUCT-affecting key (flag or photo) change between two maps?
  // Text/link/background changes are handled by apply() and must NOT trigger
  // a grid/rail re-render on their own.
  function productKeysChanged(a, b) {
    var seen = {}, ks = Object.keys(a).concat(Object.keys(b));
    for (var i = 0; i < ks.length; i++) {
      var k = ks[i];
      if (seen[k]) continue; seen[k] = 1;
      if ((isFlagKey(k) || isImgKey(k)) && !eqVal(a[k], b[k])) return true;
    }
    return false;
  }

  /* Merge a content map onto the catalog + fire products-updated when product
     data is present. Used for the live fetch (and, with no snapshot, for the
     one-and-only paint). No-op without cfg.products. */
  function mergeAndAnnounce(map) {
    if (!P) return;
    var hasFlags = hasProductOverrides(map), hasImgs = hasImageKeys(map);
    if (hasFlags) mergeProducts(map);
    if (hasImgs) mergeOwnerImages(map);
    if (hasFlags || hasImgs) announce(map);
  }

  /* =========================================================================
     1) SNAPSHOT SEED - synchronous, instant, correct first paint.
     ========================================================================= */
  var snap = window.VELLUM_SNAPSHOT || null;
  if (snap) {
    if (P) {
      if (hasProductOverrides(snap)) mergeProducts(snap);
      if (hasImageKeys(snap)) mergeOwnerImages(snap);
    }
    apply(snap);        // this script is deferred, so the DOM exists
    signalReady();      // release the held first paint with the final data
  }

  /* =========================================================================
     2) LIVE FETCH - pick up edits made after the deploy, apply only the delta.
     ========================================================================= */
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) {
    // No backend configured. If we seeded from the snapshot we already painted
    // the correct data; otherwise fail-open so consumers paint their defaults.
    signalReady();
    return;
  }
  var sb = window.VELLUM_SB_CLIENT || window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  window.VELLUM_SB_CLIENT = sb;

  sb.from(TABLE).select("key,value").then(function (res) {
    if (res.error || !res.data) { signalReady(); return; }   // fail-open (snapshot already applied, if any)
    var map = {}; res.data.forEach(function (r) { map[r.key] = r.value == null ? "" : String(r.value); });

    if (snap && mapsEqual(map, snap)) return;   // live == snapshot: nothing to do, no reshuffle

    if (snap) {
      // DELTA path: the owner edited content after the deploy. Re-render the
      // grid/rails ONCE, and only if a product flag/photo actually changed (a
      // pure text/banner edit never reshuffles the catalog).
      if (P) {
        if (hasImageKeys(map)) mergeOwnerImages(map);
        if (hasProductOverrides(map)) mergeProducts(map);
        if (productKeysChanged(snap, map)) announce(map);
      }
    } else {
      // NO snapshot: this is the one-and-only settle.
      mergeAndAnnounce(map);
      signalReady();
    }
    // Text/image/link overrides land LAST so edited copy always wins.
    apply(map);
    setTimeout(function () { apply(map); }, 400);   // re-apply once in case the site re-rendered late (i18n, shells)
  }).catch(function () { signalReady(); });   // network failure: fail-open (snapshot stands, if any)
})();
