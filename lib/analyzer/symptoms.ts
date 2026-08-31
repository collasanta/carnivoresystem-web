import type { NutrientId } from "./types";

/**
 * Causes that are not nutrients in the food table but explain more symptoms
 * than most nutrients do. Sodium, calories and fat account for the first or
 * second rank in over half this catalogue, which is why the report screens them
 * before it entertains any exotic micronutrient hypothesis.
 */
export type CauseId = NutrientId | "calories" | "fat" | "hydration" | "adaptation" | "caffeine";

export type Window = "week1" | "month1" | "month3" | "longterm";

export interface Symptom {
  id: string;
  label: string;
  window: Window;
  /** Most likely first. Confidence is for the leading cause. */
  causes: CauseId[];
  confidence: number;
  /** Cheapest test that confirms or rules the leading cause out. */
  quickTest: string;
}

export const SYMPTOMS: Symptom[] = [
  { id: "keto-flu", label: "Keto flu (first-week slump)", window: "week1", causes: ["sodium", "hydration", "potassium", "magnesium"], confidence: 0.9, quickTest: "Salt and water should lift it within two hours." },
  { id: "fatigue", label: "Low energy or fatigue", window: "month1", causes: ["calories", "sodium", "fat", "iron"], confidence: 0.7, quickTest: "Weigh and count everything for three days — most people find a 30–40% deficit." },
  { id: "cramps", label: "Muscle cramps", window: "week1", causes: ["magnesium", "potassium", "sodium", "hydration"], confidence: 0.75, quickTest: "300–400mg magnesium at night for five nights." },
  { id: "insomnia", label: "Insomnia or broken sleep", window: "month1", causes: ["adaptation", "magnesium", "sodium"], confidence: 0.55, quickTest: "Magnesium at night and a larger evening meal instead of a long overnight fast." },
  { id: "palpitations", label: "Palpitations", window: "month1", causes: ["magnesium", "potassium", "hydration", "caffeine"], confidence: 0.7, quickTest: "Magnesium and potassium together for seven days; cut coffee for five." },
  { id: "dizzy-standing", label: "Dizzy when standing up", window: "week1", causes: ["sodium", "hydration", "potassium"], confidence: 0.85, quickTest: "Salt before getting out of bed." },
  { id: "constipation", label: "Constipation", window: "month1", causes: ["fat", "hydration", "magnesium"], confidence: 0.7, quickTest: "Add 30g of fat a day for five days. Going once every two days without straining is not constipation." },
  { id: "diarrhea", label: "Loose stools or diarrhoea", window: "week1", causes: ["fat", "adaptation"], confidence: 0.8, quickTest: "Cut fat by a third for five days, then rebuild it slowly — bile production takes weeks to catch up." },
  { id: "fat-nausea", label: "Nausea when eating fat", window: "month1", causes: ["adaptation", "fat"], confidence: 0.75, quickTest: "Smaller, more frequent meals; raise fat by 5–10g a week rather than all at once." },
  { id: "headache", label: "Headaches", window: "week1", causes: ["sodium", "hydration", "caffeine", "magnesium"], confidence: 0.85, quickTest: "Salt and water. Relief in 30–60 minutes is itself the diagnosis." },
  { id: "irritability", label: "Irritability or mood swings", window: "month1", causes: ["sodium", "calories", "adaptation"], confidence: 0.6, quickTest: "Salt, enough calories, sleep. The window is two to three weeks." },
  { id: "brain-fog", label: "Brain fog", window: "month1", causes: ["adaptation", "sodium", "hydration", "calories"], confidence: 0.65, quickTest: "Give it three weeks with electrolytes handled. Past eight weeks, get bloods." },
  { id: "hair-loss", label: "Hair shedding", window: "month3", causes: ["calories", "iron", "zinc"], confidence: 0.7, quickTest: "Slow the weight loss. Telogen effluvium from rapid loss is the usual cause and it reverses." },
  { id: "brittle-nails", label: "Brittle nails", window: "month3", causes: ["iron", "zinc"], confidence: 0.45, quickTest: "Bloods — nails are a slow, late marker." },
  { id: "dry-skin", label: "Dry skin", window: "month1", causes: ["hydration", "epaDha", "zinc"], confidence: 0.5, quickTest: "Fatty fish three times a week for four weeks." },
  { id: "dry-eyes", label: "Dry eyes", window: "month3", causes: ["epaDha", "vitaminA"], confidence: 0.6, quickTest: "Oily fish or fish oil for six weeks." },
  { id: "bleeding-gums", label: "Bleeding gums", window: "month3", causes: ["vitaminC", "vitaminK1"], confidence: 0.55, quickTest: "Fresh liver and less-cooked meat — but see a doctor if bruising and slow healing come with it." },
  { id: "slow-healing", label: "Cuts healing slowly", window: "month3", causes: ["vitaminC", "zinc", "copper"], confidence: 0.55, quickTest: "Get bloods. With bleeding gums and easy bruising this is a pattern, not a nutrient tweak." },
  { id: "keto-breath", label: "Bad breath", window: "month1", causes: ["adaptation", "hydration"], confidence: 0.8, quickTest: "It fades as you stop exhaling ketones. A urine-like smell instead means too much protein." },
  { id: "cold-intolerance", label: "Feeling cold all the time", window: "month3", causes: ["calories", "iodine", "selenium"], confidence: 0.65, quickTest: "Eat more, and check whether your salt is iodised." },
  { id: "joint-pain", label: "Joint pain", window: "month1", causes: ["hydration", "epaDha"], confidence: 0.45, quickTest: "Water. One hot, red, very painful joint is likely gout — that needs a doctor." },
  { id: "anxiety", label: "Anxiety", window: "month1", causes: ["adaptation", "magnesium", "caffeine", "sodium"], confidence: 0.55, quickTest: "Cut coffee for five days and take magnesium at night." },
  { id: "low-libido", label: "Low libido", window: "month3", causes: ["calories", "zinc", "vitaminD"], confidence: 0.65, quickTest: "Check your macros — protein above 35% of calories lowers testosterone; under 35% it does not." },
  { id: "training-drop", label: "Training performance dropped", window: "month1", causes: ["adaptation", "sodium", "calories"], confidence: 0.8, quickTest: "Give it four weeks. Endurance recovers; top-end power may not fully return without carbohydrate." },
  { id: "irregular-cycle", label: "Irregular or missing periods", window: "month3", causes: ["calories"], confidence: 0.8, quickTest: "Eat more, stop fasting, slow the weight loss. Over three months without a period needs a doctor." },
  { id: "frequent-infections", label: "Getting sick often", window: "month3", causes: ["calories", "vitaminD", "zinc", "copper"], confidence: 0.55, quickTest: "Check 25-OH vitamin D and make sure you are actually eating enough." },
  { id: "fat-craving", label: "Intense craving for fat, with weakness", window: "week1", causes: ["fat", "calories"], confidence: 0.85, quickTest: "This is the signature of too much lean protein. Raise fat now." },
  { id: "excessive-thirst", label: "Very thirsty, urinating a lot", window: "week1", causes: ["hydration", "sodium"], confidence: 0.85, quickTest: "Drink to thirst with salt — plain water in volume without sodium is how people end up hyponatraemic." },
  { id: "itchy-rash", label: "Itchy rash on neck, chest or back", window: "month1", causes: ["adaptation"], confidence: 0.5, quickTest: "Likely prurigo pigmentosa. It responds to treatment and leaves pigmentation if ignored — see a dermatologist." },
];

export const SYMPTOM_BY_ID: Record<string, Symptom> = Object.fromEntries(
  SYMPTOMS.map((s) => [s.id, s]),
);
