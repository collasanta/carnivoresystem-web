"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ProviderInfo } from "@/lib/web2app/payments";
import { PLANS, brl, perMonth, planById, type PlanId } from "@/lib/web2app/plans";
import { capture } from "@/lib/web2app/analytics";
import { once, track } from "@/lib/web2app/pixel";
import { useFunnel } from "@/lib/web2app/state";
import { PayFields, payLabel, usePay } from "./pay";
import { APP_BENEFITS } from "./paywall";
import { Card, Check, Cta } from "./ui";

/**
 * Soft follow-up offer on the success page of a guide-alone purchase (the buyer unchecked the app bump on /quiz/oferta):
 * "Faça o desafio no app LeoDiet" with the app plans (lib/web2app/plans.ts PLANS, same prices and strike-throughs).
 * Paying starts a SEPARATE checkout for the same lead, app alone (`ebook: false`, the server only accepts it because
 * the lead has a paid guide) → /quiz/pagamento → /quiz/sucesso of the app purchase (code, stores, QR, guide link).
 * "Não, obrigado" collapses it (can be reopened).
 */

/** 12 meses first, then 3 meses, then vitalício (same order as the offer's bump). */
const ORDERED = ["annual", "quarterly", "lifetime"].map((id) => PLANS.find((p) => p.id === id)!).filter(Boolean);

export function Upsell({ provider, guidePid }: { provider: ProviderInfo; guidePid: string }) {
  const { state, update } = useFunnel();
  const pay = usePay(provider, "upsell");
  const [open, setOpen] = useState(true);
  const [picked, setPicked] = useState<PlanId | null>(null);
  const selected: PlanId = picked ?? (state.plan && state.plan !== "ebook" && planById(state.plan) ? state.plan : (PLANS.find((p) => p.featured)?.id ?? PLANS[0].id));
  const plan = planById(selected)!;
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    once(`upsell_view_${guidePid}`, () => capture("w2a_upsell_view", { guide_purchase_id: guidePid }));
    // coming back from an expired Pix / refused card of the upsell (retry pages link here with upsell=1)
    if (new URLSearchParams(window.location.search).get("upsell") === "1") ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [guidePid]);

  const checkout = () =>
    pay.start({ plan: selected, includesEbook: false }, () => {
      update({ plan: selected });
      track("AddPaymentInfo", { content_name: "web_upsell", content_ids: [`web_${selected}`], value: plan.priceCents / 100, currency: "BRL" });
      capture("w2a_upsell_checkout_started", { plan: selected, includes_app: true, includes_ebook: false, method: pay.methods.length ? pay.method : undefined, value: plan.priceCents / 100 });
    });

  if (!open)
    return (
      <Card className="mt-6 text-center">
        <p className="text-[13.5px] leading-relaxed text-mute">Tudo certo, bom desafio! O seu guia está acima e no seu e-mail.</p>
        <button
          type="button"
          className="mt-2 text-[13px] font-bold text-walnut underline"
          onClick={() => {
            setOpen(true);
            capture("w2a_upsell_reopened", {});
          }}
        >
          Mudei de ideia, quero ver o app
        </button>
      </Card>
    );

  return (
    <section id="upsell" ref={ref} className="mt-8 scroll-mt-16 rounded-3xl border border-line bg-tint px-4 py-5">
      <div className="text-center text-[11.5px] font-semibold tracking-[0.12em] text-walnut uppercase">Opcional</div>
      <h2 className="mt-1 text-center text-[22px] leading-tight font-extrabold tracking-[-0.02em] text-balance">Faça o desafio no app LeoDiet</h2>
      <p className="mx-auto mt-2 max-w-[360px] text-center text-[13.5px] leading-relaxed text-mute text-balance">
        O guia diz o que fazer. O app lembra você todo dia e conta os 30 dias por você.
      </p>

      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[13px] leading-snug">
        {APP_BENEFITS.map((i) => (
          <li key={i} className="flex gap-1.5">
            <Check className="size-3.5" />
            {i}
          </li>
        ))}
      </ul>

      <div role="radiogroup" aria-label="Planos do app" className="mt-5 flex flex-col gap-2">
        {ORDERED.map((p) => {
          const on = p.id === selected;
          const pm = perMonth(p);
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setPicked(p.id);
                capture("w2a_upsell_plan_selected", { plan: p.id });
              }}
              className={cn(
                "relative flex w-full items-center gap-3 rounded-xl border bg-card px-3 pt-3 pb-2.5 text-left transition-[border-color,box-shadow]",
                on ? "border-cta shadow-[0_0_0_1.5px_var(--color-cta)]" : "border-line hover:border-linex",
              )}
            >
              {p.badge && <span className="absolute -top-2.5 left-3 rounded-full bg-walnut px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap text-white">{p.badge}</span>}
              <span className={cn("flex size-[20px] flex-none items-center justify-center rounded-full border-[1.5px]", on ? "border-cta bg-cta" : "border-linex")} aria-hidden="true">
                {on && <span className="size-2 rounded-full bg-white" />}
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-extrabold whitespace-nowrap">{p.title}</span>
                <span className="block text-[11.5px] text-mute">{p.periodMonths ? `App por ${p.periodMonths} meses` : "App para sempre"}</span>
              </span>
              <span className="text-right">
                <span className="block text-[15px] font-extrabold">{brl(p.priceCents)}</span>
                <span className="block text-[11px] text-mute">{p.appPriceCents ? <s>{brl(p.appPriceCents)} no app</s> : pm}</span>
              </span>
            </button>
          );
        })}
      </div>

      <PayFields pay={pay} source="upsell" />
      <p className="mt-3 text-center text-[12px] text-mute">Pagamento único · sem renovação automática · 7 dias para se arrepender</p>
      {pay.error && <p className="mt-3 text-center text-[13px] text-bad">{pay.error}</p>}
      <div className="mt-4">
        <Cta sticky={false} onClick={checkout} busy={pay.busy}>
          {payLabel(pay, brl(plan.priceCents))}
        </Cta>
      </div>
      <button
        type="button"
        className="mt-3 flex h-11 w-full items-center justify-center text-[14px] font-semibold text-mute underline"
        onClick={() => {
          setOpen(false);
          capture("w2a_upsell_declined", { plan: selected });
        }}
      >
        Não, obrigado
      </button>
    </section>
  );
}
