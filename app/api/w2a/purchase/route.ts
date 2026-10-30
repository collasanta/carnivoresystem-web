import { providerById } from "@/lib/web2app/payments";
import { eq, selectOne } from "@/lib/web2app/server/db";
import { fulfillPurchase, linkedPurchase, markPurchase, publicPurchase, type PurchaseRow } from "@/lib/web2app/server/fulfill";
import { json, originOf } from "@/lib/web2app/server/http";

/**
 * GET /api/w2a/purchase?pid=…&t=… — the buyer's own purchase (status, plan, code once paid). The success page polls
 * it. While unpaid (pending, or failed / canceled that may still get paid on the gateway) and with `&check=1` (the pages
 * send it every ~15 s, not on every poll: gateway rate limits), asks the gateway directly when the provider supports it
 * (a late webhook never blocks the code). `reason` tells the page
 * why an unpaid purchase stopped (pix_expired | card_refused | canceled). `guide` (app plan) / `app` (ebook) = the other
 * paid purchase of the same lead, so the guide page can skip the upsell and the app page can link the guide.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const pid = q.get("pid") ?? "";
  const t = q.get("t") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(pid) || !t) return json({ error: "purchase" }, 400);
  try {
    let p = await selectOne<PurchaseRow>("web_purchases", eq("id", pid));
    if (!p || p.access_token !== t) return json({ error: "purchase" }, 404);
    const provider = providerById(p.provider);
    if ((p.status === "pending" || p.status === "failed" || p.status === "canceled") && q.get("check") === "1" && p.provider_ref && provider?.fetchStatus) {
      const s = await provider.fetchStatus(p.provider_ref).catch(() => null);
      if (s?.status === "paid") p = (await fulfillPurchase(p.id, { providerRef: s.providerRef, providerStatus: s.providerStatus, origin: originOf(req) })) ?? p;
      else if (s && s.status !== "pending" && s.status !== p.status) {
        await markPurchase(p.id, s.status, s.providerStatus);
        p = (await selectOne<PurchaseRow>("web_purchases", eq("id", pid))) ?? p;
      }
    }
    return json({ purchase: publicPurchase(p, await linkedPurchase(p)) });
  } catch (e) {
    console.error("[w2a/purchase]", e);
    return json({ error: "server" }, 500);
  }
}
