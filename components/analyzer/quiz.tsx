"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { DAILY_FATS, DAILY_MEATS, WEEKLY_FOODS, type DailyFood, type WeeklyFood } from "@/lib/analyzer/builder-foods";
import { RED_FLAGS } from "@/lib/analyzer/redflags";
import { SYMPTOMS } from "@/lib/analyzer/symptoms";
import type { Activity, AlcoholLevel, Goal, SaltType, Sex, Tenure } from "@/lib/analyzer/types";
import { cn } from "@/lib/utils";

/**
 * The paid-funnel quiz: pain first, zero typing, one question per screen.
 *
 * The free-text diet description is gone — food intake is three screens of
 * tap-and-step, drawn from the same composition table the engine reads. That
 * removes the model from the critical path entirely: parsing is exact, results
 * are instant, and the marginal cost of an analysis is zero.
 *
 * Supplements are deliberately NOT asked here. They live as toggles on the
 * result page, where flipping one recomputes the bars in front of you.
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
  symptoms: string[];
  alcohol: AlcoholLevel;
  /** slug -> grams per day. */
  daily: Record<string, number>;
  /** slug -> times per week (portion fixed per food). */
  weekly: Record<string, number>;
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
  symptoms: [],
  alcohol: "none",
  daily: {},
  weekly: {},
};

const SECTIONS = ["Start", "Symptoms", "Body", "Salt", "Your food"] as const;

interface Screen {
  id: string;
  section: number;
  skip?: (draft: Draft) => boolean;
}

const SCREENS: Screen[] = [
  { id: "sex", section: 0 },
  { id: "tenure", section: 0 },
  { id: "symptoms", section: 1 },
  { id: "redflags", section: 1 },
  { id: "goal", section: 2 },
  { id: "age", section: 2 },
  { id: "height", section: 2 },
  { id: "weight", section: 2 },
  { id: "activity", section: 2 },
  { id: "salt-type", section: 3 },
  { id: "salt-amount", section: 3 },
  { id: "food-meats", section: 4 },
  { id: "food-fats", section: 4 },
  { id: "food-weekly", section: 4 },
  { id: "alcohol-gate", section: 4 },
  { id: "alcohol-amount", section: 4, skip: (d) => d.alcohol === "none" },
];

const num = (value: string): number | null => {
  const n = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const inRange = (value: string, min: number, max: number): boolean => {
  const n = num(value);
  return n !== null && n >= min && n <= max;
};

/* ---------------------------------------------------------------- icons -- */

function Ic({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-[22px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const ICON = {
  couch: <Ic><path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" /><path d="M3 13a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4H3z" /><path d="M5 17v2M19 17v2" /></Ic>,
  walk: <Ic><circle cx="13" cy="4.6" r="1.7" /><path d="M10.2 20l2-5-1.6-3 1-4 2.8 1.4 2 2.6" /><path d="M13.4 14.6L15.8 20" /><path d="M10.6 12l-2.6 2.2" /></Ic>,
  run: <Ic><circle cx="14.6" cy="4.6" r="1.7" /><path d="M8 20l3.2-5.2 1.4-4.4 3.4 1.6 2.8 1" /><path d="M12.6 10.4L9.2 9 7 12" /><path d="M12.2 15.2l2.6 4.8" /><path d="M4 15h2.4M3 18h2.4" /></Ic>,
  dumbbell: <Ic><path d="M7 8.5v7M17 8.5v7M4.2 10.2v3.6M19.8 10.2v3.6M7 12h10" /></Ic>,
  medal: <Ic><circle cx="12" cy="14.4" r="4.1" /><path d="M9 3.5l3 5 3-5" /><path d="M8.5 3.5h7" /></Ic>,
  flame: <Ic><path d="M12 3.5s4.8 4.3 4.8 8.6a4.8 4.8 0 0 1-9.6 0c0-1.9.9-3.6 2.1-5 .4 1.2 1.2 1.9 2.1 2.2-.3-1.9 0-4 .6-5.8z" /></Ic>,
  heart: <Ic><path d="M12 19.6s-6.8-4.4-6.8-9.5a3.9 3.9 0 0 1 6.8-2.5 3.9 3.9 0 0 1 6.8 2.5c0 5.1-6.8 9.5-6.8 9.5z" /></Ic>,
  trophy: <Ic><path d="M8.2 4h7.6v4a3.8 3.8 0 0 1-7.6 0z" /><path d="M8.2 5H5.4a2.8 2.8 0 0 0 2.8 3.8M15.8 5h2.8a2.8 2.8 0 0 1-2.8 3.8" /><path d="M12 11.8v3.4M9.2 19.5h5.6M10.2 15.2h3.6" /></Ic>,
  clock: <Ic><circle cx="12" cy="12" r="8" /><path d="M12 7.4v4.6l3 2" /></Ic>,
  calendar: <Ic><rect x="4" y="6" width="16" height="14" rx="2.5" /><path d="M4 10.5h16M8.5 4v4M15.5 4v4" /></Ic>,
  chart: <Ic><path d="M4 19.5h16" /><path d="M7 19.5v-5M12 19.5v-9M17 19.5V6.5" /></Ic>,
  mountain: <Ic><path d="M3 19L9.4 8l3.9 6.4 2.2-3.4L21 19z" /></Ic>,
  wave: <Ic><path d="M3 11.5c2-2.8 4-2.8 6 0s4 2.8 6 0 4-2.8 6 0" /><path d="M3 16.5c2-2.8 4-2.8 6 0s4 2.8 6 0 4-2.8 6 0" /></Ic>,
  shaker: <Ic><path d="M9.2 9.5h5.6l1 10.5H8.2z" /><path d="M9.7 7a2.3 2.3 0 0 1 4.6 0v2.5H9.7z" /><path d="M11 13.5h.01M13.2 15.5h.01M11.5 17.5h.01" /></Ic>,
  question: <Ic><circle cx="12" cy="12" r="8" /><path d="M9.8 9.6a2.2 2.2 0 1 1 3.5 1.8c-.8.6-1.3 1-1.3 2" /><path d="M12 16.6h.01" /></Ic>,
  ban: <Ic><circle cx="12" cy="12" r="8" /><path d="M6.6 6.6l10.8 10.8" /></Ic>,
  glass: <Ic><path d="M8 3.5h8l-.7 5.3A3.6 3.6 0 0 1 12 12a3.6 3.6 0 0 1-3.3-3.2z" /><path d="M12 12v7.5M9 20.5h6" /></Ic>,
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

function OptionCard({
  selected,
  onClick,
  children,
  hint,
  multi,
  tone,
  icon,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  hint?: string;
  multi?: boolean;
  tone?: "danger";
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-2xl border bg-card py-3.5 pr-4 pl-3.5 text-left shadow-[0_1px_2px_rgba(33,26,18,0.04)] transition-[border-color,background-color,box-shadow,scale] duration-150 active:scale-[0.985]",
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
      {icon && (
        <span
          aria-hidden="true"
          className="flex size-10 flex-none items-center justify-center rounded-full bg-tint text-walnut"
        >
          {icon}
        </span>
      )}
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
    <div className="mx-auto mb-6 flex w-fit rounded-full border border-line bg-tint p-[3px]">
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

function Stepper({
  value,
  onChange,
  step,
  min,
  max,
  suffix,
}: {
  value: number;
  onChange: (value: number) => void;
  step: number;
  min: number;
  max: number;
  suffix: string;
}) {
  const bump = (delta: number) => onChange(Math.max(min, Math.min(max, value + delta)));
  return (
    <span className="flex flex-none items-center gap-1.5">
      <button
        type="button"
        aria-label="Less"
        onClick={(e) => {
          e.stopPropagation();
          bump(-step);
        }}
        className="flex size-8 items-center justify-center rounded-full border border-line bg-card text-[16px] font-bold text-ink transition-transform duration-100 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
      >
        &minus;
      </button>
      <span className="min-w-[64px] text-center text-[12.5px] font-bold tracking-[-0.01em] whitespace-nowrap text-ink tabular-nums">
        {value}
        {suffix}
      </span>
      <button
        type="button"
        aria-label="More"
        onClick={(e) => {
          e.stopPropagation();
          bump(step);
        }}
        className="flex size-8 items-center justify-center rounded-full border border-line bg-card text-[15px] font-bold text-ink transition-transform duration-100 active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
      >
        +
      </button>
    </span>
  );
}

/** One tappable food row: tap to add at the default, step to adjust, − past the minimum removes. */
function DailyFoodRow({
  food,
  grams,
  onChange,
}: {
  food: DailyFood;
  grams: number | undefined;
  onChange: (grams: number | undefined) => void;
}) {
  const selected = grams !== undefined;
  return (
    <div
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onClick={() => !selected && onChange(food.defaultGrams)}
      onKeyDown={(e) => e.key === "Enter" && !selected && onChange(food.defaultGrams)}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-card py-3 pr-3 pl-4 text-left shadow-[0_1px_2px_rgba(33,26,18,0.04)] transition-[border-color,box-shadow] duration-150",
        selected ? "border-cta shadow-[0_0_0_1px_var(--color-cta)]" : "border-line hover:border-linex",
      )}
    >
      <span className="flex-1">
        <span className={cn("block text-[13.5px] leading-snug text-ink", selected && "font-bold")}>
          {food.label}
        </span>
        {food.hint && <span className="mt-0.5 block text-[10.5px] text-mute">{food.hint}</span>}
      </span>
      {selected ? (
        food.countUnit ? (
          <Stepper
            value={Math.round(grams / food.countUnit.grams)}
            onChange={(units) =>
              onChange(units < 1 ? undefined : units * food.countUnit!.grams)
            }
            step={1}
            min={0}
            max={Math.round(food.max / food.countUnit.grams)}
            suffix={` ${Math.round(grams / food.countUnit.grams) === 1 ? food.countUnit.singular : food.countUnit.plural}`}
          />
        ) : (
          <Stepper
            value={grams}
            onChange={(v) => onChange(v < food.step ? undefined : v)}
            step={food.step}
            min={0}
            max={food.max}
            suffix="g"
          />
        )
      ) : (
        <span
          aria-hidden="true"
          className="flex size-8 flex-none items-center justify-center rounded-full border border-faint text-[15px] font-bold text-mute"
        >
          +
        </span>
      )}
    </div>
  );
}

function WeeklyFoodRow({
  food,
  times,
  onChange,
}: {
  food: WeeklyFood;
  times: number | undefined;
  onChange: (times: number | undefined) => void;
}) {
  const selected = times !== undefined && times > 0;
  return (
    <div
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onClick={() => !selected && onChange(1)}
      onKeyDown={(e) => e.key === "Enter" && !selected && onChange(1)}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-card py-3 pr-3 pl-4 text-left shadow-[0_1px_2px_rgba(33,26,18,0.04)] transition-[border-color,box-shadow] duration-150",
        selected ? "border-cta shadow-[0_0_0_1px_var(--color-cta)]" : "border-line hover:border-linex",
      )}
    >
      <span className="flex-1">
        <span className={cn("block text-[13.5px] leading-snug text-ink", selected && "font-bold")}>
          {food.label}
        </span>
        <span className="mt-0.5 block text-[10.5px] text-mute">{food.portionGrams}g portion</span>
      </span>
      {selected ? (
        <Stepper
          value={times}
          onChange={(v) => onChange(v < 1 ? undefined : v)}
          step={1}
          min={0}
          max={7}
          suffix="×/wk"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-8 flex-none items-center justify-center rounded-full border border-faint text-[15px] font-bold text-mute"
        >
          +
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ quiz -- */

export function Quiz({
  draft,
  onChange,
  onComplete,
}: {
  draft: Draft;
  onChange: (draft: Draft) => void;
  onComplete: (draft: Draft) => void;
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

  function forward(from: number, current: Draft) {
    let next = from + 1;
    while (next < SCREENS.length && SCREENS[next].skip?.(current)) next += 1;
    if (next >= SCREENS.length) {
      onComplete(current);
      return;
    }
    setIndex(next);
  }

  function back() {
    let previous = index - 1;
    while (previous > 0 && SCREENS[previous].skip?.(draft)) previous -= 1;
    setIndex(Math.max(previous, 0));
  }

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

  function clearGroupAndAdvance(ids: string[]) {
    const updated = { ...draft, symptoms: draft.symptoms.filter((s) => !ids.includes(s)) };
    onChange(updated);
    forward(index, updated);
  }

  function setDaily(slug: string, grams: number | undefined) {
    const daily = { ...draft.daily };
    if (grams === undefined) delete daily[slug];
    else daily[slug] = grams;
    onChange({ ...draft, daily });
  }

  function setWeekly(slug: string, times: number | undefined) {
    const weekly = { ...draft.weekly };
    if (times === undefined) delete weekly[slug];
    else weekly[slug] = times;
    onChange({ ...draft, weekly });
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

  const heightValid = metric
    ? inRange(draft.heightCm, 120, 230)
    : inRange(draft.heightFt, 3, 7) &&
      (draft.heightIn === "" || inRange(draft.heightIn, 0, 11));
  const weightValid = metric ? inRange(draft.weight, 35, 300) : inRange(draft.weight, 77, 660);

  const ctaState: Record<string, boolean> = {
    age: inRange(draft.age, 16, 100),
    height: heightValid,
    weight: weightValid,
    "salt-amount": inRange(draft.saltGrams, 0, 60),
    symptoms: draft.symptoms.some((s) => SYMPTOMS.some((y) => y.id === s)),
    redflags: draft.symptoms.some((s) => RED_FLAGS.some((f) => f.id === s)),
    "food-meats": Object.keys(draft.daily).some((slug) =>
      DAILY_MEATS.some((f) => f.slug === slug),
    ),
    "food-fats": true,
    "food-weekly": true,
  };
  const needsCta = screen.id in ctaState;
  const ctaEnabled = ctaState[screen.id];

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

  return (
    <div ref={topRef}>
      {/* ---- back · section · progress ---------------------------------- */}
      <div className="mb-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          disabled={index === 0}
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

      {/* ---- screens ----------------------------------------------------- */}
      <div key={screen.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {screen.id === "sex" && (
          <div className="text-center">
            <p className="text-[10.5px] font-bold tracking-[0.22em] text-walnut uppercase">
              The Carnivore System
            </p>
            <h2 className="mt-1.5 text-[clamp(25px,7vw,36px)] leading-[1.05] font-extrabold tracking-[-0.02em] uppercase">
              Diet Analyzer
            </h2>
            <p className="mt-2.5 mb-6 text-[11.5px] font-semibold tracking-[0.18em] text-mute uppercase">
              Choose your sex
            </p>
            <div className="mx-auto grid max-w-[430px] grid-cols-2 gap-3">
              {(
                [
                  ["male", "Male", "/quiz/male.jpg"],
                  ["female", "Female", "/quiz/female.jpg"],
                ] as ["male" | "female", string, string][]
              ).map(([value, label, src]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => choose("sex", value)}
                  className="group relative overflow-hidden rounded-2xl border border-line bg-card text-left shadow-[0_1px_3px_rgba(33,26,18,0.06)] transition-[box-shadow,scale] duration-150 hover:shadow-[0_6px_18px_rgba(33,26,18,0.12)] active:scale-[0.985] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
                >
                  <Image
                    src={src}
                    alt=""
                    width={640}
                    height={853}
                    priority
                    className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                  <span className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-full bg-cta py-2 pr-1.5 pl-4 text-[13px] font-bold text-card">
                    {label}
                    <span
                      aria-hidden="true"
                      className="flex size-7 items-center justify-center rounded-full bg-card text-cta"
                    >
                      <svg viewBox="0 0 24 24" className="size-[14px]" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mx-auto mt-5 max-w-[380px] text-[10.5px] leading-relaxed text-mute">
              By choosing your sex and continuing you agree that your answers are processed only to
              build your report — nothing is stored, no account, no email. This answer also flips
              how iron is scored: accumulation risk for men, shortfall risk while menstruating.
            </p>
          </div>
        )}

        {screen.id === "tenure" && (
          <>
            <QuestionTitle sub="Deficiencies arrive on different clocks — electrolytes bite in the first week, folate takes three months, calcium is measured in years.">
              How long have you been carnivore?
            </QuestionTitle>
            <div className="flex flex-col gap-2.5">
              {(
                [
                  ["under1m", "Under a month", ICON.clock],
                  ["1to3m", "1–3 months", ICON.calendar],
                  ["3to12m", "3–12 months", ICON.chart],
                  ["over1y", "Over a year", ICON.medal],
                ] as [Tenure, string, React.ReactNode][]
              ).map(([value, label, icon]) => (
                <OptionCard key={value} selected={draft.tenure === value} onClick={() => choose("tenure", value)} icon={icon}>
                  {label}
                </OptionCard>
              ))}
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

        {screen.id === "goal" && (
          <>
            <QuestionTitle>What&rsquo;s your main goal?</QuestionTitle>
            <div className="flex flex-col gap-2.5">
              {(
                [
                  ["lose", "Lose fat", ICON.flame],
                  ["maintain", "Maintain and feel good", ICON.heart],
                  ["gain", "Build muscle", ICON.trophy],
                ] as [Goal, string, React.ReactNode][]
              ).map(([value, label, icon]) => (
                <OptionCard key={value} selected={draft.goal === value} onClick={() => choose("goal", value)} icon={icon}>
                  {label}
                </OptionCard>
              ))}
            </div>
          </>
        )}

        {screen.id === "age" && (
          <>
            <QuestionTitle>How old are you?</QuestionTitle>
            <div className="mx-auto max-w-[340px] rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_rgba(33,26,18,0.05)]">
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
            <div className="mx-auto max-w-[340px] rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_rgba(33,26,18,0.05)]">
              <UnitPill
                value={draft.units}
                onChange={switchUnits}
                options={[
                  { value: "imperial", label: "ft" },
                  { value: "metric", label: "cm" },
                ]}
              />
              {metric ? (
                <>
                  <BigInput
                    value={draft.heightCm}
                    onChange={(v) => set("heightCm", v)}
                    unit="cm"
                    placeholder="180"
                    onEnter={() => ctaEnabled && forward(index, draft)}
                  />
                  <p className="mt-2 text-center text-[11.5px] text-mute">Please enter a value from 120 to 230 cm</p>
                </>
              ) : (
                <div className="flex items-start justify-center gap-6">
                  <BigInput value={draft.heightFt} onChange={(v) => set("heightFt", v)} unit="ft" placeholder="5" />
                  <BigInput value={draft.heightIn} onChange={(v) => set("heightIn", v)} unit="in" placeholder="11" onEnter={() => ctaEnabled && forward(index, draft)} />
                </div>
              )}
            </div>
          </>
        )}

        {screen.id === "weight" && (
          <>
            <QuestionTitle>What&rsquo;s your current weight?</QuestionTitle>
            <div className="mx-auto max-w-[340px] rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_rgba(33,26,18,0.05)]">
              <UnitPill
                value={draft.units}
                onChange={switchUnits}
                options={[
                  { value: "imperial", label: "lb" },
                  { value: "metric", label: "kg" },
                ]}
              />
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
                  ["sedentary", "Mostly sitting", "Desk work, little walking", ICON.couch],
                  ["light", "Lightly active", "On your feet part of the day, or 1–2 workouts a week", ICON.walk],
                  ["moderate", "Moderately active", "3–5 workouts a week", ICON.run],
                  ["heavy", "Very active", "Hard training most days, or physical work", ICON.dumbbell],
                  ["athlete", "Athlete", "Two-a-days, competition volume", ICON.medal],
                ] as [Activity, string, string, React.ReactNode][]
              ).map(([value, label, hint, icon]) => (
                <OptionCard key={value} selected={draft.activity === value} onClick={() => choose("activity", value)} hint={hint} icon={icon}>
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
                  ["pink", "Pink / Himalayan", ICON.mountain],
                  ["sea", "Sea salt", ICON.wave],
                  ["iodized", "Iodised table salt", ICON.shaker],
                  ["unknown", "Not sure", ICON.question],
                ] as [SaltType, string, React.ReactNode][]
              ).map(([value, label, icon]) => (
                <OptionCard key={value} selected={draft.saltType === value} onClick={() => choose("saltType", value)} icon={icon}>
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
            <div className="mx-auto max-w-[340px] rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_rgba(33,26,18,0.05)]">
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

        {screen.id === "food-meats" && (
          <>
            <QuestionTitle sub="Tap what you eat on a normal day, then set roughly how much. Averages are fine — this is a map, not a food log.">
              Your daily meats
            </QuestionTitle>
            <div className="flex flex-col gap-2">
              {DAILY_MEATS.map((food) => (
                <DailyFoodRow
                  key={food.slug}
                  food={food}
                  grams={draft.daily[food.slug]}
                  onChange={(g) => setDaily(food.slug, g)}
                />
              ))}
            </div>
          </>
        )}

        {screen.id === "food-fats" && (
          <>
            <QuestionTitle sub="Eggs, dairy and added fats — daily amounts. Skip anything you don’t eat.">
              Eggs, dairy &amp; fats
            </QuestionTitle>
            <div className="flex flex-col gap-2">
              {DAILY_FATS.map((food) => (
                <DailyFoodRow
                  key={food.slug}
                  food={food}
                  grams={draft.daily[food.slug]}
                  onChange={(g) => setDaily(food.slug, g)}
                />
              ))}
            </div>
          </>
        )}

        {screen.id === "food-weekly" && (
          <>
            <QuestionTitle sub="Organs and seafood usually aren’t daily — set how many times per week. This is where most gaps close or stay open.">
              Organs &amp; seafood
            </QuestionTitle>
            <div className="flex flex-col gap-2">
              {WEEKLY_FOODS.map((food) => (
                <WeeklyFoodRow
                  key={food.slug}
                  food={food}
                  times={draft.weekly[food.slug]}
                  onChange={(t) => setWeekly(food.slug, t)}
                />
              ))}
            </div>
          </>
        )}

        {screen.id === "alcohol-gate" && (
          <>
            <QuestionTitle sub="Last question. Alcohol drains exactly what this diet is shortest on — magnesium, zinc, B1 — so the report reads differently if it’s regular.">
              Do you drink alcohol?
            </QuestionTitle>
            <div className="flex flex-col gap-2.5">
              <OptionCard
                icon={ICON.glass}
                selected={draft.alcohol !== "none"}
                onClick={() => choose("alcohol", draft.alcohol === "none" ? "occasional" : draft.alcohol)}
              >
                Yes
              </OptionCard>
              <OptionCard icon={ICON.ban} selected={draft.alcohol === "none"} onClick={() => choose("alcohol", "none")}>
                No
              </OptionCard>
            </div>
          </>
        )}

        {screen.id === "alcohol-amount" && (
          <>
            <QuestionTitle sub="Not a judgement question — it changes how your magnesium, zinc and B1 numbers should be read.">
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
                <OptionCard key={value} icon={ICON.glass} selected={draft.alcohol === value} onClick={() => choose("alcohol", value)}>
                  {label}
                </OptionCard>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ---- pinned CTA -------------------------------------------------- */}
      {needsCta && (
        <div className="sticky bottom-0 mt-7 bg-cream/95 py-3 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => forward(index, draft)}
            disabled={!ctaEnabled}
            className="w-full rounded-full bg-cta px-6 py-4 text-[12.5px] font-bold tracking-[0.12em] text-card uppercase shadow-[0_4px_14px_rgba(33,26,18,0.18)] transition-[background-color,scale] duration-150 active:scale-[0.99] hover:bg-ctah focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta disabled:cursor-not-allowed disabled:bg-line disabled:text-faint disabled:shadow-none"
          >
            Next step
          </button>
        </div>
      )}
    </div>
  );
}
