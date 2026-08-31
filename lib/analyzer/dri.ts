import type { NutrientId, Profile } from "./types";

export interface TargetSpec {
  /** Dietary Reference Intake, adult. */
  male: number;
  female: number;
  /** Tolerable upper limit, where one is established. */
  limit?: number;
  /**
   * Target used instead of the DRI, with the reason shown to the user.
   * Only set where the evidence genuinely supports departing from the DRI —
   * departing quietly would be worse than not departing at all.
   */
  carnivore?: { male: number; female: number; note: string };
}

export const TARGETS: Record<NutrientId, TargetSpec> = {
  vitaminC: {
    male: 90,
    female: 75,
    limit: 2000,
    carnivore: {
      male: 30,
      female: 30,
      note: "Held at 30mg rather than the 90/75mg RDA. 10mg/day is the demonstrated threshold that prevents and reverses scurvy, and 30mg keeps a threefold margin. The community claim that ketosis lowers the requirement — glucose competing with ascorbate at GLUT transporters — is mechanistically plausible but has never been tested in humans, and the main transporters (SVCT1/2) do not compete with glucose at all. We are not betting the target on it.",
    },
  },
  vitaminK1: { male: 120, female: 90 },
  vitaminK2: {
    male: 35,
    female: 35,
    carnivore: {
      male: 35,
      female: 35,
      note: "There is no DRI for K2. 35mcg reflects the intake above which the Rotterdam cohort saw lower coronary disease incidence, rather than the 90–360mcg doses used in supplement trials. Two caveats pull in opposite directions: our figures count MK-4 only, because the USDA study behind them put MK-6 through MK-10 out of scope — so aged cheese and fermented dairy are understated here. Treat this number as the most uncertain one in the report.",
    },
  },
  vitaminE: {
    male: 15,
    female: 15,
    limit: 1000,
    carnivore: {
      male: 5,
      female: 5,
      note: "Scaled to your polyunsaturated fat intake rather than fixed at 15mg. Vitamin E exists to protect polyunsaturated fats from oxidation, so the requirement tracks them at roughly 0.5mg per gram of linoleic acid, on a floor of 5mg. On ruminant fat the real need is far below the RDA; on a bacon-and-chicken diet it climbs back up.",
    },
  },
  vitaminA: { male: 900, female: 700, limit: 3000 },
  vitaminD: { male: 600, female: 600, limit: 4000 },
  b1: { male: 1.2, female: 1.1 },
  b2: { male: 1.3, female: 1.1 },
  // The 35mg UL applies to supplemental nicotinic acid, not to niacin from food.
  b3: { male: 16, female: 14 },
  b5: { male: 5, female: 5 },
  b6: { male: 1.3, female: 1.3, limit: 100 },
  folate: { male: 400, female: 400 },
  b12: { male: 2.4, female: 2.4 },
  choline: { male: 550, female: 425, limit: 3500 },
  biotin: { male: 30, female: 30 },
  calcium: { male: 1000, female: 1000, limit: 2500 },
  magnesium: { male: 400, female: 310 },
  potassium: {
    male: 3400,
    female: 2600,
    carnivore: {
      male: 4000,
      female: 3500,
      note: "Set above the standard AI, not below. The same low-insulin state that dumps sodium also increases potassium losses, so ketogenic practice targets around 4,000mg.",
    },
  },
  sodium: {
    male: 1500,
    female: 1500,
    limit: 7000,
    carnivore: {
      male: 4000,
      female: 4000,
      note: "This is the one target that runs opposite to standard advice, and it is the best-supported departure in the whole report. Low insulin removes its antinatriuretic effect on the kidney, so you excrete sodium faster. Ketogenic practice targets 3,000–5,000mg. Does not apply if you have salt-sensitive hypertension, heart failure or kidney disease.",
    },
  },
  phosphorus: { male: 700, female: 700, limit: 4000 },
  iron: { male: 8, female: 18, limit: 45 },
  zinc: { male: 11, female: 8, limit: 40 },
  copper: { male: 0.9, female: 0.9, limit: 10 },
  selenium: { male: 55, female: 55, limit: 400 },
  manganese: { male: 2.3, female: 1.8, limit: 11 },
  iodine: { male: 150, female: 150, limit: 1100 },
  epaDha: {
    male: 500,
    female: 500,
    carnivore: {
      male: 500,
      female: 500,
      note: "There is no US DRI for EPA and DHA. 500mg is the upper end of the 250–500mg international consensus.",
    },
  },
};

export interface TargetContext {
  /** Grams of linoleic acid per day — scales the vitamin E target. */
  linoleicG: number;
}

export interface ResolvedTarget {
  value: number;
  limit?: number;
  note?: string;
}

/**
 * The target for one nutrient, adjusted for who the person is and what they eat.
 *
 * Three adjustments are age- or sex-dependent rather than fixed: calcium rises
 * after 50 in women and 70 in men; magnesium rises slightly after 30; and iron
 * drops from 18mg to 8mg once a woman stops menstruating, which flips that
 * nutrient from a shortfall risk to an accumulation risk.
 */
export function resolveTarget(
  id: NutrientId,
  profile: Profile,
  ctx: TargetContext,
): ResolvedTarget {
  const spec = TARGETS[id];
  const female = profile.sex === "female";
  let value = spec.carnivore
    ? female
      ? spec.carnivore.female
      : spec.carnivore.male
    : female
      ? spec.female
      : spec.male;
  const note = spec.carnivore?.note;

  if (id === "calcium" && ((female && profile.age > 50) || (!female && profile.age > 70))) {
    value = 1200;
  }
  if (id === "magnesium" && profile.age > 30) {
    value = female ? 320 : 420;
  }
  if (id === "iron" && female && profile.age >= 51) {
    value = 8;
  }
  if (id === "vitaminE") {
    // 0.5mg alpha-tocopherol per gram of linoleic acid, floored at 5mg.
    value = Math.max(5, Math.round(ctx.linoleicG * 0.5 * 10) / 10);
  }

  return { value, limit: spec.limit, note };
}

const ACTIVITY_FACTOR: Record<Profile["activity"], number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725,
  athlete: 1.9,
};

/** Mifflin-St Jeor, the best-validated predictive equation for resting rate. */
export function basalMetabolicRate(profile: Profile): number {
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.sex === "male" ? base + 5 : base - 161;
}

export function energyTarget(profile: Profile): number {
  const maintenance = basalMetabolicRate(profile) * ACTIVITY_FACTOR[profile.activity];
  const adjusted =
    profile.goal === "lose"
      ? maintenance * 0.8
      : profile.goal === "gain"
        ? maintenance * 1.1
        : maintenance;
  return Math.round(adjusted / 10) * 10;
}

/** Sodium and iodine delivered by added salt, which is not modelled as a food. */
export function saltContribution(profile: Profile): { sodium: number; iodine: number } {
  const grams = Math.max(0, profile.saltGramsPerDay);
  // Sodium is ~393mg per gram of salt regardless of colour. Iodine is not.
  // Measured in the USDA/FDA/ODS iodine database: iodised table salt averages
  // 52mcg/g across 26 samples, while non-iodised sea salt averages 0.015mcg/g
  // across 28 — not "a little less", but three orders of magnitude less.
  const iodinePerGram =
    profile.saltType === "iodized" ? 52 : profile.saltType === "unknown" ? 20 : 0.015;
  return { sodium: Math.round(grams * 393), iodine: Math.round(grams * iodinePerGram) };
}
