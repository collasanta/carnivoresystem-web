"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCpf, isValidCpf } from "@/lib/web2app/cpf";
import type { ProviderInfo } from "@/lib/web2app/payments";
import { PLANS, brl, perMonth, planById, type PlanId } from "@/lib/web2app/plans";
import { fmtDate, fmtKg, project } from "@/lib/web2app/projection";
import { track } from "@/lib/web2app/pixel";
import { metaCookies, useFunnel } from "@/lib/web2app/state";
import { Card, Cta, Disclaimer, Page, Title, TopBar } from "./ui";

/**
 * /quiz/oferta — web paywall. Prices come from lib/web2app/plans.ts. "Continuar" creates the purchase on the server
 * (POST /api/w2a/checkout), which asks the active payment provider for a checkout and returns where to send the
 * browser (hosted checkout, Pix, or the mock page in local dev). With Asaas the buyer picks Pix or card and types the
 * CPF (Asaas requires it); the CPF goes to the gateway only and stays in sessionStorage to prefill a retry.
 */
const INCLUDED = [
  "Sal e água calculados para o seu corpo, com lembretes",
  "Registro do dia em um toque: carnívoro ou saiu da dieta",
  "Calendário de dias limpos e sequências",
  "Humor, sintomas e peso com gráficos",
  "Cards para compartilhar o seu progresso",
  "iPhone e Android, em português",
];

const FAQ = [
  { q: "Como eu acesso depois de pagar?", a: "Você recebe um código na tela e por e-mail. Baixe o LeoDiet na App Store ou no Google Play e ative com o código. No Android ele pode ativar sozinho quando você instala pelo nosso botão." },
  { q: "É assinatura? Vai cobrar de novo?", a: "Não. Os planos daqui são pagamento único: 3 meses, 12 meses ou vitalício. Nada renova sozinho." },
  { q: "E se eu me arrepender?", a: "Você pode pedir o reembolso em até 7 dias após a compra, sem precisar explicar o motivo. É só escrever para leo@leodiet.com." },
  { q: "Funciona em mais de um celular?", a: "Sim, o código pode ser ativado em até 3 aparelhos." },
];

type CheckoutAction =
  | { kind: "redirect"; url: string; returnsToSite?: boolean }
  | { kind: "pix"; qrCodeBase64?: string; copyPaste: string; expiresAt?: string };

const ss = {
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

export function Paywall({ provider }: { provider: ProviderInfo }) {
  const router = useRouter();
  const { state, ready, update } = useFunnel();
  const [picked, setSelected] = useState<PlanId | null>(null);
  const selected: PlanId = picked ?? (state.plan && planById(state.plan) ? state.plan : (PLANS.find((p) => p.featured)?.id ?? PLANS[0].id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const methods = provider?.methods ?? [];
  // lazy initializers: nothing below is rendered before `ready`, so server and first client render still match
  const [method, setMethod] = useState<"pix" | "card">(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("m") === "card" ? "card" : "pix"));
  const [cpf, setCpf] = useState(() => formatCpf(ss.get("w2a_cpf") ?? ""));
  const [cpfError, setCpfError] = useState(false);
  const proj = useMemo(() => (ready ? project(state.answers) : null), [ready, state.answers]);

  useEffect(() => {
    if (!ready) return;
    if (!state.leadId) {
      router.replace(state.answers.weightKg ? "/quiz/plano" : "/quiz");
      return;
    }
    track("InitiateCheckout", { content_name: "web_paywall", currency: "BRL", num_items: 1 });
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !state.leadId) return <Page><TopBar /></Page>;

  const plan = planById(selected)!;
  const checkout = async () => {
    if (busy) return;
    if (provider?.needsCpf && !isValidCpf(cpf)) {
      setCpfError(true);
      setError("Confira o seu CPF.");
      document.getElementById("w2a-cpf")?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    update({ plan: selected });
    track("AddPaymentInfo", { content_name: `web_${selected}`, value: plan.priceCents / 100, currency: plan.currency });
    try {
      const res = await fetch("/api/w2a/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: state.leadId,
          plan: selected,
          ...(methods.length ? { method } : {}),
          ...(provider?.needsCpf ? { cpf } : {}),
          // the previous unpaid attempt (expired Pix, refused card) is canceled at the gateway
          ...(state.purchase ? { replace: { pid: state.purchase.id, t: state.purchase.token } } : {}),
          ...metaCookies(state.attribution),
        }),
      });
      const j = (await res.json()) as { purchaseId?: string; token?: string; action?: CheckoutAction; error?: string };
      if (!res.ok || !j.purchaseId || !j.token || !j.action) throw new Error(j.error ?? "server");
      if (provider?.needsCpf) ss.set("w2a_cpf", cpf);
      update({ purchase: { id: j.purchaseId, token: j.token, plan: selected } });
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

  const name = state.answers.name?.trim();
  return (
    <Page>
      <TopBar onBack={() => router.push("/quiz/plano")} />
      <Title sub={proj && proj.kind === "lose" ? `Meta: ${fmtKg(proj.targetKg)} até ${fmtDate(proj.date)} (estimativa)` : undefined}>
        {name ? `${name}, comece hoje o seu plano` : "Comece hoje o seu plano"}
      </Title>

      <div role="radiogroup" aria-label="Planos" className="flex flex-col gap-3">
        {PLANS.map((p) => {
          const on = p.id === selected;
          const pm = perMonth(p);
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setSelected(p.id)}
              className={cn(
                "relative flex w-full items-center gap-3 rounded-2xl border bg-card px-4 py-4 text-left transition-[border-color,box-shadow]",
                on ? "border-cta shadow-[0_0_0_1.5px_var(--color-cta)]" : "border-line hover:border-linex",
              )}
            >
              {p.badge && <span className="absolute -top-2.5 left-4 rounded-full bg-walnut px-2.5 py-0.5 text-[11px] font-bold text-white">{p.badge}</span>}
              <span className={cn("flex size-[22px] flex-none items-center justify-center rounded-full border-[1.5px]", on ? "border-cta bg-cta" : "border-linex")} aria-hidden="true">
                {on && <span className="size-2 rounded-full bg-white" />}
              </span>
              <span className="flex-1">
                <span className="block text-[16px] font-extrabold tracking-[-0.01em]">{p.title}</span>
                <span className="mt-0.5 block text-[12px] text-mute">{p.sub}</span>
              </span>
              <span className="text-right">
                {/* billed amount = the most prominent price */}
                <span className="block text-[19px] font-extrabold tracking-[-0.02em]">{brl(p.priceCents)}</span>
                <span className="block text-[11.5px] text-mute">
                  {p.appPriceCents ? <s className="mr-1">{brl(p.appPriceCents)} no app</s> : null}
                  {!p.appPriceCents && pm ? pm : null}
                </span>
              </span>
            </button>
          );
        })}
      </div>

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
                  onClick={() => setMethod(m)}
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
      {provider?.needsCpf && (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] font-bold">CPF do pagador</span>
          <input
            id="w2a-cpf"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => {
              setCpf(formatCpf(e.target.value));
              setCpfError(false);
            }}
            onBlur={() => cpf && setCpfError(!isValidCpf(cpf))}
            aria-invalid={cpfError}
            className={cn("h-12 w-full rounded-xl border bg-card px-3 text-[16px] tracking-wide outline-none focus:border-cta", cpfError ? "border-bad" : "border-linex")}
          />
          <span className={cn("mt-1 block text-[11.5px]", cpfError ? "text-bad" : "text-mute")}>
            {cpfError ? "CPF inválido. Confira os números." : "Exigido pelo banco para emitir o Pix ou a cobrança no cartão. Usado só no pagamento."}
          </span>
        </label>
      )}

      <p className="mt-3 text-center text-[12px] text-mute">
        Pagamento único · sem renovação automática · {methods.length ? "Pix ou cartão" : "pagamento de teste"}
      </p>

      <Card className="mt-6">
        <div className="text-[12px] font-semibold tracking-[0.12em] text-mute uppercase">O que está incluído</div>
        <ul className="mt-3 flex flex-col gap-2.5 text-[14px]">
          {INCLUDED.map((i) => (
            <li key={i} className="flex gap-2.5">
              <svg viewBox="0 0 24 24" className="mt-0.5 size-4 flex-none text-good" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              {i}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4 bg-tint">
        <div className="flex items-start gap-3">
          <span className="text-[22px]" aria-hidden="true">🛡️</span>
          <div>
            <div className="text-[15px] font-extrabold">7 dias para se arrepender</div>
            <p className="mt-1 text-[13px] leading-relaxed text-mute">Se não for para você, devolvemos o valor integral em até 7 dias após a compra. Basta escrever para leo@leodiet.com.</p>
          </div>
        </div>
      </Card>

      <section className="mt-6">
        <h2 className="mb-2 text-[16px] font-extrabold">Perguntas frequentes</h2>
        <div className="flex flex-col gap-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-line bg-card px-4 py-3">
              <summary className="cursor-pointer list-none text-[14px] font-bold marker:hidden">
                <span className="flex items-center justify-between gap-3">
                  {f.q}
                  <span className="text-mute transition group-open:rotate-45" aria-hidden="true">+</span>
                </span>
              </summary>
              <p className="mt-2 text-[13px] leading-relaxed text-mute">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {error && <p className="mt-4 text-center text-[13px] text-bad">{error}</p>}
      <p className="mt-6 text-center text-[11.5px] leading-relaxed text-faint">
        Ao comprar você concorda com os <a href="/terms" target="_blank" className="underline">Termos de Uso</a> e a{" "}
        <a href="/privacy" target="_blank" className="underline">Política de Privacidade</a>. Pagamento processado pelo Asaas; no seu banco o recebedor aparece como Victor Henrique Collasanta.
      </p>
      <Disclaimer className="mt-3" />
      <Cta onClick={checkout} busy={busy}>
        {provider?.needsCpf ? (method === "pix" ? "Gerar Pix" : "Pagar com cartão") : "Continuar"} · {brl(plan.priceCents)}
      </Cta>
    </Page>
  );
}
