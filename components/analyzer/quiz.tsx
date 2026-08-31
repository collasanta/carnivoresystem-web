"use client";

import { useEffect, useRef, useState } from "react";
import { RED_FLAGS } from "@/lib/analyzer/redflags";
import { SYMPTOMS } from "@/lib/analyzer/symptoms";
import type { Activity, AlcoholLevel, Goal, SaltType, Sex, Tenure } from "@/lib/analyzer/types";
import { cn } from "@/lib/utils";
import { ChoiceGroup, Label, TextArea, TextInput, Toggle } from "./fields";

/**
 * The draft lives in the PARENT, not here. The natural loop of this tool is
 * "tweak one food and run it again", and keeping state here meant a re-run
 * threw away all five steps. The parent also persists it to localStorage, so a
 * refresh mid-quiz costs nothing either.
 */
export interface Draft {
  sex: Sex;
  age: string;
  weight: string;
  heightCm: string;
  heightFt: string;
  heightIn: string;
  units: "metric" | "imperial";
  activity: Activity;
  goal: Goal;
  tenure: Tenure;
  saltType: SaltType;
  saltGrams: string;
  dietText: string;
  symptoms: string[];
  otherSymptoms: string;
  takesSupplements: "yes" | "no";
  supplements: string;
  hadOffDays: "yes" | "no";
  offDays: string;
  alcohol: AlcoholLevel;
}

export const EMPTY_DRAFT: Draft = {
  sex: "male",
  age: "",
  weight: "",
  heightCm: "",
  heightFt: "",
  heightIn: "",
  units: "metric",
  activity: "moderate",
  goal: "maintain",
  tenure: "1to3m",
  saltType: "unknown",
  saltGrams: "6",
  dietText: "",
  symptoms: [],
  otherSymptoms: "",
  takesSupplements: "no",
  supplements: "",
  hadOffDays: "no",
  offDays: "",
  alcohol: "none",
};

const STEPS = ["Body", "Context", "Your food", "Symptoms", "Lifestyle"] as const;

const EXAMPLE = `Two meals a day. 500g ribeye for lunch, 400g of ground beef with three eggs for dinner. Butter on most things. Beef liver maybe once a fortnight. No fish. Coffee in the morning.`;

const num = (value: string): number | null => {
  const n = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export function Quiz({
  draft,
  onChange,
  onSubmit,
  pending,
  error,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  onSubmit: () => void;
  pending: boolean;
  error?: string;
}) {
  const [step, setStep] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Steps vary a lot in height, so advancing can leave the new panel below the
  // fold. Skipped on mount so the page does not yank itself downward.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [step]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    onChange({ ...draft, [key]: value });

  /** Switching units converts what is already typed instead of discarding it. */
  function switchUnits(next: "metric" | "imperial") {
    if (next === draft.units) return;
    const d: Draft = { ...draft, units: next };
    if (next === "imperial") {
      const kg = num(draft.weight);
      if (kg !== null) d.weight = String(Math.round(kg * 2.20462));
      const cm = num(draft.heightCm);
      if (cm !== null) {
        const inchesTotal = cm / 2.54;
        let ft = Math.floor(inchesTotal / 12);
        let inch = Math.round(inchesTotal % 12);
        if (inch === 12) {
          ft += 1;
          inch = 0;
        }
        d.heightFt = String(ft);
        d.heightIn = String(inch);
      }
    } else {
      const lb = num(draft.weight);
      if (lb !== null) d.weight = String(Math.round(lb * 0.453592));
      const ft = num(draft.heightFt);
      const inch = num(draft.heightIn);
      if (ft !== null || inch !== null) {
        d.heightCm = String(Math.round(((ft ?? 0) * 12 + (inch ?? 0)) * 2.54));
      }
    }
    onChange(d);
  }

  const metric = draft.units === "metric";
  const dietReady = draft.dietText.trim().length >= 10;
  const canAdvance = step === 2 ? dietReady : true;

  function toggleSymptom(id: string) {
    onChange({
      ...draft,
      symptoms: draft.symptoms.includes(id)
        ? draft.symptoms.filter((s) => s !== id)
        : [...draft.symptoms, id],
    });
  }

  return (
    <div>
      <ol className="mb-6 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] tracking-[0.16em] uppercase">
        {STEPS.map((name, index) => (
          <li key={name}>
            <button
              type="button"
              onClick={() => index < step && setStep(index)}
              aria-current={index === step ? "step" : undefined}
              className={cn(
                index === step ? "text-ember" : index < step ? "text-bone" : "text-ash",
                index < step &&
                  "cursor-pointer underline-offset-4 hover:text-ember hover:underline",
                "uppercase tracking-[0.16em] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
              )}
              disabled={index >= step}
            >
              {String(index + 1).padStart(2, "0")} {name}
            </button>
          </li>
        ))}
      </ol>

      <div
        ref={panelRef}
        className="border border-edge border-l-[3px] border-l-blood bg-smoke p-4 sm:p-5"
      >
        {step === 0 && (
          <div className="flex flex-col gap-5">
            <div>
              <Label>Units</Label>
              <div className="grid max-w-[280px] grid-cols-2 gap-2">
                <Toggle pressed={metric} onToggle={() => switchUnits("metric")}>
                  kg / cm
                </Toggle>
                <Toggle pressed={!metric} onToggle={() => switchUnits("imperial")}>
                  lb / ft-in
                </Toggle>
              </div>
            </div>

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

            {metric ? (
              <div>
                <Label htmlFor="height">Height (cm)</Label>
                <TextInput
                  id="height"
                  inputMode="decimal"
                  placeholder="180"
                  value={draft.heightCm}
                  onChange={(e) => set("heightCm", e.target.value)}
                  className="max-w-[200px]"
                />
              </div>
            ) : (
              <div>
                <Label>Height</Label>
                <div className="grid max-w-[280px] grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <TextInput
                      aria-label="Feet"
                      inputMode="numeric"
                      placeholder="5"
                      value={draft.heightFt}
                      onChange={(e) => set("heightFt", e.target.value)}
                    />
                    <span className="text-[11px] text-salt">ft</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TextInput
                      aria-label="Inches"
                      inputMode="numeric"
                      placeholder="11"
                      value={draft.heightIn}
                      onChange={(e) => set("heightIn", e.target.value)}
                    />
                    <span className="text-[11px] text-salt">in</span>
                  </div>
                </div>
              </div>
            )}
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
                className="max-w-[200px]"
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
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <ChoiceGroup
                legend="Do you take any supplements?"
                value={draft.takesSupplements}
                onChange={(v) => set("takesSupplements", v)}
                choices={[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Yes" },
                ]}
              />
              {draft.takesSupplements === "yes" && (
                <>
                  <Label htmlFor="supps">What, and how much?</Label>
                  <p className="-mt-1 text-[11px] leading-relaxed text-salt">
                    Quote the label &mdash; &ldquo;magnesium glycinate 400mg&rdquo;, &ldquo;D3
                    5000 IU&rdquo;. Anything with a stated amount is counted into your numbers;
                    a &ldquo;multivitamin&rdquo; with no amounts can only be noted, not counted.
                  </p>
                  <TextArea
                    id="supps"
                    rows={4}
                    placeholder="Magnesium glycinate 400mg at night, vitamin D 5000 IU, LMNT most mornings."
                    value={draft.supplements}
                    onChange={(e) => set("supplements", e.target.value)}
                  />
                </>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-edge pt-5">
              <ChoiceGroup
                legend="Any cheat meals or time off the diet?"
                value={draft.hadOffDays}
                onChange={(v) => set("hadOffDays", v)}
                choices={[
                  { value: "no", label: "No, strict" },
                  { value: "yes", label: "Yes" },
                ]}
              />
              {draft.hadOffDays === "yes" && (
                <>
                  <Label htmlFor="offdays">Roughly what and how often?</Label>
                  <p className="-mt-1 text-[11px] leading-relaxed text-salt">
                    &ldquo;Pizza most Saturdays&rdquo;, &ldquo;two weeks off over the
                    holidays&rdquo;. This is context for reading your symptoms and timeline
                    &mdash; a weekly carb night changes what &ldquo;three months strict&rdquo;
                    means. It is not added to the daily numbers.
                  </p>
                  <TextArea
                    id="offdays"
                    rows={3}
                    placeholder="A burger with the bun maybe twice a month. One week fully off in July."
                    value={draft.offDays}
                    onChange={(e) => set("offDays", e.target.value)}
                  />
                </>
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-edge pt-5">
              <ChoiceGroup
                legend="Alcohol?"
                value={draft.alcohol === "none" ? "no" : "yes"}
                onChange={(v) => set("alcohol", v === "no" ? "none" : "occasional")}
                choices={[
                  { value: "no", label: "No" },
                  { value: "yes", label: "Yes" },
                ]}
              />
              {draft.alcohol !== "none" && (
                <div>
                  <ChoiceGroup
                    legend="How much, honestly"
                    value={draft.alcohol}
                    onChange={(v) => set("alcohol", v)}
                    choices={[
                      { value: "occasional", label: "A few a month" },
                      { value: "weekly", label: "A few a week" },
                      { value: "daily", label: "1–2 most days" },
                      { value: "heavy", label: "3+ most days" },
                    ]}
                  />
                  <p className="mt-2 text-[11px] leading-relaxed text-salt">
                    Not a judgement question. Alcohol drains exactly what this diet is shortest
                    on &mdash; magnesium, zinc, B1 &mdash; so the report reads differently at
                    &ldquo;most days&rdquo; than at &ldquo;a few a month&rdquo;.
                  </p>
                </div>
              )}
            </div>

            <p className="border-t border-edge pt-4 text-[11px] leading-relaxed text-salt">
              Your answers are processed to build this report and are not stored. No account, no
              email, nothing to unsubscribe from.
            </p>
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
            onClick={onSubmit}
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
