import { activationUrl, appStoreUrl, deepLink, formatCode, playStoreUrl } from "../links";
import { brl, planById } from "../plans";

/**
 * "Here is your code" e-mail through Resend (domain leodiet.com is verified there; same account the app's login
 * e-mails use). Env: RESEND_API_KEY, optional W2A_EMAIL_FROM (default "LeoDiet <leo@leodiet.com>").
 * Without the key the route answers `email: "not_configured"` and the success page still shows the code.
 */
export const emailConfigured = () => !!process.env.RESEND_API_KEY;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function sendCodeEmail(opts: { to: string; code: string; plan: string; amountCents: number; name?: string | null; origin: string; test: boolean }): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "not_configured" };
  const code = formatCode(opts.code);
  const plan = planById(opts.plan);
  const hello = opts.name ? `Oi, ${esc(opts.name)}!` : "Oi!";
  const btn = (href: string, label: string) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:4px 6px 4px 0;padding:12px 18px;border-radius:12px;background:#251e17;color:#fff;text-decoration:none;font-weight:700;font-size:15px">${label}</a>`;
  const html = `<!doctype html><html><body style="margin:0;background:#fcf8f1;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#211a12">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#93887a;margin:0">LeoDiet</p>
<h1 style="font-size:24px;margin:8px 0 12px">${hello} Seu acesso está pronto.</h1>
<p style="font-size:15px;line-height:1.6;margin:0 0 16px">Obrigado pela compra${plan ? ` do plano <b>${esc(plan.title)}</b> (${brl(opts.amountCents)})` : ""}. Para liberar o LeoDiet Pro, baixe o app e use este código:</p>
<div style="font-family:Menlo,Consolas,monospace;font-size:26px;font-weight:800;letter-spacing:.08em;background:#fff;border:1px solid #e2d8c6;border-radius:14px;padding:16px;text-align:center">${code}</div>
<p style="font-size:15px;line-height:1.6;margin:20px 0 8px"><b>1.</b> Baixe o app:</p>
<div>${btn(appStoreUrl(), "App Store (iPhone)")}${btn(playStoreUrl(opts.code), "Google Play (Android)")}</div>
<p style="font-size:15px;line-height:1.6;margin:16px 0 8px"><b>2.</b> Abra este e-mail no celular e toque em:</p>
<div>${btn(deepLink(opts.code), "Ativar no app")}</div>
<p style="font-size:13px;line-height:1.6;color:#93887a;margin:12px 0 0">Se o botão não abrir o app: no app, na tela de planos, toque em <b>“Já comprei no site”</b> e digite o código. Ou abra <a href="${esc(activationUrl(opts.origin, opts.code))}" style="color:#7a5a3e">esta página</a>.</p>
${opts.test ? `<p style="font-size:12px;color:#c03a2e;margin-top:16px">Compra de TESTE (pagamento simulado): o código libera o app por 24 horas.</p>` : ""}
<p style="font-size:12px;line-height:1.6;color:#93887a;margin-top:28px">O código funciona em até 3 aparelhos. Dúvidas: responda este e-mail ou escreva para leo@leodiet.com.<br>33WEB SOFTWARE LTDA</p>
</div></body></html>`;
  const text = `${hello} Seu código LeoDiet Pro: ${code}\n\n1. Baixe o app: iPhone ${appStoreUrl()} | Android ${playStoreUrl(opts.code)}\n2. No app, toque em "Já comprei no site" e digite o código, ou abra ${deepLink(opts.code)} no celular.\n\nDúvidas: leo@leodiet.com`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.W2A_EMAIL_FROM || "LeoDiet <leo@leodiet.com>",
      to: [opts.to],
      reply_to: "leo@leodiet.com",
      subject: `${opts.test ? "[TESTE] " : ""}Seu código do LeoDiet Pro: ${code}`,
      html,
      text,
    }),
  });
  if (!res.ok) return { ok: false, error: `resend ${res.status} ${(await res.text()).slice(0, 200)}` };
  return { ok: true };
}
