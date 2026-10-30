import { NextResponse } from "next/server";
import { eq, selectOne } from "@/lib/web2app/server/db";
import type { PurchaseRow } from "@/lib/web2app/server/fulfill";
import { captureServer } from "@/lib/web2app/server/posthog";

/**
 * GET /api/w2a/ebook?pid=…&t=… — download of the paid "Guia do Desafio Carnívoro de 30 dias". Checks the purchase's
 * access token, that the purchase includes the guide (web_purchases.includes_ebook: guide alone or guide + app) and is
 * paid, then redirects to a short-lived (5 min) signed URL of the PRIVATE
 * Supabase Storage object (service role, same SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY as ../../../lib/web2app/server/db.ts).
 * Linked from the success page and the purchase e-mail (guide e-mail, or code e-mail when the app is included), so the link works again whenever the buyer needs it.
 *
 * Env: W2A_EBOOK_BUCKET (default `w2a-ebook`), W2A_EBOOK_OBJECT (default `desafio-carnivoro-30-dias.pdf`).
 * Errors are small PT-BR pages (the link is opened by people, not code): 404 unknown purchase, 409 unpaid / refunded /
 * without the guide, 503 storage not configured or the PDF not uploaded yet (logged as `[w2a/ebook] missing`).
 */
const BUCKET = process.env.W2A_EBOOK_BUCKET || "w2a-ebook";
const OBJECT = process.env.W2A_EBOOK_OBJECT || "desafio-carnivoro-30-dias.pdf";
const FILENAME = "Guia-Desafio-Carnivoro-30-dias.pdf";

function page(status: number, title: string, text: string) {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;background:#fcf8f1;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#211a12"><div style="max-width:440px;margin:0 auto;padding:48px 20px;text-align:center">
<p style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#93887a;margin:0">LeoDiet</p><h1 style="font-size:22px;margin:10px 0">${title}</h1>
<p style="font-size:15px;line-height:1.6;color:#6b6155">${text}</p></div></body></html>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const pid = q.get("pid") ?? "";
  const t = q.get("t") ?? "";
  const notFound = () => page(404, "Link inválido", "Não encontramos essa compra. Use o link do e-mail da compra ou escreva para leo@leodiet.com.");
  if (!/^[0-9a-f-]{36}$/i.test(pid) || !t) return notFound();
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !key) return page(503, "Download indisponível", "Tente de novo em alguns minutos. Se continuar, escreva para leo@leodiet.com.");
  try {
    const p = await selectOne<PurchaseRow>("web_purchases", eq("id", pid));
    if (!p || p.access_token !== t) return notFound();
    if (!p.includes_ebook) return page(409, "Esta compra não é o guia", "Este link é do Guia do Desafio Carnívoro de 30 dias. Dúvidas: leo@leodiet.com.");
    if (p.status === "refunded") return page(409, "Compra reembolsada", "Esta compra foi reembolsada, por isso o download foi encerrado. Dúvidas: leo@leodiet.com.");
    if (p.status !== "paid") return page(409, "Pagamento ainda não confirmado", "Assim que o pagamento for aprovado, o download é liberado e o link chega no seu e-mail.");

    const path = `${encodeURIComponent(BUCKET)}/${OBJECT.split("/").map(encodeURIComponent).join("/")}`;
    const res = await fetch(`${url}/storage/v1/object/sign/${path}`, {
      method: "POST",
      cache: "no-store",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 300 }),
    });
    const body = await res.text();
    const signed = res.ok ? (JSON.parse(body) as { signedURL?: string }).signedURL : undefined;
    if (!signed) {
      // Storage answers 400 {"statusCode":"404","error":"not_found"} for a missing object or bucket
      console.error("[w2a/ebook] missing", `${BUCKET}/${OBJECT}`, res.status, body.slice(0, 200));
      return page(503, "O guia está sendo atualizado", "O seu pagamento está confirmado. O arquivo estará disponível em breve neste mesmo link; se precisar agora, escreva para leo@leodiet.com.");
    }
    await captureServer(p.lead_id ?? p.id, "w2a_ebook_download_served", { purchase_id: p.id, test: p.test });
    const dest = new URL(`${url}/storage/v1${signed}`);
    dest.searchParams.set("download", FILENAME);
    return NextResponse.redirect(dest.toString(), { status: 302, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[w2a/ebook]", e);
    return page(500, "Algo deu errado", "Tente de novo em alguns minutos. Se continuar, escreva para leo@leodiet.com.");
  }
}
