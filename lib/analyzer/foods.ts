import type { NutrientId } from "./types";

export type FoodGroup =
  | "beef"
  | "organ"
  | "lamb"
  | "pork"
  | "poultry"
  | "fish"
  | "shellfish"
  | "egg"
  | "dairy"
  | "fat"
  | "other";

export interface Food {
  slug: string;
  label: string;
  group: FoodGroup;
  /** Cooked unless stated — cooking concentrates protein per 100g. */
  state: string;
  /** USDA FoodData Central id, where one exists. */
  fdcId?: number;
  kcal: number;
  protein: number;
  fat: number;
  satFat: number;
  /** Linoleic acid, mg. Drives the vitamin E target. */
  linoleic: number;
  nutrients: Partial<Record<NutrientId, number>>;
}

/**
 * Per-100g composition, from USDA FoodData Central (SR Legacy) except where the
 * USDA does not measure the nutrient at all.
 *
 * Three fields come from named primary sources, because the USDA has no data:
 *
 * - vitaminK2 (MK-4): Elder, Haytowitz, Howe, Peterson & Booth, "Vitamin K
 *   Contents of Meat, Dairy, and Fast Food in the U.S. Diet", J Agric Food Chem
 *   2006;54:463-467. n=128 meats, 24 dairy. Foods that study did not measure —
 *   butter, ghee, parmesan, cream, lamb, chicken breast, oysters — carry no K2
 *   figure here at all. Note that study measured MK-4 only; MK-6 through MK-10
 *   were explicitly out of scope, so long-chain menaquinones in aged cheese are
 *   not represented and cheese understates.
 * - iodine: USDA/FDA/ODS-NIH Database for the Iodine Content of Common Foods,
 *   Release 4. Mussels, sardines, herring, mackerel, lamb, pork and chicken are
 *   absent from that database and carry no figure.
 * - biotin: Staggs et al., J Food Compost Anal 2004;17:767-776, the assay behind
 *   the NIH ODS table.
 *
 * Missing means missing. A nutrient absent from a food's map contributes zero
 * to intake, so an omission understates rather than invents.
 *
 * Salt is deliberately not a food here. It is captured on the profile as grams
 * plus type, because the type (iodised vs pink) decides iodine entirely and
 * double-counting it from free text would corrupt both sodium and iodine.
 */
export const FOODS: Food[] = [
  // ---- Beef ----------------------------------------------------------------
  { slug: "beef-ribeye", label: "Ribeye", group: "beef", state: "grilled", fdcId: 173392,
    kcal: 291, protein: 23.7, fat: 21.8, satFat: 9.7, linoleic: 889,
    nutrients: { iodine: 4, epaDha: 2, vitaminA: 8, vitaminD: 7, vitaminE: 0.1, vitaminK1: 1.6, vitaminK2: 7, vitaminC: 0, b1: 0.07, b2: 0.29, b3: 4.91, b5: 0.54, b6: 0.48, folate: 6, b12: 2.1, choline: 49, calcium: 11, magnesium: 22, potassium: 260, sodium: 54, phosphorus: 152, iron: 2.24, zinc: 5.91, copper: 0.08, selenium: 29.7, manganese: 0.08, } },
  { slug: "beef-ground-8020", label: "Ground beef 80/20", group: "beef", state: "cooked", fdcId: 171797,
    kcal: 270, protein: 25.8, fat: 17.8, satFat: 6.8, linoleic: 398,
    nutrients: { iodine: 7.5, epaDha: 0, vitaminA: 3, vitaminD: 2, vitaminE: 0.12, vitaminK1: 1.6, vitaminK2: 7.2, vitaminC: 0, b1: 0.05, b2: 0.18, b3: 5.1, b5: 0.66, b6: 0.37, folate: 10, b12: 2.73, choline: 81, biotin: 4.5, calcium: 24, magnesium: 20, potassium: 304, sodium: 75, phosphorus: 194, iron: 2.48, zinc: 6.25, copper: 0.08, selenium: 21.5, manganese: 0.01, } },
  { slug: "beef-chuck", label: "Chuck / braising beef", group: "beef", state: "braised", fdcId: 170617,
    kcal: 334, protein: 27.2, fat: 24.1, satFat: 9.6, linoleic: 600,
    nutrients: { iodine: 3.8, epaDha: 0, vitaminA: 0, vitaminD: 16, vitaminE: 0.2, vitaminK1: 2, vitaminK2: 7, vitaminC: 0, b1: 0.07, b2: 0.25, b3: 2.45, b5: 0.31, b6: 0.26, folate: 5, b12: 2.31, calcium: 13, magnesium: 20, potassium: 236, sodium: 65, phosphorus: 205, iron: 3.18, zinc: 8.58, copper: 0.13, selenium: 25, manganese: 0.02, } },
  { slug: "beef-round", label: "Lean round steak", group: "beef", state: "roasted", fdcId: 170230,
    kcal: 188, protein: 26.8, fat: 8.2, satFat: 3.0, linoleic: 230,
    nutrients: { iodine: 3.8, epaDha: 0, vitaminA: 0, vitaminD: 6, vitaminE: 0.38, vitaminK1: 1.3, vitaminK2: 7, vitaminC: 0, b1: 0.06, b2: 0.14, b3: 4.68, b5: 0.53, b6: 0.35, folate: 8, b12: 1.49, choline: 102, calcium: 6, magnesium: 17, potassium: 217, sodium: 35, phosphorus: 166, iron: 2.18, zinc: 4.49, copper: 0.06, selenium: 27.4, manganese: 0.01, } },
  { slug: "beef-picanha", label: "Picanha / top sirloin cap", group: "beef", state: "grilled", fdcId: 173061,
    kcal: 242, protein: 26.0, fat: 15.0, satFat: 5.4, linoleic: 468,
    nutrients: { iodine: 4, epaDha: 0, vitaminA: 7, vitaminD: 6, vitaminK1: 1.6, vitaminK2: 7, vitaminC: 0, b1: 0.07, b2: 0.26, b3: 3.92, b6: 0.4, folate: 6, b12: 2.77, calcium: 7, magnesium: 26, potassium: 361, sodium: 89, phosphorus: 226, iron: 3.16, zinc: 9.99, copper: 0.16, selenium: 35.6, } },
  { slug: "beef-short-ribs", label: "Short ribs", group: "beef", state: "braised", fdcId: 168613,
    kcal: 471, protein: 21.6, fat: 42.0, satFat: 17.8, linoleic: 980,
    nutrients: { iodine: 4, epaDha: 4, vitaminA: 0, vitaminD: 27, vitaminE: 0.29, vitaminK1: 2.4, vitaminK2: 7, vitaminC: 0, b1: 0.05, b2: 0.15, b3: 2.45, b5: 0.25, b6: 0.22, folate: 5, b12: 2.62, choline: 82, calcium: 12, magnesium: 15, potassium: 224, sodium: 50, phosphorus: 162, iron: 2.31, zinc: 4.88, copper: 0.1, selenium: 20.8, manganese: 0.01, } },
  { slug: "beef-shank", label: "Shank / stewing beef", group: "beef", state: "slow-cooked", fdcId: 169442,
    kcal: 201, protein: 33.7, fat: 6.4, satFat: 2.3, linoleic: 170,
    nutrients: { iodine: 4, epaDha: 0, vitaminA: 0, vitaminC: 0, b1: 0.14, b2: 0.21, b3: 5.89, b5: 0.41, b6: 0.37, folate: 10, b12: 3.79, calcium: 32, magnesium: 30, potassium: 447, sodium: 64, phosphorus: 263, iron: 3.86, zinc: 10.5, copper: 0.17, selenium: 30, manganese: 0.02, } },

  // ---- Organs --------------------------------------------------------------
  { slug: "beef-liver", label: "Beef liver", group: "organ", state: "cooked", fdcId: 168626,
    kcal: 191, protein: 29.1, fat: 5.3, satFat: 2.9, linoleic: 0,
    nutrients: { iodine: 16, epaDha: 0, vitaminA: 9442, vitaminD: 49, vitaminE: 0.51, vitaminK1: 3.3, vitaminK2: 1.9, vitaminC: 1.9, b1: 0.19, b2: 3.43, b3: 17.5, b5: 7.11, b6: 1.02, folate: 253, b12: 70.6, choline: 426, biotin: 41.6, calcium: 6, magnesium: 21, potassium: 352, sodium: 79, phosphorus: 497, iron: 6.54, zinc: 5.3, copper: 14.3, selenium: 36.1, manganese: 0.36, } },
  { slug: "chicken-liver", label: "Chicken liver", group: "organ", state: "cooked", fdcId: 171061,
    kcal: 167, protein: 24.5, fat: 6.5, satFat: 2.1, linoleic: 719,
    nutrients: { epaDha: 0, vitaminA: 3981, vitaminD: 0, vitaminE: 0.82, vitaminK1: 0, vitaminK2: 12.6, vitaminC: 27.9, b1: 0.29, b2: 1.99, b3: 11.0, b5: 6.67, b6: 0.76, folate: 578, b12: 16.9, choline: 290, biotin: 187, calcium: 11, magnesium: 25, potassium: 263, sodium: 76, phosphorus: 405, iron: 11.6, zinc: 3.98, copper: 0.5, selenium: 82.4, manganese: 0.36, } },
  { slug: "beef-kidney", label: "Beef kidney", group: "organ", state: "cooked", fdcId: 169450,
    kcal: 158, protein: 27.3, fat: 4.7, satFat: 1.4, linoleic: 626,
    nutrients: { epaDha: 0, vitaminA: 0, vitaminD: 45, vitaminE: 0.08, vitaminK1: 0, vitaminC: 0, b1: 0.16, b2: 2.97, b3: 3.92, b5: 1.56, b6: 0.39, folate: 83, b12: 24.9, choline: 513, calcium: 19, magnesium: 12, potassium: 135, sodium: 94, phosphorus: 304, iron: 5.8, zinc: 2.84, copper: 0.56, selenium: 168, manganese: 0.19, } },
  { slug: "beef-heart", label: "Beef heart", group: "organ", state: "cooked", fdcId: 169448,
    kcal: 165, protein: 28.5, fat: 4.7, satFat: 1.4, linoleic: 736,
    nutrients: { epaDha: 0, vitaminA: 0, vitaminD: 3, vitaminE: 0.29, vitaminK1: 0.5, vitaminC: 0, b1: 0.1, b2: 1.21, b3: 6.68, b5: 1.6, b6: 0.25, folate: 5, b12: 10.8, choline: 229, calcium: 5, magnesium: 21, potassium: 219, sodium: 59, phosphorus: 254, iron: 6.38, zinc: 2.87, copper: 0.56, selenium: 38.9, manganese: 0.03, } },
  { slug: "beef-brain", label: "Beef brain", group: "organ", state: "cooked", fdcId: 168624,
    kcal: 151, protein: 11.7, fat: 10.5, satFat: 2.4, linoleic: 39,
    nutrients: { epaDha: 855, vitaminA: 6, vitaminD: 0, vitaminE: 1.67, vitaminK1: 0.1, vitaminC: 10.5, b1: 0.07, b2: 0.22, b3: 3.62, b5: 1.21, b6: 0.14, folate: 5, b12: 10.1, choline: 491, calcium: 9, magnesium: 12, potassium: 244, sodium: 108, phosphorus: 335, iron: 2.3, zinc: 1.09, copper: 0.23, selenium: 21.8, manganese: 0.03 } },
  { slug: "beef-spleen", label: "Beef spleen", group: "organ", state: "raw", fdcId: 169454,
    kcal: 106, protein: 18.3, fat: 3.0, satFat: 1.0, linoleic: 200,
    nutrients: { vitaminC: 45.5, folate: 4, b12: 5.68, iron: 44.6, zinc: 2.1, copper: 0.18, selenium: 62.2 } },
  { slug: "chicken-gizzard", label: "Chicken gizzard", group: "organ", state: "cooked", fdcId: 171457,
    kcal: 154, protein: 30.4, fat: 2.7, satFat: 0.7, linoleic: 223,
    nutrients: { epaDha: 0, vitaminA: 0, vitaminD: 0, vitaminE: 0.2, vitaminC: 0, b1: 0.03, b2: 0.21, b3: 3.12, b5: 0.47, b6: 0.07, folate: 5, b12: 1.04, choline: 104, calcium: 17, magnesium: 3, potassium: 179, sodium: 56, phosphorus: 189, iron: 3.19, zinc: 4.42, copper: 0.16, selenium: 41.1, manganese: 0.07 } },
  // Low confidence: no peer-reviewed proximate table for beef marrow exists.
  // These figures trace to calorie-tracking apps. Treated as an energy source,
  // not a micronutrient one, which is what the numbers support anyway.
  { slug: "bone-marrow", label: "Bone marrow", group: "organ", state: "roasted",
    kcal: 786, protein: 5.0, fat: 86.0, satFat: 38.0, linoleic: 2500,
    nutrients: { b12: 0.4, magnesium: 2, iron: 0.6, zinc: 0.12, copper: 0.05 } },

  // ---- Lamb ----------------------------------------------------------------
  { slug: "lamb", label: "Lamb", group: "lamb", state: "cooked", fdcId: 172480,
    kcal: 294, protein: 24.5, fat: 20.9, satFat: 8.8, linoleic: 1140,
    nutrients: { epaDha: 0, vitaminA: 0, vitaminD: 2, vitaminE: 0.14, vitaminK1: 4.6, vitaminC: 0, b1: 0.1, b2: 0.25, b3: 6.66, b5: 0.66, b6: 0.13, folate: 18, b12: 2.55, choline: 94, calcium: 17, magnesium: 23, potassium: 310, sodium: 72, phosphorus: 188, iron: 1.88, zinc: 4.46, copper: 0.12, selenium: 26.4, manganese: 0.02, } },

  // ---- Pork ----------------------------------------------------------------
  { slug: "bacon", label: "Bacon", group: "pork", state: "cooked", fdcId: 167914,
    kcal: 548, protein: 35.7, fat: 43.3, satFat: 14.2, linoleic: 4088,
    nutrients: { epaDha: 0, vitaminA: 11, vitaminE: 0.32, vitaminK1: 0.1, vitaminK2: 5.6, vitaminC: 0, b1: 0.35, b2: 0.25, b3: 10.6, b5: 1.03, b6: 0.31, folate: 2, b12: 1.16, choline: 119, calcium: 10, magnesium: 30, potassium: 539, sodium: 2193, phosphorus: 506, iron: 1.49, zinc: 3.36, copper: 0.18, selenium: 59, manganese: 0.02, } },
  { slug: "pork-belly", label: "Pork belly", group: "pork", state: "raw", fdcId: 167812,
    kcal: 517, protein: 9.3, fat: 53.0, satFat: 19.3, linoleic: 5000,
    nutrients: { vitaminA: 3, vitaminE: 0.39, vitaminC: 0.3, b1: 0.4, b2: 0.24, b3: 4.6, b5: 0.26, b6: 0.13, folate: 1, b12: 0.84, vitaminK2: 1, calcium: 5, magnesium: 4, potassium: 185, sodium: 32, phosphorus: 108, iron: 0.52, zinc: 1.0, copper: 0.05, selenium: 8, manganese: 0.01, } },
  { slug: "pork-loin", label: "Pork loin", group: "pork", state: "roasted", fdcId: 167821,
    kcal: 248, protein: 27.1, fat: 14.7, satFat: 5.4, linoleic: 1070,
    nutrients: { epaDha: 0, vitaminA: 3, vitaminD: 42, vitaminE: 0.19, vitaminK1: 0, vitaminK2: 0.9, vitaminC: 0.6, b1: 0.99, b2: 0.31, b3: 5.57, b5: 0.76, b6: 0.52, folate: 6, b12: 0.71, choline: 93, biotin: 4.5, calcium: 19, magnesium: 26, potassium: 408, sodium: 59, phosphorus: 242, iron: 0.99, zinc: 2.32, copper: 0.06, selenium: 33.4, manganese: 0.01, } },
  { slug: "lard", label: "Lard", group: "fat", state: "rendered", fdcId: 171401,
    kcal: 902, protein: 0, fat: 100, satFat: 39.2, linoleic: 10200,
    nutrients: { epaDha: 0, vitaminD: 102, vitaminE: 0.6, choline: 50, zinc: 0.11, selenium: 0.2 } },

  // ---- Poultry -------------------------------------------------------------
  { slug: "chicken-thigh", label: "Chicken thigh, skin on", group: "poultry", state: "roasted", fdcId: 173625,
    kcal: 232, protein: 23.3, fat: 14.7, satFat: 4.1, linoleic: 2669,
    nutrients: { epaDha: 11, vitaminA: 16, vitaminD: 7, vitaminE: 0.19, vitaminK1: 3.3, vitaminK2: 22, vitaminC: 0, b1: 0.09, b2: 0.19, b3: 5.79, b5: 1.23, b6: 0.41, folate: 4, b12: 0.44, choline: 68, calcium: 9, magnesium: 22, potassium: 253, sodium: 102, phosphorus: 216, iron: 1.08, zinc: 1.73, copper: 0.06, selenium: 25.3, manganese: 0.02, } },
  { slug: "chicken-breast", label: "Chicken breast", group: "poultry", state: "roasted", fdcId: 171477,
    kcal: 165, protein: 31.0, fat: 3.6, satFat: 1.0, linoleic: 590,
    nutrients: { epaDha: 30, vitaminA: 6, vitaminD: 5, vitaminE: 0.27, vitaminK1: 0.3, vitaminC: 0, b1: 0.07, b2: 0.11, b3: 13.7, b5: 0.97, b6: 0.6, folate: 4, b12: 0.34, choline: 85, calcium: 15, magnesium: 29, potassium: 256, sodium: 74, phosphorus: 228, iron: 1.04, zinc: 1.0, copper: 0.05, selenium: 27.6, manganese: 0.02, } },
  { slug: "chicken-skin", label: "Chicken skin", group: "poultry", state: "roasted", fdcId: 171055,
    kcal: 454, protein: 20.4, fat: 40.7, satFat: 11.4, linoleic: 7830,
    nutrients: { epaDha: 60, vitaminA: 78, vitaminD: 8, vitaminE: 0.4, vitaminK1: 2.4, vitaminK2: 22, vitaminC: 0, b1: 0.04, b2: 0.13, b3: 5.58, b5: 0.71, b6: 0.1, folate: 2, b12: 0.2, choline: 46, calcium: 14, magnesium: 15, potassium: 136, sodium: 65, phosphorus: 125, iron: 1.51, zinc: 1.23, copper: 0.06, selenium: 20, manganese: 0.02 } },

  // ---- Fish ----------------------------------------------------------------
  { slug: "salmon-wild", label: "Wild salmon", group: "fish", state: "cooked", fdcId: 171998,
    kcal: 182, protein: 25.4, fat: 8.1, satFat: 1.3, linoleic: 220,
    nutrients: { iodine: 18, epaDha: 1840, vitaminA: 13, vitaminK2: 0.3, vitaminC: 0, b1: 0.28, b2: 0.49, b3: 10.1, b5: 1.92, b6: 0.94, folate: 29, b12: 3.05, biotin: 5.9, calcium: 15, magnesium: 37, potassium: 628, sodium: 56, phosphorus: 256, iron: 1.03, zinc: 0.82, copper: 0.32, selenium: 46.8, manganese: 0.02, } },
  { slug: "salmon-farmed", label: "Farmed salmon", group: "fish", state: "cooked", fdcId: 175168,
    kcal: 206, protein: 22.1, fat: 12.4, satFat: 2.4, linoleic: 666,
    nutrients: { iodine: 3.2, epaDha: 2147, vitaminA: 69, vitaminD: 526, vitaminE: 1.14, vitaminK1: 0.1, vitaminC: 3.7, b1: 0.34, b2: 0.14, b3: 8.05, b5: 1.48, b6: 0.65, folate: 34, b12: 2.8, choline: 91, biotin: 5.9, calcium: 15, magnesium: 30, potassium: 384, sodium: 61, phosphorus: 252, iron: 0.34, zinc: 0.43, copper: 0.05, selenium: 41.4, manganese: 0.02, } },
  { slug: "sardines", label: "Sardines, canned with bones", group: "fish", state: "canned", fdcId: 175139,
    kcal: 208, protein: 24.6, fat: 11.5, satFat: 1.5, linoleic: 3543,
    nutrients: { epaDha: 982, vitaminA: 32, vitaminD: 193, vitaminE: 2.04, vitaminK1: 2.6, vitaminC: 0, b1: 0.08, b2: 0.23, b3: 5.25, b5: 0.64, b6: 0.17, folate: 10, b12: 8.94, choline: 75, calcium: 382, magnesium: 39, potassium: 397, sodium: 307, phosphorus: 490, iron: 2.92, zinc: 1.31, copper: 0.19, selenium: 52.7, manganese: 0.11, } },
  { slug: "mackerel", label: "Mackerel", group: "fish", state: "cooked", fdcId: 175120,
    kcal: 262, protein: 23.9, fat: 17.8, satFat: 4.2, linoleic: 147,
    nutrients: { epaDha: 1203, vitaminA: 54, vitaminC: 0.4, b1: 0.16, b2: 0.41, b3: 6.85, b5: 0.99, b6: 0.46, folate: 2, b12: 19.0, calcium: 15, magnesium: 97, potassium: 401, sodium: 83, phosphorus: 278, iron: 1.57, zinc: 0.94, copper: 0.09, selenium: 51.6, manganese: 0.02, } },
  { slug: "cod", label: "Cod", group: "fish", state: "cooked", fdcId: 171956,
    kcal: 105, protein: 22.8, fat: 0.9, satFat: 0.2, linoleic: 6,
    nutrients: { iodine: 172, epaDha: 158, vitaminA: 14, vitaminD: 46, vitaminE: 0.81, vitaminK1: 0.1, vitaminC: 1.0, b1: 0.09, b2: 0.08, b3: 2.51, b5: 0.18, b6: 0.28, folate: 8, b12: 1.05, choline: 84, calcium: 14, magnesium: 42, potassium: 244, sodium: 78, phosphorus: 138, iron: 0.49, zinc: 0.58, copper: 0.04, selenium: 37.6, manganese: 0.02, } },
  { slug: "herring", label: "Herring", group: "fish", state: "cooked", fdcId: 175117,
    kcal: 203, protein: 23.0, fat: 11.6, satFat: 2.6, linoleic: 167,
    nutrients: { epaDha: 2014, vitaminA: 36, vitaminD: 214, vitaminE: 1.37, vitaminK1: 0.1, vitaminC: 0.7, b1: 0.11, b2: 0.3, b3: 4.12, b5: 0.74, b6: 0.35, folate: 12, b12: 13.1, choline: 83, calcium: 74, magnesium: 41, potassium: 419, sodium: 115, phosphorus: 303, iron: 1.41, zinc: 1.27, copper: 0.12, selenium: 46.8, manganese: 0.04, } },

  // ---- Shellfish -----------------------------------------------------------
  { slug: "oysters", label: "Oysters", group: "shellfish", state: "raw", fdcId: 171978,
    kcal: 51, protein: 5.7, fat: 1.7, satFat: 0.5, linoleic: 41,
    nutrients: { iodine: 109, epaDha: 313, vitaminA: 13, vitaminD: 1, vitaminE: 0.85, vitaminK1: 1.0, vitaminC: 0, b1: 0.02, b2: 0.09, b3: 0.93, b5: 0.22, b6: 0.03, folate: 7, b12: 8.75, choline: 65, calcium: 59, magnesium: 18, potassium: 156, sodium: 85, phosphorus: 97, iron: 4.61, zinc: 39.3, copper: 2.86, selenium: 19.7, manganese: 0.3, } },
  { slug: "mussels", label: "Mussels", group: "shellfish", state: "cooked", fdcId: 174217,
    kcal: 172, protein: 23.8, fat: 4.5, satFat: 0.9, linoleic: 36,
    nutrients: { epaDha: 782, vitaminA: 91, vitaminC: 13.6, b1: 0.3, b2: 0.42, b3: 3.0, b5: 0.95, b6: 0.1, folate: 76, b12: 24.0, calcium: 33, magnesium: 37, potassium: 268, sodium: 369, phosphorus: 285, iron: 6.72, zinc: 2.67, copper: 0.15, selenium: 89.6, manganese: 6.8, } },
  { slug: "shrimp", label: "Shrimp", group: "shellfish", state: "cooked", fdcId: 175180,
    kcal: 99, protein: 24.0, fat: 0.3, satFat: 0.06, linoleic: 18,
    nutrients: { iodine: 14.5, epaDha: 30, vitaminA: 90, vitaminE: 2.2, vitaminK1: 0.8, b1: 0.03, b2: 0.02, b3: 2.7, b5: 0.52, b6: 0.24, folate: 24, b12: 1.66, choline: 135, calcium: 70, magnesium: 39, potassium: 259, sodium: 111, phosphorus: 237, iron: 0.51, zinc: 1.64, copper: 0.38, manganese: 0.03, } },
  { slug: "crab", label: "Crab", group: "shellfish", state: "cooked", fdcId: 174205,
    kcal: 83, protein: 17.9, fat: 0.7, satFat: 0.2, linoleic: 20,
    nutrients: { iodine: 45, epaDha: 168, vitaminA: 1, vitaminD: 0, vitaminE: 1.84, vitaminK1: 0.3, vitaminC: 3.3, b1: 0.02, b2: 0.09, b3: 2.75, b5: 1.0, b6: 0.16, folate: 51, b12: 3.33, choline: 81, calcium: 91, magnesium: 36, potassium: 259, sodium: 395, phosphorus: 234, iron: 0.5, zinc: 3.81, copper: 0.81, selenium: 42.9, manganese: 0.07, } },

  // ---- Eggs ----------------------------------------------------------------
  { slug: "egg-whole", label: "Whole eggs", group: "egg", state: "cooked", fdcId: 173424,
    kcal: 155, protein: 12.6, fat: 10.6, satFat: 3.3, linoleic: 1188,
    nutrients: { iodine: 61, epaDha: 43, vitaminA: 149, vitaminD: 87, vitaminE: 1.03, vitaminK1: 0.3, vitaminK2: 7, vitaminC: 0, b1: 0.07, b2: 0.51, b3: 0.06, b5: 1.4, b6: 0.12, folate: 44, b12: 1.11, choline: 294, biotin: 21.4, calcium: 50, magnesium: 10, potassium: 126, sodium: 124, phosphorus: 172, iron: 1.19, zinc: 1.05, copper: 0.01, selenium: 30.8, manganese: 0.03, } },
  { slug: "egg-yolk", label: "Egg yolks", group: "egg", state: "raw", fdcId: 172184,
    kcal: 322, protein: 15.9, fat: 26.5, satFat: 9.6, linoleic: 3538,
    nutrients: { iodine: 177, epaDha: 125, vitaminA: 381, vitaminD: 218, vitaminE: 2.58, vitaminK1: 0.7, vitaminK2: 15.5, vitaminC: 0, b1: 0.18, b2: 0.53, b3: 0.02, b5: 2.99, b6: 0.35, folate: 146, b12: 1.95, choline: 820, biotin: 27.2, calcium: 129, magnesium: 5, potassium: 109, sodium: 48, phosphorus: 390, iron: 2.73, zinc: 2.3, copper: 0.08, selenium: 56.0, manganese: 0.06, } },

  // ---- Dairy and fats ------------------------------------------------------
  { slug: "butter", label: "Butter", group: "dairy", state: "salted", fdcId: 173410,
    kcal: 717, protein: 0.9, fat: 81.1, satFat: 51.4, linoleic: 2728,
    nutrients: { iodine: 4.6, epaDha: 0, vitaminA: 684, vitaminE: 2.32, vitaminK1: 7.0, vitaminC: 0, b1: 0.01, b2: 0.03, b3: 0.04, b5: 0.11, folate: 3, b12: 0.17, choline: 19, calcium: 24, magnesium: 2, potassium: 24, sodium: 643, phosphorus: 24, iron: 0.02, zinc: 0.09, selenium: 1.0, } },
  { slug: "ghee", label: "Ghee", group: "dairy", state: "clarified", fdcId: 173412,
    kcal: 876, protein: 0.3, fat: 99.5, satFat: 61.9, linoleic: 2247,
    nutrients: { epaDha: 0, vitaminA: 840, vitaminE: 2.8, vitaminK1: 8.6, folate: 0, b12: 0.01, choline: 22, calcium: 4, potassium: 5, sodium: 2, phosphorus: 3 } },
  { slug: "hard-cheese", label: "Hard cheese (parmesan)", group: "dairy", state: "aged", fdcId: 170848,
    kcal: 408, protein: 29.9, fat: 28.7, satFat: 16.3, linoleic: 920,
    nutrients: { iodine: 82, vitaminA: 230, vitaminE: 0.39, vitaminK1: 1.9, vitaminC: 0, b1: 0.03, b2: 0.38, b3: 0.11, b6: 0.05, folate: 7, b12: 1.4, choline: 15, calcium: 917, magnesium: 35, potassium: 129, sodium: 1400, phosphorus: 630, iron: 0.29, zinc: 4.5, selenium: 29.4, } },
  { slug: "cheddar", label: "Cheddar", group: "dairy", state: "aged", fdcId: 173414,
    kcal: 403, protein: 22.9, fat: 33.3, satFat: 18.9, linoleic: 790,
    nutrients: { iodine: 46, epaDha: 1, vitaminA: 337, vitaminE: 0.71, vitaminK1: 11.0, vitaminK2: 10.2, vitaminC: 0, b1: 0.03, b2: 0.43, b3: 0.06, b5: 0.41, b6: 0.07, folate: 27, b12: 1.1, choline: 17, biotin: 1.4, calcium: 710, magnesium: 27, potassium: 76, sodium: 653, phosphorus: 455, iron: 0.14, zinc: 3.64, copper: 0.03, selenium: 28.5, manganese: 0.03, } },
  { slug: "heavy-cream", label: "Heavy cream", group: "dairy", state: "fresh", fdcId: 170859,
    kcal: 340, protein: 2.8, fat: 36.1, satFat: 23.0, linoleic: 875,
    nutrients: { iodine: 21, vitaminA: 411, vitaminE: 0.92, vitaminK1: 3.2, vitaminC: 0.6, b1: 0.02, b2: 0.19, b3: 0.06, b5: 0.5, b6: 0.04, folate: 4, b12: 0.16, choline: 17, calcium: 66, magnesium: 7, potassium: 95, sodium: 27, phosphorus: 58, iron: 0.1, zinc: 0.24, copper: 0.01, selenium: 3.0, manganese: 0.01, } },
  { slug: "kefir", label: "Kefir", group: "dairy", state: "cultured", fdcId: 170904,
    kcal: 43, protein: 3.8, fat: 1.0, satFat: 0.7, linoleic: 30,
    nutrients: { iodine: 34, vitaminA: 171, vitaminD: 40, vitaminE: 0.02, vitaminK1: 0.1, vitaminK2: 1, vitaminC: 0.2, b1: 0.03, b2: 0.14, b3: 0.15, b5: 0.39, b6: 0.06, folate: 13, b12: 0.29, choline: 15, calcium: 130, magnesium: 12, potassium: 164, sodium: 40, phosphorus: 105, iron: 0.04, zinc: 0.46, copper: 0.01, selenium: 3.6, manganese: 0.01, } },
  { slug: "tallow", label: "Beef tallow", group: "fat", state: "rendered", fdcId: 171400,
    kcal: 898, protein: 0, fat: 100, satFat: 49.8, linoleic: 3100,
    nutrients: { epaDha: 0, vitaminE: 2.7, choline: 80, selenium: 0.2 } },

  // ---- Targeted additions --------------------------------------------------
  { slug: "eggshell-powder", label: "Eggshell powder", group: "other", state: "ground",
    kcal: 0, protein: 0, fat: 0, satFat: 0, linoleic: 0,
    // 401mg elemental calcium and 4.5mg magnesium per gram, chemically
    // assayed (Omelka et al. 2021). Absorbed as well as or better than
    // purified calcium carbonate.
    nutrients: { calcium: 40100, magnesium: 450 } },
  { slug: "bone-broth", label: "Bone broth", group: "other", state: "simmered",
    // Not a calcium source, despite the folklore: ~9–14mg per 240ml cup.
    kcal: 15, protein: 2.0, fat: 0.5, satFat: 0.2, linoleic: 20,
    nutrients: { calcium: 5, magnesium: 2, potassium: 40, sodium: 140 } },
];

export const FOOD_BY_SLUG: Record<string, Food> = Object.fromEntries(
  FOODS.map((f) => [f.slug, f]),
);

/** The closed enum handed to the parser model. */
export const FOOD_SLUGS = FOODS.map((f) => f.slug);
