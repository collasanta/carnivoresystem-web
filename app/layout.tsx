import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://thecarnivoresystem.com"),
  title: "The Carnivore System",
  description:
    "Eat meat. Train hard. Track everything. The Carnivore System — daily carnivore lifestyle, tracker app, and tools.",
  openGraph: {
    title: "The Carnivore System",
    description: "Eat meat. Train hard. Track everything.",
    url: "https://thecarnivoresystem.com",
    type: "website",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const h = await headers();
  const host = h.get("host") ?? "";
  const isLeo = host.endsWith("leodiet.com");
  // web2app funnel (/quiz/*, flagged by middleware.ts): full-bleed, pt-BR, no site header
  const isFunnel = h.get("x-w2a") === "1";
  return (
    <html lang={isFunnel ? "pt-BR" : "en"} className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-svh font-[family-name:var(--font-jakarta)] text-ink">
        {isLeo || isFunnel ? null : <SiteHeader />}
        {isFunnel ? children : <div className="flex flex-col items-center px-5 pt-8 pb-10">{children}</div>}
        <Analytics />
      </body>
    </html>
  );
}
