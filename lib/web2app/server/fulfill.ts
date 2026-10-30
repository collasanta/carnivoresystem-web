import { randomBytes, randomInt } from "node:crypto";
import { eq, selectOne, update } from "./db";
import { revokePurchase } from "./revoke";
import { sendPurchase } from "./capi";
import { sendCodeEmail } from "./email";
import { captureServer } from "./posthog";
import type { PurchaseStatus } from "../payments/types";

export type PurchaseRow = {
  id: string;
  lead_id: string | null;
  platform: "ios" | "android" | "desktop" | null;
  email: string;
  plan: string;
  period_months: number | null;
  amount_cents: number;
  currency: string;
  provider: string;
  provider_ref: string | null;
  provider_status: string | null;
  status: PurchaseStatus;
  test: boolean;
  access_token: string;
  code: string | null;
  paid_at: string | null;
  fbc: string | null;
  fbp: string | null;
  client_ip: string | null;
  user_agent: string | null;
  capi_status: number | null;
  email_sent_at: string | null;
  email_count: number;
  redemptions: number;
  max_redemptions: number;
};

// no 0/O, 1/I/L: codes get typed from a phone screen
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** LEO-XXXX-XXXX (8 random chars from 31 = ~40 bits; codes are also limited to 3 redemptions). */
export function newCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `LEO-${s.slice(0, 4)}-${s.slice(4)}`;
}

export const newAccessToken = () => randomBytes(24).toString("base64url");

/**
 * The single place a purchase becomes paid. Idempotent: webhooks retry, status polls race them, and both land here.
 *  1. pending → paid with a fresh redemption code (conditional update: only the first caller wins)
 *  2. Meta CAPI Purchase (event_id w2a_<id>), once
 *  3. the code e-mail, once
 */
export async function fulfillPurchase(purchaseId: string, opts: { providerRef?: string; providerStatus?: string; origin: string }): Promise<PurchaseRow | null> {
  let p = await selectOne<PurchaseRow>("web_purchases", eq("id", purchaseId));
  if (!p) return null;
  // money that really arrived wins over "expired"/"failed" (a Pix paid after our page gave up, a card retried on the
  // invoice); only a refund is final
  if (p.status === "refunded") return p;

  let won = false;
  if (p.status !== "paid") {
    const id = p.id;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        won = (await update<PurchaseRow>("web_purchases", `${eq("id", id)}&status=neq.paid`, {
          status: "paid",
          paid_at: new Date().toISOString(),
          code: newCode(),
          ...(opts.providerRef ? { provider_ref: opts.providerRef } : {}),
          ...(opts.providerStatus ? { provider_status: opts.providerStatus } : {}),
        })).length > 0;
        break;
      } catch (e) {
        if (!String(e).includes("23505") || attempt === 2) throw e; // code collision → retry with a new code
      }
    }
    p = (await selectOne<PurchaseRow>("web_purchases", eq("id", purchaseId)))!;
  }
  // only the caller that flipped it to paid reports it, so webhook retries and polls don't double count
  if (won) await captureServer(p.lead_id ?? p.id, "w2a_paid", { plan: p.plan, value: p.amount_cents / 100, currency: p.currency, test: p.test, purchase_id: p.id, platform: p.platform });

  if (p.capi_status == null) {
    const r = await sendPurchase({
      purchaseId: p.id,
      email: p.email,
      leadId: p.lead_id,
      valueCents: p.amount_cents,
      currency: p.currency,
      plan: p.plan,
      fbc: p.fbc,
      fbp: p.fbp,
      clientIp: p.client_ip,
      userAgent: p.user_agent,
      test: p.test,
      eventTime: p.paid_at ? Date.parse(p.paid_at) : undefined,
    }).catch((e) => ({ status: -1, body: String(e) }));
    // 0 = skipped on purpose (no token / test purchase): store it so we don't retry on every poll
    await update("web_purchases", eq("id", p.id), { capi_status: r.status, ...(r.status === 200 ? { capi_sent_at: new Date().toISOString() } : {}) }).catch(() => {});
  }

  if (!p.email_sent_at && p.code) {
    const lead = p.lead_id ? await selectOne<{ name: string | null }>("web_leads", eq("id", p.lead_id), "name").catch(() => null) : null;
    const r = await sendCodeEmail({ to: p.email, code: p.code, plan: p.plan, amountCents: p.amount_cents, name: lead?.name, origin: opts.origin, test: p.test }).catch((e) => ({ ok: false, error: String(e) }));
    if (r.ok) await update("web_purchases", eq("id", p.id), { email_sent_at: new Date().toISOString(), email_count: p.email_count + 1 }).catch(() => {});
  }
  return (await selectOne<PurchaseRow>("web_purchases", eq("id", purchaseId))) ?? p;
}

/**
 * Non-paid outcomes from a webhook / status check. Conditional, so retries and out-of-order events are harmless:
 *  - failed / canceled only replace `pending` (a late PAYMENT_OVERDUE never downgrades a paid purchase);
 *  - refunded replaces pending / paid / failed / canceled once; on the paid → refunded transition, Pro is revoked for
 *    every user who redeemed the code (./revoke.ts). The code can't be redeemed again (redeem_web_code checks status).
 */
export async function markPurchase(purchaseId: string, status: PurchaseStatus, providerStatus?: string): Promise<void> {
  if (status === "paid" || status === "pending") return;
  const from = status === "refunded" ? "pending,paid,failed,canceled" : "pending";
  const rows = await update<PurchaseRow>("web_purchases", `${eq("id", purchaseId)}&status=in.(${from})`, {
    status,
    ...(providerStatus ? { provider_status: providerStatus } : {}),
    ...(status === "refunded" ? { refunded_at: new Date().toISOString() } : {}),
  });
  if (status === "refunded" && rows.length) {
    const report = await revokePurchase(purchaseId);
    if (report.length) console.info("[w2a/refund]", purchaseId, JSON.stringify(report));
  } else if (!rows.length && providerStatus) {
    // keep the raw status for debugging even when the transition was refused
    await update("web_purchases", `${eq("id", purchaseId)}&status=neq.${status}`, { provider_status: providerStatus }).catch(() => {});
  }
}

/** Why a purchase isn't paid, for the buyer's page. */
export function failureReason(p: Pick<PurchaseRow, "status" | "provider_status">): "pix_expired" | "card_refused" | "canceled" | null {
  if (p.status === "canceled") return p.provider_status === "OVERDUE" ? "pix_expired" : "canceled";
  if (p.status === "failed") return "card_refused";
  return null;
}

/** Public view of a purchase for the browser that owns it (access token checked by the caller). */
export function publicPurchase(p: PurchaseRow) {
  return { id: p.id, status: p.status, plan: p.plan, amountCents: p.amount_cents, currency: p.currency, code: p.status === "paid" ? p.code : null, test: p.test, email: p.email, emailSent: !!p.email_sent_at, provider: p.provider, reason: failureReason(p) };
}
