import { mockProvider } from "./mock";
import type { PaymentProvider } from "./types";

/**
 * Registered gateways. TODO(gateway): add the real one here, e.g.
 *   import { mercadoPagoProvider } from "./mercadopago";
 *   const PROVIDERS = { mock: mockProvider, mercadopago: mercadoPagoProvider };
 * and set W2A_PAYMENT_PROVIDER=mercadopago in Vercel (Production).
 */
const PROVIDERS: Record<string, PaymentProvider> = {
  mock: mockProvider,
};

export const isProduction = () => process.env.VERCEL_ENV === "production";

/** The active provider, or null when none is usable (the paywall then shows "pagamento indisponível"). */
export function getProvider(): PaymentProvider | null {
  const id = process.env.W2A_PAYMENT_PROVIDER || "mock";
  const p = PROVIDERS[id];
  if (!p) return null;
  if (p.id === "mock" && isProduction() && process.env.W2A_ALLOW_MOCK_IN_PRODUCTION !== "1") return null;
  return p;
}

export function providerById(id: string): PaymentProvider | null {
  return PROVIDERS[id] ?? null;
}

export type { PaymentProvider } from "./types";
