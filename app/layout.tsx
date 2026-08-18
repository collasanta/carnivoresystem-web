import type { Metadata } from "next";
import { Archivo_Black, Space_Mono } from "next/font/google";
import "./globals.css";

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
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
    <html
      lang="en"
      className={`${archivoBlack.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-svh flex-col items-center px-5 pt-10 pb-7">
        {children}
      </body>
    </html>
  );
}
