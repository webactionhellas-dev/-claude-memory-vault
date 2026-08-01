import { getCms } from '@/lib/cms/data';
import CTAFooterClient from './CTAFooterClient';

/**
 * Server shell: resolves the CMS-managed background photo and booking email
 * (bundled data as fallback) and hands them to the client section. Import
 * sites stay unchanged - every page keeps rendering <CTAFooter />.
 */
export default async function CTAFooter() {
  const cms = await getCms();
  return (
    <CTAFooterClient
      background={cms.backgrounds.cta}
      bookingEmail={cms.locations[0].email}
    />
  );
}
