/**
 * The web2app quiz (leodiet.com/quiz), PT-BR. One screen per entry in STEPS, in order. Copy rules:
 * no promise of a medical outcome, no fake numbers (no "93% of users"), no testimonials we can't show are real.
 * Social proof = how the method works + one cited study. Answers are health-ish data: they go to Supabase
 * (web_leads.answers) and never to Meta (pixel events carry only the step id).
 */

/** pt-v2 (2026-10-27): + salt type, symptoms (replaced "energy"), activity aligned with the app's training levels.
 *  The app builds its profile from these answers (leo src/lib/webProfile.ts): keep option ids in sync with it. */
/** pt-v3 (2026-10-29): framed as the "Desafio Carnívoro de 30 dias". The "commit" question (7/30/90 days) is gone:
 *  accepting the challenge sets commit "30"; new keys challengeStart / challengeStartPick / challengeAcceptedAt
 *  (ignored by the app). Every pt-v2 key and option id is unchanged. */
export const QUIZ_VERSION = "pt-v3";

export type Answers = {
  goal?: string;
  sex?: "female" | "male";
  age?: string;
  tenure?: string;
  heightCm?: number;
  weightKg?: number;
  targetKg?: number;
  pastDiets?: string[];
  blockers?: string[];
  eatingNow?: string;
  meals?: string;
  cravings?: string;
  water?: string;
  /** pt-v1 only (replaced by symptoms in pt-v2) */
  energy?: string;
  /** app SYMPTOM_PRESETS ids (leo src/data/presets.ts); ["none"] = none */
  symptoms?: string[];
  /** app SaltType: table | fine-sea | kosher | coarse | none */
  salt?: string;
  sleep?: string;
  activity?: string;
  event?: string;
  pace?: "calm" | "steady" | "fast";
  /** pt-v2 asked it (7 | 30 | 90); pt-v3 sets "30" when the challenge is accepted. App: 7 → 7, else 30. */
  commit?: string;
  name?: string;
  /** pt-v3: day 1 of the 30-day challenge, local date "YYYY-MM-DD" (set after the e-mail step) */
  challengeStart?: string;
  challengeStartPick?: "today" | "tomorrow" | "monday";
  /** pt-v3: ISO timestamp of the press-and-hold "Eu aceito o desafio" */
  challengeAcceptedAt?: string;
};

export type Option = { id: string; label: string; hint?: string; emoji?: string };

export type Step =
  | { kind: "single"; id: string; key: keyof Answers; title: string; sub?: string; options: Option[] }
  | { kind: "multi"; id: string; key: keyof Answers; title: string; sub?: string; options: Option[]; none?: string }
  | { kind: "number"; id: string; key: "heightCm" | "weightKg" | "targetKg"; title: string; sub?: string; unit: string; min: number; max: number; placeholder: string }
  | { kind: "text"; id: string; key: "name"; title: string; sub?: string; placeholder: string; optional?: boolean }
  | { kind: "info"; id: string; variant: "salt" | "tracking" | "profile" | "method"; title: string; body: string; cta?: string }
  | { kind: "loading"; id: string; title: string; lines: string[] };

export const STEPS: Step[] = [
  {
    kind: "single", id: "goal", key: "goal",
    title: "Qual é o seu principal objetivo com a carnívora?",
    sub: "Vamos montar o seu desafio de 30 dias em cima disso.",
    options: [
      { id: "lose", label: "Perder peso", emoji: "⚖️" },
      { id: "energy", label: "Ter mais energia e foco", emoji: "⚡" },
      { id: "cravings", label: "Parar com a compulsão por doce", emoji: "🍩" },
      { id: "digestion", label: "Melhorar a digestão e o inchaço", emoji: "🫃" },
      { id: "muscle", label: "Ganhar massa e força", emoji: "💪" },
      { id: "health", label: "Cuidar da saúde no geral", emoji: "❤️" },
    ],
  },
  {
    kind: "single", id: "sex", key: "sex",
    title: "Você é…",
    sub: "Homens e mulheres têm necessidades de sal, água e ritmo de perda diferentes.",
    options: [
      { id: "female", label: "Mulher" },
      { id: "male", label: "Homem" },
    ],
  },
  {
    kind: "single", id: "age", key: "age",
    title: "Qual a sua idade?",
    options: [
      { id: "18-29", label: "18 a 29" },
      { id: "30-39", label: "30 a 39" },
      { id: "40-49", label: "40 a 49" },
      { id: "50-59", label: "50 a 59" },
      { id: "60+", label: "60 ou mais" },
    ],
  },
  {
    kind: "single", id: "tenure", key: "tenure",
    title: "Você já faz a dieta carnívora?",
    options: [
      { id: "never", label: "Ainda não, quero começar" },
      { id: "new", label: "Comecei há menos de 1 mês" },
      { id: "months", label: "Faço há 1 a 6 meses" },
      { id: "veteran", label: "Faço há mais de 6 meses" },
      { id: "restart", label: "Já fiz, parei e quero voltar" },
    ],
  },
  {
    kind: "info", id: "info-salt", variant: "salt",
    title: "A carnívora é simples. O difícil é a primeira semana.",
    body: "Quando você corta os carboidratos, o corpo elimina mais água e sódio. É por isso que tanta gente sente dor de cabeça, câimbra e cansaço nos primeiros dias e acha que a dieta “não é pra ela”. Acertar o sal e a água desde o dia 1 é a primeira coisa que o seu desafio resolve.",
  },
  {
    kind: "number", id: "height", key: "heightCm",
    title: "Qual a sua altura?", unit: "cm", min: 130, max: 220, placeholder: "170",
  },
  {
    kind: "number", id: "weight", key: "weightKg",
    title: "Qual o seu peso hoje?", sub: "Pode ser aproximado. Só você e o seu plano vão ver.",
    unit: "kg", min: 35, max: 250, placeholder: "80",
  },
  {
    kind: "number", id: "target", key: "targetKg",
    title: "E qual peso você gostaria de ter?", sub: "Se o seu objetivo não é peso, repita o peso atual.",
    unit: "kg", min: 35, max: 250, placeholder: "72",
  },
  {
    kind: "info", id: "info-profile", variant: "profile",
    title: "Seu ponto de partida",
    body: "",
  },
  {
    kind: "multi", id: "past-diets", key: "pastDiets",
    title: "O que você já tentou antes?", sub: "Marque tudo o que se aplica.",
    options: [
      { id: "keto", label: "Low carb ou cetogênica" },
      { id: "fasting", label: "Jejum intermitente" },
      { id: "calories", label: "Contar calorias" },
      { id: "nutritionist", label: "Dieta com nutricionista" },
      { id: "shakes", label: "Shakes, chás ou dietas da moda" },
      { id: "gym", label: "Só academia" },
    ],
    none: "Nunca fiz dieta",
  },
  {
    kind: "multi", id: "blockers", key: "blockers",
    title: "O que mais te tirou da dieta das outras vezes?", sub: "Marque tudo o que se aplica.",
    options: [
      { id: "sweets", label: "Vontade de doce" },
      { id: "weekends", label: "Fins de semana, festas e churrasco com cerveja" },
      { id: "symptoms", label: "Dor de cabeça, câimbra ou cansaço no começo" },
      { id: "what-to-eat", label: "Não saber o que comer" },
      { id: "consistency", label: "Começo animado e paro depois de algumas semanas" },
      { id: "no-results", label: "Não ver resultado e desanimar" },
    ],
    none: "Nada específico",
  },
  {
    kind: "info", id: "info-tracking", variant: "tracking",
    title: "Quem registra o dia mantém o hábito por mais tempo",
    body: "Uma revisão de 22 estudos sobre emagrecimento encontrou associação consistente entre se automonitorar (anotar o que come, o peso, o dia) e melhores resultados. Por isso o seu desafio é baseado em marcar o dia, e não em contar caloria.",
  },
  {
    kind: "single", id: "eating-now", key: "eatingNow",
    title: "Como é a sua alimentação hoje?",
    options: [
      { id: "carby", label: "Bastante pão, massa, arroz e doce" },
      { id: "mixed", label: "Mista, um pouco de tudo" },
      { id: "lowcarb", label: "Já como pouco carboidrato" },
      { id: "carnivore", label: "Já sou carnívoro(a)" },
    ],
  },
  {
    kind: "single", id: "meals", key: "meals",
    title: "Quantas refeições você faz por dia?",
    options: [
      { id: "1", label: "1 (OMAD)" },
      { id: "2", label: "2" },
      { id: "3", label: "3" },
      { id: "4+", label: "4 ou mais, belisco bastante" },
    ],
  },
  {
    kind: "single", id: "cravings", key: "cravings",
    title: "Com que frequência bate vontade de doce?",
    options: [
      { id: "daily", label: "Todo dia" },
      { id: "weekly", label: "Algumas vezes por semana" },
      { id: "rarely", label: "Raramente" },
    ],
  },
  {
    kind: "single", id: "water", key: "water",
    title: "Quanta água você bebe por dia?",
    options: [
      { id: "low", label: "Menos de 1 litro" },
      { id: "mid", label: "1 a 2 litros" },
      { id: "high", label: "Mais de 2 litros" },
      { id: "unknown", label: "Não faço ideia" },
    ],
  },
  {
    kind: "single", id: "salt", key: "salt",
    title: "Qual sal você usa em casa?",
    sub: "Cada sal tem uma quantidade diferente de sódio na colher. O seu plano se ajusta a ele.",
    options: [
      { id: "table", label: "Sal refinado (de cozinha)" },
      { id: "fine-sea", label: "Sal marinho fino ou rosa do Himalaia fino" },
      { id: "coarse", label: "Sal grosso ou em flocos" },
      { id: "kosher", label: "Sal kosher" },
      { id: "none", label: "Quase não uso sal" },
    ],
  },
  {
    kind: "multi", id: "symptoms", key: "symptoms",
    title: "Sentiu algum desses ultimamente?", sub: "Marque tudo o que se aplica. Muitos são sinais de pouco sal e pouca água.",
    options: [
      { id: "fatigue", label: "Cansaço, pouca energia" },
      { id: "headache", label: "Dor de cabeça" },
      { id: "cramps", label: "Câimbras" },
      { id: "brain-fog", label: "Mente nublada, falta de foco" },
      { id: "cravings", label: "Vontade de doce" },
      { id: "insomnia", label: "Sono ruim" },
      { id: "dizziness", label: "Tontura" },
      { id: "bloating", label: "Inchaço" },
    ],
    none: "Nenhum desses",
  },
  {
    kind: "single", id: "sleep", key: "sleep",
    title: "Quantas horas você dorme por noite?",
    options: [
      { id: "<6", label: "Menos de 6 horas" },
      { id: "6-7", label: "6 a 7 horas" },
      { id: "7-8", label: "7 a 8 horas" },
      { id: ">8", label: "Mais de 8 horas" },
    ],
  },
  {
    kind: "single", id: "activity", key: "activity",
    title: "Quanto você se movimenta?",
    options: [
      { id: "sedentary", label: "Quase nada, trabalho sentado(a)" },
      { id: "light", label: "Caminhadas ou treino 1 a 2 vezes por semana" },
      { id: "moderate", label: "Treino 3 a 5 vezes por semana" },
      { id: "active", label: "Treino 6 vezes ou mais por semana" },
    ],
  },
  {
    kind: "single", id: "event", key: "event",
    title: "Tem alguma data te motivando?",
    options: [
      { id: "trip", label: "Férias ou viagem" },
      { id: "wedding", label: "Casamento ou festa" },
      { id: "checkup", label: "Exames ou consulta médica" },
      { id: "summer", label: "Verão" },
      { id: "none", label: "Nada específico, quero mudar de vez" },
    ],
  },
  {
    kind: "single", id: "pace", key: "pace",
    title: "Em que ritmo você quer ir?",
    sub: "Você pode mudar depois no app.",
    options: [
      { id: "calm", label: "Com calma", hint: "Mais fácil de manter" },
      { id: "steady", label: "Ritmo constante", hint: "O que a maioria escolhe" },
      { id: "fast", label: "Mais rápido", hint: "Exige mais disciplina" },
    ],
  },
  {
    kind: "info", id: "info-method", variant: "method",
    title: "Como o LeoDiet te leva até o dia 30",
    body: "",
  },
  {
    kind: "text", id: "name", key: "name",
    title: "Como podemos te chamar?", placeholder: "Seu primeiro nome", optional: true,
  },
  {
    kind: "loading", id: "loading",
    title: "Montando o seu desafio…",
    lines: ["Analisando suas respostas", "Calculando seu sal e sua água", "Planejando a semana de adaptação", "Ajustando aos seus obstáculos"],
  },
];

/** Steps that count as "milestones" for the pixel (custom events, step id only). */
export const MILESTONES: Record<string, string> = {
  "info-salt": "QuizQuarter",
  "info-tracking": "QuizHalf",
  "info-method": "QuizThreeQuarters",
  loading: "QuizComplete",
};

export const label = (stepId: string, optionId: string | undefined): string => {
  const s = STEPS.find((x) => x.id === stepId);
  if (!s || !("options" in s)) return optionId ?? "";
  return s.options.find((o) => o.id === optionId)?.label ?? optionId ?? "";
};

/** Is the step answered enough to continue? */
export function canContinue(step: Step, a: Answers): boolean {
  switch (step.kind) {
    case "single":
      return !!a[step.key];
    case "multi":
      return Array.isArray(a[step.key]) && (a[step.key] as string[]).length > 0;
    case "number": {
      const v = a[step.key];
      return typeof v === "number" && v >= step.min && v <= step.max;
    }
    default:
      return true;
  }
}
