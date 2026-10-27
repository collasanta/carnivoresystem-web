import { asaasProvider } from "@/lib/web2app/payments/asaas";
import { handleWebhook } from "@/lib/web2app/server/webhook";

/**
 * POST /api/web2app/asaas-webhook — the URL to register in the Asaas portal (Integrações › Webhooks), with the auth
 * token = ASAAS_WEBHOOK_TOKEN. Checks the `asaas-access-token` header, re-reads the payment from the Asaas API, then:
 *   PAYMENT_CONFIRMED / PAYMENT_RECEIVED      → paid: code, e-mail, CAPI Purchase, claimable by e-mail in the app
 *   PAYMENT_REFUNDED / PAYMENT_CHARGEBACK_*   → refunded: Pro revoked (profiles.pro_until + RevenueCat)
 *   PAYMENT_OVERDUE / PAYMENT_DELETED         → canceled (Pix expired); card refused → failed
 * Works whatever PAYMENT_PROVIDER is, so late events for old Asaas purchases are still applied.
 */
export async function POST(req: Request) {
  return handleWebhook(asaasProvider, req);
}
