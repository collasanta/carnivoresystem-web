import { landingResponse, renderLanding } from "../_lp/landing";

// Landing BR dos anúncios do Meta (leodiet.com/lp-pt). Estrutura, CSS e rastreamento em app/_lp/landing.ts.
export const dynamic = "force-static";

const HTML = renderLanding({
  slug: "lp-pt",
  lang: "pt-BR",
  ogLocale: "pt_BR",
  title: "LeoDiet — Dieta carnívora do jeito certo",
  description: "O app que calcula seu sal e sua água, te lembra todo dia e mostra sua sequência de dias limpos na carnívora.",
  ogDescription: "Sal, água e dias limpos. O app que te mantém na carnívora.",
  // Links de campanha: Meta Ads Brasil
  appStore: "https://apps.apple.com/app/apple-store/id6808867448?pt=128456926&ct=meta_br&mt=8",
  playStore: "https://play.google.com/store/apps/details?id=dev.thirtythreeweb.leo&referrer=utm_source%3Dmeta_br",
  appStoreLabel: ["Baixar na", "App Store"],
  playStoreLabel: ["Disponível no", "Google Play"],
  kick: "LeoDiet · Dieta carnívora",
  h1: "Comece a carnívora <span>do jeito certo</span>",
  lead: "O app que calcula seu sal e sua água, te lembra todo dia e mostra sua sequência de dias limpos. Sem contar caloria.",
  note: "iPhone e Android · Em português",
  sections: [
    {
      head: "O erro nº 1 da primeira semana é o sal",
      body: "Falta sal, vem a dor de cabeça e a câimbra, e a pessoa acha que a dieta não é pra ela. O LeoDiet calcula quanto sal e quanta água você precisa e te lembra ao longo do dia.",
      img: "/lp-pt/today.webp",
      h: 957,
      alt: "Tela Hoje: refeições e sal &amp; água",
    },
    {
      head: "Marcar o dia leva um toque",
      body: "Comeu 100% carnívoro? Um toque. Saiu da dieta? Um toque honesto. Sem contar caloria, sem macro, sem banco de alimentos.",
      img: "/lp-pt/meals.webp",
      h: 957,
      alt: "Registro de refeições com um toque",
    },
    {
      head: "Cada dia limpo fica verde",
      body: "Seu mês vira um calendário de dias limpos e você vê a sequência crescendo. É o que segura nos fins de semana: ninguém quer quebrar a sequência.",
      img: "/lp-pt/month.webp",
      h: 794,
      alt: "Calendário do mês com os dias limpos em verde",
    },
    {
      head: "Como você está se sentindo?",
      body: "Humor, sintomas como câimbra, dor de cabeça e vontade de doce. Com o tempo você enxerga o que mudou quando acertou o sal.",
      img: "/lp-pt/feel.webp",
      h: 957,
      alt: "Tela de humor e sintomas",
    },
  ],
  ctaHead: "Desta vez, passa da terceira semana",
  ctaBody: "Baixe o LeoDiet e comece hoje.",
  disclaimer:
    "O LeoDiet é um diário de hábitos, não orientação médica. Se você tem pressão alta, problema nos rins ou no coração, fale com seu médico antes de aumentar o sal.",
  footer: { privacy: "Privacidade", terms: "Termos", support: "Suporte" },
});

export function GET() {
  return landingResponse(HTML);
}
