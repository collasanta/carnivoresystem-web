import { cn } from "@/lib/utils";

type LinkModuleProps = {
  name: string;
  detail: string;
  href: string;
  /** Renders the "In dev" state: dimmed, unclickable, out of the tab order. */
  dev?: boolean;
  /** Overrides the chip label. Defaults to "Live", or "In dev" when `dev`. */
  chip?: string;
};

export function LinkModule({ name, detail, href, dev = false, chip }: LinkModuleProps) {
  return (
    <a
      href={href}
      aria-disabled={dev || undefined}
      tabIndex={dev ? -1 : undefined}
      className={cn(
        "flex items-center gap-4 rounded-2xl border border-line bg-card p-4 no-underline shadow-[0_1px_2px_rgba(33,26,18,0.04)]",
        "transition-[border-color,box-shadow,translate] duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
        dev
          ? "cursor-default opacity-55"
          : "hover:-translate-y-[1px] hover:border-linex hover:shadow-[0_4px_12px_rgba(33,26,18,0.07)]",
      )}
    >
      <span className="flex-1">
        <span className="block text-[15px] font-bold tracking-[-0.01em] text-ink">{name}</span>
        <span className="mt-0.5 block text-[12px] text-mute">{detail}</span>
      </span>
      <span
        className={cn(
          "flex-none rounded-full border px-3 py-1 text-[10px] font-bold tracking-[0.08em] uppercase",
          dev ? "border-line text-mute" : "border-cta bg-cta text-card",
        )}
      >
        {chip ?? (dev ? "In dev" : "Live")}
      </span>
    </a>
  );
}
