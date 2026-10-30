"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useDevice } from "@/lib/web2app/use-device";
import { activationUrl, appStoreUrl, deepLink, formatCode, playStoreUrl } from "@/lib/web2app/links";
import { brl, planById } from "@/lib/web2app/plans";
import { capture } from "@/lib/web2app/analytics";
import { once, track } from "@/lib/web2app/pixel";
import type { ProviderInfo } from "@/lib/web2app/payments";
import { useFunnel } from "@/lib/web2app/state";
import { retryUrl } from "./pay";
import { Card, Cta, Page, StoreButtons, Title, TopBar } from "./ui";
import { Upsell } from "./upsell";

type Ref = { id: string; token: string };

type PublicPurchase = {
  id: string;
  status: string;
  plan: string;
  amountCents: number;
  currency: string;
  code: string | null;
  test: boolean;
  email: string;
  emailSent: boolean;
  provider?: string;
  reason?: "pix_expired" | "card_refused" | "canceled" | null;
  /** an app plan is in it (redemption code) */
  includesApp: boolean;
  /** the guide is in it */
  includesEbook: boolean;
  /** where the guide downloads from (this purchase, or the lead's paid guide for an app bought alone) */
  guide?: Ref | null;
  /** guide alone: the lead's paid app purchase (follow-up offer taken) */
  app?: Ref | null;
};

export const ebookHref = (r: Ref) => `/api/w2a/ebook?pid=${encodeURIComponent(r.id)}&t=${encodeURIComponent(r.token)}`;

/**
 * /quiz/sucesso?pid=…&t=… — polls the purchase until it is paid, then: Meta Purchase (browser, eventID w2a_<id>, the
 * server sends the same event_id through CAPI), the code, the store buttons (Play carries the code in the install
 * referrer), the deep link and the e-mail step. The guide download is always on top when the purchase has it (guide +
 * app, or guide alone). Guide alone (plan 'ebook'): no code, the soft follow-up app offer (./upsell.tsx) instead.
 */
export function Success({ provider }: { provider: ProviderInfo }) {
  const q = useSearchParams();
  const router = useRouter();
  const { state, ready, update } = useFunnel();
  const pid = q.get("pid") ?? state.purchase?.id ?? "";
  const t = q.get("t") ?? state.purchase?.token ?? "";
  const [p, setP] = useState<PublicPurchase | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const tries = useRef(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!pid || !t) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        // every 5th poll also asks the gateway (a late webhook never blocks the code)
        const check = tries.current % 5 === 4 ? "&check=1" : "";
        const res = await fetch(`/api/w2a/purchase?pid=${encodeURIComponent(pid)}&t=${encodeURIComponent(t)}${check}`, { cache: "no-store" });
        const j = (await res.json()) as { purchase?: PublicPurchase; error?: string };
        if (!res.ok || !j.purchase) throw new Error(j.error ?? "server");
        if (stop) return;
        setP(j.purchase);
        if (j.purchase.status === "pending" && tries.current++ < 90) timer = setTimeout(poll, 2000);
        else if (j.purchase.status === "pending") setSlow(true);
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
    once(`ph_purchase_${p.id}`, () => capture("w2a_purchase", { plan: p.plan, includes_app: p.includesApp, includes_ebook: p.includesEbook, value: p.amountCents / 100, test: p.test }));
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
    once(`purchase_${p.id}`, () => track("Purchase", { value: p.amountCents / 100, currency: p.currency, content_ids: [...(p.includesEbook ? ["web_ebook"] : []), ...(p.includesApp ? [`web_${p.plan}`] : [])], content_type: "product" }, `w2a_${p.id}`));
  }, [p]);

  // remember the paid guide-alone purchase: the follow-up offer's retry pages come back to it
  useEffect(() => {
    if (p?.status === "paid" && !p.includesApp && state.guide?.id !== p.id) update({ guide: { id: p.id, token: t } });
  }, [p, t, state.guide?.id, update]);

  if (err || (ready && (!pid || !t)))
    return (
      <Page>
        <TopBar />
        <Title sub="Se você já pagou, procure o e-mail da compra ou escreva para leo@leodiet.com.">Não encontramos essa compra</Title>
        <Cta onClick={() => router.push("/quiz/oferta")}>Voltar à oferta</Cta>
      </Page>
    );

  if (!p || p.status === "pending")
    return (
      <Page>
        <TopBar />
        <div className="mx-auto mt-16 size-12 animate-spin rounded-full border-4 border-line border-t-walnut" aria-hidden="true" />
        <Title
          sub={
            slow
              ? `Ainda não recebemos a confirmação. Se você já pagou, ${p && !p.includesApp ? "o guia" : "o código"} chega no seu e-mail assim que o pagamento for aprovado (no cartão, a análise pode levar alguns minutos).`
              : "Isso leva alguns segundos. No cartão, a análise do banco pode levar alguns minutos."
          }
        >
          {slow ? "Pagamento em análise" : "Confirmando o seu pagamento…"}
        </Title>
      </Page>
    );

  if (p.status !== "paid")
    return (
      <Page>
        <TopBar />
        <div className="mx-auto mt-10 flex size-16 items-center justify-center rounded-full bg-tint text-[30px]" aria-hidden="true">⚠️</div>
        <Title
          sub={
            p.status === "refunded"
              ? "O acesso ligado a ela foi encerrado. Dúvidas: leo@leodiet.com."
              : p.reason === "pix_expired"
                ? "O prazo para pagar este Pix acabou. Gere um novo para continuar."
                : "Nenhum valor foi cobrado. Tente outro cartão ou pague com Pix, que é aprovado na hora."
          }
        >
          {p.status === "refunded" ? "Essa compra foi reembolsada" : p.reason === "pix_expired" ? "Este Pix expirou" : p.reason === "canceled" ? "Este pagamento foi cancelado" : "O pagamento não foi aprovado"}
        </Title>
        <Cta onClick={() => router.push(retryUrl(p.plan, p.includesEbook, p.reason === "pix_expired" || p.reason === "card_refused" ? "pix" : undefined, p.guide ?? state.guide))}>
          {p.reason === "pix_expired" ? "Gerar novo Pix" : p.reason === "card_refused" ? "Pagar com Pix" : "Tentar de novo"}
        </Cta>
      </Page>
    );

  if (!p.includesApp) return <GuideSuccess purchase={p} pid={pid} token={t} provider={provider} />;
  return <Activation code={p.code!} purchase={p} pid={pid} token={t} guide={p.guide ?? null} />;
}

function Tick() {
  return (
    <div className="mx-auto mt-8 flex size-16 items-center justify-center rounded-full bg-good text-white" aria-hidden="true">
      <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </div>
  );
}

/** The guide's success page: download + e-mail note, then the optional app upsell (or a link to the app code if bought). */
function GuideSuccess({ purchase, pid, token, provider }: { purchase: PublicPurchase; pid: string; token: string; provider: ProviderInfo }) {
  const router = useRouter();
  return (
    <Page>
      <TopBar />
      {purchase.test && (
        <div className="mt-3 rounded-2xl border border-bad/40 bg-bad/5 px-4 py-3 text-center text-[12.5px] leading-relaxed text-bad">
          <b>Compra de teste</b> (pagamento simulado, nenhum valor cobrado).
        </div>
      )}
      <Tick />
      <Title sub={`Guia do Desafio Carnívoro de 30 dias · ${brl(purchase.amountCents)}`}>Seu guia está pronto!</Title>


      <GuideCard guide={{ id: pid, token }} email={purchase.emailSent ? purchase.email : null} source="success" />

      <EmailCode purchase={purchase} pid={pid} token={token} compact />

      {purchase.app ? (
        <Card className="mt-6 text-center">
          <div className="text-[15px] font-extrabold">Você já tem o app LeoDiet</div>
          <p className="mt-1 text-[13px] leading-relaxed text-mute">O seu código de acesso está na página da compra do app.</p>
          <button type="button" className="mt-2 text-[14px] font-bold text-walnut underline" onClick={() => router.push(`/quiz/sucesso?pid=${purchase.app!.id}&t=${purchase.app!.token}`)}>
            Ver o meu código
          </button>
        </Card>
      ) : (
        <Upsell provider={provider} guidePid={pid} />
      )}

      <p className="mt-8 text-center text-[12px] leading-relaxed text-faint">
        Precisa de ajuda? <a className="underline" href="mailto:leo@leodiet.com">leo@leodiet.com</a>
      </p>
    </Page>
  );
}

/** Cover + "Baixar o guia (PDF)" + "também enviamos para o seu e-mail". */
function GuideCard({ guide, email, source }: { guide: Ref; email: string | null; source: string }) {
  return (
    <Card className="flex items-center gap-4">
      <Image src="/quiz/ebook-cover.png" alt="Capa do guia" width={600} height={800} className="h-auto w-[84px] flex-none rounded-lg shadow-[0_8px_20px_rgba(37,30,23,0.22)]" />
      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] leading-tight font-extrabold">Guia do Desafio Carnívoro de 30 dias</div>
        <a
          href={ebookHref(guide)}
          onClick={() => capture("w2a_ebook_download", { source, purchase_id: guide.id })}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-cta text-[15px] font-bold text-white shadow-[0_10px_30px_rgba(37,30,23,0.25)] transition hover:bg-ctah"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14" />
          </svg>
          Baixar o guia (PDF)
        </a>
        {email && (
          <p className="mt-2 text-[12px] leading-snug text-mute">
            Também enviamos para o seu e-mail <b className="text-ink">{email}</b>.
          </p>
        )}
      </div>
    </Card>
  );
}

/**
 * The "download + activate" panel. Used by /quiz/sucesso (with the purchase) and /quiz/ativar (code only, from the
 * e-mail or the QR code). Phones see only their store; a computer sees a QR code of /quiz/ativar to finish on the phone.
 */
export function Activation({ code, purchase, pid, token, guide }: { code: string; purchase?: PublicPurchase; pid?: string; token?: string; guide?: Ref | null }) {
  const plan = purchase ? planById(purchase.plan) : null;
  const [copied, setCopied] = useState(false);
  const pretty = formatCode(code);
  const device = useDevice();
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
      <Tick />
      <Title sub={plan && purchase ? `${purchase.includesEbook ? "Guia + app" : "App"} ${plan.title} · ${brl(purchase.amountCents)}` : undefined}>{purchase ? "Pagamento confirmado!" : "Ative o seu LeoDiet Pro"}</Title>

      {guide && (
        <>
          <GuideCard guide={guide} email={purchase?.emailSent ? purchase.email : null} source="app_success" />
          <h2 className="mt-8 mb-3 text-center text-[18px] font-extrabold">Agora, ative o seu app</h2>
        </>
      )}

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

      {device === "desktop" && <PhoneQr code={code} />}

      <ol className="mt-6 flex flex-col gap-5">
        <li>
          <h2 className="text-[16px] font-extrabold">1. Baixe o app{device === "desktop" ? " no seu celular" : ""}</h2>
          <p className="mt-1 mb-3 text-[13px] leading-relaxed text-mute">
            {device === "ios"
              ? "Instale o LeoDiet pela App Store."
              : device === "desktop"
                ? "O LeoDiet é um app para iPhone e Android. Pelo QR code acima é mais rápido; ou procure “LeoDiet” na loja do celular."
                : "No Android, instalando por este botão o app já ativa sozinho."}
          </p>
          {device !== "desktop" && <StoreButtons appStore={device === "android" ? undefined : appStoreUrl()} playStore={device === "ios" ? undefined : playStoreUrl(code)} onClick={(store) => capture("w2a_store_click", { store, device })} />}
        </li>
        <li>
          <h2 className="text-[16px] font-extrabold">2. Ative o seu acesso</h2>
          {device === "desktop" ? (
            <p className="mt-1 text-[13px] leading-relaxed text-mute">
              No app, na tela de planos, toque em <b className="text-ink">“Já comprei no site”</b> e digite o código acima.
            </p>
          ) : (
            <>
              <p className="mt-1 mb-3 text-[13px] leading-relaxed text-mute">
                Com o app instalado neste celular, toque abaixo. Se não abrir: no app, na tela de planos, toque em <b className="text-ink">“Já comprei no site”</b> e digite o código.
              </p>
              <a href={deepLink(code)} className="flex h-14 w-full items-center justify-center rounded-2xl border-[1.5px] border-cta bg-card text-[16px] font-bold text-ink transition hover:bg-tint">
                Já instalei, abrir o app
              </a>
            </>
          )}
        </li>
      </ol>

      {purchase && pid && token && <EmailCode purchase={purchase} pid={pid} token={token} />}

      <p className="mt-8 text-center text-[12px] leading-relaxed text-faint">
        O código funciona em até 3 aparelhos. Precisa de ajuda? <a className="underline" href="mailto:leo@leodiet.com">leo@leodiet.com</a>
      </p>
    </Page>
  );
}

/** QR code of /quiz/ativar for this code: opened on the phone it shows that phone's store (Android activates by itself). */
function PhoneQr({ code }: { code: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toString(activationUrl(window.location.origin, code), { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#251e17", light: "#ffffff" } })
      .then(setSvg)
      .catch(() => setSvg(null));
  }, [code]);
  if (!svg) return null;
  return (
    <Card className="mt-6 text-center">
      <div className="text-[16px] font-extrabold">Continue no celular</div>
      <p className="mx-auto mt-1 max-w-[320px] text-[13px] leading-relaxed text-mute">Aponte a câmera do celular para o código abaixo para instalar o LeoDiet e ativar o seu acesso.</p>
      <div className="mx-auto mt-4 size-[200px] rounded-xl bg-white p-2 [&>svg]:size-full" role="img" aria-label="QR code para ativar no celular" dangerouslySetInnerHTML={{ __html: svg }} />
    </Card>
  );
}

function EmailCode({ purchase, pid, token, compact }: { purchase: PublicPurchase; pid: string; token: string; compact?: boolean }) {
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
  const what = !purchase.includesApp ? "o guia" : purchase.includesEbook || purchase.guide ? "o código e o guia" : "o código";
  // guide page: the "também enviamos" line is already on screen; only the resend / fix links show here
  if (compact && status === "sent" && !editing)
    return (
      <p className="mt-3 text-center text-[12.5px] text-mute">
        Não chegou? Veja o spam,{" "}
        <button type="button" className="underline" onClick={send}>
          reenvie
        </button>{" "}
        ou{" "}
        <button type="button" className="underline" onClick={() => setEditing(true)}>
          corrija o e-mail
        </button>
      </p>
    );
  return (
    <Card className="mt-6">
      <div className="text-[15px] font-extrabold">Receba {what} por e-mail</div>
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
      {status === "error" && <p className="mt-2 text-[12.5px] text-bad">Não conseguimos enviar agora. {!purchase.includesApp ? "Baixe o guia pelo botão acima." : "Anote o código acima."}</p>}
    </Card>
  );
}
