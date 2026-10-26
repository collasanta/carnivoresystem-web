"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { QUIZ_VERSION, STEPS, label, type Answers } from "@/lib/web2app/quiz";
import { dailyTargets, fmtDate, fmtKg, project, type Projection } from "@/lib/web2app/projection";
import { once, track, trackCustom } from "@/lib/web2app/pixel";
import { metaCookies, useFunnel, type Attribution } from "@/lib/web2app/state";
import { Card, Cta, Disclaimer, Page, Title, TopBar } from "./ui";

/**
 * /quiz/plano — the "your plan is ready" screen (weight projection + answer summary), then the e-mail step.
 * The lead goes to Supabase (POST /api/w2a/lead) with answers, the projection shown and the attribution.
 */
export function PlanScreen() {
  const router = useRouter();
  const { state, ready, update } = useFunnel();
  const a = state.answers;
  const proj = useMemo(() => (ready ? project(a) : null), [ready, a]);
  const [stage, setStage] = useState<"plan" | "email">("plan");

  useEffect(() => {
    if (!ready) return;
    // came here without finishing the quiz (direct link, cleared storage): back to the questions
    if (!a.weightKg || !a.goal) {
      router.replace("/quiz");
      return;
    }
    once("plan_view", () => trackCustom("PlanView", { quiz: QUIZ_VERSION }));
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready || !proj) return <Page><TopBar /></Page>;

  if (stage === "email")
    return (
      <EmailStep
        a={a}
        proj={proj}
        initialEmail={state.email ?? ""}
        leadId={state.leadId}
        attribution={state.attribution}
        onBack={() => setStage("plan")}
        onDone={(email, leadId) => {
          update({ email, leadId });
          router.push("/quiz/oferta");
        }}
      />
    );

  const name = a.name?.trim();
  const t = dailyTargets(a);
  return (
    <Page>
      <TopBar onBack={() => { update({ step: STEPS.length - 2 }); router.push("/quiz"); }} />
      <Title sub={proj.kind === "lose" ? "Estimativa com base nas suas respostas, em um ritmo conservador." : undefined}>
        {name ? `${name}, seu plano está pronto` : "Seu plano está pronto"}
      </Title>

      <Card>
        {proj.kind === "lose" ? (
          <>
            <div className="text-[13px] text-mute">Você pode chegar a</div>
            <div className="mt-0.5 text-[30px] leading-tight font-extrabold tracking-[-0.03em]">
              {fmtKg(proj.targetKg)} <span className="text-walnut">até {fmtDate(proj.date)}</span>
            </div>
          </>
        ) : proj.kind === "gain" ? (
          <>
            <div className="text-[13px] text-mute">Meta de ganho com treino</div>
            <div className="mt-0.5 text-[30px] leading-tight font-extrabold tracking-[-0.03em]">
              {fmtKg(proj.targetKg)} <span className="text-walnut">até {fmtDate(proj.date)}</span>
            </div>
          </>
        ) : (
          <>
            <div className="text-[13px] text-mute">Seu foco</div>
            <div className="mt-0.5 text-[28px] leading-tight font-extrabold tracking-[-0.03em]">
              Constância e energia, <span className="text-walnut">mantendo {fmtKg(proj.startKg)}</span>
            </div>
          </>
        )}
        <Chart proj={proj} />
        {proj.kind === "lose" && proj.weeks >= 4 && (
          <p className="mt-3 text-[13px] leading-relaxed text-mute">
            Primeiro mês: cerca de <b className="text-ink">{fmtKg(Math.round((proj.startKg - proj.month1Kg) * 10) / 10)}</b> a menos. Parte disso costuma ser água nos primeiros dias, e é normal o ritmo diminuir depois.
          </p>
        )}
        {proj.clamped && <p className="mt-3 text-[13px] leading-relaxed text-mute">Ajustamos o alvo para dentro da faixa saudável para a sua altura.</p>}
      </Card>

      {t && (
        <Card className="mt-4">
          <div className="text-[12px] font-semibold tracking-[0.12em] text-mute uppercase">Seu ponto de partida diário</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Stat value={`${t.waterL.toLocaleString("pt-BR")} L`} label="de água" />
            <Stat value={`${t.sodiumG.toLocaleString("pt-BR")} g`} label="de sódio (sal + comida)" />
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-mute">O app transforma isso em três copos com a medida certa de sal e te lembra ao longo do dia.</p>
        </Card>
      )}

      <Card className="mt-4">
        <div className="text-[12px] font-semibold tracking-[0.12em] text-mute uppercase">Resumo das suas respostas</div>
        <dl className="mt-3 divide-y divide-line text-[14px]">
          <Row k="Objetivo" v={label("goal", a.goal)} />
          <Row k="Perfil" v={`${label("sex", a.sex)}, ${label("age", a.age)} anos`} />
          <Row k="Altura e peso" v={`${a.heightCm} cm · ${fmtKg(a.weightKg!)}`} />
          <Row k="Experiência" v={label("tenure", a.tenure)} />
          <Row k="O que mais atrapalha" v={(a.blockers ?? []).map((b) => (b === "none" ? "Nada específico" : label("blockers", b))).join(", ") || "–"} />
          <Row k="Ritmo" v={label("pace", a.pace)} />
          <Row k="Compromisso" v={label("commit", a.commit)} />
        </dl>
      </Card>

      <Card className="mt-4">
        <div className="text-[12px] font-semibold tracking-[0.12em] text-mute uppercase">O que o plano resolve</div>
        <ul className="mt-3 flex flex-col gap-2.5 text-[14px] leading-relaxed">
          {focusPoints(a).map((p) => (
            <li key={p} className="flex gap-2.5">
              <span className="mt-1 size-2 flex-none rounded-full bg-walnut" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
      </Card>

      <Disclaimer className="mt-6" />
      <Cta onClick={() => setStage("email")}>Quero meu plano</Cta>
    </Page>
  );
}

function focusPoints(a: Answers): string[] {
  const out: string[] = [];
  const b = a.blockers ?? [];
  if (b.includes("symptoms") || a.tenure === "never" || a.tenure === "new") out.push("Primeira semana sem dor de cabeça e câimbra: sal e água no ponto, com lembretes.");
  if (b.includes("sweets") || a.cravings === "daily") out.push("Vontade de doce: você registra e vê a sequência de dias limpos crescer.");
  if (b.includes("weekends")) out.push("Fins de semana: um toque honesto quando sair da dieta, sem culpa e sem perder o histórico.");
  if (b.includes("consistency") || b.includes("no-results")) out.push("Constância: o calendário de dias limpos mostra o seu progresso real, dia a dia.");
  if (b.includes("what-to-eat")) out.push("Simplicidade: carne, ovos, manteiga e sal. Sem contar caloria, sem cardápio complicado.");
  if (a.energy === "afternoon" || a.energy === "low") out.push("Energia: acompanhe humor e sintomas e veja o que muda quando o sal está certo.");
  if (out.length < 3) out.push("Peso: uma pesagem por dia em dois segundos e a curva do mês.");
  return out.slice(0, 4);
}

function Stat({ value, label: l }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-tint p-3.5">
      <div className="text-[24px] leading-none font-extrabold tracking-[-0.03em]">{value}</div>
      <div className="mt-1 text-[12px] text-mute">{l}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-mute">{k}</dt>
      <dd className="text-right font-semibold">{v}</dd>
    </div>
  );
}

/** Weekly projection as a smooth area chart. Pure SVG, no chart library. */
function Chart({ proj }: { proj: Projection }) {
  const W = 320;
  const H = 170;
  const pad = { l: 8, r: 8, t: 30, b: 26 };
  const pts = proj.points;
  const last = pts[pts.length - 1].week || 1;
  const kgs = pts.map((p) => p.kg);
  let lo = Math.min(...kgs);
  let hi = Math.max(...kgs);
  if (hi - lo < 2) {
    lo -= 1;
    hi += 1;
  }
  const x = (w: number) => pad.l + (w / last) * (W - pad.l - pad.r);
  const y = (kg: number) => pad.t + ((hi - kg) / (hi - lo)) * (H - pad.t - pad.b);
  const xy = pts.map((p) => [x(p.week), y(p.kg)] as const);
  // Catmull-Rom → cubic Bézier for a smooth line
  let d = `M${xy[0][0]},${xy[0][1]}`;
  for (let i = 0; i < xy.length - 1; i++) {
    const p0 = xy[i - 1] ?? xy[i];
    const p1 = xy[i];
    const p2 = xy[i + 1];
    const p3 = xy[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  const end = xy[xy.length - 1];
  const area = `${d} L${end[0]},${H - pad.b} L${xy[0][0]},${H - pad.b} Z`;
  const months = Math.max(1, Math.round(last / 4.3));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label={`Projeção de ${fmtKg(proj.startKg)} para ${fmtKg(proj.targetKg)}`}>
      <defs>
        <linearGradient id="w2a-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#7a5a3e" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#7a5a3e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="#f0e9dd" strokeWidth="1.5" />
      <path d={area} fill="url(#w2a-area)" />
      <path d={d} fill="none" stroke="#7a5a3e" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx={xy[0][0] + 1} cy={xy[0][1]} r="5.5" fill="#fff" stroke="#211a12" strokeWidth="2.5" />
      <circle cx={end[0] - 1} cy={end[1]} r="6.5" fill="#4a7a3a" stroke="#fff" strokeWidth="2.5" />
      <text x={xy[0][0] + 2} y={xy[0][1] - 12} fontSize="12" fontWeight="700" fill="#211a12">
        {fmtKg(proj.startKg)}
      </text>
      <text x={end[0] - 2} y={end[1] - 12} fontSize="12" fontWeight="800" fill="#4a7a3a" textAnchor="end">
        {fmtKg(proj.targetKg)}
      </text>
      <text x={pad.l} y={H - 7} fontSize="11" fill="#93887a">
        Hoje
      </text>
      <text x={W - pad.r} y={H - 7} fontSize="11" fill="#93887a" textAnchor="end">
        {proj.kind === "maintain" ? "4 semanas" : months <= 1 ? `${last} semanas` : `~${months} meses`}
      </text>
    </svg>
  );
}

function EmailStep({
  a,
  proj,
  initialEmail,
  leadId,
  attribution: attr,
  onBack,
  onDone,
}: {
  a: Answers;
  proj: Projection;
  initialEmail: string;
  leadId?: string;
  attribution: Attribution;
  onBack: () => void;
  onDone: (email: string, leadId: string) => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const attribution = { ...attr, ...metaCookies(attr) };
      const res = await fetch("/api/w2a/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: a.name?.trim() || null,
          answers: a,
          plan: { kind: proj.kind, startKg: proj.startKg, targetKg: proj.targetKg, weeks: proj.weeks, date: proj.date, month1Kg: proj.month1Kg, clamped: proj.clamped },
          attribution,
          quizVersion: QUIZ_VERSION,
          locale: "pt-BR",
          marketingOk: marketing,
          leadId,
          company: (document.getElementById("w2a-company") as HTMLInputElement | null)?.value || undefined,
        }),
      });
      const j = (await res.json()) as { leadId?: string; error?: string };
      if (!res.ok || !j.leadId) throw new Error(j.error ?? "server");
      if (j.leadId !== leadId) track("Lead", { content_name: "quiz_email" }, `lead_${j.leadId}`);
      onDone(email.trim().toLowerCase(), j.leadId);
    } catch (err) {
      setError(String(err).includes("email") ? "Confira o seu e-mail." : "Não conseguimos salvar agora. Tente de novo em instantes.");
      setBusy(false);
    }
  };

  return (
    <Page>
      <TopBar onBack={onBack} />
      <form onSubmit={submit} noValidate>
        <div className="mx-auto mt-8 flex size-16 items-center justify-center rounded-full bg-tint text-[30px]" aria-hidden="true">✉️</div>
        <Title sub="Vamos guardar o seu plano e te mandar o acesso ao app por aqui.">Para onde enviamos o seu plano?</Title>
        <input
          autoFocus
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          aria-label="E-mail"
          className="h-14 w-full rounded-2xl border border-linex bg-card px-4 text-center text-[17px] outline-none focus:border-cta focus:shadow-[0_0_0_1px_var(--color-cta)]"
        />
        {/* honeypot */}
        <input id="w2a-company" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
        <label className="mt-4 flex items-start gap-3 text-[13px] leading-relaxed text-mute">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 size-[18px] flex-none accent-[#251e17]" />
          Quero receber dicas sobre a dieta carnívora por e-mail (dá para sair quando quiser).
        </label>
        {error && <p className="mt-4 text-center text-[13px] text-bad">{error}</p>}
        <p className="mt-6 text-center text-[12px] leading-relaxed text-faint">
          Ao continuar você concorda com os{" "}
          <a href="/terms" target="_blank" className="underline">
            Termos
          </a>{" "}
          e a{" "}
          <a href="/privacy" target="_blank" className="underline">
            Política de Privacidade
          </a>
          . Suas respostas não são compartilhadas com anunciantes.
        </p>
        <Cta type="submit" disabled={!valid} busy={busy}>
          Ver meu plano completo
        </Cta>
      </form>
    </Page>
  );
}
