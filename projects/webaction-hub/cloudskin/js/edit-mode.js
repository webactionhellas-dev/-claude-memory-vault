/* =====================================================================
   VELLUM - on-canvas edit-mode layer for CloudSkin  (PRODUCTION)
   ---------------------------------------------------------------------
   The "edit the live site by clicking it" editor, wired to CloudSkin's
   REAL backend. It mirrors js/studio.js verbatim: text/flag/link/order/
   photo-list writes go through the studio_save RPC; image uploads go
   through the studio-upload edge function; the owner's password is
   verified server-side at /creator (studio_auth) and re-sent per write.
   The public site (js/content.js + js/product.js) reads cloudskin_content
   and applies the overrides, always fail-open to the built-in defaults.

   SELF-GATING: this layer arms ONLY when sessionStorage vlm-armed==='1'
   (set by js/creator.js after a server-side password check). Without it,
   the IIFE returns immediately: zero chrome, zero listeners, nothing the
   public or an anonymous visitor can see.

   What it does:
   - armed-session boot (no public pill, no local password) -> auto-enters
     edit mode on every page; "Done" disarms the session
   - passe-partout frame + faint veil + one-time teaching pulse + nudge
   - TEXT  [data-content]        : click-to-edit in place, WORDS ONLY,
                                   captures textContent only (never innerHTML),
                                   paste is forced to text/plain
                                   -> studio_save {key: text}
   - IMAGE [data-content-img]    : Replace photo (client resize -> studio-upload
                                   dest:'site' -> studio_save {key: url}) + Adjust
                                   focus -> studio_save {key+'.pos': 'x% y%'}
   - LINK  [data-content-link]   : friendly "When tapped, opens" dropdown
                                   -> studio_save {key: slug} (incl. __about/__home)
   - MERCH .pcard                : re-merchandise a product in place (category,
                                   Trending [independent] / Best Sellers / New,
                                   Women/Men, Show/Hide, drag-reorder via FLIP)
                                   -> studio_save product.<h>.* keys
   - PER-COLOUR PHOTOS (PDP)     : add/replace (client resize -> studio-upload) /
                                   reorder / set-main -> studio_save
                                   product.<h>.images.<colourSlug> (newline list)
   - COMPLETE THE LOOK           : studio_save product.<h>.completeLook
   - REVERT / REVERT ALL         : studio_save {key: ''} (studio_delete does not
                                   exist on live; content.js fail-opens empty)
   - Vellum bar                  : live save-state + Outline editables + Done
   - edit mode PERSISTS across page navigation (armed session, sessionStorage)

   All chrome mounts in #cs-edit-root (a direct child of <body>) so the
   sticky / backdrop-filter header can never trap it.
   ===================================================================== */
(function () {
  "use strict";

  /* ---- SELF-GATING: this whole layer exists ONLY for an armed owner session.
     js/creator.js verifies the password server-side (studio_auth) and sets
     sessionStorage vlm-armed='1' + vlm-pw. Absent -> render ZERO chrome, attach
     ZERO listeners: the public / anonymous shopper never sees the editor. ---- */
  var ARMED = false; try { ARMED = sessionStorage.getItem("vlm-armed") === "1"; } catch (e) {}
  if (!ARMED) return;
  var PW = ""; try { PW = sessionStorage.getItem("vlm-pw") || ""; } catch (e) {}

  /* ---- friendly link targets (friendly names only, never raw slugs) ---- */
  var LINK_GROUPS = [
    ["Collections", [
      ["The Collection", "collection"], ["Women", "women"], ["Men", "men"],
      ["Trending", "trending"], ["New Arrivals", "new"], ["Best Sellers", "bestsellers"],
      ["Tops", "tops"], ["Bottoms", "bottoms"], ["Dresses", "dresses"], ["Skirts", "skirts"],
      ["Shorts", "shorts"], ["Bras", "bras"], ["Layers & Jackets", "layers"],
      ["Tennis", "tennis"], ["Padel", "padel"], ["Studio", "studio"], ["Train", "train"]
    ]],
    ["Pages", [
      ["Our Story", "__about"], ["Home", "__home"]
    ]]
  ];
  var SLUG_FRIENDLY = {};
  LINK_GROUPS.forEach(function (g) { g[1].forEach(function (o) { SLUG_FRIENDLY[o[1]] = o[0]; }); });

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
     LIVE PERSISTENCE  (mirrors js/studio.js verbatim)
     ---------------------------------------------------------------
     - text/flag/link/order/photo-list -> sb.rpc('studio_save',
       { p_password: PW, p_items: {key:value, ...} })  (studio.js ~L957)
     - image upload -> POST <url>/functions/v1/studio-upload  (studio.js L518)
     A pending queue holds writes so edits made DURING a save round-trip are
     never lost (studio.js L959-961); r.error is retry-safe; a beforeunload
     guard fires while anything is unsaved (studio.js L975).
     =================================================================== */
  var SB_CFG = window.CLOUDSKIN_SB || {};
  var SB0 = window.CLOUDSKIN_SB_CLIENT ||
            ((window.supabase && SB_CFG.url && SB_CFG.anonKey) ? window.supabase.createClient(SB_CFG.url, SB_CFG.anonKey) : null);
  if (SB0) window.CLOUDSKIN_SB_CLIENT = SB0;
  var UPLOAD_URL = String(SB_CFG.url || "").replace(/\/+$/, "") + "/functions/v1/studio-upload";
  // re-read the global at call time so sb.rpc stays stub-able for offline parity checks
  function sbClient() { return window.CLOUDSKIN_SB_CLIENT || SB0 || null; }

  var pending = {};      // key -> value awaiting a studio_save flush
  var inFlight = false;  // a studio_save round-trip is in the air
  var uploads = 0;       // studio-upload calls in flight (for an honest save indicator)
  var flushT = null;

  function defObj(k, v) { var o = {}; o[k] = v; return o; }

  function markSaving() { if (vsave) { vsave.classList.add("saving"); if (vstext) vstext.textContent = "Saving…"; } }
  function maybeSaved() {
    if (uploads || inFlight || Object.keys(pending).length) return;
    if (vsave) { vsave.classList.remove("saving"); if (vstext) vstext.textContent = "All changes saved"; }
  }
  function markError() { if (vsave) { vsave.classList.remove("saving"); if (vstext) vstext.textContent = "Save failed - retrying…"; } }

  // Queue one or more key/value writes. Values are strings; '' means "revert to
  // the built-in default" (content.js fail-opens empty -> default).
  function queueSave(items) {
    if (!items) return;
    var any = false;
    Object.keys(items).forEach(function (k) { pending[k] = String(items[k] == null ? "" : items[k]); any = true; });
    if (!any) return;
    markSaving();
    scheduleFlush(300);
  }
  function scheduleFlush(delay) {
    if (flushT) return;
    flushT = setTimeout(function () { flushT = null; flush(); }, delay || 300);
  }
  function flush() {
    if (inFlight) return;                        // in-flight completion re-checks pending
    var keys = Object.keys(pending);
    if (!keys.length) { maybeSaved(); return; }
    var c = sbClient();
    if (!c || !PW) { markError(); scheduleFlush(1500); return; }   // can't write yet: keep pending, retry
    var batch = {}; keys.forEach(function (k) { batch[k] = pending[k]; });
    inFlight = true; markSaving();
    c.rpc("studio_save", { p_password: PW, p_items: batch }).then(function (r) {
      inFlight = false;
      if (r && r.error) { markError(); scheduleFlush(1500); return; }   // retry-safe: keep pending, retry
      // clear only keys still unchanged since we sent them, so edits made DURING
      // the round-trip are preserved (studio.js L959-961)
      keys.forEach(function (k) { if (pending[k] === batch[k]) delete pending[k]; });
      if (Object.keys(pending).length) scheduleFlush(150); else maybeSaved();
    }).catch(function () { inFlight = false; markError(); scheduleFlush(1500); });
  }

  // studio-upload edge function (mirrors studio.js uploadImage L518-543).
  // dest:'site' for general site images; product photos pass NO dest.
  function uploadImage(handleOrKey, filename, dataUrl, dest) {
    var payload = { password: PW, handle: handleOrKey, filename: filename || "photo.jpg", contentType: "image/jpeg", dataBase64: dataUrl };
    if (dest) payload.dest = dest;
    return fetch(UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SB_CFG.anonKey, "Authorization": "Bearer " + SB_CFG.anonKey },
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

  // client-side resize to 2560 / JPEG q0.88 (studio.js resizeImage L929-943)
  function resizeImage(file, maxDim, cb) {
    var img = new Image();
    img.onload = function () {
      var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      var c = doc.createElement("canvas"); c.width = w; c.height = h;
      var ctx = c.getContext("2d"); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      cb(c.toDataURL("image/jpeg", 0.88));
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

  /* ---- action -> cloudskin_content key maps (the exact save contract) ---- */
  function merchKeys(h) {
    var s = psSeed(h), pre = "product." + h + ".", o = {};
    o[pre + "bestSeller"] = s.best ? "1" : "0";
    o[pre + "isNew"]      = s.isnew ? "1" : "0";
    o[pre + "trending"]   = s.trend ? "1" : "0";     // INDEPENDENT (Mike's decision) - not derived
    o[pre + "hidden"]     = s.hidden ? "1" : "0";
    o[pre + "gender"]     = s.gender;                // Women|Men|Unisex
    o[pre + "category"]   = s.cat;                   // Tops|Bottoms|Dresses
    return o;
  }
  function orderKeys() {
    var o = {}; orderedHandles().forEach(function (h, i) { o["product." + h + ".order"] = String(i + 1); }); return o;
  }

  /* ===================================================================
     BUILD THE CHROME (once) into #cs-edit-root (direct child of body)
     =================================================================== */
  var root = doc.createElement("div");
  root.id = "cs-edit-root";
  root.innerHTML =
    // passe-partout frame + veil (no public entry pill: the session is armed by /creator)
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
      '<div class="vlm-imgtools__drag" id="vlmDragHint">Drag the dot to reposition</div>' +
      '<div class="vlm-zoom" id="vlmZoom">' +
        '<span class="vlm-zoom__lab">Zoom</span>' +
        '<input type="range" class="vlm-zoom__range" id="vlmZoomRange" min="100" max="250" step="1" value="100" aria-label="Photo zoom" />' +
        '<span class="vlm-zoom__val" id="vlmZoomVal">100%</span>' +
        '<button type="button" class="vlm-zoom__reset" id="vlmZoomReset" title="Reset zoom and focus">Reset</button>' +
      '</div>' +
      '<div class="vlm-reco" id="vlmReco"></div>' +
      '<div class="vlm-fade" id="vlmFade">' +
        '<span class="vlm-fade__lab">Fade</span>' +
        '<input type="range" class="vlm-fade__range" id="vlmFadeRange" min="0" max="100" step="1" value="50" aria-label="Photo fade strength" />' +
        '<span class="vlm-fade__val" id="vlmFadeVal">50%</span>' +
      '</div>' +
      '<div class="vlm-prog"><i></i></div>' +
    '</div>' +
    // per-photo focal + zoom overlay for product galleries (PDP): frames ONE product photo,
    // stored per-URL in the pipe-delimited list so it survives reorder + serves card/PDP/pair.
    '<div class="vlm-galadj" id="vlmGalAdj">' +
      '<div class="vlm-focal vlm-galadj__dot" id="vlmGalDot"></div>' +
      '<div class="vlm-galadj__bar">' +
        '<span class="vlm-galadj__hint">Drag the dot to move</span>' +
        '<span class="vlm-zoom__lab">Zoom</span>' +
        '<input type="range" class="vlm-zoom__range" id="vlmGalZoom" min="100" max="250" step="1" value="100" aria-label="Photo zoom" />' +
        '<span class="vlm-zoom__val" id="vlmGalZoomVal">100%</span>' +
        '<button type="button" class="vlm-zoom__reset" id="vlmGalReset" title="Reset to default">Reset</button>' +
        '<button type="button" class="vlm-galadj__done" id="vlmGalDone">Save</button>' +
      '</div>' +
    '</div>' +
    // link toolbar (standalone links)
    '<div class="vlm-flyout vlm-linkbar" id="vlmLinkbar">' +
      '<span class="vlm-linkbar__label">When tapped, opens</span>' +
      '<button class="vlm-linkbtn" data-vlm-linkopen><span class="vlm-linkbtn__txt">Choose</span> ' + svg('<path d="M6 9l6 6 6-6"/>', 2) + '</button>' +
    '</div>' +
    // link dropdown (shared)
    '<div class="vlm-flyout vlm-linkpop" id="vlmLinkpop"></div>' +
    // merchandising panel
    '<div class="vlm-flyout vlm-merch" id="vlmMerch">' +
      '<div class="vlm-merch__head">' +
        '<div class="vlm-merch__eyebrow">' + svg('<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v6l9 4 9-4V7"/>', 1.8) + ' Re-merchandise</div>' +
        '<div class="vlm-merch__title">Product</div>' +
      '</div>' +
      '<button class="vlm-merch__open" data-vlm-openpdp>' + svg('<path d="M4 12h16M13 5l7 7-7 7"/>', 2) + ' Edit this product’s page' + '</button>' +
      '<div class="vlm-merch__body">' +
        '<div class="vlm-merch__sec"><span class="vlm-merch__lab">Category</span>' +
          '<div class="vlm-seg" data-vlm-cat><button data-v="Tops">Tops</button><button data-v="Bottoms">Bottoms</button><button data-v="Dresses">Dresses</button></div></div>' +
        '<div class="vlm-merch__sec"><span class="vlm-merch__lab">Show in</span>' +
          '<div class="vlm-toggles">' +
            '<div class="vlm-tgl" data-vlm-flag="trending"><span>Trending</span><span class="vlm-sw"></span></div>' +
            '<div class="vlm-tgl" data-vlm-flag="best"><span>Best Sellers</span><span class="vlm-sw"></span></div>' +
            '<div class="vlm-tgl" data-vlm-flag="new"><span>New Arrivals</span><span class="vlm-sw"></span></div>' +
          '</div>' +
          '<p class="vlm-merch__hint">Best Seller and New set which of those collections this product appears in.</p></div>' +
        '<div class="vlm-merch__sec"><span class="vlm-merch__lab">Audience</span>' +
          '<div class="vlm-seg" data-vlm-gender><button data-v="Women">Women</button><button data-v="Men">Men</button><button data-v="Unisex">Both</button></div></div>' +
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
      '<div class="vlm-mark"><span class="vlm-glyph"></span><span><b>Editing</b><small>CloudSkin</small></span></div>' +
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
      '<p class="vlm-drawer__foot">Best Seller and New set which products appear in the Best Sellers and New Arrivals collections. Hidden pulls a product from your storefront.</p>' +
    '</aside>' +
    // EDITS drawer (this session’s history)
    '<aside class="vlm-drawer" id="vlmEdits" aria-label="Your edits">' +
      '<div class="vlm-drawer__head"><div class="vlm-drawer__ttl"><b>Your edits</b><small id="vlmEditsSub">Nothing changed yet</small></div>' +
        '<button class="vlm-drawer__x" data-vlm-drawerclose aria-label="Close">' + svg('<path d="M6 6l12 12M18 6L6 18"/>', 2) + '</button></div>' +
      '<div class="vlm-drawer__tools"><button class="vlm-revertall" id="vlmRevertAll">' + svg('<path d="M9 14l-4-4 4-4"/><path d="M5 10h9a5 5 0 015 5v1"/>', 2) + ' Revert all changes</button></div>' +
      '<div class="vlm-drawer__body" id="vlmEditsList"></div>' +
    '</aside>' +
    // COMPLETE THE LOOK picker (product.html)
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
      zoomRow = el("#vlmZoom", root), zoomRange = el("#vlmZoomRange", root), zoomVal = el("#vlmZoomVal", root), zoomReset = el("#vlmZoomReset", root),
      reco = el("#vlmReco", root),
      galAdj = el("#vlmGalAdj", root), galDot = el("#vlmGalDot", root), galZoom = el("#vlmGalZoom", root),
      galZoomVal = el("#vlmGalZoomVal", root), galReset = el("#vlmGalReset", root), galDone = el("#vlmGalDone", root),
      fadeStrip = el("#vlmFade", root), fadeRange = el("#vlmFadeRange", root), fadeVal = el("#vlmFadeVal", root),
      linkbar = el("#vlmLinkbar", root), linkpop = el("#vlmLinkpop", root),
      merch = el("#vlmMerch", root),
      vsave = el("#vlmVsave", root), vstext = el(".vlm-stext", vsave),
      mapToggle = el("#vlmMapToggle", root), doneBtn = el("#vlmDone", root),
      nudge = el("#vlmNudge", root),
      revertPill = el("#vlmRevert", root), scrim = el("#vlmScrim", root),
      prodsD = el("#vlmProds", root), editsD = el("#vlmEdits", root), ctlPanel = el("#vlmCtl", root),
      prodsBtn = el("#vlmProdsBtn", root), editsBtn = el("#vlmEditsBtn", root), editsBadge = el("#vlmEditsBadge", root);

  /* ===================================================================
     STATE
     =================================================================== */
  var inEditMode = false;
  var current = null;        // currently selected editable
  var repos = null;          // reposition fn for the active panel(s)
  var galAdjReflow = null;   // reposition fn for the gallery move/zoom overlay (set by the gallery block)
  var galAdjShow = null;     // (re)show the always-on gallery move/zoom bar over the current main photo
  var pinned = null;         // .nav__item held open while its poster is being edited
  var hidetagMap = new Map();// hidden card -> floating tag element

  /* ===================================================================
     SAVE INDICATOR - the authoritative save state is driven by the
     studio_save queue (markSaving / maybeSaved / markError above);
     touchSave just nudges the bar into "Saving…" at an edit site.
     =================================================================== */
  function touchSave() { markSaving(); }

  /* ===================================================================
     SESSION CACHE (sessionStorage): drives the instant UI, the "Your edits"
     drawer and per-field revert across page navigation within one armed
     session. The DURABLE source of truth is cloudskin_content (every edit
     also queueSave()s to studio_save). Everything fails soft on quota errors.
     =================================================================== */
  var PAGE = (location.pathname.split("/").pop() || "home.html").toLowerCase();
  function store(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function loadS(k, d) { try { var r = sessionStorage.getItem(k); return r ? JSON.parse(r) : d; } catch (e) { return d; } }
  function cssq(s) { return String(s || "").replace(/"/g, '\\"'); }
  function trunc(s, n) { s = String(s == null ? "" : s); n = n || 38; return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function escH(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"; }); }

  var PSTATE = loadS("vlm-pstate", {});   // handle -> {best,isnew,trend,hidden,cat,gender,order}
  var EDITS  = loadS("vlm-edits", {});    // "type::key" -> {t,k,label,page,orig,cur,d0,d1,ts,meta}
  var ORIG   = loadS("vlm-orig", {});     // "page::key" -> first-ever original value
  var CTLMAP = loadS("vlm-ctl", {});      // handle -> [picked handles]
  var CTL_MAX = 4;                        // mirrors studio.js CTL_MAX
  var PUB = {};                           // handle -> published merch baseline (DB-merged), frozen before this session's edits, for accurate merch Revert

  function prodBy(h) { var a = window.CLOUDSKIN_PRODUCTS || []; for (var i = 0; i < a.length; i++) { if (a[i] && a[i].handle === h) return a[i]; } return null; }
  function manageable() { return (window.CLOUDSKIN_PRODUCTS || []).filter(function (p) { return p && p.handle && !/^zz-/i.test(p.handle) && p.category !== "Test"; }); }
  function baseIdx(h) { var a = window.CLOUDSKIN_PRODUCTS || []; for (var i = 0; i < a.length; i++) { if (a[i] && a[i].handle === h) return i; } return 999; }
  function thumbFor(p) {
    try { if (window.CLOUDSKIN && CLOUDSKIN.baseImageFor) return CLOUDSKIN.baseImageFor(p); } catch (e) {}
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
    var s = { best: 0, isnew: 0, trend: 0, hidden: 0, cat: "Tops", gender: "Women", order: null };
    if (p) {
      s.best = p.bestSeller ? 1 : 0; s.isnew = p.isNew ? 1 : 0;
      s.trend = (p.trending !== false) ? 1 : 0;   // Trending: ON by default; OFF only when the owner removed it (p.trending === false). Matches trendingList() in home.js + config.js.
      s.cat = catBucket(p.category);
      s.gender = (p.gender === "Men" || p.gender === "Unisex") ? p.gender : "Women";
    }
    return s;
  }
  function psSeed(h) { if (!PSTATE[h]) PSTATE[h] = seedStateOf(h); return PSTATE[h]; }
  function psSave() { store("vlm-pstate", PSTATE); }
  function merchSummary(s) {
    var bits = [s.cat || "?", s.gender === "Unisex" ? "Both" : (s.gender || "?")];
    if (s.trend) bits.push("Trending"); if (s.best) bits.push("Best Seller"); if (s.isnew) bits.push("New");
    if (s.hidden) bits.push("Hidden");
    return bits.join(" / ");
  }

  /* Editor-only badge chips were removed. Shoppers never see New / Best Seller card badges
     (shell.js renders only a Sale badge), so previewing them here made the owner think they
     were customer-facing. syncBadges now only strips any chip a previous build/session staged. */
  function syncBadges(card) {
    var media = el(".pcard__media", card); if (!media) return;
    var box = el(".vlm-cardbadges", media); if (box) box.remove();
  }
  function syncCard(card) {
    var h = card.getAttribute("data-handle"); if (!h || /^zz-/i.test(h)) return;
    var s = psSeed(h);
    card.dataset.vlmInit = "1";
    card.dataset.vlmCat = s.cat; card.dataset.vlmGender = s.gender;
    card.dataset.vlmBest = s.best ? "1" : ""; card.dataset.vlmNew = s.isnew ? "1" : "";
    card.dataset.vlmTrending = s.trend ? "1" : ""; card.dataset.vlmHidden = s.hidden ? "1" : "";
    if (inEditMode) setHidden(card, !!s.hidden);
    syncBadges(card);
  }
  function syncAllCards() { els(".pcard[data-handle]").forEach(syncCard); }
  function syncCardsFor(h) { els('.pcard[data-handle="' + cssq(h) + '"]').forEach(syncCard); }
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
    var seq = orderedHandles();
    ["#railNew", "#grid"].forEach(function (sel) {   // catalog-ordered containers only (never #railCtl: that rail is curated)
      var c = el(sel); if (!c) return;
      var cards = els(".pcard[data-handle]", c); if (cards.length < 2) return;
      // append to the cards' ACTUAL container (e.g. the .pgrid inside #grid, or the rail),
      // never the section wrapper: appending to #grid rips the cards out of .pgrid, so they
      // lose the grid columns and each card blows up to full width (image taller than the screen).
      var host = cards[0].parentElement; if (!host) return;
      var byH = {}; cards.forEach(function (k) { byH[k.getAttribute("data-handle")] = k; });
      var want = [];
      seq.forEach(function (h) { if (byH[h]) want.push(byH[h]); });
      cards.forEach(function (k) { if (want.indexOf(k) < 0) want.push(k); });
      var same = true;
      for (var i = 0; i < cards.length; i++) { if (cards[i] !== want[i]) { same = false; break; } }
      if (same) return;
      flipBatch(host, ".pcard", function () { want.forEach(function (k) { host.appendChild(k); }); });
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
  /* she dragged a card on the canvas: merge that container's new DOM order
     back into the global ranking (stable outside the container) */
  function absorbDomOrder(container) {
    if (!container || container.id === "railCtl") return;
    var domH = els(".pcard[data-handle]", container).map(function (k) { return k.getAttribute("data-handle"); })
      .filter(function (h) { return h && !/^zz-/i.test(h); });
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
    // Revert = empty-save the key(s): studio_delete does NOT exist on live, and
    // content.js fail-opens an empty value back to the built-in default.
    if (e.t === "text") { var n = findByKey(e.k); if (n) { n.textContent = e.orig; flashSaved(n); } queueSave(defObj(e.k, "")); }
    else if (e.t === "img") { var m = el('[data-content-img="' + cssq(e.k) + '"]'); if (m) applyImageEverywhere(m, e.orig); queueSave(defObj(e.k, "")); }
    else if (e.t === "bg") { var mb = el('[data-content-bg="' + cssq(e.k) + '"]'); if (mb) { mb.style.removeProperty("--vlm-bg"); flashSaved(mb); } queueSave(defObj(e.k, "")); }
    else if (e.t === "focal") {
      var m2 = el('[data-content-img="' + cssq(e.k) + '"]');
      if (m2) { if (e.desktop) { if (e.orig) m2.style.setProperty("--hero-pos-d", e.orig); else m2.style.removeProperty("--hero-pos-d"); } else m2.style.objectPosition = e.orig || ""; }
      queueSave(defObj(e.desktop ? "home.hero.image.pos.desktop" : (e.k + ".pos"), ""));
    }
    else if (e.t === "zoom") { var mz = el('[data-content-img="' + cssq(e.k) + '"]'); if (mz) applyElZoom(mz, e.orig, mz.style.objectPosition); queueSave(defObj(e.k + ".zoom", e.orig || "")); }
    else if (e.t === "fade") {
      var mf = el('[data-content-fade="' + cssq(e.k) + '"]');
      if (mf) {
        if (e.orig == null || e.orig === "") mf.style.removeProperty("--hero-fade-mult");
        else mf.style.setProperty("--hero-fade-mult", (parseFloat(e.orig) / 50).toString());
        flashSaved(mf);
      }
      queueSave(defObj(e.k, e.orig == null ? "" : e.orig));   // fade uses the bare key (no .pos), empty -> CSS default
    }
    else if (e.t === "link") { var a = el('[data-content-link="' + cssq(e.k) + '"]'); if (a) a.setAttribute("href", hrefForSlug(e.orig)); queueSave(defObj(e.k, "")); }
    else if (e.t === "merch") {
      var h = (e.meta && e.meta.h) || e.k;
      // Revert to the PUBLISHED baseline (DB-merged state frozen at panel-open), NOT the curate.js
      // code default. Restore the in-session state from PUB, then SAVE the explicit published flag
      // values so a shopper reload reproduces exactly what was published. An empty-save would fall
      // back to the curate default, which only equals the published state when nothing was ever set.
      var pub = PUB[h] || seedStateOf(h);
      var keep = (PSTATE[h] || {}).order != null ? PSTATE[h].order : null;
      PSTATE[h] = { best: pub.best, isnew: pub.isnew, trend: pub.trend, hidden: pub.hidden, cat: pub.cat, gender: pub.gender, order: keep };
      psSave();
      syncCardsFor(h);
      applyTrendingLive(h);   // mirror published Trending onto the live product + re-render the rail
      if (merch.classList.contains("on") && merch.__card && merch.__card.getAttribute("data-handle") === h) syncMerchUI(merch.__card);
      if (prodsD.classList.contains("on")) renderProds();
      var snap = window.CLOUDSKIN_CONTENT_SNAPSHOT || {};
      var mo = {};
      mo["product." + h + ".bestSeller"] = pub.best ? "1" : "0";
      mo["product." + h + ".isNew"]      = pub.isnew ? "1" : "0";
      mo["product." + h + ".trending"]   = pub.trend ? "1" : "0";
      mo["product." + h + ".hidden"]     = pub.hidden ? "1" : "0";
      mo["product." + h + ".gender"]     = pub.gender;
      // Category is bucketed (Tops/Bottoms/Dresses); replay the published category key only if one
      // was actually published, else clear it so the product keeps its curate category.
      var catKey = "product." + h + ".category";
      mo[catKey] = (snap[catKey] != null && String(snap[catKey]).trim() !== "") ? String(snap[catKey]) : "";
      queueSave(mo);
    }
    else if (e.t === "order") {
      manageable().forEach(function (p) { if (PSTATE[p.handle]) PSTATE[p.handle].order = null; });
      psSave(); applyOrderToDOM();
      if (prodsD.classList.contains("on")) renderProds();
      var oo = {}; manageable().forEach(function (p) { oo["product." + p.handle + ".order"] = ""; }); queueSave(oo);
    }
    else if (e.t === "ctl") {
      var ch = e.meta && e.meta.h;
      if (ch) { delete CTLMAP[ch]; store("vlm-ctl", CTLMAP); applyCtl(); if (ctlPanel.classList.contains("on")) renderCtl(); queueSave(defObj("product." + ch + ".completeLook", "")); }
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
     the way content.js re-applies owner overrides). All writes are guarded,
     so the PDP MutationObserver settles instead of looping. */
  function reapplyEdits() {
    Object.keys(EDITS).forEach(function (id) {
      var e = EDITS[id];
      if (e.page !== PAGE && ["text", "img", "focal", "zoom", "link", "bg", "fade"].indexOf(e.t) >= 0) return;
      if (e.t === "text") { var n = findByKey(e.k); if (n && !n.classList.contains("vlm-editing") && n.textContent !== e.cur) n.textContent = e.cur; }
      else if (e.t === "img" && !(e.meta && e.meta.big)) { var m = el('[data-content-img="' + cssq(e.k) + '"]'); if (m && m.getAttribute("src") !== e.cur) applyImageEverywhere(m, e.cur); }
      else if (e.t === "bg") { var mb = el('[data-content-bg="' + cssq(e.k) + '"]'); if (mb && e.cur) applyBg(mb, e.cur); }
      else if (e.t === "focal") { var m2 = el('[data-content-img="' + cssq(e.k) + '"]'); if (m2 && m2.style.objectPosition !== e.cur) m2.style.objectPosition = e.cur; }
      else if (e.t === "zoom") { var mz = el('[data-content-img="' + cssq(e.k) + '"]'); if (mz) applyElZoom(mz, e.cur, mz.style.objectPosition); }
      else if (e.t === "fade") { var mf = el('[data-content-fade="' + cssq(e.k) + '"]'); if (mf && e.cur !== "" && e.cur != null) mf.style.setProperty("--hero-fade-mult", (parseFloat(e.cur) / 50).toString()); }
      else if (e.t === "link") { var a = el('[data-content-link="' + cssq(e.k) + '"]'); if (a && a.getAttribute("href") !== e.cur) a.setAttribute("href", e.cur); }
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
     (same reason the #pdpMain observer debounces with a timer). */
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
      if (galAdjReflow) try { galAdjReflow(); } catch (e) {}
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
  /* In edit mode every picture must be visible so she can click it to edit, without
     scrolling each one into view. Native loading="lazy" defers below-the-fold images
     (and never fires at all in embedded webviews that throttle intersection), which
     would leave whole sections looking pictureless. So the moment we are editing, wake
     every lazy image to eager. Idempotent + cheap: only still-lazy images are touched. */
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
    els(".pcard:not([data-vlm-ed])").forEach(function (n) { mark(n, "card", "Product", false); });
    tagPDP();
    injectCtlAffordance();
    tagGallery();
    freeCoveredImages();
    // re-apply any staged hidden state on freshly-tagged cards
    if (inEditMode) { els(".pcard[data-vlm-hidden='1']").forEach(function (c) { setHidden(c, true); }); wakeLazyImages(); }
  }

  /* PDP is rendered by product.js with no data-content anchors, so we tag its copy at
     runtime (assigning the same product.<h>.* / pdp.* keys studio.js uses) so the product
     page is ALSO fully click-to-edit, including the small subtexts. */
  function tagPDP() {
    if (!el("#pdp")) return;
    var handle = "";
    try { handle = new URLSearchParams(location.search).get("handle") || ""; } catch (e) {}
    var K = "product." + (handle || "item") + ".";
    function tagOne(node, key, shared) {
      if (!node || node.getAttribute("data-vlm-ed")) return;
      if (!node.getAttribute("data-content")) node.setAttribute("data-content", key);
      if (shared) node.setAttribute("data-vlm-shared", "1");   // feature 5: "Applies to every product page"
      var c = classifyText(node); mark(node, "text", c.label, c.multiline);
    }
    // Product title is intentionally NOT editable here: Shopify is the checkout source of truth
    // for the title, so an owner override would desync the storefront copy from checkout. (The old
    // .buybox__style tag is also dropped - the PDP never renders that element; it was dead code.)
    tagOne(el(".buybox__desc"), K + "desc");
    els(".buybox__bullets li").forEach(function (li, i) { tagOne(li, K + "features." + i); });
    tagOne(el(".buybox__ship"), "pdp.shipline", true);
    // accordion (fixed render order in product.js): [0] Fabric & Care, [1] Fit, [2] Shipping & Returns.
    // Shipping is SHARED across products; tag it by INDEX (== 2), not the button label, so it maps to
    // pdp.shipping in EVERY UI language. (A label regex only knew EN/GR and phantomed other languages.)
    // This also matches applyOverrides, which addresses the same three panels by index.
    els(".acc__item").forEach(function (item, i) {
      var d = el(".acc__panel > div", item);
      if (!d) return;
      var shared = (i === 2);
      tagOne(d, shared ? "pdp.shipping" : (K + "acc." + i), shared);
    });
    // The "Complete the Look" and "Details" section headings are intentionally NOT tagged: they are
    // shared, i18n-managed titles professionally translated into 11 languages. An owner override is
    // applied AFTER i18n, so it would leak one language's text to shoppers in every other language.
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
    imgtools.classList.remove("on", "focusing", "uploading", "vlm-repos", "has-fade", "has-zoom");
    linkbar.classList.remove("on");
    merch.classList.remove("on");
    hint.classList.remove("on");
    closeGalAdj();
    doc.documentElement.classList.remove("vlm-adjusting");
    if (pinned) { pinned.classList.remove("vlm-pin-open"); pinned = null; }
    repos = null;
  }
  function select(node) {
    if (current === node) return;
    clearSel();
    current = node;
    hideHover();
    // editing a mega-menu poster: hold that menu open (the hover is lost the
    // moment the pointer moves onto the editor overlay, which would hide the
    // poster under an open editor)
    var mega = node.closest && node.closest(".mega");
    if (mega) { var ni = mega.closest(".nav__item"); if (ni) { ni.classList.add("vlm-pin-open"); pinned = ni; } }
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
    if (window.MutationObserver) {   // feature 8: live element-stripper (defense-in-depth)
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
    if (node.getAttribute("data-vlm-shared") === "1") hintSubs.push("Applies to every product page");   // feature 5: shared PDP fields
    hintSubs.push("Leave blank to keep the original");                                                    // feature 6: empty-state
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
        // emptied out: fail-open like content.js (a blank never sticks) -
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

  /* ---- per-photo zoom + recommended-size helpers (Studio focal control) ----
     Zoom scales a photo INSIDE its object-fit:cover frame toward the focal point (--szo),
     mirroring content.js applyFocalZoom + shell.js C.applyPhotoFocal, so the editor preview
     matches exactly what the public site paints. Slider unit is percent (100 = scale 1). */
  function applyElZoom(node, scale, pos) {
    if (!node) return;
    var z = parseFloat(scale);
    if (!isNaN(z) && z > 1.001) {
      node.classList.add("vlm-zoomed");
      node.style.setProperty("--sz", z);
      var o = pos || node.style.objectPosition;
      if (o) node.style.setProperty("--szo", o);
    } else {
      node.classList.remove("vlm-zoomed");
      node.style.removeProperty("--sz"); node.style.removeProperty("--szo");
    }
  }
  function readZoom(node) {   // current zoom scale on an element (1 when none)
    var z = node ? parseFloat(node.style.getPropertyValue("--sz")) : NaN;
    if (isNaN(z) && node) { try { z = parseFloat(getComputedStyle(node).getPropertyValue("--sz")); } catch (e) {} }
    return (!isNaN(z) && z > 1) ? z : 1;
  }
  var RECO = {
    "home.hero.image": [2560, 1440], "home.editorial.image": [2000, 1400],
    "home.collbanner.image": [2000, 1200], "about.hero.image": [2000, 1200],
    "about.ethos.image": [1200, 1500], "home.cat.tile1.image": [1200, 1600],
    "home.cat.tile2.image": [1200, 1600], "home.cat.tile3.image": [1200, 1600],
    "about.camp.img1": [1200, 1600], "about.camp.img2": [1200, 1600], "about.camp.img3": [1200, 1600],
    "nav.women.feature.image": [1080, 1350], "nav.men.feature.image": [1080, 1350],
    "home.newsletter.bg": [2000, 1200]
  };
  function recoFor(key, node) {
    var wh = RECO[key];
    if (!wh) {
      try {
        var r = node.getBoundingClientRect(), ar = (r.width && r.height) ? r.width / r.height : 0.75;
        var lng = ar >= 1 ? 2000 : 1600;
        wh = ar >= 1 ? [lng, Math.round(lng / ar)] : [Math.round(lng * ar), lng];
      } catch (e) { wh = [1600, 2000]; }
    }
    return "Recommended " + wh[0] + " x " + wh[1] + " px";
  }

  /* ===================================================================
     IMAGE EDITING  (Replace via local FileReader + full apply rule; focal)
     =================================================================== */
  function applyImageEverywhere(img, url) {
    img.src = url; img.removeAttribute("srcset");
    var pic = img.closest("picture");
    if (pic) els("source", pic).forEach(function (s) { s.srcset = url; });
  }
  // CSS-background picture (e.g. the newsletter band): swap ONLY the --vlm-bg layer; the
  // darkening gradient + framing stay in main.css. Empty url clears back to the CSS default.
  function applyBg(el, url) {
    if (url) el.style.setProperty("--vlm-bg", 'url("' + String(url).replace(/["\\]/g, encodeURIComponent) + '")');
    else el.style.removeProperty("--vlm-bg");
  }
  function openImageTools(node) {
    var linkA = node.closest("[data-content-link]");
    var linkKey = linkA ? linkA.getAttribute("data-content-link") : "";
    imgtools.__el = node; imgtools.__linkA = linkA;
    var isBg = node.hasAttribute("data-content-bg");
    el("[data-vlm-imglink]", imgtools).style.display = (linkA && !isBg) ? "" : "none";
    el("[data-vlm-adjust]", imgtools).style.display = isBg ? "none" : "";   // background framing lives in CSS, no focal puck
    imgtools.classList.remove("focusing", "uploading");
    if (node.__vlmFocalOrig == null) node.__vlmFocalOrig = isHeroDesktop(node) ? (node.style.getPropertyValue("--hero-pos-d") || "50% 0%") : (node.style.objectPosition || "50% 50%");   // freeze pre-edit focus for revert (hero uses its desktop var on wide viewports)
    var r = node.getBoundingClientRect();
    placeImgOverlay(r); imgtools.classList.add("on");
    showSelRing(node);
    // seed focal to the current object-position: inline first, else the COMPUTED CSS default so the
    // puck appears where the image is actually framed (the hero default is "center 18%", set in CSS).
    var op = isHeroDesktop(node) ? (node.style.getPropertyValue("--hero-pos-d") || "") : (node.style.objectPosition || "");
    if (!op) { try { op = getComputedStyle(node).objectPosition || ""; } catch (e) {} }
    var m = /(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/.exec(op);
    focal.style.left = (m ? m[1] : 50) + "%"; focal.style.top = (m ? m[2] : 50) + "%";

    // FULL-BLEED (object-fit:cover) images: repositioning is the whole point, so surface the focal
    // puck immediately with a clear "Drag the dot to reposition" hint, rather than hiding it behind
    // the old "Adjust focus" toggle Larissa never found. Non-cover images keep the click-to-reveal
    // puck (Adjust focus) unchanged. Background pictures are framed in CSS -> no puck.
    var cover = false;
    if (!isBg) { try { cover = getComputedStyle(node).objectFit === "cover"; } catch (e) {} }
    imgtools.classList.toggle("vlm-repos", cover);

    // ZOOM + RECOMMENDED SIZE. Zoom is shown for cover photos (framing applies); a background
    // picture is framed in CSS, so it gets the size hint but no zoom. Seed the slider from the
    // photo's current zoom so re-opening a framed photo shows its real value.
    var showZoom = cover && !isBg;
    imgtools.classList.toggle("has-zoom", showZoom);
    if (showZoom) {
      if (node.__vlmZoomOrig == null) node.__vlmZoomOrig = readZoom(node);   // freeze pre-edit zoom for revert
      var zpct = Math.round(readZoom(node) * 100);
      zoomRange.value = String(zpct); zoomVal.textContent = zpct + "%";
    }
    reco.textContent = recoFor(isBg ? node.getAttribute("data-content-bg") : node.getAttribute("data-content-img"), node);

    // HERO fade: when the selected image's section carries a fade target (data-content-fade), show a
    // slider to dial the darkening scrim strength (0-100%, 50% == the built-in default). Seeds from
    // the live value already applied to --hero-fade-mult; empty (unset) reads as the neutral 50%.
    var fadeHost = isBg ? null : (node.closest ? node.closest("[data-content-fade]") : null);
    imgtools.__fadeHost = fadeHost;
    imgtools.__fadeKey = fadeHost ? fadeHost.getAttribute("data-content-fade") : "";
    imgtools.classList.toggle("has-fade", !!fadeHost);
    if (fadeHost) {
      imgtools.__fadeOrig = fadeHost.style.getPropertyValue("--hero-fade-mult");   // '' when unset (default look)
      var mult = parseFloat(imgtools.__fadeOrig);
      var pct = isNaN(mult) ? 50 : clamp(Math.round(mult * 50), 0, 100);
      fadeRange.value = String(pct); fadeVal.textContent = pct + "%";
    }

    repos = function () { var rr = node.getBoundingClientRect(); placeImgOverlay(rr); placeBox(selRing, rr, 3); };
  }
  // Replace a general SITE image [data-content-img]: resize client-side, upload to
  // Supabase Storage via studio-upload (dest:'site'), then studio_save {key: url}.
  function doSiteImageReplace(img, file) {
    var isBg = img.hasAttribute("data-content-bg");
    var key = isBg ? img.getAttribute("data-content-bg") : img.getAttribute("data-content-img"); if (!key) return;
    var apply = isBg ? function (u) { applyBg(img, u); } : function (u) { applyImageEverywhere(img, u); };
    var editType = isBg ? "bg" : "img";
    var orig = isBg ? (img.style.getPropertyValue("--vlm-bg") || "") : (img.getAttribute("src") || "");
    var origFirst = origFor(editType + "::" + key, orig);   // freeze the first-ever original for revert
    imgtools.classList.remove("focusing"); imgtools.classList.add("uploading");
    var bar = el(".vlm-prog i", imgtools); if (bar) bar.style.width = "10%";
    resizeImage(file, 2560, function (dataUrl) {
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
  // The home hero can be framed independently per viewport: on desktop widths the puck edits a SEPARATE
  // home.hero.image.pos.desktop key (applied by content.js as --hero-pos-d, which main.css reads in its
  // >=721px !important rule); on mobile it edits the base home.hero.image.pos. Other slots are width-agnostic.
  function isHeroDesktop(img) {
    try { return !!img && img.getAttribute("data-content-img") === "home.hero.image" && matchMedia("(min-width:721px)").matches; }
    catch (e) { return false; }
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
      var op = x.toFixed(1) + "% " + y.toFixed(1) + "%";
      if (isHeroDesktop(imgtools.__el)) {
        imgtools.__el.style.setProperty("--hero-pos-d", op);   // desktop hero framing rides the CSS var (main.css >=721px !important rule)
      } else {
        imgtools.__el.style.objectPosition = op;
        if (imgtools.__el.classList.contains("vlm-zoomed")) imgtools.__el.style.setProperty("--szo", op);   // keep the zoom origin on the focal
      }
    });
    focal.addEventListener("pointerup", function () {
      if (!dragging) return;
      dragging = false;
      var img = imgtools.__el;
      if (img) {
        var key = img.getAttribute("data-content-img");
        var hd = isHeroDesktop(img);
        var pos = hd ? (img.style.getPropertyValue("--hero-pos-d") || "50% 0%") : (img.style.objectPosition || "50% 50%");
        if (key) {
          queueSave(defObj(hd ? "home.hero.image.pos.desktop" : (key + ".pos"), pos));
          logEdit({ t: "focal", k: key, desktop: hd, label: hd ? "Desktop focus" : "Focus", page: PAGE, orig: img.__vlmFocalOrig || (hd ? "50% 0%" : "50% 50%"), cur: pos });
        }
      }
      touchSave();
    });
  })();

  /* ---- ZOOM slider (System A): live preview on input, save <key>.zoom on release ---- */
  (function () {
    function pct() { return clamp(parseInt(zoomRange.value, 10) || 100, 100, 250); }
    function origStr(img) { return (img && img.__vlmZoomOrig > 1) ? String(img.__vlmZoomOrig) : ""; }
    zoomRange.addEventListener("pointerdown", function () { doc.documentElement.classList.add("vlm-adjusting"); });
    zoomRange.addEventListener("input", function () {
      var img = imgtools.__el; if (!img) return;
      var p = pct(); zoomVal.textContent = p + "%";
      applyElZoom(img, p / 100, img.style.objectPosition);
    });
    function commit() {
      doc.documentElement.classList.remove("vlm-adjusting");
      var img = imgtools.__el; if (!img) return;
      var key = img.getAttribute("data-content-img"); if (!key) return;
      var scale = pct() / 100;
      var val = scale > 1.001 ? String(scale) : "";   // 100% -> empty (CSS default; revert-safe)
      queueSave(defObj(key + ".zoom", val));
      logEdit({ t: "zoom", k: key, label: "Zoom", page: PAGE, orig: origStr(img), cur: val });
      touchSave();
    }
    zoomRange.addEventListener("change", commit);
    zoomRange.addEventListener("pointerup", function () { doc.documentElement.classList.remove("vlm-adjusting"); });
    zoomReset.addEventListener("click", function () {
      var img = imgtools.__el; if (!img) return;
      zoomRange.value = "100"; zoomVal.textContent = "100%";
      applyElZoom(img, 1);
      var key = img.getAttribute("data-content-img"); if (!key) return;
      queueSave(defObj(key + ".zoom", ""));
      logEdit({ t: "zoom", k: key, label: "Zoom", page: PAGE, orig: origStr(img), cur: "" });
      touchSave();
    });
  })();

  /* ===================================================================
     GALLERY EDITING  (PDP sub-pictures: drag to reorder, set main photo,
     replace, add). Previews the net-new per-colour photo management.
     Operates on product.js's live #thumbs DOM; save is simulated here.
     =================================================================== */
  var GAL_MAX = 12;   // mirrors the Studio's MAX_PHOTOS cap (studio.js L26)
  var galFile = doc.createElement("input");
  galFile.type = "file"; galFile.accept = "image/*"; galFile.multiple = true; galFile.style.display = "none";
  root.appendChild(galFile);
  var galTarget = null;   // { mode:'replace'|'add', btn | thumbs }

  function galThumbs() { return el("#thumbs"); }
  function realThumbs(t) { return els("button:not(.vlm-add)", t); }
  function galAxis(t) {
    var b = realThumbs(t); if (b.length < 2) return "y";
    var a = b[0].getBoundingClientRect(), c = b[1].getBoundingClientRect();
    return Math.abs(c.left - a.left) > Math.abs(c.top - a.top) ? "x" : "y";
  }
  function galSlug(s) { return String(s || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
  function galHandle() { try { return new URLSearchParams(location.search).get("handle") || ""; } catch (e) { return ""; } }
  function colourName() { return (el("#colorName") && el("#colorName").textContent.trim()) || ""; }
  // Does THIS colour have the owner's own photo set, or is the gallery just the catalogue default?
  function colourHasOwnPhotos() {
    var snap = window.CLOUDSKIN_CONTENT_SNAPSHOT || {};
    var h = galHandle(); if (!h) return true;
    var k = "product." + h + ".images." + galSlug(colourName());
    var flat = "product." + h + ".images";
    return !!(String(snap[k] || "").trim() || String(snap[flat] || "").trim());
  }
  function galleryIsOwn(t) {
    if (colourHasOwnPhotos()) return true;
    // a photo she just added / replaced (data URL) or a real studio upload counts as hers
    return realThumbs(t).some(function (b) { var im = el("img", b); var s = im ? im.src : ""; return /^data:/.test(s) || /studio-content/.test(s); });
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
  // the Studio caps photos at GAL_MAX per colour - mirror it on the Add tile
  function updateAddCap(t) {
    var add = el(".vlm-add", t); if (!add) return;
    var full = realThumbs(t).length >= GAL_MAX;
    add.disabled = full;
    add.title = full ? "Maximum of " + GAL_MAX + " photos per colour" : "";
  }
  function tagGallery() {
    if (!el("#pdp")) return;
    var t = galThumbs(); if (!t) return;
    seedGalFocal();   // load each photo's saved focal so a reorder/replace keeps it (System B)
    ensureGalChrome(t);
    realThumbs(t).forEach(decorateThumb);
    keepAddLast(t);
    markMainState(realThumbs(t));
    updateAddCap(t);
    t.parentNode.classList.toggle("vlm-gal-nophoto", !galleryIsOwn(t));
    updateGalCap(t);
    if (galAdjShow) galAdjShow();   // keep the always-on move/zoom bar on the current main photo
  }
  // per-colour photo key: product.<handle>.images.<colourSlug> (flat when no colour),
  // exactly as studio.js imagesKey() writes and content.js mergeStudioImages() reads.
  function galImagesKey() {
    var h = galHandle(); if (!h) return "";
    var slug = galSlug(colourName());
    return "product." + h + ".images" + (slug ? "." + slug : "");
  }
  /* per-photo focal for the CURRENT product gallery: url -> {pos, zoom} (System B). Seeded from the
     owner's saved pipe-delimited images cells so a reorder / replace / make-main PRESERVES each photo's
     framing instead of wiping it. Without this, persistGallery would re-save bare `img.src` values (the
     parsed cells drop the "|pos|zoom" suffix on read), silently discarding any per-photo focal. */
  var galFocalMap = {};
  function seedGalFocal() {
    galFocalMap = {};
    var C = window.CLOUDSKIN || {};
    var live = window.CLOUDSKIN_CONTENT_LIVE || window.CLOUDSKIN_CONTENT_SNAPSHOT || {};
    var h = galHandle(); if (!h || !(C && C.parseStudioCell)) return;
    var flat = "product." + h + ".images", pre = flat + ".";
    Object.keys(live).forEach(function (k) {
      if (k !== flat && k.indexOf(pre) !== 0) return;
      var f = C.parseStudioCell(live[k]).focal;
      Object.keys(f).forEach(function (u) { galFocalMap[u] = f[u]; });
    });
  }
  // serialize ONE photo to its stored cell: "URL", "URL|pos", or "URL|pos|zoom". Bare URL = CSS default
  // (focal binds to the URL so it survives reorder). Mirrors shell.js C.parseStudioCell in reverse. PURE.
  function galCell(url) {
    var f = galFocalMap[url]; if (!f) return url;
    var pos = (f.pos || "").trim(), z = (f.zoom && f.zoom > 1.001) ? f.zoom : 0;
    if (!pos && !z) return url;
    return url + "|" + (pos || "50% 50%") + (z ? "|" + z : "");
  }
  // Safe cleanup for the (currently unstyled / un-triggered) per-photo focal overlay. Defined so the core
  // clearSel() path never throws on its closeGalAdj() call. The interactive dot-drag overlay itself is not
  // yet wired (no CSS, no trigger) - see handoff; this keeps the editor stable in the meantime.
  function closeGalAdj() { if (galAdj) galAdj.classList.remove("on"); }
  // Persist the current thumbnail order, KEEPING each photo's per-colour focal (URL|pos|zoom). Skipped
  // while any thumb is still a data: URL (an upload is in flight); the post-upload commit re-runs this
  // with the real public URLs, so the stored list is always real Storage URLs + their framing.
  function persistGallery(t) {
    var key = galImagesKey(); if (!key) return;
    var urls = realThumbs(t).map(function (b) { var im = el("img", b); return im ? im.src : ""; }).filter(Boolean);
    if (urls.some(function (u) { return /^data:/.test(u); })) return;
    queueSave(defObj(key, urls.map(galCell).join("\n")));
  }
  function commitGallery(t, save) {
    var btns = realThumbs(t);
    btns.forEach(function (b, i) { b.classList.toggle("on", i === 0); });
    markMainState(btns);
    var first = btns[0] && el("img", btns[0]);
    var gi = el("#galImg"); if (first && gi) gi.src = first.src;
    keepAddLast(t);
    updateAddCap(t);
    t.parentNode.classList.toggle("vlm-gal-nophoto", !galleryIsOwn(t));
    updateGalCap(t);
    if (save) { touchSave(); flashSaved(el("#gallery")); persistGallery(t); }
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
      resizeImage(f, 2560, function (dataUrl) {
        if (!dataUrl) { showUploadError(g.btn, "could not read image"); return; }
        if (im) { im.src = dataUrl; im.removeAttribute("srcset"); }   // instant preview
        g.btn.setAttribute("data-vlm-pending", "1");
        g.btn.classList.add("vlm-imgfade"); setTimeout(function () { g.btn.classList.remove("vlm-imgfade"); }, 600);
        commitGallery(g.btn.parentNode, true);                        // UI only (data: URL -> save skipped)
        trackedUpload(h, f.name, dataUrl).then(function (url) {       // NO dest -> product photo (product-media)
          if (im) im.src = url;
          g.btn.removeAttribute("data-vlm-pending");
          commitGallery(g.btn.parentNode, true);                      // now persists the real Storage URL
        }).catch(function (e) { g.btn.removeAttribute("data-vlm-pending"); showUploadError(g.btn, (e && e.message) || "upload failed"); });
      });
    } else if (g.mode === "add" && g.thumbs) {
      // several at once, like the Studio's "+ Add photos", capped at GAL_MAX
      var room = GAL_MAX - realThumbs(g.thumbs).length;
      files.slice(0, Math.max(0, room)).forEach(function (f2) {
        resizeImage(f2, 2560, function (dataUrl) {
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

  // one delegated CAPTURE click handler, so we run before product.js's own thumb handler
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
    var thumb = e.target.closest("#thumbs button[data-vlm-gal]");
    if (thumb) {   // preview this image as main + block product.js's stale-index handler
      e.stopPropagation();
      var im = el("img", thumb), gi = el("#galImg"); if (im && gi) gi.src = im.src;
      realThumbs(t).forEach(function (b) { b.classList.remove("on"); }); thumb.classList.add("on");
      if (galAdjShow) galAdjShow();   // re-point the move/zoom bar at the newly-shown photo
    }
  }, true);

  // pointer-drag reorder (delegated, capture; touch + mouse)
  (function () {
    var drag = null;
    doc.addEventListener("pointerdown", function (e) {
      if (!inEditMode) return;
      var btn = e.target.closest("#thumbs button[data-vlm-gal]"); if (!btn) return;
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
     PER-PHOTO MOVE + ZOOM  (product gallery main image, System B).
     In edit mode the main product photo ALWAYS carries a slim control bar
     (docked at its bottom) + a draggable dot - no need to click the photo:
       - drag the dot  = MOVE the photo inside its frame (object-position)
       - the slider    = ZOOM in/out (scale toward the dot)
     Both preview live. "Save" writes the framing per photo, per colour
     (url|pos|zoom via persistGallery); "Reset" returns to the default.
     Clicking the photo itself does NOTHING - the shopper lightbox-zoom is
     disabled while editing, so a stray tap can never zoom the picture.
     =================================================================== */
  (function () {
    var img = null, url = "", thumbs = null, dragging = false;
    var galHint = el(".vlm-galadj__hint", galAdj);
    // The photos are cropped to the frame's 3:4, so at 100% there is nothing to pan - moving only
    // has room once zoomed in. Guide that instead of leaving the owner dragging a dot that does nothing.
    function updateHint() {
      if (!galHint) return;
      galHint.textContent = (img && readZoom(img) > 1.001) ? "Drag the dot to move" : "Zoom in, then drag to place";
      galAdj.classList.toggle("vlm-canpan", !!(img && readZoom(img) > 1.001));
    }
    function galMainBox() { var gi = el("#galImg"); return gi ? (gi.closest("#galMain") || gi.parentNode) : null; }
    function place() {
      var m = galMainBox(); if (!m) return;
      var r = m.getBoundingClientRect();
      galAdj.style.left = r.left + "px"; galAdj.style.top = r.top + "px";
      galAdj.style.width = r.width + "px"; galAdj.style.height = r.height + "px";
    }
    function parsePos(s) {
      var m = /(-?[\d.]+)%\s+(-?[\d.]+)%/.exec(s || "");
      return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 50, y: 30 };
    }
    function seedDot() {
      if (!img) return;
      var p = parsePos(img.style.objectPosition || getComputedStyle(img).objectPosition);
      galDot.style.left = clamp(p.x, 0, 100) + "%"; galDot.style.top = clamp(p.y, 0, 100) + "%";
    }
    // Always-on: (re)show the bar over the CURRENT main photo. Called from tagGallery (edit mode + PDP)
    // and after any photo/colour switch, so the controls are available without clicking the photo.
    galAdjShow = function () {
      var gi = el("#galImg");
      if (!gi || !inEditMode) { galAdj.classList.remove("on"); img = null; return; }
      img = gi; url = gi.src; thumbs = galThumbs();
      place(); seedDot();
      var zp = Math.round(readZoom(img) * 100);
      galZoom.value = String(zp); galZoomVal.textContent = zp + "%";
      galAdj.classList.add("on");
      updateHint();
    };
    galAdjReflow = function () { if (galAdj.classList.contains("on")) place(); };

    // A click on the product photo does NOTHING while editing: block product.js's lightbox-zoom
    // (galMain.classList.toggle('zoom')) AND the editor's clearSel. Zoom is the slider's job only.
    doc.addEventListener("click", function (e) {
      if (!inEditMode) return;
      if (e.target.closest("#galMain")) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);

    // DRAG the dot -> MOVE the photo (live object-position; when zoomed, also the zoom origin)
    galDot.addEventListener("pointerdown", function (e) { if (!img) return; dragging = true; try { galDot.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault(); e.stopPropagation(); });
    galDot.addEventListener("pointermove", function (e) {
      if (!dragging || !img) return;
      var box = galAdj.getBoundingClientRect(); if (!box.width) return;
      var x = clamp((e.clientX - box.left) / box.width * 100, 0, 100);
      var y = clamp((e.clientY - box.top) / box.height * 100, 0, 100);
      galDot.style.left = x + "%"; galDot.style.top = y + "%";
      var op = x.toFixed(1) + "% " + y.toFixed(1) + "%";
      img.style.objectPosition = op;
      if (img.classList.contains("vlm-zoomed")) img.style.setProperty("--szo", op);
    });
    galDot.addEventListener("pointerup", function (e) { dragging = false; try { galDot.releasePointerCapture(e.pointerId); } catch (_) {} });

    // ZOOM slider -> live scale (transition is killed while dragging so it tracks the slider 1:1)
    galZoom.addEventListener("pointerdown", function () { doc.documentElement.classList.add("vlm-adjusting"); });
    galZoom.addEventListener("pointerup", function () { doc.documentElement.classList.remove("vlm-adjusting"); });
    galZoom.addEventListener("input", function () {
      if (!img) return;
      var p = clamp(parseInt(galZoom.value, 10) || 100, 100, 250);
      galZoomVal.textContent = p + "%";
      applyElZoom(img, p / 100, img.style.objectPosition || getComputedStyle(img).objectPosition);
      updateHint();
    });
    galReset.addEventListener("click", function () {
      if (!img) return;
      galZoom.value = "100"; galZoomVal.textContent = "100%";
      applyElZoom(img, 1);
      img.style.objectPosition = "";   // back to CSS default framing
      seedDot(); updateHint();
    });

    // SAVE: bind this photo's framing into its cell (per colour) + persist to studio_save
    galDone.addEventListener("click", function () {
      if (!img) return;
      var t = thumbs || galThumbs(); if (!t) return;
      var pos = (img.style.objectPosition || "").trim();
      var z = readZoom(img);
      var f = {};
      if (pos && pos !== "50% 50%") f.pos = pos;
      if (z > 1.001) f.zoom = z;
      if (f.pos || f.zoom) galFocalMap[url] = f; else delete galFocalMap[url];
      persistGallery(t);                 // writes url|pos|zoom cell (skipped only while a data: upload is in flight)
      touchSave(); flashSaved(el("#gallery"));
    });
  })();

  /* ===================================================================
     LINK EDITING  (friendly dropdown; friendly names only)
     =================================================================== */
  function slugFromHref(href) {
    var m = /[?&]c=([a-z]+)/.exec(href || ""); if (m) return m[1];
    if (/about\.html/.test(href || "")) return "__about";
    if (/(^|\/)home\.html/.test(href || "")) return "__home";
    return "";
  }
  function hrefForSlug(slug) {
    if (slug === "__about") return "about.html";
    if (slug === "__home") return "home.html";
    return "collection.html?c=" + slug;
  }
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
    LINK_GROUPS.forEach(function (g) {
      html += '<div class="vlm-lpgroup">' + g[0] + '</div>';
      g[1].forEach(function (o) {
        html += '<div class="vlm-lpopt' + (o[1] === currentSlug ? " on" : "") + '" data-slug="' + o[1] + '" data-name="' + o[0] + '">' + o[0] +
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
     MERCHANDISING PANEL
     =================================================================== */
  function handleTitle(handle) {
    var p = (window.CLOUDSKIN_PRODUCTS || []).filter(function (x) { return x.handle === handle; })[0];
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
  // same category bucketing the Studio uses (studio.js ctrlCategoryDef)
  function catBucket(c) {
    if (c === "Dresses") return "Dresses";
    if (["Skirts", "Shorts", "Bottoms", "Leggings", "Pants"].indexOf(c) >= 0) return "Bottoms";
    return "Tops";
  }
  function openMerch(card) {
    var h = card.getAttribute("data-handle");
    if (h && PUB[h] == null) PUB[h] = seedStateOf(h);   // freeze the published (DB-merged) baseline BEFORE any edit, so Revert restores it (not the curate.js default)
    psSeed(h); syncCard(card);   // PSTATE is the single source of truth: mirror it onto the card + badges
    el(".vlm-merch__title", merch).textContent = (el(".pcard__name", card) && el(".pcard__name", card).textContent) || handleTitle(h) || "Product";
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
    var kids = els(".pcard", container);
    var first = new Map(kids.map(function (k) { return [k, k.getBoundingClientRect()]; }));
    container.insertBefore(card, ref);
    els(".pcard", container).forEach(function (k) {
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
    var sibs = els(".pcard", container), i = sibs.indexOf(card);
    if (dir < 0 && i > 0) flipMove(container, card, sibs[i - 1]);
    else if (dir > 0 && i < sibs.length - 1) flipMove(container, card, sibs[i + 1].nextElementSibling);
    else return;
    absorbDomOrder(container);   // fold the new on-canvas order into the global ranking (+ log)
    if (repos) repos(); positionHidetags(); touchSave();
  }

  /* ===================================================================
     DIRECT CARD DRAG-REORDER (on-canvas): press a product and drag it
     left / right to reorder it in place - no need to open its options
     first. A plain click (no drag past threshold) still opens the panel.
     Desktop pointer only; touch keeps the panel grip + arrows (so a finger
     swipe still scrolls the page / rail instead of being trapped as a drag).
     =================================================================== */
  (function () {
    var drag = null;
    doc.addEventListener("pointerdown", function (e) {
      if (!inEditMode) return;
      if (e.pointerType === "touch") return;                 // touch reorders via the options grip/arrows
      if (e.button != null && e.button > 0) return;          // primary button only
      if (e.target.closest("#cs-edit-root")) return;         // editor chrome handles itself
      var card = e.target.closest(".pcard[data-vlm-ed]");
      if (!card || !card.parentElement) return;
      if (card.parentElement.id === "railCtl") return;       // Complete-the-Look order is curated via its own picker
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
      var sibs = els(".pcard", drag.container).filter(function (c) { return c !== drag.card; });
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
     PANEL EVENT WIRING (all inside #cs-edit-root -> own listeners)
     =================================================================== */
  // image tools
  el("[data-vlm-replace]", imgtools).addEventListener("click", function () { if (imgtools.__el) fileInput.click(); });
  el("[data-vlm-adjust]", imgtools).addEventListener("click", function () { imgtools.classList.toggle("focusing"); });
  el("[data-vlm-imglink]", imgtools).addEventListener("click", function () {
    var linkA = imgtools.__linkA; if (!linkA) return;
    var lk = linkA.getAttribute("data-content-link");
    var cur = slugFromHref(linkA.getAttribute("href") || "");
    var btn = this;
    openLinkPop(btn.getBoundingClientRect(), cur, function (slug) {
      linkA.setAttribute("href", hrefForSlug(slug));
      if (lk) { logEdit({ t: "link", k: lk, label: "Link", page: PAGE, orig: origFor("link::" + lk, cur), cur: slug }); queueSave(defObj(lk, slug)); }
      touchSave();
    }, function () { return btn.getBoundingClientRect(); });
  });
  fileInput.addEventListener("change", function () {
    var f = fileInput.files && fileInput.files[0]; if (!f || !imgtools.__el) return;
    doSiteImageReplace(imgtools.__el, f);
    fileInput.value = "";
  });
  // fade slider (hero scrim strength): live-preview via --hero-fade-mult on input; persist the
  // chosen percentage under home.hero.fade on commit (change). 50% == the built-in default.
  fadeRange.addEventListener("input", function () {
    var host = imgtools.__fadeHost; if (!host) return;
    var pct = clamp(Math.round(+this.value || 0), 0, 100);
    fadeVal.textContent = pct + "%";
    host.style.setProperty("--hero-fade-mult", (pct / 50).toString());
  });
  fadeRange.addEventListener("change", function () {
    var host = imgtools.__fadeHost, key = imgtools.__fadeKey; if (!host || !key) return;
    var pct = clamp(Math.round(+this.value || 0), 0, 100);
    host.style.setProperty("--hero-fade-mult", (pct / 50).toString());   // make the committed value authoritative (input normally precedes change, but keyboard/programmatic commits may not)
    fadeVal.textContent = pct + "%";
    queueSave(defObj(key, String(pct)));
    var op = imgtools.__fadeOrig, origPct = (op == null || op === "") ? "" : String(clamp(Math.round(parseFloat(op) * 50), 0, 100));
    logEdit({ t: "fade", k: key, label: "Photo fade", page: PAGE, orig: origPct, cur: String(pct) });
    touchSave(); flashSaved(host);
  });
  // link toolbar
  el("[data-vlm-linkopen]", linkbar).addEventListener("click", function () {
    var node = linkbar.__el; if (!node) return;
    var lk = node.getAttribute("data-content-link");
    var cur = slugFromHref(node.getAttribute("href") || "");
    var btn = this;
    openLinkPop(btn.getBoundingClientRect(), cur, function (slug, name) {
      node.setAttribute("href", hrefForSlug(slug));
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
  /* Trending controls whether a product shows in the Trending rail, so a toggle must reflect
     in the rail immediately (not only on the next save/reload) - otherwise a product could sit
     in the rail with its Trending toggle reading off. Mirror the flag onto the live product and
     re-render via the same products-updated path content.js uses. A product removed from Trending
     leaves the rail and can be re-added from the Products drawer. */
  function dispatchProductsUpdated() {
    var ev;
    try { ev = new CustomEvent("cloudskin:products-updated", { detail: { map: {} } }); }
    catch (e) { ev = doc.createEvent("CustomEvent"); ev.initCustomEvent("cloudskin:products-updated", true, false, { map: {} }); }
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
      s[field] = s[field] ? 0 : 1;   // Trending (trend) is independent now - no derivation from best/new
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
      var sibs = els(".pcard", container).filter(function (c) { return c !== card; });
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
    fade:  svg('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 010 18z" fill="currentColor" stroke="none"/>', 1.8),
    link:  svg('<path d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1"/>', 1.8),
    merch: svg('<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v6l9 4 9-4V7"/>', 1.8),
    order: svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', 1.8),
    ctl:   svg('<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 10-7.8 7.8l8.8 8.6 8.8-8.6a5.5 5.5 0 000-7.8z"/>', 1.8),
    gal:   svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 15l5-5 4 4 3-3 6 6"/>', 1.8)
  };
  var PAGE_LABEL = { "home.html": "Home", "collection.html": "Collection", "product.html": "Product", "about.html": "About" };
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
      var e = EDITS[id], oldv = e.d0 != null ? e.d0 : e.orig, newv = e.d1 != null ? e.d1 : e.cur, pg = PAGE_LABEL[e.page] || "";
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
    if (k === "img") { var ik = node.getAttribute("data-content-img"); if (!ik) return null; return EDITS["img::" + ik] ? "img::" + ik : (EDITS["focal::" + ik] ? "focal::" + ik : (EDITS["zoom::" + ik] ? "zoom::" + ik : null)); }
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
      var s = psSeed(h), gtag = s.gender === "Men" ? " &middot; Men" : s.gender === "Unisex" ? " &middot; Both" : "";
      return '<div class="vlm-prow' + (s.hidden ? " is-hidden" : "") + '" data-h="' + escH(h) + '">' +
        '<span class="vlm-prow__grip" title="Drag to reorder">' + svg('<circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none"/>') + '</span>' +
        '<img class="vlm-prow__thumb" src="' + escH(thumbFor(p)) + '" alt="" loading="lazy" />' +
        '<div class="vlm-prow__info"><span class="vlm-prow__name">' + escH(p.title) + '</span><span class="vlm-prow__cat">' + escH(s.cat) + gtag + '</span></div>' +
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
        s[field] = s[field] ? 0 : 1;   // Trending is independent now - toggling best/new no longer touches it
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

  /* ---- Complete the Look picker (product.html) ---- */
  // Seed the picker from the owner's PUBLISHED Complete-the-Look (the live content map, else the baked
  // snapshot) the first time it is opened this session, so it shows her EXISTING picks and a new pick
  // EXTENDS them instead of silently replacing the whole list. An empty/absent value seeds [] (automatic
  // pairing). Once the session has touched CTLMAP[h] (incl. an explicit [] via "Use automatic pairing"),
  // we never re-seed, so her in-session choice always wins.
  function seedCtl(h) {
    if (!h || CTLMAP[h] != null) return;
    var src = window.CLOUDSKIN_CONTENT_LIVE || window.CLOUDSKIN_CONTENT_SNAPSHOT || {};
    var raw = src["product." + h + ".completeLook"];
    var arr = String(raw == null ? "" : raw).split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    CTLMAP[h] = arr.slice(0, CTL_MAX);
    store("vlm-ctl", CTLMAP);
  }
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
  function railHandles(rail) { return els(".pcard[data-handle]", rail).map(function (c) { return c.getAttribute("data-handle"); }); }
  function applyCtl() {
    var rail = el("#railCtl"); if (!rail) return;
    var h = galHandle(); if (!h) return;
    if (rail.__vlmAuto == null) rail.__vlmAuto = rail.innerHTML;   // capture the site's automatic pairing once
    var picks = currentCtlPicks(h);
    if (picks.length && window.CLOUDSKIN && CLOUDSKIN.cardHTML) {
      if (railHandles(rail).join(",") === picks.join(",")) return;   // already applied -> no-op (settles the PDP observer)
      rail.innerHTML = picks.map(function (hh, i) { return CLOUDSKIN.cardHTML(prodBy(hh), i); }).join("");
    } else {
      if (rail.innerHTML === rail.__vlmAuto) return;                 // already automatic -> no-op
      rail.innerHTML = rail.__vlmAuto;
    }
    tagEditables(); if (inEditMode) syncAllCards();
  }
  function reapplyCtl() { if (el("#railCtl") && (CTLMAP[galHandle()] || []).length) applyCtl(); }
  function logCtl(h) {
    var names = currentCtlPicks(h).map(function (hh) { var p = prodBy(hh); return p ? p.title : hh; }).join(", ");
    logEdit({ t: "ctl", k: h, label: (prodBy(h) || {}).title || h, page: PAGE, meta: { h: h }, orig: "", cur: names, d0: "Automatic pairing", d1: names ? "Custom: " + names : "" });
  }
  // inject the "Edit Complete the Look" affordance next to the PDP rail heading
  function injectCtlAffordance() {
    var rail = el("#railCtl"); if (!rail) return;
    var title = el("#ctlTitle"), host = title ? title.parentNode : rail.parentNode;
    if (!host || el(".vlm-ctledit", host)) return;
    var b = doc.createElement("button");
    b.className = "vlm-ctledit"; b.type = "button";
    b.innerHTML = svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>', 1.9) + " Edit Complete the Look";
    b.addEventListener("click", function () { var h = galHandle(); seedCtl(h); ctlPanel.__h = h; openDrawer("ctl"); });
    if (title && title.nextSibling) host.insertBefore(b, title.nextSibling); else host.appendChild(b);
  }

  /* ---- drawer + revert wiring ---- */
  prodsBtn.addEventListener("click", function () { openDrawer("prods"); });
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
    if (e.target.closest("#cs-edit-root")) { hideHover(); return; }
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
    if (e.target.closest("#cs-edit-root")) return;         // editor chrome handles itself
    var ed = e.target.closest("[data-vlm-ed]");
    if (current && ed === current && current.classList.contains("vlm-editing")) return; // caret move inside ACTIVELY-edited text only
    if (ed) { e.preventDefault(); e.stopPropagation(); select(ed); }
    else { clearSel(); }                                    // clicked a non-editable element -> allow its normal behavior (nav)
  }, true);

  /* ===================================================================
     ENTER / EXIT / PERSIST
     =================================================================== */
  function applyHiddenVisuals(on) {
    els(".pcard[data-vlm-hidden='1']").forEach(function (c) { if (on) setHidden(c, true); else { c.classList.remove("vlm-hidden"); if (hidetagMap.has(c)) { hidetagMap.get(c).remove(); hidetagMap.delete(c); } } });
  }
  function enterEdit(firstTime) {
    inEditMode = true;
    body.classList.add("vlm-mode");   // edit mode persists across page nav via the armed session (vlm-armed)
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
    // "Done" disarms the session: the editor will not re-mount on the next page load.
    // Keep cs_gate_ok so the owner stays past the store-access gate after finishing.
    try {
      sessionStorage.removeItem("vlm-armed");
      sessionStorage.removeItem("vlm-pw");
      sessionStorage.removeItem("vlm-welcomed");
    } catch (e) {}
    body.classList.remove("vlm-mode", "vlm-map");
    mapToggle.classList.remove("on");
    hideHover();
  }

  /* ---- chrome buttons (armed session: no pill, no local unlock card) ---- */
  doneBtn.addEventListener("click", exitEdit);
  // open the tapped product's own page (staying in edit mode) so she can edit its photos + text
  el("[data-vlm-openpdp]", merch).addEventListener("click", function () {
    var card = merch.__card; if (!card) return;
    var href = card.getAttribute("data-href");
    if (!href) { var a = el("a[href]", card); if (a) href = a.getAttribute("href"); }
    if (!href) { var h = card.getAttribute("data-handle"); if (h) href = "product.html?handle=" + encodeURIComponent(h); }
    if (href) location.href = href;   // vlm-armed persists edit mode across the nav
  });
  mapToggle.addEventListener("click", function () { this.classList.toggle("on"); body.classList.toggle("vlm-map"); });
  addEventListener("keydown", function (e) { if (e.key === "Escape") { if (prodsD.classList.contains("on") || editsD.classList.contains("on") || ctlPanel.classList.contains("on")) closeDrawers(); else if (current) clearSel(); } });
  // Warn before leaving while a studio_save is still pending / in flight (studio.js L975).
  addEventListener("beforeunload", function (e) {
    if (inFlight || uploads || Object.keys(pending).length) { e.preventDefault(); e.returnValue = ""; return ""; }
  });

  /* ===================================================================
     BOOT - bind after CloudSkin content has settled (content-ready),
     then re-tag on any product re-render. Persist edit mode across pages.
     =================================================================== */
  function bindAfterContent() {
    var C = window.CLOUDSKIN || {};
    var welcomed = false;
    try { welcomed = sessionStorage.getItem("vlm-welcomed") === "1"; } catch (e) {}
    function go() {
      tagEditables();
      reapplyEdits();   // re-apply this session's text/image/link edits (multi-page UI continuity)
      if (!inEditMode) {
        // Armed session: auto-enter edit mode on every page. Show the teaching pulse/nudge
        // only the first time in this session (right after /creator).
        var first = !welcomed;
        try { sessionStorage.setItem("vlm-welcomed", "1"); } catch (e) {}
        enterEdit(first);
      }
    }
    if (C.contentReady) setTimeout(go, 0);
    else doc.addEventListener("cloudskin:content-ready", function () { setTimeout(go, 0); });
    // safety net if content-ready never fires
    setTimeout(go, 2000);
    // product rails / grid re-render on genuine studio edits -> re-tag
    // (timers, not rAF: embedded webviews throttle rAF and would strand the re-tag)
    doc.addEventListener("cloudskin:products-updated", function () { setTimeout(function () { tagEditables(); if (inEditMode) { syncAllCards(); applyOrderToDOM(); reapplyCtl(); } }, 30); });
    // content.js re-applies the owner's saved overrides on load AND ~400ms later (and on a live delta).
    // Re-assert THIS session's edits right after each pass so a delayed content re-apply can never
    // visually roll back a fresh commit. reapplyEdits() skips actively-edited fields and is idempotent.
    doc.addEventListener("cloudskin:content-applied", function () { if (inEditMode) reapplyEdits(); });
    // the PDP buybox + gallery are injected/re-rendered by product.js (load + colour switch);
    // re-tag when that DOM changes so text + gallery editing always attach. Idempotent + guarded.
    var pm = el("#pdpMain");
    if (pm && window.MutationObserver) {
      var pend = false;
      // debounce via setTimeout (NOT rAF - some embedded webviews throttle rAF while
      // backgrounded, which would strand the re-tag). Coalesces product.js's innerHTML swap.
      new MutationObserver(function () {
        if (pend) return; pend = true;
        setTimeout(function () { pend = false; tagEditables(); if (inEditMode) { syncAllCards(); reapplyCtl(); } }, 30);
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
    flush: function () { flush(); },
    queueSave: queueSave, merchKeys: merchKeys, orderKeys: orderKeys,
    uploadUrl: function () { return UPLOAD_URL; },
    saveState: function () { return { pending: Object.keys(pending).length, inFlight: inFlight, uploads: uploads }; }
  };
})();
