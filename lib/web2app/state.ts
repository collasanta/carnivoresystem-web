"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Answers } from "./quiz";
import type { PlanId } from "./plans";

/**
 * Funnel state in localStorage (`leo_w2a`), so a refresh or a back button never loses the quiz. One object:
 * answers, the step reached, the attribution captured on the first visit, the lead and the purchase.
 */
export type Attribution = {
  fbclid?: string;
  fbc?: string;
  fbp?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_url?: string;
  referrer?: string;
  visitor_id?: string;
};

export type FunnelState = {
  v: 1;
  answers: Answers;
  step: number;
  startedAt?: number;
  attribution: Attribution;
  email?: string;
  leadId?: string;
  /** e-mail step opt-in, resent when the lead is updated after the pledge */
  marketingOk?: boolean;
  plan?: PlanId;
  purchase?: { id: string; token: string; plan: PlanId };
};

const KEY = "leo_w2a";
const EMPTY: FunnelState = { v: 1, answers: {}, step: 0, attribution: {} };

export function loadState(): FunnelState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const s = JSON.parse(raw) as FunnelState;
    return s && s.v === 1 ? { ...EMPTY, ...s } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

export function saveState(s: FunnelState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode: the funnel still works, it just won't survive a refresh */
  }
}

export function resetState() {
  const next = { ...EMPTY, attribution: loadState().attribution };
  saveState(next);
  cache = next;
  listeners.forEach((l) => l());
}

// One in-memory copy shared by every useFunnel() on the page, synced to localStorage on each update.
let cache: FunnelState | null = null;
const listeners = new Set<() => void>();

function snapshot(): FunnelState {
  if (cache) return cache;
  // first read in this page load: also capture first-touch attribution from the URL
  const s = loadState();
  s.attribution = captureAttribution(s.attribution);
  saveState(s);
  cache = s;
  return s;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** React hook over the stored state. `ready` is false during SSR / before hydration (render nothing stateful then). */
export function useFunnel() {
  const state = useSyncExternalStore(subscribe, snapshot, () => null);
  const update = useCallback((patch: Partial<FunnelState> | ((s: FunnelState) => Partial<FunnelState>)) => {
    const prev = snapshot();
    const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) };
    saveState(next);
    cache = next;
    listeners.forEach((l) => l());
  }, []);
  return { state: state ?? EMPTY, ready: state !== null, update };
}

function cookie(name: string): string | undefined {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  }
}

/**
 * First-touch attribution, same rules as the landings (app/_lp/landing.ts): fbc = fb.1.<click ms>.<fbclid> unless the
 * pixel's `_fbc` cookie already holds this click; utm_* from the URL. Later visits only fill gaps, except a new
 * fbclid (a new ad click), which replaces the click.
 */
export function captureAttribution(prev: Attribution): Attribution {
  const q = new URLSearchParams(location.search);
  const a: Attribution = { ...prev };
  const fbclid = q.get("fbclid");
  if (fbclid && fbclid !== prev.fbclid) {
    a.fbclid = fbclid;
    const c = cookie("_fbc");
    a.fbc = c && c.split(".").slice(3).join(".") === fbclid ? c : `fb.1.${Date.now()}.${fbclid}`;
  }
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
    const v = q.get(k);
    if (v && (!a[k] || fbclid)) a[k] = v.slice(0, 200);
  }
  if (!a.landing_url) a.landing_url = location.href.slice(0, 500);
  if (!a.referrer && document.referrer) a.referrer = document.referrer.slice(0, 500);
  if (!a.visitor_id) {
    try {
      a.visitor_id = localStorage.getItem("lp_vid") ?? uuid();
      localStorage.setItem("lp_vid", a.visitor_id);
    } catch {
      a.visitor_id = uuid();
    }
  }
  return a;
}

/** fbc/fbp right now (the pixel may have set the cookies after the first capture). */
export function metaCookies(a: Attribution): { fbc?: string; fbp?: string } {
  return { fbc: cookie("_fbc") ?? a.fbc, fbp: cookie("_fbp") ?? a.fbp };
}
