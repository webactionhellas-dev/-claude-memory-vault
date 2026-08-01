/* ============================================================
   VELLUM - per-site configuration (EXAMPLE)
   ------------------------------------------------------------
   Copy this file to js/vellum.config.js (or your static assets
   folder), fill in the values for THIS site, and include it on
   every editable page BEFORE the applier/editor scripts.

   ONLY PUBLIC values belong here. The anon (publishable) key is
   designed to live in the browser; row-level security plus the
   definer-only RPCs protect the data. NEVER put the service-role
   key, the owner password, or any secret in this file.
   ============================================================ */
window.VELLUM_CFG = {
  /* -- Supabase project (Dashboard -> Project Settings -> API) -- */
  supabaseUrl: "https://YOUR-PROJECT-REF.supabase.co",
  supabaseAnonKey: "PASTE-THE-ANON-PUBLISHABLE-KEY",

  /* -- backend surface (must match 0001_vellum_core.sql + the deployed fn) -- */
  contentTable: "site_content",
  rpc: {
    auth: "vellum_auth",     /* login gate: (p_password) -> boolean            */
    save: "vellum_save",     /* batch upsert: (p_password, p_items jsonb)      */
    del:  "vellum_delete"    /* key removal: (p_password, p_keys text[]) -> n  */
  },
  uploadFunction: "vellum-upload",   /* POST <supabaseUrl>/functions/v1/<name> */
  bucket: "site-media",              /* public-READ bucket the fn writes to    */

  /* -- link-target whitelist --
     [data-content-link] values are only ever applied when they resolve
     through this map. slug -> href. Anything not listed leaves the
     element's built-in href untouched (fail-open, a link never breaks).
     Add one entry per page/collection the owner may point a link at. */
  linkTargets: {
    "__home":  "/",
    "__about": "/about"
    /* "collection": "/collection", "new": "/collection?c=new", ... */
  },

  /* -- pages where the editor may arm (path prefixes, informational for
        the editor chrome; the applier runs wherever it is included) -- */
  editablePages: ["/", "/about"],

  /* -- the owner gate page that arms the editor session -- */
  creatorPath: "/creator",

  /* -- sessionStorage keys of the arming contract (tab-scoped).
        vlm-armed is set ONLY by the creator gate after a successful
        vellum_auth; the editor renders zero chrome without it. -- */
  session: { armed: "vlm-armed", pw: "vlm-pw" },

  /* -- client-side image pipeline (mirrors the proven house defaults) -- */
  image: {
    maxDim: 2560,        /* client resize longest edge before upload   */
    jpegQuality: 0.88,   /* canvas re-encode quality                   */
    maxUploadMb: 8       /* keep equal to VELLUM_MAX_UPLOAD_MB on the fn */
  }
};

/* ============================================================
   APPENDIX - optional frontend keys (vellum-content.js /
   vellum-edit-mode.js / vellum-creator.js). All safe to omit;
   the defaults shown in comments apply. Full reference:
   INTEGRATION.md, "The generic frontend".
   ============================================================ */
window.VELLUM_CFG.siteName = "Example Site";   /* editor bar: "Editing <siteName>" (default: hostname) */
window.VELLUM_CFG.returnPath = "/";            /* where /creator lands after arming (default editablePages[0]) */
window.VELLUM_CFG.revert = "empty";            /* "empty" (save '', applier fail-opens) | "delete" (rpc.del row delete) */
window.VELLUM_CFG.linkLabels = { "__home": "Home", "__about": "Our Story" };
/* window.VELLUM_CFG.linkGroups = [["Pages", ["__home", "__about"]], ["Collections", ["new"]]]; */
/* window.VELLUM_CFG.pageLabels = { "index.html": "Home" };            edits-drawer page names */
/* window.VELLUM_CFG.session.setOnArm = { "site_gate_ok": "1" };       extra keys the gate sets on arm */
/* window.VELLUM_CFG.menuPin = { item: ".nav__item", menu: ".mega" };  hold a hover menu open while editing its poster */

/* -- OPTIONAL product-catalog hooks (commerce sites only; omit entirely
      on a marketing site and every product code path stays off) --
window.VELLUM_CFG.products = {
  list: function () { return window.SITE_PRODUCTS || []; },   // live catalog array (handle/title/category/gender/images)
  cardSelector: ".pcard",              // product card selector
  cardName: ".pcard__name",            // title inside a card
  cardMedia: ".pcard__media",          // badge-preview host inside a card
  orderedContainers: ["#grid"],        // grids/rails that follow catalog order
  curatedContainers: [],               // hand-picked rails the editor must never re-rank
  categories: ["Tops", "Bottoms", "Dresses"],   // merch panel segment ([] hides + skips the key)
  audiences: ["Women", "Men", "Unisex"],        // merch panel segment ([] hides + skips the key)
  audienceLabels: { Unisex: "Both" },
  trendingDefaultOn: false,            // true: Trending is on unless the owner removed it
  manage: null,                        // function (p) -> bool; filters test items from the drawer
  thumbFor: null,                      // function (p) -> url for drawer thumbs
  cardHTML: null,                      // function (p, i) -> card html (enables Complete the Look)
  productUrl: null,                    // function (handle) -> href for "Edit this product's page"
  pdp: {                               // the product page (omit if none)
    root: "#pdp", watch: "#pdpMain", thumbs: "#thumbs", mainImage: "#galImg",
    colourName: "#colorName", handleParam: "handle",
    completeLookRail: "#railCtl", completeLookTitle: "#ctlTitle",
    completeLookMax: 4, maxPhotos: 12,
    textRules: [
      { selector: ".buybox__title", key: "title" },        // -> product.<handle>.title
      { selector: ".buybox__bullets li", key: "features", perIndex: true },
      { selector: ".buybox__ship", sharedKey: "pdp.shipline" }   // shared across every product page
    ]
  }
};
*/
