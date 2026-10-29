/**
 * Web paywall plans (leodiet.com/quiz/oferta). EDIT PRICES HERE — this is the only place.
 *
 * Reference: what the app charges in Brazil today (RevenueCat offering `plans_v2`, iOS + Android, set by
 * leo/scripts/play-regional-prices.py and the App Store tiers):
 *   - 3 meses (leodiet_pro_quarterly)  R$ 49,90
 *   - vitalício (leodiet_pro_lifetime) R$ 129,90
 *   - Android BR since 2026-10-26: mensal R$ 29,90 (1º mês R$ 14,90) + vitalício R$ 129,90
 *   - rescue offer: 3 meses R$ 29,90 / vitalício R$ 79,90
 * There is no annual plan in the app for Brazil today (the legacy `leodiet_pro_yearly` only lives in builds <= 1.0.3).
 *
 * The web keeps ~95% of the price (gateway fee) vs ~70–85% in the stores, so the proposal undercuts the app a bit and
 * makes the annual the obvious pick. `appPriceCents` is shown struck through ("no app: R$ 129,90"); it must stay a real,
 * current app price, or be removed (Código de Defesa do Consumidor: a "de/por" price must be real).
 */
export type PlanId = "quarterly" | "annual" | "lifetime" | "test";

export type Plan = {
  id: PlanId;
  /** months of Pro once the code is redeemed; null = lifetime */
  periodMonths: number | null;
  priceCents: number;
  currency: "BRL";
  /** real price of the same thing in the app (strike-through); null = don't show */
  appPriceCents: number | null;
  title: string;
  /** small line under the title */
  sub: string;
  badge?: string;
  /** pre-selected and highlighted */
  featured?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "quarterly",
    periodMonths: 3,
    priceCents: 3990,
    currency: "BRL",
    appPriceCents: 4990,
    title: "3 meses",
    sub: "Pagamento único · não renova sozinho",
  },
  {
    id: "annual",
    periodMonths: 12,
    priceCents: 7990,
    currency: "BRL",
    appPriceCents: null,
    title: "12 meses",
    sub: "Pagamento único · não renova sozinho",
    badge: "Mais escolhido",
    featured: true,
  },
  {
    id: "lifetime",
    periodMonths: null,
    priceCents: 11990,
    currency: "BRL",
    appPriceCents: 12990,
    title: "Vitalício",
    sub: "Paga uma vez, usa para sempre",
  },
];

/**
 * R$ 5 plan for real-money end-to-end tests (Asaas' minimum charge). Never listed on the paywall; the checkout only
 * accepts it with the header `x-w2a-test` = ASAAS_WEBHOOK_TOKEN (scripts/w2a-test-checkout.sh), and the purchase is
 * stored as test (no Meta Purchase event, the code unlocks the app for 24 hours).
 */
export const TEST_PLAN: Plan = {
  id: "test",
  periodMonths: 1,
  priceCents: 500,
  currency: "BRL",
  appPriceCents: null,
  title: "Teste",
  sub: "Compra de teste interna",
};

export const planById = (id: string): Plan | undefined => (id === TEST_PLAN.id ? TEST_PLAN : PLANS.find((p) => p.id === id));

export function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "R$ 6,66/mês" for prepaid periods, null for lifetime. */
export function perMonth(p: Plan): string | null {
  if (!p.periodMonths) return null;
  return `${brl(Math.round(p.priceCents / p.periodMonths))}/mês`;
}
