"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/analyzer", label: "Diet Analyzer" },
  { href: "/app", label: "Carnivore System App" },
  { href: "https://www.instagram.com/carnivoresystem", label: "Instagram" },
  { href: "https://www.tiktok.com/@carnivoresystem", label: "TikTok" },
];

/**
 * The fixed app bar: wordmark left, hamburger right, a slide-in drawer behind
 * it. Global across the site, so the quiz reads as an app rather than a page.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-line/70 bg-cream/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between gap-3 px-4">
          <Link
            href="/"
            className="text-[15px] font-extrabold tracking-[-0.02em] text-ink no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            The Carnivore System
          </Link>
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="flex size-9 flex-none items-center justify-center rounded-full border border-line bg-card text-ink shadow-[0_1px_2px_rgba(33,26,18,0.04)] transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
          >
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 8h16M4 16h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Drawer */}
      <div
        className={`fixed inset-0 z-50 transition-[visibility] ${open ? "visible" : "invisible"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-ink/40 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
        />
        <div
          role="dialog"
          aria-label="Menu"
          className={`absolute top-0 right-0 flex h-full w-[290px] flex-col bg-cream p-5 shadow-[-8px_0_30px_rgba(33,26,18,0.15)] transition-transform duration-250 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-extrabold tracking-[-0.01em]">Menu</span>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="flex size-9 items-center justify-center rounded-full border border-line bg-card transition-transform duration-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
            >
              <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <nav className="mt-6 flex flex-col gap-1">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-[14px] font-semibold text-ink no-underline transition-colors duration-150 hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <p className="mt-auto text-[10.5px] leading-relaxed text-mute">
            Free tools. No account, no email — your answers are processed to build your report and
            never stored.
          </p>
        </div>
      </div>
    </>
  );
}
