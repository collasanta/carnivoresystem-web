import { getProvider } from "@/lib/web2app/payments";
import { eq, selectOne } from "@/lib/web2app/server/db";
import { fulfillPurchase, markPurchase, publicPurchase, type PurchaseRow } from "@/lib/web2app/server/fulfill";
import { json, originOf, str } from "@/lib/web2app/server/http";

/**
 * POST /api/w2a/mock-pay {pid, t, outcome: 'approve' | 'decline'} — the mock gateway's "webhook". Only works while the
 * active provider is `mock` (never in production unless W2A_ALLOW_MOCK_IN_PRODUCTION=1) and only for mock purchases.
 */
export async function POST(req: Request) {
  if (getProvider()?.id !== "mock") return json({ error: "mock_disabled" }, 403);
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ error: "json" }, 400);
  }
  const pid = str(b.pid, 40);
  const t = str(b.t, 100);
  if (!pid || !t || !/^[0-9a-f-]{36}$/i.test(pid)) return json({ error: "purchase" }, 400);
  const p = await selectOne<PurchaseRow>("web_purchases", eq("id", pid));
  if (!p || p.access_token !== t || p.provider !== "mock") return json({ error: "purchase" }, 404);
  try {
    if (b.outcome === "decline") {
      if (p.status === "pending") await markPurchase(p.id, "failed", "mock_declined");
      return json({ purchase: publicPurchase({ ...p, status: p.status === "pending" ? "failed" : p.status }) });
    }
    const done = await fulfillPurchase(p.id, { providerRef: `mock_${p.id}`, providerStatus: "mock_approved", origin: originOf(req) });
    return json({ purchase: done ? publicPurchase(done) : null });
  } catch (e) {
    console.error("[w2a/mock-pay]", e);
    return json({ error: "server" }, 500);
  }
}
