/**
 * Shared contracts for the diet analyzer.
 *
 * The split that matters: `NutrientId` values are computed by pure TypeScript
 * from a food table, never estimated by the model. The LLM only turns free text
 * into `ParsedFood[]` (stage 1) and turns a finished `Assessment` into prose
 * (stage 3). Numbers never originate in a language model.
 */

export type NutrientId =
  | "vitaminA"
  | "vitaminD"
  | "vitaminE"
  | "vitaminK1"
  | "vitaminK2"
  | "vitaminC"
  | "b1"
  | "b2"
  | "b3"
  | "b5"
  | "b6"
  | "folate"
  | "b12"
  | "choline"
  | "biotin"
  | "calcium"
  | "magnesium"
  | "potassium"
  | "sodium"
  | "phosphorus"
  | "iron"
  | "zinc"
  | "copper"
  | "selenium"
  | "manganese"
  | "iodine"
  | "epaDha";

export type Unit = "mg" | "mcg" | "IU" | "g";

/**
 * How seriously to take a gap in this nutrient on a carnivore diet.
 *
 * The distinction is the whole point of the product: manganese shows a huge
 * numeric shortfall with no documented clinical syndrome, while magnesium shows
 * a smaller shortfall that people actually feel within weeks. An analyzer that
 * paints both red is indistinguishable from a generic macro app, which is what
 * this audience already distrusts.
 */
export type Tier =
  /** Real intake gap and a plausible clinical consequence. Always surface. */
  | "gap"
  /** Gap only in some diet shapes (no organs, no seafood, no dairy). */
  | "conditional"
  /** Carnivore covers it comfortably. Show as a win; never flag as low. */
  | "strength"
  /** The risk runs the other way — too much, not too little. */
  | "excess";

export type Evidence = "high" | "medium" | "low";

export interface Nutrient {
  id: NutrientId;
  label: string;
  unit: Unit;
  tier: Tier;
  /** Confidence that intake really is short on a carnivore diet. */
  evidenceGap: Evidence;
  /** Confidence that the shortfall actually harms anyone. */
  evidenceHarm: Evidence;
  /** One line on why this nutrient behaves the way it does here. */
  why: string;
  /** The concrete food correction, shown when the nutrient falls short. */
  fix?: string;
}

export type Sex = "male" | "female";
export type Activity = "sedentary" | "light" | "moderate" | "heavy" | "athlete";
export type Goal = "lose" | "maintain" | "gain";
/** Deficiency onset windows differ by orders of magnitude, so tenure matters. */
export type Tenure = "under1m" | "1to3m" | "3to12m" | "over1y";
export type SaltType = "iodized" | "pink" | "sea" | "none" | "unknown";
export type AlcoholLevel = "none" | "occasional" | "weekly" | "daily" | "heavy";

export interface Profile {
  sex: Sex;
  age: number;
  /** Kilograms. The client converts imperial before sending. */
  weightKg: number;
  /** Centimetres. */
  heightCm: number;
  activity: Activity;
  goal: Goal;
  tenure: Tenure;
  saltType: SaltType;
  /** Grams of added salt per day, self-reported. */
  saltGramsPerDay: number;
  symptoms: string[];
  otherSymptoms?: string;
  supplements?: string;
  /** Free text about cheat meals or off-diet days. Context for the writer only
   *  — exceptions are not the habitual diet, so they never enter the math. */
  offDays?: string;
  alcohol: AlcoholLevel;
  /** Optional now: the tap-based builder produces structured foods directly. */
  dietText?: string;
}

/** One line item the model recognised in the user's description. */
export interface ParsedFood {
  slug: string;
  label: string;
  gramsPerDay: number;
  /** Verbatim fragment this came from, so the report can show its work. */
  source: string;
  /** True when the model could not match a canonical food. */
  unmatched?: boolean;
  /**
   * Macro estimate for unmatched foods only, per 100g. Macros are far harder to
   * hallucinate than micronutrients and the protein-percentage check needs them,
   * so the model may supply these three and only these three. Micronutrients for
   * unmatched foods are never estimated — they count as zero and the report says so.
   */
  est?: { kcal: number; protein: number; fat: number };
}

/**
 * One supplement the parser could pin to a nutrient and a daily amount, in that
 * nutrient's own unit. Amounts come from the label the user quoted; `estimated`
 * marks the two sanctioned heuristics (fish oil at 30% EPA+DHA, known-brand
 * electrolyte mixes). Anything vaguer lands in UnquantifiedSupplement instead —
 * an unquantifiable pill contributes a warning, never a number.
 */
export interface ParsedSupplement {
  nutrientId: NutrientId;
  label: string;
  amountPerDay: number;
  source: string;
  estimated?: boolean;
}

export interface UnquantifiedSupplement {
  label: string;
  reason: string;
}

export type Band = "deficient" | "low" | "adequate" | "high" | "excess";

export interface NutrientResult {
  id: NutrientId;
  label: string;
  unit: Unit;
  tier: Tier;
  evidenceGap: Evidence;
  evidenceHarm: Evidence;
  why: string;
  intake: number;
  target: number;
  /** Upper limit, when one is established. */
  limit?: number;
  /** intake / target, uncapped. */
  ratio: number;
  band: Band;
  /** Set when the carnivore-adjusted target departs from the DRI. */
  targetNote?: string;
  fix?: string;
  /** Which foods in the diet supplied this nutrient, largest first. */
  topSources: { label: string; amount: number }[];
  /**
   * Share of consumed grams (matched foods only) whose table entry carries a
   * measured value for this nutrient. Absent field = unmeasured, and unmeasured
   * counts as zero intake — so low coverage means the true intake is likely
   * HIGHER than shown, and the UI says so instead of printing false precision.
   */
  coverage: number;
}

export interface MacroResult {
  kcalTarget: number;
  kcalIntake: number;
  proteinG: number;
  fatG: number;
  proteinPctKcal: number;
  fatPctKcal: number;
  /** Grams of fat per gram of protein. Below ~1.0 is the classic beginner error. */
  fatToProtein: number;
  linoleicG: number;
}

/** A structural problem that isn't any single nutrient falling short. */
export interface Flag {
  id: string;
  severity: "warning" | "danger";
  title: string;
  detail: string;
}

/**
 * A reported symptom crossed against what the engine actually flagged.
 * Computed deterministically so the report keeps this section even when the
 * narrative stage fails — it is the one section the symptom-driven visitor
 * came for.
 */
export interface SymptomInsight {
  symptom: string;
  quickTest: string;
  matchedCauses: string[];
}

export interface ProtocolStep {
  action: string;
  rationale: string;
  covers: string[];
}

/**
 * The 0–100 Carnivore Score. Explainable and stable: a weighted share of
 * nutrient targets hit (weighted by clinical evidence, not by numeric gap
 * size) blended with a structural component from the macro flags.
 */
export interface ScoreInfo {
  value: number;
  /** 0–1: evidence-weighted nutrient component. */
  nutrients: number;
  /** 0–1: macro/structure component. */
  structure: number;
}

/** The deterministic output. Stage 3 writes prose about this and nothing else. */
export interface Assessment {
  macros: MacroResult;
  nutrients: NutrientResult[];
  flags: Flag[];
  parsed: ParsedFood[];
  supplements: ParsedSupplement[];
  unquantifiedSupplements: UnquantifiedSupplement[];
  symptomInsights: SymptomInsight[];
  score: ScoreInfo;
  protocol: ProtocolStep[];
  /** The most counter-intuitive deficiency — the teaser's one open card. */
  surpriseId: NutrientId | null;
  redFlags: { symptom: string; urgency: "emergency" | "urgent"; reason: string }[];
}

/** Stage 3 output — one entry per nutrient the engine flagged. */
export interface NutrientNote {
  id: string;
  comment: string;
  sideEffects: string[];
  fix: string;
}

export interface Narrative {
  headline: string;
  summary: string;
  notes: NutrientNote[];
  symptomLinks: { symptom: string; explanation: string }[];
  protocol: ProtocolStep[];
}

export interface AnalysisReport {
  assessment: Assessment;
  narrative: Narrative | null;
  /** Set when stage 1 or 3 failed and the report is engine-only. */
  degraded?: string;
}
