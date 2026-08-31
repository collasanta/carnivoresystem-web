import { NextResponse } from "next/server";
import { analyze } from "@/lib/analyzer/engine";
import { RED_FLAG_BY_ID } from "@/lib/analyzer/redflags";
import { SYMPTOM_BY_ID } from "@/lib/analyzer/symptoms";
import type { AnalysisReport, Profile } from "@/lib/analyzer/types";
import { LlmUnavailableError } from "@/lib/gemini/client";
import { parseDiet } from "@/lib/gemini/parse-diet";
import { writeReport } from "@/lib/gemini/write-report";

// The Gemini SDK needs Node, and two sequential model calls need the headroom.
export const runtime = "nodejs";
export const maxDuration = 60;

const json = (body: object, status: number) => NextResponse.json(body, { status });

/**
 * In-memory per-IP limiter.
 *
 * The tool is free and takes no email, so the only thing between it and a script
 * is this. It resets on cold start and does not span instances, which makes it a
 * speed bump rather than a wall — enough for casual abuse, and the honest place
 * to swap in a KV store if traffic ever justifies one.
 */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

const SEXES = ["male", "female"];
const ACTIVITIES = ["sedentary", "light", "moderate", "heavy", "athlete"];
const GOALS = ["lose", "maintain", "gain"];
const TENURES = ["under1m", "1to3m", "3to12m", "over1y"];
const SALTS = ["iodized", "pink", "sea", "none", "unknown"];
const ALCOHOL = ["none", "occasional", "weekly", "daily", "heavy"];

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function pick<T extends string>(value: unknown, allowed: readonly string[], fallback: T): T {
  return (typeof value === "string" && allowed.includes(value) ? value : fallback) as T;
}

function validate(body: Record<string, unknown>): Profile | string {
  const dietText = typeof body.dietText === "string" ? body.dietText.trim() : "";
  if (dietText.length < 10) {
    return "Tell us what you actually eat — a sentence or two is enough.";
  }
  if (dietText.length > 4000) {
    return "That description is too long. Trim it to the foods you eat regularly.";
  }

  const symptoms = Array.isArray(body.symptoms)
    ? body.symptoms
        .filter((s): s is string => typeof s === "string")
        .filter((s) => SYMPTOM_BY_ID[s] || RED_FLAG_BY_ID[s])
        .slice(0, 40)
    : [];

  return {
    sex: pick(body.sex, SEXES, "male"),
    age: clamp(body.age, 16, 100, 35),
    weightKg: clamp(body.weightKg, 35, 300, 80),
    heightCm: clamp(body.heightCm, 120, 230, 175),
    activity: pick(body.activity, ACTIVITIES, "moderate"),
    goal: pick(body.goal, GOALS, "maintain"),
    tenure: pick(body.tenure, TENURES, "1to3m"),
    saltType: pick(body.saltType, SALTS, "unknown"),
    saltGramsPerDay: clamp(body.saltGramsPerDay, 0, 60, 6),
    symptoms,
    otherSymptoms: typeof body.otherSymptoms === "string" ? body.otherSymptoms.slice(0, 800) : "",
    supplements: typeof body.supplements === "string" ? body.supplements.slice(0, 800) : "",
    offDays: typeof body.offDays === "string" ? body.offDays.slice(0, 500) : "",
    alcohol: pick(body.alcohol, ALCOHOL, "none"),
    dietText,
  };
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Expected JSON." }, 400);
  }

  const profile = validate(body);
  if (typeof profile === "string") return json({ error: profile }, 400);

  // Counted only once a request is going to cost something. A malformed body is
  // free to serve, and charging it against the quota would let a fumbled form
  // lock someone out of the tool for an hour.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  if (rateLimited(ip)) {
    return json({ error: "That's a lot of analyses. Try again in an hour." }, 429);
  }

  const startedAt = Date.now();
  try {
    const { foods: parsed, supplements, unquantifiedSupplements } = await parseDiet(profile);
    const parsedAt = Date.now();
    console.log(
      `[analyze] stage1 parse ${parsedAt - startedAt}ms, ${parsed.length} foods, ${supplements.length} supplements`,
    );
    if (!parsed.length) {
      return json(
        { error: "We couldn't recognise any foods in that. Try naming the cuts you eat and roughly how much." },
        422,
      );
    }

    const assessment = analyze(profile, parsed, supplements, unquantifiedSupplements);

    // The engine's output is the product. If the writer fails, the report still
    // ships with every number intact and simply without the prose.
    let narrative: AnalysisReport["narrative"] = null;
    let degraded: string | undefined;
    try {
      narrative = await writeReport(profile, assessment);
      console.log(`[analyze] stage3 write ${Date.now() - parsedAt}ms, total ${Date.now() - startedAt}ms`);
    } catch (error) {
      console.error("[analyze] narrative stage failed", error);
      degraded = "The written commentary didn't generate this time. Your numbers below are complete and unaffected.";
    }

    return json({ assessment, narrative, degraded } satisfies AnalysisReport, 200);
  } catch (error) {
    if (error instanceof LlmUnavailableError) {
      console.error("[analyze] llm unavailable", error.message);
      return json({ error: "The analyzer is temporarily unavailable. Try again shortly." }, 503);
    }
    console.error("[analyze] failed", error);
    return json({ error: "Something went wrong reading that diet. Try rephrasing it." }, 500);
  }
}
