"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisReport } from "@/lib/analyzer/types";
import { Quiz, type Draft } from "./quiz";
import { Report } from "./report";

const LB_TO_KG = 0.453592;
const IN_TO_CM = 2.54;

function toNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPayload(draft: Draft) {
  const metric = draft.units === "metric";
  const weight = toNumber(draft.weight, metric ? 80 : 176);
  const height = toNumber(draft.height, metric ? 175 : 69);
  return {
    sex: draft.sex,
    age: Math.round(toNumber(draft.age, 35)),
    weightKg: metric ? weight : weight * LB_TO_KG,
    heightCm: metric ? height : height * IN_TO_CM,
    activity: draft.activity,
    goal: draft.goal,
    tenure: draft.tenure,
    saltType: draft.saltType,
    saltGramsPerDay: toNumber(draft.saltGrams, 6),
    symptoms: draft.symptoms,
    otherSymptoms: draft.otherSymptoms,
    supplements: draft.supplements,
    dietText: draft.dietText,
  };
}

/** Shown while two model calls run back to back — around ten seconds. */
const STAGES = [
  "Reading what you eat",
  "Matching it to the food table",
  "Running the numbers",
  "Writing it up",
];

function Working() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 3200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="border border-edge border-l-[3px] border-l-ember bg-smoke p-5" role="status">
      <div className="flex items-center gap-2.5 text-[11px] tracking-[0.18em] text-salt uppercase">
        <span
          aria-hidden="true"
          className="size-[7px] flex-none animate-ember rounded-full bg-ember shadow-[0_0_8px_var(--color-ember)] motion-reduce:animate-none"
        />
        {STAGES[stage]}
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-salt">
        The vitamin and mineral figures are computed here, not guessed by a model &mdash; so this
        takes a few seconds longer than a chatbot would, and gives the same answer twice.
      </p>
    </div>
  );
}

export function Analyzer() {
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (report) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [report]);

  async function run(draft: Draft) {
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(draft)),
      });
      const data = (await response.json()) as AnalysisReport & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setReport(data);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (report) {
    return (
      <div ref={resultRef}>
        <Report report={report} onRestart={() => setReport(null)} />
      </div>
    );
  }

  return (
    <div>
      {pending ? <Working /> : null}
      <div className={pending ? "mt-5 opacity-40" : undefined} aria-busy={pending}>
        <Quiz onSubmit={run} pending={pending} error={error} />
      </div>
    </div>
  );
}
