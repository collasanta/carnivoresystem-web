"use client";

import { useState } from "react";
import Link from "next/link";
import { NUTRIENT_BY_ID } from "@/lib/analyzer/nutrients";
import type { AnalysisReport, Band, NutrientResult } from "@/lib/analyzer/types";
import { cn } from "@/lib/utils";
import { NutrientBar } from "./nutrient-bar";

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="mt-10 mb-3 flex items-baseline gap-2.5 text-[16px] font-extrabold tracking-[-0.01em]">
      {children}
      {count !== undefined && <span className="text-[12px] font-semibold text-mute">{count}</span>}
    </h2>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2.5">
      <div className="text-[9px] font-semibold tracking-[0.14em] text-mute uppercase">{label}</div>
      <div className={cn("mt-1 text-[16px] leading-none font-extrabold tracking-[-0.01em]", tone)}>{value}</div>
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
    <li className="rounded-2xl border border-line bg-card p-4 shadow-[0_1px_2px_rgba(33,26,18,0.04)]">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h3 className="text-[14px] font-bold tracking-[-0.01em]">{result.label}</h3>
        {result.evidenceHarm === "low" && result.band !== "adequate" && (
          <span className="flex-none rounded-full border border-line px-2 py-0.5 text-[8.5px] font-semibold tracking-[0.1em] text-mute uppercase">
            Low-risk gap
          </span>
        )}
      </div>

      <NutrientBar result={result} />

      {result.coverage < 0.75 && (
        <p className="mt-2 text-[10.5px] leading-relaxed font-medium text-warn">
          Partial data: measured values cover about {Math.round(result.coverage * 100)}% of what
          you eat for this nutrient, so your true intake is likely higher than shown.
        </p>
      )}

      <p className="mt-3 text-[12.5px] leading-relaxed text-mute">{note?.comment ?? result.why}</p>

      {result.targetNote && (
        <p className="mt-2.5 rounded-xl bg-tint px-3 py-2.5 text-[11.5px] leading-relaxed text-mute">
          <span className="font-semibold text-walnut">Why this target:</span> {result.targetNote}
        </p>
      )}

      {note?.sideEffects?.length ? (
        <div className="mt-3">
          <div className="text-[9.5px] font-semibold tracking-[0.14em] text-mute uppercase">
            What this can show up as
          </div>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {note.sideEffects.map((effect, index) => (
              <li
                key={`${effect}-${index}`}
                className="rounded-full border border-line px-2.5 py-0.5 text-[11px] text-ink"
              >
                {effect}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {note?.fix && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="text-[9.5px] font-bold tracking-[0.14em] text-walnut uppercase">Fix it with food</div>
          <p className="mt-1 text-[12.5px] leading-relaxed font-medium text-ink">{note.fix}</p>
        </div>
      )}

      {result.topSources.length > 0 && (
        <p className="mt-2.5 text-[10.5px] text-faint">
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
  const supplements = assessment.supplements ?? [];
  const unquantified = assessment.unquantifiedSupplements ?? [];
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
          className="mb-7 rounded-2xl border-2 border-bad bg-bad/[0.05] p-5"
        >
          <h2 className="text-[16px] font-extrabold tracking-[-0.01em] text-bad">
            Stop here and see a doctor
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink">
            You reported something that is not a diet problem. Nothing below is an alternative to
            getting this looked at.
          </p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {redFlags.map((flag) => (
              <li key={flag.symptom} className="rounded-xl bg-card p-3">
                <span className="block text-[12.5px] font-bold text-ink">
                  {flag.symptom}
                  <span className="ml-2 rounded-full bg-bad px-2 py-0.5 text-[9px] font-bold tracking-[0.1em] text-card uppercase">
                    {flag.urgency === "emergency" ? "Emergency" : "Within days"}
                  </span>
                </span>
                <span className="mt-1 block text-[11.5px] leading-relaxed text-mute">
                  {flag.reason}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {degraded && (
        <p className="mb-6 rounded-2xl border border-warn/50 bg-warn/[0.07] px-4 py-3 text-[12.5px] leading-relaxed text-ink">
          {degraded}
        </p>
      )}

      {narrative?.summary && (
        <p className="text-[13.5px] leading-relaxed text-mute">{narrative.summary}</p>
      )}

      {/* The share card. The answer, complete and screenshot-sized: headline,
          score, protocol, and where it came from. Everything below it is the
          supporting argument. */}
      <section
        aria-label="Your result"
        className="mt-5 rounded-3xl border border-line bg-card p-5 shadow-[0_6px_24px_rgba(33,26,18,0.07)] sm:p-6"
      >
        <div className="flex items-center justify-between gap-3 text-[9.5px] font-bold tracking-[0.18em] uppercase">
          <span className="text-mute">The Carnivore System</span>
          <span className="text-walnut">Diet Analyzer</span>
        </div>

        {narrative?.headline && (
          <h1 className="mt-3.5 text-[clamp(19px,5vw,24px)] leading-[1.2] font-extrabold tracking-[-0.02em] text-balance">
            {narrative.headline}
          </h1>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Deficient" value={String(counts.deficient ?? 0)} tone="text-bad" />
          <Stat label="Low" value={String(counts.low ?? 0)} tone="text-warn" />
          <Stat
            label="Over limit"
            value={String((counts.excess ?? 0) + (counts.high ?? 0))}
            tone="text-warn"
          />
          <Stat label="On target" value={String(counts.adequate ?? 0)} tone="text-good" />
        </div>

        {protocol.length > 0 && (
          <ol className="mt-4 flex flex-col gap-2.5 border-t border-line pt-4">
            {protocol.map((step, index) => (
              <li key={`${step.action}-${index}`} className="flex items-baseline gap-3">
                <span className="flex size-[22px] flex-none items-center justify-center rounded-full bg-tint text-[11px] font-extrabold text-walnut">
                  {index + 1}
                </span>
                <span className="flex-1">
                  <span className="block text-[13px] leading-[1.3] font-bold text-ink">
                    {step.action}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] leading-relaxed text-mute">
                    {step.rationale}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-4 border-t border-line pt-3 text-[9.5px] font-semibold tracking-[0.18em] text-faint uppercase">
          thecarnivoresystem.com/analyzer
        </div>
      </section>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <p className="text-[10.5px] text-faint">
          Screenshot the card above to share it.
        </p>
        {protocol.length > 0 && (
          <button
            type="button"
            onClick={copyProtocol}
            className="flex-none rounded-full border border-line bg-card px-3.5 py-1.5 text-[10.5px] font-bold tracking-[0.1em] text-ink uppercase transition-colors duration-150 hover:border-cta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            {copied ? "Copied" : "Copy protocol"}
          </button>
        )}
      </div>

      {/* If the parse is wrong, everything is wrong — so it is offered for
          inspection right here, before the argument, not after it. */}
      <details className="mt-5 overflow-hidden rounded-2xl border border-line bg-card shadow-[0_1px_2px_rgba(33,26,18,0.04)]">
        <summary className="cursor-pointer px-4 py-3.5 text-[12px] font-bold text-ink hover:text-walnut">
          What we read from your description — check this first
        </summary>
        <div className="px-4 pb-4">
          <ul className="flex flex-wrap gap-1.5">
            {parsed.map((food, index) => (
              <li
                key={`${food.slug}-${index}`}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px]",
                  food.unmatched ? "border-warn font-medium text-warn" : "border-line text-ink",
                )}
              >
                {food.label} &middot; {Math.round(food.gramsPerDay)}g/day
              </li>
            ))}
          </ul>
          {(supplements.length > 0 || unquantified.length > 0) && (
            <>
              <div className="mt-3 text-[9.5px] font-semibold tracking-[0.14em] text-mute uppercase">
                Supplements
              </div>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {supplements.map((s, index) => (
                  <li
                    key={`${s.nutrientId}-${index}`}
                    className="rounded-full border border-walnut/40 px-2.5 py-1 text-[11px] text-ink"
                  >
                    {s.label} &middot; {s.amountPerDay}
                    {NUTRIENT_BY_ID[s.nutrientId].unit === "IU"
                      ? " IU"
                      : NUTRIENT_BY_ID[s.nutrientId].unit}
                    /day{s.estimated ? " (est.)" : ""}
                  </li>
                ))}
                {unquantified.map((u, index) => (
                  <li
                    key={`${u.label}-${index}`}
                    className="rounded-full border border-warn px-2.5 py-1 text-[11px] font-medium text-warn"
                    title={u.reason}
                  >
                    {u.label} &middot; not counted
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11.5px] leading-relaxed text-mute">
                Counted supplements are already inside every bar below. Anything marked
                &ldquo;not counted&rdquo; has no stated amounts, so it isn&rsquo;t.
              </p>
            </>
          )}
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-mute">
            Weekly foods are averaged across seven days, so liver once a fortnight shows up as a
            small daily number. If anything here is wrong, every number below is wrong with it
            &mdash;{" "}
            <button
              type="button"
              onClick={onRestart}
              className="font-semibold underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
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
              <li key={`${link.symptom}-${index}`} className="rounded-2xl border border-line bg-card p-4 shadow-[0_1px_2px_rgba(33,26,18,0.04)]">
                <h3 className="text-[13.5px] font-bold tracking-[-0.01em]">{link.symptom}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-mute">{link.explanation}</p>
              </li>
            ))}
          </ul>
        </>
      ) : insights.length > 0 ? (
        <>
          <SectionTitle>What you reported, against what we measured</SectionTitle>
          <ul className="flex flex-col gap-3">
            {insights.map((insight) => (
              <li key={insight.symptom} className="rounded-2xl border border-line bg-card p-4 shadow-[0_1px_2px_rgba(33,26,18,0.04)]">
                <h3 className="text-[13.5px] font-bold tracking-[-0.01em]">{insight.symptom}</h3>
                {insight.matchedCauses.length > 0 ? (
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-mute">
                    Lines up with what came up short:{" "}
                    <span className="font-semibold text-ink">{insight.matchedCauses.join(", ")}</span>.
                  </p>
                ) : (
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-mute">
                    Nothing in your numbers points at this one directly.
                  </p>
                )}
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-walnut">
                  <span className="font-semibold">Cheapest test:</span> {insight.quickTest}
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
          tone={macros.kcalIntake < macros.kcalTarget * 0.8 ? "text-warn" : "text-ink"}
        />
        <Stat
          label="Protein"
          value={`${macros.proteinG}g · ${macros.proteinPctKcal.toFixed(0)}%`}
          tone={macros.proteinPctKcal > 35 ? "text-bad" : "text-ink"}
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
                className="rounded-2xl border border-line bg-card p-4 shadow-[0_1px_2px_rgba(33,26,18,0.04)]"
              >
                <h3 className="flex items-center gap-2 text-[13.5px] font-bold tracking-[-0.01em]">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-[8px] flex-none rounded-full",
                      flag.severity === "danger" ? "bg-bad" : "bg-warn",
                    )}
                  />
                  {flag.title}
                </h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-mute">{flag.detail}</p>
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
          <p className="mb-3 text-[12.5px] leading-relaxed text-mute">
            Worth stating plainly, because generic nutrition tools get these wrong on a carnivore
            diet and flag them anyway.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {onTarget.map((result) => (
              <li
                key={result.id}
                className="flex items-baseline justify-between gap-3 rounded-xl border border-line bg-card px-3.5 py-2.5"
              >
                <span className="text-[12.5px] font-medium text-ink">{result.label}</span>
                <span className="flex-none text-[11px] font-bold text-good">
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
        className="mt-10 flex items-center gap-4 rounded-2xl border border-line bg-card p-4 no-underline shadow-[0_1px_2px_rgba(33,26,18,0.04)] transition-[border-color,box-shadow,translate] duration-150 hover:-translate-y-[1px] hover:border-linex hover:shadow-[0_4px_12px_rgba(33,26,18,0.07)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
      >
        <span className="flex-1">
          <span className="block text-[15px] font-bold tracking-[-0.01em] text-ink">
            Track it daily
          </span>
          <span className="mt-0.5 block text-[12px] text-mute">
            Carnivore System App &middot; iOS macro tracker &middot; join the waitlist
          </span>
        </span>
        <span className="flex-none rounded-full border border-cta bg-cta px-3 py-1 text-[10px] font-bold tracking-[0.08em] text-card uppercase">
          Waitlist
        </span>
      </Link>

      <div className="mt-10 border-t border-line pt-5">
        <p className="text-[11.5px] leading-relaxed text-mute">
          <strong className="text-ink">This is not medical advice.</strong> These are estimated
          intakes from a food composition table, compared against reference targets. An estimated
          shortfall is not a diagnosed deficiency, and only blood work can tell you which you
          have. Much of what circulates about this diet is anecdotal; where the evidence is thin
          we have said so rather than filled the gap with confidence. If a symptom is severe,
          sudden or persistent, see a doctor instead of adjusting your food.
        </p>
        <button
          type="button"
          onClick={onRestart}
          className="mt-5 rounded-full border border-line bg-card px-6 py-3 text-[11.5px] font-bold tracking-[0.1em] text-ink uppercase transition-colors duration-150 hover:border-cta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
        >
          Edit answers &amp; run again
        </button>
      </div>
    </div>
  );
}
