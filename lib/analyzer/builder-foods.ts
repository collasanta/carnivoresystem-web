/**
 * The tap-based food builder's menu — a curated view over the composition
 * table. Daily foods carry grams with a stepper; weekly foods carry a fixed
 * sensible portion and a times-per-week stepper, averaged to grams/day by the
 * caller. All taps, no typing: the funnel's highest-friction screen (a free-
 * text diet description) becomes three screens of chips.
 */
export interface DailyFood {
  slug: string;
  label: string;
  defaultGrams: number;
  step: number;
  max: number;
  hint?: string;
  /** Foods people count in units, not grams — the stepper shows "3 eggs". */
  countUnit?: { grams: number; singular: string; plural: string };
}

export interface WeeklyFood {
  slug: string;
  label: string;
  portionGrams: number;
  hint?: string;
}

export const DAILY_MEATS: DailyFood[] = [
  { slug: "beef-ribeye", label: "Ribeye / steak", defaultGrams: 300, step: 100, max: 1500 },
  { slug: "beef-ground-8020", label: "Ground beef", defaultGrams: 300, step: 100, max: 1500 },
  { slug: "beef-chuck", label: "Chuck / stew beef", defaultGrams: 300, step: 100, max: 1500 },
  { slug: "beef-round", label: "Lean beef", defaultGrams: 300, step: 100, max: 1500 },
  { slug: "beef-picanha", label: "Picanha", defaultGrams: 300, step: 100, max: 1500 },
  { slug: "beef-short-ribs", label: "Short ribs", defaultGrams: 250, step: 50, max: 1000 },
  { slug: "lamb", label: "Lamb", defaultGrams: 250, step: 50, max: 1000 },
  { slug: "pork-loin", label: "Pork loin", defaultGrams: 200, step: 50, max: 800 },
  { slug: "pork-belly", label: "Pork belly", defaultGrams: 150, step: 50, max: 600 },
  { slug: "bacon", label: "Bacon", defaultGrams: 100, step: 50, max: 500 },
  { slug: "chicken-thigh", label: "Chicken thigh", defaultGrams: 250, step: 50, max: 1000 },
  { slug: "chicken-breast", label: "Chicken breast", defaultGrams: 250, step: 50, max: 1000 },
];

export const DAILY_FATS: DailyFood[] = [
  { slug: "egg-whole", label: "Whole eggs", defaultGrams: 150, step: 50, max: 600, countUnit: { grams: 50, singular: "egg", plural: "eggs" } },
  { slug: "egg-yolk", label: "Extra yolks", defaultGrams: 34, step: 17, max: 170, countUnit: { grams: 17, singular: "yolk", plural: "yolks" } },
  { slug: "butter", label: "Butter", defaultGrams: 30, step: 10, max: 150 },
  { slug: "ghee", label: "Ghee", defaultGrams: 20, step: 10, max: 100 },
  { slug: "tallow", label: "Tallow", defaultGrams: 20, step: 10, max: 100 },
  { slug: "lard", label: "Lard", defaultGrams: 20, step: 10, max: 100 },
  { slug: "cheddar", label: "Cheddar", defaultGrams: 50, step: 25, max: 300 },
  { slug: "hard-cheese", label: "Parmesan", defaultGrams: 40, step: 20, max: 200 },
  { slug: "heavy-cream", label: "Heavy cream", defaultGrams: 50, step: 25, max: 300 },
  { slug: "kefir", label: "Kefir", defaultGrams: 200, step: 100, max: 600 },
  { slug: "bone-broth", label: "Bone broth", defaultGrams: 240, step: 120, max: 720, hint: "1 cup ≈ 240g" },
];

export const WEEKLY_FOODS: WeeklyFood[] = [
  { slug: "beef-liver", label: "Beef liver", portionGrams: 100 },
  { slug: "chicken-liver", label: "Chicken liver", portionGrams: 100 },
  { slug: "beef-heart", label: "Heart", portionGrams: 150 },
  { slug: "beef-kidney", label: "Kidney", portionGrams: 100 },
  { slug: "sardines", label: "Sardines (with bones)", portionGrams: 100 },
  { slug: "salmon-farmed", label: "Salmon", portionGrams: 150 },
  { slug: "mackerel", label: "Mackerel", portionGrams: 150 },
  { slug: "cod", label: "Cod / white fish", portionGrams: 150 },
  { slug: "shrimp", label: "Shrimp", portionGrams: 150 },
  { slug: "oysters", label: "Oysters", portionGrams: 100 },
  { slug: "mussels", label: "Mussels", portionGrams: 100 },
];
