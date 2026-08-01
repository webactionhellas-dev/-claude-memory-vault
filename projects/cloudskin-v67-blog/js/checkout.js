/* ============================================================
   CLOUDSKIN - custom Stripe checkout (frontend, feature-flagged)
   ------------------------------------------------------------
   Loads AFTER shell.js + shopify.js. When ENABLED, it takes over the
   "Checkout" buttons: it builds cart lines (Shopify variant GIDs), calls the
   create-checkout-session Supabase Edge Function (which re-prices server-side
   in the customer's currency and creates a Stripe Checkout Session), then
   redirects the browser to Stripe. On ANY failure it falls back to the existing
   Shopify hosted checkout so a customer is never dead-ended.

   ACTIVATION (go-live): flip STRIPE_CHECKOUT_ENABLED to true (or set
   window.CLOUDSKIN_CHECKOUT_MODE = "stripe") and redeploy the static site. While
   it is false, this file changes NOTHING: shell.js runs the current Shopify path.
   No Stripe secret is ever used here; the browser only ever calls the edge
   function with the public anon key. All money is decided server-side.
   ============================================================ */
(function () {
  "use strict";
  var C = window.CLOUDSKIN = window.CLOUDSKIN || {};

  /* ---- FEATURE FLAG (default OFF so the live site is unchanged pre-launch) ---- */
  var STRIPE_CHECKOUT_ENABLED = true;

  function enabled() {
    if (window.CLOUDSKIN_CHECKOUT_MODE === "stripe") return true;      // runtime override
    if (window.CLOUDSKIN_CHECKOUT_MODE === "shopify") return false;
    try { if (localStorage.getItem("cloudskin_checkout_test") === "stripe") return true; } catch (e) {}
    return STRIPE_CHECKOUT_ENABLED;
  }

  var SB = window.CLOUDSKIN_SB || {};
  var FN_URL = (SB.url ? SB.url.replace(/\/$/, "") : "") + "/functions/v1/create-checkout-session";

  var CART_KEY = "cloudskin_cart";
  function readCart() { try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch (e) { return []; } }
  function byHandle(h) { return (window.CLOUDSKIN_PRODUCTS || []).find(function (p) { return p.handle === h; }); }

  function setBusy(b) {
    ["#checkoutBtn", "#addBagCheckout"].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) { el.disabled = b; el.classList.toggle("is-busy", b); }
    });
  }

  /* Build the resolvable variant lines from the bag (skips items not yet in
     Shopify, exactly like the existing Shopify path). Returns both shapes:
     stripe = [{variantId, quantity, size}], shopify = [{merchandiseId, quantity}]. */
  function buildLines() {
    var cart = readCart();
    var stripe = [], shopify = [], missing = 0;
    cart.forEach(function (it) {
      var p = byHandle(it.handle);
      var vid = (C.shopify && C.shopify.variantId) ? C.shopify.variantId(it.handle, it.color || (p && p.color), it.size) : null;
      if (vid) {
        stripe.push({ variantId: vid, quantity: it.qty, size: it.size || "" });
        shopify.push({ merchandiseId: vid, quantity: it.qty });
      } else { missing++; }
    });
    return { stripe: stripe, shopify: shopify, missing: missing, count: cart.length };
  }

  function toast(msg) { if (C.toast) C.toast(msg); else if (C.openInfo) C.openInfo(msg); }

  /* Fall back to the live Shopify hosted checkout (unchanged behaviour). */
  async function shopifyFallback(shopifyLines) {
    try {
      if (shopifyLines.length && C.shopify && C.shopify.checkout) {
        var url = await C.shopify.checkout(shopifyLines);
        if (url) { window.location.href = url; return true; }
      }
    } catch (e) { console.warn("[CloudSkin] Shopify fallback failed.", e); }
    return false;
  }

  async function begin() {
    var cart = readCart();
    if (!cart.length) return;
    setBusy(true);
    try {
      if (C.shopify && C.shopify.ready) { try { await C.shopify.ready; } catch (e) {} }
      var lines = buildLines();
      if (!lines.stripe.length) {
        // Nothing resolvable for Stripe: try Shopify, else tell the customer.
        if (!(await shopifyFallback(lines.shopify))) {
          toast((C.t && C.t("checkout.unavailableBody")) || "Checkout is unavailable right now. Please try again.");
        }
        return;
      }

      var payload = { lines: lines.stripe, currency: (C.currency || "EUR") };
      var u = (C.auth && C.auth.user) ? C.auth.user() : null;
      if (u && u.email) payload.email = u.email;

      var res, data;
      try {
        res = await fetch(FN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SB.anonKey || "",
            "Authorization": "Bearer " + (SB.anonKey || "")
          },
          body: JSON.stringify(payload)
        });
        data = await res.json().catch(function () { return {}; });
      } catch (netErr) {
        console.warn("[CloudSkin] Stripe checkout call failed; falling back to Shopify.", netErr);
        await shopifyFallback(lines.shopify);
        return;
      }

      if (res.ok && data && data.url) {
        window.location.href = data.url;   // -> Stripe Checkout (real multi-currency payment)
        return;
      }

      // Server said not-ready / error: fall back to Shopify so no sale is lost.
      console.warn("[CloudSkin] create-checkout-session returned", res.status, data && data.error);
      if (!(await shopifyFallback(lines.shopify))) {
        toast((data && data.error) || (C.t && C.t("checkout.unavailableBody")) || "Checkout is unavailable right now.");
      }
    } finally {
      setBusy(false);
    }
  }

  /* Public hook consumed by shell.js checkout() when the flag is on. */
  C.checkoutStripe = { enabled: enabled, begin: begin };
})();
