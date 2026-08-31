/**
 * Fixture tests for the deterministic engine. No network, no model.
 *
 * These exist because the food table is exactly where errors enter — the K2 and
 * iodine errata proved it — and a silent regression there corrupts every report
 * downstream. Run with `npm test`.
 */
import { analyze } from "../lib/analyzer/engine";
import type { Band, ParsedFood, Profile } from "../lib/analyzer/types";

let failures = 0;
function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`ok   ${name}`);
  } else {
    failures += 1;
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const food = (slug: string, gramsPerDay: number): ParsedFood => ({
  slug,
  label: slug,
  gramsPerDay,
  source: "",
});

const base: Profile = {
  sex: "male",
  age: 35,
  weightKg: 82,
  heightCm: 180,
  activity: "moderate",
  goal: "maintain",
  tenure: "3to12m",
  saltType: "pink",
  saltGramsPerDay: 8,
  symptoms: [],
  alcohol: "none",
  dietText: "test",
};

const bandOf = (r: ReturnType<typeof analyze>, id: string): Band =>
  r.nutrients.find((n) => n.id === id)!.band;

// --- A: muscle-meat only, pink salt -----------------------------------------
{
  const r = analyze({ ...base, symptoms: ["cramps"] }, [
    food("beef-ribeye", 500),
    food("beef-ground-8020", 400),
  ]);
  check("A vitamin C deficient", bandOf(r, "vitaminC") === "deficient");
  check("A calcium deficient", bandOf(r, "calcium") === "deficient");
  check("A omega-3 deficient", bandOf(r, "epaDha") === "deficient");
  check("A magnesium deficient", bandOf(r, "magnesium") === "deficient");
  check("A iodine deficient on pink salt", bandOf(r, "iodine") === "deficient");
  check("A sodium adequate at 8g salt", bandOf(r, "sodium") === "adequate");
  check("A B12 is a win, never flagged", bandOf(r, "b12") === "adequate");
  check("A zinc over the limit", bandOf(r, "zinc") === "excess");
  check(
    "A iron reads accumulation for a man",
    ["high", "excess"].includes(bandOf(r, "iron")),
  );
  check(
    "A zinc:copper flag fires",
    r.flags.some((f) => f.id === "zinc-copper"),
  );
  check(
    "A iodine blind-spot flag fires",
    r.flags.some((f) => f.id === "iodine-blind-spot"),
  );
  const cramps = r.symptomInsights.find((s) => s.symptom.includes("cramps"));
  check(
    "A cramps insight names magnesium",
    !!cramps && cramps.matchedCauses.includes("Magnesium"),
    JSON.stringify(cramps?.matchedCauses),
  );
}

// --- B: nose-to-tail with seafood and iodised salt --------------------------
{
  const r = analyze({ ...base, saltType: "iodized" }, [
    food("beef-ribeye", 350),
    food("chicken-liver", 30),
    food("sardines", 100),
    food("mussels", 60),
    food("egg-yolk", 60),
    food("hard-cheese", 40),
    food("eggshell-powder", 1.5),
    food("butter", 30),
  ]);
  check("B vitamin C not deficient", bandOf(r, "vitaminC") !== "deficient");
  check("B folate adequate", bandOf(r, "folate") === "adequate");
  check("B iodine adequate", bandOf(r, "iodine") === "adequate");
  check(
    "B iodine flag does not fire on iodised salt",
    !r.flags.some((f) => f.id === "iodine-blind-spot"),
  );
  const deficient = r.nutrients.filter((n) => n.band === "deficient");
  check(
    "B few deficiencies remain",
    deficient.length <= 4,
    deficient.map((n) => n.id).join(","),
  );
}

// --- C: lean meat only → protein poisoning territory ------------------------
{
  const r = analyze(base, [food("beef-round", 700), food("chicken-breast", 400)]);
  check("C protein above 35% of calories", r.macros.proteinPctKcal > 35);
  check(
    "C protein ceiling flag fires",
    r.flags.some((f) => f.id === "protein-ceiling"),
  );
  check("C fat:protein below 1", r.macros.fatToProtein < 1);
}

// --- D: iron flips direction by sex -----------------------------------------
{
  const diet = [food("beef-ribeye", 500), food("beef-ground-8020", 400)];
  const woman = analyze({ ...base, sex: "female", age: 29 }, diet);
  check(
    "D iron is NOT an excess story for a menstruating woman",
    !["high", "excess"].includes(bandOf(woman, "iron")),
    bandOf(woman, "iron"),
  );
  check("D female iron target is 18mg", woman.nutrients.find((n) => n.id === "iron")!.target === 18);
}

// --- E: red flags bypass nothing but are always surfaced --------------------
{
  const r = analyze({ ...base, symptoms: ["chest-pain", "cramps"] }, [
    food("beef-ribeye", 500),
  ]);
  check("E chest pain surfaces as emergency", r.redFlags.some((f) => f.urgency === "emergency"));
  check("E normal symptoms still analysed alongside", r.symptomInsights.length === 1);
}

// --- F: data coverage is honest ---------------------------------------------
{
  const r = analyze(base, [food("mussels", 200)]);
  const iodine = r.nutrients.find((n) => n.id === "iodine")!;
  check(
    "F mussels have no measured iodine → coverage near zero",
    iodine.coverage < 0.1,
    String(iodine.coverage),
  );
  const k2 = analyze(base, [food("beef-ribeye", 500)]).nutrients.find(
    (n) => n.id === "vitaminK2",
  )!;
  check("F ribeye K2 is measured → full coverage", k2.coverage === 1);
}

// --- G: eggshell powder arithmetic ------------------------------------------
{
  const r = analyze({ ...base, saltGramsPerDay: 0 }, [food("eggshell-powder", 2.5)]);
  const calcium = r.nutrients.find((n) => n.id === "calcium")!;
  check(
    "G 2.5g eggshell ≈ 1000mg calcium",
    calcium.intake > 950 && calcium.intake < 1060,
    String(calcium.intake),
  );
}

// --- H: supplements count toward intake, capped against hallucination -------
{
  const diet = [food("beef-ribeye", 500), food("beef-ground-8020", 400)];
  const withMag = analyze(base, diet, [
    { nutrientId: "magnesium", label: "Magnesium glycinate", amountPerDay: 400, source: "" },
  ]);
  check("H 400mg magnesium flips the band", bandOf(withMag, "magnesium") === "adequate");
  const mag = withMag.nutrients.find((n) => n.id === "magnesium")!;
  check(
    "H supplement shows up as a source",
    mag.topSources.some((s) => s.label.includes("(supplement)")),
  );
  const absurd = analyze(base, diet, [
    { nutrientId: "vitaminD", label: "D3", amountPerDay: 1_000_000, source: "" },
  ]);
  const vitD = absurd.nutrients.find((n) => n.id === "vitaminD")!;
  // 16,000 IU is the cap (4× UL); the small remainder is the food itself.
  check("H hallucinated megadose is capped", vitD.intake <= 16100, String(vitD.intake));
}

// --- I: unquantified supplements warn instead of guessing -------------------
{
  const r = analyze(base, [food("beef-ribeye", 500)], [], [
    { label: "a multivitamin", reason: "blend not stated" },
  ]);
  check(
    "I unquantified supplement raises the flag",
    r.flags.some((f) => f.id === "unquantified-supplements"),
  );
}

// --- J: alcohol flag fires only at daily and above --------------------------
{
  const diet = [food("beef-ribeye", 500)];
  check(
    "J weekly drinking does not flag",
    !analyze({ ...base, alcohol: "weekly" }, diet).flags.some((f) => f.id === "alcohol"),
  );
  const daily = analyze({ ...base, alcohol: "daily" }, diet);
  check("J daily drinking flags as warning",
    daily.flags.some((f) => f.id === "alcohol" && f.severity === "warning"));
  const heavy = analyze({ ...base, alcohol: "heavy" }, diet);
  check("J heavy drinking flags as danger",
    heavy.flags.some((f) => f.id === "alcohol" && f.severity === "danger"));
}

console.log(failures ? `\n${failures} failure(s)` : "\nall green");
process.exit(failures ? 1 : 0);
