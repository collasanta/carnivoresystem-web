"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { QUIZ_VERSION, STEPS, label, type Answers } from "@/lib/web2app/quiz";
import { dailyTargets, fmtDate, fmtKg, project, type Projection } from "@/lib/web2app/projection";
import { capture, identifyLead } from "@/lib/web2app/analytics";
import { once, track, trackCustom } from "@/lib/web2app/pixel";
import { metaCookies, useFunnel, type Attribution } from "@/lib/web2app/state";
import { PHASES, dayEnd, fmtDayLong, fmtDayShort, isoDay, kgAtDay30, pledgeLines, startOptions, type StartPick } from "@/lib/web2app/challenge";
import { cn } from "@/lib/utils";
import { Card, Cta, Disclaimer, HoldButton, Option, Page, Title, TopBar } from "./ui";

/**
 * /quiz/plano — "your 30-day challenge is ready" (day 1 → day 30, phases, projection, answer summary), then the
 * e-mail step, then the commitment: start date ("Quando você começa?") and the pledge (press and hold
 * "Eu aceito o desafio") → /quiz/oferta. The lead goes to Supabase (POST /api/w2a/lead) with answers, the projection
 * shown and the attribution; after the pledge it is updated (same leadId) with challengeStart / challengeAcceptedAt.
 */
type Stage = "plan" | "email" | "start" | "pledge";

function leadBody(a: Answers, proj: Projection, email: string, attr: Attribution, leadId: string | undefined, marketing: boolean | undefined) {
  return {
    email,
    name: a.name?.trim() || null,
    answers: a,
    plan: { kind: proj.kind, startKg: proj.startKg, targetKg: proj.targetKg, weeks: proj.weeks, date: proj.date, month1Kg: proj.month1Kg, clamped: proj.clamped },
    attribution: { ...attr, ...metaCookies(attr) },
    quizVersion: QUIZ_VERSION,
    locale: "pt-BR",
    ...(marketing === undefined ? {} : { marketingOk: marketing }),
    leadId,
  };
}
export function PlanScreen() {
  const router = useRouter();
  const { state, ready, update } = useFunnel();
  const a = state.answers;
  const proj = useMemo(() => (ready ? project(a) : null), [ready, a]);
  const [stage, setStage] = useState<Stage>("plan");

  useEffect(() => {
    if (!ready) return;
    // came here without finishing the quiz (direct link, cleared storage): back to the questions
    if (!a.weightKg || !a.goal) {
      router.replace("/quiz");
      return;
    }
    once("plan_view", () => trackCustom("PlanView", { quiz: QUIZ_VERSION }));
    capture("w2a_plan_view", { quiz: QUIZ_VERSION });
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
        onDone={(email, leadId, marketingOk) => {
          update({ email, leadId, marketingOk });
          setStage("start");
        }}
      />
    );

  if (stage === "start")
    return (
      <StartStep
        a={a}
        onBack={() => setStage("email")}
        onDone={(pick, iso) => {
          update((s) => ({ answers: { ...s.answers, challengeStart: iso, challengeStartPick: pick } }));
          capture("w2a_challenge_start_picked", { start: pick, quiz: QUIZ_VERSION });
          setStage("pledge");
        }}
      />
    );

  if (stage === "pledge")
    return (
      <PledgeStep
        a={a}
        onBack={() => setStage("start")}
        onAccept={() => {
          const answers: Answers = { ...a, commit: "30", challengeAcceptedAt: new Date().toISOString() };
          update({ answers });
          capture("w2a_challenge_accepted", { start: a.challengeStartPick, quiz: QUIZ_VERSION });
          // keep the lead row in sync (start date + acceptance); fire and forget, the paywall doesn't depend on it
          if (state.email && state.leadId)
            fetch("/api/w2a/lead", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              keepalive: true,
              body: JSON.stringify(leadBody(answers, proj, state.email, state.attribution, state.leadId, state.marketingOk)),
            }).catch(() => {});
          router.push("/quiz/oferta");
        }}
      />
    );

  const name = a.name?.trim();
  const t = dailyTargets(a);
  return (
    <Page>
      <TopBar onBack={() => { update({ step: STEPS.length - 2 }); router.push("/quiz"); }} />
      <Title sub="Montado com base nas suas respostas. Os números são estimativas, em um ritmo conservador.">
        {name ? `${name}, seu desafio de 30 dias está pronto` : "Seu desafio de 30 dias está pronto"}
      </Title>

      <ChallengeCard a={a} proj={proj} />

      <Card className="mt-4">
        <div className="mb-1 text-[12px] font-semibold tracking-[0.12em] text-mute uppercase">E depois do dia 30</div>
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
          <p className="mt-3 text-[13px] leading-relaxed text-mute">É normal o ritmo diminuir depois do primeiro mês. O desafio é o começo; o app continua com você depois do dia 30.</p>
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
      <Cta onClick={() => setStage(state.leadId && state.email ? "start" : "email")}>Quero fazer o desafio</Cta>
    </Page>
  );
}

function focusPoints(a: Answers): string[] {
  const out: string[] = [];
  const b = a.blockers ?? [];
  if (b.includes("symptoms") || (a.symptoms ?? []).some((x) => ["headache", "cramps", "dizziness"].includes(x)) || a.tenure === "never" || a.tenure === "new") out.push("Primeira semana sem dor de cabeça e câimbra: sal e água no ponto, com lembretes.");
  if (b.includes("sweets") || a.cravings === "daily") out.push("Vontade de doce: você registra e vê a sequência de dias limpos crescer.");
  if (b.includes("weekends")) out.push("Fins de semana: um toque honesto quando sair da dieta, sem culpa e sem perder o histórico.");
  if (b.includes("consistency") || b.includes("no-results")) out.push("Constância: o calendário de dias limpos mostra o seu progresso real, dia a dia.");
  if (b.includes("what-to-eat")) out.push("Simplicidade: carne, ovos, manteiga e sal. Sem contar caloria, sem cardápio complicado.");
  const sy = a.symptoms ?? [];
  if (sy.includes("fatigue") || sy.includes("brain-fog") || a.energy === "afternoon" || a.energy === "low") out.push("Energia: acompanhe humor e sintomas e veja o que muda quando o sal está certo.");
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
  onDone: (email: string, leadId: string, marketingOk: boolean) => void;
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
      const res = await fetch("/api/w2a/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...leadBody(a, proj, email.trim(), attr, leadId, marketing),
          company: (document.getElementById("w2a-company") as HTMLInputElement | null)?.value || undefined,
        }),
      });
      const j = (await res.json()) as { leadId?: string; error?: string };
      if (!res.ok || !j.leadId) throw new Error(j.error ?? "server");
      if (j.leadId !== leadId) track("Lead", { content_name: "quiz_email" }, `lead_${j.leadId}`);
      identifyLead(j.leadId, email.trim().toLowerCase());
      capture("w2a_lead", { quiz: QUIZ_VERSION });
      onDone(email.trim().toLowerCase(), j.leadId, marketing);
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
        <Title sub="Vamos guardar o seu desafio e te mandar o acesso ao app por aqui.">Para onde enviamos o seu desafio?</Title>
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
          Continuar
        </Cta>
      </form>
    </Page>
  );
}

/** Day 1 → day 30, the estimate at day 30 and the three phases. */
function ChallengeCard({ a, proj }: { a: Answers; proj: Projection }) {
  const start = a.challengeStart ?? isoDay(new Date());
  const kg30 = kgAtDay30(proj);
  return (
    <Card>
      <div className="text-[12px] font-semibold tracking-[0.12em] text-mute uppercase">Desafio Carnívoro de 30 dias</div>
      <div className="mt-3 flex items-stretch gap-3">
        <DayBox day="Dia 1" date={fmtDayShort(start)} value={fmtKg(proj.startKg)} />
        <div className="flex flex-none items-center text-[20px] text-faint" aria-hidden="true">→</div>
        <DayBox
          day="Dia 30"
          date={fmtDayShort(dayEnd(start))}
          value={kg30 !== null ? `~${fmtKg(kg30)}` : "30 dias limpos"}
          accent
        />
      </div>
      {kg30 !== null ? (
        <p className="mt-3 text-[12.5px] leading-relaxed text-mute">
          Estimativa para o dia 30: cerca de <b className="text-ink">{fmtKg(Math.round((proj.startKg - kg30) * 10) / 10)}</b> a menos. Parte disso costuma ser água nos primeiros dias.
        </p>
      ) : (
        <p className="mt-3 text-[12.5px] leading-relaxed text-mute">A meta do desafio é a constância: 30 dias marcados no calendário, com sal e água no ponto.</p>
      )}
      <ol className="mt-4 flex flex-col">
        {PHASES.map((ph, i) => (
          <li key={ph.title} className="relative flex gap-3 pb-4 last:pb-0">
            {i < PHASES.length - 1 && <span className="absolute top-7 bottom-0 left-[13px] w-0.5 bg-line" aria-hidden="true" />}
            <span className="relative flex size-7 flex-none items-center justify-center rounded-full bg-walnut text-[12px] font-bold text-white" aria-hidden="true">
              {i + 1}
            </span>
            <span>
              <span className="block text-[14px] font-extrabold">
                {ph.when} · {ph.title}
                <span className="ml-1.5 text-[12px] font-normal text-mute">dias {ph.days[0]}–{ph.days[1]}</span>
              </span>
              <span className="mt-0.5 block text-[12.5px] leading-relaxed text-mute">{ph.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function DayBox({ day, date, value, accent }: { day: string; date: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("flex-1 rounded-2xl p-3.5", accent ? "bg-[#4a7a3a]/10" : "bg-tint")}>
      <div className="text-[12px] leading-tight text-mute">
        <b className="block text-[13px] text-ink">{day}</b>
        {date}
      </div>
      <div className={cn("mt-1 text-[20px] leading-tight font-extrabold tracking-[-0.02em]", accent && "text-good")}>{value}</div>
    </div>
  );
}

function StartStep({ a, onBack, onDone }: { a: Answers; onBack: () => void; onDone: (pick: StartPick, iso: string) => void }) {
  const opts = useMemo(() => startOptions(), []);
  const [pick, setPick] = useState<StartPick | null>(() => opts.find((o) => o.id === a.challengeStartPick)?.id ?? null);
  const sel = opts.find((o) => o.id === pick);
  useEffect(() => {
    window.scrollTo(0, 0);
    capture("w2a_challenge_start_view", { quiz: QUIZ_VERSION });
  }, []);
  return (
    <Page>
      <TopBar onBack={onBack} />
      <div className="mx-auto mt-8 flex size-16 items-center justify-center rounded-full bg-tint text-[30px]" aria-hidden="true">🏁</div>
      <Title sub="Escolha o seu dia 1. Começar logo ajuda: quanto mais perto, mais fácil manter a decisão.">Quando você começa?</Title>
      <div role="radiogroup" className="flex flex-col gap-2.5">
        {opts.map((o) => (
          <Option key={o.id} selected={pick === o.id} onClick={() => setPick(o.id)} hint={fmtDayLong(o.iso)}>
            {o.label}
          </Option>
        ))}
      </div>
      {sel && (
        <Card className="mt-5 animate-in fade-in duration-300 bg-tint text-center">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[12px] font-bold text-mute">Dia 1</div>
              <div className="mt-0.5 text-[16px] leading-snug font-extrabold">{fmtDayLong(sel.iso)}</div>
            </div>
            <div>
              <div className="text-[12px] font-bold text-mute">Dia 30</div>
              <div className="mt-0.5 text-[16px] leading-snug font-extrabold text-good">{fmtDayLong(dayEnd(sel.iso))}</div>
            </div>
          </div>
        </Card>
      )}
      <Cta onClick={() => sel && onDone(sel.id, sel.iso)} disabled={!sel}>
        Continuar
      </Cta>
    </Page>
  );
}

function PledgeStep({ a, onBack, onAccept }: { a: Answers; onBack: () => void; onAccept: () => void }) {
  const start = a.challengeStart ?? isoDay(new Date());
  const name = a.name?.trim();
  useEffect(() => {
    window.scrollTo(0, 0);
    capture("w2a_challenge_pledge_view", { quiz: QUIZ_VERSION });
  }, []);
  return (
    <Page>
      <TopBar onBack={onBack} />
      <Title sub="Leia com calma: é um combinado seu com você mesmo(a).">Seu compromisso</Title>
      <Card className="relative overflow-hidden border-walnut/30 text-center">
        <div className="text-[11px] font-semibold tracking-[0.16em] text-walnut uppercase">Desafio Carnívoro de 30 dias</div>
        <div className="mt-3 text-[26px] leading-tight font-extrabold tracking-[-0.025em]">{name || "Eu"}</div>
        <div className="mt-1 text-[13.5px] text-mute">
          de {fmtDayLong(start)} a {fmtDayLong(dayEnd(start))}
        </div>
        <div className="mx-auto my-4 h-px w-16 bg-line" />
        <div className="text-left text-[13px] font-bold">Eu me comprometo a:</div>
        <ul className="mt-2.5 flex flex-col gap-2.5 text-left text-[14px] leading-relaxed">
          {pledgeLines(a).map((l) => (
            <li key={l} className="flex gap-2.5">
              <svg viewBox="0 0 24 24" className="mt-1 size-4 flex-none text-good" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              {l}
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-5 text-center text-[12.5px] leading-relaxed text-mute text-balance">
        O LeoDiet é onde você faz o desafio: marca o dia, toma o sal e a água e vê o calendário ficar verde até o dia 30.
      </p>
      <HoldButton onConfirm={onAccept} doneLabel="Desafio aceito ✓">
        Eu aceito o desafio
      </HoldButton>
    </Page>
  );
}
