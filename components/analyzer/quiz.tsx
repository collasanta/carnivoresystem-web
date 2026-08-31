"use client";

import { useEffect, useRef, useState } from "react";
import { RED_FLAGS } from "@/lib/analyzer/redflags";
import { SYMPTOMS } from "@/lib/analyzer/symptoms";
import type { Activity, AlcoholLevel, Goal, SaltType, Sex, Tenure } from "@/lib/analyzer/types";
import { cn } from "@/lib/utils";

/**
 * One question per screen, quiz-funnel style: single choices auto-advance,
 * multi-selects and inputs gate a pinned CTA, sections fill a segmented
 * progress bar. The structure borrows from the best-converting quiz funnels;
 * the skin stays butcher paper.
 *
 * The draft still lives in the PARENT and persists to localStorage there, so a
 * refresh or an "edit and re-run" keeps every answer.
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

const SECTIONS = ["Body", "Context", "Your food", "Symptoms", "Lifestyle"] as const;

interface Screen {
  id: string;
  section: number;
  skip?: (draft: Draft) => boolean;
}

const SCREENS: Screen[] = [
  { id: "sex", section: 0 },
  { id: "age", section: 0 },
  { id: "height", section: 0 },
  { id: "weight", section: 0 },
  { id: "activity", section: 1 },
  { id: "goal", section: 1 },
  { id: "tenure", section: 1 },
  { id: "salt-type", section: 1 },
  { id: "salt-amount", section: 1 },
  { id: "trust", section: 2 },
  { id: "diet", section: 2 },
  { id: "symptoms", section: 3 },
  { id: "redflags", section: 3 },
  { id: "supp-gate", section: 4 },
  { id: "supp-text", section: 4, skip: (d) => d.takesSupplements !== "yes" },
  { id: "offdays-gate", section: 4 },
  { id: "offdays-text", section: 4, skip: (d) => d.hadOffDays !== "yes" },
  { id: "alcohol-gate", section: 4 },
  { id: "alcohol-amount", section: 4, skip: (d) => d.alcohol === "none" },
  { id: "review", section: 4 },
];

const EXAMPLE = `Two meals a day. 500g ribeye for lunch, 400g of ground beef with three eggs for dinner. Butter on most things. Beef liver maybe once a fortnight. No fish. Coffee in the morning.`;

const num = (value: string): number | null => {
  const n = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const inRange = (value: string, min: number, max: number): boolean => {
  const n = num(value);
  return n !== null && n >= min && n <= max;
};

/* ---------------------------------------------------------------- pieces -- */

function QuestionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <header className="mb-6 text-center">
      <h2 className="text-[clamp(20px,5.5vw,26px)] leading-[1.15] font-extrabold tracking-[-0.02em] text-balance">
        {children}
      </h2>
      {sub && <p className="mx-auto mt-2.5 max-w-[400px] text-[12.5px] leading-relaxed text-mute">{sub}</p>}
    </header>
  );
}

/** A full-width answer card with a stamp-style indicator square. */
function OptionCard({
  selected,
  onClick,
  children,
  hint,
  multi,
  tone,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  hint?: string;
  multi?: boolean;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-2xl border bg-card py-4 pr-4 pl-4 text-left shadow-[0_1px_2px_rgba(33,26,18,0.04)] transition-[border-color,background-color,box-shadow] duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
        selected
          ? tone === "danger"
            ? "border-bad shadow-[0_0_0_1px_var(--color-bad)]"
            : "border-cta shadow-[0_0_0_1px_var(--color-cta)]"
          : tone === "danger"
            ? "border-bad/30 hover:border-bad/60"
            : "border-line hover:border-linex hover:shadow-[0_3px_10px_rgba(33,26,18,0.06)]",
      )}
    >
      <span className="flex-1">
        <span className={cn("block text-[14px] leading-snug text-ink", selected && "font-bold")}>
          {children}
        </span>
        {hint && <span className="mt-0.5 block text-[11.5px] leading-relaxed text-mute">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-[19px] flex-none items-center justify-center border-[1.5px]",
          multi ? "rounded-[6px]" : "rounded-full",
          selected
            ? tone === "danger"
              ? "border-bad bg-bad"
              : "border-cta bg-cta"
            : "border-faint bg-card",
        )}
      >
        {selected && (
          <span className={cn("block bg-card", multi ? "size-[8px] rounded-[2px]" : "size-[8px] rounded-full")} />
        )}
      </span>
    </button>
  );
}

function BigInput({
  value,
  onChange,
  unit,
  placeholder,
  autoFocus,
  onEnter,
}: {
  value: string;
  onChange: (value: string) => void;
  unit: string;
  placeholder: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  return (
    <div className="flex items-baseline justify-center gap-2 border-b-2 border-line pb-2 focus-within:border-cta">
      <input
        inputMode="decimal"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        aria-label={placeholder}
        className="w-[130px] bg-transparent text-center text-[38px] font-extrabold tracking-[-0.02em] text-ink outline-none placeholder:text-faint"
      />
      <span className="text-[18px] font-bold text-mute">{unit}</span>
    </div>
  );
}

function UnitPill<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="mx-auto mb-7 flex w-fit rounded-full border border-line bg-card p-[3px]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-4 py-1.5 text-[11px] font-bold tracking-[0.1em] uppercase transition-colors duration-150",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
            option.value === value ? "bg-cta text-card" : "text-mute hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const textAreaClass =
  "w-full min-w-0 resize-y rounded-2xl border border-line bg-card px-4 py-3.5 text-[13.5px] leading-relaxed text-ink shadow-[0_1px_2px_rgba(33,26,18,0.04)] placeholder:text-faint focus:border-cta focus:outline-2 focus:outline-offset-2 focus:outline-cta";

/* ------------------------------------------------------------------ quiz -- */

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
  const [index, setIndex] = useState(0);
  const topRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [index]);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  const screen = SCREENS[index];
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    onChange({ ...draft, [key]: value });

  /** Next non-skipped screen, judged against a draft that may be newer than the prop. */
  function forward(from: number, current: Draft) {
    let next = from + 1;
    while (next < SCREENS.length && SCREENS[next].skip?.(current)) next += 1;
    setIndex(Math.min(next, SCREENS.length - 1));
  }

  function back() {
    let previous = index - 1;
    while (previous > 0 && SCREENS[previous].skip?.(draft)) previous -= 1;
    setIndex(Math.max(previous, 0));
  }

  /** Single-choice select: paint the selection, then advance on a short beat. */
  function choose<K extends keyof Draft>(key: K, value: Draft[K]) {
    const updated = { ...draft, [key]: value };
    onChange(updated);
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(() => forward(index, updated), 260);
  }

  function toggleSymptom(id: string) {
    onChange({
      ...draft,
      symptoms: draft.symptoms.includes(id)
        ? draft.symptoms.filter((s) => s !== id)
        : [...draft.symptoms, id],
    });
  }

  /** "None of these" for a group: clear that group's picks and move on. */
  function clearGroupAndAdvance(ids: string[]) {
    const updated = { ...draft, symptoms: draft.symptoms.filter((s) => !ids.includes(s)) };
    onChange(updated);
    forward(index, updated);
  }

  const metric = draft.units === "metric";

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

  /* ---- validation per screen, gating the CTA -------------------------- */
  const heightValid = metric
    ? inRange(draft.heightCm, 120, 230)
    : inRange(draft.heightFt, 3, 7) &&
      (draft.heightIn === "" || inRange(draft.heightIn, 0, 11));
  const weightValid = metric ? inRange(draft.weight, 35, 300) : inRange(draft.weight, 77, 660);
  const dietReady = draft.dietText.trim().length >= 10;

  const ctaState: Record<string, boolean> = {
    age: inRange(draft.age, 16, 100),
    height: heightValid,
    weight: weightValid,
    "salt-amount": inRange(draft.saltGrams, 0, 60),
    trust: true,
    diet: dietReady,
    symptoms: draft.symptoms.some((s) => SYMPTOMS.some((y) => y.id === s)),
    redflags: draft.symptoms.some((s) => RED_FLAGS.some((f) => f.id === s)),
    "supp-text": true,
    "offdays-text": true,
    review: dietReady,
  };
  const needsCta = screen.id in ctaState;
  const ctaEnabled = ctaState[screen.id];

  /* ---- progress -------------------------------------------------------- */
  const visible = SCREENS.filter((s) => !s.skip?.(draft));
  const visibleIndex = visible.findIndex((s) => s.id === screen.id);
  const sectionFill = SECTIONS.map((_, sectionIndex) => {
    const inSection = visible.filter((s) => s.section === sectionIndex);
    const done = inSection.filter((s) => visible.indexOf(s) < visibleIndex).length;
    const active = screen.section === sectionIndex ? 0.5 : 0;
    return inSection.length ? Math.min(1, (done + active) / inSection.length) : 0;
  });

  const symptomIds = SYMPTOMS.map((s) => s.id);
  const redFlagIds = RED_FLAGS.map((f) => f.id);

  const recap: { label: string; value: string }[] = [
    {
      label: "Body",
      value: `${draft.sex === "male" ? "Male" : "Female"} · ${draft.age || "?"}y · ${
        metric
          ? `${draft.heightCm || "?"}cm · ${draft.weight || "?"}kg`
          : `${draft.heightFt || "?"}'${draft.heightIn || 0}" · ${draft.weight || "?"}lb`
      }`,
    },
    {
      label: "Carnivore for",
      value: { under1m: "Under a month", "1to3m": "1–3 months", "3to12m": "3–12 months", over1y: "Over a year" }[draft.tenure],
    },
    {
      label: "Salt",
      value: `${draft.saltGrams || "?"}g/day · ${
        { iodized: "iodised", pink: "pink", sea: "sea", none: "none", unknown: "unspecified" }[draft.saltType]
      }`,
    },
    { label: "Symptoms", value: String(draft.symptoms.length) || "0" },
    {
      label: "Supplements",
      value: draft.takesSupplements === "yes" ? "Yes" : "No",
    },
    {
      label: "Alcohol",
      value: {
        none: "None",
        occasional: "A few a month",
        weekly: "A few a week",
        daily: "1–2 most days",
        heavy: "3+ most days",
      }[draft.alcohol],
    },
  ];

  return (
    <div ref={topRef}>
      {/* ---- header: back · section · progress -------------------------- */}
      <div className="mb-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          disabled={index === 0 || pending}
          aria-label="Back"
          className="flex size-9 flex-none items-center justify-center rounded-full border border-line bg-card text-ink shadow-[0_1px_2px_rgba(33,26,18,0.04)] transition-colors duration-150 hover:border-linex focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta disabled:invisible"
        >
          &larr;
        </button>
        <span className="text-[10.5px] font-semibold tracking-[0.16em] text-mute uppercase">
          {SECTIONS[screen.section]}
        </span>
        <span className="w-9 flex-none text-right text-[10.5px] font-semibold text-faint">
          {visibleIndex + 1}/{visible.length}
        </span>
      </div>
      <div className="mb-8 flex gap-1" aria-hidden="true">
        {sectionFill.map((fill, i) => (
          <div key={i} className="h-[4px] flex-1 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-cta transition-[width] duration-300" style={{ width: `${fill * 100}%` }} />
          </div>
        ))}
      </div>

      {/* ---- screen ------------------------------------------------------ */}
      <div key={screen.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {screen.id === "sex" && (
          <>
            <QuestionTitle sub="Iron reverses direction with this answer: an accumulation risk for men and post-menopausal women, a shortfall risk while menstruating.">
              What&rsquo;s your sex?
            </QuestionTitle>
            <div className="flex flex-col gap-2.5">
              <OptionCard selected={draft.sex === "male"} onClick={() => choose("sex", "male")}>Male</OptionCard>
              <OptionCard selected={draft.sex === "female"} onClick={() => choose("sex", "female")}>Female</OptionCard>
            </div>
          </>
        )}

        {screen.id === "age" && (
          <>
            <QuestionTitle>How old are you?</QuestionTitle>
            <div className="mx-auto max-w-[300px]">
              <BigInput
                value={draft.age}
                onChange={(v) => set("age", v)}
                unit="years"
                placeholder="35"
                autoFocus
                onEnter={() => ctaEnabled && forward(index, draft)}
              />
              <p className="mt-2 text-center text-[11.5px] text-mute">Please enter a value from 16 to 100</p>
            </div>
          </>
        )}

        {screen.id === "height" && (
          <>
            <QuestionTitle>How tall are you?</QuestionTitle>
            <UnitPill
              value={draft.units}
              onChange={switchUnits}
              options={[
                { value: "imperial", label: "ft" },
                { value: "metric", label: "cm" },
              ]}
            />
            {metric ? (
              <div className="mx-auto max-w-[300px]">
                <BigInput
                  value={draft.heightCm}
                  onChange={(v) => set("heightCm", v)}
                  unit="cm"
                  placeholder="180"
                  onEnter={() => ctaEnabled && forward(index, draft)}
                />
                <p className="mt-2 text-center text-[11.5px] text-mute">Please enter a value from 120 to 230 cm</p>
              </div>
            ) : (
              <div className="mx-auto flex max-w-[340px] items-start justify-center gap-6">
                <div>
                  <BigInput value={draft.heightFt} onChange={(v) => set("heightFt", v)} unit="ft" placeholder="5" />
                </div>
                <div>
                  <BigInput value={draft.heightIn} onChange={(v) => set("heightIn", v)} unit="in" placeholder="11" onEnter={() => ctaEnabled && forward(index, draft)} />
                </div>
              </div>
            )}
          </>
        )}

        {screen.id === "weight" && (
          <>
            <QuestionTitle>What&rsquo;s your current weight?</QuestionTitle>
            <UnitPill
              value={draft.units}
              onChange={switchUnits}
              options={[
                { value: "imperial", label: "lb" },
                { value: "metric", label: "kg" },
              ]}
            />
            <div className="mx-auto max-w-[300px]">
              <BigInput
                value={draft.weight}
                onChange={(v) => set("weight", v)}
                unit={metric ? "kg" : "lb"}
                placeholder={metric ? "82" : "180"}
                onEnter={() => ctaEnabled && forward(index, draft)}
              />
              <p className="mt-2 text-center text-[11.5px] text-mute">
                Please enter a value from {metric ? "35 to 300 kg" : "77 to 660 lb"}
              </p>
            </div>
          </>
        )}

        {screen.id === "activity" && (
          <>
            <QuestionTitle>How active are you?</QuestionTitle>
            <div className="flex flex-col gap-2.5">
              {(
                [
                  ["sedentary", "Mostly sitting", "Desk work, little walking"],
                  ["light", "Lightly active", "On your feet part of the day, or 1–2 workouts a week"],
                  ["moderate", "Moderately active", "3–5 workouts a week"],
                  ["heavy", "Very active", "Hard training most days, or physical work"],
                  ["athlete", "Athlete", "Two-a-days, competition volume"],
                ] as [Activity, string, string][]
              ).map(([value, label, hint]) => (
                <OptionCard key={value} selected={draft.activity === value} onClick={() => choose("activity", value)} hint={hint}>
                  {label}
                </OptionCard>
              ))}
            </div>
          </>
        )}

        {screen.id === "goal" && (
          <>
            <QuestionTitle>What&rsquo;s your main goal?</QuestionTitle>
            <div className="flex flex-col gap-2.5">
              {(
                [
                  ["lose", "Lose fat"],
                  ["maintain", "Maintain and feel good"],
                  ["gain", "Build muscle"],
                ] as [Goal, string][]
              ).map(([value, label]) => (
                <OptionCard key={value} selected={draft.goal === value} onClick={() => choose("goal", value)}>
                  {label}
                </OptionCard>
              ))}
            </div>
          </>
        )}

        {screen.id === "tenure" && (
          <>
            <QuestionTitle sub="Deficiencies arrive on different clocks — electrolytes bite in the first week, folate takes three months, calcium is measured in years.">
              How long have you been carnivore?
            </QuestionTitle>
            <div className="flex flex-col gap-2.5">
              {(
                [
                  ["under1m", "Under a month"],
                  ["1to3m", "1–3 months"],
                  ["3to12m", "3–12 months"],
                  ["over1y", "Over a year"],
                ] as [Tenure, string][]
              ).map(([value, label]) => (
                <OptionCard key={value} selected={draft.tenure === value} onClick={() => choose("tenure", value)}>
                  {label}
                </OptionCard>
              ))}
            </div>
          </>
        )}

        {screen.id === "salt-type" && (
          <>
            <QuestionTitle sub="The highest-leverage question in this quiz. Iodised salt averages 52mcg of iodine per gram; non-iodised sea salt averages 0.015.">
              Which salt do you use?
            </QuestionTitle>
            <div className="flex flex-col gap-2.5">
              {(
                [
                  ["pink", "Pink / Himalayan"],
                  ["sea", "Sea salt"],
                  ["iodized", "Iodised table salt"],
                  ["unknown", "Not sure"],
                ] as [SaltType, string][]
              ).map(([value, label]) => (
                <OptionCard key={value} selected={draft.saltType === value} onClick={() => choose("saltType", value)}>
                  {label}
                </OptionCard>
              ))}
            </div>
          </>
        )}

        {screen.id === "salt-amount" && (
          <>
            <QuestionTitle sub="A rounded teaspoon is about 6g. Guess if you have to — a guess is far better than leaving it out.">
              How much salt do you add per day?
            </QuestionTitle>
            <div className="mx-auto max-w-[300px]">
              <BigInput
                value={draft.saltGrams}
                onChange={(v) => set("saltGrams", v)}
                unit="g"
                placeholder="6"
                onEnter={() => ctaEnabled && forward(index, draft)}
              />
              <p className="mt-2 text-center text-[11.5px] text-mute">Please enter a value from 0 to 60 g</p>
            </div>
          </>
        )}

        {screen.id === "trust" && (
          <div className="text-center">
            <QuestionTitle>Your numbers are computed, not guessed</QuestionTitle>
            <div className="mx-auto max-w-[420px] rounded-2xl border border-line bg-card p-5 text-left shadow-[0_1px_2px_rgba(33,26,18,0.04)]">
              <p className="text-[13.5px] leading-relaxed text-ink">
                Next comes the part that matters — what you actually eat. A model reads your
                description, but every vitamin and mineral figure is computed from a USDA
                composition table against published reference intakes.
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-mute">
                Ask twice, get the same answer. No fibre guilt, no B12 false alarms — this tool is
                built for this diet, and every source is named at the bottom of the page.
              </p>
            </div>
          </div>
        )}

        {screen.id === "diet" && (
          <>
            <QuestionTitle sub="Plain sentences. Name the cuts, rough weights, and how often for anything weekly — “liver once a fortnight” is exactly the detail that changes the result.">
              What do you eat on a normal day?
            </QuestionTitle>
            <textarea
              rows={8}
              autoFocus
              placeholder={EXAMPLE}
              value={draft.dietText}
              onChange={(e) => set("dietText", e.target.value)}
              aria-label="Your daily food"
              className={textAreaClass}
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-[11.5px] text-mute">
              <button
                type="button"
                onClick={() => set("dietText", EXAMPLE)}
                className="font-semibold underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
              >
                Use an example
              </button>
              <span>{draft.dietText.trim().length}/4000</span>
            </div>
          </>
        )}

        {screen.id === "symptoms" && (
          <>
            <QuestionTitle sub="Choose all that apply. Where one lines up with what the numbers flag, the report says so — and where it doesn’t, it says that too.">
              Have you been feeling any of these?
            </QuestionTitle>
            <div className="flex flex-col gap-2">
              {SYMPTOMS.map((symptom) => (
                <OptionCard
                  key={symptom.id}
                  multi
                  selected={draft.symptoms.includes(symptom.id)}
                  onClick={() => toggleSymptom(symptom.id)}
                >
                  {symptom.label}
                </OptionCard>
              ))}
              <button
                type="button"
                onClick={() => clearGroupAndAdvance(symptomIds)}
                className="mt-1 flex w-full items-center justify-center rounded-2xl border border-dashed border-faint bg-card py-4 text-[13px] font-bold text-mute transition-colors duration-150 hover:border-cta hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
              >
                None of these
              </button>
            </div>
          </>
        )}

        {screen.id === "redflags" && (
          <>
            <QuestionTitle sub="These are not diet problems. Tick one and the report will say so at the top instead of offering a nutrient to chase.">
              Any of these, right now?
            </QuestionTitle>
            <div className="flex flex-col gap-2">
              {RED_FLAGS.map((flag) => (
                <OptionCard
                  key={flag.id}
                  multi
                  tone="danger"
                  selected={draft.symptoms.includes(flag.id)}
                  onClick={() => toggleSymptom(flag.id)}
                >
                  {flag.label}
                </OptionCard>
              ))}
              <button
                type="button"
                onClick={() => clearGroupAndAdvance(redFlagIds)}
                className="mt-1 flex w-full items-center justify-center rounded-2xl border border-dashed border-faint bg-card py-4 text-[13px] font-bold text-mute transition-colors duration-150 hover:border-cta hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
              >
                No — none of these
              </button>
            </div>
          </>
        )}

        {screen.id === "supp-gate" && (
          <>
            <QuestionTitle sub="Anything with a stated amount gets counted straight into your numbers.">
              Do you take any supplements?
            </QuestionTitle>
            <div className="flex flex-col gap-2.5">
              <OptionCard selected={draft.takesSupplements === "yes"} onClick={() => choose("takesSupplements", "yes")}>Yes</OptionCard>
              <OptionCard selected={draft.takesSupplements === "no"} onClick={() => choose("takesSupplements", "no")}>No</OptionCard>
            </div>
          </>
        )}

        {screen.id === "supp-text" && (
          <>
            <QuestionTitle sub="Quote the label — “magnesium glycinate 400mg”, “D3 5000 IU”. A “multivitamin” with no amounts can only be noted, not counted.">
              What, and how much?
            </QuestionTitle>
            <textarea
              rows={4}
              autoFocus
              placeholder="Magnesium glycinate 400mg at night, vitamin D 5000 IU, LMNT most mornings."
              value={draft.supplements}
              onChange={(e) => set("supplements", e.target.value)}
              aria-label="Your supplements"
              className={textAreaClass}
            />
          </>
        )}

        {screen.id === "offdays-gate" && (
          <>
            <QuestionTitle sub="Context for reading your symptoms and timeline — it is not added to the daily numbers, and nobody here is judging.">
              Any cheat meals or time off the diet?
            </QuestionTitle>
            <div className="flex flex-col gap-2.5">
              <OptionCard selected={draft.hadOffDays === "yes"} onClick={() => choose("hadOffDays", "yes")}>Yes</OptionCard>
              <OptionCard selected={draft.hadOffDays === "no"} onClick={() => choose("hadOffDays", "no")}>No, strict</OptionCard>
            </div>
          </>
        )}

        {screen.id === "offdays-text" && (
          <>
            <QuestionTitle sub="“Pizza most Saturdays”, “two weeks off over the holidays” — a weekly carb night changes what “three months strict” means.">
              Roughly what, and how often?
            </QuestionTitle>
            <textarea
              rows={3}
              autoFocus
              placeholder="A burger with the bun maybe twice a month. One week fully off in July."
              value={draft.offDays}
              onChange={(e) => set("offDays", e.target.value)}
              aria-label="Your off days"
              className={textAreaClass}
            />
          </>
        )}

        {screen.id === "alcohol-gate" && (
          <>
            <QuestionTitle>Do you drink alcohol?</QuestionTitle>
            <div className="flex flex-col gap-2.5">
              <OptionCard
                selected={draft.alcohol !== "none"}
                onClick={() => choose("alcohol", draft.alcohol === "none" ? "occasional" : draft.alcohol)}
              >
                Yes
              </OptionCard>
              <OptionCard selected={draft.alcohol === "none"} onClick={() => choose("alcohol", "none")}>No</OptionCard>
            </div>
          </>
        )}

        {screen.id === "alcohol-amount" && (
          <>
            <QuestionTitle sub="Not a judgement question. Alcohol drains exactly what this diet is shortest on — magnesium, zinc, B1 — so the report reads differently at “most days” than at “a few a month”.">
              How much, honestly?
            </QuestionTitle>
            <div className="flex flex-col gap-2.5">
              {(
                [
                  ["occasional", "A few a month"],
                  ["weekly", "A few a week"],
                  ["daily", "1–2 most days"],
                  ["heavy", "3+ most days"],
                ] as [AlcoholLevel, string][]
              ).map(([value, label]) => (
                <OptionCard key={value} selected={draft.alcohol === value} onClick={() => choose("alcohol", value)}>
                  {label}
                </OptionCard>
              ))}
            </div>
          </>
        )}

        {screen.id === "review" && (
          <>
            <QuestionTitle sub="Two model calls and a pile of arithmetic — about ten seconds.">
              Ready to run it
            </QuestionTitle>
            <ul className="flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-[0_1px_2px_rgba(33,26,18,0.04)]">
              {recap.map((row) => (
                <li
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 border-b border-line px-4 py-3 last:border-b-0"
                >
                  <span className="text-[10px] font-semibold tracking-[0.16em] text-mute uppercase">{row.label}</span>
                  <span className="text-right text-[12.5px] font-medium text-ink">{row.value}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11.5px] leading-relaxed text-mute">
              Your answers are processed to build the report and are not stored. No account, no
              email. Use the arrow up top to change anything.
            </p>
            {error && (
              <p role="alert" className="mt-3 rounded-2xl border border-bad/40 bg-bad/[0.06] px-4 py-3 text-[12.5px] font-medium text-bad">
                {error}
              </p>
            )}
          </>
        )}
      </div>

      {/* ---- pinned CTA -------------------------------------------------- */}
      {(needsCta || screen.id === "review") && (
        <div className="sticky bottom-0 mt-7 bg-cream/95 py-3 backdrop-blur-sm">
          {screen.id === "review" ? (
            <button
              type="button"
              onClick={onSubmit}
              disabled={pending || !ctaEnabled}
              className="w-full rounded-full bg-cta px-6 py-4 text-[12.5px] font-bold tracking-[0.12em] text-card uppercase shadow-[0_4px_14px_rgba(33,26,18,0.18)] transition-colors duration-150 hover:bg-ctah focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta disabled:opacity-60"
            >
              {pending ? "Analysing…" : "Analyse my diet"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => forward(index, draft)}
              disabled={!ctaEnabled}
              className="w-full rounded-full bg-cta px-6 py-4 text-[12.5px] font-bold tracking-[0.12em] text-card uppercase shadow-[0_4px_14px_rgba(33,26,18,0.18)] transition-colors duration-150 hover:bg-ctah focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta disabled:cursor-not-allowed disabled:bg-line disabled:text-faint disabled:shadow-none"
            >
              {screen.id === "trust" ? "Continue" : "Next step"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
