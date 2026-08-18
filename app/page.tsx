import { LinkModule } from "@/components/link-module";

const MODULES = [
  {
    index: "CS.01",
    name: "Instagram",
    detail: "Daily meals · training",
    href: "https://www.instagram.com/carnivoresystem",
  },
  {
    index: "CS.02",
    name: "TikTok",
    detail: "Daily shorts",
    href: "https://www.tiktok.com/@carnivoresystem",
  },
  {
    index: "CS.03",
    name: "Carnivore System App",
    detail: "iOS · macro tracker",
    href: "/app",
    chip: "Waitlist",
  },
  {
    index: "CS.04",
    name: "YouTube",
    detail: "Long-form · recipes · results",
    href: "#",
    dev: true,
  },
  {
    index: "CS.05",
    name: "Online Store",
    detail: "Kitchen tools of the system",
    href: "#",
    dev: true,
  },
];

export default function Home() {
  return (
    <div className="w-full max-w-[480px]">
      <header>
        <div className="flex items-center gap-2.5 text-[11px] tracking-[0.18em] text-salt uppercase">
          <span
            aria-hidden="true"
            className="size-[7px] flex-none animate-ember rounded-full bg-ember shadow-[0_0_8px_var(--color-ember)] motion-reduce:animate-none"
          />
          system online — est. 2026
        </div>

        <h1 className="mt-3.5 font-display font-bold text-[clamp(38px,11vw,54px)] leading-[0.94] tracking-[-0.01em] uppercase">
          <span className="mb-1.5 block font-mono text-[12px] font-bold tracking-[0.5em] text-ember">
            The
          </span>
          Carnivore
          <br />
          <span className="text-ember">System</span>
        </h1>

        <p className="mt-4 text-[13px] tracking-[0.02em] text-salt">
          Eat meat. Train hard. Track everything.
        </p>

        <div
          aria-hidden="true"
          className="mt-[26px] mb-[22px] h-[2px] w-full bg-[linear-gradient(90deg,var(--color-blood),var(--color-ember)_35%,transparent)]"
        />
      </header>

      <nav aria-label="Channels">
        <ul className="flex list-none flex-col gap-3">
          {MODULES.map((mod) => (
            <li key={mod.index}>
              <LinkModule {...mod} />
            </li>
          ))}
        </ul>
      </nav>

      <footer className="mt-[34px] flex items-center gap-2.5 text-[10px] tracking-[0.2em] text-salt uppercase">
        Meat · Salt · Iron <span className="text-ash">|</span> © 2026 The
        Carnivore System
      </footer>
    </div>
  );
}
