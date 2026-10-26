import type { Metadata, Viewport } from "next";
import { FunnelBoot } from "@/components/w2a/ui";

// web2app funnel: Meta ad → quiz → plan → e-mail → web paywall → payment → download + code. docs/web2app.md
export const metadata: Metadata = {
  title: "LeoDiet — Seu plano carnívoro personalizado",
  description: "Responda 2 minutos de perguntas e receba um plano de dieta carnívora feito para você: sal, água, ritmo e o que te tirou da dieta antes.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://leodiet.com/quiz" },
  openGraph: {
    title: "Seu plano carnívoro personalizado · LeoDiet",
    description: "2 minutos de perguntas, um plano feito para você.",
    url: "https://leodiet.com/quiz",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "https://leodiet.com/lp-pt/today.webp", width: 440, height: 957 }],
  },
};

export const viewport: Viewport = { themeColor: "#fcf8f1", width: "device-width", initialScale: 1 };

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FunnelBoot />
      {children}
    </>
  );
}
