import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "LeoDiet — Carnivore Diet Tracker",
  description:
    "Three salted glasses a day, water in between, and an honest record of your carnivore days. Free on the App Store and Google Play.",
  alternates: { canonical: "https://leodiet.com" },
  openGraph: {
    title: "LeoDiet — Carnivore Diet Tracker",
    description: "Salt, water and clean days. The carnivore tracker that keeps you out of the cramps.",
    url: "https://leodiet.com",
    type: "website",
    images: [{ url: "/leo-shot-1.png", width: 1320, height: 2868 }],
  },
};

const APP_STORE = "https://apps.apple.com/app/id6808867448";
const PLAY_STORE = "https://play.google.com/store/apps/details?id=dev.thirtythreeweb.leo&referrer=utm_source%3Dsite";

const FEATURES = [
  {
    head: "Salt done right",
    body: "Three salted glasses a day at the concentration your gut tolerates: ½ teaspoon per 500 ml glass, never the salt-water-flush mistake. Plain water in between, reminders that stop when you hit your goal.",
    img: "/leo-shot-1.png",
    alt: "Today: three salted glasses and the water bar",
  },
  {
    head: "Log a day in two taps",
    body: "Meals in one tap with the time you ate, or skip logging and just confirm you ate 100% carnivore. Cheated? One honest button and a red square on the map. No calories, no macros, no food database.",
    img: "/leo-02-meals.png",
    alt: "Meals card with the honest cheat button",
  },
  {
    head: "How do you feel?",
    body: "Mood on a five-point scale, symptoms like cramps, headache, brain fog or cravings, and stools. Over time you see what changed when you fixed your salt, and what comes back after a slip.",
    img: "/leo-03-feel.png",
    alt: "How do you feel: mood, symptoms and stools",
  },
  {
    head: "Weight, one wheel a day",
    body: "A morning weigh-in in two seconds. Leo shows the change since your last weigh-in, the trend for the month or the year, and puts the result on your share card.",
    img: "/leo-weight.png",
    alt: "Weight card at the top of Today",
  },
  {
    head: "See your real pattern",
    body: "A heatmap of perfect, clean and cheat days by month or year, streaks, weight curve and a cramps insight. History is earned day by day: nothing can be backfilled, so every green square is real.",
    img: "/leo-weight-chart.png",
    alt: "History: year heatmap and weight chart",
  },
  {
    head: "Share it",
    body: "A story or a square post with your clean days, longest streak and weight change. The card people in carnivore groups actually screenshot.",
    img: "/leo-06-share.png",
    alt: "Share card with clean days, streak and weight change",
  },
];

export default function Leo() {
  return (
    <div className="w-full max-w-[640px]">
      <header className="text-center">
        <Image src="/leo-icon.png" alt="Leo" width={84} height={84} className="mx-auto rounded-[22px] shadow-[0_8px_24px_rgba(33,26,18,0.12)]" priority />
        <div className="mt-4 text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">LeoDiet.com</div>
        <h1 className="mt-2 text-[clamp(32px,9vw,44px)] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance">
          Carnivore <span className="text-walnut">Diet Tracker</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-mute text-balance">
          Three salted glasses a day, water in between, and an honest record of your carnivore days. No calorie counting. No account needed.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <a href={APP_STORE} className="inline-flex items-center gap-3 rounded-full bg-cta px-6 py-4 text-[16px] font-bold text-white shadow-[0_10px_30px_rgba(37,30,23,0.25)] transition hover:bg-ctah">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.8 1.3 10.3.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.8-4.2zM14 4.9c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z" /></svg>
            App Store
          </a>
          <a href={PLAY_STORE} className="inline-flex items-center gap-3 rounded-full bg-cta px-6 py-4 text-[16px] font-bold text-white shadow-[0_10px_30px_rgba(37,30,23,0.25)] transition hover:bg-ctah">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 2.8v18.4c0 .5.5.8.9.6L20.5 12 4.9 2.2c-.4-.2-.9.1-.9.6zm11.3 7.3L6.2 4.9l9.1 5.2zm0 3.8l-9.1 5.2 9.1-5.2zm1.7-1.9l2.9-1.6-2.9-1.7-1.9 1.7 1.9 1.6zM15.3 13.9L6.2 19.1l9.1-5.2z" /></svg>
            Google Play
          </a>
        </div>
        <p className="mt-2 text-[12px] text-faint">Free · iPhone &amp; Android · English, Português, Español</p>
      </header>

      <section className="mt-12 flex flex-col gap-10">
        {FEATURES.map((f, i) => (
          <div key={f.head} className={`flex flex-col items-center gap-5 sm:flex-row ${i % 2 ? "sm:flex-row-reverse" : ""}`}>
            <Image src={f.img} alt={f.alt} width={414} height={900} unoptimized className="w-[220px] flex-none rounded-[26px] border border-line shadow-[0_12px_32px_rgba(33,26,18,0.08)]" />
            <div className="text-center sm:text-left">
              <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">{f.head}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-mute">{f.body}</p>
            </div>
          </div>
        ))}
      </section>

      <div className="mt-12 text-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href={APP_STORE} className="inline-flex items-center gap-3 rounded-full bg-cta px-6 py-4 text-[16px] font-bold text-white shadow-[0_10px_30px_rgba(37,30,23,0.25)] transition hover:bg-ctah">App Store</a>
          <a href={PLAY_STORE} className="inline-flex items-center gap-3 rounded-full bg-cta px-6 py-4 text-[16px] font-bold text-white shadow-[0_10px_30px_rgba(37,30,23,0.25)] transition hover:bg-ctah">Google Play</a>
        </div>
        <p className="mt-2 text-[12px] text-faint">Free · No account needed · English, Português, Español</p>
      </div>

      <p className="mt-8 text-center text-[12px] leading-relaxed text-faint">
        Leo is a habit journal, not medical advice. With high blood pressure, kidney or heart conditions, talk to your doctor before increasing salt.
      </p>

      <footer className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-mute">
        <a href="/privacy" className="hover:text-ink">Privacy</a>
        <a href="/terms" className="hover:text-ink">Terms</a>
        <a href="/support" className="hover:text-ink">Support</a>
        <a href="mailto:leo@leodiet.com" className="hover:text-ink">leo@leodiet.com</a>
        <span>© 2026 33WEB SOFTWARE LTDA</span>
      </footer>
    </div>
  );
}
