import { planById } from "@/lib/web2app/plans";
import { getProvider } from "@/lib/web2app/payments";
import { eq, insert, selectOne, update } from "@/lib/web2app/server/db";
import { newAccessToken } from "@/lib/web2app/server/fulfill";
import { FBC_RE, FBP_RE, clientIp, json, match, originOf, str, userAgent } from "@/lib/web2app/server/http";

/**
 * POST /api/w2a/checkout {leadId, plan, fbc?, fbp?} — creates the purchase (pending) and asks the active payment
 * provider for a checkout. Answers {purchaseId, token, action} where action is a redirect URL or a Pix QR
 * (lib/web2app/payments/types.ts). The price always comes from lib/web2app/plans.ts, never from the browser.
 */
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ error: "json" }, 400);
  }
  const plan = planById(String(b.plan ?? ""));
  if (!plan) return json({ error: "plan" }, 400);
  const leadId = str(b.leadId, 40);
  if (!leadId || !/^[0-9a-f-]{36}$/i.test(leadId)) return json({ error: "lead" }, 400);
  const provider = getProvider();
  if (!provider) return json({ error: "payments_unavailable" }, 503);

  try {
    const lead = await selectOne<{ id: string; email: string; name: string | null; fbc: string | null; fbp: string | null }>("web_leads", eq("id", leadId), "id,email,name,fbc,fbp");
    if (!lead) return json({ error: "lead" }, 404);
    const token = newAccessToken();
    const purchase = await insert<{ id: string }>("web_purchases", {
      lead_id: lead.id,
      email: lead.email,
      plan: plan.id,
      period_months: plan.periodMonths,
      amount_cents: plan.priceCents,
      currency: plan.currency,
      provider: provider.id,
      status: "pending",
      test: provider.test,
      access_token: token,
      fbc: match(b.fbc, FBC_RE) ?? lead.fbc,
      fbp: match(b.fbp, FBP_RE) ?? lead.fbp,
      client_ip: clientIp(req),
      user_agent: userAgent(req),
    });
    const origin = originOf(req);
    const action = await provider.createCheckout({
      purchaseId: purchase.id,
      accessToken: token,
      plan,
      email: lead.email,
      name: lead.name ?? undefined,
      successUrl: `${origin}/quiz/sucesso?pid=${purchase.id}&t=${token}`,
      cancelUrl: `${origin}/quiz/oferta`,
      webhookUrl: `${origin}/api/w2a/webhook/${provider.id}`,
      clientIp: clientIp(req) ?? undefined,
      userAgent: userAgent(req) ?? undefined,
    });
    if (action.providerRef) await update("web_purchases", eq("id", purchase.id), { provider_ref: action.providerRef });
    return json({ purchaseId: purchase.id, token, test: provider.test, action });
  } catch (e) {
    console.error("[w2a/checkout]", e);
    return json({ error: "server" }, 500);
  }
}
