import { SYMPTOM_BY_ID } from "@/lib/analyzer/symptoms";
import type { Assessment, Narrative, Profile } from "@/lib/analyzer/types";
import { ThinkingLevel } from "@google/genai";
import { CHAINS, generateJson } from "./client";

/**
 * Stage 3: the finished numbers to prose.
 *
 * The model receives an assessment that is already complete and is forbidden
 * from changing any of it. Its only job is explanation and prioritisation —
 * the two things it is genuinely better at than a lookup table.
 */
const SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    notes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          comment: { type: "string" },
          sideEffects: { type: "array", items: { type: "string" } },
          fix: { type: "string" },
        },
        required: ["id", "comment", "sideEffects", "fix"],
        propertyOrdering: ["id", "comment", "sideEffects", "fix"],
      },
    },
    symptomLinks: {
      type: "array",
      items: {
        type: "object",
        properties: { symptom: { type: "string" }, explanation: { type: "string" } },
        required: ["symptom", "explanation"],
        propertyOrdering: ["symptom", "explanation"],
      },
    },
    protocol: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          rationale: { type: "string" },
          covers: { type: "array", items: { type: "string" } },
        },
        required: ["action", "rationale", "covers"],
        propertyOrdering: ["action", "rationale", "covers"],
      },
    },
  },
  required: ["headline", "summary", "notes", "symptomLinks", "protocol"],
};

const SYSTEM = `You write the commentary for a carnivore diet analysis. The numbers are already
computed and are not yours to change, dispute or recompute. Explain them.

VOICE
Terse and concrete, like a good coach who respects the reader. Short sentences.
No hype, no hedging clouds, no "consult your healthcare provider" filler after
every claim. British or American spelling is fine; be consistent. Never use
exclamation marks. Do not open with "Great news" or similar.

WHAT YOU MAY SAY
- Only discuss nutrients present in the assessment you are given, using their
  exact ids. Never invent a nutrient, a number, or a food's content.
- Never restate a number that contradicts the assessment.
- Fixes must be food first, with a concrete amount: "100g of chicken liver twice
  a week" beats "eat more organ meats". Name a supplement only where food
  genuinely cannot close the gap — magnesium is the honest example.

HARD LIMITS ON WHAT YOU RECOMMEND
Some foods here have ceilings, and a recommendation that breaches one is worse
than no recommendation at all:
- Beef liver: never more than 200g per WEEK, and never a daily amount. 100g of
  cooked beef liver carries roughly 9,400mcg RAE of preformed retinol against a
  3,000mcg daily upper limit. "100g twice a week" is the most you may suggest,
  and 100g once a week is the safer default. Never suggest daily liver.
- Chicken liver is about 40% the retinol of beef liver, so up to 100g twice a
  week is fine, and it is the better choice when vitamin C or folate is the gap.
- Never recommend more than 5,000mg of sodium a day, and never recommend raising
  sodium at all to someone whose sodium already reads adequate or high.
- Bone broth is not a calcium source. It supplies around 10mg per cup. Never
  offer it as a fix for calcium; eggshell powder, sardines with bones or hard
  cheese are the real options.
- Oysters are the single densest zinc food there is, at roughly 39mg per 100g.
  Never offer them to correct a zinc-to-copper ratio or to someone whose zinc is
  already high — they make it worse. Liver is the copper source. Oysters are a
  fine answer for copper only when zinc is not flagged.
- Mussels, not oysters, are the manganese food: 6.8mg per 100g against 0.3mg.
  Do not present the two as interchangeable.
- Pink and sea salt are not mineral sources. A teaspoon carries about 13mg of
  magnesium. Never present them as one.

WHAT YOU MUST NOT SAY
- No diagnosis. No dosing of medication. Never suggest stopping a medication.
- Do not tell anyone they have a deficiency. They have an estimated intake below
  a target. That distinction is the whole credibility of this tool.
- Do not validate "oxalate dumping", "detox" or "adaptation" as an explanation
  when sodium, calories or fat are the ones actually flagged. Those three account
  for most early complaints. Screen them before anything exotic.
- Do not describe fibre as missing. It is not an essential nutrient and its
  absence here is by design.

CALIBRATION
The assessment marks each nutrient with evidenceGap and evidenceHarm. Respect
them. A nutrient with a large shortfall but evidenceHarm "low" — manganese is the
case — gets a calm note saying the numeric gap is real and the clinical
significance is unestablished. A nutrient with evidenceHarm "medium" or "high"
gets a direct one. Never manufacture alarm to make the report feel valuable.

This is a hard rule, not a preference: when evidenceHarm is "low", sideEffects
MUST be an empty array. If the literature does not establish that a shortfall
causes something, listing what it might cause is invention, and inventing
consequences is exactly what this tool exists to replace.

OUTPUT
- headline: under 12 words, states the single most important finding.
- summary: two or three sentences. Lead with the biggest lever.
- notes: one per nutrient in "needsComment". comment is one or two sentences on
  where they stand and why. sideEffects lists what this shortfall plausibly
  causes — 2 to 4 short phrases, empty array if the evidence does not support
  any. fix is the concrete food correction.
- symptomLinks: only where a reported symptom lines up with something actually
  flagged. If nothing lines up, return an empty array rather than reaching.
- protocol: at most 5 actions, ordered by impact, deduplicated. One action often
  closes several gaps at once — say so in "covers" using nutrient ids. This is
  the part people screenshot; make each line something they could do tomorrow.`;

export async function writeReport(
  profile: Profile,
  assessment: Assessment,
): Promise<Narrative> {
  // Send only what the engine actually flagged. Adequate nutrients are shown by
  // the UI without commentary, and passing them would invite the model to fill
  // space with reassurance nobody asked for.
  const needsComment = assessment.nutrients
    .filter((n) => n.band !== "adequate")
    .map((n) => ({
      id: n.id,
      label: n.label,
      unit: n.unit,
      band: n.band,
      intake: n.intake,
      target: n.target,
      tier: n.tier,
      evidenceGap: n.evidenceGap,
      evidenceHarm: n.evidenceHarm,
      why: n.why,
    }));

  const reported = profile.symptoms
    .map((id) => SYMPTOM_BY_ID[id])
    .filter(Boolean)
    .map((s) => ({ label: s.label, likelyCauses: s.causes.slice(0, 3), quickTest: s.quickTest }));

  const payload = {
    person: {
      sex: profile.sex,
      age: profile.age,
      goal: profile.goal,
      activity: profile.activity,
      monthsOnCarnivore: profile.tenure,
      saltType: profile.saltType,
      saltGramsPerDay: profile.saltGramsPerDay,
      supplementsAlreadyTaking: profile.supplements || "none reported",
    },
    macros: assessment.macros,
    structuralFlags: assessment.flags.map((f) => ({ id: f.id, title: f.title })),
    needsComment,
    reportedSymptoms: reported,
    freeTextSymptoms: profile.otherSymptoms || "",
    whatTheyEat: assessment.parsed.map((p) => `${p.label}: ${Math.round(p.gramsPerDay)}g/day`),
  };

  const narrative = await generateJson<Narrative>({
    chain: CHAINS.writer,
    systemInstruction: SYSTEM,
    prompt: `Assessment to explain:\n${JSON.stringify(payload, null, 2)}

Write the commentary. Anything the person already supplements must not be
recommended again as if it were new — acknowledge it and move on.`,
    responseSchema: SCHEMA,
    // Generous ceiling: thinking tokens draw from the same budget as the JSON
    // body, and 8192 was not enough for both. maxOutputTokens is only a cap —
    // billing follows tokens actually produced — so headroom costs nothing.
    maxOutputTokens: 32768,
    thinkingLevel: ThinkingLevel.LOW,
    temperature: 0.4,
  });

  return {
    headline: narrative.headline ?? "",
    summary: narrative.summary ?? "",
    notes: narrative.notes ?? [],
    symptomLinks: narrative.symptomLinks ?? [],
    protocol: (narrative.protocol ?? []).slice(0, 5),
  };
}
