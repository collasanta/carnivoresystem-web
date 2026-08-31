"use client";

import type { Assessment, NutrientId } from "@/lib/analyzer/types";
import { BAND_LABEL, BAND_TEXT } from "./nutrient-bar";
import { cn } from "@/lib/utils";

/**
 * The reveal moment — and, later, the paywall. It shows exactly enough to
 * make the full report feel owed: the score, the counts, ONE open surprise,
 * and the symptom hook without its answer. Today the CTA is free; the Stripe
 * gate slots in here without touching anything upstream.
 */
export function Teaser({ assessment, onReveal }: { assessment: Assessment; onReveal: () => void }) {
  const { score, nutrients, symptomInsights, surpriseId } = assessment;

  const counts = {
    deficient: nutrients.filter((n) => n.band === "deficient").length,
    over: nutrients.filter((n) => n.band === "excess" || n.band === "high").length,
    adequate: nutrients.filter((n) => n.band === "adequate").length,
  };

  const surprise = surpriseId ? nutrients.find((n) => n.id === surpriseId) : null;
  const electrolytes = (["sodium", "potassium", "magnesium"] as NutrientId[])
    .map((id) => nutrients.find((n) => n.id === id)!)
    .filter(Boolean);
  const hooked = symptomInsights.filter((s) => s.matchedCauses.length > 0);

  const tone = score.value >= 75 ? "text-good" : score.value >= 50 ? "text-warn" : "text-bad";
  const verdict =
    score.value >= 75
      ? "Solid — a few levers left to pull"
      : score.value >= 50
        ? "Workable, with real gaps to close"
        : "Running on borrowed reserves";

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 text-center duration-500">
      <p className="text-[10.5px] font-bold tracking-[0.22em] text-walnut uppercase">
        Your Carnivore Score
      </p>

      <div className="mt-3 flex items-baseline justify-center gap-2">
        <span className={cn("text-[84px] leading-none font-extrabold tracking-[-0.04em]", tone)}>
          {score.value}
        </span>
        <span className="text-[22px] font-bold text-faint">/100</span>
      </div>
      <p className="mt-1 text-[13.5px] font-semibold text-ink">{verdict}</p>

      <div className="mx-auto mt-6 grid max-w-[400px] grid-cols-3 gap-2">
        <div className="rounded-xl border border-line bg-card px-3 py-3">
          <div className="text-[20px] font-extrabold text-bad">{counts.deficient}</div>
          <div className="mt-0.5 text-[9px] font-semibold tracking-[0.12em] text-mute uppercase">
            Deficient
          </div>
        </div>
        <div className="rounded-xl border border-line bg-card px-3 py-3">
          <div className="text-[20px] font-extrabold text-warn">{counts.over}</div>
          <div className="mt-0.5 text-[9px] font-semibold tracking-[0.12em] text-mute uppercase">
            Over limit
          </div>
        </div>
        <div className="rounded-xl border border-line bg-card px-3 py-3">
          <div className="text-[20px] font-extrabold text-good">{counts.adequate}</div>
          <div className="mt-0.5 text-[9px] font-semibold tracking-[0.12em] text-mute uppercase">
            On target
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 max-w-[400px] rounded-2xl border border-line bg-card p-3.5 shadow-[0_1px_3px_rgba(33,26,18,0.05)]">
        <p className="text-[9.5px] font-bold tracking-[0.16em] text-mute uppercase">Electrolytes</p>
        <div className="mt-2 flex items-center justify-center gap-2">
          {electrolytes.map((n) => (
            <span
              key={n.id}
              className="flex-1 rounded-xl bg-tint px-2 py-2 text-center"
            >
              <span className="block text-[10.5px] font-semibold text-ink">
                {n.id === "sodium" ? "Sodium" : n.id === "potassium" ? "Potassium" : "Magnesium"}
              </span>
              <span className={cn("block text-[9.5px] font-bold tracking-[0.06em] uppercase", BAND_TEXT[n.band])}>
                {BAND_LABEL[n.band]}
              </span>
            </span>
          ))}
        </div>
      </div>

      {surprise && (
        <div className="mx-auto mt-4 max-w-[400px] rounded-2xl border border-walnut/40 bg-card p-4 text-left shadow-[0_1px_3px_rgba(33,26,18,0.05)]">
          <p className="text-[9.5px] font-bold tracking-[0.16em] text-walnut uppercase">
            Your biggest surprise
          </p>
          <p className="mt-1.5 text-[14px] leading-snug font-bold text-ink">
            {surprise.label} is at {Math.max(1, Math.round(surprise.ratio * 100))}% of target
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-mute">{surprise.why}</p>
        </div>
      )}

      {hooked.length > 0 && (
        <p className="mx-auto mt-4 max-w-[380px] text-[13px] leading-relaxed text-ink">
          You reported <span className="font-bold">{hooked[0].symptom.toLowerCase()}</span>
          {hooked.length > 1 ? ` and ${hooked.length - 1} more` : ""} — it lines up with{" "}
          <span className="font-bold">
            {hooked[0].matchedCauses.length} thing{hooked[0].matchedCauses.length > 1 ? "s" : ""}
          </span>{" "}
          we found in your numbers.
        </p>
      )}

      <div className="sticky bottom-0 mt-7 bg-cream/95 py-3 backdrop-blur-sm">
        <button
          type="button"
          onClick={onReveal}
          className="w-full rounded-full bg-cta px-6 py-4 text-[12.5px] font-bold tracking-[0.12em] text-card uppercase shadow-[0_4px_14px_rgba(33,26,18,0.18)] transition-[background-color,scale] duration-150 hover:bg-ctah active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
        >
          See my full report
        </button>
        <p className="mt-2 text-center text-[10.5px] text-faint">
          Nutrient by nutrient, with the food that fixes each gap. Free while in beta.
        </p>
      </div>
    </div>
  );
}
