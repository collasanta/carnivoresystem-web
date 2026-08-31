"use client";

import { useEffect, useRef, useState } from "react";
import { RED_FLAGS } from "@/lib/analyzer/redflags";
import { SYMPTOMS } from "@/lib/analyzer/symptoms";
import type { Activity, Goal, SaltType, Sex, Tenure } from "@/lib/analyzer/types";
import { cn } from "@/lib/utils";
import { ChoiceGroup, Label, TextArea, TextInput, Toggle } from "./fields";

export interface Draft {
  sex: Sex;
  age: string;
  weight: string;
  height: string;
  units: "metric" | "imperial";
  activity: Activity;
  goal: Goal;
  tenure: Tenure;
  saltType: SaltType;
  saltGrams: string;
  dietText: string;
  symptoms: string[];
  otherSymptoms: string;
  supplements: string;
}

export const EMPTY_DRAFT: Draft = {
  sex: "male",
  age: "",
  weight: "",
  height: "",
  units: "metric",
  activity: "moderate",
  goal: "maintain",
  tenure: "1to3m",
  saltType: "unknown",
  saltGrams: "6",
  dietText: "",
  symptoms: [],
  otherSymptoms: "",
  supplements: "",
};

const STEPS = ["Body", "Context", "Your food", "Symptoms", "Supplements"] as const;

const EXAMPLE = `Two meals a day. 500g ribeye for lunch, 400g of ground beef with three eggs for dinner. Butter on most things. Beef liver maybe once a fortnight. No fish. Coffee in the morning.`;

export function Quiz({
  onSubmit,
  pending,
  error,
}: {
  onSubmit: (draft: Draft) => void;
  pending: boolean;
  error?: string;
}) {
  const [step, setStep] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Steps vary a lot in height, so advancing can leave the new panel below the
  // fold with an empty screen above it. Skipped on mount so the page does not
  // yank itself downward before anyone has interacted with it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [step]);

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const metric = draft.units === "metric";
  const dietReady = draft.dietText.trim().length >= 10;
  const canAdvance = step === 2 ? dietReady : true;

  function toggleSymptom(id: string) {
    setDraft((d) => ({
      ...d,
      symptoms: d.symptoms.includes(id)
        ? d.symptoms.filter((s) => s !== id)
        : [...d.symptoms, id],
    }));
  }

  return (
    <div>
      <ol className="mb-6 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] tracking-[0.16em] uppercase">
        {STEPS.map((name, index) => (
          <li
            key={name}
            aria-current={index === step ? "step" : undefined}
            className={cn(
              index === step ? "text-ember" : index < step ? "text-bone" : "text-ash",
            )}
          >
            {String(index + 1).padStart(2, "0")} {name}
          </li>
        ))}
      </ol>

      <div
        ref={panelRef}
        className="border border-edge border-l-[3px] border-l-blood bg-smoke p-4 sm:p-5"
      >
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <ChoiceGroup
              legend="Sex"
              value={draft.sex}
              onChange={(v) => set("sex", v)}
              choices={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ]}
            />
            <p className="-mt-2 text-[11px] leading-relaxed text-salt">
              This changes more than the calorie maths. Iron reverses direction: it is an
              accumulation risk for men and post-menopausal women, and a shortfall risk while
              menstruating.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="age">Age</Label>
                <TextInput
                  id="age"
                  inputMode="numeric"
                  placeholder="35"
                  value={draft.age}
                  onChange={(e) => set("age", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="weight">Weight ({metric ? "kg" : "lb"})</Label>
                <TextInput
                  id="weight"
                  inputMode="decimal"
                  placeholder={metric ? "82" : "180"}
                  value={draft.weight}
                  onChange={(e) => set("weight", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="height">Height ({metric ? "cm" : "inches"})</Label>
                <TextInput
                  id="height"
                  inputMode="decimal"
                  placeholder={metric ? "180" : "71"}
                  value={draft.height}
                  onChange={(e) => set("height", e.target.value)}
                />
              </div>
              <div>
                <Label>Units</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Toggle pressed={metric} onToggle={() => set("units", "metric")}>
                    Metric
                  </Toggle>
                  <Toggle pressed={!metric} onToggle={() => set("units", "imperial")}>
                    Imperial
                  </Toggle>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-5">
            <ChoiceGroup
              legend="Activity"
              columns={3}
              value={draft.activity}
              onChange={(v) => set("activity", v)}
              choices={[
                { value: "sedentary", label: "Sedentary" },
                { value: "light", label: "Light" },
                { value: "moderate", label: "Moderate" },
                { value: "heavy", label: "Heavy" },
                { value: "athlete", label: "Athlete" },
              ]}
            />
            <ChoiceGroup
              legend="Goal"
              columns={3}
              value={draft.goal}
              onChange={(v) => set("goal", v)}
              choices={[
                { value: "lose", label: "Lose fat" },
                { value: "maintain", label: "Maintain" },
                { value: "gain", label: "Build" },
              ]}
            />
            <div>
              <ChoiceGroup
                legend="How long carnivore"
                value={draft.tenure}
                onChange={(v) => set("tenure", v)}
                choices={[
                  { value: "under1m", label: "Under a month" },
                  { value: "1to3m", label: "1–3 months" },
                  { value: "3to12m", label: "3–12 months" },
                  { value: "over1y", label: "Over a year" },
                ]}
              />
              <p className="mt-2 text-[11px] leading-relaxed text-salt">
                Deficiencies arrive on wildly different clocks. Electrolytes bite in the first
                week; folate takes three months; calcium is measured in years.
              </p>
            </div>
            <div>
              <ChoiceGroup
                legend="Which salt"
                value={draft.saltType}
                onChange={(v) => set("saltType", v)}
                choices={[
                  { value: "pink", label: "Pink / Himalayan" },
                  { value: "sea", label: "Sea salt" },
                  { value: "iodized", label: "Iodised table salt" },
                  { value: "unknown", label: "Not sure" },
                ]}
              />
              <p className="mt-2 text-[11px] leading-relaxed text-salt">
                The highest-leverage question here. Iodised salt averages 52mcg of iodine per
                gram; non-iodised sea salt averages 0.015. Switching one for the other quietly
                removes your only reliable source.
              </p>
            </div>
            <div>
              <Label htmlFor="salt">Added salt per day (grams)</Label>
              <TextInput
                id="salt"
                inputMode="decimal"
                placeholder="6"
                value={draft.saltGrams}
                onChange={(e) => set("saltGrams", e.target.value)}
              />
              <p className="mt-2 text-[11px] leading-relaxed text-salt">
                A rounded teaspoon is about 6g. Guess if you have to — a guess is far better than
                leaving it out.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <Label htmlFor="diet">What do you eat on a normal day?</Label>
            <p className="-mt-1 text-[11px] leading-relaxed text-salt">
              Plain sentences. Name the cuts, rough weights, and how often for anything you eat
              weekly rather than daily — &ldquo;liver once a fortnight&rdquo; is exactly the kind
              of detail that changes the result.
            </p>
            <TextArea
              id="diet"
              rows={8}
              placeholder={EXAMPLE}
              value={draft.dietText}
              onChange={(e) => set("dietText", e.target.value)}
            />
            <div className="flex items-center justify-between gap-3 text-[11px] text-salt">
              <button
                type="button"
                onClick={() => set("dietText", EXAMPLE)}
                className="underline underline-offset-4 hover:text-ember focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
              >
                Use an example
              </button>
              <span>{draft.dietText.trim().length}/4000</span>
            </div>
            {!dietReady && draft.dietText.length > 0 && (
              <p className="text-[11px] text-warn">A little more detail than that.</p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-5">
            <div>
              <Label>Anything you have been feeling</Label>
              <p className="mb-2.5 text-[11px] leading-relaxed text-salt">
                Recorded either way. Where a symptom lines up with something the numbers already
                flagged, the report says so — and where it does not, it says that too.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SYMPTOMS.map((symptom) => (
                  <Toggle
                    key={symptom.id}
                    pressed={draft.symptoms.includes(symptom.id)}
                    onToggle={() => toggleSymptom(symptom.id)}
                  >
                    {symptom.label}
                  </Toggle>
                ))}
              </div>
            </div>

            <div className="border border-ember/40 bg-ember/[0.04] p-3.5">
              <Label>Any of these?</Label>
              <p className="mb-2.5 text-[11px] leading-relaxed text-salt">
                These are not diet problems. If you tick one, the report will say so at the top
                and will not offer you a nutrient to chase instead.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {RED_FLAGS.map((flag) => (
                  <Toggle
                    key={flag.id}
                    pressed={draft.symptoms.includes(flag.id)}
                    onToggle={() => toggleSymptom(flag.id)}
                  >
                    {flag.label}
                  </Toggle>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="other">Anything else</Label>
              <TextArea
                id="other"
                rows={3}
                placeholder="Optional."
                value={draft.otherSymptoms}
                onChange={(e) => set("otherSymptoms", e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-3">
            <Label htmlFor="supps">What are you already taking?</Label>
            <p className="-mt-1 text-[11px] leading-relaxed text-salt">
              Without this the report will hand you back things you already take, which is a fast
              way to make a good analysis look careless. Write &ldquo;none&rdquo; if that is the
              answer.
            </p>
            <TextArea
              id="supps"
              rows={4}
              placeholder="Magnesium glycinate 400mg at night, vitamin D 4000 IU, electrolytes."
              value={draft.supplements}
              onChange={(e) => set("supplements", e.target.value)}
            />
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[12px] text-ember">
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || pending}
          className="text-[11px] tracking-[0.16em] text-salt uppercase underline-offset-4 hover:text-ember hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:invisible"
        >
          &larr; Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance}
            className="border border-ember bg-ember px-6 py-3 font-display text-[12px] tracking-[0.14em] whitespace-nowrap text-char uppercase transition-colors duration-150 hover:bg-blood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-50"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSubmit(draft)}
            disabled={pending || !dietReady}
            className="border border-ember bg-ember px-6 py-3 font-display text-[12px] tracking-[0.14em] whitespace-nowrap text-char uppercase transition-colors duration-150 hover:bg-blood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-60"
          >
            {pending ? "Analysing…" : "Analyse my diet"}
          </button>
        )}
      </div>
    </div>
  );
}
