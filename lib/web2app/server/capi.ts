import { createHash } from "node:crypto";
import { insertLog } from "./db";

/**
 * Meta Conversions API, server side of the funnel's Purchase. Same shape and log table as the app's `meta-capi` edge
 * function (leo/supabase/functions/meta-capi): dataset "leodiet", action_source website, one row per call in
 * public.meta_capi_events. event_id = `w2a_<purchase id>`, the same eventID the success page gives the browser pixel,
 * so Meta keeps one of the two.
 *
 * Env: META_CAPI_TOKEN (dataset access token), optional META_PIXEL_ID, META_GRAPH_VERSION, META_TEST_EVENT_CODE.
 * Test purchases (mock / sandbox) are only sent when META_TEST_EVENT_CODE is set, and then as test events: a fake
 * purchase never reaches the real dataset.
 */
const PIXEL_ID = process.env.META_PIXEL_ID ?? "1370037514985006";
const GRAPH = process.env.META_GRAPH_VERSION ?? "v24.0";

const sha = (v: string) => createHash("sha256").update(v.trim().toLowerCase()).digest("hex");

export type CapiPurchase = {
  purchaseId: string;
  email: string;
  leadId?: string | null;
  valueCents: number;
  currency: string;
  plan: string;
  fbc?: string | null;
  fbp?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  test: boolean;
  eventTime?: number;
};

export async function sendPurchase(p: CapiPurchase): Promise<{ status: number; body: string; skipped?: string }> {
  const token = process.env.META_CAPI_TOKEN;
  const testCode = process.env.META_TEST_EVENT_CODE || null;
  if (!token) return { status: 0, body: "", skipped: "META_CAPI_TOKEN not set" };
  if (p.test && !testCode) return { status: 0, body: "", skipped: "test purchase without META_TEST_EVENT_CODE" };

  const user_data: Record<string, unknown> = {
    em: [sha(p.email)],
    external_id: [sha(p.leadId ?? p.purchaseId)],
    country: [sha("br")],
  };
  if (p.fbc) user_data.fbc = p.fbc;
  if (p.fbp) user_data.fbp = p.fbp;
  if (p.clientIp) user_data.client_ip_address = p.clientIp;
  if (p.userAgent) user_data.client_user_agent = p.userAgent;

  const eventId = `w2a_${p.purchaseId}`;
  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor((p.eventTime ?? Date.now()) / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: "https://leodiet.com/quiz/sucesso",
        user_data,
        custom_data: { value: p.valueCents / 100, currency: p.currency, content_ids: [`web_${p.plan}`], content_type: "product", order_id: p.purchaseId },
      },
    ],
    ...(testCode ? { test_event_code: testCode } : {}),
  };
  const res = await fetch(`https://graph.facebook.com/${GRAPH}/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await res.text()).slice(0, 1000);
  await insertLog("meta_capi_events", { user_id: null, event_name: "Purchase", event_id: eventId, status: res.status, response: body, test: !!testCode }).catch(() => {});
  return { status: res.status, body };
}
