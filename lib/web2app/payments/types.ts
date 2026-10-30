/**
 * Payment provider interface for the web paywall. One implementation per gateway; `getProvider()` in ./index.ts picks
 * it from PAYMENT_PROVIDER. The rest of the funnel never talks to a gateway directly:
 *
 *   POST /api/w2a/checkout      → creates web_purchases (status 'pending') → provider.createCheckout()
 *                                 → the browser follows the returned action (redirect / Pix QR / mock page)
 *   POST /api/w2a/webhook/<id>  → provider.parseWebhook() → fulfillPurchase() / markPurchase()
 *   GET  /api/w2a/purchase      → the success page polls; when still pending, provider.fetchStatus() if implemented
 *
 * fulfillPurchase() (../server/fulfill.ts) is idempotent: it is safe to call from the webhook AND from a status poll.
 * Implementations: ./mock.ts (local dev only) and ./asaas.ts (Pix inline + card on the Asaas hosted invoice).
 * Recipe for another gateway in docs/web2app.md › "Plugging in a real gateway".
 */
import type { Plan } from "../plans";

export type PurchaseStatus = "pending" | "paid" | "failed" | "refunded" | "canceled";

/** How the buyer pays. The mock ignores it. */
export type PayMethod = "pix" | "card";

export type CheckoutInput = {
  purchaseId: string;
  /** browser-side secret for this purchase; put it in return URLs so the success page can read the purchase */
  accessToken: string;
  plan: Plan;
  /** what to charge: the order total (guide + app plan, the guide alone, or the app alone), from plans.ts order() */
  amountCents: number;
  /** charge description shown by the gateway */
  description: string;
  email: string;
  name?: string;
  /** absolute URLs on this site */
  successUrl: string;
  cancelUrl: string;
  /** absolute URL the gateway should POST notifications to (/api/w2a/webhook/<provider id>) */
  webhookUrl: string;
  clientIp?: string;
  userAgent?: string;
  /** chosen on the paywall (providers that list `methods`) */
  method?: PayMethod;
  /** payer CPF, digits only, already validated (providers with `needsCpf`). Never stored by us. */
  cpf?: string;
};

export type CheckoutAction =
  /** send the browser to a hosted checkout (Mercado Pago Checkout Pro, Stripe Checkout, Pagar.me link, Asaas invoice…) */
  | {
      kind: "redirect";
      url: string;
      providerRef?: string;
      /**
       * false = the gateway won't send the buyer back to our success URL (Asaas without a registered domain): the
       * browser opens the checkout in a new tab from /quiz/pagamento and keeps polling there.
       */
      returnsToSite?: boolean;
    }
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
  readonly test: boolean;
  /** payment methods the paywall offers (empty / missing = no picker) */
  methods?: PayMethod[];
  /** the paywall must collect a CPF */
  needsCpf?: boolean;
  createCheckout(input: CheckoutInput): Promise<CheckoutAction>;
  /**
   * Verify the notification (signature / secret / re-fetch from the gateway API — never trust the body alone) and
   * translate it. Return null for notifications to ignore (other topics, unknown payments).
   */
  parseWebhook(req: Request): Promise<WebhookResult | null>;
  /** Optional: ask the gateway for the current status (for Pix polling when a webhook is late). */
  fetchStatus?(providerRef: string): Promise<WebhookResult | null>;
  /** Optional: cancel an unpaid charge (a new Pix replaces an expired one, so the old QR can't be paid too). */
  cancel?(providerRef: string): Promise<void>;
}
