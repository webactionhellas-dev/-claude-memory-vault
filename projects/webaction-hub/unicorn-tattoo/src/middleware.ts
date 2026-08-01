import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match everything except API routes, the admin panel (unlocalized, noindex),
  // Next internals, and static files.
  matcher: ['/((?!api|admin|_next|_vercel|.*\\..*).*)']
};
