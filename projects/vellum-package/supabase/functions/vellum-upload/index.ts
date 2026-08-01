import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// VELLUM - editor image uploader (generic house version of the
// production-proven uploader, same guarantees, client-agnostic).
//
// AUTH MODEL: this endpoint does NOT trust a Supabase JWT for authorization.
// It authenticates with the SAME owner password the vellum_auth RPC checks,
// verified server-side via the service role, BEFORE anything is decoded or
// stored. Only on a correct password does it decode the (client-resized)
// image and upload it to the public-READ bucket using the service role
// (which bypasses storage RLS). The bucket has no anon/authenticated write
// policy, so this function is the only write path.
//
// DEPLOY:  supabase functions deploy vellum-upload
//          (keep the default verify_jwt ON; it is an outer shield. The
//          browser client must then send the anon key as both the `apikey`
//          header and `Authorization: Bearer <anon>`, which the house
//          editor frontend already does.)
// ENV:     SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  -> injected by Supabase.
//          VELLUM_BUCKET          (optional, default "site-media"; must match
//                                  the bucket created by 0001_vellum_core.sql)
//          VELLUM_MAX_UPLOAD_MB   (optional, default 8; keep <= the bucket's
//                                  file_size_limit)
//          VELLUM_ALLOWED_ORIGIN  (optional, default "*"; set to the site's
//                                  origin, e.g. https://www.example.com, to
//                                  tighten CORS in production)
//          Set optional ones with: supabase secrets set VELLUM_BUCKET=...
//
// Request  (POST JSON): { password, handle, filename, contentType, dataBase64, dest? }
//   handle : product handle OR (for general site images) a sanitized content key.
//   dest   : OPTIONAL top-level folder. Omitted -> <handle>/<ts>-<file>.
//            "site" -> site/<handle>-<ts>-<file> (general site imagery).
//   The field names are byte-compatible with the proven house editor client.
// Response: 200 { url }  |  400 { error }  |  401 { error }  |  405/500 { error }

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const BUCKET = Deno.env.get("VELLUM_BUCKET") || "site-media";
const MAX_MB_RAW = Number(Deno.env.get("VELLUM_MAX_UPLOAD_MB") || "8");
const MAX_BYTES = (Number.isFinite(MAX_MB_RAW) && MAX_MB_RAW > 0 ? MAX_MB_RAW : 8) * 1024 * 1024;
const ALLOWED_ORIGIN = Deno.env.get("VELLUM_ALLOWED_ORIGIN") || "*";

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const cors: Record<string, string> = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Verify the owner password via the SAME mechanism vellum_auth uses, by
// calling that SECURITY DEFINER RPC with the service role. True only on match.
// The RPC brings the bcrypt check AND the per-IP throttle with it.
async function verifyPassword(password: string): Promise<boolean> {
  if (!password || !SUPABASE_URL || !SERVICE_ROLE) return false;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/vellum_auth`, {
    method: "POST",
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_password: password }),
  });
  if (!res.ok) return false;
  let out: unknown = null;
  try { out = await res.json(); } catch { return false; }
  return out === true;
}

// lowercase, [a-z0-9-] only, collapse repeats, trim dashes; safe as a path segment
function safeHandle(h: string): string {
  return String(h || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

// keep a readable but safe base filename (no directory traversal, no odd chars)
function safeFilename(name: string, ext: string): string {
  let base = String(name || "photo").split(/[\\/]/).pop() || "photo"; // strip any path
  base = base.replace(/\.[^.]+$/, "");                                 // drop original ext
  base = base.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!base) base = "photo";
  return `${base.slice(0, 60)}.${ext}`;
}

// decode standard base64 (tolerates a data: URL prefix) into raw bytes
function decodeBase64(input: string): Uint8Array {
  const comma = input.indexOf(",");
  const b64 = input.startsWith("data:") && comma !== -1 ? input.slice(comma + 1) : input;
  const bin = atob(b64.replace(/\s+/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// light magic-byte sniff so a valid password can't push arbitrary non-image data
function looksLikeImage(b: Uint8Array, contentType: string): boolean {
  if (contentType === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (contentType === "image/png") return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  if (contentType === "image/webp")
    return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
           b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "invalid JSON body" }, 400); }

  // 1) authenticate FIRST; nothing is decoded or stored on a bad password
  const password = String(body.password || "");
  if (!(await verifyPassword(password))) return json({ error: "unauthorized" }, 401);

  // 2) validate input
  const handle = safeHandle(String(body.handle || ""));
  if (!handle) return json({ error: "missing or invalid handle" }, 400);

  const contentType = String(body.contentType || "").toLowerCase().split(";")[0].trim();
  const ext = ALLOWED[contentType];
  if (!ext) return json({ error: "unsupported content type" }, 400);

  const dataBase64 = String(body.dataBase64 || "");
  if (!dataBase64) return json({ error: "missing dataBase64" }, 400);

  let bytes: Uint8Array;
  try { bytes = decodeBase64(dataBase64); } catch { return json({ error: "could not decode image" }, 400); }
  if (bytes.length === 0) return json({ error: "empty image" }, 400);
  if (bytes.length > MAX_BYTES) return json({ error: "image too large" }, 400);
  if (!looksLikeImage(bytes, contentType)) return json({ error: "data is not a valid image" }, 400);

  // 3) upload via the service role (bypasses storage RLS; the only write path).
  // Optional `dest` selects a top-level folder: product photos -> <handle>/<ts>-<file>;
  // general site images pass dest="site" -> site/<handle>-<ts>-<file> (handle is the key).
  const filename = safeFilename(String(body.filename || ""), ext);
  const dest = safeHandle(String(body.dest || ""));
  const path = dest
    ? `${dest}/${handle}-${Date.now()}-${filename}`
    : `${handle}/${Date.now()}-${filename}`;
  const up = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        "Content-Type": contentType,
        "x-upsert": "false",
        "cache-control": "public, max-age=31536000, immutable",
      },
      body: bytes,
    },
  );
  if (!up.ok) {
    const txt = await up.text();
    return json({ error: `upload failed: ${up.status} ${txt}` }, 500);
  }

  const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
  return json({ url });
});
