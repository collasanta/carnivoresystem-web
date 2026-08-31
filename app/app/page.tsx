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
    <div className="w-full max-w-[520px]">
      <header className="text-center">
        <div className="flex items-center justify-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">
          <span
            aria-hidden="true"
            className="size-[7px] flex-none animate-pulse-soft rounded-full bg-walnut motion-reduce:animate-none"
          />
          In development
        </div>

        <h1 className="mt-3 text-[clamp(26px,7vw,36px)] leading-[1.08] font-extrabold tracking-[-0.03em] text-balance">
          Carnivore System <span className="text-walnut">App</span>
        </h1>

        <p className="mx-auto mt-3 max-w-[42ch] text-[13.5px] leading-relaxed text-mute">
          Every macro tracker buries meat under thousands of foods you don&rsquo;t eat. This one
          doesn&rsquo;t. Log a 600g ribeye in five seconds.
        </p>
      </header>

      <section aria-label="What it does" className="mt-8">
        <ul className="flex list-none flex-col gap-3">
          {FEATURES.map((f) => (
            <li
              key={f.head}
              className="rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(33,26,18,0.04)]"
            >
              <span className="block text-[14px] font-bold tracking-[-0.01em] text-ink">
                {f.head}
              </span>
              <span className="mt-1 block text-[12.5px] leading-relaxed text-mute">{f.body}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Join the waitlist" className="mt-7">
        <WaitlistForm />
      </section>

      <footer className="mt-10 flex items-center justify-center gap-2 text-[11px] text-mute">
        <Link
          href="/"
          className="font-semibold underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
        >
          &larr; All channels
        </Link>
        <span className="text-faint">|</span> &copy; 2026 The Carnivore System
      </footer>
    </div>
  );
}
