// Central store mode config.
//
// Setting SHOPIFY_STORE_URL puts the store in **headless-Shopify mode**:
//   • the catalog is synced FROM Shopify (Shopify is the source of truth),
//   • checkout hands off to Shopify's hosted cart,
//   • our admin product editing is READ-ONLY (so a nightly sync can't fight
//     manual edits, and staff keep working in Shopify).
// Leaving it empty = standalone mode (our Supabase + Stripe own everything),
// which is how the template ships for non-Shopify clients.
export const SHOPIFY_STORE_URL = (import.meta.env.SHOPIFY_STORE_URL || '').replace(/\/+$/, '');
export const SHOPIFY_MANAGED = SHOPIFY_STORE_URL.length > 0;

// Full self-service admin editing (create products, edit price, set sales, stock)
// is normally OFF in Shopify-managed mode. Set ADMIN_EDITABLE=true to unlock it
// while migrating the backend off Shopify — the owner then manages everything in
// this admin. Defaults to editable whenever the store is not Shopify-managed.
export const ADMIN_EDITABLE =
  import.meta.env.ADMIN_EDITABLE === 'true' || !SHOPIFY_MANAGED;

/** The store base URL to build Shopify cart permalinks against. */
export const shopifyStoreUrl = (): string => SHOPIFY_STORE_URL || 'https://drip.store';
