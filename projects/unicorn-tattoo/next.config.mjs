import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// Supabase project origin (CMS reads, storage images, admin auth).
// Env files are loaded before this config is evaluated, so this works in
// build, dev, and start. When unset (fallback builds) the site runs entirely
// on bundled content and the CSP simply omits the origin.
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').origin;
  } catch {
    return '';
  }
})();

const isDev = process.env.NODE_ENV === 'development';

const csp = [
  `default-src 'self'`,
  // Next.js needs inline bootstrap scripts; jsmpeg (hero film) needs WASM.
  // Dev additionally needs eval for react-refresh.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline'`,
  [
    `img-src 'self' data: blob:`,
    'https://*.cdninstagram.com',
    'https://*.fbcdn.net',
    'https://unicorntattoo.gr',
    'https://www.unicorntattoo.gr',
    SUPABASE_ORIGIN
  ]
    .filter(Boolean)
    .join(' '),
  `media-src 'self' blob:`,
  `font-src 'self' data:`,
  [`connect-src 'self'`, SUPABASE_ORIGIN, 'https://feeds.behold.so', isDev ? 'ws:' : '']
    .filter(Boolean)
    .join(' '),
  `worker-src 'self' blob:`,
  `frame-src https://www.google.com`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'self'`
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hide the floating Next.js dev-tools button (dev only; production never shows it)
  devIndicators: false,
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 90, 92],
    remotePatterns: [
      // Instagram CDN (used by the feed fallback / Basic Display media URLs)
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: 'scontent.cdninstagram.com' },
      // WooCommerce product photos on the studio's existing shop
      { protocol: 'https', hostname: 'unicorntattoo.gr' },
      { protocol: 'https', hostname: 'www.unicorntattoo.gr' },
      // Supabase Storage (owner-uploaded CMS images)
      ...(SUPABASE_ORIGIN
        ? [{ protocol: 'https', hostname: new URL(SUPABASE_ORIGIN).hostname }]
        : [])
    ]
  },
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      {
        // The admin panel must never be indexed (it is also absent from the
        // sitemap and carries robots noindex metadata).
        source: '/admin/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]
      },
      { source: '/admin', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }
    ];
  }
};

export default withNextIntl(nextConfig);
