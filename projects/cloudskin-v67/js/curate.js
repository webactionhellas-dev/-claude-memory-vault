/* ============================================================
   CLOUDSKIN, curation overlay
   The Shopify store carries no tags/product_type, so the sync
   script can't derive the site taxonomy. This file enriches the
   REAL synced catalog (js/products.js) by handle, category,
   gender, sport, fabric, support, badges, ratings, a paired
   lifestyle image and hand-polished copy (two store blurbs were
   mislabelled at source and are corrected here).

   Runs AFTER products.js and BEFORE shell/home/collection/
   product, mutating window.CLOUDSKIN_PRODUCTS in place, so a
   fresh `node tools/sync-shopify.mjs` keeps real prices + photos
   while this curation persists. Keyed by Shopify handle.
   ============================================================ */
(() => {
  "use strict";

  const CURATE = {
    "the-performance-tank": {
      category: "Tops", gender: "Men", activities: ["Padel", "Tennis", "Train"],
      sizes: ["S", "M", "L", "XL"],
      fabric: "Featherweight", bestSeller: true, rating: 4.9, reviewCount: 86,
      life: "img/shoot/padel-serve-black.jpg", lifeAlt: "CloudSkin Performance Tank on the padel court",
      blurb: "A lightweight, quick-drying tank cut for a relaxed line and unrestricted movement, cool and easy from training and competition to everyday, on and off the court."
    },
    "the-performance-tee": {
      category: "Tops", gender: "Men", activities: ["Padel", "Tennis", "Train"],
      sizes: ["S", "M", "L", "XL"],
      fabric: "Featherweight", isNew: true, rating: 4.8, reviewCount: 54,
      life: "img/shoot/padel-serve-white.jpg", lifeAlt: "CloudSkin Performance Tee mid-serve",
      blurb: "A featherweight performance tee in quick-drying fabric with a clean slim line and a subtle metallic back detail. Weightless and breathable, court to street."
    },
    "the-flow-dress": {
      category: "Dresses", gender: "Women", activities: ["Tennis", "Court", "Studio"],
      sizes: ["S", "M", "L"],   /* Founders' Edit size guide */
      fabric: "Signature Performance", bestSeller: true, rating: 5.0, reviewCount: 132,
      life: "img/shoot/villa-pool-black-dress.jpg", lifeAlt: "The Flow Dress at the villa pool",
      blurb: "A lightweight racerback dress with breathable mesh detailing and separate bike shorts with pockets, a fitted top and flowing skirt that moves beautifully with you."
    },
    "the-elevate-cropped-jacket-copy": { /* Drift Cropped Jacket */
      category: "Layers", gender: "Women", activities: ["Court", "Studio", "Lounge"],
      fabric: "Ultra-Light Shell", isNew: true, rating: 4.8, reviewCount: 22,
      life: "img/shoot/villa-white-jacket.jpg", lifeAlt: "The Drift Cropped Jacket, layered at the villa",
      blurb: "An ultra-light cropped jacket with a full-length zip, side pockets and an adjustable drawcord hem, throw it on before, during or after play, worn loose or cinched."
    },
    "the-elevate-cropped-jacket": {
      category: "Layers", gender: "Women", activities: ["Court", "Studio", "Lounge"],
      fabric: "Ultra-Light Shell", rating: 4.9, reviewCount: 31,
      life: "img/shoot/tennis-night-jacket.jpg", lifeAlt: "The Elevate Cropped Jacket on the night court",
      blurb: "A cropped jacket with relaxed batwing sleeves, a high neckline and snap closure, a clean, elevated layer that drapes effortlessly over your court kit and everyday essentials."
    },
    "the-club-quarter-zip": {
      category: "Layers", gender: "Women", activities: ["Padel", "Tennis", "Train"],
      fabric: "Ultra-Light Shell", isNew: true, rating: 4.7, reviewCount: 18,
      life: "img/shoot/villa-scooter-quarterzip.jpg", lifeAlt: "The Club Quarter Zip, styled at the villa",
      blurb: "A slim quarter-zip in breathable performance fabric with textured mesh detailing and four-way stretch, comfortable coverage without compression, on and off the court."
    },
    "the-club-skirt": {
      category: "Skirts", gender: "Women", activities: ["Tennis", "Padel", "Court"],
      fabric: "Textured Mesh", bestSeller: true, rating: 4.9, reviewCount: 97,
      life: "img/shoot/villa-white-skirt-stairs.jpg", lifeAlt: "The Club Skirt on the villa stairs",
      blurb: "A textured-mesh skirt over supportive built-in shorts, with hidden pockets sized for tennis and padel balls, a flattering silhouette with complete freedom of movement."
    },
    "the-foundation-tank": {
      category: "Tops", gender: "Women", activities: ["Studio", "Train", "Court"],
      fabric: "Signature Performance", rating: 4.8, reviewCount: 64,
      life: "img/shoot/villa-yoga-white.jpg", lifeAlt: "The Foundation Tank, built-in support",
      blurb: "A sculpting tank with a built-in medium-support bra and removable padding, a refined, second-skin essential for training, travel and everyday wear."
    },
    "the-court-skirt": {
      category: "Skirts", gender: "Women", activities: ["Tennis", "Padel", "Court"],
      fabric: "Featherweight", bestSeller: true, rating: 4.9, reviewCount: 151,
      life: "img/shoot/villa-black-skirt.jpg", lifeAlt: "The Court Skirt at the villa",
      blurb: "A modern court skirt with a supportive elastic waistband and built-in compression shorts with silicone grip tabs, flattering, secure and quick-drying through every point."
    },
    "the-sculpt-bra": {
      category: "Bras", gender: "Women", activities: ["Train", "Studio", "Court"],
      fabric: "Signature Performance", support: "High", isNew: true, rating: 4.9, reviewCount: 73,
      life: "img/shoot/campaign-black-visor.jpg", lifeAlt: "The Sculpt Bra, high support",
      blurb: "High support without compromise. Built-in padded cups, a supportive racerback and breathable perforated detailing in signature sculpting fabric, secure through every movement."
    },
    "the-signature-skirtt": { /* Signature Skirt */
      category: "Skirts", gender: "Women", activities: ["Tennis", "Court"],
      fabric: "Textured Mesh", bestSeller: true, rating: 5.0, reviewCount: 118,
      life: "img/shoot/villa-flowers-black.jpg", lifeAlt: "The Signature Skirt, layered pleats",
      blurb: "A layered court skirt on a premium nylon-Lycra waistband with built-in shorts and discreet ball pockets, refined, feminine and sleek through every movement."
    },
    "the-signature-bra": {
      category: "Bras", gender: "Women", activities: ["Studio", "Tennis", "Court"],
      fabric: "Signature Performance", support: "Medium", rating: 4.8, reviewCount: 89,
      life: "img/shoot/campaign-white-pool.jpg", lifeAlt: "The Signature Bra, second-skin support",
      blurb: "A racerback bra in signature sculpting fabric with breathable mesh, removable padding and medium-to-high support, a smooth, second-skin feel from court to gym."
    },
    "the-form-bra": {
      category: "Bras", gender: "Women", activities: ["Train", "Studio", "Court"],
      fabric: "Signature Performance", support: "Medium", isNew: true, rating: 4.8, reviewCount: 14,
      life: "img/founders/look-4.jpg", lifeAlt: "The Form Bra, Founders' Edit in Cloud White",
      blurb: "Effortless support, elevated comfort. Built-in padded cups and a clean, body-contouring silhouette deliver medium support that moves with you, from training and court sessions to studio and everyday."
    },
    "the-ace-dress": {
      category: "Dresses", gender: "Women", activities: ["Tennis", "Court", "Studio"],
      sizes: ["S", "M", "L"],   /* Founders' Edit size guide */
      fabric: "Signature Performance", isNew: true, rating: 4.9, reviewCount: 21,
      life: "img/founders/look-2.jpg", lifeAlt: "The Ace Dress, Founders' Edit in Cloud White",
      blurb: "A refined court-to-club dress with a sculpting silhouette, contrast piping and a structured high neckline with front zip. Built-in bra with removable cups and shorts with side pockets, polished and effortlessly versatile."
    },
    "the-performance-shorts": {
      category: "Shorts", gender: "Men", activities: ["Padel", "Tennis", "Train"],
      sizes: ["S", "M", "L", "XL"],
      fabric: "Featherweight", isNew: true, rating: 4.8, reviewCount: 12,
      life: "img/shoot/padel-serve-black.jpg", lifeAlt: "The Performance Shorts on court",
      blurb: "A lightweight, quick-drying short with a streamlined athletic cut. An elastic waistband with adjustable drawcord and functional side pockets keep it secure and easy, court to everyday."
    }
  };

  const list = window.CLOUDSKIN_PRODUCTS || [];
  list.forEach(p => {
    const c = CURATE[p.handle];
    if (!c) return;
    ["category", "gender", "fabric", "support", "rating", "reviewCount", "blurb", "sizes"].forEach(k => {
      if (c[k] !== undefined) p[k] = c[k];
    });
    if (c.activities) p.activities = c.activities;
    if (c.bestSeller) p.bestSeller = true;
    if (c.isNew) p.isNew = true;
    // badge the card factory reads (New wins over Best Seller)
    p.badge = p.isNew ? "New" : p.bestSeller ? "Best Seller" : null;
    // pair a lifestyle frame into the PDP gallery (product shots first)
    if (c.life) {
      p.life = c.life; p.lifeAlt = c.lifeAlt || (p.title + " lifestyle");
      const all = (p.allImages && p.allImages.length ? p.allImages : p.images).slice();
      if (!all.includes(c.life)) all.push(c.life);
      p.allImages = all;
    }
    // Card hover keeps the product's OWN image. We used to swap to a generic
    // lifestyle photo here, but several products shared the same one, so hovering
    // different cards flashed the same unrelated shot (looked random). A real
    // second product photo, when the catalog has one, still drives the hover.
  });

  // Available colourways = colours that actually have a DISTINCT product photo (colours map to
  // /shopify/ shots by index). The card, PDP and filter UI use p.availColors so a product is
  // never offered in a colour we can't show.
  list.forEach(p => {
    const shots = ((p.allImages && p.allImages.length ? p.allImages : p.images) || []).filter(s => s.includes("/shopify/"));
    const distinct = shots.filter((s, i) => shots.indexOf(s) === i);
    const cols = (p.colors && p.colors.length ? p.colors : [p.color]).filter(Boolean);
    p.availColors = cols.filter((c, i) => i < Math.max(1, distinct.length));
  });

  // Stable display order: hero categories first, best sellers up top.
  const order = ["Skirts", "Dresses", "Bras", "Tops", "Layers"];
  list.sort((a, b) => {
    const bs = (b.bestSeller ? 1 : 0) - (a.bestSeller ? 1 : 0);
    if (bs) return bs;
    return order.indexOf(a.category) - order.indexOf(b.category);
  });
})();
