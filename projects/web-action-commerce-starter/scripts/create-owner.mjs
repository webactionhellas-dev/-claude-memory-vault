// Creates (or promotes) the single owner/admin account.
//   node --env-file=.env scripts/create-owner.mjs <email> <password>
import { createClient } from '@supabase/supabase-js';

const SUPA_URL = process.env.PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(SUPA_URL, SECRET, { auth: { persistSession: false } });

const email = process.argv[2];
const password = process.argv[3];
if (!email || !password) { console.error('usage: create-owner.mjs <email> <password>'); process.exit(1); }

let userId;
const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
if (error) {
  if (/already|exists|registered/i.test(error.message)) {
    // find the existing user and reset their password
    let page = 1, found;
    while (!found) {
      const { data: list } = await sb.auth.admin.listUsers({ page, perPage: 200 });
      if (!list?.users?.length) break;
      found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      page++;
    }
    if (!found) { console.error('User exists but could not be located:', error.message); process.exit(1); }
    userId = found.id;
    await sb.auth.admin.updateUserById(userId, { password, email_confirm: true });
    console.log('Existing user found — password reset.');
  } else {
    console.error('createUser failed:', error.message); process.exit(1);
  }
} else {
  userId = data.user.id;
  console.log('User created.');
}

// Ensure a profile row exists and is flagged admin.
const { error: upErr } = await sb.from('profiles').upsert(
  { id: userId, email, is_admin: true },
  { onConflict: 'id' },
);
if (upErr) { console.error('profiles upsert failed:', upErr.message); process.exit(1); }

console.log(`\nOwner ready ✅\n  email:    ${email}\n  password: ${password}\n  admin:    /admin (sign in at /login)`);
