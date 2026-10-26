/**
 * Payment provider interface for the web paywall. One implementation per gateway; `getProvider()` in ./index.ts picks
 * it from W2A_PAYMENT_PROVIDER. The rest of the funnel never talks to a gateway directly:
 *
 *   POST /api/w2a/checkout      → creates web_purchases (status 'pending') → provider.createCheckout()
 *                                 → the browser follows the returned action (redirect / Pix QR / mock page)
 *   POST /api/w2a/webhook/<id>  → provider.parseWebhook() → fulfillPurchase() / markPurchase()
 *   GET  /api/w2a/purchase      → the success page polls; when still pending, provider.fetchStatus() if implemented
 *
 * fulfillPurchase() (../server/fulfill.ts) is idempotent: it is safe to call from the webhook AND from a status poll.
 * TODO(gateway): implement this interface for the chosen gateway (Mercado Pago / Pagar.me / Asaas / EBANX / Stripe),
 * register it in ./index.ts and set W2A_PAYMENT_PROVIDER. Recipe in docs/web2app.md › "Plugging in a real gateway".
 */
import type { Plan } from "../plans";

export type PurchaseStatus = "pending" | "paid" | "failed" | "refunded" | "canceled";

export type CheckoutInput = {
  purchaseId: string;
  /** browser-side secret for this purchase; put it in return URLs so the success page can read the purchase */
  accessToken: string;
  plan: Plan;
  email: string;
  name?: string;
  /** absolute URLs on this site */
  successUrl: string;
  cancelUrl: string;
  /** absolute URL the gateway should POST notifications to (/api/w2a/webhook/<provider id>) */
  webhookUrl: string;
  clientIp?: string;
  userAgent?: string;
};

export type CheckoutAction =
  /** send the browser to a hosted checkout (Mercado Pago Checkout Pro, Stripe Checkout, Pagar.me link, Asaas invoice…) */
  | { kind: "redirect"; url: string; providerRef?: string }
  /** show a Pix QR code on our page and poll the purchase status */
  | { kind: "pix"; qrCodeBase64?: string; copyPaste: string; expiresAt?: string; providerRef?: string };

export type WebhookResult = {
  /** our web_purchases.id when the gateway echoes it back (external_reference / metadata) */
  purchaseId?: string;
  /** the gateway's payment id (web_purchases.provider_ref) */
  providerRef?: string;
  status: PurchaseStatus;
  /** raw gateway status, stored for debugging */
  providerStatus?: string;
};

export interface PaymentProvider {
  /** stored in web_purchases.provider and used in the webhook path */
  id: string;
  /** true = sandbox / fake money: the purchase is flagged `test` (24 h redemption, no real Meta Purchase) */
  test: boolean;
  createCheckout(input: CheckoutInput): Promise<CheckoutAction>;
  /**
   * Verify the notification (signature / secret / re-fetch from the gateway API — never trust the body alone) and
   * translate it. Return null for notifications to ignore (other topics, unknown payments).
   */
  parseWebhook(req: Request): Promise<WebhookResult | null>;
  /** Optional: ask the gateway for the current status (for Pix polling when a webhook is late). */
  fetchStatus?(providerRef: string): Promise<WebhookResult | null>;
}
