"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisReport } from "@/lib/analyzer/types";
import { EMPTY_DRAFT, Quiz, type Draft } from "./quiz";
import { Report } from "./report";

const LB_TO_KG = 0.453592;
const IN_TO_CM = 2.54;
const DRAFT_KEY = "cs-analyzer-draft-v2";

function toNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPayload(draft: Draft) {
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
    otherSymptoms: draft.otherSymptoms,
    supplements: draft.takesSupplements === "yes" ? draft.supplements : "",
    offDays: draft.hadOffDays === "yes" ? draft.offDays : "",
    alcohol: draft.alcohol,
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
    <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(33,26,18,0.04)]" role="status">
      <div className="flex items-center gap-2.5 text-[11px] font-semibold tracking-[0.14em] text-mute uppercase">
        <span
          aria-hidden="true"
          className="size-[7px] flex-none animate-pulse-soft rounded-full bg-walnut motion-reduce:animate-none"
        />
        {STAGES[stage]}
      </div>
      <p className="mt-3 text-[12.5px] leading-relaxed text-mute">
        The vitamin and mineral figures are computed here, not guessed by a model &mdash; so this
        takes a few seconds longer than a chatbot would, and gives the same answer twice.
      </p>
    </div>
  );
}

export function Analyzer() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const resultRef = useRef<HTMLDivElement>(null);

  // The draft outlives the component: a refresh mid-quiz, or "edit and re-run"
  // after a report, both come back with every answer intact. localStorage can
  // throw (private windows, blocked storage), so every touch is guarded and the
  // quiz works identically with no storage at all.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      // Deliberate one-time synchronous setState: reading localStorage during
      // render would mismatch the server HTML, so the saved draft has to land
      // in a post-hydration effect. It runs once and cannot cascade.
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Draft>;
        const merged = { ...EMPTY_DRAFT, ...saved };
        // Drafts saved before the yes/no gates existed carry text but no
        // answer; infer "yes" so the text is not silently dropped.
        if (!saved.takesSupplements && merged.supplements.trim()) merged.takesSupplements = "yes";
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraft(merged);
      }
    } catch {
      /* storage unavailable — the quiz still works, it just forgets */
    }
  }, []);

  useEffect(() => {
    // Identity check, not a flag: the mount render still holds the literal
    // EMPTY_DRAFT object, and saving it would race the load effect and wipe a
    // stored draft before it is applied (StrictMode's double-invoke makes this
    // a certainty in dev). Any real change — restored or typed — replaces the
    // object, and only those writes reach storage.
    if (draft === EMPTY_DRAFT) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* ditto */
    }
  }, [draft]);

  useEffect(() => {
    if (report) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [report]);

  async function run() {
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
        <Quiz draft={draft} onChange={setDraft} onSubmit={run} pending={pending} error={error} />
      </div>
    </div>
  );
}
