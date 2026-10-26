import type { Answers } from "./quiz";

/**
 * Weight projection for the plan screen. Deliberately conservative: it is an estimate, shown as one.
 *
 * Loss: a weekly rate as a share of current body weight, by chosen pace (0.5% / 0.7% / 0.9% a week, the usual
 * "safe" band of 0.5–1%), capped at 0.9 kg/week, and slowing down over the last 25% of the way (×0.6), since losses
 * shrink as you approach the goal. People still eating a lot of carbs get one extra kilo in the first week
 * (glycogen + water when carbs drop), nobody else. Never goes below the target or below BMI 18.5.
 *
 * Gain (target above current): +0.2 kg/week (lean gain, realistic with training). Maintain: flat line.
 * The date is capped at 78 weeks; past that we just show the first 78 weeks.
 */
export type Projection = {
  kind: "lose" | "gain" | "maintain";
  startKg: number;
  targetKg: number;
  /** weekly points, week 0 = today */
  points: { week: number; kg: number }[];
  weeks: number;
  /** ISO date when the target is reached (estimate) */
  date: string;
  /** kg after 4 weeks (estimate), for the "first month" line */
  month1Kg: number;
  bmi: number | null;
  targetBmi: number | null;
  /** the target was raised to BMI 18.5 */
  clamped: boolean;
};

const PACE = { calm: 0.005, steady: 0.007, fast: 0.009 } as const;
const MAX_WEEKLY_KG = 0.9;
const MAX_WEEKS = 78;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function bmiOf(kg: number | undefined, cm: number | undefined): number | null {
  if (!kg || !cm) return null;
  const m = cm / 100;
  return round1(kg / (m * m));
}

export function project(a: Answers, today = new Date()): Projection | null {
  const start = a.weightKg;
  if (!start) return null;
  let target = a.targetKg ?? start;
  let clamped = false;
  if (a.heightCm) {
    const minKg = round1(18.5 * (a.heightCm / 100) ** 2);
    if (target < minKg) {
      target = Math.min(start, minKg);
      clamped = true;
    }
  }
  const diff = target - start;
  const kind: Projection["kind"] = Math.abs(diff) < 0.5 ? "maintain" : diff < 0 ? "lose" : "gain";

  const points = [{ week: 0, kg: start }];
  let w = start;
  let weeks = 0;
  if (kind === "lose") {
    const rate = PACE[a.pace ?? "steady"];
    const total = start - target;
    const waterBonus = a.eatingNow === "carby" || a.eatingNow === "mixed" ? 1 : 0;
    while (w > target + 0.05 && weeks < MAX_WEEKS) {
      const left = w - target;
      let step = Math.min(w * rate, MAX_WEEKLY_KG);
      if (left < total * 0.25) step *= 0.6;
      if (weeks === 0) step += waterBonus;
      w = Math.max(target, w - Math.max(step, 0.1));
      weeks++;
      points.push({ week: weeks, kg: round1(w) });
    }
  } else if (kind === "gain") {
    while (w < target - 0.05 && weeks < MAX_WEEKS) {
      w = Math.min(target, w + 0.2);
      weeks++;
      points.push({ week: weeks, kg: round1(w) });
    }
  } else {
    weeks = 4;
    for (let i = 1; i <= 4; i++) points.push({ week: i, kg: start });
  }

  const date = new Date(today);
  date.setDate(date.getDate() + Math.max(weeks, 1) * 7);
  const month1 = points.find((p) => p.week === 4)?.kg ?? points[points.length - 1].kg;
  return {
    kind,
    startKg: start,
    targetKg: round1(target),
    points,
    weeks,
    date: date.toISOString().slice(0, 10),
    month1Kg: month1,
    bmi: bmiOf(start, a.heightCm),
    targetBmi: bmiOf(target, a.heightCm),
    clamped,
  };
}

export function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export function fmtKg(kg: number): string {
  return `${kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg`;
}

/**
 * Daily water + sodium starting point, the same formula as the app (leo/src/lib/protocol.ts computeTargets):
 * water 30 ml/kg (weight capped at 100 kg) + 500/1000 ml for training, 2–4 L in 250 ml steps; sodium 5 g + training
 * + 1 g in the first month, max 7.5 g. The app recalculates it at onboarding, so this is just the preview.
 */
export function dailyTargets(a: Answers): { waterL: number; sodiumG: number } | null {
  if (!a.weightKg) return null;
  let water = Math.min(a.weightKg, 100) * 30;
  if (a.activity === "moderate") water += 500;
  if (a.activity === "active") water += 1000;
  water = Math.min(4000, Math.max(2000, Math.round(water / 250) * 250));
  let sodium = 5000;
  if (a.activity === "moderate") sodium += 500;
  if (a.activity === "active") sodium += 1500;
  if (a.tenure === "never" || a.tenure === "new" || a.tenure === "restart") sodium += 1000;
  return { waterL: water / 1000, sodiumG: Math.min(7500, sodium) / 1000 };
}
