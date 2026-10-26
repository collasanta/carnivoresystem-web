"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { appStoreUrl, deepLink, formatCode, playStoreUrl } from "@/lib/web2app/links";
import { brl, planById } from "@/lib/web2app/plans";
import { once, track } from "@/lib/web2app/pixel";
import { useFunnel } from "@/lib/web2app/state";
import { Card, Cta, Page, StoreButtons, Title, TopBar } from "./ui";

type PublicPurchase = { id: string; status: string; plan: string; amountCents: number; currency: string; code: string | null; test: boolean; email: string; emailSent: boolean };

/**
 * /quiz/sucesso?pid=…&t=… — polls the purchase until it is paid, then: Meta Purchase (browser, eventID w2a_<id>, the
 * server sends the same event_id through CAPI), the code, the store buttons (Play carries the code in the install
 * referrer), the deep link and the e-mail step.
 */
export function Success() {
  const q = useSearchParams();
  const router = useRouter();
  const { state, ready } = useFunnel();
  const pid = q.get("pid") ?? state.purchase?.id ?? "";
  const t = q.get("t") ?? state.purchase?.token ?? "";
  const [p, setP] = useState<PublicPurchase | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const tries = useRef(0);

  useEffect(() => {
    if (!ready) return;
    if (!pid || !t) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/w2a/purchase?pid=${encodeURIComponent(pid)}&t=${encodeURIComponent(t)}`, { cache: "no-store" });
        const j = (await res.json()) as { purchase?: PublicPurchase; error?: string };
        if (!res.ok || !j.purchase) throw new Error(j.error ?? "server");
        if (stop) return;
        setP(j.purchase);
        if (j.purchase.status === "pending" && tries.current++ < 90) timer = setTimeout(poll, 2000);
      } catch (e) {
        if (!stop) setErr(String(e));
      }
    };
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [ready, pid, t]);

  // Purchase pixel: once per purchase. Test purchases (mock gateway) only when the pixel test flag is on.
  useEffect(() => {
    if (!p || p.status !== "paid") return;
    let testPixel = false;
    try {
      testPixel = sessionStorage.getItem("w2a_pixel") === "1";
    } catch {
      /* ignore */
    }
    if (p.test && !testPixel) {
      console.info("[pixel] Purchase skipped: test purchase (open the funnel with ?pixel=1 to send it)");
      return;
    }
    once(`purchase_${p.id}`, () => track("Purchase", { value: p.amountCents / 100, currency: p.currency, content_ids: [`web_${p.plan}`], content_type: "product" }, `w2a_${p.id}`));
  }, [p]);

  if (err || (ready && (!pid || !t)))
    return (
      <Page>
        <TopBar />
        <Title sub="Se você já pagou, procure o e-mail com o seu código ou escreva para leo@leodiet.com.">Não encontramos essa compra</Title>
        <Cta onClick={() => router.push("/quiz/oferta")}>Voltar aos planos</Cta>
      </Page>
    );

  if (!p || p.status === "pending")
    return (
      <Page>
        <TopBar />
        <div className="mx-auto mt-16 size-12 animate-spin rounded-full border-4 border-line border-t-walnut" aria-hidden="true" />
        <Title sub="Isso leva alguns segundos. No Pix, assim que o banco confirmar.">Confirmando o seu pagamento…</Title>
      </Page>
    );

  if (p.status !== "paid")
    return (
      <Page>
        <TopBar />
        <div className="mx-auto mt-10 flex size-16 items-center justify-center rounded-full bg-tint text-[30px]" aria-hidden="true">⚠️</div>
        <Title sub="Nenhum valor foi cobrado. Você pode tentar de novo com outra forma de pagamento.">
          {p.status === "refunded" ? "Essa compra foi reembolsada" : "O pagamento não foi aprovado"}
        </Title>
        <Cta onClick={() => router.push("/quiz/oferta")}>Tentar de novo</Cta>
      </Page>
    );

  return <Activation code={p.code!} purchase={p} pid={pid} token={t} />;
}

/** The "download + activate" panel. Used by /quiz/sucesso (with the purchase) and /quiz/ativar (code only, from the e-mail). */
export function Activation({ code, purchase, pid, token }: { code: string; purchase?: PublicPurchase; pid?: string; token?: string }) {
  const plan = purchase ? planById(purchase.plan) : null;
  const [copied, setCopied] = useState(false);
  const pretty = formatCode(code);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pretty);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the code is on screen anyway */
    }
  };
  return (
    <Page>
      <TopBar />
      {purchase?.test && (
        <div className="mt-3 rounded-2xl border border-bad/40 bg-bad/5 px-4 py-3 text-center text-[12.5px] leading-relaxed text-bad">
          <b>Compra de teste</b> (pagamento simulado, nenhum valor cobrado). O código libera o app por 24 horas.
        </div>
      )}
      <div className="mx-auto mt-8 flex size-16 items-center justify-center rounded-full bg-good text-white" aria-hidden="true">
        <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </div>
      <Title sub={plan && purchase ? `Plano ${plan.title} · ${brl(purchase.amountCents)}` : undefined}>{purchase ? "Pagamento confirmado!" : "Ative o seu LeoDiet Pro"}</Title>

      <Card>
        <div className="text-center text-[12px] font-semibold tracking-[0.12em] text-mute uppercase">Seu código de acesso</div>
        <button
          type="button"
          onClick={copy}
          className="mt-3 w-full rounded-2xl border border-dashed border-linex bg-tint py-4 text-center font-mono text-[27px] font-extrabold tracking-[0.08em] text-ink"
          aria-label={`Copiar código ${pretty}`}
        >
          {pretty}
        </button>
        <p className="mt-2 text-center text-[12.5px] text-mute">{copied ? "Copiado!" : "Toque para copiar"}</p>
      </Card>

      <ol className="mt-6 flex flex-col gap-5">
        <li>
          <h2 className="text-[16px] font-extrabold">1. Baixe o app</h2>
          <p className="mt-1 mb-3 text-[13px] leading-relaxed text-mute">No Android, instalando por este botão o app já ativa sozinho.</p>
          <StoreButtons appStore={appStoreUrl()} playStore={playStoreUrl(code)} />
        </li>
        <li>
          <h2 className="text-[16px] font-extrabold">2. Ative o seu acesso</h2>
          <p className="mt-1 mb-3 text-[13px] leading-relaxed text-mute">
            Com o app instalado neste celular, toque abaixo. Se não abrir: no app, na tela de planos, toque em <b className="text-ink">“Já comprei no site”</b> e digite o código.
          </p>
          <a href={deepLink(code)} className="flex h-14 w-full items-center justify-center rounded-2xl border-[1.5px] border-cta bg-card text-[16px] font-bold text-ink transition hover:bg-tint">
            Já instalei, abrir o app
          </a>
        </li>
      </ol>

      {purchase && pid && token && <EmailCode purchase={purchase} pid={pid} token={token} />}

      <p className="mt-8 text-center text-[12px] leading-relaxed text-faint">
        O código funciona em até 3 aparelhos. Precisa de ajuda? <a className="underline" href="mailto:leo@leodiet.com">leo@leodiet.com</a>
      </p>
    </Page>
  );
}

function EmailCode({ purchase, pid, token }: { purchase: PublicPurchase; pid: string; token: string }) {
  const [email, setEmail] = useState(purchase.email);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<"idle" | "busy" | "sent" | "error" | "off">(purchase.emailSent ? "sent" : "idle");
  const send = async () => {
    setStatus("busy");
    try {
      const res = await fetch("/api/w2a/email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pid, t: token, email }),
      });
      const j = (await res.json()) as { ok?: boolean; error?: string };
      if (j.error === "not_configured") return setStatus("off");
      setStatus(res.ok && j.ok ? "sent" : "error");
      if (res.ok && j.ok) setEditing(false);
    } catch {
      setStatus("error");
    }
  };
  if (status === "off") return null;
  return (
    <Card className="mt-6">
      <div className="text-[15px] font-extrabold">Receba o código por e-mail</div>
      {status === "sent" && !editing ? (
        <p className="mt-1 text-[13px] leading-relaxed text-mute">
          Enviamos para <b className="text-ink">{email}</b>. Não chegou? Veja o spam ou{" "}
          <button type="button" className="underline" onClick={send}>
            reenvie
          </button>{" "}
          ·{" "}
          <button type="button" className="underline" onClick={() => setEditing(true)}>
            corrigir e-mail
          </button>
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="E-mail"
            className="h-12 min-w-0 flex-1 rounded-xl border border-linex bg-card px-3 text-[15px] outline-none focus:border-cta"
          />
          <button type="button" onClick={send} disabled={status === "busy"} className="h-12 rounded-xl bg-cta px-4 text-[14px] font-bold text-white disabled:opacity-50">
            {status === "busy" ? "…" : "Enviar"}
          </button>
        </div>
      )}
      {status === "error" && <p className="mt-2 text-[12.5px] text-bad">Não conseguimos enviar agora. Anote o código acima.</p>}
    </Card>
  );
}
