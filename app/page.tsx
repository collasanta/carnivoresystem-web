import { LinkModule } from "@/components/link-module";

const MODULES = [
  {
    name: "Instagram",
    detail: "Daily meals · training",
    href: "https://www.instagram.com/carnivoresystem",
  },
  {
    name: "TikTok",
    detail: "Daily shorts",
    href: "https://www.tiktok.com/@carnivoresystem",
  },
  {
    name: "Carnivore System App",
    detail: "iOS · macro tracker",
    href: "/app",
    chip: "Waitlist",
  },
  {
    name: "Diet Analyzer",
    detail: "Free · find the gaps in what you eat",
    href: "/analyzer",
  },
  {
    name: "YouTube",
    detail: "Long-form · recipes · results",
    href: "#",
    dev: true,
  },
  {
    name: "Online Store",
    detail: "Kitchen tools of the system",
    href: "#",
    dev: true,
  },
];

export default function Home() {
  return (
    <div className="w-full max-w-[480px]">
      <header className="text-center">
        <div className="flex items-center justify-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-mute uppercase">
          <span
            aria-hidden="true"
            className="size-[7px] flex-none animate-pulse-soft rounded-full bg-walnut motion-reduce:animate-none"
          />
          Est. 2026
        </div>

        <h1 className="mt-3 text-[clamp(30px,8vw,40px)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance">
          The Carnivore
          <br />
          <span className="text-walnut">System</span>
        </h1>

        <p className="mt-3 text-[14px] text-mute">Eat meat. Train hard. Track everything.</p>
      </header>

      <nav aria-label="Channels" className="mt-8">
        <ul className="flex list-none flex-col gap-3">
          {MODULES.map((mod) => (
            <li key={mod.name}>
              <LinkModule {...mod} />
            </li>
          ))}
        </ul>
      </nav>

      <footer className="mt-10 text-center text-[11px] text-mute">
        Meat · Salt · Iron — &copy; 2026 The Carnivore System
      </footer>
    </div>
  );
}
