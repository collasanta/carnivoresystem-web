import { landingResponse, renderLanding } from "../_lp/landing";

// Landing em espanhol dos anúncios do Meta (leodiet.com/lp-es): Espanha, hispânicos nos EUA e América Latina.
// Estrutura, CSS e rastreamento em app/_lp/landing.ts. Paywall duro: nunca dizer "gratis", nunca citar preço nem plano vitalício.
export const dynamic = "force-static";

const HTML = renderLanding({
  slug: "lp-es",
  lang: "es",
  ogLocale: "es_LA",
  title: "LeoDiet — Empieza la dieta carnívora bien",
  description: "La app que calcula tu sal y tu agua, te lo recuerda todos los días y te muestra tu racha de días limpios en la carnívora.",
  ogDescription: "Sal, agua y días limpios. La app que te mantiene en la carnívora.",
  // Links de campanha: Meta Ads espanhol
  appStore: "https://apps.apple.com/app/apple-store/id6808867448?pt=128456926&ct=meta_es&mt=8",
  playStore: "https://play.google.com/store/apps/details?id=dev.thirtythreeweb.leo&referrer=utm_source%3Dmeta_es",
  appStoreLabel: ["Descárgalo en el", "App Store"],
  playStoreLabel: ["DISPONIBLE EN", "Google Play"],
  kick: "LeoDiet · Dieta carnívora",
  h1: "Empieza la carnívora <span>de la forma correcta</span>",
  lead: "La app que calcula tu sal y tu agua, te lo recuerda todos los días y te muestra tu racha de días limpios. Sin contar calorías.",
  note: "iPhone y Android",
  sections: [
    {
      head: "El error número uno de la primera semana es la sal",
      body: "Con poca sal llegan los dolores de cabeza y los calambres, y mucha gente decide que la dieta no es para ella. LeoDiet calcula cuánta sal y agua necesitas y te lo recuerda durante el día.",
      img: "/lp-es/today.webp",
      h: 957,
      alt: "Pantalla Hoy: comidas y sal y agua",
    },
    {
      head: "Registrar tu día es un solo toque",
      body: "¿100% carnívoro? Un toque. ¿Te saliste? Un toque honesto. Sin calorías, sin macros, sin base de datos de alimentos.",
      img: "/lp-es/meals.webp",
      h: 957,
      alt: "Registro de comidas con un toque",
    },
    {
      head: "Cada día limpio se pinta de verde",
      body: "Tu mes se convierte en un calendario de días limpios y ves cómo crece tu racha. Es lo que te saca adelante los fines de semana: nadie quiere romper la racha.",
      img: "/lp-es/month.webp",
      h: 550,
      alt: "Calendario del mes con los días limpios en verde",
    },
    {
      head: "¿Cómo te sientes?",
      body: "Ánimo y síntomas como calambres, dolor de cabeza y antojos de azúcar. Con el tiempo ves qué cambió cuando ajustaste tu sal.",
      img: "/lp-es/feel.webp",
      h: 957,
      alt: "Pantalla de ánimo y síntomas",
    },
  ],
  ctaHead: "Esta vez, pasa de la tercera semana",
  ctaBody: "Descarga LeoDiet y empieza hoy.",
  disclaimer:
    "LeoDiet es un diario de hábitos, no un consejo médico. Si tienes presión alta o problemas de riñón o de corazón, habla con tu médico antes de aumentar la sal.",
  footer: { privacy: "Privacidad", terms: "Términos", support: "Soporte" },
});

export function GET() {
  return landingResponse(HTML);
}
