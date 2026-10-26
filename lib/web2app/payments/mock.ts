import type { PaymentProvider } from "./types";

/**
 * Mock gateway: no money moves. createCheckout() sends the browser to our own /quiz/pagamento page, which shows the
 * order and two buttons ("approve" / "decline") that POST /api/w2a/mock-pay. That route plays the part of the
 * gateway webhook and calls the same fulfillPurchase() a real webhook would.
 *
 * Every mock purchase is `test`: its code unlocks the app for 24 h only, and no Purchase reaches Meta unless a test
 * event code is configured (META_TEST_EVENT_CODE → Events Manager › Test events).
 *
 * Refused in production (VERCEL_ENV=production) unless W2A_ALLOW_MOCK_IN_PRODUCTION=1, so a forgotten env var can never
 * turn leodiet.com into a free-Pro machine. See ./index.ts.
 */
export const mockProvider: PaymentProvider = {
  id: "mock",
  test: true,
  async createCheckout(input) {
    const u = new URL(input.successUrl);
    const page = new URL("/quiz/pagamento", u.origin);
    page.searchParams.set("pid", input.purchaseId);
    page.searchParams.set("t", input.accessToken);
    return { kind: "redirect", url: page.toString(), providerRef: `mock_${input.purchaseId}` };
  },
  async parseWebhook() {
    // the mock has no webhook: /api/w2a/mock-pay calls fulfillPurchase() directly
    return null;
  },
};
