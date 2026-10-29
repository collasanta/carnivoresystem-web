import { cpfDigits, isValidCpf } from "@/lib/web2app/cpf";
import { timingSafeEqual } from "node:crypto";
import { TEST_PLAN, planById } from "@/lib/web2app/plans";
import { getProvider, providerById } from "@/lib/web2app/payments";
import type { PayMethod } from "@/lib/web2app/payments/types";
import { deviceFromUa } from "@/lib/web2app/device";
import { eq, insert, selectOne, update } from "@/lib/web2app/server/db";
import { newAccessToken, type PurchaseRow } from "@/lib/web2app/server/fulfill";
import { FBC_RE, FBP_RE, clientIp, json, match, originOf, str, userAgent } from "@/lib/web2app/server/http";

/**
 * POST /api/w2a/checkout {leadId, plan, method?, cpf?, replace?: {pid, t}, fbc?, fbp?} — creates the purchase (pending)
 * and asks the active payment provider for a checkout. `method` (pix | card) and `cpf` are required by providers that
 * declare them (Asaas). `replace` = the buyer's previous unpaid purchase (expired Pix, refused card): its charge is
 * canceled at the gateway so it can't be paid twice. The CPF is forwarded to the gateway only, never stored. Answers {purchaseId, token, action} where action is a redirect URL or a Pix QR
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
  if (!plan || (plan.id === TEST_PLAN.id && !isTestRequest(req))) return json({ error: "plan" }, 400);
  const leadId = str(b.leadId, 40);
  if (!leadId || !/^[0-9a-f-]{36}$/i.test(leadId)) return json({ error: "lead" }, 400);
  const provider = getProvider();
  if (!provider) return json({ error: "payments_unavailable" }, 503);
  let method: PayMethod | undefined;
  if (provider.methods?.length) {
    method = provider.methods.find((m) => m === b.method);
    if (!method) return json({ error: "method" }, 400);
  }
  const cpf = typeof b.cpf === "string" ? cpfDigits(b.cpf) : "";
  if (provider.needsCpf && !isValidCpf(cpf)) return json({ error: "cpf" }, 400);

  try {
    const lead = await selectOne<{ id: string; email: string; name: string | null; fbc: string | null; fbp: string | null }>("web_leads", eq("id", leadId), "id,email,name,fbc,fbp");
    if (!lead) return json({ error: "lead" }, 404);
    await cancelPrevious(b.replace, lead.id);
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
      test: provider.test || plan.id === TEST_PLAN.id,
      access_token: token,
      fbc: match(b.fbc, FBC_RE) ?? lead.fbc,
      fbp: match(b.fbp, FBP_RE) ?? lead.fbp,
      client_ip: clientIp(req),
      user_agent: userAgent(req),
      platform: deviceFromUa(userAgent(req) ?? ""),
    });
    const origin = originOf(req);
    let action;
    try {
      action = await provider.createCheckout({
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
        method,
        cpf: provider.needsCpf ? cpf : undefined,
      });
    } catch (e) {
      await update("web_purchases", eq("id", purchase.id), { status: "canceled", provider_status: "checkout_error" }).catch(() => {});
      const msg = String((e as Error)?.message ?? e);
      if (/cpf|cpfCnpj/i.test(msg)) return json({ error: "cpf" }, 400);
      throw e;
    }
    if (action.providerRef) await update("web_purchases", eq("id", purchase.id), { provider_ref: action.providerRef });
    return json({ purchaseId: purchase.id, token, test: provider.test, action });
  } catch (e) {
    console.error("[w2a/checkout]", e);
    return json({ error: "server" }, 500);
  }
}

/** The hidden R$ 5 test plan needs the header `x-w2a-test` = ASAAS_WEBHOOK_TOKEN. */
function isTestRequest(req: Request) {
  const want = process.env.ASAAS_WEBHOOK_TOKEN ?? "";
  const got = req.headers.get("x-w2a-test") ?? "";
  const a = Buffer.from(got), b = Buffer.from(want);
  return want.length >= 32 && a.length === b.length && timingSafeEqual(a, b);
}

/** Cancel the buyer's previous unpaid charge (same lead, token checked). Best effort: never blocks the new checkout. */
async function cancelPrevious(replace: unknown, leadId: string) {
  if (!replace || typeof replace !== "object") return;
  const { pid, t } = replace as { pid?: unknown; t?: unknown };
  if (typeof pid !== "string" || typeof t !== "string" || !/^[0-9a-f-]{36}$/i.test(pid)) return;
  try {
    const old = await selectOne<PurchaseRow>("web_purchases", eq("id", pid));
    if (!old || old.access_token !== t || old.lead_id !== leadId || old.status === "paid" || old.status === "refunded" || !old.provider_ref) return;
    await providerById(old.provider)?.cancel?.(old.provider_ref);
    await update("web_purchases", `${eq("id", old.id)}&status=in.(pending,failed,canceled)`, { status: "canceled", provider_status: old.provider_status ?? "replaced" });
  } catch (e) {
    console.warn("[w2a/checkout] cancel previous", e);
  }
}
