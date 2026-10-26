import { providerById } from "@/lib/web2app/payments";
import { eq, selectOne } from "@/lib/web2app/server/db";
import { fulfillPurchase, markPurchase } from "@/lib/web2app/server/fulfill";
import { json, originOf } from "@/lib/web2app/server/http";

/**
 * POST /api/w2a/webhook/<provider> — gateway notifications. The provider verifies and translates them
 * (PaymentProvider.parseWebhook); this route only applies the result. Always 200 for things we ignore, 500 on our
 * own failures so the gateway retries.
 */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: id } = await ctx.params;
  const provider = providerById(id);
  if (!provider || provider.id === "mock") return json({ error: "provider" }, 404);
  try {
    const r = await provider.parseWebhook(req);
    if (!r) return json({ ok: true, ignored: true });
    let purchaseId = r.purchaseId;
    if (!purchaseId && r.providerRef) {
      const row = await selectOne<{ id: string }>("web_purchases", `${eq("provider", provider.id)}&${eq("provider_ref", r.providerRef)}`, "id");
      purchaseId = row?.id;
    }
    if (!purchaseId) return json({ ok: true, ignored: "unknown purchase" });
    if (r.status === "paid") await fulfillPurchase(purchaseId, { providerRef: r.providerRef, providerStatus: r.providerStatus, origin: originOf(req) });
    else if (r.status !== "pending") await markPurchase(purchaseId, r.status, r.providerStatus);
    return json({ ok: true });
  } catch (e) {
    console.error(`[w2a/webhook/${id}]`, e);
    return json({ error: "server" }, 500);
  }
}
