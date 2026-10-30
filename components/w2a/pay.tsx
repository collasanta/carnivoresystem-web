"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatCpf, isValidCpf } from "@/lib/web2app/cpf";
import type { ProviderInfo } from "@/lib/web2app/payments";
import type { Order } from "@/lib/web2app/plans";
import { capture } from "@/lib/web2app/analytics";
import { metaCookies, useFunnel } from "@/lib/web2app/state";

/**
 * Shared checkout for the offer (/quiz/oferta: guide + app bump) and the follow-up app offer on the guide-only success
 * page: Pix | Cartão picker, CPF field (Asaas requires it; kept in this tab's sessionStorage to prefill the next checkout,
 * never in our DB) and `start({plan, includesEbook})` → POST /api/w2a/checkout (one charge for the order total) →
 * /quiz/pagamento (Pix QR / card wait / mock) or the gateway's hosted page.
 */
export type CheckoutAction =
  | { kind: "redirect"; url: string; returnsToSite?: boolean }
  | { kind: "pix"; qrCodeBase64?: string; copyPaste: string; expiresAt?: string };

export const ss = {
  get: (k: string) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* private mode */
    }
  },
};
export const checkoutKey = (pid: string) => `w2a_checkout_${pid}`;

export type Method = "pix" | "card";

export type PaySource = "offer" | "upsell";

export function usePay(provider: ProviderInfo, source: PaySource) {
  const router = useRouter();
  const { state, update } = useFunnel();
  const methods = provider?.methods ?? [];
  // lazy initializers: callers render nothing stateful before `ready`, so server and first client render still match
  const [method, setMethod] = useState<Method>(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("m") === "card" ? "card" : "pix"));
  const [cpf, setCpfRaw] = useState(() => formatCpf(ss.get("w2a_cpf") ?? ""));
  const [cpfError, setCpfError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setCpf = (v: string) => {
    setCpfRaw(formatCpf(v));
    setCpfError(false);
  };

  /** Starts the checkout of an order. `onStart` fires right before the request (pixel / PostHog of the caller). */
  const start = async (o: Order, onStart?: () => void) => {
    const plan = o.plan;
    if (busy) return;
    if (provider?.needsCpf && !isValidCpf(cpf)) {
      setCpfError(true);
      setError("Confira o seu CPF.");
      capture("w2a_checkout_error", { reason: "cpf_invalid_local", plan, method, source });
      document.getElementById(`w2a-cpf-${source}`)?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    onStart?.();
    try {
      const res = await fetch("/api/w2a/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: state.leadId,
          plan,
          ebook: o.includesEbook,
          ...(methods.length ? { method } : {}),
          ...(provider?.needsCpf ? { cpf } : {}),
          // the previous unpaid attempt (expired Pix, refused card) is canceled at the gateway; a paid one is left alone
          ...(state.purchase ? { replace: { pid: state.purchase.id, t: state.purchase.token } } : {}),
          ...metaCookies(state.attribution),
        }),
      });
      const j = (await res.json()) as { purchaseId?: string; token?: string; action?: CheckoutAction; error?: string };
      if (!res.ok || !j.purchaseId || !j.token || !j.action) throw new Error(j.error ?? "server");
      if (provider?.needsCpf) ss.set("w2a_cpf", cpf);
      update({ purchase: { id: j.purchaseId, token: j.token, plan, includesEbook: o.includesEbook } });
      const page = `/quiz/pagamento?pid=${j.purchaseId}&t=${j.token}`;
      if (j.action.kind === "pix") {
        ss.set(checkoutKey(j.purchaseId), JSON.stringify(j.action));
        router.push(`${page}&m=pix`);
        return;
      }
      if (j.action.returnsToSite === false) {
        // the gateway won't bring the buyer back: open its checkout in a new tab from our page, which keeps polling
        ss.set(checkoutKey(j.purchaseId), JSON.stringify(j.action));
        router.push(`${page}&m=card`);
        return;
      }
      window.location.assign(j.action.url);
    } catch (e) {
      const m = String(e);
      capture("w2a_checkout_error", { reason: m.slice(0, 80), plan, method, source });
      setError(
        m.includes("payments_unavailable")
          ? "Pagamento indisponível no momento. Tente de novo mais tarde."
          : m.includes("cpf")
            ? "CPF não aceito. Confira os números e tente de novo."
            : "Não conseguimos iniciar o pagamento. Tente de novo.",
      );
      if (m.includes("cpf")) setCpfError(true);
      setBusy(false);
    }
  };

  return { methods, method, setMethod, cpf, setCpf, cpfError, setCpfError, busy, error, start, needsCpf: !!provider?.needsCpf };
}

/** Pix | Cartão picker + CPF field. */
export function PayFields({ pay, source }: { pay: ReturnType<typeof usePay>; source: PaySource }) {
  const { methods, method, setMethod, cpf, setCpf, cpfError, setCpfError, needsCpf } = pay;
  return (
    <>
      {methods.length > 1 && (
        <div className="mt-5">
          <div className="mb-2 text-[13px] font-bold">Forma de pagamento</div>
          <div role="radiogroup" aria-label="Forma de pagamento" className="grid grid-cols-2 gap-2">
            {methods.map((m) => {
              const on = m === method;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setMethod(m);
                    capture("w2a_method_selected", { method: m, source });
                  }}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center rounded-2xl border bg-card text-[15px] font-bold transition-[border-color,box-shadow]",
                    on ? "border-cta shadow-[0_0_0_1.5px_var(--color-cta)]" : "border-line hover:border-linex",
                  )}
                >
                  {m === "pix" ? "Pix" : "Cartão de crédito"}
                  <span className="text-[11px] font-normal text-mute">{m === "pix" ? "aprovação na hora" : "ambiente seguro Asaas"}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {needsCpf && (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] font-bold">CPF do pagador</span>
          <input
            id={`w2a-cpf-${source}`}
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(e.target.value)}
            onBlur={() => cpf && setCpfError(!isValidCpf(cpf))}
            aria-invalid={cpfError}
            className={cn("h-12 w-full rounded-xl border bg-card px-3 text-[16px] tracking-wide outline-none focus:border-cta", cpfError ? "border-bad" : "border-linex")}
          />
          <span className={cn("mt-1 block text-[11.5px]", cpfError ? "text-bad" : "text-mute")}>
            {cpfError ? "CPF inválido. Confira os números." : "Exigido pelo banco para emitir o Pix ou a cobrança no cartão. Usado só no pagamento."}
          </span>
        </label>
      )}
    </>
  );
}

/** "Gerar Pix · R$ 5,00" / "Pagar com cartão · …" / "Continuar · …" (mock). */
export const payLabel = (pay: ReturnType<typeof usePay>, price: string) => `${pay.needsCpf ? (pay.method === "pix" ? "Gerar Pix" : "Pagar com cartão") : "Continuar"} · ${price}`;

/** The guide-alone success page, scrolled to the follow-up app offer. */
export const upsellUrl = (guide: { id: string; token: string }, method?: Method) =>
  `/quiz/sucesso?pid=${encodeURIComponent(guide.id)}&t=${encodeURIComponent(guide.token)}&upsell=1${method ? `&m=${method}` : ""}#upsell`;

/**
 * Retry after an expired Pix / refused card / canceled payment, keeping the selection: an offer checkout (guide alone or
 * guide + app) goes back to /quiz/oferta (bump and plan come back from the funnel state); the app alone, bought from
 * the follow-up offer, goes back to that offer on the guide's success page (when we know the guide).
 */
export function retryUrl(plan: string | undefined, includesEbook: boolean | undefined, method: Method | undefined, guide: { id: string; token: string } | null | undefined) {
  if (plan && plan !== "ebook" && includesEbook === false && guide) return upsellUrl(guide, method);
  return `/quiz/oferta${method ? `?m=${method}` : ""}`;
}
