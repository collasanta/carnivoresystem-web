import { landingResponse, renderLanding } from "../_lp/landing";

// Landing EUA do Google Ads Search (leodiet.com/lp-us), mesmas keywords do ASA. Clique na loja = conversão "Leo LP US - App Store click" (7899783784). Estrutura, CSS e rastreamento em app/_lp/landing.ts.
// Paywall duro: nunca dizer "free", nunca citar preço nem plano lifetime.
export const dynamic = "force-static";

const HTML = renderLanding({
  slug: "lp-us",
  lang: "en-US",
  ogLocale: "en_US",
  title: "LeoDiet — Carnivore Diet Tracker App",
  description: "The app that works out your salt and water, reminds you every day and shows your streak of clean days on carnivore.",
  ogDescription: "Salt, water and clean days. The app that keeps you on carnivore.",
  // Links de campanha: Google Ads EUA
  appStore: "https://apps.apple.com/app/apple-store/id6808867448?pt=128456926&ct=google_us&mt=8",
  playStore: "https://play.google.com/store/apps/details?id=dev.thirtythreeweb.leo&referrer=utm_source%3Dgoogle_us",
  appStoreLabel: ["Download on the", "App Store"],
  playStoreLabel: ["GET IT ON", "Google Play"],
  kick: "LeoDiet · Carnivore diet tracker",
  h1: "The carnivore diet app <span>that keeps you on track</span>",
  lead: "Log a carnivore day in one tap, get your salt and water right, and watch your streak of clean days grow. No calorie counting, no food database.",
  note: "For iPhone and Android",
  gads: "AW-18531795203/Bi41COjE9LYdEIOC04RF",
  sections: [
    {
      head: "The #1 mistake in week one is salt",
      body: "Not enough salt brings headaches and cramps, and people decide the diet isn't for them. LeoDiet works out how much salt and water you need and reminds you through the day.",
      img: "/lp-au/today.webp",
      h: 957,
      alt: "Today screen: meals and salt &amp; water",
    },
    {
      head: "Logging a day takes one tap",
      body: "100% carnivore? One tap. Slipped up? One honest tap. No calories, no macros, no food database.",
      img: "/lp-au/meals.webp",
      h: 957,
      alt: "One-tap meal logging",
    },
    {
      head: "Every clean day turns green",
      body: "Your month becomes a calendar of clean days and you watch the streak grow. It's what gets you through weekends: nobody wants to break the streak.",
      img: "/lp-au/month.webp",
      h: 764,
      alt: "Month calendar with clean days in green",
    },
    {
      head: "How are you feeling?",
      body: "Mood, plus symptoms like cramps, headaches and sugar cravings. Over time you see what changed once you got your salt right.",
      img: "/lp-au/feel.webp",
      h: 957,
      alt: "Mood and symptoms screen",
    },
  ],
  ctaHead: "This time, get past week three",
  ctaBody: "Download LeoDiet and start today.",
  disclaimer:
    "LeoDiet is a habit journal, not medical advice. If you have high blood pressure, kidney or heart problems, talk to your doctor before increasing salt.",
  footer: { privacy: "Privacy", terms: "Terms", support: "Support" },
});

export function GET() {
  return landingResponse(HTML);
}
