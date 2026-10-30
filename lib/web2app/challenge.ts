import type { Answers } from "./quiz";
import type { Projection } from "./projection";

/**
 * The "Desafio Carnívoro de 30 dias" framing of the funnel: start date, day 1 → day 30, phases and the pledge lines.
 * Dates are local calendar days stored as "YYYY-MM-DD" (answers.challengeStart). Day 30 = start + 29 days.
 * Copy rule: phases describe what usually happens, never a promised outcome.
 */
export const CHALLENGE_DAYS = 30;

export type StartPick = "today" | "tomorrow" | "monday";

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDay = (iso: string) => new Date(`${iso}T12:00:00`);

export function addDays(iso: string, n: number): string {
  const d = parseDay(iso);
  d.setDate(d.getDate() + n);
  return isoDay(d);
}

/** Start options from `now`. "Próxima segunda" is dropped when it is tomorrow (same day as "Amanhã"). */
export function startOptions(now = new Date()): { id: StartPick; label: string; iso: string }[] {
  const today = isoDay(now);
  const tomorrow = addDays(today, 1);
  const toMonday = ((8 - now.getDay()) % 7) || 7; // Monday → next week's Monday
  const monday = addDays(today, toMonday);
  const out: { id: StartPick; label: string; iso: string }[] = [
    { id: "today", label: "Hoje", iso: today },
    { id: "tomorrow", label: "Amanhã", iso: tomorrow },
  ];
  if (monday !== tomorrow) out.push({ id: "monday", label: "Na próxima segunda", iso: monday });
  return out;
}

export const dayEnd = (start: string) => addDays(start, CHALLENGE_DAYS - 1);

/** "quinta, 30 de outubro" */
export function fmtDayLong(iso: string): string {
  return parseDay(iso).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }).replace("-feira", "");
}

/** "30 de out" */
export function fmtDayShort(iso: string): string {
  return parseDay(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
}

/** "hoje" | "amanhã" | "na segunda, 3 de novembro" | null when the start is already in the past. */
export function startsWhen(iso: string, now = new Date()): string | null {
  const today = isoDay(now);
  if (iso < today) return null;
  if (iso === today) return "hoje";
  if (iso === addDays(today, 1)) return "amanhã";
  const wd = parseDay(iso).getDay();
  return `${wd === 0 || wd === 6 ? "no" : "na"} ${fmtDayLong(iso)}`;
}

/** Estimated weight on day 30 (linear between the weekly points), or null when the goal isn't weight loss. */
export function kgAtDay30(p: Projection): number | null {
  if (p.kind !== "lose") return null;
  const w = CHALLENGE_DAYS / 7;
  const pts = p.points;
  const after = pts.find((x) => x.week >= w);
  if (!after) return pts[pts.length - 1].kg;
  const before = [...pts].reverse().find((x) => x.week <= w) ?? pts[0];
  if (after.week === before.week) return after.kg;
  const t = (w - before.week) / (after.week - before.week);
  return Math.round((before.kg + (after.kg - before.kg) * t) * 10) / 10;
}

export const PHASES: { when: string; days: [number, number]; title: string; body: string }[] = [
  {
    when: "Semana 1",
    days: [1, 7],
    title: "Adaptação",
    body: "A semana mais difícil. O corpo troca o combustível e perde água e sódio: sal e água no ponto desde o dia 1 ajudam a passar por ela.",
  },
  {
    when: "Semanas 2 e 3",
    days: [8, 21],
    title: "Ritmo",
    body: "A fome costuma ficar mais estável. Você marca cada dia limpo e vê a sequência crescer no calendário.",
  },
  {
    when: "Semana 4",
    days: [22, 30],
    title: "Resultado",
    body: "Você compara peso, energia e sintomas com o dia 1 e decide como seguir depois do dia 30.",
  },
];

/** "Eu me comprometo a…" lines, tied to the blockers the person picked. Max 4. */
export function pledgeLines(a: Answers): string[] {
  const b = a.blockers ?? [];
  const out = ["Comer carnívoro e marcar o meu dia no app, todos os dias, por 30 dias."];
  if (b.includes("symptoms") || a.tenure === "never" || a.tenure === "restart") out.push("Tomar meu sal e minha água e não desistir na semana de adaptação.");
  else out.push("Tomar meu sal e minha água todos os dias.");
  if (b.includes("sweets")) out.push("Quando bater vontade de doce, lembrar da sequência que estou construindo.");
  if (b.includes("weekends")) out.push("Encarar o fim de semana com o plano, inclusive no churrasco.");
  if (b.includes("what-to-eat")) out.push("Manter simples: carne, ovos, manteiga e sal.");
  if (b.includes("consistency") || b.includes("no-results")) out.push("Continuar mesmo num dia ruim: um deslize não apaga o desafio.");
  out.push("Se eu sair da dieta, marcar com honestidade e voltar no dia seguinte.");
  // keep the first two and the last one, fill with blocker lines in between
  return out.length <= 4 ? out : [out[0], out[1], out[2], out[out.length - 1]];
}
