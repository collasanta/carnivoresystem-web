import { cn } from "@/lib/utils";

type LinkModuleProps = {
  /** Module index, e.g. "CS.01" */
  index: string;
  name: string;
  detail: string;
  href: string;
  /** Renders the "In dev" state: dimmed, unclickable, out of the tab order. */
  dev?: boolean;
};

export function LinkModule({
  index,
  name,
  detail,
  href,
  dev = false,
}: LinkModuleProps) {
  return (
    <a
      href={href}
      aria-disabled={dev || undefined}
      tabIndex={dev ? -1 : undefined}
      className={cn(
        "flex items-center gap-3.5 border border-edge border-l-[3px] border-l-blood bg-smoke py-4 pr-4 pl-3.5 text-bone no-underline",
        "transition-[border-color,background-color,translate] duration-[180ms] ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
        dev
          ? "cursor-default opacity-55"
          : "hover:translate-x-[3px] hover:border-edge-hover hover:border-l-ember hover:bg-mod-hover focus-visible:translate-x-[3px] focus-visible:border-edge-hover focus-visible:border-l-ember focus-visible:bg-mod-hover",
      )}
    >
      <span className="w-[52px] flex-none text-[11px] tracking-[0.1em] text-salt">
        {index}
      </span>
      <span className="flex-1 font-display text-[15px] leading-[1.2] tracking-[0.04em] uppercase">
        {name}
        <small className="mt-[3px] block font-mono text-[10px] font-normal tracking-[0.14em] text-salt uppercase">
          {detail}
        </small>
      </span>
      <span
        className={cn(
          "flex-none border px-2 py-1 text-[9px] font-bold tracking-[0.16em] uppercase",
          dev ? "border-salt text-salt" : "border-ember text-ember",
        )}
      >
        {dev ? "In dev" : "Live"}
      </span>
    </a>
  );
}
