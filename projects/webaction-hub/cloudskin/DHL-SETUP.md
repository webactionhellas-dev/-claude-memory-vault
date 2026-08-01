# CloudSkin - DHL live tracking (prepared, waiting on DHL approval)

## Current state (2026-07-28)
- App **CloudSkin Tracking** exists on Larissa's DHL developer account (218046) with the
  **Shipment Tracking - Unified** API, Production (Europe), 250 requests/day, API Key + Secret generated.
- The API status is **pending** - DHL has not activated it yet. Until they do, any tracking call is
  rejected, so there is no live feed to show. DHL usually reviews new production tracking access within
  24 to 48 hours.

## What is already built (safe to ship now)
- `supabase/functions/dhl-track/index.ts` - server-side proxy to the DHL Unified tracking API. Keeps the
  key server-side, returns a compact status for the UI, and **degrades gracefully**: if the key is unset,
  the API is still pending, the rate limit is hit, or DHL has no data, it returns `ok:false` and the UI
  keeps the existing Shopify tracking link. It is inert until called, so deploying it early cannot break
  anything.
- `js/dhl-track.js` - the browser helper `CLOUDSKIN.dhlTrack(trackingNumber)`.
- `supabase/.env.example` - documents `DHL_API_KEY` (+ optional `DHL_API_SECRET`, `DHL_TRACK_BASE`).

## Activation (do this the moment DHL flips the API to active)
1. In developer.dhl.com > CloudSkin Tracking app, click **Show key** and copy the **API Key**.
2. Set the Supabase secret (never paste the key into chat or the repo):
   `supabase secrets set DHL_API_KEY=<the key>`  (or add it as a row in the `app_secrets` table).
3. Deploy the function: `supabase functions deploy dhl-track`.
4. Wire the display on the order / account page (keep the Shopify link as the fallback):
   include `js/dhl-track.js`, then
   ```js
   CLOUDSKIN.dhlTrack(trackingNumber).then(function (res) {
     if (res.ok) renderLiveStatus(res.tracking); // res.tracking.status / .statusCode / .estimatedDelivery / .events[]
     // else: leave the existing Shopify tracking link in place
   });
   ```
5. Test with a real DHL tracking number from a shipped order.

## Notes
- The Unified tracking API authenticates with the **API Key** header (`DHL-API-Key`) alone; the API Secret
  is not needed for tracking.
- Until activation, tracking already works the standard way: add the DHL tracking number on the order's
  fulfillment in Shopify and it appears as a live link in the shipping email and the order-status page.
