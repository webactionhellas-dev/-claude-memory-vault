/* Vellum sandbox site config for products.html: the SAME backend surface,
   plus the optional product-catalog hooks so the merchandising layer can
   be smoke-tested (cards, panel, order, drawer). */
window.VELLUM_CFG = {
  supabaseUrl: "https://sandbox.invalid",
  supabaseAnonKey: "sandbox-anon-key",

  contentTable: "site_content",
  rpc: { auth: "vellum_auth", save: "vellum_save", del: "vellum_delete" },
  uploadFunction: "vellum-upload",
  bucket: "site-media",

  siteName: "Example Shop",

  linkTargets: { "__home": "/EXAMPLE.html", "__about": "/about.html" },
  linkLabels: { "__home": "Home", "__about": "Our Story" },
  editablePages: ["/sandbox/products.html"],
  creatorPath: "/creator",
  returnPath: "/sandbox/products.html",
  revert: "empty",
  session: { armed: "vlm-armed", pw: "vlm-pw" },
  image: { maxDim: 2560, jpegQuality: 0.88, maxUploadMb: 8 },

  /* ---- the optional product-catalog hooks ---- */
  products: {
    list: function () { return window.SITE_PRODUCTS || []; },
    cardSelector: ".pcard",
    cardName: ".pcard__name",
    cardMedia: ".pcard__media",
    orderedContainers: ["#grid"],
    curatedContainers: [],
    categories: ["Tops", "Bottoms", "Dresses"],
    audiences: ["Women", "Men", "Unisex"],
    audienceLabels: { Unisex: "Both" },
    trendingDefaultOn: false,
    productUrl: null
    /* no pdp block: the PDP/gallery/Complete-the-Look layer stays off */
  }
};
