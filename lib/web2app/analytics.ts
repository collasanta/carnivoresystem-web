"use client";

import posthog from "posthog-js";
import { pixelEnabled } from "./pixel";

/**
 * PostHog for the funnel (Leo project, same key as the landings in app/_lp/landing.ts), with session recordings.
 * Same gate as the pixel: on only on leodiet.com, or on a preview opened once with `?pixel=1`.
 * Every input is masked in recordings (e-mail, name, CPF); quiz answers are taps, so they show, but never go in
 * event properties.
 *
 * Funnel events (filter recordings by them):
 *   w2a_quiz_start → w2a_quiz_step {step, index} → w2a_quiz_complete → w2a_plan_view → w2a_lead
 *   → w2a_paywall_view → w2a_plan_selected / w2a_method_selected → w2a_checkout_started {plan, method, value}
 *   → w2a_checkout_error {reason} | w2a_pix_shown → w2a_pix_copied | w2a_card_opened
 *   → w2a_pix_expired | w2a_card_refused | w2a_purchase (success page) → w2a_store_click {store}
 * The server also sends w2a_paid (lib/web2app/server/fulfill.ts) with the lead id as distinct id, so a Pix paid
 * after the buyer closed the tab still lands on their person.
 */
const KEY = "phc_zjKJutnPszYRBzo7gHxkeskro74gQ5cNC7Bc5f9hvFLk";
let started = false;

export function initAnalytics() {
  if (started || !pixelEnabled()) return;
  started = true;
  posthog.init(KEY, {
    api_host: "https://us.i.posthog.com",
    ui_host: "https://us.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    disable_session_recording: false,
    session_recording: { maskAllInputs: true },
  });
  posthog.register({ funnel: "w2a" });
}

type Props = Record<string, string | number | boolean | null | undefined>;

export function capture(event: string, props?: Props) {
  if (!started) {
    if (typeof window !== "undefined" && !pixelEnabled()) console.info("[posthog]", event, props ?? {});
    return;
  }
  posthog.capture(event, props);
}

/** Ties the session to the lead, so the server's w2a_paid and the app can find the same person. */
export function identifyLead(leadId: string, email?: string) {
  if (!started) return;
  posthog.identify(leadId, email ? { email } : undefined);
}
