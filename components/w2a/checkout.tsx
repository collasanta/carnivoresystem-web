"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { capture } from "@/lib/web2app/analytics";
import { brl, order } from "@/lib/web2app/plans";
import { useFunnel } from "@/lib/web2app/state";
import { checkoutKey, retryUrl } from "./pay";
import { Card, Cta, Page, Title, TopBar } from "./ui";

/**
 * /quiz/pagamento?m=pix|card — real-gateway checkout pages (the mock keeps its own page, ./mock-checkout.tsx).
 *  pix:  QR + copia-e-cola from the checkout response (sessionStorage), countdown, polls the purchase, auto-advances.
 *  card: only when the gateway can't send the buyer back (Asaas without a registered domain): opens the hosted invoice
 *        in a new tab and polls here.
 * Polling: GET /api/w2a/purchase every 3 s; every 5th call adds check=1 so the server asks the gateway too.
 */
type Purchase = { id: string; status: string; plan: string; amountCents: number; reason: "pix_expired" | "card_refused" | "canceled" | null; includesApp?: boolean; includesEbook?: boolean; guide?: { id: string; token: string } | null };
type PixAction = { kind: "pix"; qrCodeBase64?: string; copyPaste: string; expiresAt?: string };
type CardAction = { kind: "redirect"; url: string };

function readAction<T>(pid: string): T | null {
  try {
    const raw = sessionStorage.getItem(checkoutKey(pid));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function usePurchasePoll(pid: string, t: string, active: boolean) {
  const [p, setP] = useState<Purchase | null>(null);
  const n = useRef(0);
  useEffect(() => {
    if (!pid || !t || !active) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const check = n.current++ % 5 === 4 ? "&check=1" : "";
      try {
        const res = await fetch(`/api/w2a/purchase?pid=${encodeURIComponent(pid)}&t=${encodeURIComponent(t)}${check}`, { cache: "no-store" });
        const j = (await res.json()) as { purchase?: Purchase };
        if (!stop && j.purchase) setP(j.purchase);
        if (j.purchase && j.purchase.status !== "pending") return;
      } catch {
        /* network blip: keep polling */
      }
      if (!stop && n.current < 1200) timer = setTimeout(poll, 3000);
    };
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [pid, t, active]);
  return p;
}

function Summary({ planId, withEbook }: { planId?: string; withEbook: boolean }) {
  const o = order(planId ?? "", withEbook);
  if (!o) return null;
  return (
    <div className="mb-4 flex items-center justify-between text-[15px]">
      <span className="text-mute">{o.label}</span>
      <b>{brl(o.amountCents)}</b>
    </div>
  );
}

export function GatewayCheckout() {
  const q = useSearchParams();
  const router = useRouter();
  const { state, ready } = useFunnel();
  const pid = q.get("pid") ?? "";
  const t = q.get("t") ?? "";
  const m = q.get("m") === "card" ? "card" : "pix";
  const [expired, setExpired] = useState(false);
  const expire = useCallback(() => setExpired(true), []);
  const p = usePurchasePoll(pid, t, ready && !expired);

  useEffect(() => {
    if (ready && (!pid || !t)) router.replace("/quiz/oferta");
  }, [ready, pid, t, router]);
  const outcome = p?.status === "failed" || (m === "card" && p?.status === "canceled") ? "card_refused" : m === "pix" && (expired || p?.reason === "pix_expired" || p?.status === "canceled") ? "pix_expired" : null;
  useEffect(() => {
    if (outcome) capture(`w2a_${outcome}`, { plan: p?.plan });
  }, [outcome]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (p?.status === "paid") router.replace(`/quiz/sucesso?pid=${pid}&t=${t}`);
  }, [p?.status, pid, t, router]);

  if (!ready) return <Page><TopBar /></Page>;
  const planId = p?.plan ?? state.purchase?.plan;
  const withEbook = p?.includesEbook ?? state.purchase?.includesEbook ?? planId === "ebook";
  // the guide retries on /quiz/oferta, an upsell app plan on the guide's success page (upsell open)
  const back = retryUrl(planId, withEbook, undefined, p?.guide ?? state.guide);
  const retry = (method: "pix" | "card") => {
    capture("w2a_payment_retry", { method, plan: planId });
    router.push(retryUrl(planId, withEbook, method, p?.guide ?? state.guide));
  };

  if (p?.status === "refunded")
    return (
      <Page>
        <TopBar />
        <Title sub="Se tiver dúvidas, escreva para leo@leodiet.com.">Essa compra foi reembolsada</Title>
        <Cta onClick={() => router.push(back)}>Voltar</Cta>
      </Page>
    );

  if (m === "pix" && (expired || p?.reason === "pix_expired" || p?.status === "canceled"))
    return (
      <Page>
        <TopBar onBack={() => router.push(back)} />
        <div className="mx-auto mt-10 flex size-16 items-center justify-center rounded-full bg-tint text-[30px]" aria-hidden="true">⏱️</div>
        <Title sub={`Gere um novo Pix para continuar. Se você já pagou este, fique tranquilo: assim que o banco confirmar, ${planId === "ebook" ? "o guia" : "o código"} chega no seu e-mail.`}>
          Este Pix expirou
        </Title>
        <Cta onClick={() => retry("pix")}>Gerar novo Pix</Cta>
      </Page>
    );

  if (p?.status === "failed" || (m === "card" && p?.status === "canceled"))
    return (
      <Page>
        <TopBar onBack={() => router.push(back)} />
        <div className="mx-auto mt-10 flex size-16 items-center justify-center rounded-full bg-tint text-[30px]" aria-hidden="true">⚠️</div>
        <Title sub="Nenhum valor foi cobrado. Confira os dados do cartão, tente outro cartão ou pague com Pix, que é aprovado na hora.">
          O cartão não foi aprovado
        </Title>
        <div className="flex flex-col gap-3">
          <button type="button" onClick={() => retry("card")} className="flex h-12 items-center justify-center rounded-2xl border border-linex bg-card text-[15px] font-bold">
            Tentar com outro cartão
          </button>
        </div>
        <Cta onClick={() => retry("pix")}>Pagar com Pix</Cta>
      </Page>
    );

  return m === "pix" ? <Pix pid={pid} planId={planId} withEbook={withEbook} onExpire={expire} back={back} retryPix={retryUrl(planId, withEbook, "pix", p?.guide ?? state.guide)} /> : <CardWait pid={pid} planId={planId} withEbook={withEbook} back={back} />;
}

function Pix({ pid, planId, withEbook, onExpire, back, retryPix }: { pid: string; planId?: string; withEbook: boolean; onExpire: () => void; back: string; retryPix: string }) {
  const router = useRouter();
  const [a] = useState(() => readAction<PixAction>(pid));
  const [left, setLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    capture(a ? "w2a_pix_shown" : "w2a_pix_missing", { plan: planId });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!a?.expiresAt) return;
    const end = Date.parse(a.expiresAt);
    const tick = () => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) onExpire();
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [a, onExpire]);

  if (!a)
    return (
      <Page>
        <TopBar onBack={() => router.push(back)} />
        <Title sub={`Se você já pagou, ${planId === "ebook" ? "o guia" : "o código"} chega no seu e-mail assim que o banco confirmar.`}>Este Pix não está mais nesta aba</Title>
        <Cta onClick={() => router.push(retryPix)}>Gerar novo Pix</Cta>
      </Page>
    );

  const copy = async () => {
    try {
      capture("w2a_pix_copied", { plan: planId });
      await navigator.clipboard.writeText(a.copyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* the text is selectable below */
    }
  };
  const mm = left != null ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` : null;
  return (
    <Page>
      <TopBar onBack={() => router.push(back)} />
      <Title sub="Abra o app do seu banco, escolha Pix › Pix Copia e Cola (ou ler QR code) e confirme. O recebedor aparece como Victor Henrique Collasanta (Leo). Esta tela avança sozinha quando o pagamento for aprovado.">
        Pague com Pix
      </Title>
      <Card>
        <Summary planId={planId} withEbook={withEbook} />
        {a.qrCodeBase64 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`data:image/png;base64,${a.qrCodeBase64}`} alt="QR code do Pix" className="mx-auto size-56 rounded-xl border border-line bg-white p-2" />
        )}
        <button
          type="button"
          onClick={copy}
          className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-cta text-[16px] font-bold text-white shadow-[0_10px_30px_rgba(37,30,23,0.25)]"
        >
          {copied ? "Código copiado!" : "Copiar código Pix"}
        </button>
        <p className="mt-3 max-h-20 overflow-hidden rounded-xl bg-tint px-3 py-2 font-mono text-[11px] leading-snug break-all text-mute select-all">{a.copyPaste}</p>
      </Card>
      <div className="mt-5 flex items-center justify-center gap-2 text-[13px] text-mute" role="status" aria-live="polite">
        <span className="size-3 animate-spin rounded-full border-2 border-line border-t-walnut" aria-hidden="true" />
        Aguardando o pagamento{mm ? ` · expira em ${mm}` : ""}
      </div>
      <p className="mt-6 text-center text-[12px] leading-relaxed text-faint">
        O pagamento aparece para o recebedor Asaas. Pagamento único, nada renova sozinho. Dúvidas: <a className="underline" href="mailto:leo@leodiet.com">leo@leodiet.com</a>
      </p>
    </Page>
  );
}

function CardWait({ pid, planId, withEbook, back }: { pid: string; planId?: string; withEbook: boolean; back: string }) {
  const router = useRouter();
  const [a] = useState(() => readAction<CardAction>(pid));
  const [opened, setOpened] = useState(false);
  if (!a)
    return (
      <Page>
        <TopBar onBack={() => router.push(back)} />
        <Title sub={`Se você já pagou, ${planId === "ebook" ? "o guia" : "o código"} chega no seu e-mail.`}>Pagamento não encontrado nesta aba</Title>
        <Cta onClick={() => router.push(back)}>Voltar</Cta>
      </Page>
    );
  return (
    <Page>
      <TopBar onBack={() => router.push(back)} />
      <Title sub="O pagamento com cartão é feito no ambiente seguro do Asaas, em outra aba. Nós nunca vemos os dados do seu cartão.">Pagar com cartão</Title>
      <Card>
        <Summary planId={planId} withEbook={withEbook} />
        <a
          href={a.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            setOpened(true);
            capture("w2a_card_opened", { plan: planId });
          }}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-cta text-[16px] font-bold text-white shadow-[0_10px_30px_rgba(37,30,23,0.25)]"
        >
          {opened ? "Abrir o pagamento de novo" : "Abrir pagamento seguro"}
        </a>
      </Card>
      {opened && (
        <div className="mt-5 flex items-center justify-center gap-2 text-[13px] text-mute" role="status" aria-live="polite">
          <span className="size-3 animate-spin rounded-full border-2 border-line border-t-walnut" aria-hidden="true" />
          Aguardando a confirmação do cartão. Volte para esta aba depois de pagar.
        </div>
      )}
    </Page>
  );
}
