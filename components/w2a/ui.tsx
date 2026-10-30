"use client";

import Image from "next/image";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { initAnalytics } from "@/lib/web2app/analytics";
import { initPixel } from "@/lib/web2app/pixel";

/**
 * Building blocks of the funnel, in the Porcelain palette of the rest of the site (cream ground, white cards,
 * espresso CTA, walnut accent). Mobile first: one column, max 480 px, the main button pinned to the bottom.
 */

/** Mounted on every funnel page: loads the pixel (leodiet.com only; attribution is captured by useFunnel). */
export function FunnelBoot() {
  useEffect(() => {
    initPixel();
    initAnalytics();
  }, []);
  return null;
}

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn("mx-auto flex min-h-svh w-full max-w-[480px] flex-col px-4 pb-32", className)}>{children}</main>;
}

export function TopBar({ progress, onBack }: { progress?: number; onBack?: () => void }) {
  return (
    <div className="sticky top-0 z-10 -mx-4 bg-cream/95 px-4 pt-3 pb-3 backdrop-blur">
      <div className="flex h-9 items-center justify-between">
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="Voltar" className="-ml-2 flex size-9 items-center justify-center rounded-full text-ink hover:bg-tint">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        ) : (
          <span className="size-9" />
        )}
        <span className="flex items-center gap-2">
          <Image src="/leo-icon.png" alt="" width={24} height={24} className="rounded-[7px]" />
          <span className="text-[13px] font-extrabold tracking-[-0.01em]">LeoDiet</span>
        </span>
        <span className="size-9" />
      </div>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="h-full rounded-full bg-walnut transition-[width] duration-300 ease-out" style={{ width: `${Math.max(4, progress * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

export function Title({ children, sub, className }: { children: React.ReactNode; sub?: React.ReactNode; className?: string }) {
  return (
    <header className={cn("mt-5 mb-6 text-center", className)}>
      <h1 className="text-[clamp(22px,6.4vw,28px)] leading-[1.15] font-extrabold tracking-[-0.025em] text-balance">{children}</h1>
      {sub && <p className="mx-auto mt-2.5 max-w-[400px] text-[14px] leading-relaxed text-mute text-balance">{sub}</p>}
    </header>
  );
}

export function Option({
  selected,
  onClick,
  children,
  hint,
  multi,
  emoji,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  hint?: string;
  multi?: boolean;
  emoji?: string;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex min-h-[58px] w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left shadow-[0_1px_2px_rgba(33,26,18,0.04)] transition-[border-color,box-shadow,scale] duration-150 active:scale-[0.985]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta",
        selected ? "border-cta shadow-[0_0_0_1px_var(--color-cta)]" : "border-line hover:border-linex",
      )}
    >
      {emoji && <span aria-hidden="true" className="flex size-9 flex-none items-center justify-center rounded-full bg-tint text-[18px]">{emoji}</span>}
      <span className="flex-1">
        <span className={cn("block text-[15px] leading-snug text-ink", selected && "font-bold")}>{children}</span>
        {hint && <span className="mt-0.5 block text-[12.5px] leading-relaxed text-mute">{hint}</span>}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-[22px] flex-none items-center justify-center border-[1.5px] transition-colors",
          multi ? "rounded-md" : "rounded-full",
          selected ? "border-cta bg-cta text-white" : "border-linex bg-card",
        )}
      >
        {selected && (
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
      </span>
    </button>
  );
}

export function Cta({
  children,
  onClick,
  disabled,
  busy,
  type = "button",
  sticky = true,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  type?: "button" | "submit";
  sticky?: boolean;
}) {
  const btn = (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-cta text-[16px] font-bold text-white shadow-[0_10px_30px_rgba(37,30,23,0.25)] transition hover:bg-ctah active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
    >
      {busy ? <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-label="Carregando" /> : children}
    </button>
  );
  if (!sticky) return btn;
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-cream via-cream to-cream/0 px-4 pt-6 pb-[max(16px,env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-[448px]">{btn}</div>
    </div>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-3xl border border-line bg-card p-5 shadow-[0_12px_32px_rgba(33,26,18,0.06)]", className)}>{children}</div>;
}

export function Disclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-center text-[11.5px] leading-relaxed text-faint", className)}>
      O LeoDiet é um diário de hábitos, não orientação médica. Estimativas não são promessa de resultado. Se você tem pressão alta, problema nos rins ou no
      coração, está grávida ou usa medicação contínua, fale com seu médico antes de mudar a dieta ou aumentar o sal.
    </p>
  );
}

/** Renders only the stores it is given. */
export function StoreButtons({ appStore, playStore, onClick }: { appStore?: string; playStore?: string; onClick?: (store: "app_store" | "google_play") => void }) {
  const cls =
    "flex h-14 flex-1 items-center justify-center gap-2.5 rounded-2xl bg-cta px-4 text-white shadow-[0_10px_30px_rgba(37,30,23,0.2)] transition hover:bg-ctah";
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {appStore && (
        <a href={appStore} className={cls} onClick={() => onClick?.("app_store")}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.8 1.3 10.3.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.8-4.2zM14 4.9c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z" />
        </svg>
        <span className="text-left leading-tight">
          <small className="block text-[11px] opacity-80">Baixar na</small>
          <b className="text-[17px]">App Store</b>
        </span>
        </a>
      )}
      {playStore && (
        <a href={playStore} className={cls} onClick={() => onClick?.("google_play")}>
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 2.6 13.4 12 4 21.4c-.3-.2-.5-.6-.5-1V3.6c0-.4.2-.8.5-1z" fill="#00a0ff" />
          <path d="M16.6 8.8 13.4 12 4 2.6c.3-.2.8-.2 1.2 0l11.4 6.2z" fill="#00dc6e" />
          <path d="M16.6 15.2 5.2 21.4c-.4.2-.9.2-1.2 0l9.4-9.4 3.2 3.2z" fill="#ff3a44" />
          <path d="m20.2 10.8-3.6-2L13.4 12l3.2 3.2 3.6-2c.9-.5.9-1.9 0-2.4z" fill="#ffd200" />
        </svg>
        <span className="text-left leading-tight">
          <small className="block text-[11px] opacity-80">Disponível no</small>
          <b className="text-[17px]">Google Play</b>
        </span>
        </a>
      )}
    </div>
  );
}
