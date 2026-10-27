import type { PaymentProvider } from "../payments/types";
import { WebhookAuthError } from "../payments/asaas";
import { eq, selectOne } from "./db";
import { fulfillPurchase, markPurchase } from "./fulfill";
import { json, originOf } from "./http";

/**
 * Apply a gateway notification. The provider verifies and translates it (PaymentProvider.parseWebhook); this only
 * applies the result through the idempotent fulfillPurchase() / markPurchase(), so at-least-once delivery, retries
 * and out-of-order events are safe. 401 on a bad token, 200 for things we ignore, 500 on our own failures so the
 * gateway retries (Asaas pauses the queue after repeated failures: see docs/web2app.md).
 */
export async function handleWebhook(provider: PaymentProvider, req: Request) {
  try {
    const r = await provider.parseWebhook(req);
    if (!r) return json({ ok: true, ignored: true });
    let purchaseId = r.purchaseId && /^[0-9a-f-]{36}$/i.test(r.purchaseId) ? r.purchaseId : undefined;
    let row = purchaseId ? await selectOne<{ id: string; provider: string }>("web_purchases", eq("id", purchaseId), "id,provider") : null;
    if (!row && r.providerRef) row = await selectOne<{ id: string; provider: string }>("web_purchases", `${eq("provider", provider.id)}&${eq("provider_ref", r.providerRef)}`, "id,provider");
    // charges that aren't ours (other products on the same gateway account) are acknowledged and ignored
    if (!row || row.provider !== provider.id) return json({ ok: true, ignored: "unknown purchase" });
    purchaseId = row.id;
    if (r.status === "paid") await fulfillPurchase(purchaseId, { providerRef: r.providerRef, providerStatus: r.providerStatus, origin: originOf(req) });
    else if (r.status !== "pending") await markPurchase(purchaseId, r.status, r.providerStatus);
    return json({ ok: true, status: r.status });
  } catch (e) {
    if (e instanceof WebhookAuthError) return json({ error: "unauthorized" }, 401);
    console.error(`[w2a/webhook/${provider.id}]`, e);
    return json({ error: "server" }, 500);
  }
}
