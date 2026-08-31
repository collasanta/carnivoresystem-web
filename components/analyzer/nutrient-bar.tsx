import { cn } from "@/lib/utils";
import type { Band, NutrientResult } from "@/lib/analyzer/types";

const TRACK: Record<Band, string> = {
  deficient: "bg-bad",
  low: "bg-warn",
  adequate: "bg-good",
  high: "bg-warn",
  excess: "bg-bad",
};

export const BAND_LABEL: Record<Band, string> = {
  deficient: "Deficient",
  low: "Low",
  adequate: "On target",
  high: "High",
  excess: "Over the limit",
};

export const BAND_TEXT: Record<Band, string> = {
  deficient: "text-bad",
  low: "text-warn",
  adequate: "text-good",
  high: "text-warn",
  excess: "text-bad",
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
  const percent = Math.max(2, position * 100);

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
        className="relative h-[12px] w-full overflow-hidden rounded-full bg-line"
      >
        {/* The ideal window, drawn under the fill so the fill reads on top. */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 bg-[#ece2cf]"
          style={{ left: `${idealStart}%`, width: `${idealWidth}%` }}
        />
        <div
          aria-hidden="true"
          className={cn("absolute inset-y-0 left-0 rounded-full", TRACK[result.band])}
          style={{ width: `${percent}%`, minWidth: "8px" }}
        />
        {pinned && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 right-2 -translate-y-1/2 text-[9px] font-bold text-card"
          >
            &gt;2&times;
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-3 text-[11.5px]">
        <span className="font-medium text-ink">
          {value}
          <span className="font-normal text-mute"> of {target}</span>
        </span>
        <span className={cn("text-[10.5px] font-bold tracking-[0.08em] uppercase", BAND_TEXT[result.band])}>
          {BAND_LABEL[result.band]}
        </span>
      </div>
    </div>
  );
}
