/* ============================================================
   CLOUDSKIN - Shopify Storefront API client (headless connection)
   Loads AFTER products.js. Fetches live products (prices, variant
   IDs, availability) from the client's Shopify store and powers a
   real cart → Shopify-hosted checkout. The custom site stays the
   frontend; Shopify owns cart/checkout/payments/orders.
   Public Storefront tokens are designed to be embedded client-side.
   ============================================================ */
(function () {
  "use strict";
  const C = window.CLOUDSKIN = window.CLOUDSKIN || {};

  const CFG = {
    domain: "rta3sf-47.myshopify.com",
    token: "54674b6ccdc6cdd3817ee38afd8db4aa",   // public Storefront access token
    version: "2025-01"
  };
  const ENDPOINT = "https://" + CFG.domain + "/api/" + CFG.version + "/graphql.json";

  /* --- option normalisation: site uses "White Mist"; Shopify uses "White" --- */
  function normColor(c) {
    const s = String(c || "").trim().toLowerCase();
    if (s === "white mist") return "white";
    return s;
  }
  const normSize = (s) => String(s || "").trim().toUpperCase();
  const vkey = (color, size) => normColor(color) + "|" + normSize(size);

  async function gql(query, variables) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": CFG.token
      },
      body: JSON.stringify({ query, variables: variables || {} })
    });
    if (!res.ok) throw new Error("Storefront API HTTP " + res.status);
    const json = await res.json();
    if (json.errors) throw new Error("Storefront API: " + JSON.stringify(json.errors));
    return json.data;
  }

  const PRODUCTS_Q = "{ products(first: 100) { edges { node {" +
    " handle title" +
    " priceRange { minVariantPrice { amount } }" +
    " featuredImage { url }" +
    " images(first: 12) { edges { node { url } } }" +
    " variants(first: 100) { edges { node {" +
    "   id availableForSale price { amount } selectedOptions { name value } image { url }" +
    " } } }" +
    " } } } }";

  /* map[handle] = { price:Number(EUR), variants:{ 'color|size': {id,price,available} },
     images:[url,...], featured:url, colorImages:{ normColor: url } } */
  const map = Object.create(null);

  function ingest(data) {
    (data.products.edges || []).forEach(function (e) {
      const n = e.node;
      const entry = {
        price: parseFloat(n.priceRange.minVariantPrice.amount),
        variants: {},
        featured: (n.featuredImage && n.featuredImage.url) || null,
        images: ((n.images && n.images.edges) || []).map(function (ie) { return ie.node.url; }),
        colorImages: {}
      };
      (n.variants.edges || []).forEach(function (ve) {
        const v = ve.node;
        let color = "", size = "";
        (v.selectedOptions || []).forEach(function (o) {
          if (/colou?r/i.test(o.name)) color = o.value;
          else if (/size/i.test(o.name)) size = o.value;
        });
        entry.variants[vkey(color, size)] = {
          id: v.id,
          price: parseFloat(v.price.amount),
          available: !!v.availableForSale
        };
        // each colour variant carries its own product photo in Shopify → clean colour→image map
        if (v.image && v.image.url && color) entry.colorImages[normColor(color)] = v.image.url;
      });
      map[n.handle] = entry;
    });
  }

  /* Shopify = source of truth for price: overwrite local catalog prices. */
  function patchPrices() {
    (window.CLOUDSKIN_PRODUCTS || []).forEach(function (p) {
      const e = map[p.handle];
      if (e && isFinite(e.price)) p.price = e.price;
    });
  }

  /* Shopify = source of truth for product PHOTOS. We ADD live image data onto the
     catalog (never destroy the local fallback) so the owner can add angles in
     Shopify -> product -> Media and they appear here with no redeploy. Consumers
     (product gallery, cards) PREFER p.shopifyImages when present and fall back to
     the bundled local images if Shopify is unreachable. Fail-open by design. */
  function patchImages() {
    (window.CLOUDSKIN_PRODUCTS || []).forEach(function (p) {
      const e = map[p.handle];
      if (!e || !e.images || !e.images.length) return;   // no live images -> keep local look
      p.shopifyImages = e.images.slice();
      p.shopifyColorImages = e.colorImages || {};
      p.shopifyFeatured = e.featured || e.images[0];
    });
  }

  C.shopify = {
    cfg: CFG,
    ready: null,
    loaded: false,
    map: map,
    /* resolve a Shopify variant id from handle + colour + size, with graceful fallbacks */
    variantId: function (handle, color, size) {
      const e = map[handle];
      if (!e) return null;
      const exact = e.variants[vkey(color, size)];
      if (exact) return exact.id;
      // no exact colour+size match → prefer an IN-STOCK variant, keeping the size if we can
      const sz = normSize(size);
      const pick = function (keys) {
        for (var i = 0; i < keys.length; i++) { if (e.variants[keys[i]].available) return e.variants[keys[i]].id; }
        return keys.length ? e.variants[keys[0]].id : null;   // nothing in stock → first, so checkout can report it
      };
      const bySize = Object.keys(e.variants).filter(function (k) { return k.split("|")[1] === sz; });
      if (bySize.length) return pick(bySize);
      return pick(Object.keys(e.variants));
    },
    price: function (handle) { const e = map[handle]; return e ? e.price : null; },
    /* PRECISE availability: false ONLY when the exact variant is known out of stock.
       Unknown product/variant → true (fail-open: never block a sale we can't verify). */
    available: function (handle, color, size) {
      const e = map[handle]; if (!e) return true;
      const v = e.variants[vkey(color, size)];
      return v ? v.available : true;
    },
    /* is ANY variant of this product purchasable? (product-level SEO / badges) */
    anyAvailable: function (handle) {
      const e = map[handle]; if (!e) return true;
      const ks = Object.keys(e.variants);
      return ks.length ? ks.some(function (k) { return e.variants[k].available; }) : true;
    },
    inStore: function (handle) { return !!map[handle]; },
    /* live product images (Shopify Media) for a handle; [] if unknown */
    images: function (handle) { const e = map[handle]; return (e && e.images) ? e.images.slice() : []; },
    /* the Shopify photo assigned to a colour variant, or null */
    colorImage: function (handle, color) { const e = map[handle]; return (e && e.colorImages) ? (e.colorImages[normColor(color)] || null) : null; },
    /* build a Shopify cart and return the hosted-checkout URL.
       lines: [{ merchandiseId, quantity }] */
    checkout: async function (lines) {
      const data = await gql(
        "mutation($lines:[CartLineInput!]!){ cartCreate(input:{lines:$lines}){" +
        " cart{ checkoutUrl } userErrors{ field message } } }",
        { lines: lines }
      );
      const cc = data.cartCreate;
      if (cc.userErrors && cc.userErrors.length) {
        throw new Error(cc.userErrors.map(function (u) { return u.message; }).join("; "));
      }
      return cc.cart && cc.cart.checkoutUrl;
    }
  };

  C.shopify.ready = gql(PRODUCTS_Q).then(function (d) {
    ingest(d);
    patchPrices();
    patchImages();
    C.shopify.loaded = true;
    try { document.dispatchEvent(new CustomEvent("cloudskin:shopify-ready")); } catch (e) {}
    return map;
  }).catch(function (err) {
    console.warn("[CloudSkin] Shopify Storefront load failed, using local prices; checkout may be unavailable.", err);
    return null;
  });
})();
