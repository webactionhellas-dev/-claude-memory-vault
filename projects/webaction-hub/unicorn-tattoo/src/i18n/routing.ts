import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['el', 'en'],
  defaultLocale: 'el',
  // Greek lives at `/`, English at `/en` - clean URLs, no `/el` prefix.
  localePrefix: 'as-needed'
});

export type Locale = (typeof routing.locales)[number];
