import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-svh font-[family-name:var(--font-jakarta)] text-ink">
        <SiteHeader />
        <div className="flex flex-col items-center px-5 pt-8 pb-10">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
