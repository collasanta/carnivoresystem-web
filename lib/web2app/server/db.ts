/**
 * Tiny Supabase REST (PostgREST) client for the funnel's server routes, with the service role key.
 * Tables: web_leads, web_purchases (leo repo, supabase/migrations/20261027000000_web2app.sql). RLS is on with no
 * policies, so only this server (and the app's w2a-redeem edge function) can read or write them.
 */
const URL_ = process.env.SUPABASE_URL ?? "";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const dbConfigured = () => !!URL_ && !!KEY;

async function call<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
  if (!dbConfigured()) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`supabase ${res.status} ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : null) as T;
}

export async function insert<T>(table: string, row: Record<string, unknown>): Promise<T> {
  const rows = await call<T[]>(table, { method: "POST", body: JSON.stringify(row), prefer: "return=representation" });
  return rows[0];
}

export async function update<T>(table: string, filter: string, patch: Record<string, unknown>): Promise<T[]> {
  return call<T[]>(`${table}?${filter}`, { method: "PATCH", body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }), prefer: "return=representation" });
}

export async function selectOne<T>(table: string, filter: string, columns = "*"): Promise<T | null> {
  const rows = await call<T[]>(`${table}?select=${columns}&${filter}&limit=1`);
  return rows[0] ?? null;
}

export async function insertLog(table: string, row: Record<string, unknown>): Promise<void> {
  await call(table, { method: "POST", body: JSON.stringify(row), prefer: "return=minimal" });
}

export const eq = (col: string, v: string) => `${col}=eq.${encodeURIComponent(v)}`;

export async function select<T>(table: string, query: string): Promise<T[]> {
  return call<T[]>(`${table}?${query}`);
}

/** PATCH without touching updated_at (for tables that don't have it: profiles, web_redemptions). */
export async function patch<T>(table: string, filter: string, row: Record<string, unknown>): Promise<T[]> {
  return call<T[]>(`${table}?${filter}`, { method: "PATCH", body: JSON.stringify(row), prefer: "return=representation" });
}
