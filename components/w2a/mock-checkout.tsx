"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { brl, planById } from "@/lib/web2app/plans";
import { useFunnel } from "@/lib/web2app/state";
import { Card, Page, Title, TopBar } from "./ui";

/**
 * /quiz/pagamento (no `m`) — stand-in for the gateway's checkout while PAYMENT_PROVIDER=mock (local dev only). No card
 * fields, no money: two buttons that play the gateway's answer (POST /api/w2a/mock-pay). The real gateway (Asaas) uses
 * ./checkout.tsx (/quiz/pagamento?m=pix|card).
 */
export function MockCheckout() {
  const q = useSearchParams();
  const router = useRouter();
  const { state, ready } = useFunnel();
  const pid = q.get("pid") ?? "";
  const t = q.get("t") ?? "";
  const plan = planById(state.purchase?.plan ?? state.plan ?? "");
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && (!pid || !t)) router.replace("/quiz/oferta");
  }, [ready, pid, t, router]);

  const pay = async (outcome: "approve" | "decline") => {
    setBusy(outcome);
    setError(null);
    try {
      const res = await fetch("/api/w2a/mock-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid, t, outcome }),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.push(`/quiz/sucesso?pid=${pid}&t=${t}`);
    } catch (e) {
      setError(`Falhou (${String(e)}). O mock só funciona fora de produção.`);
      setBusy(null);
    }
  };

  return (
    <Page>
      <TopBar onBack={() => router.push("/quiz/oferta")} />
      <div className="mt-4 rounded-2xl border border-warn/50 bg-warn/10 px-4 py-3 text-center text-[12.5px] leading-relaxed text-ink">
        <b>Ambiente de teste local.</b> Pagamento simulado (PAYMENT_PROVIDER=mock); nenhum valor é cobrado.
      </div>
      <Title>Pagamento</Title>
      <Card>
        <div className="flex items-center justify-between text-[15px]">
          <span className="text-mute">Plano</span>
          <b>{plan?.title ?? "–"}</b>
        </div>
        <div className="mt-2 flex items-center justify-between text-[15px]">
          <span className="text-mute">E-mail</span>
          <b className="truncate pl-4">{state.email ?? "–"}</b>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4 text-[18px]">
          <span className="font-bold">Total</span>
          <b>{plan ? brl(plan.priceCents) : "–"}</b>
        </div>
      </Card>
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => pay("approve")}
          disabled={!!busy}
          className="flex h-14 items-center justify-center rounded-2xl bg-good text-[16px] font-bold text-white shadow-[0_10px_30px_rgba(74,122,58,0.25)] disabled:opacity-50"
        >
          {busy === "approve" ? "Aprovando…" : "Simular pagamento aprovado"}
        </button>
        <button type="button" onClick={() => pay("decline")} disabled={!!busy} className="flex h-12 items-center justify-center rounded-2xl border border-linex bg-card text-[14px] font-bold text-ink disabled:opacity-50">
          {busy === "decline" ? "Recusando…" : "Simular pagamento recusado"}
        </button>
      </div>
      {error && <p className="mt-4 text-center text-[13px] text-bad">{error}</p>}
    </Page>
  );
}
