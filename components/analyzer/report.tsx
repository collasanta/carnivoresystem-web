"use client";

import { useState } from "react";
import Link from "next/link";
import { NUTRIENT_BY_ID } from "@/lib/analyzer/nutrients";
import { SUPPLEMENT_PRESETS } from "@/lib/analyzer/supplement-presets";
import type { Assessment, Band, NutrientId, NutrientResult } from "@/lib/analyzer/types";
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

function NutrientCard({ result }: { result: NutrientResult }) {
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

      <p className="mt-3 text-[12.5px] leading-relaxed text-mute">{result.why}</p>

      {result.targetNote && (
        <p className="mt-2.5 rounded-xl bg-tint px-3 py-2.5 text-[11.5px] leading-relaxed text-mute">
          <span className="font-semibold text-walnut">Why this target:</span> {result.targetNote}
        </p>
      )}

      {result.fix && result.band !== "adequate" && (
        <div className="mt-3 border-t border-line pt-3">
          <div className="text-[9.5px] font-bold tracking-[0.14em] text-walnut uppercase">
            Fix it with food
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed font-medium text-ink">{result.fix}</p>
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

/**
 * The interactive supplement panel — the reason supplements left the quiz.
 * The list is anchored to the BASE assessment (diet only), so rows never
 * vanish when toggling one flips its nutrient green; flip a toggle and every
 * bar, the score and the protocol recompute in front of you.
 */
function SupplementPanel({
  baseGapIds,
  supps,
  onToggle,
}: {
  baseGapIds: NutrientId[];
  supps: Partial<Record<NutrientId, boolean>>;
  onToggle: (id: NutrientId) => void;
}) {
  const relevant = SUPPLEMENT_PRESETS.filter((p) => baseGapIds.includes(p.nutrientId));
  if (!relevant.length) return null;

  return (
    <section
      aria-label="Supplements you already take"
      className="mt-5 rounded-2xl border border-walnut/40 bg-card p-4 shadow-[0_1px_3px_rgba(33,26,18,0.05)]"
    >
      <h2 className="text-[14px] font-extrabold tracking-[-0.01em]">Already supplementing?</h2>
      <p className="mt-1 text-[12px] leading-relaxed text-mute">
        Flip on what you take — every bar, the score and the protocol recalculate instantly.
        Doses assume common label amounts.
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {relevant.map((preset) => {
          const on = !!supps[preset.nutrientId];
          return (
            <li key={preset.nutrientId}>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => onToggle(preset.nutrientId)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-[border-color,background-color] duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
                  on ? "border-cta bg-tint" : "border-line bg-card hover:border-linex",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative h-[22px] w-[38px] flex-none rounded-full transition-colors duration-150",
                    on ? "bg-cta" : "bg-line",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-[3px] size-[16px] rounded-full bg-card shadow transition-[left] duration-150",
                      on ? "left-[19px]" : "left-[3px]",
                    )}
                  />
                </span>
                <span className="flex-1">
                  <span className={cn("block text-[12.5px] text-ink", on && "font-bold")}>
                    {preset.label}
                  </span>
                  <span className="block text-[10.5px] text-mute">{preset.detail}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Report({
  assessment,
  baseGapIds,
  supps,
  onToggleSupp,
  onRestart,
}: {
  assessment: Assessment;
  baseGapIds: NutrientId[];
  supps: Partial<Record<NutrientId, boolean>>;
  onToggleSupp: (id: NutrientId) => void;
  onRestart: () => void;
}) {
  const { macros, nutrients, flags, parsed, redFlags, symptomInsights, score, protocol } =
    assessment;
  const supplements = assessment.supplements ?? [];
  const [copied, setCopied] = useState(false);

  const counts = nutrients.reduce<Record<Band, number>>(
    (acc, n) => ({ ...acc, [n.band]: (acc[n.band] ?? 0) + 1 }),
    {} as Record<Band, number>,
  );

  // The electrolyte trio gets its own stage — it is the first thing anyone on
  // this diet checks, and most early symptoms live there. Pulled out of the
  // general lists so they appear exactly once, up top, regardless of band.
  const ELECTROLYTES: NutrientId[] = ["sodium", "potassium", "magnesium"];
  const electrolytes = ELECTROLYTES.map((id) => nutrients.find((n) => n.id === id)!).filter(
    Boolean,
  );
  const attention = nutrients.filter(
    (n) => n.band !== "adequate" && !ELECTROLYTES.includes(n.id),
  );
  const onTarget = nutrients.filter(
    (n) => n.band === "adequate" && !ELECTROLYTES.includes(n.id),
  );
  const insights = (symptomInsights ?? []).filter(Boolean);
  const scoreTone = score.value >= 75 ? "text-good" : score.value >= 50 ? "text-warn" : "text-bad";

  async function copyProtocol() {
    const lines = [
      `CARNIVORE SCORE: ${score.value}/100`,
      "",
      "My protocol:",
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
    <div className="animate-in fade-in duration-300">
      {/* Hard-coded and rendered before anything else. */}
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

      {/* The share card: score, counts, protocol, provenance. */}
      <section
        aria-label="Your result"
        className="rounded-3xl border border-line bg-card p-5 shadow-[0_6px_24px_rgba(33,26,18,0.07)] sm:p-6"
      >
        <div className="flex items-center justify-between gap-3 text-[9.5px] font-bold tracking-[0.18em] uppercase">
          <span className="text-mute">The Carnivore System</span>
          <span className="text-walnut">Diet Analyzer</span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-[9.5px] font-bold tracking-[0.16em] text-mute uppercase">
              Carnivore Score
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className={cn("text-[44px] leading-none font-extrabold tracking-[-0.03em]", scoreTone)}>
                {score.value}
              </span>
              <span className="text-[15px] font-bold text-faint">/100</span>
            </div>
          </div>
          <div className="grid flex-1 grid-cols-3 gap-2">
            <Stat label="Deficient" value={String(counts.deficient ?? 0)} tone="text-bad" />
            <Stat label="Over" value={String((counts.excess ?? 0) + (counts.high ?? 0))} tone="text-warn" />
            <Stat label="On target" value={String(counts.adequate ?? 0)} tone="text-good" />
          </div>
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
        <p className="text-[10.5px] text-faint">Screenshot the card above to share it.</p>
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

      <section aria-label="Electrolytes" className="mt-6">
        <h2 className="flex items-baseline gap-2.5 text-[16px] font-extrabold tracking-[-0.01em]">
          Electrolytes
        </h2>
        <p className="mt-1 mb-3 text-[12.5px] leading-relaxed text-mute">
          The first thing to check on this diet. Ketosis makes the kidney dump sodium, potassium
          follows it, and magnesium was already short — most first-month symptoms live in these
          three bars.
        </p>
        <ul className="flex flex-col gap-3">
          {electrolytes.map((result) => (
            <li
              key={result.id}
              className="rounded-2xl border border-line bg-card p-4 shadow-[0_1px_2px_rgba(33,26,18,0.04)]"
            >
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <h3 className="text-[14px] font-bold tracking-[-0.01em]">{result.label}</h3>
                {result.targetNote && (
                  <span className="flex-none rounded-full border border-line px-2 py-0.5 text-[8.5px] font-semibold tracking-[0.1em] text-mute uppercase">
                    Keto-adjusted target
                  </span>
                )}
              </div>
              <NutrientBar result={result} />
              {result.band !== "adequate" && result.fix && (
                <p className="mt-2.5 text-[12.5px] leading-relaxed font-medium text-ink">
                  <span className="text-[9.5px] font-bold tracking-[0.14em] text-walnut uppercase">
                    Fix:{" "}
                  </span>
                  {result.fix}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <SupplementPanel baseGapIds={baseGapIds} supps={supps} onToggle={onToggleSupp} />

      {/* If the picks are wrong, everything is wrong — inspectable up front. */}
      <details className="mt-5 overflow-hidden rounded-2xl border border-line bg-card shadow-[0_1px_2px_rgba(33,26,18,0.04)]">
        <summary className="cursor-pointer px-4 py-3.5 text-[12px] font-bold text-ink hover:text-walnut">
          What we counted — check this first
        </summary>
        <div className="px-4 pb-4">
          <ul className="flex flex-wrap gap-1.5">
            {parsed.map((food, index) => (
              <li
                key={`${food.slug}-${index}`}
                className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink"
              >
                {food.label} &middot; {Math.round(food.gramsPerDay)}g/day
                {food.source.includes("week") ? ` (${food.source})` : ""}
              </li>
            ))}
            {supplements.map((s, index) => (
              <li
                key={`${s.nutrientId}-${index}`}
                className="rounded-full border border-walnut/40 px-2.5 py-1 text-[11px] text-ink"
              >
                {s.label} &middot; {s.amountPerDay}
                {NUTRIENT_BY_ID[s.nutrientId].unit === "IU" ? " IU" : NUTRIENT_BY_ID[s.nutrientId].unit}
                /day
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-mute">
            Weekly foods are averaged across seven days, so liver twice a week shows as a small
            daily number. If anything here is wrong,{" "}
            <button
              type="button"
              onClick={onRestart}
              className="font-semibold underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
            >
              edit your answers and run it again
            </button>
            . Your answers are kept on this device only.
          </p>
        </div>
      </details>

      {insights.length > 0 && (
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
      )}

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
          <NutrientCard key={result.id} result={result} />
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
            Your score changes every time your diet does
          </span>
          <span className="mt-0.5 block text-[12px] text-mute">
            The Carnivore System App tracks it daily &middot; iOS &middot; join the waitlist
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
