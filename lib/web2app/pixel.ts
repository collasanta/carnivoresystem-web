"use client";

/**
 * Meta Pixel for the funnel (dataset "leodiet" 1370037514985006, same as the landings in app/_lp/landing.ts).
 *
 * The pixel only loads on leodiet.com. On Vercel previews and localhost it stays off (events go to the console
 * as `[pixel]`), so testing never pollutes the dataset the running Sales campaign optimises on. To test the pixel on a
 * preview anyway, open any funnel URL once with `?pixel=1` (kept for the tab session) and use Events Manager ›
 * Test events.
 *
 * Event map (docs/web2app.md):
 *   ViewContent       quiz start
 *   QuizQuarter / QuizHalf / QuizThreeQuarters / QuizComplete / PlanView   (custom, step ids only, no answers)
 *   Lead              email captured           eventID lead_<leadId>
 *   InitiateCheckout  paywall shown
 *   AddPaymentInfo    plan chosen → checkout
 *   Purchase          success page              eventID w2a_<purchaseId> (= CAPI event_id → deduplicated)
 * Quiz answers are health data: never put them in event parameters.
 */
export const META_PIXEL_ID = "1370037514985006";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let enabled: boolean | null = null;

export function pixelEnabled(): boolean {
  if (enabled !== null) return enabled;
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(location.search).get("pixel") === "1") sessionStorage.setItem("w2a_pixel", "1");
  } catch {
    /* ignore */
  }
  let forced = false;
  try {
    forced = sessionStorage.getItem("w2a_pixel") === "1";
  } catch {
    /* ignore */
  }
  enabled = location.hostname.endsWith("leodiet.com") || forced;
  return enabled;
}

/** Loads fbevents.js once and sends PageView. Safe to call on every page. */
export function initPixel() {
  if (!pixelEnabled() || window.fbq) return;
  /* eslint-disable */
  (function (f: any, b: Document, e: string, v: string) {
    if (f.fbq) return;
    const n: any = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const t = b.createElement(e) as HTMLScriptElement;
    t.async = true;
    t.src = v;
    const s = b.getElementsByTagName(e)[0];
    s.parentNode!.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  window.fbq!("init", META_PIXEL_ID);
  window.fbq!("track", "PageView");
}

type Params = Record<string, string | number | string[] | undefined>;

export function track(event: string, params?: Params, eventId?: string) {
  if (!pixelEnabled()) {
    console.info("[pixel]", event, params ?? {}, eventId ?? "");
    return;
  }
  initPixel();
  window.fbq!("track", event, params ?? {}, eventId ? { eventID: eventId } : undefined);
}

export function trackCustom(event: string, params?: Params) {
  if (!pixelEnabled()) {
    console.info("[pixel] custom", event, params ?? {});
    return;
  }
  initPixel();
  window.fbq!("trackCustom", event, params ?? {});
}

/** Fire an event once per browser (keyed), e.g. ViewContent on quiz start, Purchase on the success page. */
export function once(key: string, fn: () => void) {
  try {
    const k = `w2a_once_${key}`;
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, "1");
  } catch {
    /* no storage: fire anyway */
  }
  fn();
}
