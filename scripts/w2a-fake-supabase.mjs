// Fake Supabase (PostgREST subset + Storage signed URLs) for local tests of the web2app funnel, so `next dev` never
// writes to the real Leo project. In-memory, no network. Run: node scripts/w2a-fake-supabase.mjs [storage dir] (port 3998),
// then start Next with SUPABASE_URL=http://localhost:3998 SUPABASE_SERVICE_ROLE_KEY=fake (env beats .env.local).
// Supports what lib/web2app/server/db.ts sends: insert, PATCH/GET with col=eq.|neq.|in.(…) filters, select, order, limit.
// Storage: POST /storage/v1/object/sign/<bucket>/<path> answers a signed URL when <storage dir>/<bucket>/<path> exists,
// else 400 not_found (like Supabase); GET of that URL serves the file. GET /_dump shows every table.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DIR = process.argv[2] ?? null;
const tables = new Map();
const rows = (t) => tables.get(t) ?? tables.set(t, []).get(t);
const DEFAULTS = {
  web_purchases: { status: "pending", test: false, includes_ebook: false, email_count: 0, redemptions: 0, max_redemptions: 3, code: null, email_sent_at: null, capi_status: null, paid_at: null, provider_ref: null, provider_status: null },
};
const send = (res, s, b) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(b === undefined ? "" : JSON.stringify(b)); };

function filters(q) {
  const out = [];
  for (const [k, v] of q) {
    if (["select", "limit", "order", "offset"].includes(k) || k.includes(".")) continue;
    const i = v.indexOf(".");
    out.push({ col: k, op: v.slice(0, i), val: v.slice(i + 1) });
  }
  return out;
}
const str = (x) => (x === null || x === undefined ? "null" : String(x));
function matches(r, fs_) {
  return fs_.every(({ col, op, val }) => {
    if (op === "eq") return str(r[col]) === val;
    if (op === "neq") return str(r[col]) !== val;
    if (op === "in") return val.replace(/^\(|\)$/g, "").split(",").includes(str(r[col]));
    if (op === "is") return str(r[col]) === val;
    return true;
  });
}

http.createServer(async (req, res) => {
  let body = ""; for await (const c of req) body += c;
  const u = new URL(req.url, "http://x");
  if (u.pathname === "/_dump") return send(res, 200, Object.fromEntries(tables));
  const sign = u.pathname.match(/^\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/);
  if (sign) {
    const file = DIR ? path.join(DIR, decodeURIComponent(sign[1]), decodeURIComponent(sign[2])) : null;
    if (req.method === "POST") {
      if (!file || !fs.existsSync(file)) return send(res, 400, { statusCode: "404", error: "not_found", message: "Object not found" });
      return send(res, 200, { signedURL: `/object/sign/${sign[1]}/${sign[2]}?token=fake` });
    }
    if (!file || !fs.existsSync(file)) return send(res, 400, { statusCode: "404", error: "not_found", message: "Object not found" });
    res.writeHead(200, { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${u.searchParams.get("download") ?? "file.pdf"}"` });
    return res.end(fs.readFileSync(file));
  }
  const m = u.pathname.match(/^\/rest\/v1\/([a-z_]+)$/);
  if (!m) return send(res, 404, { message: u.pathname });
  const t = rows(m[1]);
  const q = [...u.searchParams];
  const f = filters(q);
  if (req.method === "POST") {
    const b = JSON.parse(body || "{}");
    const r = { id: randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...DEFAULTS[m[1]], ...b };
    if (m[1] === "meta_capi_events") return send(res, 201);
    t.push(r);
    return send(res, 201, [r]);
  }
  let hit = t.filter((r) => matches(r, f));
  if (req.method === "PATCH") {
    const b = JSON.parse(body || "{}");
    hit.forEach((r) => Object.assign(r, b));
    return send(res, 200, hit);
  }
  const order = u.searchParams.get("order");
  if (order) {
    const [col, dir] = order.split(".");
    hit = [...hit].sort((a, b) => (str(a[col]) < str(b[col]) ? -1 : 1) * (dir === "desc" ? -1 : 1));
  }
  const limit = Number(u.searchParams.get("limit")) || hit.length;
  return send(res, 200, hit.slice(0, limit));
}).listen(3998, () => console.log("fake supabase on 3998", DIR ? `(storage: ${DIR})` : "(no storage dir: every object is missing)"));
