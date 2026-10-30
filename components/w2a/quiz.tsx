"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MILESTONES, QUIZ_VERSION, STEPS, canContinue, type Answers, type Step } from "@/lib/web2app/quiz";
import { bmiOf, fmtKg } from "@/lib/web2app/projection";
import { capture } from "@/lib/web2app/analytics";
import { once, track, trackCustom } from "@/lib/web2app/pixel";
import { useFunnel } from "@/lib/web2app/state";
import { Card, Cta, Disclaimer, Option, Page, Title, TopBar } from "./ui";

/**
 * /quiz — one question per screen (lib/web2app/quiz.ts holds the steps and the copy). Single choice auto-advances,
 * everything else has a pinned "Continuar". Answers and the current step live in localStorage (useFunnel), so a
 * refresh resumes where the person was. The last step (loading) sends them to /quiz/plano.
 */
export function Quiz() {
  const router = useRouter();
  const { state, ready, update } = useFunnel();
  const [advancing, setAdvancing] = useState(false);
  const idx = Math.min(state.step, STEPS.length - 1);
  const step = STEPS[idx];
  const a = state.answers;

  useEffect(() => {
    if (!ready) return;
    if (idx === 0) {
      once("quiz_start", () => {
        track("ViewContent", { content_name: "quiz", content_category: QUIZ_VERSION });
        capture("w2a_quiz_start", { quiz: QUIZ_VERSION });
      });
      if (!state.startedAt) update({ startedAt: Date.now() });
    }
    const m = MILESTONES[step.id];
    if (m) once(`m_${m}`, () => trackCustom(m, { quiz: QUIZ_VERSION }));
    capture(step.kind === "loading" ? "w2a_quiz_complete" : "w2a_quiz_step", { step: step.id, index: idx, quiz: QUIZ_VERSION });
    window.scrollTo(0, 0);
  }, [ready, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <Page><TopBar progress={0} /></Page>;

  const go = (n: number) => update({ step: Math.max(0, Math.min(STEPS.length - 1, n)) });
  const next = () => go(idx + 1);
  const back = () => (idx > 0 ? go(idx - 1) : router.push("/"));
  const set = (patch: Partial<Answers>) => update((s) => ({ answers: { ...s.answers, ...patch } }));
  // the bar fills over the questions; the loading screen is 100%
  const progress = (idx + 1) / STEPS.length;

  const pick = (key: keyof Answers, id: string) => {
    if (advancing) return;
    set({ [key]: id } as Partial<Answers>);
    setAdvancing(true);
    setTimeout(() => {
      setAdvancing(false);
      next();
    }, 220);
  };

  return (
    <Page>
      <TopBar progress={progress} onBack={step.kind === "loading" ? undefined : back} />
      <div key={step.id} className="animate-in fade-in slide-in-from-right-3 duration-300">
        {idx === 0 && (
          <p className="mt-6 text-center text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">Desafio Carnívoro de 30 dias · 2 minutos</p>
        )}
        <StepView step={step} a={a} set={set} pick={pick} next={next} onDone={() => router.push("/quiz/plano")} />
      </div>
    </Page>
  );
}

function StepView({
  step,
  a,
  set,
  pick,
  next,
  onDone,
}: {
  step: Step;
  a: Answers;
  set: (p: Partial<Answers>) => void;
  pick: (k: keyof Answers, id: string) => void;
  next: () => void;
  onDone: () => void;
}) {
  switch (step.kind) {
    case "single":
      return (
        <>
          <Title sub={step.sub}>{step.title}</Title>
          <div role="radiogroup" className="flex flex-col gap-2.5">
            {step.options.map((o) => (
              <Option key={o.id} selected={a[step.key] === o.id} onClick={() => pick(step.key, o.id)} hint={o.hint} emoji={o.emoji}>
                {o.label}
              </Option>
            ))}
          </div>
        </>
      );
    case "multi": {
      const cur = (a[step.key] as string[] | undefined) ?? [];
      const toggle = (id: string) => {
        if (id === "none") return set({ [step.key]: cur.includes("none") ? [] : ["none"] } as Partial<Answers>);
        const without = cur.filter((x) => x !== "none");
        set({ [step.key]: without.includes(id) ? without.filter((x) => x !== id) : [...without, id] } as Partial<Answers>);
      };
      return (
        <>
          <Title sub={step.sub}>{step.title}</Title>
          <div className="flex flex-col gap-2.5">
            {step.options.map((o) => (
              <Option key={o.id} multi selected={cur.includes(o.id)} onClick={() => toggle(o.id)}>
                {o.label}
              </Option>
            ))}
            {step.none && (
              <Option multi selected={cur.includes("none")} onClick={() => toggle("none")}>
                {step.none}
              </Option>
            )}
          </div>
          <Cta onClick={next} disabled={!canContinue(step, a)}>Continuar</Cta>
        </>
      );
    }
    case "number":
      return <NumberStep step={step} a={a} set={set} next={next} />;
    case "text":
      return (
        <>
          <Title sub="Para personalizar o seu desafio. É opcional.">{step.title}</Title>
          <input
            autoFocus
            type="text"
            autoComplete="given-name"
            maxLength={40}
            value={a.name ?? ""}
            onChange={(e) => set({ name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && next()}
            placeholder={step.placeholder}
            className="h-14 w-full rounded-2xl border border-linex bg-card px-4 text-center text-[18px] outline-none focus:border-cta focus:shadow-[0_0_0_1px_var(--color-cta)]"
          />
          <Cta onClick={next}>{a.name?.trim() ? "Continuar" : "Pular"}</Cta>
        </>
      );
    case "info":
      return (
        <>
          <InfoBody step={step} a={a} />
          <Cta onClick={next}>{step.cta ?? "Continuar"}</Cta>
        </>
      );
    case "loading":
      return <Loading step={step} a={a} onDone={onDone} />;
  }
}

function NumberStep({ step, a, set, next }: { step: Extract<Step, { kind: "number" }>; a: Answers; set: (p: Partial<Answers>) => void; next: () => void }) {
  const initial = a[step.key];
  const [text, setText] = useState(initial ? String(initial).replace(".", ",") : "");
  const n = Number.parseFloat(text.replace(",", "."));
  const valid = Number.isFinite(n) && n >= step.min && n <= step.max;
  useEffect(() => {
    set({ [step.key]: valid ? Math.round(n * 10) / 10 : undefined } as Partial<Answers>);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  let note: string | null = null;
  if (step.key === "targetKg" && valid && a.heightCm) {
    const b = bmiOf(n, a.heightCm);
    if (b !== null && b < 18.5) note = "Esse peso fica abaixo da faixa saudável para a sua altura. Vamos considerar um alvo um pouco maior no plano.";
    else if (a.weightKg && a.weightKg - n > a.weightKg * 0.3) note = "É uma meta grande, e tudo bem: o plano divide em etapas. Vale acompanhar com um médico.";
  }
  return (
    <>
      <Title sub={step.sub}>{step.title}</Title>
      <div className="mx-auto flex w-full max-w-[260px] items-baseline justify-center gap-2 border-b-2 border-linex pb-2 focus-within:border-cta">
        <input
          autoFocus
          inputMode="decimal"
          type="text"
          aria-label={step.title}
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^0-9.,]/g, "").slice(0, 5))}
          onKeyDown={(e) => e.key === "Enter" && valid && next()}
          placeholder={step.placeholder}
          className="w-full bg-transparent text-center text-[48px] leading-none font-extrabold tracking-[-0.03em] outline-none placeholder:text-linex"
        />
        <span className="text-[20px] font-bold text-mute">{step.unit}</span>
      </div>
      {text && !valid && (
        <p className="mt-3 text-center text-[13px] text-bad">
          Digite um valor entre {step.min} e {step.max} {step.unit}.
        </p>
      )}
      {note && <p className="mx-auto mt-4 max-w-[360px] rounded-2xl bg-tint p-4 text-center text-[13.5px] leading-relaxed text-ink">{note}</p>}
      <Cta onClick={next} disabled={!valid}>Continuar</Cta>
    </>
  );
}

function InfoBody({ step, a }: { step: Extract<Step, { kind: "info" }>; a: Answers }) {
  if (step.variant === "profile") {
    const bmi = bmiOf(a.weightKg, a.heightCm);
    const diff = a.weightKg && a.targetKg ? Math.round((a.weightKg - a.targetKg) * 10) / 10 : 0;
    const band = bmi === null ? null : bmi < 18.5 ? "abaixo da faixa de referência" : bmi < 25 ? "dentro da faixa de referência" : bmi < 30 ? "acima da faixa de referência" : "bem acima da faixa de referência";
    const pos = bmi === null ? 0 : Math.min(100, Math.max(0, ((bmi - 15) / (40 - 15)) * 100));
    return (
      <>
        <Title>{step.title}</Title>
        <Card>
          <div className="text-[12px] font-semibold tracking-[0.12em] text-mute uppercase">Seu IMC hoje</div>
          <div className="mt-1 text-[40px] leading-none font-extrabold tracking-[-0.03em]">{bmi?.toLocaleString("pt-BR") ?? "–"}</div>
          {band && <div className="mt-1 text-[14px] text-mute">{band}</div>}
          <div className="relative mt-5 h-2.5 rounded-full bg-[linear-gradient(90deg,#c08a2e_0%,#4a7a3a_25%,#4a7a3a_40%,#c08a2e_60%,#c03a2e_100%)]">
            <span className="absolute -top-1.5 size-5 -translate-x-1/2 rounded-full border-[3px] border-white bg-ink shadow" style={{ left: `${pos}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-faint">
            <span>15</span>
            <span>18,5</span>
            <span>25</span>
            <span>30</span>
            <span>40</span>
          </div>
          <p className="mt-4 text-[13px] leading-relaxed text-mute">O IMC é só uma referência: não mede músculo nem gordura. No app você acompanha o que importa no dia a dia.</p>
        </Card>
        {diff > 0 && (
          <p className="mt-5 text-center text-[15px] leading-relaxed text-balance">
            Sua meta: <b>{fmtKg(diff)} a menos</b>. Nas próximas perguntas a gente entende o que te atrapalhou antes, para o plano ser realista.
          </p>
        )}
        {diff <= 0 && <p className="mt-5 text-center text-[15px] leading-relaxed text-balance">Seu foco não é a balança. O plano vai priorizar energia, constância e o sal certo.</p>}
      </>
    );
  }
  if (step.variant === "method") {
    const items = [
      { img: "/lp-pt/today.webp", head: "Sal e água calculados para você", body: "Três copos com a quantidade certa de sal e lembretes ao longo do dia. É o que segura a dor de cabeça e a câimbra da primeira semana." },
      { img: "/lp-pt/meals.webp", head: "Marcar o dia leva um toque", body: "Comeu 100% carnívoro? Um toque. Saiu da dieta? Um toque honesto. Sem contar caloria." },
      { img: "/lp-pt/month.webp", head: "Cada dia limpo fica verde", body: "Você vê a sequência crescendo no calendário. Ninguém quer quebrar a sequência no fim de semana." },
    ];
    return (
      <>
        <Title sub="Baseado nas suas respostas, o seu plano foca em três coisas:">{step.title}</Title>
        <div className="flex flex-col gap-3">
          {items.map((it) => (
            <Card key={it.head} className="flex items-center gap-4 p-4">
              <Image src={it.img} alt="" width={88} height={190} className="h-[120px] w-auto flex-none rounded-xl border border-line" />
              <div>
                <div className="text-[15px] font-extrabold tracking-[-0.01em]">{it.head}</div>
                <p className="mt-1 text-[13px] leading-relaxed text-mute">{it.body}</p>
              </div>
            </Card>
          ))}
        </div>
      </>
    );
  }
  if (step.variant === "tracking") {
    return (
      <>
        <div className="mx-auto mt-8 flex size-20 items-center justify-center rounded-full bg-tint text-[38px]" aria-hidden="true">📈</div>
        <Title>{step.title}</Title>
        <Card>
          <p className="text-[15px] leading-relaxed">{step.body}</p>
          <p className="mt-4 text-[11.5px] leading-relaxed text-mute">
            Fonte: Burke LE, Wang J, Sevick MA. Self-monitoring in weight loss: a systematic review of the literature. J Am Diet Assoc. 2011;111(1):92–102.{" "}
            <a className="underline" href="https://doi.org/10.1016/j.jada.2010.10.008" target="_blank" rel="noreferrer">
              doi:10.1016/j.jada.2010.10.008
            </a>
          </p>
        </Card>
      </>
    );
  }
  // salt
  return (
    <>
      <div className="mx-auto mt-8 flex size-20 items-center justify-center rounded-full bg-tint text-[38px]" aria-hidden="true">🧂</div>
      <Title>{step.title}</Title>
      <Card>
        <p className="text-[15px] leading-relaxed">{step.body}</p>
        <ul className="mt-4 grid grid-cols-3 gap-2 text-center text-[12px] text-mute">
          {["Dor de cabeça", "Câimbra", "Cansaço"].map((s) => (
            <li key={s} className="rounded-xl bg-tint px-2 py-2.5 font-semibold text-ink">
              {s}
            </li>
          ))}
        </ul>
      </Card>
      <Disclaimer className="mt-5" />
    </>
  );
}

function Loading({ step, a, onDone }: { step: Extract<Step, { kind: "loading" }>; a: Answers; onDone: () => void }) {
  const [pct, setPct] = useState(0);
  const done = useRef(false);
  const cb = useRef(onDone);
  useEffect(() => {
    cb.current = onDone;
  });
  useEffect(() => {
    const t0 = Date.now();
    const DURATION = 4200;
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / DURATION);
      setPct(Math.round(p * 100));
      if (p >= 1 && !done.current) {
        done.current = true;
        clearInterval(id);
        setTimeout(() => cb.current(), 350);
      }
    }, 60);
    return () => clearInterval(id);
  }, []);
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <>
      <Title>{a.name?.trim() ? `${a.name.trim()}, estamos montando o seu desafio…` : step.title}</Title>
      <div className="relative mx-auto mt-2 size-[150px]">
        <svg viewBox="0 0 128 128" className="size-full -rotate-90">
          <circle cx="64" cy="64" r={r} fill="none" stroke="var(--color-line)" strokeWidth="10" />
          <circle cx="64" cy="64" r={r} fill="none" stroke="var(--color-walnut)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[32px] font-extrabold tracking-[-0.03em]">{pct}%</span>
      </div>
      <ul className="mx-auto mt-8 flex max-w-[320px] flex-col gap-3">
        {step.lines.map((l, i) => {
          const ok = pct >= ((i + 1) / step.lines.length) * 100 - 5;
          return (
            <li key={l} className={`flex items-center gap-3 text-[15px] transition-opacity ${ok ? "opacity-100" : "opacity-40"}`}>
              <span className={`flex size-6 items-center justify-center rounded-full ${ok ? "bg-good text-white" : "bg-line"}`} aria-hidden="true">
                {ok && (
                  <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                )}
              </span>
              {l}
            </li>
          );
        })}
      </ul>
    </>
  );
}
