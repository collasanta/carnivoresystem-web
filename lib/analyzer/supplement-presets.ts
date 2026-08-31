import type { NutrientId, ParsedSupplement } from "./types";

export interface SupplementPreset {
  nutrientId: NutrientId;
  label: string;
  amountPerDay: number;
  detail: string;
}

/**
 * The result-page toggles. Doses are the common label doses, deliberately
 * conservative — someone taking more can only be better off than the bar
 * shows, which errs in the safe direction.
 */
export const SUPPLEMENT_PRESETS: SupplementPreset[] = [
  { nutrientId: "magnesium", label: "Magnesium", amountPerDay: 400, detail: "400mg elemental" },
  { nutrientId: "vitaminD", label: "Vitamin D3", amountPerDay: 5000, detail: "5,000 IU" },
  { nutrientId: "epaDha", label: "Fish oil", amountPerDay: 600, detail: "~600mg EPA+DHA" },
  { nutrientId: "potassium", label: "Electrolyte mix (K)", amountPerDay: 600, detail: "~600mg potassium" },
  { nutrientId: "vitaminC", label: "Vitamin C", amountPerDay: 500, detail: "500mg" },
  { nutrientId: "calcium", label: "Calcium / eggshell", amountPerDay: 800, detail: "~800mg elemental" },
  { nutrientId: "iodine", label: "Iodine (kelp)", amountPerDay: 150, detail: "150mcg" },
  { nutrientId: "vitaminK2", label: "Vitamin K2 (MK-7/MK-4)", amountPerDay: 100, detail: "100mcg" },
  { nutrientId: "b1", label: "Thiamin (B1)", amountPerDay: 100, detail: "100mg" },
  { nutrientId: "folate", label: "Folate / B-complex", amountPerDay: 400, detail: "400mcg" },
  { nutrientId: "vitaminE", label: "Vitamin E", amountPerDay: 15, detail: "15mg" },
  { nutrientId: "choline", label: "Choline", amountPerDay: 500, detail: "500mg" },
];

export function presetsToSupplements(active: Partial<Record<NutrientId, boolean>>): ParsedSupplement[] {
  return SUPPLEMENT_PRESETS.filter((p) => active[p.nutrientId]).map((p) => ({
    nutrientId: p.nutrientId,
    label: p.label,
    amountPerDay: p.amountPerDay,
    source: "result-page toggle",
  }));
}
