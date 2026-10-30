"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { ProviderInfo } from "@/lib/web2app/payments";
import { GUIDE, PLANS, brl, order, perMonth, planById, type PlanId } from "@/lib/web2app/plans";
import type { Device } from "@/lib/web2app/device";
import { useDevice } from "@/lib/web2app/use-device";
import { fmtDate, fmtKg, project } from "@/lib/web2app/projection";
import { dayEnd, fmtDayShort, startsWhen } from "@/lib/web2app/challenge";
import { capture } from "@/lib/web2app/analytics";
import { track } from "@/lib/web2app/pixel";
import { useFunnel } from "@/lib/web2app/state";
import { PayFields, payLabel, usePay } from "./pay";
import { Card, Check, Cta, Disclaimer, Page, Title, TopBar } from "./ui";

/**
 * /quiz/oferta — sells the "Guia do Desafio Carnívoro de 30 dias" (PDF, R$ 5,00, lib/web2app/plans.ts GUIDE), always
 * included, plus an order bump right below, PRE-CHECKED: "Adicionar o app LeoDiet" with the app plan inside (12 meses
 * pre-selected). One checkout / one charge for the total (plans.ts order(): the server re-prices it). Unchecking leaves
 * the guide alone (R$ 5). Pix / card + CPF in ./pay.tsx. Bump and plan live in the funnel state, so an expired Pix or a
 * refused card comes back here with the same selection.
 */
export const GUIDE_CONTENTS = [
  "A semana de adaptação, dia a dia",
  "Sal e água: quanto, quando e por quê",
  "O plano das 4 semanas do desafio",
  "Cardápios simples e lista de compras",
  "Churrasco, restaurante e fim de semana",
];

export const APP_BENEFITS = ["Lembretes de sal e água", "Marque o dia em um toque", "Calendário dos 30 dias", "Comemoração no dia 30"];

/** 12 meses first (pre-selected), then 3 meses, then vitalício. */
const BUMP_PLANS = ["annual", "quarterly", "lifetime"].map((id) => PLANS.find((p) => p.id === id)!).filter(Boolean);
const DEFAULT_PLAN: PlanId = PLANS.find((p) => p.featured)?.id ?? "annual";

function steps(device: Device | null, withApp: boolean): { t: string; d: string }[] {
  const out = [
    { t: "Pague aqui", d: "Pix ou cartão, pagamento único." },
    { t: "Receba o guia na hora", d: "O download aparece na tela e o link chega no seu e-mail." },
  ];
  if (withApp)
    out.push(
      device === "desktop"
        ? { t: "Ative o app no celular", d: "Você recebe um código na tela e no e-mail. Na próxima tela mostramos um QR code: aponte a câmera do celular para instalar o LeoDiet e ativar." }
        : device === "android"
          ? { t: "Baixe o app e ative", d: "Você recebe um código na tela e no e-mail. Instalando o LeoDiet pelo nosso botão do Google Play, ele já ativa sozinho." }
          : { t: "Baixe o app e ative", d: "Você recebe um código na tela e no e-mail. Instale o LeoDiet e ative com o código." },
    );
  return out;
}

const FAQ = [
  { q: "Como eu recebo o guia?", a: "Assim que o pagamento é aprovado, o botão de download aparece na tela e o link chega no seu e-mail. É um PDF: abre no celular, no computador ou dá para imprimir." },
  { q: "Preciso do app?", a: "Não. O guia tem tudo para fazer os 30 dias. O app LeoDiet é opcional, para quem quer lembretes de sal e água, marcar o dia em um toque e ver o calendário dos 30 dias no celular." },
  { q: "Como eu acesso o app depois de pagar?", a: "Você recebe um código na tela e por e-mail, baixa o LeoDiet na App Store ou no Google Play e ativa com o código. No Android ele pode ativar sozinho quando você instala pelo nosso botão." },
  { q: "É assinatura? Vai cobrar de novo?", a: "Não. Tudo aqui é pagamento único: o guia e, se você incluir, o app por 3 meses, 12 meses ou para sempre. Nada renova sozinho." },
  { q: "E se eu me arrepender?", a: "Você pode pedir o reembolso em até 7 dias após a compra, sem precisar explicar o motivo. É só escrever para leo@leodiet.com." },
  { q: "O app funciona em mais de um celular?", a: "Sim, o código pode ser ativado em até 3 aparelhos." },
];

export function Paywall({ provider }: { provider: ProviderInfo }) {
  const router = useRouter();
  const { state, ready, update } = useFunnel();
  const pay = usePay(provider, "offer");
  const [bumpPicked, setBump] = useState<boolean | null>(null);
  const [picked, setPicked] = useState<PlanId | null>(null);
  const proj = useMemo(() => (ready ? project(state.answers) : null), [ready, state.answers]);
  const device = useDevice();

  // the selection survives a retry (expired Pix, refused card): the funnel state remembers both
  const bump = bumpPicked ?? state.bump ?? true;
  const remembered = state.plan && state.plan !== "ebook" && BUMP_PLANS.some((p) => p.id === state.plan) ? state.plan : null;
  const appPlan: PlanId = picked ?? remembered ?? DEFAULT_PLAN;
  const o = order(bump ? appPlan : GUIDE.id, true)!;

  useEffect(() => {
    if (!ready) return;
    if (!state.leadId) {
      router.replace(state.answers.weightKg ? "/quiz/plano" : "/quiz");
      return;
    }
    track("InitiateCheckout", { content_name: "web_offer", content_ids: bump ? ["web_ebook", `web_${appPlan}`] : ["web_ebook"], value: o.amountCents / 100, currency: "BRL", num_items: bump ? 2 : 1 });
    capture("w2a_paywall_view", { device: device ?? undefined, accepted: !!state.answers.challengeAcceptedAt, offer: "guide_bump", bump, plan: appPlan });
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !state.leadId) return <Page><TopBar /></Page>;

  const toggle = (on: boolean) => {
    setBump(on);
    update({ bump: on });
    capture("w2a_bump_toggled", { on, plan: appPlan });
  };
  const pick = (id: PlanId) => {
    if (!bump) toggle(true);
    setPicked(id);
    update({ plan: id });
    capture("w2a_bump_plan_selected", { plan: id });
  };

  const checkout = () =>
    pay.start({ plan: o.plan, includesEbook: true }, () => {
      update({ bump, ...(bump ? { plan: appPlan } : {}) });
      const ids = bump ? ["web_ebook", `web_${appPlan}`] : ["web_ebook"];
      track("AddPaymentInfo", { content_name: "web_offer", content_ids: ids, value: o.amountCents / 100, currency: "BRL" });
      capture("w2a_checkout_started", { plan: o.plan, includes_app: bump, includes_ebook: true, value: o.amountCents / 100, method: pay.methods.length ? pay.method : undefined });
    });

  const name = state.answers.name?.trim();
  // normal flow: the start date was picked and the pledge accepted on /quiz/plano; a buyer coming back from an
  // e-mail or an expired Pix may have neither, or a start date already in the past: the paywall works the same
  const start = state.answers.challengeStart;
  const when = start ? startsWhen(start) : null;
  const title = when ? `${name ? `${name}, seu` : "Seu"} desafio começa ${when}` : name ? `${name}, entre no desafio` : "Entre no Desafio Carnívoro de 30 dias";
  const sub = [start && when ? `Dia 1: ${fmtDayShort(start)} · Dia 30: ${fmtDayShort(dayEnd(start))}.` : null, "Tudo o que você precisa para os 30 dias, em um guia direto ao ponto."]
    .filter(Boolean)
    .join(" ");
  const app = planById(appPlan)!;

  return (
    <Page>
      <TopBar onBack={() => router.push("/quiz/plano")} />
      <Title sub={sub}>{title}</Title>
      {proj && proj.kind === "lose" && (
        <p className="-mt-3 mb-5 text-center text-[12.5px] text-mute">Meta: {fmtKg(proj.targetKg)} até {fmtDate(proj.date)} (estimativa)</p>
      )}

      {/* the guide: always in the order */}
      <Card className="flex gap-4">
        <Image src="/quiz/ebook-cover.png" alt="Capa do Guia do Desafio Carnívoro de 30 dias" width={600} height={800} className="h-auto w-[92px] flex-none self-start rounded-lg shadow-[0_8px_20px_rgba(37,30,23,0.22)]" priority />
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-semibold tracking-[0.12em] text-mute uppercase">Guia em PDF · incluído</div>
          <div className="mt-1 text-[16px] leading-tight font-extrabold tracking-[-0.01em]">{GUIDE.title}</div>
          <ul className="mt-2 flex flex-col gap-1 text-[12.5px] leading-snug">
            {GUIDE_CONTENTS.map((i) => (
              <li key={i} className="flex gap-1.5">
                <Check className="size-3.5" />
                {i}
              </li>
            ))}
          </ul>
          <div className="mt-2 text-[14px] font-bold">{brl(GUIDE.priceCents)}</div>
        </div>
      </Card>

      {/* order bump: pre-checked */}
      <div className={cn("mt-4 rounded-2xl border-2 border-dashed px-4 pt-3.5 pb-4 transition-colors", bump ? "border-cta bg-card" : "border-linex bg-tint")}>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={bump} onChange={(e) => toggle(e.target.checked)} className="peer sr-only" />
          <span
            className={cn(
              "mt-0.5 flex size-6 flex-none items-center justify-center rounded-md border-2 peer-focus-visible:ring-2 peer-focus-visible:ring-cta/40",
              bump ? "border-cta bg-cta text-white" : "border-linex bg-card",
            )}
            aria-hidden="true"
          >
            {bump && (
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16.5px] leading-tight font-extrabold">Adicionar o app LeoDiet</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-mute">Faça o desafio no celular, com o app no seu bolso.</span>
          </span>
        </label>
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px] leading-snug">
          {APP_BENEFITS.map((b) => (
            <li key={b} className="flex gap-1.5">
              <Check className="size-3.5" />
              {b}
            </li>
          ))}
        </ul>
        <div role="radiogroup" aria-label="Plano do app" className={cn("mt-4 flex flex-col gap-2 transition-opacity", !bump && "opacity-55")}>
          {BUMP_PLANS.map((p) => {
            const on = bump && p.id === appPlan;
            const pm = perMonth(p);
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => pick(p.id)}
                className={cn(
                  "relative flex w-full items-center gap-3 rounded-xl border bg-card px-3 pt-3 pb-2.5 text-left transition-[border-color,box-shadow]",
                  on ? "border-cta shadow-[0_0_0_1.5px_var(--color-cta)]" : "border-line hover:border-linex",
                )}
              >
                <span className={cn("flex size-[20px] flex-none items-center justify-center rounded-full border-[1.5px]", on ? "border-cta bg-cta" : "border-linex")} aria-hidden="true">
                  {on && <span className="size-2 rounded-full bg-white" />}
                </span>
                <span className="flex-1">
                  {p.badge && <span className="absolute -top-2.5 left-3 rounded-full bg-walnut px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap text-white">{p.badge}</span>}
                  <span className="block text-[15px] font-extrabold whitespace-nowrap">{p.title}</span>
                  <span className="block text-[11.5px] text-mute">{p.periodMonths ? `App por ${p.periodMonths} meses` : "App para sempre"}</span>
                </span>
                <span className="text-right">
                  <span className="block text-[15px] font-extrabold">+ {brl(p.priceCents)}</span>
                  <span className="block text-[11px] text-mute">{p.appPriceCents ? <s>{brl(p.appPriceCents)} no app</s> : pm}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* the billed total: the most prominent price on the page */}
      <Card className="mt-4">
        <div className="flex items-center justify-between text-[13.5px] text-mute">
          <span>Guia do Desafio (PDF)</span>
          <span>{brl(GUIDE.priceCents)}</span>
        </div>
        {bump && (
          <div className="mt-1 flex items-center justify-between text-[13.5px] text-mute">
            <span>App LeoDiet · {app.title}</span>
            <span>{brl(app.priceCents)}</span>
          </div>
        )}
        <div className="mt-3 flex items-end justify-between border-t border-line pt-3">
          <span className="text-[18px] font-extrabold">Total</span>
          <span className="text-[30px] leading-none font-extrabold tracking-[-0.03em]" aria-live="polite">{brl(o.amountCents)}</span>
        </div>
        <div className="mt-1.5 text-right text-[12.5px] font-semibold text-walnut">pagamento único · não renova</div>
      </Card>

      <Card className="mt-5">
        <div className="text-[12px] font-semibold tracking-[0.12em] text-mute uppercase">Como funciona</div>
        <ol className="mt-3 flex flex-col gap-3">
          {steps(device, bump).map((st, i) => (
            <li key={st.t} className="flex gap-3">
              <span className="flex size-6 flex-none items-center justify-center rounded-full bg-walnut text-[12px] font-bold text-white" aria-hidden="true">
                {i + 1}
              </span>
              <span>
                <span className="block text-[14px] font-bold">{st.t}</span>
                <span className="block text-[12.5px] leading-relaxed text-mute">{st.d}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <PayFields pay={pay} source="offer" />

      <p className="mt-3 text-center text-[12px] text-mute">
        Pagamento único · sem renovação automática · {pay.methods.length ? "Pix ou cartão" : "pagamento de teste"}
      </p>

      <Card className="mt-6 bg-tint">
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

      {pay.error && <p className="mt-4 text-center text-[13px] text-bad">{pay.error}</p>}
      <p className="mt-6 text-center text-[11.5px] leading-relaxed text-faint">
        Ao comprar você concorda com os <a href="/terms" target="_blank" className="underline">Termos de Uso</a> e a{" "}
        <a href="/privacy" target="_blank" className="underline">Política de Privacidade</a>. Pagamento processado pelo Asaas; no seu banco o recebedor aparece como Victor Henrique Collasanta.
      </p>
      <Disclaimer className="mt-3" />
      <Cta onClick={checkout} busy={pay.busy}>
        {payLabel(pay, brl(o.amountCents))}
      </Cta>
    </Page>
  );
}
