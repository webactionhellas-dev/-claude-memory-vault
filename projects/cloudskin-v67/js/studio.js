/* ============================================================
   CLOUDSKIN Content Studio - owner-facing editor.
   Password-gated (studio_auth / studio_save RPCs, server-side).
   Text saved to cloudskin_content; images resized client-side to a
   compact JPEG data-URL and stored the same way. Product photos go
   through the studio-upload edge function. The public site
   (js/content.js + js/product.js) reads cloudskin_content and applies
   the overrides, always fail-open to the built-in defaults.

   Layout: FIVE collapsible top-level groups (Home Page, Navigation
   Menus, Products, Our Story, Footer). One group open at a time; Home
   open by default. Reuses the accordion pattern from the product photos.
   ============================================================ */
(function () {
  var cfg = window.CLOUDSKIN_SB || {};
  if (!window.supabase || !cfg.url || !cfg.anonKey) {
    document.getElementById('lockErr').textContent = 'Backend not configured.';
    return;
  }
  var sb = window.supabase.createClient(cfg.url, cfg.anonKey);

  // Product-photo uploads go through the studio-upload edge function (service-role
  // write to the PUBLIC-READ `product-media` bucket). The function re-checks the
  // studio password server-side; the anon key is only the Supabase gateway apikey.
  var UPLOAD_URL = String(cfg.url || '').replace(/\/+$/, '') + '/functions/v1/studio-upload';
  var MAX_PHOTOS = 12;   // per product - keeps the gallery and payloads sane
  var CTL_MAX = 4;       // Complete the Look - max suggested products per item

  /* ---- "When tapped, opens:" options: friendly label -> real collection slug.
     The slug is NEVER shown to the owner. content.js turns the stored slug into
     collection.html?c=<slug>. Keep in sync with js/config.js CLOUDSKIN.collections. ---- */
  var OPEN_OPTIONS = [
    ['The Collection', 'collection'],
    ['Women', 'women'],
    ['Men', 'men'],
    ['Trending', 'trending'],
    ['New Arrivals', 'new'],
    ['Best Sellers', 'bestsellers'],
    ['Tops', 'tops'],
    ['Bottoms', 'bottoms'],
    ['Dresses', 'dresses'],
    ['Skirts', 'skirts'],
    ['Shorts', 'shorts'],
    ['Bras', 'bras'],
    ['Layers & Jackets', 'layers'],
    ['Tennis', 'tennis'],
    ['Padel', 'padel'],
    ['Studio', 'studio'],
    ['Train', 'train']
  ];

  /* ---- HOME PAGE group. Sections in the order the homepage renders. Each block's
     own heading is folded in with it (no separate "section headings" panel). Image
     items that link somewhere carry linkKey/linkDef so an "opens" dropdown renders
     under the image (defaults mirror today's hardcoded destinations). ---- */
  var HOME_SECTIONS = [
    { title: 'Top image & tagline', note: 'The big opening image and the tagline under the logo.', items: [
      { key: 'home.hero.image', label: 'Top image', type: 'image', def: 'img/instagram/hero-founders-duo.jpg' },
      { key: 'home.hero.sub', label: 'Tagline under the logo', type: 'text', def: 'Luxury activewear for the court and everywhere after.' }
    ]},
    { title: 'Trending row', note: 'The heading above the scrolling product row near the top.', items: [
      { key: 'home.trending.title', label: 'Row heading', type: 'text', def: 'Trending' }
    ]},
    { title: 'The Collection band', note: 'The full-width image band under the Trending row.', items: [
      { key: 'home.collbanner.image', label: 'Band image', type: 'image', def: 'img/shoot/padel-trio.jpg', linkKey: 'home.collbanner.link', linkDef: 'collection' },
      { key: 'home.collbanner.eyebrow', label: 'Small line above the heading', type: 'text', def: 'Court to everywhere' },
      { key: 'home.collbanner.title', label: 'Band heading', type: 'text', def: 'The CloudSkin Collection' }
    ]},
    { title: 'Shop by Category', note: 'The three category tiles. The tile labels (Tops, Bottoms, Dresses) stay fixed; you can change each tile’s photo and where it opens.', items: [
      { key: 'home.cat.eyebrow', label: 'Small line above the heading', type: 'text', def: 'The Collection' },
      { key: 'home.cat.title', label: 'Section heading', type: 'text', def: 'Shop by Category' },
      { key: 'home.cat.tile1.image', label: 'Tile 1 photo (Tops)', type: 'image', def: 'img/studio/studio-white-set.jpg', linkKey: 'home.cat.tile1.link', linkDef: 'tops' },
      { key: 'home.cat.tile2.image', label: 'Tile 2 photo (Bottoms)', type: 'image', def: 'img/studio/studio-black-bra.jpg', linkKey: 'home.cat.tile2.link', linkDef: 'bottoms' },
      { key: 'home.cat.tile3.image', label: 'Tile 3 photo (Dresses)', type: 'image', def: 'img/studio/studio-white-dress.jpg', linkKey: 'home.cat.tile3.link', linkDef: 'dresses' }
    ]},
    { title: 'Editorial', note: 'The brand-story image and text lower on the page.', items: [
      { key: 'home.editorial.image', label: 'Editorial image', type: 'image', def: 'img/shoot/campaign-basketball.jpg', linkKey: 'home.editorial.link', linkDef: 'women' },
      { key: 'home.editorial.title', label: 'Heading', type: 'text', def: 'Where performance becomes presence.' },
      { key: 'home.editorial.copy', label: 'Paragraph', type: 'textarea', def: 'Born on the court, made for everywhere after. Designed in motion and refined until it disappears, so all that remains is you.' }
    ]},
    { title: 'Quiet Luxury statement', note: 'The two-line statement band below the editorial.', items: [
      { key: 'home.statement.title1', label: 'Line 1', type: 'text', def: 'Quiet Luxury.' },
      { key: 'home.statement.title2', label: 'Line 2', type: 'text', def: 'Active Living.' },
      { key: 'home.statement.copy', label: 'Paragraph', type: 'textarea', def: "Because luxury isn't reserved for special occasions. It's found in the pieces you choose to live in every day." }
    ]},
    { title: 'Newsletter', note: 'The sign-up section near the bottom of the page.', items: [
      { key: 'home.nl.title', label: 'Heading', type: 'text', def: 'Join the CloudSkin World' },
      { key: 'home.nl.lead', label: 'Sub-text', type: 'textarea', def: 'Early access to drops, private events and the stories behind the edit.' }
    ]},
    { title: 'Instagram', note: 'The follow-us section near the footer.', items: [
      { key: 'home.ig.title', label: 'Heading', type: 'text', def: 'Follow on Instagram' }
    ]}
  ];

  /* ---- NAVIGATION MENUS group: the feature poster inside each mega-menu.
     Defaults mirror js/config.js CLOUDSKIN.nav feature (studio.html does not load
     config.js, so the real image/caption/link are duplicated here). ---- */
  var NAV_SECTIONS = [
    { title: 'Women menu poster', note: 'The poster shown inside the Women menu ("The Court Edit").', items: [
      { key: 'nav.women.feature.image', label: 'Poster image', type: 'image', def: 'img/shoot/tennis-night-white.jpg', linkKey: 'nav.women.feature.link', linkDef: 'women' },
      { key: 'nav.women.feature.caption', label: 'Caption', type: 'text', def: 'The Court Edit' }
    ]},
    { title: 'Men menu poster', note: 'The poster shown inside the Men menu ("Court Ready").', items: [
      { key: 'nav.men.feature.image', label: 'Poster image', type: 'image', def: 'img/instagram/men-padel-swing.jpg', linkKey: 'nav.men.feature.link', linkDef: 'men' },
      { key: 'nav.men.feature.caption', label: 'Caption', type: 'text', def: 'Court Ready' }
    ]}
  ];

  /* ---- OUR STORY (about) page - defaults mirror the live copy so she edits real text ---- */
  var ABOUT = [
    { title: 'Our Story - Hero', note: 'The top image and title of the Our Story page.', items: [
      { key: 'about.hero.image', label: 'Hero image', type: 'image', def: 'img/founders/about-hero-duo.jpg' },
      { key: 'about.hero.title', label: 'Hero title', type: 'text', def: 'Our Story' }
    ]},
    { title: 'Our Story - Story', note: 'The opening story block.', items: [
      { key: 'about.story.eyebrow', label: 'Eyebrow', type: 'text', def: 'CloudSkin' },
      { key: 'about.story.lead', label: 'Lead line', type: 'text', def: 'Built for movement. Designed for everyday life.' },
      { key: 'about.story.p1', label: 'Paragraph 1', type: 'textarea', def: 'CloudSkin began with a simple idea. Activewear should keep up with your whole day, not just your workout. We make the pieces you reach for without thinking, comfortable and versatile, refined enough to wear wherever you are headed.' },
      { key: 'about.story.p2', label: 'Paragraph 2', type: 'textarea', def: 'Too often, activewear asks you to choose between how it works and how it looks. We wanted both. Every piece is made with premium fabrics, clean lines, and quiet details, so it performs through an active day while still feeling effortless.' },
      { key: 'about.story.p3', label: 'Paragraph 3', type: 'textarea', def: 'On the court, in the studio, on the move, or simply out living your day, CloudSkin is made to move with you. The idea is simple. Versatile essentials that feel as good as they look and hold up season after season.' }
    ]},
    { title: 'Our Story - Founders’ Edit', note: 'The image-and-text ethos block.', items: [
      { key: 'about.ethos.image', label: 'Image', type: 'image', def: 'img/founders/about-camp-motion.jpg' },
      { key: 'about.ethos.eyebrow', label: 'Eyebrow', type: 'text', def: 'The Founders’ Edit' },
      { key: 'about.ethos.title', label: 'Heading', type: 'text', def: 'A study in simplicity.' },
      { key: 'about.ethos.copy', label: 'Paragraph', type: 'textarea', def: 'We built The Founders’ Edit around one simple idea: black, white, and nothing you have to overthink. There is no chasing trends here, just pieces made to last and made to move with you, whether you are on the court, in the studio, or out living your everyday. Simple, quietly refined, and easy to reach for again and again.' },
      { key: 'about.ethos.cta', label: 'Button label', type: 'text', def: 'Shop the Collection' }
    ]},
    { title: 'Our Story - Campaign', note: 'The campaign heading and the three captioned photos.', items: [
      { key: 'about.camp.eyebrow', label: 'Eyebrow', type: 'text', def: 'Cloud on Court' },
      { key: 'about.camp.title', label: 'Heading', type: 'text', def: 'The Campaign' },
      { key: 'about.camp.img1', label: 'Photo 1 image', type: 'image', def: 'img/founders/about-camp-villa.jpg' },
      { key: 'about.camp.cap1', label: 'Photo 1 caption', type: 'text', def: 'Luxury Villa' },
      { key: 'about.camp.img2', label: 'Photo 2 image', type: 'image', def: 'img/founders/about-camp-court.jpg' },
      { key: 'about.camp.cap2', label: 'Photo 2 caption', type: 'text', def: 'On Court' },
      { key: 'about.camp.img3', label: 'Photo 3 image', type: 'image', def: 'img/shoot/campaign-basketball.jpg' },
      { key: 'about.camp.cap3', label: 'Photo 3 caption', type: 'text', def: 'In Motion' }
    ]}
  ];

  /* ---- FOOTER (shown across the site). Column LINKS stay as they are; text only. ---- */
  var FOOTER = [
    { title: 'Footer', note: 'The footer shown across the site. The column links stay as they are; only the text below is editable.', items: [
      { key: 'footer.tag', label: 'Footer tagline', type: 'textarea', def: 'Luxury activewear for the court and everywhere after. Designed in motion, made to disappear on the skin.' },
      { key: 'footer.nl.head', label: 'Footer sign-up heading', type: 'text', def: 'Be First to Know' },
      { key: 'footer.nl.copy', label: 'Footer sign-up text', type: 'textarea', def: 'Sign up to be the first to discover new arrivals, limited releases and upcoming collections.' },
      { key: 'footer.col1.head', label: 'Column 1 heading', type: 'text', def: 'Shop' },
      { key: 'footer.col2.head', label: 'Column 2 heading', type: 'text', def: 'Customer Service' },
      { key: 'footer.col3.head', label: 'Column 3 heading', type: 'text', def: 'The House' }
    ]}
  ];

  /* ---- product-page copy (shared defaults from js/product-content.js) ----
     Per-product fields live behind the single Edit-a-product picker; the shared
     fields below apply to every product page. Defaults mirror the live site. */
  var PDP = window.CLOUDSKIN_PDP || {};
  var PPROD = PDP.PRODUCTS || {};
  var PHANDLES = Object.keys(PPROD).sort(function (a, b) {
    return String(PPROD[a].title || a).localeCompare(String(PPROD[b].title || b));
  });
  function prodFields(h) {
    var p = PPROD[h] || {};
    return [
      { key: 'product.' + h + '.desc', label: 'Description', type: 'textarea', def: p.desc || '' },
      { key: 'product.' + h + '.features', label: 'Feature bullets - one per line', type: 'textarea', def: (p.features || []).join('\n') },
      { key: 'product.' + h + '.fabric', label: 'Fabric / composition', type: 'text', def: p.fabric || '' },
      { key: 'product.' + h + '.fit.type', label: 'Fit type - one word (e.g. Sculpting, Slim, Relaxed)', type: 'text', def: (p.fit && p.fit[0]) || '' },
      { key: 'product.' + h + '.fit.copy', label: 'Fit description', type: 'textarea', def: (p.fit && p.fit[1]) || '' }
    ];
  }
  var SHARED = [
    { key: 'pdp.care', label: 'Care instructions - one per line', type: 'textarea', def: (PDP.CARE || []).join('\n') },
    { key: 'pdp.fit.trailing', label: 'Shared fit note (added after every product’s fit)', type: 'textarea', def: PDP.FIT_TRAILING || '' },
    { key: 'pdp.shipping', label: 'Shipping & Returns (Details accordion)', type: 'textarea', def: PDP.SHIPPING || '' },
    { key: 'pdp.shipline', label: 'Shipping line under the Add to Bag button', type: 'text', def: PDP.SHIPLINE || '' }
  ];

  /* ---- product controls: per-product Best Seller / New / gender & display order.
     Built from the REAL curated catalog (curate.js runs before this file in studio.html),
     minus the throwaway test item. Defaults mirror the current live state. ---- */
  var PLIST = (window.CLOUDSKIN_PRODUCTS || []).filter(function (p) {
    return p && p.handle && p.category !== 'Test' && !/^zz-/.test(p.handle);
  });
  var PBYH = {};
  PLIST.forEach(function (p) { PBYH[p.handle] = p; });
  function ctrlKey(h, name) { return 'product.' + h + '.' + name; }
  function ctrlGenderDef(p) {
    return (p.gender === 'Men' || p.gender === 'Unisex' || p.gender === 'Women') ? p.gender : 'Women';
  }
  var CTRL_CATS = ['Tops', 'Bottoms', 'Dresses'];
  function ctrlCategoryDef(p) {
    var c = p.category;
    if (['Skirts', 'Shorts', 'Bottoms', 'Leggings', 'Pants'].indexOf(c) >= 0) return 'Bottoms';
    if (c === 'Dresses') return 'Dresses';
    return 'Tops';
  }
  var CTRL_DEF = {};
  PLIST.forEach(function (p, i) {
    CTRL_DEF[ctrlKey(p.handle, 'bestSeller')] = p.bestSeller ? '1' : '0';
    CTRL_DEF[ctrlKey(p.handle, 'isNew')] = p.isNew ? '1' : '0';
    CTRL_DEF[ctrlKey(p.handle, 'gender')] = ctrlGenderDef(p);
    CTRL_DEF[ctrlKey(p.handle, 'category')] = ctrlCategoryDef(p);
    CTRL_DEF[ctrlKey(p.handle, 'order')] = String(i + 1);
  });

  // every editable text/image section, in one list for defaults + rendering
  var TEXT_SECTIONS = HOME_SECTIONS.concat(NAV_SECTIONS, ABOUT, FOOTER);

  // one lookup of every field's default, so revert-detection works for all keys
  var DEF = {};
  TEXT_SECTIONS.forEach(function (s) {
    s.items.forEach(function (f) {
      DEF[f.key] = f.def;
      if (f.linkKey) DEF[f.linkKey] = f.linkDef;   // "opens" dropdown default
    });
  });
  SHARED.forEach(function (f) { DEF[f.key] = f.def; });
  PHANDLES.forEach(function (h) { prodFields(h).forEach(function (f) { DEF[f.key] = f.def; }); });
  Object.keys(CTRL_DEF).forEach(function (k) { DEF[k] = CTRL_DEF[k]; });

  var curHandle = PHANDLES[0] || null;   // product currently shown in the picker
  var ctlSearch = '';                    // Complete the Look search term
  var openGroup = 'home';                // which top-level group is expanded

  var PW = null;         // studio password (kept in memory after unlock)
  var saved = {};        // last-saved values from the DB
  var pending = {};      // unsaved edits (key -> value)

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function curVal(f) { return (f.key in pending) ? pending[f.key] : (saved[f.key] != null && saved[f.key] !== '' ? saved[f.key] : f.def); }
  // generic value getter (pending -> saved -> default) for any key, incl. control/link keys
  function valOf(key) { return (key in pending) ? pending[key] : (saved[key] != null && saved[key] !== '' ? saved[key] : findDef(key)); }
  function findDef(key) { return (key in DEF) ? DEF[key] : ''; }

  /* ---- image focal point: an object-position string ("50% 30%") saved under <imageKey>.pos ---- */
  function posKey(key) { return key + '.pos'; }
  function curPos(key) {
    var k = posKey(key);
    var v = (k in pending) ? pending[k] : (saved[k] != null && saved[k] !== '' ? saved[k] : '50% 50%');
    return String(v || '50% 50%');
  }
  function parsePos(v) {
    var m = String(v).match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
    return m ? { x: +m[1], y: +m[2] } : { x: 50, y: 50 };
  }

  /* ---- unlock ---- */
  $('lockForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var pw = $('pw').value;
    if (!pw) return;
    $('lockBtn').disabled = true; $('lockBtn').textContent = 'Checking…'; $('lockErr').textContent = '';
    sb.rpc('studio_auth', { p_password: pw }).then(function (r) {
      $('lockBtn').disabled = false; $('lockBtn').textContent = 'Unlock';
      if (r.error) { $('lockErr').textContent = 'Something went wrong. Try again.'; return; }
      if (r.data === true) { PW = pw; loadAndRender(); }
      else { $('lockErr').textContent = 'Wrong password.'; $('pw').select(); }
    });
  });

  function loadAndRender() {
    sb.from('cloudskin_content').select('key,value').then(function (res) {
      saved = {};
      if (res.data) res.data.forEach(function (r) { saved[r.key] = r.value; });
      pending = {};
      $('lock').classList.add('hide');
      $('editor').classList.remove('hide');
      render();
    });
  }

  /* ---- field rendering ---- */
  function opensSelectHTML(linkKey, cur) {
    var opts = OPEN_OPTIONS.map(function (o) {
      return '<option value="' + esc(o[1]) + '"' + (o[1] === cur ? ' selected' : '') + '>' + esc(o[0]) + '</option>';
    }).join('');
    return '<div class="field opensfield"><label>When tapped, opens:</label>' +
      '<select data-key="' + esc(linkKey) + '" class="opensSel">' + opts + '</select></div>';
  }

  function fieldHTML(f) {
    var html = '<div class="field">';
    if (f.type === 'image') {
      var pos = curPos(f.key), pp = parsePos(pos);
      html += '<label>' + esc(f.label) + '</label><div class="imgrow">' +
        '<div class="focalbox" data-focal="' + f.key + '" title="Drag the dot to reframe">' +
          '<img class="focalimg" data-thumb="' + f.key + '" src="' + esc(curVal(f)) + '" alt="" style="object-position:' + esc(pos) + '">' +
          '<span class="focaldot" style="left:' + pp.x + '%;top:' + pp.y + '%"></span>' +
        '</div>' +
        '<div><button type="button" class="btn btn--ghost" data-pick="' + f.key + '">Replace image</button>' +
        '<small>JPG or PNG. It is resized automatically.</small>' +
        '<small class="focalhint">Drag the dot to choose the part that stays in view.</small>' +
        '<div class="photostatus" data-imgstatus="' + f.key + '"></div></div></div>';
      html += '</div>';
      if (f.linkKey) html += opensSelectHTML(f.linkKey, valOf(f.linkKey));
      return html;
    } else if (f.type === 'textarea') {
      html += '<label>' + esc(f.label) + '</label><textarea data-key="' + f.key + '">' + esc(curVal(f)) + '</textarea>';
    } else {
      html += '<label>' + esc(f.label) + '</label><input type="text" data-key="' + f.key + '" value="' + esc(curVal(f)) + '">';
    }
    return html + '</div>';
  }

  // attach the change/click listeners for any fields inside a container
  function wireFields(scope) {
    scope.querySelectorAll('[data-key]').forEach(function (el) {
      var ev = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(ev, function () { setPending(el.getAttribute('data-key'), el.value); });
    });
    scope.querySelectorAll('[data-pick]').forEach(function (btn) {
      btn.addEventListener('click', function () { pickImage(btn.getAttribute('data-pick')); });
    });
    wireFocal(scope);
  }

  // draggable focal point: click/drag the dot on the preview to set <imageKey>.pos live
  function wireFocal(scope) {
    scope.querySelectorAll('[data-focal]').forEach(function (box) {
      var key = box.getAttribute('data-focal');
      var img = box.querySelector('.focalimg');
      var dot = box.querySelector('.focaldot');
      var dragging = false;
      function setFrom(clientX, clientY) {
        var r = box.getBoundingClientRect();
        if (!r.width || !r.height) return;
        var x = Math.round(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
        var y = Math.round(Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100)));
        var val = x + '% ' + y + '%';
        if (img) img.style.objectPosition = val;
        if (dot) { dot.style.left = x + '%'; dot.style.top = y + '%'; }
        setPending(posKey(key), val);
      }
      box.addEventListener('pointerdown', function (e) {
        dragging = true;
        if (box.setPointerCapture) { try { box.setPointerCapture(e.pointerId); } catch (err) {} }
        setFrom(e.clientX, e.clientY); e.preventDefault();
      });
      box.addEventListener('pointermove', function (e) { if (dragging) setFrom(e.clientX, e.clientY); });
      box.addEventListener('pointerup', function () { dragging = false; });
      box.addEventListener('pointercancel', function () { dragging = false; });
    });
  }

  // (re)build just the selected product's text fields - called on load and on picker change
  function renderProdFields(h) {
    var box = $('prodFields'); if (!box) return;
    curHandle = h;
    box.innerHTML = prodFields(h).map(fieldHTML).join('');
    wireFields(box);
  }

  /* ============================================================
     PRODUCT PHOTOS (Supabase Storage) - stored PER COLOUR.
     key: product.<handle>.images.<colourSlug>  (newline-separated public URLs)
     Shown under the Edit-a-product picker for the currently chosen product only.
     ============================================================ */
  function slugColour(name) { return String(name == null ? '' : name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function productColours(h) {
    var list = window.CLOUDSKIN_PRODUCTS || [], p = null;
    for (var i = 0; i < list.length; i++) { if (list[i].handle === h) { p = list[i]; break; } }
    var cols = p ? ((p.colors && p.colors.length) ? p.colors
                 : (p.availColors && p.availColors.length) ? p.availColors
                 : (p.color ? [p.color] : [])) : [];
    var seen = {}, out = [];
    cols.forEach(function (c) { var s = slugColour(c); if (c && s && !seen[s]) { seen[s] = 1; out.push(c); } });
    return out;
  }
  function imagesKey(h, slug) { return 'product.' + h + '.images' + (slug ? '.' + slug : ''); }
  // the product's CURRENT bundled photo(s) for a colour - mirrors js/product.js galleryFor()
  function bundledSeed(h, slug) {
    var listP = window.CLOUDSKIN_PRODUCTS || [], p = null;
    for (var i = 0; i < listP.length; i++) { if (listP[i] && listP[i].handle === h) { p = listP[i]; break; } }
    if (!p) return [];
    var allImgs = (p.allImages && p.allImages.length ? p.allImages : p.images) || [];
    var shopShots = allImgs.filter(function (s) { return s.indexOf('/shopify/') >= 0; });
    var base = shopShots.length ? shopShots : allImgs;
    var colors = (p.availColors && p.availColors.length ? p.availColors
                : (p.colors && p.colors.length ? p.colors : [p.color]));
    if (!slug) return base.slice(0, 6);
    var idx = -1;
    for (var j = 0; j < colors.length; j++) { if (slugColour(colors[j]) === slug) { idx = j; break; } }
    if (colors.length > 1 && idx >= 0 && shopShots[idx]) return [shopShots[idx]];
    return base.slice(0, 6);
  }
  // A stored photo line may be "URL", "URL|pos" or "URL|pos|zoom" (the /creator focal control).
  // The dashboard has no focal UI, so it shows the bare URL but keeps the FULL line in the list, so a
  // reorder / remove here re-joins and preserves the owner's focal (no data loss, no broken image).
  function bareUrl(s) { s = String(s == null ? '' : s); var i = s.indexOf('|'); return i < 0 ? s : s.slice(0, i).trim(); }
  function currentImages(h, slug) {
    var k = imagesKey(h, slug);
    if (k in pending) {
      return String(pending[k] || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    }
    if (saved[k] != null && saved[k] !== '') {
      return String(saved[k]).split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    }
    return bundledSeed(h, slug);
  }
  function setImages(h, arr, slug) { setPending(imagesKey(h, slug), arr.join('\n')); }

  var photoBusy = false;   // guards against overlapping product-photo uploads

  // photo manager markup for ONE colour of a product: reorderable thumbnails + Add + status.
  function photoColourHTML(h, colour, slug, multi) {
    var list = currentImages(h, slug);
    var grid;
    if (!list.length) {
      grid = '<div class="photoempty">No photos yet for this colour. Add the shots you want shown. The first one is the main image.</div>';
    } else {
      grid = '<div class="photogrid">' + list.map(function (url, i) {
        return '<div class="photocard">' +
          '<select class="idxsel" data-slug="' + esc(slug) + '" data-i="' + i + '" title="Position of this photo" aria-label="Position of this photo">' +
            list.map(function (_u, j) { return '<option value="' + j + '"' + (j === i ? ' selected' : '') + '>' + (j + 1) + '</option>'; }).join('') +
          '</select>' +
          '<img src="' + esc(bareUrl(url)) + '" alt="" loading="lazy">' +
          '<div class="ctrls">' +
            '<button type="button" title="Move left" data-pact="left" data-slug="' + esc(slug) + '" data-i="' + i + '"' + (i === 0 ? ' disabled' : '') + '>◀</button>' +
            '<button type="button" title="Move right" data-pact="right" data-slug="' + esc(slug) + '" data-i="' + i + '"' + (i === list.length - 1 ? ' disabled' : '') + '>▶</button>' +
            '<button type="button" class="rm" title="Remove" data-pact="remove" data-slug="' + esc(slug) + '" data-i="' + i + '">✕</button>' +
          '</div></div>';
      }).join('') + '</div>';
    }
    var head = multi
      ? '<div class="pcolour-head"><span class="pcolour-name">' + esc(colour) + '</span>' +
        '<span class="pcolour-count' + (list.length ? ' has' : '') + '">' +
          (list.length ? (list.length + ' photo' + (list.length > 1 ? 's' : '')) : 'No photos') +
        '</span></div>'
      : '';
    return '<div class="pcolour" data-slug="' + esc(slug) + '">' + head + grid +
      '<div class="photobar">' +
        '<button type="button" class="btn btn--ghost addPhotosBtn" data-slug="' + esc(slug) + '"' + (list.length >= MAX_PHOTOS ? ' disabled' : '') + '>+ Add photos</button>' +
        '<small>Pick several at once. JPG, PNG or WebP, up to ' + MAX_PHOTOS + ' per colour. Use the number on each photo to set its order.</small>' +
      '</div>' +
      '<div class="photostatus" data-status="' + esc(slug) + '"></div>' +
    '</div>';
  }

  // the whole photo manager for one product: one section per colour, or a single flat section
  function photoManagerHTML(h) {
    var cols = productColours(h);
    if (!cols.length) {
      return '<p class="note" style="margin:0 0 12px">Photo <strong>1</strong> is the <strong>base image</strong> - shown on the home and shop pages and as the big first image when this product is opened. Photos 2, 3, 4… are the extra views shown after it. Use the number on each photo to set its order (photo 1 is the base).</p>' +
        photoColourHTML(h, '', '', false);
    }
    return '<p class="note" style="margin:0 0 12px">Each colour has its own photos - the customer sees the ones for the colour they pick. Photo <strong>1</strong> of a colour is its <strong>base image</strong> (shown on the home/shop preview and as the big first image on the product page); photos 2, 3, 4… are the extra views after it. Use the number on each photo to set its order.</p>' +
      cols.map(function (c) { return photoColourHTML(h, c, slugColour(c), true); }).join('');
  }

  // (re)build the photo manager for the currently chosen product
  function renderProdPhotos(h) {
    var host = $('prodPhotos'); if (!host) return;
    host.innerHTML = photoManagerHTML(h);
    wirePhotoManager(host, h);
  }
  function refreshPhotos() { renderProdPhotos(curHandle); }

  // wire the reorder/remove + Add controls for the current product's photo manager.
  function wirePhotoManager(scope, h) {
    if (!h) return;
    scope.querySelectorAll('[data-pact]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (photoBusy) return;
        var slug = btn.getAttribute('data-slug') || '';
        var i = parseInt(btn.getAttribute('data-i'), 10);
        var act = btn.getAttribute('data-pact');
        var arr = currentImages(h, slug);
        if (act === 'remove') { arr.splice(i, 1); }
        else if (act === 'left' && i > 0) { var a = arr[i - 1]; arr[i - 1] = arr[i]; arr[i] = a; }
        else if (act === 'right' && i < arr.length - 1) { var b = arr[i + 1]; arr[i + 1] = arr[i]; arr[i] = b; }
        else { return; }
        setImages(h, arr, slug);
        refreshPhotos();
      });
    });
    scope.querySelectorAll('.addPhotosBtn').forEach(function (add) {
      add.addEventListener('click', function () { pickPhotos(h, add.getAttribute('data-slug') || ''); });
    });
    scope.querySelectorAll('.idxsel').forEach(function (sel) {
      sel.addEventListener('change', function () {
        if (photoBusy) return;
        var slug = sel.getAttribute('data-slug') || '';
        var from = parseInt(sel.getAttribute('data-i'), 10);
        var to = parseInt(sel.value, 10);
        var arr = currentImages(h, slug);
        if (isNaN(from) || isNaN(to) || from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) { refreshPhotos(); return; }
        var item = arr.splice(from, 1)[0];
        arr.splice(to, 0, item);
        setImages(h, arr, slug);
        refreshPhotos();
      });
    });
  }

  // per-colour status line: re-queried each call because the manager rebuilds the DOM
  function statusEl(slug) { var host = $('prodPhotos'); return host ? host.querySelector('[data-status="' + (slug || '') + '"]') : null; }
  function photoStatus(slug, msg, kind) {
    var el = statusEl(slug); if (!el) return;
    el.textContent = msg || '';
    el.className = 'photostatus' + (kind ? ' ' + kind : '');
  }

  function resizeImageAsync(file, maxDim) {
    return new Promise(function (resolve, reject) {
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return; settled = true; reject(new Error('could not read image'));
      }, 20000);
      try {
        resizeImage(file, maxDim, function (dataUrl) {
          if (settled) return; settled = true; clearTimeout(timer); resolve(dataUrl);
        });
      } catch (e) { if (!settled) { settled = true; clearTimeout(timer); reject(e); } }
    });
  }

  // Upload a client-resized JPEG to Supabase Storage (product-media) via the
  // studio-upload edge function and resolve to its public URL. `dest` is an
  // optional top-level folder: product photos pass none (stored under <handle>/),
  // general site images pass 'site' (stored under site/<sanitized-key>-<ts>.jpg).
  function uploadImage(handleOrKey, filename, dataUrl, dest) {
    var payload = {
      password: PW,
      handle: handleOrKey,
      filename: filename || 'photo.jpg',
      contentType: 'image/jpeg',
      dataBase64: dataUrl
    };
    if (dest) payload.dest = dest;
    return fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.anonKey,
        'Authorization': 'Bearer ' + cfg.anonKey
      },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (!res.ok || !body || !body.url) {
          throw new Error((body && body.error) || ('upload failed (' + res.status + ')'));
        }
        return body.url;
      });
    });
  }
  function uploadPhoto(h, filename, dataUrl) { return uploadImage(h, filename, dataUrl); }

  function pickPhotos(h, slug) {
    if (photoBusy) return;
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.addEventListener('change', function () {
      var files = inp.files ? Array.prototype.slice.call(inp.files) : [];
      if (!files.length) return;
      runPhotoUploads(h, files, slug || '');
    });
    inp.click();
  }

  function runPhotoUploads(h, files, slug) {
    slug = slug || '';
    var arr = currentImages(h, slug);
    var room = MAX_PHOTOS - arr.length;
    if (room <= 0) { photoStatus(slug, 'This colour already has the maximum of ' + MAX_PHOTOS + ' photos.', 'err'); return; }
    if (files.length > room) { files = files.slice(0, room); }

    photoBusy = true;
    var done = 0, failed = 0;

    var chain = Promise.resolve();
    files.forEach(function (file, n) {
      chain = chain.then(function () {
        photoStatus(slug, 'Uploading ' + (n + 1) + ' of ' + files.length + '…', null);
        if (!/^image\//.test(file.type || '')) throw new Error('skip-nonimage');
        return resizeImageAsync(file, 2560).then(function (dataUrl) {
          return uploadPhoto(h, file.name, dataUrl);
        }).then(function (url) {
          var cur = currentImages(h, slug); cur.push(url); setImages(h, cur, slug);
          refreshPhotos();
          done++;
        });
      }).catch(function (e) {
        if (e && e.message === 'skip-nonimage') { failed++; return; }
        failed++;
        photoStatus(slug, 'A photo failed: ' + ((e && e.message) || 'error'), 'err');
      });
    });

    chain.then(function () {
      photoBusy = false;
      if (failed && !done) photoStatus(slug, 'Upload failed. ' + failed + ' photo' + (failed > 1 ? 's' : '') + ' not added.', 'err');
      else if (failed) photoStatus(slug, 'Added ' + done + ', ' + failed + ' failed. Remember to Save.', 'err');
      else photoStatus(slug, 'Added ' + done + ' photo' + (done > 1 ? 's' : '') + '. Remember to Save your changes.', 'ok');
    });
  }

  /* ============================================================
     COMPLETE THE LOOK - per product, owner-picked suggestions.
     Stored at product.<handle>.completeLook as a newline list of handles.
     Empty = the site falls back to its automatic pairing (js/product.js).
     ============================================================ */
  function ctlKeyFor(h) { return 'product.' + h + '.completeLook'; }
  function currentCtl(h) {
    var k = ctlKeyFor(h);
    var raw = (k in pending) ? pending[k] : (saved[k] != null ? saved[k] : '');
    return String(raw || '').split(/[\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function setCtl(h, arr) { setPending(ctlKeyFor(h), arr.join('\n')); }
  function ctlCandidates(h) { return PLIST.filter(function (p) { return p.handle !== h; }); }
  function prodThumb(p) { return (p.images && p.images[0]) || (p.allImages && p.allImages[0]) || ''; }
  function prodName(p) { return (p && p.title) || (p && p.handle) || ''; }

  // build the searchable candidate list only (keeps the search box focus while typing)
  function ctlRowsHTML(h) {
    var chosen = currentCtl(h);
    var q = ctlSearch.trim().toLowerCase();
    var cands = ctlCandidates(h).filter(function (p) {
      return !q || prodName(p).toLowerCase().indexOf(q) >= 0;
    });
    if (!cands.length) return '<div class="ctlnone">No products match.</div>';
    return cands.map(function (p) {
      var on = chosen.indexOf(p.handle) >= 0;
      var disabled = (!on && chosen.length >= CTL_MAX);
      return '<label class="ctlrow' + (disabled ? ' is-disabled' : '') + '">' +
        '<input type="checkbox" data-ctlcb="' + esc(p.handle) + '"' + (on ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' +
        '<img src="' + esc(prodThumb(p)) + '" alt="" loading="lazy">' +
        '<span class="ctlrow__n">' + esc(prodName(p)) + '</span>' +
      '</label>';
    }).join('');
  }
  function renderCtlList(box, h) {
    var listEl = box.querySelector('.ctllist'); if (!listEl) return;
    listEl.innerHTML = ctlRowsHTML(h);
    wireCtlRows(listEl, h);
  }
  function wireCtlRows(listEl, h) {
    listEl.querySelectorAll('[data-ctlcb]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        var hh = cb.getAttribute('data-ctlcb');
        var arr = currentCtl(h);
        var at = arr.indexOf(hh);
        if (cb.checked) { if (at < 0 && arr.length < CTL_MAX) arr.push(hh); }
        else if (at >= 0) { arr.splice(at, 1); }
        setCtl(h, arr);
        renderCtlPicker(h);   // full re-render: chips + count + list all reflect the change
      });
    });
  }
  function renderCtlPicker(h) {
    var box = $('prodCtl'); if (!box) return;
    var chosen = currentCtl(h);
    var chips = chosen.map(function (hh, i) {
      var p = PBYH[hh]; var nm = p ? prodName(p) : hh;
      return '<span class="ctlchip" data-h="' + esc(hh) + '">' +
        '<button type="button" class="ctlchip__mv" data-cmv="left" data-i="' + i + '" title="Move earlier"' + (i === 0 ? ' disabled' : '') + '>◀</button>' +
        '<span class="ctlchip__n">' + (i + 1) + '. ' + esc(nm) + '</span>' +
        '<button type="button" class="ctlchip__mv" data-cmv="right" data-i="' + i + '" title="Move later"' + (i === chosen.length - 1 ? ' disabled' : '') + '>▶</button>' +
        '<button type="button" class="ctlchip__rm" data-crm="' + esc(hh) + '" title="Remove">✕</button>' +
      '</span>';
    }).join('');
    var chipsHTML = chosen.length
      ? '<div class="ctlchips">' + chips + '</div>'
      : '<div class="ctlnone">No suggestions picked. This product shows automatic pairings.</div>';
    var count = '<div class="ctlcount">' + chosen.length + ' of ' + CTL_MAX + ' selected</div>';
    var search = '<input type="text" class="ctlsearch" placeholder="Search products…" value="' + esc(ctlSearch) + '" aria-label="Search products">';
    box.innerHTML = chipsHTML + count + search + '<div class="ctllist">' + ctlRowsHTML(h) + '</div>';

    // chips: reorder + remove
    box.querySelectorAll('.ctlchip__mv').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = parseInt(btn.getAttribute('data-i'), 10);
        var dir = btn.getAttribute('data-cmv');
        var arr = currentCtl(h);
        var j = dir === 'left' ? i - 1 : i + 1;
        if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) return;
        var tmp = arr[j]; arr[j] = arr[i]; arr[i] = tmp;
        setCtl(h, arr); renderCtlPicker(h);
      });
    });
    box.querySelectorAll('.ctlchip__rm').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var hh = btn.getAttribute('data-crm');
        var arr = currentCtl(h);
        var at = arr.indexOf(hh);
        if (at >= 0) { arr.splice(at, 1); setCtl(h, arr); renderCtlPicker(h); }
      });
    });
    // search: re-filter the list only (search box keeps focus)
    var si = box.querySelector('.ctlsearch');
    if (si) si.addEventListener('input', function () { ctlSearch = si.value; renderCtlList(box, h); });
    wireCtlRows(box.querySelector('.ctllist'), h);
  }

  /* ============================================================
     PRODUCT CONTROLS (Best Seller / New / gender / display order)
     ============================================================ */
  function pByHandle(h) { for (var i = 0; i < PLIST.length; i++) { if (PLIST[i].handle === h) return PLIST[i]; } return null; }
  function ctrlOrderVal(h) { var n = parseInt(valOf(ctrlKey(h, 'order')), 10); return isNaN(n) ? 9999 : n; }
  function orderedCtrlHandles() {
    return PLIST.map(function (p) { return p.handle; }).sort(function (a, b) {
      return (ctrlOrderVal(a) - ctrlOrderVal(b)) ||
             (parseInt(CTRL_DEF[ctrlKey(a, 'order')], 10) - parseInt(CTRL_DEF[ctrlKey(b, 'order')], 10));
    });
  }
  function genderRadio(h, val, cur) {
    var label = (val === 'Unisex') ? 'Both' : val;
    return '<label class="pctrl__rad"><input type="radio" name="g-' + esc(h) + '" value="' + val + '"' + (cur === val ? ' checked' : '') + '> ' + label + '</label>';
  }
  function catSelect(cur) {
    var opts = CTRL_CATS.map(function (b) { return '<option value="' + b + '"' + (cur === b ? ' selected' : '') + '>' + b + '</option>'; }).join('');
    return '<span class="pctrl__cat"><span class="pctrl__gender-label">Category</span><select class="pctrl__catSel" aria-label="Shop category">' + opts + '</select></span>';
  }
  function renderControls() {
    var host = $('prodControls'); if (!host) return;
    var handles = orderedCtrlHandles();
    host.innerHTML = handles.map(function (h, idx) {
      var p = pByHandle(h);
      var bs = valOf(ctrlKey(h, 'bestSeller')) === '1';
      var nw = valOf(ctrlKey(h, 'isNew')) === '1';
      var g = valOf(ctrlKey(h, 'gender'));
      var cat = valOf(ctrlKey(h, 'category'));
      var opts = handles.map(function (_h, j) { return '<option value="' + j + '"' + (j === idx ? ' selected' : '') + '>' + (j + 1) + '</option>'; }).join('');
      var nm = esc(p ? p.title : h);
      return '<div class="pctrl" data-h="' + esc(h) + '">' +
        '<div class="pctrl__top">' +
          '<span class="pctrl__pos">' + (idx + 1) + '</span>' +
          '<span class="pctrl__name">' + nm + '</span>' +
          '<span class="pctrl__move">' +
            '<button type="button" data-cmove="up" title="Move up" aria-label="Move ' + nm + ' up"' + (idx === 0 ? ' disabled' : '') + '>▲</button>' +
            '<button type="button" data-cmove="down" title="Move down" aria-label="Move ' + nm + ' down"' + (idx === handles.length - 1 ? ' disabled' : '') + '>▼</button>' +
            '<select class="pctrl__posSel" title="Position" aria-label="Position of ' + nm + '">' + opts + '</select>' +
          '</span>' +
        '</div>' +
        '<div class="pctrl__row">' +
          '<label class="pctrl__tog"><input type="checkbox" data-ctog="bestSeller"' + (bs ? ' checked' : '') + '> Best Sellers</label>' +
          '<label class="pctrl__tog"><input type="checkbox" data-ctog="isNew"' + (nw ? ' checked' : '') + '> New Arrivals</label>' +
          catSelect(cat) +
          '<span class="pctrl__gender"><span class="pctrl__gender-label">Shown in</span>' +
            genderRadio(h, 'Women', g) + genderRadio(h, 'Men', g) + genderRadio(h, 'Unisex', g) +
          '</span>' +
        '</div>' +
      '</div>';
    }).join('');
    wireControls(host);
  }
  function reorderCtrl(fromIdx, toIdx) {
    var handles = orderedCtrlHandles();
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= handles.length || toIdx >= handles.length) { renderControls(); return; }
    var item = handles.splice(fromIdx, 1)[0];
    handles.splice(toIdx, 0, item);
    handles.forEach(function (h, j) { setPending(ctrlKey(h, 'order'), String(j + 1)); });
    renderControls();
  }
  function wireControls(host) {
    host.querySelectorAll('.pctrl').forEach(function (row, idx) {
      var h = row.getAttribute('data-h');
      row.querySelectorAll('[data-ctog]').forEach(function (cb) {
        cb.addEventListener('change', function () { setPending(ctrlKey(h, cb.getAttribute('data-ctog')), cb.checked ? '1' : '0'); });
      });
      row.querySelectorAll('input[type=radio]').forEach(function (rb) {
        rb.addEventListener('change', function () { if (rb.checked) setPending(ctrlKey(h, 'gender'), rb.value); });
      });
      var catSel = row.querySelector('.pctrl__catSel');
      if (catSel) catSel.addEventListener('change', function () { setPending(ctrlKey(h, 'category'), catSel.value); });
      var up = row.querySelector('[data-cmove="up"]'); if (up) up.addEventListener('click', function () { reorderCtrl(idx, idx - 1); });
      var dn = row.querySelector('[data-cmove="down"]'); if (dn) dn.addEventListener('click', function () { reorderCtrl(idx, idx + 1); });
      var sel = row.querySelector('.pctrl__posSel'); if (sel) sel.addEventListener('change', function () { reorderCtrl(idx, parseInt(sel.value, 10)); });
    });
  }

  /* ============================================================
     TOP-LEVEL GROUPS - five collapsible sections, one open at a time.
     ============================================================ */
  var GROUPS = [
    { id: 'home',     title: 'Home Page',        summary: 'Top image, tagline, banners, categories, editorial, newsletter', build: buildHome },
    { id: 'nav',      title: 'Navigation Menus', summary: 'The Women and Men menu posters',                                   build: buildNav },
    { id: 'products', title: 'Products',         summary: 'Order, per-product text, photos, complete the look, shared details', build: buildProducts },
    { id: 'story',    title: 'Our Story',        summary: 'The Our Story page text and images',                               build: buildStory },
    { id: 'footer',   title: 'Footer',           summary: 'Footer text and column headings',                                 build: buildFooter }
  ];

  // render a list of text/image sections into a host
  function renderTextSections(arr, host) {
    arr.forEach(function (sec) {
      var box = document.createElement('div'); box.className = 'sec';
      var html = '<h2>' + esc(sec.title) + '</h2><p class="note">' + esc(sec.note) + '</p>';
      sec.items.forEach(function (f) { html += fieldHTML(f); });
      box.innerHTML = html;
      host.appendChild(box);
    });
  }

  function buildHome(host) { renderTextSections(HOME_SECTIONS, host); }
  function buildNav(host) { renderTextSections(NAV_SECTIONS, host); }
  function buildStory(host) { renderTextSections(ABOUT, host); }
  function buildFooter(host) { renderTextSections(FOOTER, host); }

  function buildProducts(host) {
    // 1) Order & placement (the product controls)
    if (PLIST.length) {
      var cbox = document.createElement('div'); cbox.className = 'sec';
      cbox.innerHTML = '<h2>Order &amp; placement</h2><p class="note">This is what fills the <strong>Women</strong> and <strong>Men</strong> menus. Tick <strong>New Arrivals</strong> or <strong>Best Sellers</strong> to put a product on those pages, and choose which menu it belongs to - <strong>Women</strong>, <strong>Men</strong>, or <strong>Both</strong>. Trending shows New Arrivals and Best Sellers together automatically. Category (Tops / Bottoms / Dresses) sets its Shop-by-Category page. Use the arrows or the number to set the order it appears in.</p><div id="prodControls"></div>';
      host.appendChild(cbox);
    }
    // 2) Edit a product - ONE picker, then text + photos + complete the look
    if (PHANDLES.length) {
      var pbox = document.createElement('div'); pbox.className = 'sec';
      pbox.innerHTML =
        '<h2>Edit a product</h2><p class="note">Choose a product, then edit everything about it - its text, its photos, and the products suggested with it. Changes apply only to the product you pick.</p>' +
        '<div class="field"><label>Product</label><select id="prodPick">' +
          PHANDLES.map(function (h) { return '<option value="' + esc(h) + '"' + (h === curHandle ? ' selected' : '') + '>' + esc(PPROD[h].title || h) + '</option>'; }).join('') +
        '</select></div>' +
        '<h3 class="subhead">Text &amp; details</h3><div id="prodFields"></div>' +
        '<h3 class="subhead">Photos</h3><div id="prodPhotos"></div>' +
        '<h3 class="subhead">Complete the Look</h3>' +
        '<p class="note">Pick the products suggested under this one (2 to 4 works best). If you pick none, the site suggests matching pieces automatically.</p>' +
        '<div id="prodCtl"></div>';
      host.appendChild(pbox);
    }
    // 3) Applies to all products (shared details)
    var sbox = document.createElement('div'); sbox.className = 'sec';
    var shtml = '<h2>Applies to all products</h2><p class="note">These apply to every product page - the Fabric &amp; Care list, the shared fit note, Shipping &amp; Returns, and the shipping line under the buy button.</p>';
    SHARED.forEach(function (f) { shtml += fieldHTML(f); });
    sbox.innerHTML = shtml;
    host.appendChild(sbox);
  }

  function setOpenGroup(id) {
    openGroup = id;
    var root = $('sections');
    root.querySelectorAll('.grp').forEach(function (g) {
      var gid = g.getAttribute('data-grp');
      var on = (gid === id);
      g.setAttribute('data-open', on ? 'true' : 'false');
      var btn = g.querySelector('.grp-head'); if (btn) btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
  }

  function render() {
    var host = $('sections'); host.innerHTML = '';

    GROUPS.forEach(function (grp) {
      var isOpen = (grp.id === openGroup);
      var wrap = document.createElement('div');
      wrap.className = 'grp'; wrap.setAttribute('data-grp', grp.id); wrap.setAttribute('data-open', isOpen ? 'true' : 'false');
      wrap.innerHTML =
        '<button type="button" class="grp-head" data-grptoggle="' + grp.id + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '">' +
          '<span class="grp-title">' + esc(grp.title) + '</span>' +
          '<span class="grp-meta"><span class="grp-summary">' + esc(grp.summary) + '</span><span class="grp-arrow" aria-hidden="true">▸</span></span>' +
        '</button>' +
        '<div class="grp-body"></div>';
      host.appendChild(wrap);
      grp.build(wrap.querySelector('.grp-body'));
    });

    // group open/close: one at a time (click the open one to collapse it)
    host.querySelectorAll('.grp-head').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-grptoggle');
        setOpenGroup(openGroup === id ? null : id);
      });
    });

    // wire every text/image/opens field now in the DOM (product-specific panels wired below)
    wireFields(host);

    // Edit-a-product: picker drives text + photos + complete-the-look
    var pick = $('prodPick');
    if (pick) {
      pick.addEventListener('change', function () {
        curHandle = pick.value; ctlSearch = '';
        renderProdFields(curHandle);
        renderProdPhotos(curHandle);
        renderCtlPicker(curHandle);
      });
      renderProdFields(curHandle);
      renderProdPhotos(curHandle);
      renderCtlPicker(curHandle);
    }
    if (PLIST.length) renderControls();
    refreshSaveBar();
  }

  function setPending(key, val) {
    if ((saved[key] != null ? saved[key] : findDef(key)) === val) delete pending[key];
    else pending[key] = val;
    refreshSaveBar();
  }

  // per-image-field status line (mirrors the product-photo photoStatus flow)
  function imgFieldStatus(key, msg, kind) {
    var el = document.querySelector('[data-imgstatus="' + key + '"]');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'photostatus' + (kind ? ' ' + kind : '');
  }

  // Owner picks a general site image (hero / collection band / editorial / category
  // tiles / menu posters / Our Story). We resize client-side then UPLOAD it to Supabase
  // Storage via the studio-upload edge function and store the returned public URL in
  // cloudskin_content - never an inline base64 data-URI (which bloats the baked snapshot
  // loaded on every page). On failure we surface an error and do NOT fall back to base64.
  function pickImage(key) {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', function () {
      var file = inp.files && inp.files[0]; if (!file) return;
      if (!/^image\//.test(file.type || '')) { imgFieldStatus(key, 'Please choose an image file (JPG or PNG).', 'err'); return; }
      var btn = document.querySelector('[data-pick="' + key + '"]');
      // Per-field guard only: disabling THIS field's button blocks a repeat click on the same
      // image while it uploads. Other image fields stay live, so replacing several images in
      // one session never silently drops a pick (each key/upload is independent).
      if (btn) btn.disabled = true;
      imgFieldStatus(key, 'Uploading…', null);
      resizeImageAsync(file, 2560).then(function (dataUrl) {
        return uploadImage(key, file.name, dataUrl, 'site');
      }).then(function (url) {
        pending[key] = url;
        var t = document.querySelector('[data-thumb="' + key + '"]'); if (t) t.src = url;
        imgFieldStatus(key, 'Image uploaded. Remember to Save your changes.', 'ok');
        if (btn) btn.disabled = false;
        refreshSaveBar();
      }).catch(function (e) {
        imgFieldStatus(key, 'Upload failed: ' + ((e && e.message) || 'error') + '. Please try again.', 'err');
        if (btn) btn.disabled = false;
      });
    });
    inp.click();
  }

  function resizeImage(file, maxDim, cb) {
    var img = new Image();
    img.onload = function () {
      var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      cb(c.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = function () { setStatus('Could not read that image.', false); };
    var fr = new FileReader();
    fr.onload = function (e) { img.src = e.target.result; };
    fr.readAsDataURL(file);
  }

  /* ---- save bar ---- */
  function refreshSaveBar() {
    var n = Object.keys(pending).length;
    $('saveBtn').disabled = n === 0;
    setStatus(n ? (n + ' unsaved change' + (n > 1 ? 's' : '')) : '', false);
  }
  function setStatus(msg, ok) { var s = $('status'); s.textContent = msg; s.className = 'status' + (ok ? ' ok' : ''); }

  $('saveBtn').addEventListener('click', function () {
    var items = {}; Object.keys(pending).forEach(function (k) { items[k] = pending[k]; });
    if (!Object.keys(items).length) return;
    $('saveBtn').disabled = true; setStatus('Saving…', false);
    sb.rpc('studio_save', { p_password: PW, p_items: items }).then(function (r) {
      if (r.error) { setStatus('Save failed - ' + (r.error.message || 'try again'), false); $('saveBtn').disabled = false; return; }
      // Clear only the keys we actually saved (and only if still unchanged), so any edit or
      // image upload that landed DURING this save round-trip is preserved instead of wiped.
      Object.keys(items).forEach(function (k) { saved[k] = items[k]; if (pending[k] === items[k]) delete pending[k]; });
      var left = Object.keys(pending).length;
      setStatus(left ? (left + ' new change' + (left > 1 ? 's' : '') + ' to save - tap Save again') : 'Saved ✓ - refresh your site to see it live', left === 0);
      $('saveBtn').disabled = left === 0;
    });
  });

  $('resetBtn').addEventListener('click', function () {
    if (!Object.keys(pending).length) return;
    pending = {}; render(); setStatus('Changes discarded', false);
  });

  // Warn before leaving only while there are unsaved edits in memory. A clean load
  // (pending empty) and a completed Save (pending cleared above) both leave silently.
  window.addEventListener('beforeunload', function (e) {
    if (!Object.keys(pending).length) return;
    e.preventDefault();
    e.returnValue = '';
    return '';
  });

  /* ============================================================
     "Publish to site" - keep the baked product/site-photo snapshot fresh.
     ------------------------------------------------------------
     "Save changes" writes to Supabase and is live immediately for text/links and
     (via the runtime graceful swap) for photos. The deploy-time snapshot in
     js/content-snapshot.js only re-bakes on a deploy, so a photo replaced AFTER
     the last deploy stays stale in that first-paint snapshot until the site is
     rebuilt. This button triggers a Vercel Deploy Hook (server-side, via the
     password-gated studio-publish edge function - the hook URL is NEVER in client
     JS) which re-runs scripts/bake-content.mjs and refreshes the snapshot.
     It is a DELIBERATE action with a client-side cooldown so it can never storm.
     ============================================================ */
  var PUBLISH_URL = String(cfg.url || '').replace(/\/+$/, '') + '/functions/v1/studio-publish';
  var PUBLISH_COOLDOWN_MS = 90 * 1000;   // at most one rebuild per 90s
  var publishBtn = $('publishBtn');
  if (publishBtn) {
    var startPublishCooldown = function (ms) {
      publishBtn.disabled = true;
      var end = Date.now() + ms;
      try { localStorage.setItem('cs_publish_until', String(end)); } catch (e) {}
      var tick = setInterval(function () {
        var s = Math.ceil((end - Date.now()) / 1000);
        if (s <= 0) { clearInterval(tick); publishBtn.disabled = false; publishBtn.textContent = 'Publish to site'; return; }
        publishBtn.textContent = 'Publish to site (' + s + 's)';
      }, 500);
    };
    // resume a cooldown that survives reloads (blocks a reload-and-click storm)
    (function () {
      var until = 0; try { until = parseInt(localStorage.getItem('cs_publish_until') || '0', 10) || 0; } catch (e) {}
      var left = until - Date.now();
      if (left > 0) startPublishCooldown(left);
    })();
    publishBtn.addEventListener('click', function () {
      if (publishBtn.disabled) return;
      if (!confirm('Publish your latest photos to the live site? This rebuilds the site and can take a minute or two. Your text changes are already live; this is only needed after replacing product or site photos.')) return;
      publishBtn.disabled = true; setStatus('Publishing to your site…', false);
      fetch(PUBLISH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': cfg.anonKey, 'Authorization': 'Bearer ' + cfg.anonKey },
        body: JSON.stringify({ password: PW })
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (!res.ok || !body || !body.ok) {
            var m = (body && body.error) || ('publish failed (' + res.status + ')');
            if (/not configured|deploy hook/i.test(m)) m = 'Publish is not set up yet. Ask your developer to add the Vercel Deploy Hook.';
            else if (/unauthorized/i.test(m)) m = 'Your session expired. Please reload and unlock again.';
            else if (/just started|wait/i.test(m)) m = 'A publish was just started. Please wait a moment before trying again.';
            setStatus(m, false); publishBtn.disabled = false; return;
          }
          setStatus('Publishing started ✓ - your site will refresh in about a minute or two.', true);
          startPublishCooldown(PUBLISH_COOLDOWN_MS);
        });
      }).catch(function () { setStatus('Could not reach the publish service. Please try again.', false); publishBtn.disabled = false; });
    });
  }
})();
