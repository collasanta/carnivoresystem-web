import { ThinkingLevel } from "@google/genai";
import { FOOD_BY_SLUG, FOOD_SLUGS, FOODS } from "@/lib/analyzer/foods";
import { NUTRIENTS, NUTRIENT_BY_ID } from "@/lib/analyzer/nutrients";
import type {
  NutrientId,
  ParsedFood,
  ParsedSupplement,
  Profile,
  UnquantifiedSupplement,
} from "@/lib/analyzer/types";
import { CHAINS, generateJson } from "./client";

/**
 * Stage 1: free text to quantified foods AND quantified supplements, one call.
 *
 * Both halves are classification against a closed enum plus portion arithmetic
 * — the model never emits a micronutrient content, only maps "magnesium
 * glycinate 400mg" onto the nutrient id and the label's own number. A pill it
 * cannot pin to a labelled amount goes to `unquantified`, which the report
 * surfaces as a warning instead of a guess.
 */
const NUTRIENT_IDS = NUTRIENTS.map((n) => n.id);

const SCHEMA = {
  type: "object",
  properties: {
    foods: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slug: { type: "string", enum: [...FOOD_SLUGS, "other"] },
          label: { type: "string" },
          gramsPerDay: { type: "number" },
          source: { type: "string" },
          estKcalPer100g: { type: "number" },
          estProteinPer100g: { type: "number" },
          estFatPer100g: { type: "number" },
        },
        required: ["slug", "label", "gramsPerDay", "source"],
        propertyOrdering: [
          "slug",
          "label",
          "gramsPerDay",
          "source",
          "estKcalPer100g",
          "estProteinPer100g",
          "estFatPer100g",
        ],
      },
    },
    supplements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nutrientId: { type: "string", enum: NUTRIENT_IDS },
          label: { type: "string" },
          amountPerDay: { type: "number" },
          source: { type: "string" },
          estimated: { type: "boolean" },
        },
        required: ["nutrientId", "label", "amountPerDay", "source", "estimated"],
        propertyOrdering: ["nutrientId", "label", "amountPerDay", "source", "estimated"],
      },
    },
    unquantifiedSupplements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          reason: { type: "string" },
        },
        required: ["label", "reason"],
        propertyOrdering: ["label", "reason"],
      },
    },
  },
  required: ["foods", "supplements", "unquantifiedSupplements"],
};

const FOOD_CATALOGUE = FOODS.map((f) => `${f.slug} — ${f.label} (${f.state})`).join("\n");
const NUTRIENT_CATALOGUE = NUTRIENTS.map((n) => `${n.id} — ${n.label}, unit: ${n.unit}`).join(
  "\n",
);

const SYSTEM = `You convert a description of a carnivore diet, plus a description of the
supplements the person takes, into structured daily amounts.

You are a parser, not a nutritionist. You do not assess anything, and you never
output a food's vitamin or mineral CONTENT — that is computed downstream from a
composition table. For supplements you only transcribe the label's own number
onto the right nutrient id.

FOOD RULES
- Every entry must use a slug from the food catalogue below, or "other".
- gramsPerDay is the AVERAGE over a week. "200g of liver twice a week" becomes
  57 grams per day.
- Convert all units to grams. 1 oz = 28g, 1 lb = 454g. A large egg is 50g, a
  yolk 17g. A tablespoon of butter is 14g, a teaspoon of eggshell powder 2.5g.
- When a portion is not stated, use a realistic adult serving and say so in
  "source".
- "source" quotes the fragment of the user's text the entry came from.
- Do NOT emit salt, water, coffee or tea. Salt is captured separately.
- Only use "other" when nothing in the catalogue is a reasonable match; prefer a
  near match ("sirloin" → a beef cut). When you do use "other", fill the three
  est* fields with per-100g macro estimates.
- Choose the specific slug the text supports: "chicken liver" is chicken-liver,
  not beef-liver. Ground beef is beef-ground-8020 unless stated lean.

SUPPLEMENT RULES
- One entry per NUTRIENT, so a product supplying several nutrients becomes
  several entries. amountPerDay is the daily average: "600mg twice a week"
  becomes 171.
- amountPerDay MUST be in the unit listed for that nutrient in the catalogue
  below. Convert when the label uses another unit: vitamin D 1mcg = 40 IU (so
  "125mcg D3" = 5000); vitamin E 1 IU = 0.67mg; mg/mcg conversions as usual.
- Treat the label's number as the elemental amount ("magnesium glycinate 400mg"
  = 400mg of magnesium) unless the text clearly says it is compound weight.
- Fish oil or cod liver oil with no stated EPA/DHA: count 30% of the oil weight
  as epaDha and set estimated=true ("fish oil 1000mg" → 300). If EPA and DHA
  are stated, use the stated sum and estimated=false.
- A NAMED electrolyte brand whose standard formulation is widely published
  (e.g. LMNT: 1000mg sodium, 200mg potassium, 60mg magnesium per serving) may
  be expanded with estimated=true. An unnamed "electrolyte powder" goes to
  unquantifiedSupplements — do not invent a formulation.
- Multivitamins, "greens powders", organ capsules and anything else without
  stated amounts go to unquantifiedSupplements with a short reason. Never guess
  a blend.
- "None", "nothing", or an empty supplement text means both supplement arrays
  are empty.

Food catalogue:
${FOOD_CATALOGUE}

Nutrient catalogue (ids and REQUIRED units for supplement amounts):
${NUTRIENT_CATALOGUE}`;

interface RawFood {
  slug: string;
  label: string;
  gramsPerDay: number;
  source: string;
  estKcalPer100g?: number;
  estProteinPer100g?: number;
  estFatPer100g?: number;
}

interface RawSupplement {
  nutrientId: string;
  label: string;
  amountPerDay: number;
  source: string;
  estimated: boolean;
}

export interface ParsedIntake {
  foods: ParsedFood[];
  supplements: ParsedSupplement[];
  unquantifiedSupplements: UnquantifiedSupplement[];
}

export async function parseDiet(profile: Profile): Promise<ParsedIntake> {
  const hints: string[] = [];
  if (profile.saltGramsPerDay) {
    hints.push(
      `(Salt is already recorded separately: ${profile.saltGramsPerDay}g/day of ${profile.saltType} salt. Do not emit it as a food. Electrolyte-mix sodium is separate from that salt and should still be counted.)`,
    );
  }

  const supplementsText = (profile.supplements ?? "").trim();

  const result = await generateJson<{
    foods: RawFood[];
    supplements: RawSupplement[];
    unquantifiedSupplements: UnquantifiedSupplement[];
  }>({
    chain: CHAINS.parser,
    systemInstruction: SYSTEM,
    prompt: `Diet description:\n"""\n${profile.dietText.slice(0, 4000)}\n"""\n\nSupplements description:\n"""\n${
      supplementsText ? supplementsText.slice(0, 800) : "none"
    }\n"""\n\n${hints.join("\n")}`,
    responseSchema: SCHEMA,
    maxOutputTokens: 16384,
    thinkingLevel: ThinkingLevel.LOW,
  });

  const foods = (result.foods ?? [])
    .filter((f) => Number.isFinite(f.gramsPerDay) && f.gramsPerDay > 0)
    .map<ParsedFood>((f) => {
      const known = FOOD_BY_SLUG[f.slug];
      // Guard the enum in code too: a schema constraint is not a guarantee.
      if (!known) {
        return {
          slug: "other",
          label: f.label || "Unrecognised food",
          gramsPerDay: Math.min(f.gramsPerDay, 5000),
          source: f.source ?? "",
          unmatched: true,
          est: {
            kcal: f.estKcalPer100g ?? 0,
            protein: f.estProteinPer100g ?? 0,
            fat: f.estFatPer100g ?? 0,
          },
        };
      }
      return {
        slug: f.slug,
        label: known.label,
        gramsPerDay: Math.min(f.gramsPerDay, 5000),
        source: f.source ?? "",
      };
    });

  const supplements = (result.supplements ?? [])
    .filter(
      (s): s is RawSupplement & { nutrientId: NutrientId } =>
        s.nutrientId in NUTRIENT_BY_ID &&
        Number.isFinite(s.amountPerDay) &&
        s.amountPerDay > 0,
    )
    .map<ParsedSupplement>((s) => ({
      nutrientId: s.nutrientId,
      label: s.label || NUTRIENT_BY_ID[s.nutrientId].label,
      amountPerDay: s.amountPerDay,
      source: s.source ?? "",
      estimated: s.estimated || undefined,
    }));

  const unquantifiedSupplements = (result.unquantifiedSupplements ?? [])
    .filter((u) => u.label)
    .slice(0, 10);

  return { foods, supplements, unquantifiedSupplements };
}
