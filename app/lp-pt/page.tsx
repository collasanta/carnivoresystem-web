import type { Metadata } from "next";
import Image from "next/image";
import Script from "next/script";
import { LpView, StoreButtons } from "./store-buttons";

// Landing BR dos anúncios do Meta (leodiet.com/lp-pt). Conversão = clique numa loja (evento Lead).
// Pixel do Meta: vazio = página sem pixel (só Vercel Analytics).
const META_PIXEL_ID = "1370037514985006"; // dataset "leodiet" (criado 2026-10-20)

export const metadata: Metadata = {
  title: "LeoDiet — Dieta carnívora do jeito certo",
  description: "O app que calcula seu sal e sua água, te lembra todo dia e mostra sua sequência de dias limpos na carnívora.",
  alternates: { canonical: "https://leodiet.com/lp-pt" },
  robots: { index: false },
  openGraph: {
    title: "LeoDiet — Dieta carnívora do jeito certo",
    description: "Sal, água e dias limpos. O app que te mantém na carnívora.",
    url: "https://leodiet.com/lp-pt",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/lp-pt/today.jpg", width: 480, height: 1044 }],
  },
};

const SECTIONS = [
  {
    head: "O erro nº 1 da primeira semana é o sal",
    body: "Falta sal, vem a dor de cabeça e a câimbra, e a pessoa acha que a dieta não é pra ela. O LeoDiet calcula quanto sal e quanta água você precisa e te lembra ao longo do dia.",
    img: "/lp-pt/today.jpg",
    alt: "Tela Hoje: refeições e sal & água",
  },
  {
    head: "Marcar o dia leva um toque",
    body: "Comeu 100% carnívoro? Um toque. Saiu da dieta? Um toque honesto. Sem contar caloria, sem macro, sem banco de alimentos.",
    img: "/lp-pt/meals.jpg",
    alt: "Registro de refeições com um toque",
  },
  {
    head: "Cada dia limpo fica verde",
    body: "Seu mês vira um calendário de dias limpos e você vê a sequência crescendo. É o que segura nos fins de semana: ninguém quer quebrar a sequência.",
    img: "/lp-pt/month.jpg",
    alt: "Calendário do mês com os dias limpos em verde",
  },
  {
    head: "Como você está se sentindo?",
    body: "Humor, sintomas como câimbra, dor de cabeça e vontade de doce. Com o tempo você enxerga o que mudou quando acertou o sal.",
    img: "/lp-pt/feel.jpg",
    alt: "Tela de humor e sintomas",
  },
];

export default function LpPt() {
  return (
    <div lang="pt-BR" className="w-full max-w-[640px]">
      <LpView />
      {META_PIXEL_ID ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`}
        </Script>
      ) : null}

      <header className="text-center">
        <Image src="/leo-icon.png" alt="LeoDiet" width={84} height={84} className="mx-auto rounded-[22px] shadow-[0_8px_24px_rgba(33,26,18,0.12)]" priority />
        <div className="mt-4 text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">LeoDiet · Dieta carnívora</div>
        <h1 className="mt-2 text-[clamp(32px,9vw,44px)] leading-[1.04] font-extrabold tracking-[-0.03em] text-balance">
          Comece a carnívora <span className="text-walnut">do jeito certo</span>
        </h1>
        <p className="mt-3 text-[16px] leading-relaxed text-mute text-balance">
          O app que calcula seu sal e sua água, te lembra todo dia e mostra sua sequência de dias limpos. Sem contar caloria.
        </p>
        <div className="mt-6">
          <StoreButtons />
        </div>
        <p className="mt-3 text-[12px] text-faint">iPhone e Android · Em português</p>
      </header>

      <section className="mt-12 flex flex-col gap-10">
        {SECTIONS.map((s, i) => (
          <div key={s.head} className={`flex flex-col items-center gap-5 sm:flex-row ${i % 2 ? "sm:flex-row-reverse" : ""}`}>
            <Image src={s.img} alt={s.alt} width={480} height={1044} unoptimized className="w-[220px] flex-none rounded-[26px] border border-line shadow-[0_12px_32px_rgba(33,26,18,0.08)]" />
            <div className="text-center sm:text-left">
              <h2 className="text-[21px] font-extrabold tracking-[-0.02em] text-balance">{s.head}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-mute">{s.body}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-14 rounded-[28px] border border-line bg-white px-6 py-8 text-center shadow-[0_12px_32px_rgba(33,26,18,0.06)]">
        <h2 className="text-[24px] font-extrabold tracking-[-0.02em] text-balance">Desta vez, passa da terceira semana</h2>
        <p className="mt-2 text-[15px] text-mute">Baixe o LeoDiet e comece hoje.</p>
        <div className="mt-5">
          <StoreButtons />
        </div>
      </div>

      <p className="mt-8 text-center text-[12px] leading-relaxed text-faint">
        O LeoDiet é um diário de hábitos, não orientação médica. Se você tem pressão alta, problema nos rins ou no coração, fale com seu médico antes de aumentar o sal.
      </p>

      <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-mute">
        <a href="/privacy" className="hover:text-ink">Privacidade</a>
        <a href="/terms" className="hover:text-ink">Termos</a>
        <a href="/support" className="hover:text-ink">Suporte</a>
        <a href="mailto:leo@leodiet.com" className="hover:text-ink">leo@leodiet.com</a>
        <span>© 2026 33WEB SOFTWARE LTDA</span>
      </footer>
    </div>
  );
}
