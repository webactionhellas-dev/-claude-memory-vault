/* CLOUDSKIN - live DHL tracking (progressive enhancement).
   Calls the dhl-track edge function to show real-time DHL status wherever an order has a
   tracking number. If the function returns ok:false (no key set, the DHL API still pending
   approval, rate limited, or no data yet) the page keeps the existing Shopify tracking link,
   so the customer ALWAYS has a path. Nothing here runs unless a caller asks for a number, so
   it is inert until wired + the DHL API is live.

   Wire (account / order page), keeping the Shopify link as the fallback:
     CLOUDSKIN.dhlTrack(trackingNumber).then(function (res) {
       if (res.ok) renderLiveStatus(res.tracking);   // res.tracking.status, .statusCode, .estimatedDelivery, .events[]
       // else: leave the existing Shopify tracking link in place
     });
*/
(function () {
  "use strict";
  var C = window.CLOUDSKIN || (window.CLOUDSKIN = {});
  var SB = window.CLOUDSKIN_SB || {};

  C.dhlTrack = function (trackingNumber, opts) {
    opts = opts || {};
    trackingNumber = String(trackingNumber || "").trim();
    if (!SB.url || !trackingNumber) return Promise.resolve({ ok: false, reason: "no_input" });
    return fetch(SB.url.replace(/\/$/, "") + "/functions/v1/dhl-track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SB.anonKey || "",
        Authorization: "Bearer " + (SB.anonKey || ""),
      },
      body: JSON.stringify({
        trackingNumber: trackingNumber,
        service: opts.service || "",
        language: (C.getLang && C.getLang()) || document.documentElement.lang || "en",
      }),
    })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, reason: "network" }; });
  };
})();
