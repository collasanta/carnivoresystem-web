import { landingResponse, renderLanding } from "../_lp/landing";

// Landing AU dos anúncios do Meta (leodiet.com/lp-au). Estrutura, CSS e rastreamento em app/_lp/landing.ts.
// Paywall duro: nunca dizer "free", nunca citar preço nem plano lifetime.
export const dynamic = "force-static";

const HTML = renderLanding({
  slug: "lp-au",
  lang: "en-AU",
  ogLocale: "en_AU",
  title: "LeoDiet — Start carnivore the right way",
  description: "The app that works out your salt and water, reminds you every day and shows your streak of clean days on carnivore.",
  ogDescription: "Salt, water and clean days. The app that keeps you on carnivore.",
  // Links de campanha: Meta Ads Austrália
  appStore: "https://apps.apple.com/app/apple-store/id6808867448?pt=128456926&ct=meta_au&mt=8",
  playStore: "https://play.google.com/store/apps/details?id=dev.thirtythreeweb.leo&referrer=utm_source%3Dmeta_au",
  appStoreLabel: ["Download on the", "App Store"],
  playStoreLabel: ["GET IT ON", "Google Play"],
  kick: "LeoDiet · Carnivore diet",
  h1: "Start carnivore <span>the right way</span>",
  lead: "The app that works out your salt and water, reminds you every day and shows your streak of clean days. No calorie counting.",
  note: "iPhone and Android",
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
