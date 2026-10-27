import { providerById } from "@/lib/web2app/payments";
import { handleWebhook } from "@/lib/web2app/server/webhook";
import { json } from "@/lib/web2app/server/http";

/** POST /api/w2a/webhook/<provider> — generic gateway notifications (Asaas has its own URL: /api/web2app/asaas-webhook). */
export async function POST(req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: id } = await ctx.params;
  const provider = providerById(id);
  if (!provider || provider.id === "mock") return json({ error: "provider" }, 404);
  return handleWebhook(provider, req);
}
