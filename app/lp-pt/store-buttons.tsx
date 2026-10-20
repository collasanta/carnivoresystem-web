"use client";

import { track } from "@vercel/analytics";

// Links de campanha: Meta Ads Brasil (App Analytics › Campaigns `ct`, Play Console › Aquisição `utm_source`)
const APP_STORE = "https://apps.apple.com/app/apple-store/id6808867448?pt=128456926&ct=meta_br&mt=8";
const PLAY_STORE = "https://play.google.com/store/apps/details?id=dev.thirtythreeweb.leo&referrer=utm_source%3Dmeta_br";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/** Clique numa loja = conversão (evento Lead do pixel). Espera o pixel sair antes de abrir a loja. */
function go(e: React.MouseEvent<HTMLAnchorElement>, store: "app_store" | "google_play") {
  const href = e.currentTarget.href;
  track("lp_pt_store_click", { store });
  if (!window.fbq) return;
  e.preventDefault();
  window.fbq("track", "Lead", { content_name: store });
  window.setTimeout(() => (window.location.href = href), 300);
}

const btn =
  "inline-flex min-w-[220px] items-center justify-center gap-3 rounded-2xl bg-cta px-5 py-3 text-white shadow-[0_10px_30px_rgba(37,30,23,0.25)] transition hover:bg-ctah";

export function StoreButtons() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <a href={APP_STORE} onClick={(e) => go(e, "app_store")} className={btn}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.8 1.3 10.3.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.8-4.2zM14 4.9c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z" /></svg>
        <span className="text-left leading-tight">
          <span className="block text-[11px] opacity-80">Baixar na</span>
          <span className="block text-[18px] font-bold">App Store</span>
        </span>
      </a>
      <a href={PLAY_STORE} onClick={(e) => go(e, "google_play")} className={btn}>
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 2.6 13.4 12 4 21.4c-.3-.2-.5-.6-.5-1V3.6c0-.4.2-.8.5-1z" fill="#00a0ff" />
          <path d="M16.6 8.8 13.4 12 4 2.6c.3-.2.8-.2 1.2 0l11.4 6.2z" fill="#00dc6e" />
          <path d="M16.6 15.2 5.2 21.4c-.4.2-.9.2-1.2 0l9.4-9.4 3.2 3.2z" fill="#ff3a44" />
          <path d="m20.2 10.8-3.6-2L13.4 12l3.2 3.2 3.6-2c.9-.5.9-1.9 0-2.4z" fill="#ffd200" />
        </svg>
        <span className="text-left leading-tight">
          <span className="block text-[11px] opacity-80">Disponível no</span>
          <span className="block text-[18px] font-bold">Google Play</span>
        </span>
      </a>
    </div>
  );
}
