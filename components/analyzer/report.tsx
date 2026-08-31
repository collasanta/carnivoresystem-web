"use client";

import { useState } from "react";
import Link from "next/link";
import type { AnalysisReport, Band, NutrientResult } from "@/lib/analyzer/types";
import { cn } from "@/lib/utils";
import { NutrientBar } from "./nutrient-bar";

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="mt-9 mb-3 flex items-baseline gap-2.5 font-display text-[13px] tracking-[0.06em] uppercase">
      {children}
      {count !== undefined && <span className="font-mono text-[11px] text-salt">{count}</span>}
    </h2>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="border border-edge bg-char px-3 py-2.5">
      <div className="text-[9px] tracking-[0.18em] text-salt uppercase">{label}</div>
      <div className={cn("mt-1 font-display text-[15px] leading-none", tone)}>{value}</div>
    </div>
  );
}

function NutrientCard({
  result,
  note,
}: {
  result: NutrientResult;
  note?: { comment: string; sideEffects: string[]; fix: string };
}) {
  return (
    <li className="border border-edge border-l-[3px] border-l-blood bg-smoke p-4">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-[13px] tracking-[0.04em] uppercase">{result.label}</h3>
        {result.evidenceHarm === "low" && result.band !== "adequate" && (
          <span className="flex-none border border-ash px-1.5 py-0.5 text-[8px] tracking-[0.14em] text-salt uppercase">
            Low-risk gap
          </span>
        )}
      </div>

      <NutrientBar result={result} />

      {result.coverage < 0.75 && (
        <p className="mt-2 text-[10px] leading-relaxed text-warn">
          Partial data: measured values cover about {Math.round(result.coverage * 100)}% of what
          you eat for this nutrient, so your true intake is likely higher than shown.
        </p>
      )}

      <p className="mt-3 text-[12px] leading-relaxed text-salt">{note?.comment ?? result.why}</p>

      {result.targetNote && (
        <p className="mt-2.5 border-l border-ash/60 pl-2.5 text-[11px] leading-relaxed text-salt italic">
          Why this target: {result.targetNote}
        </p>
      )}

      {note?.sideEffects?.length ? (
        <div className="mt-3">
          <div className="text-[9px] tracking-[0.18em] text-salt uppercase">
            What this can show up as
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {note.sideEffects.map((effect, index) => (
              <li
                key={`${effect}-${index}`}
                className="border border-edge px-2 py-0.5 text-[11px] text-bone"
              >
                {effect}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {note?.fix && (
        <div className="mt-3 border-t border-edge pt-3">
          <div className="text-[9px] tracking-[0.18em] text-ember uppercase">Fix it with food</div>
          <p className="mt-1 text-[12px] leading-relaxed text-bone">{note.fix}</p>
        </div>
      )}

      {result.topSources.length > 0 && (
        <p className="mt-2.5 text-[10px] tracking-[0.04em] text-ash">
          From:{" "}
          {result.topSources
            .map((s) => `${s.label} (${s.amount}${result.unit === "IU" ? "" : result.unit})`)
            .join(" · ")}
        </p>
      )}
    </li>
  );
}

export function Report({ report, onRestart }: { report: AnalysisReport; onRestart: () => void }) {
  const { assessment, narrative, degraded } = report;
  const { macros, nutrients, flags, parsed, redFlags, symptomInsights } = assessment;
  const [copied, setCopied] = useState(false);

  const noteById = new Map((narrative?.notes ?? []).map((n) => [n.id, n]));
  const counts = nutrients.reduce<Record<Band, number>>(
    (acc, n) => ({ ...acc, [n.band]: (acc[n.band] ?? 0) + 1 }),
    {} as Record<Band, number>,
  );

  const attention = nutrients.filter((n) => n.band !== "adequate");
  const onTarget = nutrients.filter((n) => n.band === "adequate");
  const protocol = narrative?.protocol ?? [];
  const insights = (symptomInsights ?? []).filter(Boolean);

  async function copyProtocol() {
    const lines = [
      "CARNIVORE DIET ANALYZER — my protocol",
      ...(narrative?.headline ? ["", narrative.headline] : []),
      "",
      ...protocol.map((step, i) => `${i + 1}. ${step.action}`),
      "",
      "thecarnivoresystem.com/analyzer",
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the button just doesn't confirm */
    }
  }

  return (
    <div>
      {/* Hard-coded and rendered before anything else. Nothing the model wrote
          can soften or displace this block. */}
      {redFlags.length > 0 && (
        <section
          aria-label="Seek medical attention"
          className="mb-7 border-2 border-ember bg-ember/[0.06] p-4"
        >
          <h2 className="font-display text-[13px] tracking-[0.06em] text-ember uppercase">
            Stop here and see a doctor
          </h2>
          <p className="mt-2 text-[12px] leading-relaxed text-bone">
            You reported something that is not a diet problem. Nothing below is an alternative to
            getting this looked at.
          </p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {redFlags.map((flag) => (
              <li key={flag.symptom} className="border-l-2 border-ember pl-3">
                <span className="block text-[12px] font-bold text-bone">
                  {flag.symptom}
                  <span className="ml-2 font-normal text-[10px] tracking-[0.14em] text-ember uppercase">
                    {flag.urgency === "emergency" ? "Emergency" : "Within days"}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-salt">
                  {flag.reason}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {degraded && (
        <p className="mb-6 border border-warn bg-warn/[0.06] px-3.5 py-3 text-[12px] leading-relaxed text-bone">
          {degraded}
        </p>
      )}

      {narrative?.summary && (
        <p className="text-[13px] leading-relaxed text-salt">{narrative.summary}</p>
      )}

      {/* The share card. The answer, complete and screenshot-sized: headline,
          score, protocol, and where it came from. Everything below it is the
          supporting argument. */}
      <section
        aria-label="Your result"
        className="mt-5 border-2 border-bone bg-smoke p-4 sm:p-5"
      >
        <div className="flex items-center justify-between gap-3 text-[9px] tracking-[0.22em] uppercase">
          <span className="text-salt">The Carnivore System</span>
          <span className="text-ember">Diet Analyzer</span>
        </div>

        {narrative?.headline && (
          <h1 className="mt-3.5 font-display text-[clamp(18px,5vw,24px)] leading-[1.15] tracking-[-0.01em] uppercase">
            {narrative.headline}
          </h1>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Deficient" value={String(counts.deficient ?? 0)} tone="text-ember" />
          <Stat label="Low" value={String(counts.low ?? 0)} tone="text-warn" />
          <Stat
            label="Over limit"
            value={String((counts.excess ?? 0) + (counts.high ?? 0))}
            tone="text-warn"
          />
          <Stat label="On target" value={String(counts.adequate ?? 0)} tone="text-good" />
        </div>

        {protocol.length > 0 && (
          <ol className="mt-4 flex flex-col gap-2 border-t border-edge pt-4">
            {protocol.map((step, index) => (
              <li key={`${step.action}-${index}`} className="flex items-baseline gap-3">
                <span className="w-[22px] flex-none font-display text-[12px] text-ember">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex-1">
                  <span className="block font-display text-[12px] leading-[1.3] tracking-[0.03em] uppercase">
                    {step.action}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-salt">
                    {step.rationale}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-4 border-t border-edge pt-2.5 text-[9px] tracking-[0.22em] text-salt uppercase">
          thecarnivoresystem.com/analyzer
        </div>
      </section>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <p className="text-[10px] tracking-[0.04em] text-ash">
          Screenshot the card above to share it.
        </p>
        {protocol.length > 0 && (
          <button
            type="button"
            onClick={copyProtocol}
            className="flex-none border border-edge px-3 py-1.5 text-[10px] tracking-[0.14em] uppercase transition-colors duration-150 hover:border-ember hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
          >
            {copied ? "Copied" : "Copy protocol"}
          </button>
        )}
      </div>

      {/* If the parse is wrong, everything is wrong — so it is offered for
          inspection right here, before the argument, not after it. */}
      <details className="mt-5 border border-edge bg-smoke">
        <summary className="cursor-pointer px-4 py-3 text-[11px] tracking-[0.16em] text-salt uppercase hover:text-ember">
          What we read from your description — check this first
        </summary>
        <div className="px-4 pb-4">
          <ul className="flex flex-wrap gap-1.5">
            {parsed.map((food, index) => (
              <li
                key={`${food.slug}-${index}`}
                className={cn(
                  "border px-2 py-1 text-[11px]",
                  food.unmatched ? "border-warn text-warn" : "border-edge text-bone",
                )}
              >
                {food.label} &middot; {Math.round(food.gramsPerDay)}g/day
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[11px] leading-relaxed text-salt">
            Weekly foods are averaged across seven days, so liver once a fortnight shows up as a
            small daily number. If anything here is wrong, every number below is wrong with it
            &mdash;{" "}
            <button
              type="button"
              onClick={onRestart}
              className="underline underline-offset-4 hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
            >
              edit your answers and run it again
            </button>
            . Your answers are kept on this device.
          </p>
        </div>
      </details>

      {(narrative?.symptomLinks?.length ?? 0) > 0 ? (
        <>
          <SectionTitle>What you reported, against what we measured</SectionTitle>
          <ul className="flex flex-col gap-3">
            {narrative!.symptomLinks.map((link, index) => (
              <li key={`${link.symptom}-${index}`} className="border border-edge bg-smoke p-4">
                <h3 className="font-display text-[12px] tracking-[0.04em] uppercase">
                  {link.symptom}
                </h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-salt">{link.explanation}</p>
              </li>
            ))}
          </ul>
        </>
      ) : insights.length > 0 ? (
        <>
          <SectionTitle>What you reported, against what we measured</SectionTitle>
          <ul className="flex flex-col gap-3">
            {insights.map((insight) => (
              <li key={insight.symptom} className="border border-edge bg-smoke p-4">
                <h3 className="font-display text-[12px] tracking-[0.04em] uppercase">
                  {insight.symptom}
                </h3>
                {insight.matchedCauses.length > 0 ? (
                  <p className="mt-1.5 text-[12px] leading-relaxed text-salt">
                    Lines up with what came up short:{" "}
                    <span className="text-bone">{insight.matchedCauses.join(", ")}</span>.
                  </p>
                ) : (
                  <p className="mt-1.5 text-[12px] leading-relaxed text-salt">
                    Nothing in your numbers points at this one directly.
                  </p>
                )}
                <p className="mt-1.5 text-[11px] leading-relaxed text-ash">
                  Cheapest test: {insight.quickTest}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <SectionTitle>Energy and macros</SectionTitle>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Calories"
          value={`${macros.kcalIntake} / ${macros.kcalTarget}`}
          tone={macros.kcalIntake < macros.kcalTarget * 0.8 ? "text-warn" : "text-bone"}
        />
        <Stat
          label="Protein"
          value={`${macros.proteinG}g · ${macros.proteinPctKcal.toFixed(0)}%`}
          tone={macros.proteinPctKcal > 35 ? "text-ember" : "text-bone"}
        />
        <Stat label="Fat" value={`${macros.fatG}g · ${macros.fatPctKcal.toFixed(0)}%`} />
        <Stat
          label="Fat : protein"
          value={macros.fatToProtein.toFixed(2)}
          tone={macros.fatToProtein < 1 ? "text-warn" : "text-good"}
        />
      </div>

      {flags.length > 0 && (
        <>
          <SectionTitle count={flags.length}>What stands out</SectionTitle>
          <ul className="flex flex-col gap-3">
            {flags.map((flag) => (
              <li
                key={flag.id}
                className={cn(
                  "border border-edge border-l-[3px] bg-smoke p-4",
                  flag.severity === "danger" ? "border-l-ember" : "border-l-warn",
                )}
              >
                <h3 className="font-display text-[12px] tracking-[0.04em] uppercase">
                  {flag.title}
                </h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-salt">{flag.detail}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      <SectionTitle count={attention.length}>Needs attention</SectionTitle>
      <ul className="flex flex-col gap-3">
        {attention.map((result) => (
          <NutrientCard key={result.id} result={result} note={noteById.get(result.id)} />
        ))}
      </ul>

      {onTarget.length > 0 && (
        <>
          <SectionTitle count={onTarget.length}>What your diet already covers</SectionTitle>
          <p className="mb-3 text-[12px] leading-relaxed text-salt">
            Worth stating plainly, because generic nutrition tools get these wrong on a carnivore
            diet and flag them anyway.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {onTarget.map((result) => (
              <li
                key={result.id}
                className="flex items-baseline justify-between gap-3 border border-edge bg-smoke px-3 py-2"
              >
                <span className="text-[12px] text-bone">{result.label}</span>
                <span className="flex-none font-mono text-[10px] tracking-[0.06em] text-good">
                  {result.intake}
                  {result.unit === "IU" ? " IU" : result.unit}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <Link
        href="/app"
        className="mt-9 flex items-center gap-3.5 border border-edge border-l-[3px] border-l-blood bg-smoke py-4 pr-4 pl-3.5 text-bone no-underline transition-[border-color,background-color,translate] duration-[180ms] ease-out hover:translate-x-[3px] hover:border-edge-hover hover:border-l-ember hover:bg-mod-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
      >
        <span className="w-[52px] flex-none text-[11px] tracking-[0.1em] text-salt">CS.03</span>
        <span className="flex-1 font-display text-[14px] leading-[1.2] tracking-[0.04em] uppercase">
          Track it daily
          <small className="mt-[3px] block font-mono text-[10px] font-normal tracking-[0.14em] text-salt uppercase">
            Carnivore System App &middot; iOS macro tracker &middot; join the waitlist
          </small>
        </span>
        <span className="flex-none border border-ember px-2 py-1 text-[9px] font-bold tracking-[0.16em] text-ember uppercase">
          Waitlist
        </span>
      </Link>

      <div className="mt-9 border-t border-edge pt-5">
        <p className="text-[11px] leading-relaxed text-salt">
          <strong className="text-bone">This is not medical advice.</strong> These are estimated
          intakes from a food composition table, compared against reference targets. An estimated
          shortfall is not a diagnosed deficiency, and only blood work can tell you which you
          have. Much of what circulates about this diet is anecdotal; where the evidence is thin
          we have said so rather than filled the gap with confidence. If a symptom is severe,
          sudden or persistent, see a doctor instead of adjusting your food.
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-5 border border-edge px-5 py-2.5 font-display text-[11px] tracking-[0.14em] uppercase transition-colors duration-150 hover:border-ember hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          Edit answers &amp; run again
        </button>
      </div>
    </div>
  );
}
