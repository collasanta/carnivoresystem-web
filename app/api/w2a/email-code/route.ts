import { eq, selectOne, update } from "@/lib/web2app/server/db";
import { emailConfigured, sendCodeEmail } from "@/lib/web2app/server/email";
import type { PurchaseRow } from "@/lib/web2app/server/fulfill";
import { EMAIL, json, originOf, str } from "@/lib/web2app/server/http";

const MAX_SENDS = 5;

/**
 * POST /api/w2a/email-code {pid, t, email?} — (re)send the code e-mail from the success page. `email` fixes a typo:
 * the purchase's address is updated. At most 5 sends per purchase.
 */
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ error: "json" }, 400);
  }
  const pid = str(b.pid, 40) ?? "";
  const t = str(b.t, 100) ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(pid) || !t) return json({ error: "purchase" }, 400);
  if (!emailConfigured()) return json({ ok: false, error: "not_configured" });
  const p = await selectOne<PurchaseRow>("web_purchases", eq("id", pid));
  if (!p || p.access_token !== t) return json({ error: "purchase" }, 404);
  if (p.status !== "paid" || !p.code) return json({ error: "unpaid" }, 409);
  if (p.email_count >= MAX_SENDS) return json({ ok: false, error: "limit" }, 429);
  const to = str(b.email, 254)?.toLowerCase() ?? p.email;
  if (!EMAIL.test(to)) return json({ error: "email" }, 400);
  const lead = p.lead_id ? await selectOne<{ name: string | null }>("web_leads", eq("id", p.lead_id), "name").catch(() => null) : null;
  const r = await sendCodeEmail({ to, code: p.code, plan: p.plan, amountCents: p.amount_cents, name: lead?.name, origin: originOf(req), test: p.test });
  if (!r.ok) {
    console.error("[w2a/email-code]", r.error);
    return json({ ok: false, error: "send_failed" }, 502);
  }
  await update("web_purchases", eq("id", p.id), { email: to, email_sent_at: new Date().toISOString(), email_count: p.email_count + 1 });
  return json({ ok: true, email: to });
}
