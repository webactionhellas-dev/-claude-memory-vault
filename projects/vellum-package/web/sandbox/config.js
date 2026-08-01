/* Vellum sandbox site config (EXAMPLE.html + about.html: marketing site,
   NO products). Served at /vellum.config.js by sandbox/serve.mjs. The
   supabaseUrl/key are inert placeholders: sandbox/mock-backend.js stubs
   the client and the upload fetch, so nothing leaves the page. */
window.VELLUM_CFG = {
  supabaseUrl: "https://sandbox.invalid",
  supabaseAnonKey: "sandbox-anon-key",

  contentTable: "site_content",
  rpc: { auth: "vellum_auth", save: "vellum_save", del: "vellum_delete" },
  uploadFunction: "vellum-upload",
  bucket: "site-media",

  siteName: "Example Atelier",

  linkTargets: {
    "__home":  "/EXAMPLE.html",
    "__about": "/about.html"
  },
  linkLabels: { "__home": "Home", "__about": "Our Story" },

  editablePages: ["/EXAMPLE.html", "/about.html"],
  creatorPath: "/creator",
  returnPath: "/EXAMPLE.html",

  revert: "empty",   // the byte-compatible default: revert saves '' and the applier fail-opens

  session: { armed: "vlm-armed", pw: "vlm-pw" },

  image: { maxDim: 2560, jpegQuality: 0.88, maxUploadMb: 8 }
};
