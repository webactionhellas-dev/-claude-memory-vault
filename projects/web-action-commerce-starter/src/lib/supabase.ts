import { createServerClient, createBrowserClient } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

const URL = import.meta.env.PUBLIC_SUPABASE_URL;
const ANON = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

function parseCookies(header: string) {
  return header
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => {
      const i = c.indexOf('=');
      return { name: c.slice(0, i), value: decodeURIComponent(c.slice(i + 1)) };
    });
}

/**
 * Supabase client bound to the current request's cookies — use inside .astro
 * pages and endpoints (`export const prerender = false`) to read the logged-in
 * user and to set the refreshed auth cookies on the response.
 */
export function supabaseServer(cookies: AstroCookies, request: Request) {
  return createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return parseCookies(request.headers.get('cookie') ?? '');
      },
      setAll(list) {
        for (const { name, value, options } of list) {
          cookies.set(name, value, options as Parameters<AstroCookies['set']>[2]);
        }
      },
    },
  });
}

/** Browser client for client-side auth islands (login / signup / account). */
export function supabaseBrowser() {
  return createBrowserClient(URL, ANON);
}
