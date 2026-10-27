import { eq, patch, select } from "./db";

/**
 * Take Pro away from everyone who redeemed a refunded / charged-back web purchase.
 *
 * For each web_redemptions.user_id of the purchase:
 *  1. what the user still legitimately has: other PAID web purchases they redeemed (web_redemptions.pro_until) and
 *     referral codes (referral_redemptions.pro_until);
 *  2. profiles.pro_until := the latest of those still in the future, else now() (Pro ends now);
 *  3. RevenueCat: revoke the granted `pro` entitlement (API v2 revoke_granted_entitlement — it ends ALL promotional
 *     grants of that entitlement), then grant it again until the remaining web expiry, if any. Store subscriptions
 *     bought in the app are not promotional grants and are untouched.
 *
 * Env: REVENUECAT_SECRET_KEY (v2 secret, project LeoDiet), optional RC_PROJECT_ID, RC_ENTITLEMENT_ID (same defaults as
 * the app's w2a-redeem edge function). Without the key, step 3 is skipped and logged on web_redemptions.rc_error.
 * Idempotent: running it twice leaves the same result.
 */
const RC_PROJECT = process.env.RC_PROJECT_ID ?? "proj669b6a77";
const RC_ENTITLEMENT = process.env.RC_ENTITLEMENT_ID ?? "entle1491a90a6"; // lookup_key "pro"

async function rc(path: string, body: unknown): Promise<{ status: number; text: string }> {
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) return { status: 0, text: "REVENUECAT_SECRET_KEY not set" };
  const res = await fetch(`https://api.revenuecat.com/v2/projects/${RC_PROJECT}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  return { status: res.status, text: (await res.text()).slice(0, 300) };
}

const latest = (dates: (string | null | undefined)[]) => dates.reduce<number>((m, d) => Math.max(m, d ? Date.parse(d) : 0), 0);

export type RevokeReport = { userId: string; proUntil: string; rcStatus: number; rcError: string | null }[];

export async function revokePurchase(purchaseId: string): Promise<RevokeReport> {
  const reds = await select<{ user_id: string }>("web_redemptions", `select=user_id&${eq("purchase_id", purchaseId)}`);
  const out: RevokeReport = [];
  const now = Date.now();
  for (const { user_id } of reds) {
    // other paid web purchases this user redeemed
    const other = await select<{ pro_until: string }>(
      "web_redemptions",
      `select=pro_until,web_purchases!inner(status)&${eq("user_id", user_id)}&purchase_id=neq.${encodeURIComponent(purchaseId)}&web_purchases.status=eq.paid`,
    );
    const ref = await select<{ pro_until: string }>("referral_redemptions", `select=pro_until&${eq("user_id", user_id)}`).catch(() => []);
    const webLeft = latest(other.map((r) => r.pro_until));
    const anyLeft = Math.max(webLeft, latest(ref.map((r) => r.pro_until)));
    const proUntil = new Date(anyLeft > now ? anyLeft : now).toISOString();
    await patch("profiles", eq("user_id", user_id), { pro_until: proUntil });

    const id = encodeURIComponent(user_id);
    let r = await rc(`/customers/${id}/actions/revoke_granted_entitlement`, { entitlement_id: RC_ENTITLEMENT }).catch((e) => ({ status: -1, text: String(e) }));
    // 404 = this user never got a grant (RC failed at redemption): nothing to revoke
    let error = r.status === 200 || r.status === 404 ? null : `revoke ${r.status} ${r.text}`;
    if (!error && webLeft > now) {
      r = await rc(`/customers/${id}/actions/grant_entitlement`, { entitlement_id: RC_ENTITLEMENT, expires_at: webLeft }).catch((e) => ({ status: -1, text: String(e) }));
      if (r.status !== 200 && r.status !== 201) error = `regrant ${r.status} ${r.text}`;
    }
    await patch("web_redemptions", `${eq("purchase_id", purchaseId)}&${eq("user_id", user_id)}`, { pro_until: new Date(now).toISOString(), rc_status: r.status, rc_error: error }).catch(() => {});
    if (error) console.error("[w2a/revoke]", user_id, error);
    out.push({ userId: user_id, proUntil, rcStatus: r.status, rcError: error });
  }
  return out;
}
