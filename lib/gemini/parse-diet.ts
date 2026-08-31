import { FOOD_BY_SLUG, FOOD_SLUGS, FOODS } from "@/lib/analyzer/foods";
import type { ParsedFood, Profile } from "@/lib/analyzer/types";
import { ThinkingLevel } from "@google/genai";
import { CHAINS, generateJson } from "./client";

/**
 * Stage 1: free text to quantified foods.
 *
 * The model's entire job is classification and portion arithmetic. `slug` is a
 * closed enum in the schema, so it cannot invent a food; anything it cannot
 * place becomes "other" with a macro estimate and is reported as uncounted.
 * No micronutrient number is ever asked for here.
 */
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
  },
  required: ["foods"],
};

const CATALOGUE = FOODS.map((f) => `${f.slug} — ${f.label} (${f.state})`).join("\n");

const SYSTEM = `You convert a description of a carnivore diet into quantified daily food amounts.

You are a parser, not a nutritionist. You do not assess the diet, and you never
output vitamin or mineral values — those are computed downstream from a food
composition table.

Rules:
- Every entry must use a slug from the catalogue below, or "other".
- gramsPerDay is the AVERAGE over a week. If something is eaten 3 times a week,
  divide: "200g of liver twice a week" becomes 57 grams per day.
- Convert all units to grams. 1 oz = 28g, 1 lb = 454g. A large egg is 50g, a
  yolk 17g. A tablespoon of butter is 14g, a teaspoon of eggshell powder 2.5g.
- When a portion is not stated, use a realistic adult serving for that food and
  say so in "source".
- "source" quotes the fragment of the user's text this came from, so the report
  can show its work.
- Do NOT emit salt, water, coffee, tea or supplements. Salt is captured
  separately, and the others carry nothing this analysis measures.
- Only use "other" when nothing in the catalogue is a reasonable match. Prefer a
  near match: "sirloin" should map to a beef cut, not to "other". When you do use
  "other", fill in the three est* fields with per-100g estimates.
- Choose the specific slug the text supports: "chicken liver" is chicken-liver,
  not beef-liver. Ground beef is beef-ground-8020 unless stated lean.

Catalogue:
${CATALOGUE}`;

interface RawFood {
  slug: string;
  label: string;
  gramsPerDay: number;
  source: string;
  estKcalPer100g?: number;
  estProteinPer100g?: number;
  estFatPer100g?: number;
}

export async function parseDiet(profile: Profile): Promise<ParsedFood[]> {
  const hints: string[] = [];
  if (profile.saltGramsPerDay) {
    hints.push(`(Salt is already recorded separately: ${profile.saltGramsPerDay}g/day of ${profile.saltType} salt. Do not emit it.)`);
  }

  const { foods } = await generateJson<{ foods: RawFood[] }>({
    chain: CHAINS.parser,
    systemInstruction: SYSTEM,
    prompt: `Diet description:\n"""\n${profile.dietText.slice(0, 4000)}\n"""\n\n${hints.join("\n")}`,
    responseSchema: SCHEMA,
    maxOutputTokens: 16384,
    thinkingLevel: ThinkingLevel.LOW,
  });

  return (foods ?? [])
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
}
