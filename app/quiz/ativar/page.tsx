import { Activate } from "@/components/w2a/activate";

// /quiz/ativar?c=LEO-XXXX-XXXX — linked from the code e-mail: same download + activate panel, code from the URL.
export default async function ActivatePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const c = (await searchParams).c;
  return <Activate code={typeof c === "string" ? c : ""} />;
}
