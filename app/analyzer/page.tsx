import type { Metadata } from "next";
import Link from "next/link";
import { Analyzer } from "@/components/analyzer/analyzer";

export const metadata: Metadata = {
  title: "Carnivore Diet Analyzer — find the gaps in what you eat",
  description:
    "Describe what you eat on a carnivore diet and get a nutrient-by-nutrient report: where you are short, what it can cause, and the food that fixes it. Free, no signup.",
  openGraph: {
    title: "Carnivore Diet Analyzer",
    description:
      "Nutrient-by-nutrient analysis of a carnivore diet. Where you are short, what it can cause, and the food that fixes it.",
    url: "https://thecarnivoresystem.com/analyzer",
    type: "website",
  },
};

const PROMISES = [
  {
    head: "The numbers are computed, not guessed",
    body: "Intakes come from a USDA composition table and targets from published reference intakes, both in plain code. Ask twice and you get the same answer. A model reads your description and writes the commentary; it never invents a milligram.",
  },
  {
    head: "Built for this diet, not adapted to it",
    body: "Sodium is scored as too little, not too much, because ketosis makes you dump it. Fibre is never marked missing. B12, zinc and niacin are shown as wins. Iron reverses direction depending on who you are.",
  },
  {
    head: "Food first, bottles last",
    body: "Every fix names an amount you could eat tomorrow. Where food genuinely cannot close a gap — magnesium is the honest case — it says so instead of pretending.",
  },
  {
    head: "Honest about what is not known",
    body: "Much of what circulates about this diet is anecdote. Where the evidence is thin, the report marks it thin rather than filling the gap with confidence.",
  },
];

export default function AnalyzerPage() {
  return (
    <div className="w-full max-w-[560px]">
      <header>
        <div className="flex items-center gap-2.5 text-[11px] tracking-[0.18em] text-salt uppercase">
          <span
            aria-hidden="true"
            className="size-[7px] flex-none animate-ember rounded-full bg-ember shadow-[0_0_8px_var(--color-ember)] motion-reduce:animate-none"
          />
          CS.04 — free tool
        </div>

        <h1 className="mt-3.5 font-display font-bold text-[clamp(30px,8.5vw,44px)] leading-[0.96] tracking-[-0.01em] uppercase">
          Diet
          <br />
          <span className="text-ember">Analyzer</span>
        </h1>

        <p className="mt-4 text-[13px] leading-relaxed tracking-[0.02em] text-salt">
          Everyone eating this way hits the same question around month two: what am I missing?
          Describe what you actually eat and find out — nutrient by nutrient, with the food that
          fixes each gap.
        </p>

        <div
          aria-hidden="true"
          className="mt-[26px] mb-[22px] h-[2px] w-full bg-[linear-gradient(90deg,var(--color-blood),var(--color-ember)_35%,transparent)]"
        />
      </header>

      <Analyzer />

      <section aria-label="How this works" className="mt-12">
        <h2 className="mb-3 font-display text-[13px] tracking-[0.06em] uppercase">
          How this one is different
        </h2>
        <ul className="flex list-none flex-col gap-3">
          {PROMISES.map((item, index) => (
            <li
              key={item.head}
              className="flex items-start gap-3.5 border border-edge border-l-[3px] border-l-blood bg-smoke py-4 pr-4 pl-3.5"
            >
              <span className="w-[26px] flex-none pt-px text-[11px] tracking-[0.1em] text-salt">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex-1">
                <span className="block font-display text-[13px] leading-[1.25] tracking-[0.04em] uppercase">
                  {item.head}
                </span>
                <span className="mt-1.5 block text-[12px] leading-relaxed text-salt">
                  {item.body}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-[34px] flex items-center gap-2.5 text-[10px] tracking-[0.2em] text-salt uppercase">
        <Link
          href="/"
          className="underline-offset-4 hover:text-ember hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          &larr; All channels
        </Link>
        <span className="text-ash">|</span> &copy; 2026 The Carnivore System
      </footer>
    </div>
  );
}
