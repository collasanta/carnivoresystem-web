// Fake Asaas API v3 for local tests of the web2app funnel (docs/web2app.md › Testing). No money, no network.
// Shapes copied from real GET /payments and /pixQrCode responses. Run: node scripts/w2a-fake-asaas.mjs (port 3999),
// then start Next with ASAAS_BASE_URL=http://localhost:3999/v3 ASAAS_API_KEY=aact_fake. Helpers: GET /_set/<pay id>/<STATUS>,
// GET /_log. POST /payments with `callback` answers 400 (like an account without a registered domain).
import http from "node:http";
const customers = [], payments = new Map(); let n = 0;
const log = [];
const send = (res, s, b) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(JSON.stringify(b)); };
http.createServer(async (req, res) => {
  let body = ""; for await (const c of req) body += c;
  const u = new URL(req.url, "http://x"); const p = u.pathname.replace(/^\/v3/, "");
  log.push(`${req.method} ${p} key=${req.headers.access_token?.slice(0,6)} ua=${!!req.headers["user-agent"]}`);
  if (p === "/_log") return send(res, 200, log);
  if (p.startsWith("/_set/")) { const [, , id, st] = p.split("/"); payments.get(id).status = st; return send(res, 200, payments.get(id)); }
  if (!req.headers.access_token?.startsWith("$aact_")) return send(res, 401, { errors: [{ code: "invalid_access_token", description: "bad key" }] });
  if (p === "/customers" && req.method === "GET") { const d = customers.filter(c => c.cpfCnpj === u.searchParams.get("cpfCnpj")); return send(res, 200, { object: "list", hasMore: false, totalCount: d.length, limit: 10, offset: 0, data: d }); }
  if (p === "/customers" && req.method === "POST") { const b = JSON.parse(body); if (!b.cpfCnpj || b.cpfCnpj === "11144477735x") return send(res, 400, { errors: [{ code: "invalid_cpfCnpj", description: "O CPF/CNPJ informado é inválido." }] }); const c = { object: "customer", id: `cus_${++n}`, deleted: false, ...b }; customers.push(c); return send(res, 200, c); }
  if (p === "/payments" && req.method === "POST") {
    const b = JSON.parse(body);
    if (b.callback) return send(res, 400, { errors: [{ code: "invalid_object", description: "O domínio da URL de redirecionamento não é o mesmo cadastrado em seus dados comerciais." }] });
    const id = `pay_${++n}x`; const pay = { object: "payment", id, dateCreated: "2026-10-27", customer: b.customer, value: b.value, netValue: b.value - 1.99, billingType: b.billingType, status: "PENDING", dueDate: b.dueDate, description: b.description, externalReference: b.externalReference, invoiceUrl: `https://www.asaas.com/i/${id}`, deleted: false };
    payments.set(id, pay); return send(res, 200, pay);
  }
  const m = p.match(/^\/payments\/([^/]+)(\/pixQrCode)?$/);
  if (m) { const pay = payments.get(m[1]); if (!pay) return send(res, 404, { errors: [{ code: "not_found", description: "not found" }] });
    if (m[2]) return send(res, 200, { success: true, encodedImage: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", payload: "00020101021226800014br.gov.bcb.pix2558pix.asaas.com/qr/cobv/FAKE5204000053039865802BR6304ABCD", expirationDate: "2027-10-28 23:59:59" });
    if (req.method === "DELETE") { pay.deleted = true; return send(res, 200, { deleted: true, id: pay.id }); }
    return send(res, 200, pay); }
  send(res, 404, { errors: [{ code: "not_found", description: p }] });
}).listen(3999, () => console.log("fake asaas on 3999"));
