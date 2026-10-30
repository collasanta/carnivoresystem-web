/** Server-side PostHog capture for the funnel (same Leo project key as lib/web2app/analytics.ts). Never throws. */
const KEY = "phc_zjKJutnPszYRBzo7gHxkeskro74gQ5cNC7Bc5f9hvFLk";

export async function captureServer(distinctId: string, event: string, properties: Record<string, unknown>) {
  await fetch("https://us.i.posthog.com/capture/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: KEY, event, distinct_id: distinctId, properties: { funnel: "w2a", ...properties } }),
  }).catch(() => {});
}
