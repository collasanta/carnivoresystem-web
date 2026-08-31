import type {
  Evidence,
  Flag,
  NutrientId,
  NutrientResult,
  Profile,
  ProtocolStep,
  ScoreInfo,
} from "./types";

/**
 * The Carnivore Score. Two properties matter more than the formula itself:
 * it is STABLE (same inputs, same number, no model in the loop) and it is
 * EXPLAINABLE (weighted share of targets hit, weighted by clinical evidence).
 *
 * Manganese and magnesium can show the same numeric shortfall, but magnesium
 * is felt within weeks while manganese has no documented syndrome — so harm
 * evidence, not gap size, carries the weight. Structure (the macro flags) is
 * a quarter of the score: someone can hit every micro target while eating
 * 45% protein, and that diet is still not fine.
 */
const HARM_WEIGHT: Record<Evidence, number> = { high: 3, medium: 2, low: 1 };

const BAND_SCORE: Record<NutrientResult["band"], number> = {
  adequate: 1,
  high: 0.7,
  low: 0.55,
  excess: 0.3,
  deficient: 0.2,
};

const FLAG_PENALTY: Record<string, number> = {
  "protein-ceiling": 0.18,
  "fat-to-protein": 0.12,
  "calorie-gap": 0.12,
  "zinc-copper": 0.08,
  alcohol: 0.08,
  "liver-ceiling": 0.08,
};

export function computeScore(nutrients: NutrientResult[], flags: Flag[]): ScoreInfo {
  let sum = 0;
  let weightTotal = 0;
  for (const n of nutrients) {
    const w = HARM_WEIGHT[n.evidenceHarm];
    sum += w * BAND_SCORE[n.band];
    weightTotal += w;
  }
  const nutrientComponent = weightTotal ? sum / weightTotal : 0;

  let structure = 1;
  for (const flag of flags) structure -= FLAG_PENALTY[flag.id] ?? 0;
  structure = Math.max(0.4, structure);

  return {
    value: Math.round(100 * (0.75 * nutrientComponent + 0.25 * structure)),
    nutrients: Math.round(nutrientComponent * 100) / 100,
    structure: Math.round(structure * 100) / 100,
  };
}

/**
 * The one deficiency most likely to surprise — the teaser's open card.
 * Highest-confidence gaps first, then the emptiest bar wins; vitamin C at 2%
 * of target beats potassium at 70%.
 */
export function pickSurprise(nutrients: NutrientResult[]): NutrientId | null {
  const candidates = nutrients
    .filter((n) => n.band === "deficient" && n.tier === "gap" && n.evidenceGap === "high")
    .sort((a, b) => a.ratio - b.ratio);
  return candidates[0]?.id ?? null;
}

interface Rule {
  /** Fires when this nutrient needs attention. */
  id: NutrientId;
  action: (profile: Profile) => string;
  rationale: string;
  covers: NutrientId[];
}

/**
 * The protocol, computed. One action often closes several gaps, so rules
 * declare what they cover and later rules whose nutrient is already covered
 * are skipped. Severity decides order: felt deficiencies first.
 */
const RULES: Rule[] = [
  {
    id: "iodine",
    action: (p) =>
      p.saltType === "iodized"
        ? "Add 100g of cod or a serving of oysters weekly"
        : "Swap your salt for iodised salt",
    rationale: "Iodised salt averages 52mcg of iodine per gram; pink and sea salt carry effectively none.",
    covers: ["iodine"],
  },
  {
    id: "magnesium",
    action: () => "Take 300–400mg of magnesium glycinate at night",
    rationale: "The one gap food genuinely cannot close on this diet — meat carries ~20mg per 100g and ketosis raises losses.",
    covers: ["magnesium"],
  },
  {
    id: "epaDha",
    action: () => "Eat 100–150g of sardines or salmon twice a week",
    rationale: "Land animals carry essentially no EPA/DHA; canned sardines with bones also bring calcium and vitamin D.",
    covers: ["epaDha", "vitaminD", "calcium"],
  },
  {
    id: "vitaminC",
    action: () => "Eat 100g of chicken liver twice a week",
    rationale: "Chicken liver carries ~28mg of vitamin C per 100g plus folate and copper — beef liver has almost none.",
    covers: ["vitaminC", "folate", "copper", "b2", "b5"],
  },
  {
    id: "folate",
    action: () => "Eat 100g of chicken liver twice a week",
    rationale: "578mcg of folate per 100g — one serving covers the day.",
    covers: ["folate", "vitaminC", "copper"],
  },
  {
    id: "calcium",
    action: () => "Add ½ tsp of eggshell powder daily (~500mg calcium), or 50g of hard cheese",
    rationale: "A kilo of muscle meat carries ~150mg of calcium; bone broth is not a source, whatever the folklore says.",
    covers: ["calcium"],
  },
  {
    id: "b1",
    action: () => "Swap 200g of beef for pork loin twice a week",
    rationale: "Pork carries roughly ten times the thiamin of beef.",
    covers: ["b1"],
  },
  {
    id: "sodium",
    action: () => "Salt more, not less: target ~4g of sodium a day (about 2 tsp of salt)",
    rationale: "Low insulin makes the kidney dump sodium — under-salting is the most common cause of early fatigue and cramps.",
    covers: ["sodium"],
  },
  {
    id: "potassium",
    action: () => "Add volume: 200g of salmon or extra lean beef on training days",
    rationale: "Potassium tracks total meat volume — small portions are the usual cause of the gap.",
    covers: ["potassium"],
  },
  {
    id: "manganese",
    action: () => "Eat 100g of mussels once a week",
    rationale: "The one carnivore-compatible food that closes manganese, with iodine and selenium on the side.",
    covers: ["manganese"],
  },
  {
    id: "vitaminK2",
    action: () => "Add two egg yolks or 200g of dark chicken meat daily",
    rationale: "MK-4 lives in yolks, dark poultry and aged cheese.",
    covers: ["vitaminK2"],
  },
  {
    id: "choline",
    action: () => "Eat 3 whole eggs a day",
    rationale: "Three eggs carry ~440mg of choline.",
    covers: ["choline"],
  },
  {
    id: "vitaminD",
    action: () => "Get 15–30 minutes of midday sun, or supplement D3 through winter",
    rationale: "No land food carries a useful amount — sun and fatty fish are the real sources.",
    covers: ["vitaminD"],
  },
];

export function buildProtocol(
  profile: Profile,
  nutrients: NutrientResult[],
  flags: Flag[],
): ProtocolStep[] {
  const steps: ProtocolStep[] = [];
  const covered = new Set<NutrientId>();
  const seenActions = new Set<string>();

  const push = (step: ProtocolStep) => {
    if (steps.length >= 5 || seenActions.has(step.action)) return;
    seenActions.add(step.action);
    steps.push(step);
    for (const id of step.covers) covered.add(id as NutrientId);
  };

  // Structural problems outrank any micronutrient: protein poisoning and a
  // large calorie deficit explain more symptoms than every vitamin combined.
  if (flags.some((f) => f.id === "protein-ceiling" || f.id === "fat-to-protein")) {
    push({
      action: "Raise fat until you eat at least 1g of fat per gram of protein",
      rationale: "Add butter, tallow or fattier cuts gradually over two weeks — jumping straight up overwhelms bile.",
      covers: [],
    });
  }
  if (flags.some((f) => f.id === "calorie-gap")) {
    push({
      action: "Eat more — weigh and count for three days once",
      rationale: "Meat satiates so well that 30–40% deficits go unnoticed, then get blamed on the diet.",
      covers: [],
    });
  }

  const severity = (n: NutrientResult) =>
    (n.band === "deficient" ? 3 : n.band === "excess" || n.band === "high" ? 2 : 1) *
    HARM_WEIGHT[n.evidenceHarm];

  const attention = nutrients
    .filter((n) => n.band !== "adequate")
    .sort((a, b) => severity(b) - severity(a));

  for (const n of attention) {
    if (steps.length >= 5) break;
    if (covered.has(n.id)) continue;

    // Direction-aware specials before the generic rules.
    if (n.id === "iron" && (n.band === "high" || n.band === "excess")) {
      push({
        action: "Donate blood every 4–6 months",
        rationale: "Heme iron absorbs efficiently and the body has no route to excrete it — donation is the honest lever.",
        covers: ["iron"],
      });
      continue;
    }
    if (n.id === "vitaminA" && n.band === "excess") {
      push({
        action: "Cap beef liver at 100–200g per week",
        rationale: "100g of cooked beef liver carries roughly three times the daily retinol limit.",
        covers: ["vitaminA"],
      });
      continue;
    }
    if (n.id === "zinc" && (n.band === "excess" || n.band === "high")) continue; // handled via copper/liver

    const rule = RULES.find((r) => r.id === n.id);
    if (rule) {
      push({
        action: rule.action(profile),
        rationale: rule.rationale,
        covers: rule.covers,
      });
    }
  }

  return steps;
}
