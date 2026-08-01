/* ============================================================
   CLOUDSKIN - Supabase configuration
   ------------------------------------------------------------
   PASTE YOUR TWO PUBLIC KEYS BELOW (Supabase dashboard →
   Project Settings → API → "Project URL" and "anon public" key).
   The anon key is designed to be public/embedded in the browser;
   row-level security (see supabase/schema.sql) protects the data.
   Until both are filled in, the site runs normally but accounts
   and the /admin dashboard stay in "not configured yet" mode.
   ============================================================ */
window.CLOUDSKIN_SB = {
  url: "https://ocszztflphqsaoyhlerx.supabase.co",          // e.g. "https://abcdefgh.supabase.co"
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jc3p6dGZscGhxc2FveWhsZXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzY3MDUsImV4cCI6MjA5NzQ1MjcwNX0.Ut28lXdx_sv8kXt5FUHc_pDx0gvDQ1rb25PSofhCsu8",      // e.g. "eyJhbGci...."
  adminEmail: "hello@cloudskin.com"   // the only account allowed into /admin
};
