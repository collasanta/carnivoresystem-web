import { NextResponse } from "next/server";

export const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;

export const userAgent = (req: Request) => req.headers.get("user-agent")?.slice(0, 300) ?? null;

/** https://<host> of this request (preview, localhost or leodiet.com). */
export function originOf(req: Request): string {
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "leodiet.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const str = (v: unknown, max = 200): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export const FBC_RE = /^fb\.\d\.\d{10,}\.[\w-]+/;
export const FBP_RE = /^fb\.\d\.\d{10,}\.\d+/;
export const match = (v: unknown, re: RegExp) => (typeof v === "string" && v.length <= 500 && re.test(v) ? v : null);
