import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leo Support — The Carnivore System",
  description: "Help for the Leo — Carnivore Diet Tracker app.",
};

const FAQ: { q: string; a: string }[] = [
  { q: "Why three salted glasses?", a: "On a carnivore diet you lose sodium faster. Leo spreads your salt through the day in three glasses of water so you avoid the afternoon crash and cramps. Salt your food generously too." },
  { q: "The salted glass gives me loose stools", a: "Too much salt in too little water works as a laxative. Keep to ½ teaspoon per 500 ml (16 fl oz) glass, sip it over a few minutes, ideally with food. If you use a 1 L bottle, 1 teaspoon is the maximum." },
  { q: "I don't want to log every meal", a: "You don't have to. At the end of the day tap \"Don't want to log meals?\" and confirm you ate 100% carnivore. That counts as fed." },
  { q: "How do I fix the time of a meal?", a: "Tap the meal to edit what you ate and when. Long-press \"Add\" to log a meal with a specific time." },
  { q: "Do I need an account?", a: "No. Everything stays on your phone. Signing in (Apple or e-mail code) only adds cloud backup so you can restore on a new phone." },
  { q: "I didn't get the sign-in code", a: "Check your spam folder; the sender is leo@thecarnivoresystem.com. The code lasts 10 minutes." },
  { q: "How do I switch between ml and fl oz?", a: "Settings → Units. \"Automatic\" follows your iPhone's measurement system." },
  { q: "How do I delete my data?", a: "Settings → Erase all data removes everything on the phone. Settings → Delete account removes the cloud backup and the account." },
];

export default function Support() {
  return (
    <article className="prose-legal w-full max-w-[640px]">
      <h1 className="text-[clamp(26px,7vw,34px)] leading-[1.1] font-extrabold tracking-[-0.03em]">Leo Support</h1>
      <p className="mt-2 text-[13px] text-mute">Leo — Carnivore Diet Tracker for iPhone</p>

      <h2>Contact</h2>
      <p>
        E-mail <a href="mailto:leo@thecarnivoresystem.com">leo@thecarnivoresystem.com</a>. We answer within two business
        days. Include your iPhone model and iOS version if it is a bug.
      </p>

      <h2>Common questions</h2>
      {FAQ.map((f) => (
        <div key={f.q}>
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </div>
      ))}

      <h2>Health notice</h2>
      <p>
        Leo is a habit journal, not medical advice. If you have high blood pressure, kidney or heart disease, are pregnant
        or take diuretics, talk to your doctor before increasing salt.
      </p>

      <p>
        <a href="/privacy">Privacy policy</a> · <a href="/terms">Terms of use</a>
      </p>
    </article>
  );
}
