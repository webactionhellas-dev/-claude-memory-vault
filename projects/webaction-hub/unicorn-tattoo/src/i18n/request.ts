import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { getMessageOverrides } from '@/lib/cms/data';
import { applyOverrides, type MessageTree } from '@/lib/cms/flatten';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale =
    requested && (routing.locales as readonly string[]).includes(requested)
      ? requested
      : routing.defaultLocale;

  // Bundled JSON is the always-working base; CMS overrides (cached, short
  // timeout, empty on any failure) are deep-merged on top. DB wins per key.
  const bundled = (await import(`../messages/${locale}.json`)).default as MessageTree;
  const overrides = await getMessageOverrides(locale);

  return {
    locale,
    messages:
      Object.keys(overrides).length > 0 ? applyOverrides(bundled, overrides) : bundled
  };
});
