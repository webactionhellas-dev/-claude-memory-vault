/* ============================================================
   CLOUDSKIN, Journal (blog) source configuration
   ------------------------------------------------------------
   THE ONE FILE THE CLIENT EDITS to connect their WordPress.

   The Journal at cloudskin.com/blog is HEADLESS: the writing
   team keeps publishing in WordPress (their own tool), and this
   site pulls those posts through the WordPress REST API and
   renders them in the CloudSkin design, on the main domain, so
   the SEO value lands on cloudskin.com (not a WP subdomain).

   TO GO LIVE: set `url` to the WordPress REST base, i.e. the
   site URL with /wp-json/wp/v2 appended. Examples:
       https://blog.cloudskin.com/wp-json/wp/v2
       https://cloudskin.com/wp/wp-json/wp/v2
       https://your-wp-host.com/wp-json/wp/v2
   Leave `url` EMPTY ("") and the Journal shows a small set of
   clearly-labelled SAMPLE posts so the pages never look broken.
   The moment a real `url` is set, real posts replace them, with
   no other change.

   IMPORTANT (production): the WordPress host must also be added
   to the Content-Security-Policy in vercel.json, in BOTH
   `connect-src` (to fetch the JSON) and `img-src` (to load the
   post cover images). See vercel.json for the exact spot.
   ============================================================ */
window.CLOUDSKIN_WP = {
  // WordPress REST base URL (site URL + /wp-json/wp/v2). Empty = sample posts.
  // EasyWP "Cloudskin Journal" (headless source). NOTE: requires WordPress
  // permalinks set to "Post name" (Settings > Permalinks) for this /wp-json
  // path to resolve; until then WP only answers via ?rest_route=.
  url: "https://cloudskin-journal-13d6d4e.ingress-haven.ewp.live/wp-json/wp/v2",

  // How many post cards to show per page on /blog. Numbered pagination
  // (page 1, 2, 3...) handles the rest, so every post is preserved and the
  // page never becomes an endless scroll. The featured story on page 1 is
  // shown in addition to this count.
  perPage: 9,

  // OPTIONAL. If the WordPress install is multilingual with Polylang, set this
  // to the language slug you want on this domain (e.g. "el" or "en") and it is
  // sent as ?lang=. Leave empty for a single-language WordPress. WPML users
  // should instead point `url` at the per-language REST base.
  lang: ""
};
