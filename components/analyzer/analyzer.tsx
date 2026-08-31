"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FOOD_BY_SLUG } from "@/lib/analyzer/foods";
import { WEEKLY_FOODS } from "@/lib/analyzer/builder-foods";
import { analyze } from "@/lib/analyzer/engine";
import { presetsToSupplements } from "@/lib/analyzer/supplement-presets";
import type { NutrientId, ParsedFood, Profile } from "@/lib/analyzer/types";
import { EMPTY_DRAFT, Quiz, type Draft } from "./quiz";
import { Report } from "./report";
import { Teaser } from "./teaser";

const LB_TO_KG = 0.453592;
const IN_TO_CM = 2.54;
const DRAFT_KEY = "cs-analyzer-draft-v3";
const SUPPS_KEY = "cs-analyzer-supps-v1";

function toNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function profileFrom(draft: Draft): Profile {
  const metric = draft.units === "metric";
  const weight = toNumber(draft.weight, metric ? 80 : 176);
  const heightCm = metric
    ? toNumber(draft.heightCm, 175)
    : (toNumber(draft.heightFt, 5) * 12 + toNumber(draft.heightIn, 9)) * IN_TO_CM;
  return {
    sex: draft.sex,
    age: Math.round(toNumber(draft.age, 35)),
    weightKg: metric ? weight : weight * LB_TO_KG,
    heightCm,
    activity: draft.activity,
    goal: draft.goal,
    tenure: draft.tenure,
    saltType: draft.saltType,
    saltGramsPerDay: toNumber(draft.saltGrams, 6),
    symptoms: draft.symptoms,
    alcohol: draft.alcohol,
  };
}

/**
 * Structured picks straight to ParsedFood — no model, no network, no parse
 * ambiguity. Weekly picks average across seven days exactly like the old
 * prompt instructed the model to do, except now it is arithmetic.
 */
function foodsFrom(draft: Draft): ParsedFood[] {
  const foods: ParsedFood[] = [];
  for (const [slug, grams] of Object.entries(draft.daily)) {
    if (!FOOD_BY_SLUG[slug] || !grams) continue;
    foods.push({ slug, label: FOOD_BY_SLUG[slug].label, gramsPerDay: grams, source: "daily" });
  }
  for (const [slug, times] of Object.entries(draft.weekly)) {
    const spec = WEEKLY_FOODS.find((f) => f.slug === slug);
    if (!spec || !FOOD_BY_SLUG[slug] || !times) continue;
    foods.push({
      slug,
      label: FOOD_BY_SLUG[slug].label,
      gramsPerDay: (spec.portionGrams * times) / 7,
      source: `${times}x/week`,
    });
  }
  return foods;
}

/** A short beat of theatre. Instant results read as shallow; ~2.5s reads as work. */
const STAGES = [
  "Reading your answers",
  "Summing 27 nutrients from the food table",
  "Scoring against your targets",
  "Building your protocol",
];

function Calculating() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 620);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="animate-in fade-in py-10 text-center duration-300" role="status">
      <div className="mx-auto flex max-w-[360px] flex-col items-center rounded-2xl border border-line bg-card p-7 shadow-[0_1px_3px_rgba(33,26,18,0.05)]">
        <span
          aria-hidden="true"
          className="size-[10px] animate-pulse-soft rounded-full bg-walnut motion-reduce:animate-none"
        />
        <p className="mt-4 text-[15px] font-bold text-ink">{STAGES[stage]}&hellip;</p>
        <div className="mt-4 h-[4px] w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-cta transition-[width] duration-500"
            style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
          />
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-mute">
          Computed from a USDA composition table against published reference intakes — no model
          guesses a number here.
        </p>
      </div>
    </div>
  );
}

type Phase = "quiz" | "calculating" | "teaser" | "report";

export function Analyzer() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [phase, setPhase] = useState<Phase>("quiz");
  const [supps, setSupps] = useState<Partial<Record<NutrientId, boolean>>>({});
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft({ ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<Draft>) });
      }
      const rawSupps = window.localStorage.getItem(SUPPS_KEY);
      if (rawSupps) setSupps(JSON.parse(rawSupps) as Partial<Record<NutrientId, boolean>>);
    } catch {
      /* storage unavailable — the quiz still works, it just forgets */
    }
  }, []);

  useEffect(() => {
    if (draft === EMPTY_DRAFT) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ditto */
    }
  }, [draft]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SUPPS_KEY, JSON.stringify(supps));
    } catch {
      /* ditto */
    }
  }, [supps]);

  useEffect(() => {
    if (phase === "teaser" || phase === "report") {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [phase]);

  // Everything below runs in the browser: same engine, same tables, zero
  // network. Recomputes live when a supplement toggle flips.
  const profile = useMemo(() => profileFrom(draft), [draft]);
  const parsed = useMemo(() => foodsFrom(draft), [draft]);

  const baseAssessment = useMemo(
    () => (phase === "quiz" ? null : analyze(profile, parsed)),
    [phase, profile, parsed],
  );
  const assessment = useMemo(
    () => (phase === "quiz" ? null : analyze(profile, parsed, presetsToSupplements(supps))),
    [phase, profile, parsed, supps],
  );

  function complete(finalDraft: Draft) {
    setDraft(finalDraft);
    setPhase("calculating");
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => setPhase("teaser"), 2600);
  }

  if (phase === "calculating") return <Calculating />;

  if (phase === "teaser" && assessment) {
    return (
      <div ref={resultRef}>
        <Teaser assessment={assessment} onReveal={() => setPhase("report")} />
      </div>
    );
  }

  if (phase === "report" && assessment && baseAssessment) {
    return (
      <div ref={resultRef}>
        <Report
          assessment={assessment}
          baseGapIds={baseAssessment.nutrients
            .filter((n) => n.band !== "adequate")
            .map((n) => n.id)}
          supps={supps}
          onToggleSupp={(id) => setSupps((s) => ({ ...s, [id]: !s[id] }))}
          onRestart={() => {
            setPhase("quiz");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    );
  }

  return <Quiz draft={draft} onChange={setDraft} onComplete={complete} />;
}
