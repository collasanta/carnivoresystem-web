import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Leo — Carnivore Diet Tracker",
  description:
    "Three salted glasses a day, water in between, and an honest record of your carnivore days. Free on the App Store.",
  alternates: { canonical: "https://leodiet.com" },
  openGraph: {
    title: "Leo — Carnivore Diet Tracker",
    description: "Salt, water and clean days. The carnivore tracker that keeps you out of the cramps.",
    url: "https://leodiet.com",
    type: "website",
    images: [{ url: "/leo-shot-1.png", width: 1320, height: 2868 }],
  },
};

const APP_STORE = "https://apps.apple.com/app/id6808867448";

const POINTS = [
  { head: "Salt done right", body: "½ teaspoon per 500 ml glass, three times a day. The concentration your gut tolerates — never the salt-water-flush mistake." },
  { head: "Log a day in two taps", body: "Meals in one tap, or just confirm you ate 100% carnivore. Cheated? One honest button and a red square." },
  { head: "See your pattern", body: "A heatmap of clean days and slips, streaks, weight, and how you felt — so you finally know what changes when you slip." },
];

export default function Leo() {
  return (
    <div className="w-full max-w-[520px]">
      <header className="text-center">
        <Image src="/leo-icon.png" alt="Leo" width={84} height={84} className="mx-auto rounded-[22px] shadow-[0_8px_24px_rgba(33,26,18,0.12)]" priority />
        <div className="mt-4 text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">LeoDiet.com</div>
        <h1 className="mt-2 text-[clamp(32px,9vw,44px)] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance">
          Carnivore <span className="text-walnut">Diet Tracker</span>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-mute text-balance">
          Three salted glasses a day, water in between, and an honest record of your carnivore days. No calorie counting. No account needed.
        </p>
        <a
          href={APP_STORE}
          className="mt-6 inline-flex items-center gap-3 rounded-full bg-cta px-6 py-4 text-[16px] font-bold text-white shadow-[0_10px_30px_rgba(37,30,23,0.25)] transition hover:bg-ctah"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.8 1.3 10.3.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.8-4.2zM14 4.9c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z" /></svg>
          Download on the App Store
        </a>
        <p className="mt-2 text-[12px] text-faint">Free · iPhone · English, Português, Español</p>
      </header>

      <section className="mt-10 grid grid-cols-2 gap-3">
        <Image src="/leo-shot-1.png" alt="Today: salted glasses and water" width={1320} height={2868} className="rounded-[22px] border border-line" />
        <Image src="/leo-shot-2.png" alt="History heatmap of clean days" width={1320} height={2868} className="rounded-[22px] border border-line" />
      </section>

      <section className="mt-10 flex flex-col gap-3">
        {POINTS.map((p) => (
          <div key={p.head} className="rounded-[18px] border border-line bg-card p-5">
            <h2 className="text-[16px] font-bold">{p.head}</h2>
            <p className="mt-1 text-[14px] leading-relaxed text-mute">{p.body}</p>
          </div>
        ))}
      </section>

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
