import { insert, update, eq } from "@/lib/web2app/server/db";
import { EMAIL, FBC_RE, FBP_RE, clientIp, json, match, str, userAgent } from "@/lib/web2app/server/http";

/**
 * POST /api/w2a/lead — the e-mail step. Saves the lead with the quiz answers, the plan the person saw and the
 * attribution (fbclid / fbc / fbp / utm_*). Sending `leadId` again (same browser, e-mail edited) updates that row.
 * Honeypot: a filled `company` gets a fake success and stores nothing.
 */
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ error: "json" }, 400);
  }
  if (b.company) return json({ leadId: crypto.randomUUID() });
  const email = str(b.email, 254)?.toLowerCase();
  if (!email || !EMAIL.test(email)) return json({ error: "email" }, 400);
  const a = (b.attribution && typeof b.attribution === "object" ? b.attribution : {}) as Record<string, unknown>;
  const answers = b.answers && typeof b.answers === "object" ? b.answers : {};
  if (JSON.stringify(answers).length > 8000) return json({ error: "answers" }, 400);
  const row = {
    email,
    name: str(b.name, 60),
    locale: str(b.locale, 10) ?? "pt-BR",
    quiz_version: str(b.quizVersion, 20),
    answers,
    plan: b.plan && typeof b.plan === "object" && JSON.stringify(b.plan).length < 8000 ? b.plan : null,
    fbclid: str(a.fbclid, 500),
    fbc: match(a.fbc, FBC_RE),
    fbp: match(a.fbp, FBP_RE),
    utm_source: str(a.utm_source),
    utm_medium: str(a.utm_medium),
    utm_campaign: str(a.utm_campaign),
    utm_content: str(a.utm_content),
    utm_term: str(a.utm_term),
    landing_url: str(a.landing_url, 500),
    referrer: str(a.referrer, 500),
    visitor_id: str(a.visitor_id, 64),
    client_ip: clientIp(req),
    user_agent: userAgent(req),
    marketing_ok: b.marketingOk === true,
  };
  try {
    const leadId = str(b.leadId, 40);
    if (leadId && /^[0-9a-f-]{36}$/i.test(leadId)) {
      const rows = await update<{ id: string }>("web_leads", eq("id", leadId), row);
      if (rows[0]) return json({ leadId: rows[0].id });
    }
    const lead = await insert<{ id: string }>("web_leads", row);
    return json({ leadId: lead.id });
  } catch (e) {
    console.error("[w2a/lead]", e);
    return json({ error: "server" }, 500);
  }
}
