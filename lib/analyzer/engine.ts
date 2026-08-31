import { FOOD_BY_SLUG } from "./foods";
import { NUTRIENTS } from "./nutrients";
import { energyTarget, resolveTarget, saltContribution } from "./dri";
import { RED_FLAG_BY_ID } from "./redflags";
import type {
  Assessment,
  Band,
  Flag,
  MacroResult,
  Nutrient,
  NutrientId,
  NutrientResult,
  ParsedFood,
  Profile,
} from "./types";

interface Totals {
  kcal: number;
  protein: number;
  fat: number;
  satFat: number;
  linoleic: number;
  nutrients: Record<string, number>;
  sources: Record<string, { label: string; amount: number }[]>;
}

function accumulate(profile: Profile, parsed: ParsedFood[]): Totals {
  const totals: Totals = {
    kcal: 0,
    protein: 0,
    fat: 0,
    satFat: 0,
    linoleic: 0,
    nutrients: {},
    sources: {},
  };

  for (const item of parsed) {
    const grams = Math.max(0, item.gramsPerDay);
    if (!grams) continue;
    const factor = grams / 100;
    const food = FOOD_BY_SLUG[item.slug];

    if (!food) {
      // Unmatched: macros from the model's estimate, micronutrients from nothing.
      if (item.est) {
        totals.kcal += item.est.kcal * factor;
        totals.protein += item.est.protein * factor;
        totals.fat += item.est.fat * factor;
      }
      continue;
    }

    totals.kcal += food.kcal * factor;
    totals.protein += food.protein * factor;
    totals.fat += food.fat * factor;
    totals.satFat += food.satFat * factor;
    totals.linoleic += food.linoleic * factor;

    for (const [id, per100] of Object.entries(food.nutrients)) {
      const amount = (per100 as number) * factor;
      if (!amount) continue;
      totals.nutrients[id] = (totals.nutrients[id] ?? 0) + amount;
      (totals.sources[id] ??= []).push({ label: food.label, amount });
    }
  }

  // Added salt is carried on the profile rather than parsed from the diet text,
  // so it cannot be double-counted from a phrase like "I salt everything heavily".
  const salt = saltContribution(profile);
  if (salt.sodium) {
    totals.nutrients.sodium = (totals.nutrients.sodium ?? 0) + salt.sodium;
    (totals.sources.sodium ??= []).push({ label: "Added salt", amount: salt.sodium });
  }
  if (salt.iodine) {
    totals.nutrients.iodine = (totals.nutrients.iodine ?? 0) + salt.iodine;
    (totals.sources.iodine ??= []).push({ label: "Added salt", amount: salt.iodine });
  }

  return totals;
}

/**
 * Where an intake falls relative to its target.
 *
 * Three tiers deviate from a plain ratio, and each deviation is deliberate:
 *
 * - `strength` nutrients can never read "deficient". B12, niacin and B6 are not
 *   short on this diet, and a red bar next to B12 would tell the reader the tool
 *   does not understand what they eat.
 * - `excess` nutrients are scored against the upper limit rather than the RDA,
 *   because that is the direction the risk actually runs.
 * - Iron reads as accumulation for men and post-menopausal women, and as a
 *   shortfall risk for menstruating women. Same nutrient, opposite advice.
 */
function classify(
  nutrient: Nutrient,
  intake: number,
  target: number,
  limit: number | undefined,
  profile: Profile,
): Band {
  const ratio = target > 0 ? intake / target : 0;

  if (nutrient.tier === "excess") {
    const accumulates =
      nutrient.id !== "iron" || profile.sex === "male" || profile.age >= 51;

    if (accumulates) {
      if (limit && intake > limit) return "excess";
      if (intake > target * 2.5) return "high";
      if (ratio >= 0.8) return "adequate";
      return ratio >= 0.5 ? "low" : "deficient";
    }
    // Menstruating women: iron behaves like an ordinary shortfall risk.
    if (limit && intake > limit) return "excess";
    if (ratio < 0.5) return "deficient";
    if (ratio < 0.8) return "low";
    return "adequate";
  }

  if (limit && intake > limit) return "excess";
  if (ratio >= 0.8) return "adequate";
  if (nutrient.tier === "strength") return "low";
  return ratio < 0.5 ? "deficient" : "low";
}

/** Within a band, a nutrient people actually feel outranks a paper shortfall. */
const TIER_WEIGHT: Record<Nutrient["tier"], number> = {
  gap: 0,
  excess: 1,
  conditional: 2,
  strength: 3,
};

const BAND_ORDER: Record<Band, number> = {
  deficient: 0,
  excess: 1,
  low: 2,
  high: 3,
  adequate: 4,
};

function round(value: number): number {
  if (value >= 100) return Math.round(value);
  if (value >= 10) return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}

function buildFlags(
  profile: Profile,
  macros: MacroResult,
  totals: Totals,
  parsed: ParsedFood[],
  bandOf: (id: NutrientId) => Band,
): Flag[] {
  const flags: Flag[] = [];
  const zinc = totals.nutrients.zinc ?? 0;
  const copper = totals.nutrients.copper ?? 0;

  if (macros.proteinPctKcal > 35) {
    flags.push({
      id: "protein-ceiling",
      severity: "danger",
      title: `Protein is ${macros.proteinPctKcal.toFixed(0)}% of your calories`,
      detail:
        "Above roughly 35% of calories, the liver's capacity to convert nitrogen to urea becomes the bottleneck. That is protein poisoning — nausea, loose stools, weakness, headache, and an intense craving for fat rather than for sugar. The fix is more fat, not less meat.",
    });
  }

  if (macros.fatToProtein < 1 && macros.proteinG > 0) {
    flags.push({
      id: "fat-to-protein",
      severity: "warning",
      title: `You are eating ${macros.fatToProtein.toFixed(2)}g of fat per gram of protein`,
      detail:
        "A well-formulated carnivore diet runs at roughly 1:1 or higher by weight. Below that, fatigue and constipation are the usual first complaints. Raise fat gradually over two to three weeks — jumping straight up overwhelms bile production and causes diarrhoea.",
    });
  }

  if (macros.kcalIntake < macros.kcalTarget * 0.8) {
    flags.push({
      id: "calorie-gap",
      severity: "warning",
      title: `Estimated intake is ${Math.round(macros.kcalIntake)} kcal against a ${macros.kcalTarget} kcal target`,
      detail:
        "This is the most invisible error on this diet. Meat is extremely satiating, so people routinely eat 30–40% below their needs without noticing, then attribute the resulting fatigue, hair shedding, cold intolerance and missing periods to detox or adaptation. Weigh and count for three days once — it is the cheapest diagnostic there is.",
    });
  }

  if (copper > 0 && zinc / copper > 15) {
    flags.push({
      id: "zinc-copper",
      severity: "warning",
      title: `Your zinc-to-copper ratio is about ${Math.round(zinc / copper)}:1`,
      detail:
        "Around 8:1 to 12:1 is the target. Meat is dense in zinc, and zinc induces the intestinal protein that binds copper and carries it out in stool. Sustained, this causes copper deficiency — anaemia, neutropenia, nerve damage. Liver or oysters correct it in one serving.",
    });
  }

  const liverGrams = parsed
    .filter((p) => p.slug === "beef-liver")
    .reduce((sum, p) => sum + p.gramsPerDay, 0);
  if (liverGrams > 28) {
    flags.push({
      id: "liver-ceiling",
      severity: "danger",
      title: `About ${Math.round(liverGrams * 7)}g of beef liver a week`,
      detail:
        "Liver solves folate, copper, B vitamins and biotin in one food — and it is the one food here with a hard ceiling. 100g of cooked beef liver carries around 9,400mcg RAE of preformed retinol, more than three times the daily upper limit. Keep it to 100–200g per week. If you are pregnant, avoid it entirely.",
    });
  }

  const hasSeafood = parsed.some((p) => {
    const food = FOOD_BY_SLUG[p.slug];
    return food?.group === "fish" || food?.group === "shellfish";
  });
  // Only worth raising when the number actually came up short. Eggs and aged
  // cheese carry enough iodine to cover the day on their own, and a structural
  // warning sitting above an "on target" bar reads as a tool contradicting
  // itself rather than as a useful heads-up.
  if (!hasSeafood && profile.saltType !== "iodized" && bandOf("iodine") !== "adequate") {
    flags.push({
      id: "iodine-blind-spot",
      severity: "warning",
      title: "No seafood, and no iodised salt",
      detail:
        "Iodine intake on this diet is decided almost entirely by which salt is in your shaker. Iodised table salt averages 52mcg per gram across 26 measured samples; non-iodised sea salt averages 0.015 across 28. That is not a smaller amount, it is three orders of magnitude less — and the thyroid takes two to three months to show it.",
    });
  }

  if (/\braw\b[^.]{0,20}\begg|\begg white/i.test(profile.dietText)) {
    flags.push({
      id: "raw-egg-white",
      severity: "warning",
      title: "Raw egg white",
      detail:
        "Raw egg white contains avidin, which binds biotin irreversibly and carries it out in stool. This is the one genuine route to biotin deficiency on a carnivore diet. Cooking denatures avidin and the problem disappears — yolks are fine raw.",
    });
  }

  const unmatched = parsed.filter((p) => p.unmatched);
  if (unmatched.length) {
    flags.push({
      id: "unmatched-foods",
      severity: "warning",
      title: `${unmatched.length} item${unmatched.length > 1 ? "s" : ""} not in our food table`,
      detail: `We could not match ${unmatched
        .map((u) => u.label)
        .join(", ")}. Calories and macros are estimated for these, but their vitamins and minerals count as zero — so the shortfalls below may be overstated for anything those foods supply.`,
    });
  }

  return flags;
}

/**
 * The deterministic core. Same inputs always produce the same numbers, and no
 * part of this file talks to a network or a model.
 */
export function analyze(profile: Profile, parsed: ParsedFood[]): Assessment {
  const totals = accumulate(profile, parsed);
  const linoleicG = totals.linoleic / 1000;

  const kcalIntake = totals.kcal;
  const proteinKcal = totals.protein * 4;
  const fatKcal = totals.fat * 9;
  const macros: MacroResult = {
    kcalTarget: energyTarget(profile),
    kcalIntake: Math.round(kcalIntake),
    proteinG: Math.round(totals.protein),
    fatG: Math.round(totals.fat),
    proteinPctKcal: kcalIntake ? (proteinKcal / kcalIntake) * 100 : 0,
    fatPctKcal: kcalIntake ? (fatKcal / kcalIntake) * 100 : 0,
    fatToProtein: totals.protein ? totals.fat / totals.protein : 0,
    linoleicG: Math.round(linoleicG * 10) / 10,
  };

  const nutrients: NutrientResult[] = NUTRIENTS.map((nutrient) => {
    const intake = totals.nutrients[nutrient.id] ?? 0;
    const { value: target, limit, note } = resolveTarget(
      nutrient.id as NutrientId,
      profile,
      { linoleicG },
    );
    const topSources = (totals.sources[nutrient.id] ?? [])
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .map((s) => ({ label: s.label, amount: round(s.amount) }));

    return {
      id: nutrient.id,
      label: nutrient.label,
      unit: nutrient.unit,
      tier: nutrient.tier,
      evidenceGap: nutrient.evidenceGap,
      evidenceHarm: nutrient.evidenceHarm,
      why: nutrient.why,
      intake: round(intake),
      target: round(target),
      limit,
      ratio: target > 0 ? intake / target : 0,
      band: classify(nutrient, intake, target, limit, profile),
      targetNote: note,
      topSources,
    };
  }).sort(
    (a, b) =>
      BAND_ORDER[a.band] - BAND_ORDER[b.band] ||
      TIER_WEIGHT[a.tier] - TIER_WEIGHT[b.tier] ||
      a.ratio - b.ratio,
  );

  const redFlags = profile.symptoms
    .map((id) => RED_FLAG_BY_ID[id])
    .filter(Boolean)
    .map((f) => ({ symptom: f.label, urgency: f.urgency, reason: f.reason }));

  return {
    macros,
    nutrients,
    flags: buildFlags(profile, macros, totals, parsed, (id) =>
      nutrients.find((n) => n.id === id)?.band ?? "deficient",
    ),
    parsed,
    redFlags,
  };
}
