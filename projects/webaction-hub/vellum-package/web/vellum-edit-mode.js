/* =====================================================================
   VELLUM / vellum-edit-mode.js - the on-canvas edit layer (GENERIC)
   ---------------------------------------------------------------------
   "Edit the live site by clicking it." This is the generalized,
   production-proven editor: every backend name, link target, and product
   hook comes from window.VELLUM_CFG (vellum.config.js); nothing in this
   file is site-specific. Writes go through the save RPC (cfg.rpc.save,
   default "vellum_save"); image uploads go through the upload edge
   function (cfg.uploadFunction); the owner's password is verified server
   side by the creator gate page and re-sent per write. The public site
   (vellum-content.js) reads the content table and applies the overrides,
   always fail-open to the built-in defaults.

   SELF-GATING: this layer arms ONLY when sessionStorage <cfg.session.armed,
   default "vlm-armed"> === "1" (set by vellum-creator.js after a server
   side password check). Without it, the IIFE returns immediately: zero
   chrome, zero listeners, nothing the public can ever see. The default
   integration does not even load this file on public views (see the
   armed-session lazy loader in INTEGRATION.md).

   What it does:
   - armed-session boot -> auto-enters edit mode on every page; "Done"
     disarms the session
   - TEXT  [data-content]        : click-to-edit in place, WORDS ONLY,
                                   captures textContent only (never innerHTML),
                                   paste is forced to text/plain
                                   -> save {key: text}
   - IMAGE [data-content-img]    : Replace photo (client resize -> upload fn
                                   dest:'site' -> save {key: url}) + Adjust
                                   focus -> save {key+'.pos': 'x% y%'}
   - BG    [data-content-bg]     : Replace the section's background photo
                                   (--vlm-bg CSS var; framing stays in CSS)
   - LINK  [data-content-link]   : friendly "When tapped, opens" dropdown
                                   -> save {key: slug} (cfg.linkTargets)
   - PRODUCTS (cfg.products only): re-merchandise cards in place (category,
                                   Trending / Best Sellers / New, audience,
                                   Show/Hide, drag-reorder via FLIP)
                                   -> save product.<h>.* keys; per-colour
                                   PDP photo management; Complete the Look
   - REVERT / REVERT ALL         : save {key: ''} by default (the applier
                                   fail-opens empty back to the built-in);
                                   cfg.revert === 'delete' uses the delete
                                   RPC (cfg.rpc.del) for a true row delete
   - Vellum bar                  : live save-state + Outline editables + Done
   - edit mode PERSISTS across page navigation (armed session)

   All chrome mounts in #vlm-root (a direct child of <body>) so a sticky /
   backdrop-filter header can never trap it.
   ===================================================================== */
(function () {
  "use strict";

  var cfg = window.VELLUM_CFG || {};
  var SES = cfg.session || {};
  var K_ARMED = SES.armed || "vlm-armed";
  var K_PW = SES.pw || "vlm-pw";

  /* ---- SELF-GATING: this whole layer exists ONLY for an armed owner session.
     vellum-creator.js verifies the password server-side and sets the armed
     flag + password in sessionStorage. Absent -> render ZERO chrome, attach
     ZERO listeners: the public never sees the editor. ---- */
  var ARMED = false; try { ARMED = sessionStorage.getItem(K_ARMED) === "1"; } catch (e) {}
  if (!ARMED) return;
  var PW = ""; try { PW = sessionStorage.getItem(K_PW) || ""; } catch (e) {}

  /* ---- config surface (everything site-specific lives in VELLUM_CFG) ---- */
  var RPC_SAVE = (cfg.rpc && cfg.rpc.save) || "vellum_save";
  var RPC_DEL = (cfg.rpc && cfg.rpc.del) || "vellum_delete";
  // read at call time (not frozen at boot) so a config-driven site can switch
  // revert semantics without a reload; default stays the byte-compatible
  // empty-string save.
  function revertMode() { return ((window.VELLUM_CFG || cfg).revert === "delete") ? "delete" : "empty"; }
  var SITE_NAME = cfg.siteName || (location.hostname || "this site");
  var IMGC = cfg.image || {};
  var IMG_MAXDIM = IMGC.maxDim || 2560;
  var IMG_QUALITY = IMGC.jpegQuality || 0.88;

  /* products layer: entirely optional. Absent -> a plain marketing site;
     every product/merch/gallery path below is feature-gated on these. */
  var PRODUCTS = (cfg.products && typeof cfg.products.list === "function") ? cfg.products : null;
  var CARD_SEL = (PRODUCTS && PRODUCTS.cardSelector) || ".pcard";
  var CARD_NAME_SEL = (PRODUCTS && PRODUCTS.cardName) || ".pcard__name";
  var CARD_MEDIA_SEL = (PRODUCTS && PRODUCTS.cardMedia) || ".pcard__media";
  var CATS = (PRODUCTS && PRODUCTS.categories) || (PRODUCTS ? ["Tops", "Bottoms", "Dresses"] : []);
  var AUDS = (PRODUCTS && PRODUCTS.audiences) || (PRODUCTS ? ["Women", "Men", "Unisex"] : []);
  var AUD_LABELS = (PRODUCTS && PRODUCTS.audienceLabels) || { Unisex: "Both" };
  var PDP = (PRODUCTS && PRODUCTS.pdp) || null;
  var CTL_ON = !!(PDP && PDP.completeLookRail && PRODUCTS.cardHTML);
  var MENUPIN = cfg.menuPin || { item: ".nav__item", menu: ".mega" };

  function prodList() {
    if (!PRODUCTS) return [];
    try { var a = PRODUCTS.list(); return Array.isArray(a) ? a : []; } catch (e) { return []; }
  }

  /* ---- link targets (cfg.linkTargets: slug -> href; labels/groups optional) ---- */
  var LT = cfg.linkTargets || {};
  function slugLabel(s) {
    var L = cfg.linkLabels || {};
    if (L[s]) return L[s];
    var t = String(s).replace(/^_+/, "").replace(/[-_]+/g, " ").trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : s;
  }
  var LINK_GROUPS = (function () {
    if (Array.isArray(cfg.linkGroups) && cfg.linkGroups.length) {
      return cfg.linkGroups.map(function (g) {
        return [g[0], (g[1] || []).filter(function (s) { return LT[s]; }).map(function (s) { return [slugLabel(s), s]; })];
      }).filter(function (g) { return g[1].length; });
    }
    var slugs = Object.keys(LT);
    return slugs.length ? [["Pages", slugs.map(function (s) { return [slugLabel(s), s]; })]] : [];
  })();
  var SLUG_FRIENDLY = {};
  LINK_GROUPS.forEach(function (g) { g[1].forEach(function (o) { SLUG_FRIENDLY[o[1]] = o[0]; }); });
  function resolveUrl(h) { try { return new URL(h, location.href).href; } catch (e) { return String(h || ""); } }
  var HREF2SLUG = {};
  Object.keys(LT).forEach(function (s) { if (LT[s]) HREF2SLUG[resolveUrl(LT[s])] = s; });
  function slugFromHref(href) { return href ? (HREF2SLUG[resolveUrl(href)] || "") : ""; }
  function hrefForSlug(slug) { return (slug && LT[slug]) || ""; }

  /* ---- tiny helpers ---- */
  var doc = document, body = doc.body;
  function el(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function els(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function vw() { return doc.documentElement.clientWidth; }
  function vh() { return doc.documentElement.clientHeight; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function svg(paths, attrs) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (attrs || 1.7) + '">' + paths + '</svg>';
  }

  var PLAIN = (function () {
    try { var d = doc.createElement("div"); d.setAttribute("contenteditable", "plaintext-only"); return d.contentEditable === "plaintext-only"; }
    catch (e) { return false; }
  })();

  /* ===================================================================
     LIVE PERSISTENCE (mirrors the proven house implementation)
     ---------------------------------------------------------------
     - text/flag/link/order/photo-list -> sb.rpc(RPC_SAVE,
       { p_password: PW, p_items: {key: value, ...} })
     - true deletes (cfg.revert === 'delete') -> sb.rpc(RPC_DEL,
       { p_password: PW, p_keys: [...] })
     - image upload -> POST <supabaseUrl>/functions/v1/<uploadFunction>
     A pending queue holds writes so edits made DURING a save round-trip
     are never lost; errors are retry-safe (keys stay pending); a
     beforeunload guard fires while anything is unsaved.
     =================================================================== */
  var SB0 = window.VELLUM_SB_CLIENT ||
            ((window.supabase && cfg.supabaseUrl && cfg.supabaseAnonKey) ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null);
  if (SB0) window.VELLUM_SB_CLIENT = SB0;
  var UPLOAD_URL = String(cfg.supabaseUrl || "").replace(/\/+$/, "") + "/functions/v1/" + (cfg.uploadFunction || "vellum-upload");
  // re-read the global at call time so sb.rpc stays stub-able for offline parity checks
  function sbClient() { return window.VELLUM_SB_CLIENT || SB0 || null; }

  var pending = {};      // key -> value awaiting a save flush
  var pendingDel = {};   // key -> 1 awaiting a delete flush (revert mode 'delete' only)
  var inFlight = false;  // a save/delete round-trip is in the air
  var uploads = 0;       // upload calls in flight (for an honest save indicator)
  var flushT = null;

  function defObj(k, v) { var o = {}; o[k] = v; return o; }

  function markSaving() { if (vsave) { vsave.classList.add("saving"); if (vstext) vstext.textContent = "Saving..."; } }
  function maybeSaved() {
    if (uploads || inFlight || Object.keys(pending).length || Object.keys(pendingDel).length) return;
    if (vsave) { vsave.classList.remove("saving"); if (vstext) vstext.textContent = "All changes saved"; }
  }
  function markError() { if (vsave) { vsave.classList.remove("saving"); if (vstext) vstext.textContent = "Save failed - retrying..."; } }

  // Queue one or more key/value writes. Values are strings; '' means "revert to
  // the built-in default" (the applier fail-opens empty -> default).
  function queueSave(items) {
    if (!items) return;
    var any = false;
    Object.keys(items).forEach(function (k) { pending[k] = String(items[k] == null ? "" : items[k]); delete pendingDel[k]; any = true; });
    if (!any) return;
    markSaving();
    scheduleFlush(300);
  }
  // Queue a revert for one or more keys. Default mode saves '' (byte-compatible
  // with the proven implementation); 'delete' mode truly removes the rows.
  function queueRevert(keys) {
    if (!keys || !keys.length) return;
    if (revertMode() === "delete") {
      keys.forEach(function (k) { delete pending[k]; pendingDel[k] = 1; });
      markSaving();
      scheduleFlush(300);
    } else {
      var o = {}; keys.forEach(function (k) { o[k] = ""; });
      queueSave(o);
    }
  }
  function scheduleFlush(delay) {
    if (flushT) return;
    flushT = setTimeout(function () { flushT = null; flush(); }, delay || 300);
  }
  function flush() {
    if (inFlight) return;                        // in-flight completion re-checks pending
    var keys = Object.keys(pending);
    var delKeys = Object.keys(pendingDel);
    if (!keys.length && !delKeys.length) { maybeSaved(); return; }
    var c = sbClient();
    if (!c || !PW) { markError(); scheduleFlush(1500); return; }   // can't write yet: keep pending, retry
    if (keys.length) {
      var batch = {}; keys.forEach(function (k) { batch[k] = pending[k]; });
      inFlight = true; markSaving();
      c.rpc(RPC_SAVE, { p_password: PW, p_items: batch }).then(function (r) {
        inFlight = false;
        if (r && r.error) { markError(); scheduleFlush(1500); return; }   // retry-safe: keep pending, retry
        // clear only keys still unchanged since we sent them, so edits made
        // DURING the round-trip are preserved
        keys.forEach(function (k) { if (pending[k] === batch[k]) delete pending[k]; });
        if (Object.keys(pending).length || Object.keys(pendingDel).length) scheduleFlush(150); else maybeSaved();
      }).catch(function () { inFlight = false; markError(); scheduleFlush(1500); });
      return;
    }
    // deletes flush after saves so a revert can never race its own earlier save
    inFlight = true; markSaving();
    c.rpc(RPC_DEL, { p_password: PW, p_keys: delKeys }).then(function (r) {
      inFlight = false;
      if (r && r.error) { markError(); scheduleFlush(1500); return; }
      delKeys.forEach(function (k) { delete pendingDel[k]; });
      if (Object.keys(pending).length || Object.keys(pendingDel).length) scheduleFlush(150); else maybeSaved();
    }).catch(function () { inFlight = false; markError(); scheduleFlush(1500); });
  }

  // Upload edge function contract (byte-compatible with the backend package):
  // body { password, handle, filename, contentType, dataBase64, dest? } -> { url }.
  // dest:'site' for general site images; product photos pass NO dest.
  function uploadImage(handleOrKey, filename, dataUrl, dest) {
    var payload = { password: PW, handle: handleOrKey, filename: filename || "photo.jpg", contentType: "image/jpeg", dataBase64: dataUrl };
    if (dest) payload.dest = dest;
    return fetch(UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": cfg.supabaseAnonKey, "Authorization": "Bearer " + cfg.supabaseAnonKey },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok || !body || !body.url) throw new Error((body && body.error) || ("upload failed (" + res.status + ")"));
        return body.url;
      });
    });
  }
  function trackedUpload(handleOrKey, filename, dataUrl, dest) {
    uploads++; markSaving();
    return uploadImage(handleOrKey, filename, dataUrl, dest).then(function (url) {
      uploads = Math.max(0, uploads - 1); return url;
    }, function (e) { uploads = Math.max(0, uploads - 1); maybeSaved(); throw e; });
  }

  // client-side resize (longest edge IMG_MAXDIM, JPEG at IMG_QUALITY)
  function resizeImage(file, maxDim, cb) {
    var img = new Image();
    img.onload = function () {
      var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      var c = doc.createElement("canvas"); c.width = w; c.height = h;
      var ctx = c.getContext("2d"); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      cb(c.toDataURL("image/jpeg", IMG_QUALITY));
    };
    img.onerror = function () { cb(null); };
    var fr = new FileReader();
    fr.onload = function (e) { img.src = e.target.result; };
    fr.readAsDataURL(file);
  }
  function showUploadError(node, msg) {
    if (vsave) { vsave.classList.remove("saving"); if (vstext) vstext.textContent = "A photo did not upload - try again"; }
    try { console.warn("[vellum] upload failed:", msg); } catch (e) {}
  }

  /* ---- action -> content-key maps (the exact save contract) ---- */
  function merchKeys(h) {
    var s = psSeed(h), pre = "product." + h + ".", o = {};
    o[pre + "bestSeller"] = s.best ? "1" : "0";
    o[pre + "isNew"]      = s.isnew ? "1" : "0";
    o[pre + "trending"]   = s.trend ? "1" : "0";     // INDEPENDENT control, never derived from best/new
    o[pre + "hidden"]     = s.hidden ? "1" : "0";
    if (AUDS.length) o[pre + "gender"] = s.gender;
    if (CATS.length) o[pre + "category"] = s.cat;
    return o;
  }
  function orderKeys() {
    var o = {}; orderedHandles().forEach(function (h, i) { o["product." + h + ".order"] = String(i + 1); }); return o;
  }

  /* ===================================================================
     BUILD THE CHROME (once) into #vlm-root (direct child of body)
     =================================================================== */
  function segButtons(list, labels) {
    return list.map(function (v) {
      var lab = (labels && labels[v]) || v;
      return '<button data-v="' + escH(v) + '">' + escH(lab) + '</button>';
    }).join("");
  }
  function escH(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"; }); }

  var root = doc.createElement("div");
  root.id = "vlm-root";
  root.innerHTML =
    // passe-partout frame + veil (no public entry pill: the session is armed by the creator gate)
    '<div class="vlm-frame"></div>' +
    // hover + selection rings + hover chip
    '<div class="vlm-ring vlm-ring--hover" id="vlmHoverRing"></div>' +
    '<div class="vlm-ring vlm-ring--sel" id="vlmSelRing"></div>' +
    '<div class="vlm-chip" id="vlmChip"></div>' +
    // text hint + saved tick
    '<div class="vlm-hint" id="vlmHint"></div>' +
    '<div class="vlm-saved" id="vlmSaved">' + svg('<path d="M5 12l5 5L20 6"/>', 2.4) + ' Saved</div>' +
    // image tools overlay
    '<div class="vlm-imgtools" id="vlmImg">' +
      '<div class="vlm-imgtools__scrim"></div>' +
      '<div class="vlm-imgtools__label">Photo</div>' +
      '<div class="vlm-imgtools__cta">' +
        '<button class="vlm-imgbtn" data-vlm-replace>' + svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5L5 20"/>') + ' Replace photo</button>' +
        '<button class="vlm-imgbtn vlm-imgbtn--ghost" data-vlm-adjust>' + svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>') + ' Adjust focus</button>' +
        '<button class="vlm-imgbtn vlm-imgbtn--ghost" data-vlm-imglink style="display:none">' + svg('<path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1"/>') + ' Set link</button>' +
      '</div>' +
      '<div class="vlm-focal" id="vlmFocal"></div>' +
      '<div class="vlm-prog"><i></i></div>' +
    '</div>' +
    // link toolbar (standalone links)
    '<div class="vlm-flyout vlm-linkbar" id="vlmLinkbar">' +
      '<span class="vlm-linkbar__label">When tapped, opens</span>' +
      '<button class="vlm-linkbtn" data-vlm-linkopen><span class="vlm-linkbtn__txt">Choose</span> ' + svg('<path d="M6 9l6 6 6-6"/>', 2) + '</button>' +
    '</div>' +
    // link dropdown (shared)
    '<div class="vlm-flyout vlm-linkpop" id="vlmLinkpop"></div>' +
    // merchandising panel (products layer; never opens without cfg.products)
    '<div class="vlm-flyout vlm-merch" id="vlmMerch">' +
      '<div class="vlm-merch__head">' +
        '<div class="vlm-merch__eyebrow">' + svg('<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v6l9 4 9-4V7"/>', 1.8) + ' Re-merchandise</div>' +
        '<div class="vlm-merch__title">Product</div>' +
      '</div>' +
      '<button class="vlm-merch__open" data-vlm-openpdp>' + svg('<path d="M4 12h16M13 5l7 7-7 7"/>', 2) + ' Edit this product’s page' + '</button>' +
      '<div class="vlm-merch__body">' +
        (CATS.length ? '<div class="vlm-merch__sec"><span class="vlm-merch__lab">Category</span>' +
          '<div class="vlm-seg" data-vlm-cat>' + segButtons(CATS) + '</div></div>' : '') +
        '<div class="vlm-merch__sec"><span class="vlm-merch__lab">Show in</span>' +
          '<div class="vlm-toggles">' +
            '<div class="vlm-tgl" data-vlm-flag="trending"><span>Trending</span><span class="vlm-sw"></span></div>' +
            '<div class="vlm-tgl" data-vlm-flag="best"><span>Best Sellers</span><span class="vlm-sw"></span></div>' +
            '<div class="vlm-tgl" data-vlm-flag="new"><span>New Arrivals</span><span class="vlm-sw"></span></div>' +
          '</div>' +
          '<p class="vlm-merch__hint">Best Seller and New show as badges on collection pages.</p></div>' +
        (AUDS.length ? '<div class="vlm-merch__sec"><span class="vlm-merch__lab">Audience</span>' +
          '<div class="vlm-seg" data-vlm-gender>' + segButtons(AUDS, AUD_LABELS) + '</div></div>' : '') +
        '<div class="vlm-merch__sec">' +
          '<div class="vlm-merch__row">' +
            '<button class="vlm-mbtn" data-vlm-hide>' + svg('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="2.5"/>', 1.8) + ' <span data-vlm-hidelbl>Hide</span></button>' +
            '<button class="vlm-mbtn" data-vlm-move="-1" aria-label="Move earlier">' + svg('<path d="M15 6l-6 6 6 6"/>', 2) + '</button>' +
            '<button class="vlm-mbtn" data-vlm-move="1" aria-label="Move later">' + svg('<path d="M9 6l6 6-6 6"/>', 2) + '</button>' +
            '<span class="vlm-grip" data-vlm-grip title="Drag to reorder">' + svg('<circle cx="9" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.3" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.3" fill="currentColor" stroke="none"/>') + ' Drag</span>' +
          '</div>' +
          '<p class="vlm-merch__note">Changes save to your live site as you make them.</p>' +
        '</div>' +
      '</div>' +
    '</div>' +
    // the Vellum bar (global controls only)
    '<div class="vlm-bar">' +
      '<div class="vlm-mark"><span class="vlm-glyph"></span><span><b>Editing</b><small>' + escH(SITE_NAME) + '</small></span></div>' +
      '<div class="vlm-vsave" id="vlmVsave"><span class="vlm-sdot"></span><span class="vlm-stext">All changes saved</span></div>' +
      '<button class="vlm-vtoggle" id="vlmMapToggle"><span class="vlm-sw2"></span><span class="vlm-vtoggle-label">Outline editables</span></button>' +
      '<button class="vlm-barbtn" id="vlmProdsBtn" title="Products &amp; order">' + svg('<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>', 1.7) + '<span class="vlm-barbtn__l">Products</span></button>' +
      '<button class="vlm-barbtn" id="vlmEditsBtn" title="Your edits">' + svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>', 1.7) + '<span class="vlm-barbtn__l">Edits</span><span class="vlm-editsbadge" id="vlmEditsBadge"></span></button>' +
      '<button class="vlm-done" id="vlmDone">Done</button>' +
    '</div>' +
    // nudge toast
    '<div class="vlm-nudge" id="vlmNudge"><span class="vlm-kk"></span> Tap anything with a blue label to change it. Your changes save to your live site as you go.</div>' +
    // hidden file input for image replace
    '<input type="file" id="vlmFile" accept="image/*" style="display:none" />' +
    // per-field "Revert to original" pill (appears when the selected element has an edit)
    '<button class="vlm-revert" id="vlmRevert">' + svg('<path d="M9 14l-4-4 4-4"/><path d="M5 10h9a5 5 0 015 5v1"/>', 2) + ' Revert to original</button>' +
    // dim scrim behind any open drawer
    '<div class="vlm-scrim" id="vlmScrim"></div>' +
    // PRODUCTS drawer (global catalog order + per-row quick toggles)
    '<aside class="vlm-drawer" id="vlmProds" aria-label="Products">' +
      '<div class="vlm-drawer__head"><div class="vlm-drawer__ttl"><b>Products</b><small>Drag to reorder your whole catalog</small></div>' +
        '<button class="vlm-drawer__x" data-vlm-drawerclose aria-label="Close">' + svg('<path d="M6 6l12 12M18 6L6 18"/>', 2) + '</button></div>' +
      '<div class="vlm-drawer__search"><input id="vlmProdSearch" type="text" placeholder="Search products..." autocomplete="off" /></div>' +
      '<div class="vlm-drawer__body" id="vlmProdsList"></div>' +
      '<p class="vlm-drawer__foot">Best Seller and New show as badges on collection pages. Hidden pulls the product from your storefront.</p>' +
    '</aside>' +
    // EDITS drawer (this session’s history)
    '<aside class="vlm-drawer" id="vlmEdits" aria-label="Your edits">' +
      '<div class="vlm-drawer__head"><div class="vlm-drawer__ttl"><b>Your edits</b><small id="vlmEditsSub">Nothing changed yet</small></div>' +
        '<button class="vlm-drawer__x" data-vlm-drawerclose aria-label="Close">' + svg('<path d="M6 6l12 12M18 6L6 18"/>', 2) + '</button></div>' +
      '<div class="vlm-drawer__tools"><button class="vlm-revertall" id="vlmRevertAll">' + svg('<path d="M9 14l-4-4 4-4"/><path d="M5 10h9a5 5 0 015 5v1"/>', 2) + ' Revert all changes</button></div>' +
      '<div class="vlm-drawer__body" id="vlmEditsList"></div>' +
    '</aside>' +
    // COMPLETE THE LOOK picker (PDP; products layer only)
    '<aside class="vlm-drawer" id="vlmCtl" aria-label="Complete the Look">' +
      '<div class="vlm-drawer__head"><div class="vlm-drawer__ttl"><b>Complete the Look</b><small>Pick up to 4 products to suggest with this item</small></div>' +
        '<button class="vlm-drawer__x" data-vlm-drawerclose aria-label="Close">' + svg('<path d="M6 6l12 12M18 6L6 18"/>', 2) + '</button></div>' +
      '<div class="vlm-ctl__chips" id="vlmCtlChips"></div>' +
      '<div class="vlm-ctl__meta"><span class="vlm-ctl__count" id="vlmCtlCount"></span>' +
        '<button class="vlm-ctl__auto" id="vlmCtlAuto">Use automatic pairing</button></div>' +
      '<div class="vlm-drawer__search"><input id="vlmCtlSearch" type="text" placeholder="Search products..." autocomplete="off" /></div>' +
      '<div class="vlm-drawer__body" id="vlmCtlList"></div>' +
      '<div class="vlm-drawer__actions"><p class="vlm-ctl__note">Empty = automatic pairing.</p>' +
        '<button class="vlm-ctl__apply" id="vlmCtlApply">Apply</button></div>' +
    '</aside>';
  body.appendChild(root);

  /* refs */
  var fileInput = el("#vlmFile", root),
      hoverRing = el("#vlmHoverRing", root), selRing = el("#vlmSelRing", root), chip = el("#vlmChip", root),
      hint = el("#vlmHint", root), savedTick = el("#vlmSaved", root),
      imgtools = el("#vlmImg", root), focal = el("#vlmFocal", root),
      linkbar = el("#vlmLinkbar", root), linkpop = el("#vlmLinkpop", root),
      merch = el("#vlmMerch", root),
      vsave = el("#vlmVsave", root), vstext = el(".vlm-stext", vsave),
      mapToggle = el("#vlmMapToggle", root), doneBtn = el("#vlmDone", root),
      nudge = el("#vlmNudge", root),
      revertPill = el("#vlmRevert", root), scrim = el("#vlmScrim", root),
      prodsD = el("#vlmProds", root), editsD = el("#vlmEdits", root), ctlPanel = el("#vlmCtl", root),
      prodsBtn = el("#vlmProdsBtn", root), editsBtn = el("#vlmEditsBtn", root), editsBadge = el("#vlmEditsBadge", root);

  // no product layer -> the Products button has nothing to manage; hide it
  if (!PRODUCTS) prodsBtn.style.display = "none";

  /* ===================================================================
     STATE
     =================================================================== */
  var inEditMode = false;
  var current = null;        // currently selected editable
  var repos = null;          // reposition fn for the active panel(s)
  var pinned = null;         // menu item held open while its poster is being edited
  var hidetagMap = new Map();// hidden card -> floating tag element

  /* ===================================================================
     SAVE INDICATOR - the authoritative save state is driven by the save
     queue (markSaving / maybeSaved / markError above); touchSave just
     nudges the bar into "Saving..." at an edit site.
     =================================================================== */
  function touchSave() { markSaving(); }

  /* ===================================================================
     SESSION CACHE (sessionStorage): drives the instant UI, the "Your edits"
     drawer and per-field revert across page navigation within one armed
     session. The DURABLE source of truth is the content table (every edit
     also queueSave()s). Everything fails soft on quota errors.
     =================================================================== */
  var PAGE = (location.pathname.split("/").pop() || "index").toLowerCase();
  function store(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function loadS(k, d) { try { var r = sessionStorage.getItem(k); return r ? JSON.parse(r) : d; } catch (e) { return d; } }
  function cssq(s) { return String(s || "").replace(/"/g, '\\"'); }
  function trunc(s, n) { s = String(s == null ? "" : s); n = n || 38; return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  var PSTATE = loadS("vlm-pstate", {});   // handle -> {best,isnew,trend,hidden,cat,gender,order}
  var EDITS  = loadS("vlm-edits", {});    // "type::key" -> {t,k,label,page,orig,cur,d0,d1,ts,meta}
  var ORIG   = loadS("vlm-orig", {});     // "page::key" -> first-ever original value
  var CTLMAP = loadS("vlm-ctl", {});      // handle -> [picked handles]
  var CTL_MAX = (PDP && PDP.completeLookMax) || 4;

  function prodBy(h) { var a = prodList(); for (var i = 0; i < a.length; i++) { if (a[i] && a[i].handle === h) return a[i]; } return null; }
  function manageable() {
    var keep = PRODUCTS && typeof PRODUCTS.manage === "function" ? PRODUCTS.manage : null;
    return prodList().filter(function (p) { return p && p.handle && (!keep || keep(p)); });
  }
  function baseIdx(h) { var a = prodList(); for (var i = 0; i < a.length; i++) { if (a[i] && a[i].handle === h) return i; } return 999; }
  function thumbFor(p) {
    if (PRODUCTS && typeof PRODUCTS.thumbFor === "function") { try { var t = PRODUCTS.thumbFor(p); if (t) return t; } catch (e) {} }
    return (p.images && p.images[0]) || (p.allImages && p.allImages[0]) || "";
  }
  function origFor(key, cur) {
    var id = PAGE + "::" + key;
    if (!(id in ORIG)) { ORIG[id] = cur; store("vlm-orig", ORIG); }
    return ORIG[id];
  }

  /* ---- per-product merchandising state (single source of truth) ---- */
  function seedStateOf(h) {
    var p = prodBy(h);
    var s = { best: 0, isnew: 0, trend: 0, hidden: 0, cat: CATS[0] || "", gender: AUDS[0] || "" };
    s.order = null;
    if (p) {
      s.best = p.bestSeller ? 1 : 0; s.isnew = p.isNew ? 1 : 0;
      // Trending default: sites whose Trending rail is on-unless-removed set
      // cfg.products.trendingDefaultOn; otherwise a product is Trending only
      // when its data says so.
      s.trend = (PRODUCTS && PRODUCTS.trendingDefaultOn) ? ((p.trending !== false) ? 1 : 0) : (p.trending ? 1 : 0);
      if (CATS.length) s.cat = CATS.indexOf(p.category) >= 0 ? p.category : CATS[0];
      if (AUDS.length) s.gender = AUDS.indexOf(p.gender) >= 0 ? p.gender : AUDS[0];
    }
    return s;
  }
  function psSeed(h) { if (!PSTATE[h]) PSTATE[h] = seedStateOf(h); return PSTATE[h]; }
  function psSave() { store("vlm-pstate", PSTATE); }
  function merchSummary(s) {
    var bits = [];
    if (CATS.length) bits.push(s.cat || "?");
    if (AUDS.length) bits.push((AUD_LABELS[s.gender] || s.gender || "?"));
    if (s.trend) bits.push("Trending"); if (s.best) bits.push("Best Seller"); if (s.isnew) bits.push("New");
    if (s.hidden) bits.push("Hidden");
    return bits.join(" / ");
  }

  /* mirror PSTATE onto a card: dataset (CSS + merch panel read it), hidden
     visuals (edit mode only) and the edit-mode badge preview chips */
  function syncBadges(card, s) {
    var media = el(CARD_MEDIA_SEL, card) || card;
    media.classList.add("vlm-cardbadge-host");   // position:relative host for the preview chips
    var box = el(".vlm-cardbadges", media);
    if (!s.best && !s.isnew) { if (box) box.remove(); return; }
    if (!box) { box = doc.createElement("span"); box.className = "vlm-cardbadges"; media.appendChild(box); }
    box.textContent = "";
    if (s.best) { var b1 = doc.createElement("i"); b1.className = "vlm-cardbadge"; b1.textContent = "Best Seller"; box.appendChild(b1); }
    if (s.isnew) { var b2 = doc.createElement("i"); b2.className = "vlm-cardbadge vlm-cardbadge--new"; b2.textContent = "New"; box.appendChild(b2); }
  }
  function syncCard(card) {
    var h = card.getAttribute("data-handle"); if (!h) return;
    var s = psSeed(h);
    card.dataset.vlmInit = "1";
    card.dataset.vlmCat = s.cat; card.dataset.vlmGender = s.gender;
    card.dataset.vlmBest = s.best ? "1" : ""; card.dataset.vlmNew = s.isnew ? "1" : "";
    card.dataset.vlmTrending = s.trend ? "1" : ""; card.dataset.vlmHidden = s.hidden ? "1" : "";
    if (inEditMode) setHidden(card, !!s.hidden);
    syncBadges(card, s);
  }
  function syncAllCards() { if (PRODUCTS) els(CARD_SEL + "[data-handle]").forEach(syncCard); }
  function syncCardsFor(h) { els(CARD_SEL + '[data-handle="' + cssq(h) + '"]').forEach(syncCard); }
  function setPS(h, field, val) { var s = psSeed(h); s[field] = val; psSave(); }
  function logMerch(h) {
    var title = (prodBy(h) || {}).title || h;
    logEdit({ t: "merch", k: h, label: title, meta: { h: h },
      orig: merchSummary(seedStateOf(h)), cur: merchSummary(psSeed(h)) });
  }

  /* ---- global product order (drawer + on-canvas drags share it) ---- */
  function effOrd(h) { var s = PSTATE[h]; return (s && s.order != null) ? s.order : 1000 + baseIdx(h); }
  function orderedHandles() {
    return manageable().map(function (p) { return p.handle; })
      .sort(function (a, b) { return effOrd(a) - effOrd(b); });
  }
  function flipBatch(container, sel, mutate) {
    var kids = els(sel, container);
    var first = new Map(kids.map(function (k) { return [k, k.getBoundingClientRect()]; }));
    mutate();
    els(sel, container).forEach(function (k) {
      var f = first.get(k); if (!f) return;
      var l = k.getBoundingClientRect(), dx = f.left - l.left, dy = f.top - l.top;
      if (dx || dy) {
        k.style.transition = "none"; k.style.transform = "translate(" + dx + "px," + dy + "px)";
        setTimeout(function () { k.style.transition = "transform .42s cubic-bezier(.2,.8,.2,1)"; k.style.transform = ""; }, 16);   // timer, not rAF (webview throttling)
      }
    });
  }
  function applyOrderToDOM() {
    if (!PRODUCTS) return;
    var seq = orderedHandles();
    // catalog-ordered containers only (never a curated rail: that order is hand-picked)
    ((PRODUCTS && PRODUCTS.orderedContainers) || []).forEach(function (sel) {
      var c = el(sel); if (!c) return;
      var cards = els(CARD_SEL + "[data-handle]", c); if (cards.length < 2) return;
      var byH = {}; cards.forEach(function (k) { byH[k.getAttribute("data-handle")] = k; });
      var want = [];
      seq.forEach(function (h) { if (byH[h]) want.push(byH[h]); });
      cards.forEach(function (k) { if (want.indexOf(k) < 0) want.push(k); });
      var same = true;
      for (var i = 0; i < cards.length; i++) { if (cards[i] !== want[i]) { same = false; break; } }
      if (same) return;
      flipBatch(c, CARD_SEL, function () { want.forEach(function (k) { c.appendChild(k); }); });
    });
    positionHidetags();
    if (repos) try { repos(); } catch (e) {}
  }
  function logOrder() {
    var base = manageable().map(function (p) { return p.handle; }).join(",");
    var cur = orderedHandles().join(",");
    logEdit({ t: "order", k: "catalog", label: "Product order",
      orig: "", cur: cur === base ? "" : cur, d0: "Original order", d1: "Custom order" });
    queueSave(orderKeys());   // persist product.<h>.order (1-based) for every managed product
  }
  /* is this container one whose order the owner must NOT re-rank from (a
     curated rail, e.g. Complete the Look)? */
  function isCuratedContainer(c) {
    if (!c) return true;
    var sels = ((PRODUCTS && PRODUCTS.curatedContainers) || []).slice();
    if (PDP && PDP.completeLookRail) sels.push(PDP.completeLookRail);
    for (var i = 0; i < sels.length; i++) {
      try { if (c.matches(sels[i]) || c.closest(sels[i])) return true; } catch (e) {}
    }
    return false;
  }
  /* a card was dragged on the canvas: merge that container's new DOM order
     back into the global ranking (stable outside the container) */
  function absorbDomOrder(container) {
    if (!container || isCuratedContainer(container)) return;
    var domH = els(CARD_SEL + "[data-handle]", container).map(function (k) { return k.getAttribute("data-handle"); }).filter(Boolean);
    if (domH.length < 2) return;
    var glob = orderedHandles(), pos = [], di = 0;
    glob.forEach(function (h, i) { if (domH.indexOf(h) >= 0) pos.push(i); });
    var next = glob.slice();
    pos.forEach(function (i) { next[i] = domH[di++]; });
    next.forEach(function (h, i) { psSeed(h).order = i + 1; });
    psSave(); logOrder();
    if (prodsD && prodsD.classList.contains("on")) renderProds();
  }

  /* ---- the session edits log (Undo / History) ---- */
  function logEdit(o) {
    var id = o.t + "::" + o.k;
    var e = EDITS[id];
    if (!e) {
      EDITS[id] = { t: o.t, k: o.k, label: o.label || o.k, page: o.page || PAGE, orig: o.orig,
        cur: o.cur, d0: o.d0 || null, d1: o.d1 || null, ts: Date.now(), meta: o.meta || null };
    } else {
      e.cur = o.cur; e.ts = Date.now();
      if (o.d1) e.d1 = o.d1;
      if (o.meta) e.meta = o.meta;
    }
    if (String(EDITS[id].cur) === String(EDITS[id].orig)) delete EDITS[id];   // back to the original: nothing to revert
    store("vlm-edits", EDITS);
    updateEditsBadge();
    if (editsD && editsD.classList.contains("on")) renderEdits();
  }
  function findByKey(k) { return el('[data-content="' + cssq(k) + '"]'); }
  function revertEdit(id) {
    var e = EDITS[id]; if (!e) return;
    // Revert semantics: queueRevert() either saves '' (default; the applier
    // fail-opens an empty value back to the built-in default) or truly deletes
    // the row when cfg.revert === 'delete'.
    if (e.t === "text") { var n = findByKey(e.k); if (n) { n.textContent = e.orig; flashSaved(n); } queueRevert([e.k]); }
    else if (e.t === "img") { var m = el('[data-content-img="' + cssq(e.k) + '"]'); if (m) applyImageEverywhere(m, e.orig); queueRevert([e.k]); }
    else if (e.t === "bg") { var mb = el('[data-content-bg="' + cssq(e.k) + '"]'); if (mb) { mb.style.removeProperty("--vlm-bg"); flashSaved(mb); } queueRevert([e.k]); }
    else if (e.t === "focal") { var m2 = el('[data-content-img="' + cssq(e.k) + '"]'); if (m2) m2.style.objectPosition = e.orig || ""; queueRevert([e.k + ".pos"]); }
    else if (e.t === "link") {
      var a = el('[data-content-link="' + cssq(e.k) + '"]');
      if (a) {
        // restore the element's first-ever raw href (frozen at first edit), not a
        // slug resolution: exact, and safe when the original was not a known target
        var raw = ORIG[PAGE + "::linkhref::" + e.k];
        if (raw != null) a.setAttribute("href", raw);
        else { var hh = hrefForSlug(e.orig); if (hh) a.setAttribute("href", hh); }
      }
      queueRevert([e.k]);
    }
    else if (e.t === "merch") {
      var h = (e.meta && e.meta.h) || e.k;
      var keep = (PSTATE[h] || {}).order != null ? PSTATE[h].order : null;
      PSTATE[h] = seedStateOf(h); PSTATE[h].order = keep; psSave();
      syncCardsFor(h);
      if (merch.classList.contains("on") && merch.__card && merch.__card.getAttribute("data-handle") === h) syncMerchUI(merch.__card);
      if (prodsD.classList.contains("on")) renderProds();
      var mk = ["bestSeller", "isNew", "trending", "hidden"]; if (AUDS.length) mk.push("gender"); if (CATS.length) mk.push("category");
      queueRevert(mk.map(function (nm) { return "product." + h + "." + nm; }));
    }
    else if (e.t === "order") {
      manageable().forEach(function (p) { if (PSTATE[p.handle]) PSTATE[p.handle].order = null; });
      psSave(); applyOrderToDOM();
      if (prodsD.classList.contains("on")) renderProds();
      queueRevert(manageable().map(function (p) { return "product." + p.handle + ".order"; }));
    }
    else if (e.t === "ctl") {
      var ch = e.meta && e.meta.h;
      if (ch) { delete CTLMAP[ch]; store("vlm-ctl", CTLMAP); applyCtl(); if (ctlPanel.classList.contains("on")) renderCtl(); queueRevert(["product." + ch + ".completeLook"]); }
    }
    else if (e.t === "gal") {
      var t = galThumbs();
      if (t && e.meta && galHandle() === e.meta.h && galSlug(colourName()) === e.meta.c) {
        var srcs = String(ORIG[PAGE + "::gal::" + e.k] || "").split("\n").filter(Boolean);
        if (srcs.length) rebuildThumbs(t, srcs);
      }
    }
    delete EDITS[id]; store("vlm-edits", EDITS);
    updateEditsBadge(); touchSave();
  }
  function rebuildThumbs(t, srcs) {
    realThumbs(t).forEach(function (b) { b.remove(); });
    var add = el(".vlm-add", t);
    srcs.forEach(function (s, i) {
      var b = doc.createElement("button"); b.type = "button";
      var im = doc.createElement("img"); im.alt = "Photo " + (i + 1); im.src = s;
      b.appendChild(im); t.insertBefore(b, add || null); decorateThumb(b);
    });
    commitGallery(t, false);
  }
  /* saved state re-applies on every page load (simulates the published site,
     the way the applier re-applies owner overrides). All writes are guarded,
     so the PDP MutationObserver settles instead of looping. */
  function reapplyEdits() {
    Object.keys(EDITS).forEach(function (id) {
      var e = EDITS[id];
      if (e.page !== PAGE && ["text", "img", "focal", "link", "bg"].indexOf(e.t) >= 0) return;
      if (e.t === "text") { var n = findByKey(e.k); if (n && !n.classList.contains("vlm-editing") && n.textContent !== e.cur) n.textContent = e.cur; }
      else if (e.t === "img" && !(e.meta && e.meta.big)) { var m = el('[data-content-img="' + cssq(e.k) + '"]'); if (m && m.getAttribute("src") !== e.cur) applyImageEverywhere(m, e.cur); }
      else if (e.t === "bg") { var mb = el('[data-content-bg="' + cssq(e.k) + '"]'); if (mb && e.cur) applyBg(mb, e.cur); }
      else if (e.t === "focal") { var m2 = el('[data-content-img="' + cssq(e.k) + '"]'); if (m2 && m2.style.objectPosition !== e.cur) m2.style.objectPosition = e.cur; }
      else if (e.t === "link") {
        // e.cur is a SLUG: resolve through the whitelist before touching href
        var a = el('[data-content-link="' + cssq(e.k) + '"]'), hh = hrefForSlug(e.cur);
        if (a && hh && a.getAttribute("href") !== hh) a.setAttribute("href", hh);
      }
    });
  }

  /* ===================================================================
     POSITIONING
     =================================================================== */
  function placeBox(box, r, pad) {
    box.style.left = (r.left - pad) + "px"; box.style.top = (r.top - pad) + "px";
    box.style.width = (r.width + pad * 2) + "px"; box.style.height = (r.height + pad * 2) + "px";
  }
  function showSelRing(node) { placeBox(selRing, node.getBoundingClientRect(), 3); selRing.classList.add("on"); }
  function hideSelRing() { selRing.classList.remove("on"); }
  function positionChip(node) {
    var r = node.getBoundingClientRect();
    chip.style.left = clamp(r.left, 8, vw() - chip.offsetWidth - 8) + "px";
    chip.style.top = Math.max(6, r.top - chip.offsetHeight - 6) + "px";
  }
  function positionHint(node) {
    var r = node.getBoundingClientRect();
    hint.style.left = clamp(r.left, 8, vw() - hint.offsetWidth - 8) + "px";
    hint.style.top = clamp(r.bottom + 8, 8, vh() - hint.offsetHeight - 8) + "px";
  }
  function flashSaved(node) {
    var r = node.getBoundingClientRect();
    savedTick.style.left = clamp(r.right - savedTick.offsetWidth, 8, vw() - savedTick.offsetWidth - 8) + "px";
    savedTick.style.top = Math.max(6, r.top - savedTick.offsetHeight - 6) + "px";
    savedTick.classList.add("on");
    clearTimeout(savedTick.__t);
    savedTick.__t = setTimeout(function () { savedTick.classList.remove("on"); }, 1400);
  }
  function placeImgOverlay(r) {
    imgtools.style.left = r.left + "px"; imgtools.style.top = r.top + "px";
    imgtools.style.width = r.width + "px"; imgtools.style.height = r.height + "px";
  }
  function placeFlyoutBelow(fly, r) {
    fly.classList.add("on");
    var fw = fly.offsetWidth, fh = fly.offsetHeight;
    var left = clamp(r.left, 8, vw() - fw - 8);
    var top = r.bottom + 10;
    if (top + fh > vh() - 8) top = r.top - fh - 10;
    top = clamp(top, 8, vh() - fh - 8);
    fly.style.left = left + "px"; fly.style.top = top + "px";
  }
  function placeMerchPanel(r) {
    merch.classList.add("on");
    var fw = merch.offsetWidth, fh = merch.offsetHeight, left;
    if (r.right + 12 + fw <= vw() - 8) left = r.right + 12;
    else if (r.left - 12 - fw >= 8) left = r.left - 12 - fw;
    else left = clamp(r.left, 8, vw() - fw - 8);
    var top = clamp(r.top, 8, vh() - fh - 8);
    merch.style.left = left + "px"; merch.style.top = top + "px";
  }
  function positionHidetags() {
    hidetagMap.forEach(function (t, card) {
      if (!card.isConnected) { t.remove(); hidetagMap.delete(card); return; }
      var r = card.getBoundingClientRect();
      t.style.left = clamp(r.left + 10, 8, vw() - t.offsetWidth - 8) + "px";
      t.style.top = clamp(r.top + 10, 8, vh() - t.offsetHeight - 8) + "px";
    });
  }

  /* reposition everything active on scroll / resize.
     setTimeout, NOT rAF: embedded webviews / preview panes throttle rAF
     (same reason the PDP observer debounces with a timer). */
  var reposTick = false;
  function onReflow() {
    hideHover();   // the hover outline is not repositioned per-frame; hide it the instant we
                   // scroll/resize so it never lingers detached over the wrong spot (it re-shows
                   // on the next mouse move). The SELECTION ring below still tracks via repos().
    if (reposTick) return; reposTick = true;
    setTimeout(function () {
      reposTick = false;
      // a selection whose element collapsed (e.g. a mega-menu poster after
      // the menu closed) leaves stranded chrome - drop the stale selection
      if (current) {
        var cr = current.getBoundingClientRect();
        var gone = (cr.width < 2 && cr.height < 2);
        try { gone = gone || getComputedStyle(current).visibility === "hidden"; } catch (e) {}
        if (gone) { clearSel(); positionHidetags(); return; }
      }
      if (repos) try { repos(); } catch (e) {}
      if (revertPill.classList.contains("on") && current) positionRevert(current);
      // the link dropdown tracks its anchor too (it has no repos of its own)
      if (linkpop.classList.contains("on") && linkpop.__anchor) {
        try { placeFlyoutBelow(linkpop, linkpop.__anchor()); } catch (e) {}
      }
      if (inEditMode) freeCoveredImages();   // free covered images as they scroll into view
      positionHidetags();
    }, 16);
  }
  addEventListener("scroll", onReflow, { capture: true, passive: true });
  addEventListener("resize", onReflow, { passive: true });

  /* ===================================================================
     TAGGING EDITABLES
     =================================================================== */
  function classifyText(node) {
    var tag = node.tagName, cls = node.className || "", txt = (node.textContent || "").trim();
    var heading = /^H[1-6]$/.test(tag);
    var label = heading ? "Edit heading" : "Edit text";
    if (!heading && (/eyebrow|__eyebrow|label|__cap|caption|__style|__meta|__tag/i.test(cls) || (tag === "SPAN" && txt.length < 34))) label = "Edit label";
    var multiline = (tag === "P" || tag === "DIV");
    if (heading) multiline = false;
    return { label: label, multiline: multiline };
  }
  function mark(node, kind, label, multiline) {
    if (!node || node.getAttribute("data-vlm-ed")) return;
    node.setAttribute("data-vlm-ed", kind);
    node.setAttribute("data-vlm-label", label);
    if (multiline) node.setAttribute("data-vlm-multiline", "1");
  }
  /* In edit mode every picture must be visible so the owner can click it to edit,
     without scrolling each one into view. Native loading="lazy" defers below-the-fold
     images (and never fires at all in embedded webviews that throttle intersection),
     which would leave whole sections looking pictureless. So the moment we are editing,
     wake every lazy image to eager. Idempotent + cheap: only still-lazy images are touched. */
  function wakeLazyImages() {
    els('img[loading="lazy"]').forEach(function (im) {
      im.loading = "eager";
      if (!im.complete || !im.naturalWidth) { var s = im.getAttribute("src"); if (s) im.src = s; }
    });
  }
  function tagEditables() {
    els("[data-content]:not([data-vlm-ed])").forEach(function (n) {
      var c = classifyText(n); mark(n, "text", c.label, c.multiline);
    });
    els("[data-content-img]:not([data-vlm-ed])").forEach(function (n) { mark(n, "img", "Photo", false); });
    els("[data-content-bg]:not([data-vlm-ed])").forEach(function (n) { mark(n, "bg", "Background photo", false); });
    els("[data-content-link]:not([data-vlm-ed])").forEach(function (n) { mark(n, "link", "Link", false); });
    if (PRODUCTS) els(CARD_SEL + ":not([data-vlm-ed])").forEach(function (n) { mark(n, "card", "Product", false); });
    tagPDP();
    injectCtlAffordance();
    tagGallery();
    freeCoveredImages();
    // re-apply any staged hidden state on freshly-tagged cards
    if (inEditMode) { if (PRODUCTS) els(CARD_SEL + "[data-vlm-hidden='1']").forEach(function (c) { setHidden(c, true); }); wakeLazyImages(); }
  }

  /* A PDP rendered by site JS often has no data-content anchors in its template,
     so we tag its copy at runtime from cfg.products.pdp.textRules, assigning
     product.<handle>.* keys (or a fixed sharedKey for copy shared across every
     product page). Rule shape: { selector, key } | { selector, key, perIndex: true }
     | { selector, sharedKey }. */
  function pdpHandle() {
    try { return new URLSearchParams(location.search).get((PDP && PDP.handleParam) || "handle") || ""; } catch (e) { return ""; }
  }
  function tagPDP() {
    if (!PDP || !PDP.root || !el(PDP.root)) return;
    var K = "product." + (pdpHandle() || "item") + ".";
    (PDP.textRules || []).forEach(function (rule) {
      if (!rule || !rule.selector) return;
      els(rule.selector).forEach(function (node, i) {
        if (!node || node.getAttribute("data-vlm-ed")) return;
        var key = rule.sharedKey || (K + rule.key + (rule.perIndex ? "." + i : ""));
        if (!node.getAttribute("data-content")) node.setAttribute("data-content", key);
        if (rule.sharedKey) node.setAttribute("data-vlm-shared", "1");   // "Applies to every product page"
        var c = classifyText(node); mark(node, "text", c.label, c.multiline);
      });
    });
  }

  /* Full-bleed hero images are covered by a logo/title overlay that eats the click,
     so the picture reads as "not editable". Let clicks fall THROUGH the overlay to the
     image, while keeping the overlay's own editable text (the title) clickable. */
  // Landmarks we must NEVER neutralise: doing so would kill pointer-events on the whole
  // page in edit mode (rail arrows, add-to-bag, nav), which is exactly the bug this guards.
  var CLICKTHRU_STOP = { MAIN: 1, BODY: 1, HEADER: 1, FOOTER: 1, NAV: 1, HTML: 1 };
  function freeCoveredImages() {
    els("[data-content-img][data-vlm-ed]").forEach(function (img) {
      if (img.closest(".vlm-clickthru-sec")) return;   // already freed (idempotent across scroll passes)
      var r = img.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) return;
      // elementFromPoint only works for on-screen coordinates, so only evaluate images that are
      // actually in the viewport now. freeCoveredImages is re-run on scroll (onReflow), so a
      // below-the-fold image gets freed the moment it scrolls into view (not just on entry).
      if (r.bottom < 0 || r.top > vh()) return;
      var cx = clamp(r.left + r.width / 2, 1, vw() - 1), cy = clamp(r.top + r.height / 2, 1, vh() - 1);
      var top = doc.elementFromPoint(cx, cy);
      if (!top || top === img || img.contains(top)) return;
      if (top.closest && top.closest("[data-content-img]") === img) return;
      // The image is covered by a nearby overlay (e.g. a full-bleed hero with a centered
      // logo/title). Neutralise the SMALLEST LOCAL container that holds both the image and
      // the covering element, so clicks fall through to the picture while the overlay's own
      // editable text stays editable. Climb at most a few levels and NEVER onto a landmark
      // (main/section/header/...): an over-climb to <main> would neutralise the entire page.
      // If the covering element is not in a small shared container, we simply skip (leaving
      // the image non-clickthrough is far better than breaking every button on the page).
      var host = img.parentNode, hops = 0;
      while (host && host.nodeType === 1 && hops < 4 && !CLICKTHRU_STOP[host.tagName] && !host.contains(top)) { host = host.parentNode; hops++; }
      if (host && host.nodeType === 1 && !CLICKTHRU_STOP[host.tagName] && host.contains(top) && host.contains(img)) {
        host.classList.add("vlm-clickthru-sec");
      }
    });
  }

  /* ===================================================================
     SELECTION
     =================================================================== */
  function clearSel() {
    linkpop.classList.remove("on");
    if (current) {
      var kind = current.getAttribute("data-vlm-ed");
      if (kind === "text" && current.classList.contains("vlm-editing")) commitText(current);  // deterministic commit (not reliant on the blur event)
      current = null;
    }
    hideSelRing();
    revertPill.classList.remove("on");
    imgtools.classList.remove("on", "focusing", "uploading");
    linkbar.classList.remove("on");
    merch.classList.remove("on");
    hint.classList.remove("on");
    if (pinned) { pinned.classList.remove("vlm-pin-open"); pinned = null; }
    repos = null;
  }
  function select(node) {
    if (current === node) return;
    clearSel();
    current = node;
    hideHover();
    // editing a hover-menu poster: hold that menu open (the hover is lost the
    // moment the pointer moves onto the editor overlay, which would hide the
    // poster under an open editor). Selectors come from cfg.menuPin.
    if (MENUPIN && MENUPIN.menu && node.closest) {
      var mega = null; try { mega = node.closest(MENUPIN.menu); } catch (e) {}
      if (mega) { var ni = null; try { ni = mega.closest(MENUPIN.item || "*"); } catch (e) {} if (ni) { ni.classList.add("vlm-pin-open"); pinned = ni; } }
    }
    var kind = node.getAttribute("data-vlm-ed");
    if (kind === "text") startText(node);
    else if (kind === "img" || kind === "bg") openImageTools(node);
    else if (kind === "link") openLinkBar(node);
    else if (kind === "card") openMerch(node);
    refreshRevert();   // show "Revert to original" if this field already carries an edit
  }

  /* ===================================================================
     TEXT EDITING  (words only; textContent only; paste forced to text/plain)
     =================================================================== */
  function placeCaretEnd(node) {
    try {
      var r = doc.createRange(); r.selectNodeContents(node); r.collapse(false);
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
    } catch (e) {}
  }
  function insertPlainText(text) {
    if (doc.queryCommandSupported && doc.queryCommandSupported("insertText")) {
      doc.execCommand("insertText", false, text);
    } else {
      var s = getSelection(); if (!s.rangeCount) return;
      s.deleteFromDocument(); s.getRangeAt(0).insertNode(doc.createTextNode(text)); s.collapseToEnd();
    }
  }
  function onPaste(e) {
    e.preventDefault();
    var t = ((e.clipboardData || window.clipboardData).getData("text/plain")) || "";
    if (e.currentTarget.getAttribute("data-vlm-multiline") !== "1") t = t.replace(/\s*\r?\n\s*/g, " ");
    insertPlainText(t);
  }
  function onTextInput(e) { if (scrubEditable(e.currentTarget)) placeCaretEnd(e.currentTarget); positionHint(e.currentTarget); }
  /* XSS defense-in-depth: while a field is being edited, strip any ELEMENT the
     instant it lands in the live editable (execCommand insertHTML/insertImage,
     an <img onerror> that would fire on insertion, drag-drop of rich content,
     other exotic paths), keeping only its text. A <br> the browser inserts for a
     newline is benign and preserved (attributes stripped). textContent-only
     commit stays the final guard. */
  function scrubEditable(node) {
    var changed = false;
    els("*", node).forEach(function (child) {
      if (child.tagName === "BR") { while (child.attributes && child.attributes.length) child.removeAttribute(child.attributes[0].name); return; }
      if (!child.parentNode) return;   // already detached by an ancestor's replacement
      child.parentNode.replaceChild(doc.createTextNode(child.textContent || ""), child); changed = true;
    });
    return changed;
  }
  function startText(node) {
    node.__vlmOrig = node.textContent;
    node.__vlmReverting = false;
    node.__vlmKey = node.getAttribute("data-content") || "";
    if (node.__vlmKey) origFor(node.__vlmKey, node.textContent);   // freeze the first-ever original before any keystroke
    node.classList.add("vlm-editing");
    if (window.MutationObserver) {   // live element-stripper (defense-in-depth)
      node.__vlmMo = new MutationObserver(function () { if (scrubEditable(node)) placeCaretEnd(node); });
      node.__vlmMo.observe(node, { childList: true, subtree: true });
    }
    node.setAttribute("contenteditable", PLAIN ? "plaintext-only" : "true");
    node.setAttribute("spellcheck", "false");
    var keys = function (e) {
      var multiline = node.getAttribute("data-vlm-multiline") === "1";
      if (e.key === "Enter" && !multiline) { e.preventDefault(); commitText(node); }
      else if (e.key === "Escape") { e.preventDefault(); node.__vlmReverting = true; node.textContent = node.__vlmOrig; commitText(node); }
    };
    node.__vlmKeys = keys;
    node.__vlmDrop = function (e) { e.preventDefault(); };   // no rich/HTML drops into the editable
    node.addEventListener("keydown", keys);
    node.addEventListener("paste", onPaste);
    node.addEventListener("input", onTextInput);
    node.addEventListener("drop", node.__vlmDrop);
    node.addEventListener("dragover", node.__vlmDrop);
    node.addEventListener("blur", function () { commitText(node); }, { once: true });
    node.focus(); placeCaretEnd(node);
    var hintBase = (node.getAttribute("data-vlm-multiline") === "1")
      ? "Click outside to save"
      : "<b>Enter</b> to save &middot; <b>Esc</b> to undo";
    var hintSubs = [];
    if (node.getAttribute("data-vlm-shared") === "1") hintSubs.push("Applies to every product page");   // shared PDP fields
    hintSubs.push("Leave blank to keep the original");                                                    // empty-state microcopy
    hint.innerHTML = '<span class="vlm-hint__base">' + hintBase + "</span>" + hintSubs.map(function (s) { return '<span class="vlm-hint__sub">' + s + "</span>"; }).join("");
    hint.classList.add("on"); positionHint(node);   // show first so offsetWidth is real when clamping
    repos = function () { positionHint(node); };
  }
  function commitText(node) {
    if (!node.classList.contains("vlm-editing")) return;   // idempotent: safe to call from clearSel AND blur
    if (node.__vlmMo) { node.__vlmMo.disconnect(); node.__vlmMo = null; }
    scrubEditable(node);   // final synchronous strip in case an element landed after the observer's last async flush
    if (node.__vlmReverting) {
      node.__vlmReverting = false;
      node.textContent = node.__vlmOrig;   // ensure the revert really lands as plain text
    } else {
      // TEXT only, never innerHTML. innerText applies CSS text-transform
      // (an uppercase heading would commit as "TRENDING"), so single-line
      // fields read raw textContent; multiline keeps innerText for the \n's.
      var val = node.getAttribute("data-vlm-multiline") === "1" ? node.innerText : node.textContent;
      if (!String(val).trim()) {
        // emptied out: fail-open like the applier (a blank never sticks) -
        // restore the original so the element cannot collapse to an
        // unclickable 0x0 target
        node.textContent = node.__vlmOrig || "";
      } else {
        node.textContent = val;          // normalize: flattens any stray nodes back to plain text
        if (node.__vlmKey) {
          logEdit({ t: "text", k: node.__vlmKey, label: (node.getAttribute("data-vlm-label") || "Text").replace(/^Edit\s+/, ""), page: PAGE, orig: origFor(node.__vlmKey, node.__vlmOrig), cur: val });
          queueSave(defObj(node.__vlmKey, val));
        }
        touchSave(); flashSaved(node);
      }
    }
    node.removeAttribute("contenteditable");
    node.classList.remove("vlm-editing");
    node.removeEventListener("keydown", node.__vlmKeys);
    node.removeEventListener("paste", onPaste);
    node.removeEventListener("input", onTextInput);
    node.removeEventListener("drop", node.__vlmDrop);
    node.removeEventListener("dragover", node.__vlmDrop);
    hint.classList.remove("on");
    if (current === node) current = null;   // a committed node is no longer "active" (re-click must re-open it)
  }

  /* ===================================================================
     IMAGE EDITING  (Replace via local FileReader + full apply rule; focal)
     =================================================================== */
  function applyImageEverywhere(img, url) {
    img.src = url; img.removeAttribute("srcset");
    var pic = img.closest("picture");
    if (pic) els("source", pic).forEach(function (s) { s.srcset = url; });
  }
  // CSS-background picture: swap ONLY the --vlm-bg layer; the site's darkening
  // gradient + framing stay in its stylesheet. Empty url clears back to the CSS default.
  function applyBg(node, url) {
    if (url) node.style.setProperty("--vlm-bg", 'url("' + String(url).replace(/["\\]/g, encodeURIComponent) + '")');
    else node.style.removeProperty("--vlm-bg");
  }
  function openImageTools(node) {
    var linkA = node.closest("[data-content-link]");
    var linkKey = linkA ? linkA.getAttribute("data-content-link") : "";
    imgtools.__el = node; imgtools.__linkA = linkA;
    var isBg = node.hasAttribute("data-content-bg");
    el("[data-vlm-imglink]", imgtools).style.display = (linkA && !isBg) ? "" : "none";
    el("[data-vlm-adjust]", imgtools).style.display = isBg ? "none" : "";   // background framing lives in CSS, no focal puck
    imgtools.classList.remove("focusing", "uploading");
    if (node.__vlmFocalOrig == null) node.__vlmFocalOrig = node.style.objectPosition || "50% 50%";   // freeze pre-edit focus for revert
    var r = node.getBoundingClientRect();
    placeImgOverlay(r); imgtools.classList.add("on");
    showSelRing(node);
    // seed focal to current objectPosition
    var op = node.style.objectPosition || "50% 50%";
    var m = /(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/.exec(op);
    focal.style.left = (m ? m[1] : 50) + "%"; focal.style.top = (m ? m[2] : 50) + "%";
    repos = function () { var rr = node.getBoundingClientRect(); placeImgOverlay(rr); placeBox(selRing, rr, 3); };
  }
  // Replace a general SITE image [data-content-img] or background [data-content-bg]:
  // resize client-side, upload via the edge function (dest:'site'), then save {key: url}.
  function doSiteImageReplace(img, file) {
    var isBg = img.hasAttribute("data-content-bg");
    var key = isBg ? img.getAttribute("data-content-bg") : img.getAttribute("data-content-img"); if (!key) return;
    var apply = isBg ? function (u) { applyBg(img, u); } : function (u) { applyImageEverywhere(img, u); };
    var editType = isBg ? "bg" : "img";
    var orig = isBg ? (img.style.getPropertyValue("--vlm-bg") || "") : (img.getAttribute("src") || "");
    var origFirst = origFor(editType + "::" + key, orig);   // freeze the first-ever original for revert
    imgtools.classList.remove("focusing"); imgtools.classList.add("uploading");
    var bar = el(".vlm-prog i", imgtools); if (bar) bar.style.width = "10%";
    resizeImage(file, IMG_MAXDIM, function (dataUrl) {
      if (!dataUrl) { imgtools.classList.remove("uploading"); if (bar) bar.style.width = "0"; showUploadError(img, "could not read image"); return; }
      apply(dataUrl);          // instant local preview
      if (bar) bar.style.width = "55%";
      trackedUpload(key, file.name, dataUrl, "site").then(function (url) {
        apply(url);            // swap the data-URL preview for the real public URL
        if (bar) bar.style.width = "100%";
        queueSave(defObj(key, url));
        logEdit({ t: editType, k: key, label: isBg ? "Background photo" : "Photo", page: PAGE, orig: origFirst, cur: url });
        setTimeout(function () {
          imgtools.classList.remove("uploading"); if (bar) bar.style.width = "0";
          img.classList.add("vlm-imgfade"); setTimeout(function () { img.classList.remove("vlm-imgfade"); }, 600);
          if (repos) repos();
          flashSaved(img);
        }, 220);
      }).catch(function (e) {
        imgtools.classList.remove("uploading"); if (bar) bar.style.width = "0";
        apply(orig);           // roll the preview back on failure
        showUploadError(img, (e && e.message) || "upload failed");
      });
    });
  }
  // focal puck drag
  (function () {
    var dragging = false;
    focal.addEventListener("pointerdown", function (e) { dragging = true; focal.setPointerCapture(e.pointerId); e.preventDefault(); });
    focal.addEventListener("pointermove", function (e) {
      if (!dragging || !imgtools.__el) return;
      var box = imgtools.getBoundingClientRect();
      var x = clamp((e.clientX - box.left) / box.width * 100, 2, 98);
      var y = clamp((e.clientY - box.top) / box.height * 100, 2, 98);
      focal.style.left = x + "%"; focal.style.top = y + "%";
      imgtools.__el.style.objectPosition = x.toFixed(1) + "% " + y.toFixed(1) + "%";
    });
    focal.addEventListener("pointerup", function () {
      if (!dragging) return;
      dragging = false;
      var img = imgtools.__el;
      if (img) {
        var key = img.getAttribute("data-content-img");
        var pos = img.style.objectPosition || "50% 50%";
        if (key) {
          queueSave(defObj(key + ".pos", pos));
          logEdit({ t: "focal", k: key, label: "Focus", page: PAGE, orig: img.__vlmFocalOrig || "50% 50%", cur: pos });
        }
      }
      touchSave();
    });
  })();

  /* ===================================================================
     GALLERY EDITING  (PDP sub-pictures: drag to reorder, set main photo,
     replace, add). Products layer only: everything below no-ops without
     cfg.products.pdp. Operates on the site's live thumbstrip DOM.
     =================================================================== */
  var GAL_MAX = (PDP && PDP.maxPhotos) || 12;   // photos-per-colour cap
  var galFile = doc.createElement("input");
  galFile.type = "file"; galFile.accept = "image/*"; galFile.multiple = true; galFile.style.display = "none";
  root.appendChild(galFile);
  var galTarget = null;   // { mode:'replace'|'add', btn | thumbs }

  function galThumbs() { return (PDP && PDP.thumbs) ? el(PDP.thumbs) : null; }
  function realThumbs(t) { return els("button:not(.vlm-add)", t); }
  function galAxis(t) {
    var b = realThumbs(t); if (b.length < 2) return "y";
    var a = b[0].getBoundingClientRect(), c = b[1].getBoundingClientRect();
    return Math.abs(c.left - a.left) > Math.abs(c.top - a.top) ? "x" : "y";
  }
  function galSlug(s) { return String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
  function galHandle() { return pdpHandle(); }
  function colourName() { var n = PDP && PDP.colourName ? el(PDP.colourName) : null; return (n && n.textContent.trim()) || ""; }
  // Does THIS colour have the owner's own photo set, or is the gallery just the catalogue default?
  function colourHasOwnPhotos() {
    var snap = window.VELLUM_SNAPSHOT || {};
    var h = galHandle(); if (!h) return true;
    var k = "product." + h + ".images." + galSlug(colourName());
    var flat = "product." + h + ".images";
    return !!(String(snap[k] || "").trim() || String(snap[flat] || "").trim());
  }
  function galleryIsOwn(t) {
    if (colourHasOwnPhotos()) return true;
    // a photo she just added / replaced (data URL) or a real Storage upload counts as hers
    return realThumbs(t).some(function (b) { var im = el("img", b); var s = im ? im.src : ""; return /^data:/.test(s) || s.indexOf("/storage/v1/object/public/") >= 0; });
  }
  function updateGalCap(t) {
    var cap = el(".vlm-galcap", t.parentNode); if (!cap) return;
    var col = colourName(), own = galleryIsOwn(t), s;
    if (!own) {
      s = "Default catalogue photo" + (col ? " for " + col : "") + ".  Add " + (col || "this colour") + "’s real photo ↓";
    } else {
      var n = realThumbs(t).length;
      s = (col ? "Photos for " + col : "Photos") + "  ·  " + n + (n === 1 ? " image" : " images") + "  ·  drag to reorder, ★ = main";
    }
    if (cap.textContent !== s) cap.textContent = s;   // guarded so the observer settles
  }
  function keepAddLast(t) { var add = el(".vlm-add", t); if (add && t.lastElementChild !== add) t.appendChild(add); }
  function decorateThumb(btn) {
    if (btn.getAttribute("data-vlm-gal") || btn.classList.contains("vlm-add")) return;
    btn.setAttribute("data-vlm-gal", "1");
    var tools = doc.createElement("span");
    tools.className = "vlm-galtools";
    tools.innerHTML =
      '<span class="vlm-galmain" role="button" tabindex="-1" title="Make this the main photo" aria-label="Make main">★</span>' +
      '<span class="vlm-galrep" role="button" tabindex="-1" title="Replace this photo" aria-label="Replace photo">' +
        svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5L5 20"/>') + '</span>';
    btn.appendChild(tools);
    var rm = doc.createElement("span");
    rm.className = "vlm-galrm"; rm.setAttribute("role", "button"); rm.tabIndex = -1;
    rm.title = "Remove this photo"; rm.setAttribute("aria-label", "Remove photo");
    rm.innerHTML = svg('<path d="M6 6l12 12M18 6L6 18"/>', 2.2);
    btn.appendChild(rm);
  }
  function ensureGalChrome(t) {
    var g = t.parentNode;
    if (!el(".vlm-galcap", g)) {
      // NOTE: .vlm-galcap ships with grid-column: 1 / -1. Editor chrome injected
      // into a site's own grid becomes a grid CHILD; without the full-row span a
      // caption lands in the first track and shoves the layout sideways.
      var cap = doc.createElement("div"); cap.className = "vlm-galcap";
      g.insertBefore(cap, t);
    }
    if (!el(".vlm-add", t)) {
      var add = doc.createElement("button");
      add.className = "vlm-add"; add.type = "button"; add.setAttribute("aria-label", "Add a photo");
      add.innerHTML = '<span class="vlm-add__plus">+</span><span class="vlm-add__t">Add photo</span>';
      t.appendChild(add);
    }
  }
  function markMainState(btns) {
    var lone = btns.length === 1;   // never allow removing the last photo
    btns.forEach(function (b, i) {
      b.dataset.i = i;
      var s = el(".vlm-galmain", b); if (s) s.classList.toggle("is-main", i === 0);
      var r = el(".vlm-galrm", b); if (r) r.classList.toggle("is-off", lone);
    });
  }
  // the photos-per-colour cap, mirrored on the Add tile
  function updateAddCap(t) {
    var add = el(".vlm-add", t); if (!add) return;
    var full = realThumbs(t).length >= GAL_MAX;
    add.disabled = full;
    add.title = full ? "Maximum of " + GAL_MAX + " photos per colour" : "";
  }
  function tagGallery() {
    if (!PDP || !PDP.root || !el(PDP.root)) return;
    var t = galThumbs(); if (!t) return;
    t.classList.add("vlm-gal");   // CSS hook: every gallery rule keys off this, not a site id
    // HARD-TRAP FIX (preserved): many sites hide the thumbstrip when a product
    // has a single photo, but the editor's controls (Add tile / star / replace /
    // remove) LIVE in that strip: force it visible in edit mode or photo editing
    // vanishes exactly when the owner needs it. If the site collapsed the strip's
    // grid/flex TRACK too (not just display), it also needs one per-site CSS rule;
    // see INTEGRATION.md.
    try { if (getComputedStyle(t).display === "none") t.classList.add("vlm-thumbs-forced"); } catch (e) {}
    ensureGalChrome(t);
    realThumbs(t).forEach(decorateThumb);
    keepAddLast(t);
    markMainState(realThumbs(t));
    updateAddCap(t);
    t.parentNode.classList.toggle("vlm-gal-nophoto", !galleryIsOwn(t));
    updateGalCap(t);
  }
  // per-colour photo key: product.<handle>.images.<colourSlug> (flat when no colour),
  // exactly as the applier's mergeOwnerImages() reads it.
  function galImagesKey() {
    var h = galHandle(); if (!h) return "";
    var slug = galSlug(colourName());
    return "product." + h + ".images" + (slug ? "." + slug : "");
  }
  // Persist the current thumbnail order as a newline-joined URL list. Skipped while any
  // thumb is still a data: URL (an upload is in flight); the post-upload commit re-runs
  // this with the real public URLs, so the stored list is always real Storage URLs.
  function persistGallery(t) {
    var key = galImagesKey(); if (!key) return;
    var urls = realThumbs(t).map(function (b) { var im = el("img", b); return im ? im.src : ""; }).filter(Boolean);
    if (urls.some(function (u) { return /^data:/.test(u); })) return;
    queueSave(defObj(key, urls.join("\n")));
  }
  function commitGallery(t, save) {
    var btns = realThumbs(t);
    btns.forEach(function (b, i) { b.classList.toggle("on", i === 0); });
    markMainState(btns);
    var first = btns[0] && el("img", btns[0]);
    var gi = PDP && PDP.mainImage ? el(PDP.mainImage) : null;
    if (first && gi) gi.src = first.src;
    keepAddLast(t);
    updateAddCap(t);
    t.parentNode.classList.toggle("vlm-gal-nophoto", !galleryIsOwn(t));
    updateGalCap(t);
    if (save) { touchSave(); flashSaved(t.parentNode || t); persistGallery(t); }
  }
  function makeMain(btn) { if (!btn) return; var t = btn.parentNode; t.insertBefore(btn, realThumbs(t)[0]); commitGallery(t, true); }
  function galReplace(btn) { if (!btn) return; galTarget = { mode: "replace", btn: btn }; galFile.click(); }
  function galAdd(t) { galTarget = { mode: "add", thumbs: t }; galFile.click(); }
  galFile.addEventListener("change", function () {
    var files = galFile.files ? Array.prototype.slice.call(galFile.files) : [];
    var g = galTarget; galTarget = null; galFile.value = "";
    if (!files.length || !g) return;
    var h = galHandle();
    if (g.mode === "replace" && g.btn) {
      var f = files[0], im = el("img", g.btn);
      resizeImage(f, IMG_MAXDIM, function (dataUrl) {
        if (!dataUrl) { showUploadError(g.btn, "could not read image"); return; }
        if (im) { im.src = dataUrl; im.removeAttribute("srcset"); }   // instant preview
        g.btn.setAttribute("data-vlm-pending", "1");
        g.btn.classList.add("vlm-imgfade"); setTimeout(function () { g.btn.classList.remove("vlm-imgfade"); }, 600);
        commitGallery(g.btn.parentNode, true);                        // UI only (data: URL -> save skipped)
        trackedUpload(h, f.name, dataUrl).then(function (url) {       // NO dest -> product photo bucket path
          if (im) im.src = url;
          g.btn.removeAttribute("data-vlm-pending");
          commitGallery(g.btn.parentNode, true);                      // now persists the real Storage URL
        }).catch(function (e) { g.btn.removeAttribute("data-vlm-pending"); showUploadError(g.btn, (e && e.message) || "upload failed"); });
      });
    } else if (g.mode === "add" && g.thumbs) {
      // several at once, capped at GAL_MAX
      var room = GAL_MAX - realThumbs(g.thumbs).length;
      files.slice(0, Math.max(0, room)).forEach(function (f2) {
        resizeImage(f2, IMG_MAXDIM, function (dataUrl) {
          if (!dataUrl) { showUploadError(g.thumbs, "could not read image"); return; }
          if (realThumbs(g.thumbs).length >= GAL_MAX) return;
          var b = doc.createElement("button"); b.type = "button"; b.setAttribute("data-vlm-pending", "1");
          var im2 = doc.createElement("img"); im2.alt = "New photo"; im2.src = dataUrl;
          b.appendChild(im2);
          var add = el(".vlm-add", g.thumbs); g.thumbs.insertBefore(b, add || null);
          decorateThumb(b); b.classList.add("vlm-imgfade"); setTimeout(function () { b.classList.remove("vlm-imgfade"); }, 600);
          commitGallery(g.thumbs, true);                              // UI only (data: URL -> save skipped)
          trackedUpload(h, f2.name, dataUrl).then(function (url) {    // NO dest -> product photo
            im2.src = url;
            b.removeAttribute("data-vlm-pending");
            commitGallery(g.thumbs, true);                            // now persists the real Storage URL
          }).catch(function (e) { b.removeAttribute("data-vlm-pending"); showUploadError(g.thumbs, (e && e.message) || "upload failed"); });
        });
      });
    }
  });

  // one delegated CAPTURE click handler, so we run before the site's own thumb handler
  doc.addEventListener("click", function (e) {
    if (!inEditMode) return;
    var t = galThumbs(); if (!t) return;
    var add = e.target.closest(".vlm-add");
    if (add && t.contains(add)) { e.preventDefault(); e.stopPropagation(); if (!add.disabled) galAdd(t); return; }
    var mainBtn = e.target.closest(".vlm-galmain");
    if (mainBtn) { e.preventDefault(); e.stopPropagation(); makeMain(mainBtn.closest("button[data-vlm-gal]")); return; }
    var repBtn = e.target.closest(".vlm-galrep");
    if (repBtn) { e.preventDefault(); e.stopPropagation(); galReplace(repBtn.closest("button[data-vlm-gal]")); return; }
    var rmBtn = e.target.closest(".vlm-galrm");
    if (rmBtn) {
      e.preventDefault(); e.stopPropagation();
      var rb = rmBtn.closest("button[data-vlm-gal]");
      if (rb) {
        var tt = rb.parentNode;
        if (realThumbs(tt).length > 1) { rb.remove(); commitGallery(tt, true); }
      }
      return;
    }
    var thumb = e.target.closest(".vlm-gal button[data-vlm-gal]");
    if (thumb) {   // preview this image as main + block the site's stale-index handler
      e.stopPropagation();
      var im = el("img", thumb), gi = PDP && PDP.mainImage ? el(PDP.mainImage) : null;
      if (im && gi) gi.src = im.src;
      realThumbs(t).forEach(function (b) { b.classList.remove("on"); }); thumb.classList.add("on");
    }
  }, true);

  // pointer-drag reorder (delegated, capture; touch + mouse)
  (function () {
    var drag = null;
    doc.addEventListener("pointerdown", function (e) {
      if (!inEditMode) return;
      var btn = e.target.closest(".vlm-gal button[data-vlm-gal]"); if (!btn) return;
      if (e.target.closest(".vlm-galtools") || e.target.closest(".vlm-galrm")) return;   // let the star / replace / remove controls work
      var t = btn.parentNode;
      drag = { btn: btn, t: t, axis: galAxis(t), moved: false, sx: e.clientX, sy: e.clientY };
      try { btn.setPointerCapture(e.pointerId); } catch (_) {}
    }, true);
    doc.addEventListener("pointermove", function (e) {
      if (!drag) return;
      if (!drag.moved && Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < 6) return;
      drag.moved = true; drag.btn.classList.add("vlm-galdrag"); e.preventDefault();
      var sibs = realThumbs(drag.t).filter(function (b) { return b !== drag.btn; });
      var pos = drag.axis === "x" ? e.clientX : e.clientY, before = null;
      for (var i = 0; i < sibs.length; i++) {
        var r = sibs[i].getBoundingClientRect();
        var mid = drag.axis === "x" ? r.left + r.width / 2 : r.top + r.height / 2;
        if (pos < mid) { before = sibs[i]; break; }
      }
      drag.t.insertBefore(drag.btn, before || el(".vlm-add", drag.t) || null);
    }, true);
    doc.addEventListener("pointerup", function (e) {
      if (!drag) return; var d = drag; drag = null;
      d.btn.classList.remove("vlm-galdrag");
      try { d.btn.releasePointerCapture(e.pointerId); } catch (_) {}
      if (d.moved) commitGallery(d.t, true);
    }, true);
  })();

  /* ===================================================================
     LINK EDITING  (friendly dropdown; friendly names only)
     =================================================================== */
  function openLinkBar(node) {
    var slug = slugFromHref(node.getAttribute("href") || "");
    el(".vlm-linkbtn__txt", linkbar).textContent = SLUG_FRIENDLY[slug] || "Choose a destination";
    linkbar.__el = node;
    var r = node.getBoundingClientRect();
    placeFlyoutBelow(linkbar, r); showSelRing(node);
    repos = function () { var rr = node.getBoundingClientRect(); placeFlyoutBelow(linkbar, rr); placeBox(selRing, rr, 4); };
  }
  function openLinkPop(anchorRect, currentSlug, onPick, anchorGetter) {
    linkpop.__anchor = anchorGetter || null;   // lets onReflow keep the pop glued to its anchor on scroll
    var html = '<div class="vlm-linkpop__head">This opens</div>' +
      '<input type="text" placeholder="Search your pages..." />' +
      '<div class="vlm-lplist">';
    if (!LINK_GROUPS.length) {
      html += '<p class="vlm-ctl__empty">No link destinations are configured for this site yet (vellum.config.js linkTargets).</p>';
    }
    LINK_GROUPS.forEach(function (g) {
      html += '<div class="vlm-lpgroup">' + escH(g[0]) + '</div>';
      g[1].forEach(function (o) {
        html += '<div class="vlm-lpopt' + (o[1] === currentSlug ? " on" : "") + '" data-slug="' + escH(o[1]) + '" data-name="' + escH(o[0]) + '">' + escH(o[0]) +
          svg('<path d="M5 12l5 5L20 6"/>', 2.4).replace("<svg", '<svg class="vlm-tick"') + "</div>";
      });
    });
    html += "</div>";
    linkpop.innerHTML = html;
    placeFlyoutBelow(linkpop, anchorRect);
    var input = el("input", linkpop);
    input.addEventListener("input", function () {
      var q = input.value.toLowerCase();
      els(".vlm-lpopt", linkpop).forEach(function (o) { o.style.display = o.getAttribute("data-name").toLowerCase().indexOf(q) >= 0 ? "" : "none"; });
      els(".vlm-lpgroup", linkpop).forEach(function (g) { g.style.display = q ? "none" : ""; });
    });
    els(".vlm-lpopt", linkpop).forEach(function (o) {
      o.addEventListener("click", function () { onPick(o.getAttribute("data-slug"), o.getAttribute("data-name")); linkpop.classList.remove("on"); });
    });
    setTimeout(function () { input.focus(); }, 20);
  }

  /* ===================================================================
     MERCHANDISING PANEL (products layer)
     =================================================================== */
  function handleTitle(handle) {
    var p = prodList().filter(function (x) { return x.handle === handle; })[0];
    return p ? p.title : null;
  }
  function syncMerchUI(card) {
    var s = psSeed(card.getAttribute("data-handle"));
    els("[data-vlm-cat] button", merch).forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-v") === s.cat); });
    els("[data-vlm-gender] button", merch).forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-v") === s.gender); });
    els(".vlm-tgl", merch).forEach(function (t) {
      var f = t.getAttribute("data-vlm-flag");
      t.classList.toggle("on", f === "best" ? !!s.best : f === "new" ? !!s.isnew : f === "trending" ? !!s.trend : false);
    });
    el("[data-vlm-hide]", merch).classList.toggle("on", !!s.hidden);
    el("[data-vlm-hidelbl]", merch).textContent = s.hidden ? "Hidden" : "Hide";
  }
  function openMerch(card) {
    if (!PRODUCTS) return;
    var h = card.getAttribute("data-handle");
    psSeed(h); syncCard(card);   // PSTATE is the single source of truth: mirror it onto the card + badges
    var nameEl = el(CARD_NAME_SEL, card);
    el(".vlm-merch__title", merch).textContent = (nameEl && nameEl.textContent) || handleTitle(h) || "Product";
    syncMerchUI(card);
    merch.__card = card;
    var r = card.getBoundingClientRect();
    placeMerchPanel(r); showSelRing(card);
    repos = function () { var rr = card.getBoundingClientRect(); placeMerchPanel(rr); placeBox(selRing, rr, 3); };
  }
  function setHidden(card, hidden) {
    card.classList.toggle("vlm-hidden", hidden);
    card.dataset.vlmHidden = hidden ? "1" : "";
    if (hidden) {
      if (!hidetagMap.has(card)) {
        var t = doc.createElement("span"); t.className = "vlm-hidetag on";
        t.innerHTML = svg('<path d="M3 3l18 18M10.5 10.7a2 2 0 002.8 2.8M6.5 6.6C4.6 7.9 3 10 3 12c0 0 4 7 9 7 1.6 0 3-.5 4.3-1.3M9.9 5.2A9 9 0 0112 5c5 0 9 7 9 7a17 17 0 01-2.2 2.9"/>', 2) + " Hidden from your site";
        root.appendChild(t); hidetagMap.set(card, t);
      }
    } else if (hidetagMap.has(card)) { hidetagMap.get(card).remove(); hidetagMap.delete(card); }
    positionHidetags();
  }
  // FLIP reorder
  function flipMove(container, card, ref) {
    if (ref === card) return;
    var kids = els(CARD_SEL, container);
    var first = new Map(kids.map(function (k) { return [k, k.getBoundingClientRect()]; }));
    container.insertBefore(card, ref);
    els(CARD_SEL, container).forEach(function (k) {
      var f = first.get(k); if (!f) return;
      var l = k.getBoundingClientRect(), dx = f.left - l.left, dy = f.top - l.top;
      if (dx || dy) {
        k.style.transition = "none"; k.style.transform = "translate(" + dx + "px," + dy + "px)";
        setTimeout(function () { k.style.transition = "transform .42s cubic-bezier(.2,.8,.2,1)"; k.style.transform = ""; }, 16);   // timer, not rAF (webview throttling)
      }
    });
  }
  function moveCard(card, dir) {
    var container = card.parentElement; if (!container) return;
    var sibs = els(CARD_SEL, container), i = sibs.indexOf(card);
    if (dir < 0 && i > 0) flipMove(container, card, sibs[i - 1]);
    else if (dir > 0 && i < sibs.length - 1) flipMove(container, card, sibs[i + 1].nextElementSibling);
    else return;
    absorbDomOrder(container);   // fold the new on-canvas order into the global ranking (+ log)
    if (repos) repos(); positionHidetags(); touchSave();
  }

  /* ===================================================================
     DIRECT CARD DRAG-REORDER (on-canvas): press a product and drag it
     left / right to reorder it in place. A plain click (no drag past
     threshold) still opens the panel. Desktop pointer only; touch keeps
     the panel grip + arrows (so a finger swipe still scrolls the page /
     rail instead of being trapped as a drag).
     =================================================================== */
  (function () {
    var drag = null;
    doc.addEventListener("pointerdown", function (e) {
      if (!inEditMode || !PRODUCTS) return;
      if (e.pointerType === "touch") return;                 // touch reorders via the options grip/arrows
      if (e.button != null && e.button > 0) return;          // primary button only
      if (e.target.closest("#vlm-root")) return;             // editor chrome handles itself
      var card = e.target.closest(CARD_SEL + "[data-vlm-ed]");
      if (!card || !card.parentElement) return;
      if (isCuratedContainer(card.parentElement)) return;    // curated rails keep their hand-picked order
      drag = { card: card, container: card.parentElement, moved: false, sx: e.clientX, sy: e.clientY, pid: e.pointerId };
      e.stopPropagation();                                   // stop the rail's drag-to-scroll from also starting
    }, true);
    doc.addEventListener("pointermove", function (e) {
      if (!drag) return;
      if (!drag.moved) {
        if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) < 6) return;   // click vs drag threshold
        drag.moved = true;
        clearSel();                                          // close any open panel/selection while dragging
        drag.card.classList.add("vlm-dragging");
        try { drag.card.setPointerCapture(drag.pid); } catch (_) {}
      }
      e.preventDefault();
      var sibs = els(CARD_SEL, drag.container).filter(function (c) { return c !== drag.card; });
      if (!sibs.length) return;
      var target = null, best = Infinity;
      for (var i = 0; i < sibs.length; i++) {
        var r = sibs[i].getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { target = sibs[i]; break; }
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2, d = (cx - e.clientX) * (cx - e.clientX) + (cy - e.clientY) * (cy - e.clientY);
        if (d < best) { best = d; target = sibs[i]; }
      }
      if (target) {
        var tr = target.getBoundingClientRect();
        var before = e.clientX < tr.left + tr.width / 2;     // drop to the left or right of the target
        flipMove(drag.container, drag.card, before ? target : target.nextElementSibling);
        if (repos) repos(); positionHidetags();
      }
    }, true);
    function endDrag(e) {
      if (!drag) return; var d = drag; drag = null;
      d.card.classList.remove("vlm-dragging");
      try { d.card.releasePointerCapture(e.pointerId); } catch (_) {}
      if (d.moved) {
        absorbDomOrder(d.container);                         // fold the new order into the global ranking + real save
        touchSave();
        // swallow the click that fires right after a drag so the options panel does not open
        var swallow = function (ev) { ev.preventDefault(); ev.stopPropagation(); doc.removeEventListener("click", swallow, true); };
        doc.addEventListener("click", swallow, true);
        setTimeout(function () { doc.removeEventListener("click", swallow, true); }, 400);
      }
    }
    doc.addEventListener("pointerup", endDrag, true);
    doc.addEventListener("pointercancel", endDrag, true);
  })();

  /* ===================================================================
     PANEL EVENT WIRING (all inside #vlm-root -> own listeners)
     =================================================================== */
  // image tools
  el("[data-vlm-replace]", imgtools).addEventListener("click", function () { if (imgtools.__el) fileInput.click(); });
  el("[data-vlm-adjust]", imgtools).addEventListener("click", function () { imgtools.classList.toggle("focusing"); });
  el("[data-vlm-imglink]", imgtools).addEventListener("click", function () {
    var linkA = imgtools.__linkA; if (!linkA) return;
    var lk = linkA.getAttribute("data-content-link");
    var cur = slugFromHref(linkA.getAttribute("href") || "");
    if (lk) origFor("linkhref::" + lk, linkA.getAttribute("href") || "");   // freeze the raw original href for exact revert
    var btn = this;
    openLinkPop(btn.getBoundingClientRect(), cur, function (slug) {
      var hh = hrefForSlug(slug); if (hh) linkA.setAttribute("href", hh);   // whitelist only, never a raw URL
      if (lk) { logEdit({ t: "link", k: lk, label: "Link", page: PAGE, orig: origFor("link::" + lk, cur), cur: slug }); queueSave(defObj(lk, slug)); }
      touchSave();
    }, function () { return btn.getBoundingClientRect(); });
  });
  fileInput.addEventListener("change", function () {
    var f = fileInput.files && fileInput.files[0]; if (!f || !imgtools.__el) return;
    doSiteImageReplace(imgtools.__el, f);
    fileInput.value = "";
  });
  // link toolbar
  el("[data-vlm-linkopen]", linkbar).addEventListener("click", function () {
    var node = linkbar.__el; if (!node) return;
    var lk = node.getAttribute("data-content-link");
    var cur = slugFromHref(node.getAttribute("href") || "");
    if (lk) origFor("linkhref::" + lk, node.getAttribute("href") || "");   // freeze the raw original href for exact revert
    var btn = this;
    openLinkPop(btn.getBoundingClientRect(), cur, function (slug, name) {
      var hh = hrefForSlug(slug); if (hh) node.setAttribute("href", hh);   // whitelist only, never a raw URL
      el(".vlm-linkbtn__txt", linkbar).textContent = name;
      if (lk) { logEdit({ t: "link", k: lk, label: "Link", page: PAGE, orig: origFor("link::" + lk, cur), cur: slug }); queueSave(defObj(lk, slug)); }
      touchSave();
    }, function () { return btn.getBoundingClientRect(); });
  });
  // merch panel
  function afterMerch(card) {
    var h = card.getAttribute("data-handle");
    syncCardsFor(h);   // dataset + live badge preview + hidden treatment on every instance of this card
    syncMerchUI(card);  // refresh the panel toggles
    logMerch(h); queueSave(merchKeys(h)); touchSave();   // persist product.<h>.* (best/new/trending/hidden/gender/category)
  }
  /* Trending controls whether a product shows in a Trending rail, so a toggle must
     reflect in the rail immediately (not only on the next save/reload). Mirror the
     flag onto the live product and re-render via the same products-updated path the
     applier uses. A site with no such rail simply ignores the event. */
  function dispatchProductsUpdated() {
    var ev;
    try { ev = new CustomEvent("vellum:products-updated", { detail: { map: {} } }); }
    catch (e) { ev = doc.createEvent("CustomEvent"); ev.initCustomEvent("vellum:products-updated", true, false, { map: {} }); }
    doc.dispatchEvent(ev);
  }
  function applyTrendingLive(h) {
    var pr = prodBy(h); if (pr) pr.trending = psSeed(h).trend ? true : false;
    dispatchProductsUpdated();
    // the re-render may remove the card the merch panel is anchored to (it left the rail)
    setTimeout(function () {
      if (merch.classList.contains("on") && merch.__card && !merch.__card.isConnected) clearSel();
      else if (repos) { try { repos(); } catch (e) {} }
    }, 40);
  }
  merch.addEventListener("click", function (e) {
    var card = merch.__card; if (!card) return;
    var h = card.getAttribute("data-handle"), s = psSeed(h);
    var catBtn = e.target.closest("[data-vlm-cat] button");
    if (catBtn) { s.cat = catBtn.getAttribute("data-v"); psSave(); afterMerch(card); return; }
    var gBtn = e.target.closest("[data-vlm-gender] button");
    if (gBtn) { s.gender = gBtn.getAttribute("data-v"); psSave(); afterMerch(card); return; }
    var tgl = e.target.closest(".vlm-tgl");
    if (tgl) {
      var f = tgl.getAttribute("data-vlm-flag"), field = f === "best" ? "best" : f === "new" ? "isnew" : "trend";
      s[field] = s[field] ? 0 : 1;   // Trending is independent: no derivation from best/new
      psSave(); afterMerch(card);
      if (field === "trend") applyTrendingLive(h);   // reflect Trending membership in the rail at once
      return;
    }
    var hideBtn = e.target.closest("[data-vlm-hide]");
    if (hideBtn) { s.hidden = s.hidden ? 0 : 1; psSave(); afterMerch(card); return; }
    var mv = e.target.closest("[data-vlm-move]");
    if (mv) { moveCard(card, +mv.getAttribute("data-vlm-move")); return; }
  });
  // grip drag reorder (pointer-based, with FLIP)
  (function () {
    var grip = el("[data-vlm-grip]", merch), dragging = false, pid = null;
    grip.addEventListener("pointerdown", function (e) {
      var card = merch.__card; if (!card) return;
      dragging = true; pid = e.pointerId; e.preventDefault();
      grip.setPointerCapture(pid); card.classList.add("vlm-dragging");
    });
    grip.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var card = merch.__card, container = card && card.parentElement; if (!container) return;
      var sibs = els(CARD_SEL, container).filter(function (c) { return c !== card; });
      var target = null;
      for (var i = 0; i < sibs.length; i++) {
        var r = sibs[i].getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { target = sibs[i]; break; }
      }
      if (!target) {
        var best = Infinity;
        sibs.forEach(function (c) { var r = c.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, d = (cx - e.clientX) * (cx - e.clientX) + (cy - e.clientY) * (cy - e.clientY); if (d < best) { best = d; target = c; } });
      }
      if (target) {
        var tr = target.getBoundingClientRect();
        var before = e.clientX < tr.left + tr.width / 2;
        flipMove(container, card, before ? target : target.nextElementSibling);
        if (repos) repos(); positionHidetags();
      }
    });
    function end() { if (!dragging) return; dragging = false; var card = merch.__card; if (card) { card.classList.remove("vlm-dragging"); if (card.parentElement) absorbDomOrder(card.parentElement); } try { grip.releasePointerCapture(pid); } catch (e) {} touchSave(); }
    grip.addEventListener("pointerup", end);
    grip.addEventListener("pointercancel", end);
  })();

  /* ===================================================================
     DRAWERS  (Products & order · Your edits · Complete the Look) + the
     per-field "Revert to original" pill. All three drawers reuse
     .vlm-drawer; one open at a time behind a shared scrim.
     =================================================================== */
  function closeDrawers() {
    [prodsD, editsD, ctlPanel].forEach(function (d) { d.classList.remove("on"); });
    scrim.classList.remove("on"); body.classList.remove("vlm-drawering");
  }
  function openDrawer(which) {
    clearSel();
    var d = which === "prods" ? prodsD : which === "edits" ? editsD : which === "ctl" ? ctlPanel : null;
    if (!d) return;
    [prodsD, editsD, ctlPanel].forEach(function (x) { if (x !== d) x.classList.remove("on"); });
    if (which === "prods") renderProds();
    else if (which === "edits") renderEdits();
    else if (which === "ctl") renderCtl();
    scrim.classList.add("on"); d.classList.add("on"); body.classList.add("vlm-drawering");
  }

  /* ---- Your edits (session history) ---- */
  var TYPE_ICON = {
    text:  svg('<path d="M4 7V5h16v2M9 5v14M7 19h4"/>', 1.8),
    img:   svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 15l-5-5L5 20"/>', 1.8),
    bg:    svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 15l-5-5L5 20"/>', 1.8),
    focal: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>', 1.8),
    link:  svg('<path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1"/>', 1.8),
    merch: svg('<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v6l9 4 9-4V7"/>', 1.8),
    order: svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', 1.8),
    ctl:   svg('<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 10-7.8 7.8l8.8 8.6 8.8-8.6a5.5 5.5 0 000-7.8z"/>', 1.8),
    gal:   svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15l5-5 4 4 3-3 6 6"/>', 1.8)
  };
  function pageLabel(pg) {
    var L = cfg.pageLabels || {};
    if (L[pg]) return L[pg];
    var t = String(pg || "").replace(/\.html?$/, "");
    if (!t || t === "index" || t === "home") return "Home";
    t = t.replace(/[-_]+/g, " ");
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function updateEditsBadge() {
    var n = Object.keys(EDITS).length;
    editsBadge.textContent = n ? String(n) : "";
    editsBadge.classList.toggle("on", n > 0);
    var sub = el("#vlmEditsSub", root); if (sub) sub.textContent = n ? (n + (n === 1 ? " change this session" : " changes this session")) : "Nothing changed yet";
  }
  function renderEdits() {
    var host = el("#vlmEditsList", root); if (!host) return;
    var ids = Object.keys(EDITS).sort(function (a, b) { return (EDITS[b].ts || 0) - (EDITS[a].ts || 0); });
    el("#vlmRevertAll", root).style.display = ids.length ? "" : "none";
    updateEditsBadge();
    if (!ids.length) { host.innerHTML = '<div class="vlm-drawer__empty">No changes yet. Anything you edit shows here so you can undo it.</div>'; return; }
    host.innerHTML = ids.map(function (id) {
      var e = EDITS[id], oldv = e.d0 != null ? e.d0 : e.orig, newv = e.d1 != null ? e.d1 : e.cur, pg = pageLabel(e.page);
      return '<div class="vlm-erow" data-id="' + escH(id) + '">' +
        '<span class="vlm-erow__ic">' + (TYPE_ICON[e.t] || "") + '</span>' +
        '<div class="vlm-erow__main"><span class="vlm-erow__k">' + escH(e.label || e.k) + (pg ? ' <i>&middot; ' + escH(pg) + '</i>' : '') + '</span>' +
          '<span class="vlm-erow__chg"><s>' + (String(oldv).trim() ? escH(trunc(oldv, 30)) : '<em>empty</em>') + '</s>' +
          svg('<path d="M5 12h14M13 6l6 6-6 6"/>', 2) +
          '<b>' + (String(newv).trim() ? escH(trunc(newv, 30)) : '<em>empty</em>') + '</b></span></div>' +
        '<button class="vlm-erow__rev" data-rev="' + escH(id) + '" title="Revert this change">' + svg('<path d="M9 14l-4-4 4-4"/><path d="M5 10h9a5 5 0 015 5v1"/>', 2) + '</button>' +
      '</div>';
    }).join("");
    els(".vlm-erow__rev", host).forEach(function (b) {
      b.addEventListener("click", function () { revertEdit(b.getAttribute("data-rev")); renderEdits(); });
    });
  }

  /* ---- per-field "Revert to original" pill ---- */
  function editIdFor(node) {
    if (!node) return null;
    var k = node.getAttribute("data-vlm-ed");
    if (k === "text") { var key = node.getAttribute("data-content"); return key && EDITS["text::" + key] ? "text::" + key : null; }
    if (k === "img") { var ik = node.getAttribute("data-content-img"); if (!ik) return null; return EDITS["img::" + ik] ? "img::" + ik : (EDITS["focal::" + ik] ? "focal::" + ik : null); }
    if (k === "bg") { var bk = node.getAttribute("data-content-bg"); return bk && EDITS["bg::" + bk] ? "bg::" + bk : null; }
    if (k === "link") { var lk = node.getAttribute("data-content-link"); return lk && EDITS["link::" + lk] ? "link::" + lk : null; }
    if (k === "card") { var h = node.getAttribute("data-handle"); return h && EDITS["merch::" + h] ? "merch::" + h : null; }
    return null;
  }
  function positionRevert(node) {
    var r = node.getBoundingClientRect();
    revertPill.classList.add("on");
    var w = revertPill.offsetWidth;
    revertPill.style.left = clamp(r.right - w, 8, vw() - w - 8) + "px";
    revertPill.style.top = clamp(r.top - revertPill.offsetHeight - 8, 8, vh() - revertPill.offsetHeight - 8) + "px";
  }
  function refreshRevert() {
    if (current && editIdFor(current)) positionRevert(current);
    else revertPill.classList.remove("on");
  }

  /* ---- Products drawer: whole-catalog order + per-row quick toggles ---- */
  function prodSearchVal() { var i = el("#vlmProdSearch", root); return i ? (i.value || "").trim().toLowerCase() : ""; }
  function renderProds() {
    var host = el("#vlmProdsList", root); if (!host) return;
    var q = prodSearchVal(), seq = orderedHandles(), shown = 0;
    host.innerHTML = seq.map(function (h) {
      var p = prodBy(h); if (!p) return "";
      if (q && (p.title || "").toLowerCase().indexOf(q) < 0) return "";
      shown++;
      var s = psSeed(h);
      var gtag = (AUDS.length && s.gender && s.gender !== AUDS[0]) ? " &middot; " + escH(AUD_LABELS[s.gender] || s.gender) : "";
      return '<div class="vlm-prow' + (s.hidden ? " is-hidden" : "") + '" data-h="' + escH(h) + '">' +
        '<span class="vlm-prow__grip" title="Drag to reorder">' + svg('<circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none"/>') + '</span>' +
        '<img class="vlm-prow__thumb" src="' + escH(thumbFor(p)) + '" alt="" loading="lazy" />' +
        '<div class="vlm-prow__info"><span class="vlm-prow__name">' + escH(p.title) + '</span><span class="vlm-prow__cat">' + escH(s.cat || "") + gtag + '</span></div>' +
        '<div class="vlm-prow__tog">' +
          '<button data-pt="trend" class="' + (s.trend ? "on" : "") + '" title="Show in Trending">Trend</button>' +
          '<button data-pt="best" class="' + (s.best ? "on" : "") + '" title="Best Seller">Best</button>' +
          '<button data-pt="isnew" class="' + (s.isnew ? "on" : "") + '" title="New Arrival">New</button>' +
          '<button data-pt="hidden" class="vlm-prow__hide ' + (s.hidden ? "on" : "") + '" title="Show / hide" aria-label="Show or hide">' + svg('<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="2.5"/>', 1.8) + '</button>' +
        '</div>' +
      '</div>';
    }).join("");
    if (!shown) host.innerHTML = '<div class="vlm-drawer__empty">No products match that search.</div>';
    wireProdRows(host);
  }
  function wireProdRows(host) {
    els(".vlm-prow__tog button", host).forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var row = b.closest(".vlm-prow"), h = row.getAttribute("data-h"), field = b.getAttribute("data-pt"), s = psSeed(h);
        s[field] = s[field] ? 0 : 1;   // Trending is independent: toggling best/new never touches it
        psSave();
        b.classList.toggle("on", !!s[field]);
        if (field === "hidden") row.classList.toggle("is-hidden", !!s.hidden);
        syncCardsFor(h); logMerch(h); queueSave(merchKeys(h));
        if (field === "trend") applyTrendingLive(h);   // add/remove from the Trending rail live
        if (merch.classList.contains("on") && merch.__card && merch.__card.getAttribute("data-handle") === h) syncMerchUI(merch.__card);
        touchSave();
      });
    });
  }
  function commitProdOrder(host) {
    els(".vlm-prow", host).forEach(function (r, i) { psSeed(r.getAttribute("data-h")).order = i + 1; });
    psSave(); logOrder(); applyOrderToDOM();
  }
  // pointer-drag reorder inside the Products list (only on the full, unfiltered list)
  (function () {
    var d = null;
    prodsD.addEventListener("pointerdown", function (e) {
      if (prodSearchVal()) return;
      var row = e.target.closest(".vlm-prow"); if (!row) return;
      if (e.target.closest(".vlm-prow__tog")) return;   // let the quick toggles work
      d = { row: row, moved: false, sy: e.clientY };
      try { row.setPointerCapture(e.pointerId); } catch (_) {}
    });
    prodsD.addEventListener("pointermove", function (e) {
      if (!d) return;
      if (!d.moved && Math.abs(e.clientY - d.sy) < 6) return;
      d.moved = true; d.row.classList.add("vlm-prow--drag"); e.preventDefault();
      var list = el("#vlmProdsList", root);
      var sibs = els(".vlm-prow", list).filter(function (r) { return r !== d.row; }), before = null;
      for (var i = 0; i < sibs.length; i++) { var r = sibs[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { before = sibs[i]; break; } }
      list.insertBefore(d.row, before);
    });
    function end(e) { if (!d) return; var dd = d; d = null; dd.row.classList.remove("vlm-prow--drag"); try { dd.row.releasePointerCapture(e.pointerId); } catch (_) {} if (dd.moved) commitProdOrder(el("#vlmProdsList", root)); }
    prodsD.addEventListener("pointerup", end);
    prodsD.addEventListener("pointercancel", end);
  })();

  /* ---- Complete the Look picker (PDP; needs cfg.products.cardHTML) ---- */
  function currentCtlPicks(h) { return (CTLMAP[h] || []).filter(function (x) { return x && x !== h && prodBy(x); }).slice(0, CTL_MAX); }
  function ctlSearchVal() { var i = el("#vlmCtlSearch", root); return i ? (i.value || "").trim().toLowerCase() : ""; }
  function renderCtl() {
    var h = ctlPanel.__h; if (!h) return;
    var picks = currentCtlPicks(h);
    el("#vlmCtlChips", root).innerHTML = picks.length ? picks.map(function (hh, i) {
      var p = prodBy(hh), nm = p ? p.title : hh;
      return '<span class="vlm-ctlchip" data-h="' + escH(hh) + '">' +
        '<button class="vlm-ctlchip__mv" data-cmv="-1"' + (i === 0 ? " disabled" : "") + ' aria-label="Move earlier">' + svg('<path d="M15 6l-6 6 6 6"/>', 2.2) + '</button>' +
        '<span class="vlm-ctlchip__n"><b>' + (i + 1) + '</b> ' + escH(nm) + '</span>' +
        '<button class="vlm-ctlchip__mv" data-cmv="1"' + (i === picks.length - 1 ? " disabled" : "") + ' aria-label="Move later">' + svg('<path d="M9 6l6 6-6 6"/>', 2.2) + '</button>' +
        '<button class="vlm-ctlchip__rm" aria-label="Remove">' + svg('<path d="M6 6l12 12M18 6L6 18"/>', 2.2) + '</button>' +
      '</span>';
    }).join("") : '<p class="vlm-ctl__empty">No products picked. This item shows automatic pairings.</p>';
    el("#vlmCtlCount", root).textContent = picks.length + " of " + CTL_MAX + " selected";
    els(".vlm-ctlchip__mv", ctlPanel).forEach(function (b) {
      b.addEventListener("click", function () {
        var hh = b.closest(".vlm-ctlchip").getAttribute("data-h"), dir = +b.getAttribute("data-cmv");
        var arr = currentCtlPicks(h), i = arr.indexOf(hh), j = i + dir;
        if (i < 0 || j < 0 || j >= arr.length) return;
        var t = arr[j]; arr[j] = arr[i]; arr[i] = t; CTLMAP[h] = arr; store("vlm-ctl", CTLMAP); renderCtl();
      });
    });
    els(".vlm-ctlchip__rm", ctlPanel).forEach(function (b) {
      b.addEventListener("click", function () {
        var hh = b.closest(".vlm-ctlchip").getAttribute("data-h"), arr = currentCtlPicks(h), at = arr.indexOf(hh);
        if (at >= 0) { arr.splice(at, 1); CTLMAP[h] = arr; store("vlm-ctl", CTLMAP); renderCtl(); }
      });
    });
    renderCtlList();
  }
  function renderCtlList() {
    var h = ctlPanel.__h, list = el("#vlmCtlList", root); if (!h || !list) return;
    var q = ctlSearchVal(), picks = currentCtlPicks(h);
    var cands = manageable().filter(function (p) { return p.handle !== h && (!q || (p.title || "").toLowerCase().indexOf(q) >= 0); });
    list.innerHTML = cands.length ? cands.map(function (p) {
      var on = picks.indexOf(p.handle) >= 0, dis = !on && picks.length >= CTL_MAX;
      return '<button class="vlm-ctlrow' + (on ? " on" : "") + (dis ? " is-disabled" : "") + '" data-h="' + escH(p.handle) + '"' + (dis ? " disabled" : "") + '>' +
        '<img src="' + escH(thumbFor(p)) + '" alt="" loading="lazy" />' +
        '<span class="vlm-ctlrow__n">' + escH(p.title) + '</span>' +
        '<span class="vlm-ctlrow__add">' + (on ? svg('<path d="M5 12l5 5L20 6"/>', 2.6) : "+") + '</span>' +
      '</button>';
    }).join("") : '<p class="vlm-ctl__empty">No products match that search.</p>';
    els(".vlm-ctlrow", list).forEach(function (b) {
      if (b.disabled) return;
      b.addEventListener("click", function () {
        var hh = b.getAttribute("data-h"), arr = currentCtlPicks(h), at = arr.indexOf(hh);
        if (at >= 0) arr.splice(at, 1); else if (arr.length < CTL_MAX) arr.push(hh);
        CTLMAP[h] = arr; store("vlm-ctl", CTLMAP); renderCtl();
      });
    });
  }
  function railHandles(rail) { return els(CARD_SEL + "[data-handle]", rail).map(function (c) { return c.getAttribute("data-handle"); }); }
  function applyCtl() {
    if (!CTL_ON) return;
    var rail = el(PDP.completeLookRail); if (!rail) return;
    var h = galHandle(); if (!h) return;
    if (rail.__vlmAuto == null) rail.__vlmAuto = rail.innerHTML;   // capture the site's automatic pairing once
    var picks = currentCtlPicks(h);
    if (picks.length) {
      if (railHandles(rail).join(",") === picks.join(",")) return;   // already applied -> no-op (settles the PDP observer)
      rail.innerHTML = picks.map(function (hh, i) { return PRODUCTS.cardHTML(prodBy(hh), i); }).join("");
    } else {
      if (rail.innerHTML === rail.__vlmAuto) return;                 // already automatic -> no-op
      rail.innerHTML = rail.__vlmAuto;
    }
    tagEditables(); if (inEditMode) syncAllCards();
  }
  function reapplyCtl() { if (CTL_ON && el(PDP.completeLookRail) && (CTLMAP[galHandle()] || []).length) applyCtl(); }
  function logCtl(h) {
    var names = currentCtlPicks(h).map(function (hh) { var p = prodBy(hh); return p ? p.title : hh; }).join(", ");
    logEdit({ t: "ctl", k: h, label: (prodBy(h) || {}).title || h, page: PAGE, meta: { h: h }, orig: "", cur: names, d0: "Automatic pairing", d1: names ? "Custom: " + names : "" });
  }
  // inject the "Edit Complete the Look" affordance next to the PDP rail heading
  function injectCtlAffordance() {
    if (!CTL_ON) return;
    var rail = el(PDP.completeLookRail); if (!rail) return;
    var title = PDP.completeLookTitle ? el(PDP.completeLookTitle) : null;
    var host = title ? title.parentNode : rail.parentNode;
    if (!host || el(".vlm-ctledit", host)) return;
    var b = doc.createElement("button");
    b.className = "vlm-ctledit"; b.type = "button";
    b.innerHTML = svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>', 1.9) + " Edit Complete the Look";
    b.addEventListener("click", function () { ctlPanel.__h = galHandle(); openDrawer("ctl"); });
    if (title && title.nextSibling) host.insertBefore(b, title.nextSibling); else host.appendChild(b);
  }

  /* ---- drawer + revert wiring ---- */
  prodsBtn.addEventListener("click", function () { if (PRODUCTS) openDrawer("prods"); });
  editsBtn.addEventListener("click", function () { openDrawer("edits"); });
  scrim.addEventListener("click", closeDrawers);
  els("[data-vlm-drawerclose]", root).forEach(function (b) { b.addEventListener("click", closeDrawers); });
  var _ps = el("#vlmProdSearch", root); if (_ps) _ps.addEventListener("input", renderProds);
  var _cs = el("#vlmCtlSearch", root); if (_cs) _cs.addEventListener("input", renderCtlList);
  el("#vlmCtlAuto", root).addEventListener("click", function () { var h = ctlPanel.__h; if (!h) return; CTLMAP[h] = []; store("vlm-ctl", CTLMAP); renderCtl(); });
  el("#vlmCtlApply", root).addEventListener("click", function () { var h = ctlPanel.__h; if (!h) return; applyCtl(); logCtl(h); queueSave(defObj("product." + h + ".completeLook", currentCtlPicks(h).join("\n"))); closeDrawers(); });
  el("#vlmRevertAll", root).addEventListener("click", function () { Object.keys(EDITS).slice().forEach(function (id) { revertEdit(id); }); renderEdits(); });
  revertPill.addEventListener("click", function () {
    var id = editIdFor(current); if (!id) return;
    clearSel(); revertEdit(id); revertPill.classList.remove("on");
  });

  /* ===================================================================
     HOVER
     =================================================================== */
  function showHover(node) {
    placeBox(hoverRing, node.getBoundingClientRect(), 3); hoverRing.classList.add("on");
    chip.textContent = node.getAttribute("data-vlm-label") || "Edit";
    positionChip(node); chip.classList.add("on");
  }
  function hideHover() { hoverRing.classList.remove("on"); chip.classList.remove("on"); }
  doc.addEventListener("mouseover", function (e) {
    if (!inEditMode) return;
    if (e.target.closest("#vlm-root")) { hideHover(); return; }
    var ed = e.target.closest("[data-vlm-ed]");
    if (!ed || ed === current || ed.classList.contains("vlm-editing")) { hideHover(); return; }
    showHover(ed);
  });
  doc.addEventListener("mouseout", function (e) {
    if (!inEditMode) return;
    if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest("[data-vlm-ed]")) hideHover();
  });

  /* ===================================================================
     GLOBAL CLICK (capture) - select editables, let real nav links pass
     =================================================================== */
  doc.addEventListener("click", function (e) {
    if (!inEditMode) return;
    if (e.target.closest("#vlm-root")) return;             // editor chrome handles itself
    var ed = e.target.closest("[data-vlm-ed]");
    if (current && ed === current && current.classList.contains("vlm-editing")) return; // caret move inside ACTIVELY-edited text only
    if (ed) { e.preventDefault(); e.stopPropagation(); select(ed); }
    else { clearSel(); }                                    // clicked a non-editable element -> allow its normal behavior (nav)
  }, true);

  /* ===================================================================
     ENTER / EXIT / PERSIST
     =================================================================== */
  function applyHiddenVisuals(on) {
    if (!PRODUCTS) return;
    els(CARD_SEL + "[data-vlm-hidden='1']").forEach(function (c) { if (on) setHidden(c, true); else { c.classList.remove("vlm-hidden"); if (hidetagMap.has(c)) { hidetagMap.get(c).remove(); hidetagMap.delete(c); } } });
  }
  function enterEdit(firstTime) {
    inEditMode = true;
    body.classList.add("vlm-mode");   // edit mode persists across page nav via the armed session
    tagEditables();
    syncAllCards();     // apply saved merch state -> dataset + live badge preview + hidden treatment
    applyOrderToDOM();  // apply the saved global order to this page's rails/grid
    reapplyCtl();       // apply a saved Complete the Look on the PDP
    updateEditsBadge();
    if (firstTime) {
      try { scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { scrollTo(0, 0); }
      var eds = els("[data-vlm-ed]");
      eds.slice(0, 26).forEach(function (n, i) {
        setTimeout(function () { n.classList.add("vlm-pulse"); setTimeout(function () { n.classList.remove("vlm-pulse"); }, 1000); }, 90 * i);
      });
      setTimeout(function () { nudge.classList.add("on"); setTimeout(function () { nudge.classList.remove("on"); }, 4600); }, 700);
    }
  }
  function exitEdit() {
    closeDrawers();
    clearSel();
    applyHiddenVisuals(false);
    inEditMode = false;
    // "Done" disarms the session: the editor will not re-mount on the next page
    // load. Any cfg.session.setOnArm extras (e.g. a store-gate pass) are kept on
    // purpose so the owner is not locked out of her own gated site mid-visit.
    try {
      sessionStorage.removeItem(K_ARMED);
      sessionStorage.removeItem(K_PW);
      sessionStorage.removeItem("vlm-welcomed");
    } catch (e) {}
    body.classList.remove("vlm-mode", "vlm-map");
    mapToggle.classList.remove("on");
    hideHover();
  }

  /* ---- chrome buttons (armed session: no pill, no local unlock card) ---- */
  doneBtn.addEventListener("click", exitEdit);
  // open the tapped product's own page (staying in edit mode) so the owner can edit its photos + text
  el("[data-vlm-openpdp]", merch).addEventListener("click", function () {
    var card = merch.__card; if (!card) return;
    var href = card.getAttribute("data-href");
    if (!href) { var a = el("a[href]", card); if (a) href = a.getAttribute("href"); }
    if (!href && PRODUCTS && typeof PRODUCTS.productUrl === "function") {
      var h = card.getAttribute("data-handle");
      if (h) { try { href = PRODUCTS.productUrl(h); } catch (e) {} }
    }
    if (href) location.href = href;   // the armed session persists edit mode across the nav
  });
  mapToggle.addEventListener("click", function () { this.classList.toggle("on"); body.classList.toggle("vlm-map"); });
  addEventListener("keydown", function (e) { if (e.key === "Escape") { if (prodsD.classList.contains("on") || editsD.classList.contains("on") || ctlPanel.classList.contains("on")) closeDrawers(); else if (current) clearSel(); } });
  // Warn before leaving while a save is still pending / in flight.
  addEventListener("beforeunload", function (e) {
    if (inFlight || uploads || Object.keys(pending).length || Object.keys(pendingDel).length) { e.preventDefault(); e.returnValue = ""; return ""; }
  });

  /* ===================================================================
     BOOT - bind after the applier has settled (vellum:content-ready),
     then re-tag on any product re-render. Persist edit mode across pages.
     =================================================================== */
  function bindAfterContent() {
    var V = window.VELLUM || {};
    var welcomed = false;
    try { welcomed = sessionStorage.getItem("vlm-welcomed") === "1"; } catch (e) {}
    function go() {
      tagEditables();
      reapplyEdits();   // re-apply this session's text/image/link edits (multi-page UI continuity)
      if (!inEditMode) {
        // Armed session: auto-enter edit mode on every page. Show the teaching
        // pulse/nudge only the first time in this session (right after the gate).
        var first = !welcomed;
        try { sessionStorage.setItem("vlm-welcomed", "1"); } catch (e) {}
        enterEdit(first);
      }
    }
    if (V.contentReady) setTimeout(go, 0);
    else doc.addEventListener("vellum:content-ready", function () { setTimeout(go, 0); });
    // safety net if content-ready never fires (applier missing or blocked)
    setTimeout(go, 2000);
    // product rails / grid re-render on genuine edits -> re-tag
    // (timers, not rAF: embedded webviews throttle rAF and would strand the re-tag)
    doc.addEventListener("vellum:products-updated", function () { setTimeout(function () { tagEditables(); if (inEditMode) { syncAllCards(); applyOrderToDOM(); reapplyCtl(); } }, 30); });
    // the applier re-runs its map on a short delay (late i18n/shell re-renders);
    // re-assert this session's edits on top so a commit made within that window
    // is never rolled back to the previously-published value
    doc.addEventListener("vellum:content-applied", function () { setTimeout(reapplyEdits, 0); });
    // A PDP buybox + gallery injected/re-rendered by site JS (load + colour switch):
    // re-tag when that DOM changes so text + gallery editing always attach.
    // Idempotent + guarded, debounced via setTimeout (NOT rAF: some embedded
    // webviews throttle rAF while backgrounded, which would strand the re-tag).
    var pm = PDP && PDP.watch ? el(PDP.watch) : null;
    if (pm && window.MutationObserver) {
      var pend2 = false;
      new MutationObserver(function () {
        if (pend2) return; pend2 = true;
        setTimeout(function () { pend2 = false; tagEditables(); if (inEditMode) { syncAllCards(); reapplyCtl(); } }, 30);
      }).observe(pm, { childList: true, subtree: true });
    }
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", bindAfterContent);
  else bindAfterContent();

  // expose a tiny hook for verification/debugging (read-only state + a few drivers)
  window.__VELLUM = {
    enter: function () { enterEdit(true); }, exit: exitEdit,
    isEditing: function () { return inEditMode; },
    count: function () { return els("[data-vlm-ed]").length; },
    select: select,
    openDrawer: openDrawer, closeDrawers: closeDrawers,
    edits: function () { return EDITS; }, pstate: function () { return PSTATE; }, ctl: function () { return CTLMAP; },
    setCtl: function (h, arr) { CTLMAP[h] = (arr || []).slice(0, CTL_MAX); store("vlm-ctl", CTLMAP); }, applyCtl: applyCtl,
    orderedHandles: orderedHandles, psSeed: psSeed, syncCardsFor: syncCardsFor, revert: revertEdit,
    // ---- persistence introspection (for parity verification; no secrets exposed) ----
    pending: function () { var o = {}; Object.keys(pending).forEach(function (k) { o[k] = pending[k]; }); return o; },
    pendingDeletes: function () { return Object.keys(pendingDel); },
    flush: function () { flush(); },
    queueSave: queueSave, queueRevert: queueRevert, merchKeys: merchKeys, orderKeys: orderKeys,
    uploadUrl: function () { return UPLOAD_URL; },
    revertMode: revertMode,
    saveState: function () { return { pending: Object.keys(pending).length, deletes: Object.keys(pendingDel).length, inFlight: inFlight, uploads: uploads }; }
  };
})();
