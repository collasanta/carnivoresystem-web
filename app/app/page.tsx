import type { Metadata } from "next";
import Link from "next/link";
import { WaitlistForm } from "@/components/waitlist-form";

export const metadata: Metadata = {
  title: "Carnivore System App — Waitlist",
  description:
    "An iOS macro tracker built for one way of eating. Log a 600g ribeye in five seconds. Join the waitlist.",
  openGraph: {
    title: "Carnivore System App",
    description: "A macro tracker that doesn't bury meat under 4,000 plant foods.",
    url: "https://thecarnivoresystem.com/app",
    type: "website",
  },
};

const FEATURES = [
  {
    head: "Cuts, not a database",
    body: "Ribeye, chuck, eggs, butter, liver. Presets weighted by gram, not a search box with 4,000 plant foods in front of it.",
  },
  {
    head: "Protein-to-fat, up front",
    body: "The one ratio that matters on this diet, on the main screen — not three taps deep behind carbs you never eat.",
  },
  {
    head: "Same as yesterday",
    body: "Most days repeat. One tap copies the whole day forward, so logging costs seconds instead of minutes.",
  },
  {
    head: "Stays on your phone",
    body: "No account required to use it. Your log lives on the device unless you ask it to go somewhere else.",
  },
];

export default function AppWaitlist() {
  return (
    <div className="w-full max-w-[480px]">
      <header>
        <div className="flex items-center gap-2.5 text-[11px] tracking-[0.18em] text-salt uppercase">
          <span
            aria-hidden="true"
            className="size-[7px] flex-none animate-ember rounded-full bg-ember shadow-[0_0_8px_var(--color-ember)] motion-reduce:animate-none"
          />
          CS.04 — in development
        </div>

        <h1 className="mt-3.5 font-display font-bold text-[clamp(32px,9vw,44px)] leading-[0.96] tracking-[-0.01em] uppercase">
          Carnivore
          <br />
          System <span className="text-ember">App</span>
        </h1>

        <p className="mt-4 text-[13px] leading-relaxed tracking-[0.02em] text-salt">
          Every macro tracker buries meat under thousands of foods you don&rsquo;t eat.
          This one doesn&rsquo;t. Log a 600g ribeye in five seconds.
        </p>

        <div
          aria-hidden="true"
          className="mt-[26px] mb-[22px] h-[2px] w-full bg-[linear-gradient(90deg,var(--color-blood),var(--color-ember)_35%,transparent)]"
        />
      </header>

      <section aria-label="What it does">
        <ul className="flex list-none flex-col gap-3">
          {FEATURES.map((f, i) => (
            <li
              key={f.head}
              className="flex items-start gap-3.5 border border-edge border-l-[3px] border-l-blood bg-smoke py-4 pr-4 pl-3.5"
            >
              <span className="w-[52px] flex-none pt-px text-[11px] tracking-[0.1em] text-salt">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1">
                <span className="block font-display text-[13px] leading-[1.25] tracking-[0.04em] uppercase">
                  {f.head}
                </span>
                <span className="mt-1.5 block text-[12px] leading-relaxed text-salt">
                  {f.body}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Join the waitlist" className="mt-[26px]">
        <WaitlistForm />
      </section>

      <footer className="mt-[34px] flex items-center gap-2.5 text-[10px] tracking-[0.2em] text-salt uppercase">
        <Link
          href="/"
          className="underline-offset-4 hover:text-ember hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          ← All channels
        </Link>
        <span className="text-ash">|</span> © 2026 The Carnivore System
      </footer>
    </div>
  );
}
