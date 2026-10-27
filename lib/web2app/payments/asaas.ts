import { timingSafeEqual } from "node:crypto";
import type { CheckoutAction, CheckoutInput, PaymentProvider, PurchaseStatus, WebhookResult } from "./types";

/**
 * Asaas (API v3, https://docs.asaas.com). One-time charges only (no subscription yet):
 *
 *   Pix   → POST /customers (or reuse by CPF) → POST /payments {billingType: PIX, externalReference: purchase id}
 *           → GET /payments/{id}/pixQrCode → QR + copia-e-cola rendered on /quiz/pagamento, which polls our
 *           /api/w2a/purchase (that asks Asaas every ~15 s; the webhook is the main path).
 *   Card  → same customer → POST /payments {billingType: CREDIT_CARD, callback.successUrl} → the buyer pays on the
 *           Asaas hosted invoice (`invoiceUrl`). Card numbers never touch our server (no PCI scope). Asaas has no
 *           client-side tokenization / hosted fields: its "checkout transparente" sends card data through our backend
 *           (SAQ-D), so we don't use it. The callback only works for the domain registered in the Asaas account
 *           (Minha conta › Informações › site); without it we create the charge without callback and the browser opens
 *           the invoice in a new tab while our page keeps polling.
 *   Webhook → /api/web2app/asaas-webhook: header `asaas-access-token` must equal ASAAS_WEBHOOK_TOKEN, then the payment
 *           is re-read from the API (the body is never trusted for the status).
 *
 * Env:
 *   ASAAS_API_KEY        the key. It starts with "$" ("$aact_prod_…"): Next's .env loader expands "$…" as a variable,
 *                        so store it WITHOUT the leading "$" (aact_prod_…) or escape it as \$aact_…; this code re-adds
 *                        the "$" when missing.
 *   ASAAS_ENV            production | sandbox (default sandbox). Sandbox purchases are flagged `test`.
 *   ASAAS_WEBHOOK_TOKEN  the auth token set on the webhook in the Asaas portal (32–255 chars).
 *   ASAAS_CALLBACK       0 = never send callback.successUrl (skip the attempt when the domain isn't registered).
 *   ASAAS_BASE_URL       optional override of the API base (local tests against a fake server).
 *   W2A_PIX_MINUTES      how long our page shows a Pix before calling it expired (default 30).
 */

const ENV = () => (process.env.ASAAS_ENV === "production" ? "production" : "sandbox");
const BASE = () => process.env.ASAAS_BASE_URL || (ENV() === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3");
const UA = "LeoDiet-web2app/1.0 (+https://leodiet.com)";

function apiKey(): string {
  const k = (process.env.ASAAS_API_KEY ?? "").trim();
  if (!k) throw new AsaasError(0, "ASAAS_API_KEY not set (if it was in a .env file with a leading $, it was expanded to empty: drop the $)");
  return k.startsWith("$") ? k : `$${k}`;
}

export class AsaasError extends Error {
  constructor(
    public status: number,
    message: string,
    public codes: string[] = [],
  ) {
    super(message);
  }
}

type AsaasPayment = {
  id: string;
  customer: string;
  status: string;
  billingType: string;
  value: number;
  externalReference: string | null;
  invoiceUrl: string;
  deleted?: boolean;
};

async function asaas<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE()}${path}`, {
    method,
    headers: { access_token: apiKey(), "User-Agent": UA, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  let j: unknown = null;
  try {
    j = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const errs = (j as { errors?: { code?: string; description?: string }[] } | null)?.errors ?? [];
    throw new AsaasError(res.status, `asaas ${method} ${path.split("?")[0]} ${res.status}: ${errs.map((e) => e.description).join("; ") || text.slice(0, 200)}`, errs.map((e) => e.code ?? ""));
  }
  return j as T;
}

/** Due date for new charges: tomorrow in Brazil (a Pix charge goes OVERDUE after its due date). */
function dueDate(): string {
  const d = new Date(Date.now() + 24 * 3600_000);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD
}

async function customerFor(input: CheckoutInput): Promise<string> {
  const cpf = input.cpf ?? "";
  if (!/^\d{11}$/.test(cpf)) throw new AsaasError(400, "cpf missing", ["invalid_cpfCnpj"]);
  const found = await asaas<{ data: { id: string; deleted?: boolean }[] }>("GET", `/customers?cpfCnpj=${cpf}&limit=10`);
  const live = found.data.find((c) => !c.deleted);
  if (live) return live.id;
  const c = await asaas<{ id: string }>("POST", "/customers", {
    name: input.name?.trim() || "Cliente LeoDiet",
    cpfCnpj: cpf,
    email: input.email,
    // Asaas would e-mail/SMS its own "new charge" notices; the funnel sends its own e-mail
    notificationDisabled: true,
  });
  return c.id;
}

const PAID = new Set(["CONFIRMED", "RECEIVED", "RECEIVED_IN_CASH"]);
const REFUNDED = new Set(["REFUNDED", "REFUND_REQUESTED", "REFUND_IN_PROGRESS", "CHARGEBACK_REQUESTED", "CHARGEBACK_DISPUTE", "AWAITING_CHARGEBACK_REVERSAL"]);
const CARD_FAILED_EVENTS = new Set(["PAYMENT_CREDIT_CARD_CAPTURE_REFUSED", "PAYMENT_REPROVED_BY_RISK_ANALYSIS"]);

/** Asaas payment status (+ the webhook event, when there is one) → our purchase status. */
export function mapAsaas(status: string, event?: string, deleted?: boolean): PurchaseStatus {
  if (PAID.has(status)) return "paid";
  if (REFUNDED.has(status) || event === "PAYMENT_REFUNDED" || event?.startsWith("PAYMENT_CHARGEBACK_")) return "refunded";
  if (deleted || event === "PAYMENT_DELETED") return "canceled";
  if (status === "OVERDUE") return "canceled"; // Pix / invoice expired; a late payment still fulfills (fulfill.ts)
  if (event && CARD_FAILED_EVENTS.has(event)) return "failed";
  return "pending";
}

const result = (p: AsaasPayment, event?: string): WebhookResult => {
  const status = mapAsaas(p.status, event, p.deleted);
  // keep the event in provider_status when it is what decided the outcome (card refused) — the UI reads it
  const providerStatus = status === "failed" && event ? event : p.deleted ? "DELETED" : p.status;
  return { purchaseId: p.externalReference ?? undefined, providerRef: p.id, status, providerStatus };
};

function tokenOk(got: string | null): boolean {
  const want = process.env.ASAAS_WEBHOOK_TOKEN ?? "";
  if (!want || !got) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export class WebhookAuthError extends Error {}

export const asaasProvider: PaymentProvider = {
  id: "asaas",
  get test() {
    return ENV() !== "production";
  },
  methods: ["pix", "card"],
  needsCpf: true,

  async createCheckout(input): Promise<CheckoutAction> {
    const method = input.method === "card" ? "card" : "pix";
    const customer = await customerFor(input);
    const base = {
      customer,
      value: input.plan.priceCents / 100,
      dueDate: dueDate(),
      description: `LeoDiet Pro · ${input.plan.title} · pagamento único`,
      externalReference: input.purchaseId,
    };

    if (method === "pix") {
      const p = await asaas<AsaasPayment>("POST", "/payments", { ...base, billingType: "PIX" });
      const qr = await asaas<{ encodedImage: string; payload: string; expirationDate?: string }>("GET", `/payments/${p.id}/pixQrCode`);
      const minutes = Number(process.env.W2A_PIX_MINUTES) || 30;
      return { kind: "pix", providerRef: p.id, qrCodeBase64: qr.encodedImage, copyPaste: qr.payload, expiresAt: new Date(Date.now() + minutes * 60_000).toISOString() };
    }

    // card: Asaas hosted invoice
    if (process.env.ASAAS_CALLBACK !== "0") {
      try {
        const p = await asaas<AsaasPayment>("POST", "/payments", { ...base, billingType: "CREDIT_CARD", callback: { successUrl: input.successUrl, autoRedirect: true } });
        return { kind: "redirect", url: p.invoiceUrl, providerRef: p.id, returnsToSite: true };
      } catch (e) {
        // domain not registered in the Asaas account (or localhost): fall back to no callback
        if (!(e instanceof AsaasError) || e.status !== 400) throw e;
        console.warn("[asaas] callback refused, creating the card charge without it:", e.message);
      }
    }
    const p = await asaas<AsaasPayment>("POST", "/payments", { ...base, billingType: "CREDIT_CARD" });
    return { kind: "redirect", url: p.invoiceUrl, providerRef: p.id, returnsToSite: false };
  },

  async parseWebhook(req) {
    if (!tokenOk(req.headers.get("asaas-access-token"))) throw new WebhookAuthError("bad asaas-access-token");
    let body: { id?: string; event?: string; payment?: Partial<AsaasPayment> };
    try {
      body = await req.json();
    } catch {
      return null;
    }
    const event = body.event ?? "";
    const id = body.payment?.id;
    if (!event.startsWith("PAYMENT_") || !id) return null;
    // re-read from the API: the status we act on is Asaas', not the body's
    let p: AsaasPayment;
    try {
      p = await asaas<AsaasPayment>("GET", `/payments/${encodeURIComponent(id)}`);
    } catch (e) {
      // a deleted (or foreign) charge may 404: fall back to the token-authenticated body, else ignore the event
      if (!(e instanceof AsaasError) || e.status !== 404) throw e;
      if (!body.payment?.status) return null;
      p = { ...(body.payment as AsaasPayment), deleted: true };
    }
    return result(p, event);
  },

  async fetchStatus(providerRef) {
    const p = await asaas<AsaasPayment>("GET", `/payments/${encodeURIComponent(providerRef)}`);
    return result(p);
  },

  async cancel(providerRef) {
    const p = await asaas<AsaasPayment>("GET", `/payments/${encodeURIComponent(providerRef)}`);
    if (p.deleted || !(p.status === "PENDING" || p.status === "OVERDUE")) return;
    await asaas("DELETE", `/payments/${encodeURIComponent(providerRef)}`);
  },
};
