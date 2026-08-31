import { cn } from "@/lib/utils";
import type { Band, NutrientResult } from "@/lib/analyzer/types";

const TRACK: Record<Band, string> = {
  deficient: "bg-ember",
  low: "bg-warn",
  adequate: "bg-good",
  high: "bg-warn",
  excess: "bg-ember",
};

export const BAND_LABEL: Record<Band, string> = {
  deficient: "Deficient",
  low: "Low",
  adequate: "On target",
  high: "High",
  excess: "Over the limit",
};

export const BAND_TEXT: Record<Band, string> = {
  deficient: "text-ember",
  low: "text-warn",
  adequate: "text-good",
  high: "text-warn",
  excess: "text-ember",
};

/**
 * Intake against target on a track where the target sits at the halfway mark.
 *
 * Fixing the target at 50% means every bar in the report is read the same way —
 * left of centre is short, right of centre is over — which a per-nutrient axis
 * would destroy, since the numbers span 0.9mg of copper to 4,000mg of sodium.
 * Anything at or beyond twice the target pins to the end and says so, rather
 * than compressing every other bar to accommodate one outlier.
 */
export function NutrientBar({ result }: { result: NutrientResult }) {
  const pinned = result.ratio >= 2;
  const position = Math.min(result.ratio, 2) / 2;
  const percent = Math.max(1.5, position * 100);

  // The ideal window is 80%–150% of target, so 40%–75% of the track.
  const idealStart = 40;
  const idealWidth = 35;

  const value = `${result.intake}${result.unit === "IU" ? " IU" : result.unit}`;
  const target = `${result.target}${result.unit === "IU" ? " IU" : result.unit}`;

  return (
    <div>
      <div
        role="meter"
        aria-valuenow={Math.round(result.ratio * 100)}
        aria-valuemin={0}
        aria-valuetext={`${value} of a ${target} target — ${BAND_LABEL[result.band]}`}
        aria-label={result.label}
        className="relative h-[22px] w-full border border-edge bg-char"
      >
        {/* The ideal window, drawn under the fill so the fill reads on top. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 border-x border-dashed border-ash/70 bg-smoke"
          style={{ left: `${idealStart}%`, width: `${idealWidth}%` }}
        />
        <div
          aria-hidden="true"
          className={cn("absolute inset-y-[3px] left-[3px] opacity-90", TRACK[result.band])}
          style={{ width: `calc(${percent}% - 6px)`, minWidth: "3px" }}
        />
        {pinned && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 font-mono text-[10px] font-bold text-char"
          >
            &gt;2&times;
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-3 text-[11px] tracking-[0.02em]">
        <span className="text-bone">
          {value}
          <span className="text-salt"> of {target}</span>
        </span>
        <span className={cn("font-bold tracking-[0.1em] uppercase", BAND_TEXT[result.band])}>
          {BAND_LABEL[result.band]}
        </span>
      </div>
    </div>
  );
}
