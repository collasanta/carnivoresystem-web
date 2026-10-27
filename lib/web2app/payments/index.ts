import { asaasProvider } from "./asaas";
import { mockProvider } from "./mock";
import type { PaymentProvider } from "./types";

/**
 * Registered gateways. The active one comes from PAYMENT_PROVIDER (or the older name W2A_PAYMENT_PROVIDER):
 *   asaas  real payments (Pix + card), see ./asaas.ts
 *   mock   local dev only: refused on the production deployment
 */
const PROVIDERS: Record<string, PaymentProvider> = {
  mock: mockProvider,
  asaas: asaasProvider,
};

export const isProduction = () => process.env.VERCEL_ENV === "production";

export const activeProviderId = () => process.env.PAYMENT_PROVIDER || process.env.W2A_PAYMENT_PROVIDER || "mock";

/** The active provider, or null when none is usable (the paywall then shows "pagamento indisponível"). */
export function getProvider(): PaymentProvider | null {
  const p = PROVIDERS[activeProviderId()];
  if (!p) return null;
  if (p.id === "mock" && isProduction() && process.env.W2A_ALLOW_MOCK_IN_PRODUCTION !== "1") return null;
  return p;
}

export function providerById(id: string): PaymentProvider | null {
  return PROVIDERS[id] ?? null;
}

/** What the paywall needs to know about the active provider (rendered server side, no secrets). */
export type ProviderInfo = { id: string; methods: ("pix" | "card")[]; needsCpf: boolean; test: boolean } | null;
export function providerInfo(): ProviderInfo {
  const p = getProvider();
  return p ? { id: p.id, methods: p.methods ?? [], needsCpf: !!p.needsCpf, test: p.test } : null;
}

export type { PaymentProvider } from "./types";
