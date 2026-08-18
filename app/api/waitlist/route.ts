import { NextResponse } from "next/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const json = (body: object, status: number) => NextResponse.json(body, { status });

/**
 * Sends the address to whichever provider is configured, in preference order.
 * Kit keeps the list somewhere you can broadcast a launch series from;
 * Formspree just collects submissions. Set one of them in Vercel → Settings →
 * Environment Variables and this route starts working — no code change.
 */
async function subscribe(email: string): Promise<{ ok: boolean; error?: string }> {
  const { KIT_API_KEY, KIT_FORM_ID, FORMSPREE_FORM_ID } = process.env;

  if (KIT_API_KEY && KIT_FORM_ID) {
    const res = await fetch(`https://api.convertkit.com/v3/forms/${KIT_FORM_ID}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: KIT_API_KEY, email }),
    });
    return res.ok ? { ok: true } : { ok: false, error: `Kit responded ${res.status}` };
  }

  if (FORMSPREE_FORM_ID) {
    const res = await fetch(`https://formspree.io/f/${FORMSPREE_FORM_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email }),
    });
    return res.ok ? { ok: true } : { ok: false, error: `Formspree responded ${res.status}` };
  }

  return { ok: false, error: "No waitlist provider configured." };
}

export async function POST(request: Request) {
  let body: { email?: unknown; company?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Expected JSON." }, 400);
  }

  // Bots fill every field they find; the honeypot is invisible to people.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return json({ ok: true }, 200);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL.test(email)) {
    return json({ error: "That doesn't look like an email address." }, 400);
  }

  const result = await subscribe(email);
  if (!result.ok) {
    console.error("[waitlist]", result.error, "—", email);
    return json({ error: "Couldn't save that right now. Try again shortly." }, 502);
  }

  return json({ ok: true }, 200);
}
