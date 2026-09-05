import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leo Support — The Carnivore System",
  description: "Help for the Leo carnivore diet tracker app: common questions, account and data, contact.",
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "Do I need an account?",
    a: "No. Leo stores everything on your phone. Sign in only if you want a cloud backup to restore on a new phone.",
  },
  {
    q: "How are the water and salt targets calculated?",
    a: "From your weight, training and how long you have been carnivore, using the high end of the usual ranges for a zero-carb diet. You can change both in Settings → Goals. This is general guidance, not medical advice.",
  },
  {
    q: "Why half a teaspoon in 500 ml (16 oz) and not more?",
    a: "Salt water above roughly 100 mmol/L of sodium pulls water into the gut and can cause loose stools. Half a teaspoon in a glass or one teaspoon in a 1 L (32 oz) bottle stays under that line. Sip it, ideally with food.",
  },
  {
    q: "I don't want to log every meal.",
    a: "Use \"Don't want to log meals?\" at the bottom of the Meals card. One tap confirms the day as 100% carnivore and counts as fed.",
  },
  {
    q: "Can I change the time of a meal I logged?",
    a: "Yes. Tap the meal to edit what it was and when. Long-press \"Add\" to log a meal with a specific time.",
  },
  {
    q: "The sign-in e-mail didn't arrive.",
    a: "Check the spam folder for a message from leo@thecarnivoresystem.com. Codes expire after 10 minutes; request a new one if needed.",
  },
  {
    q: "How do I delete my data?",
    a: "Settings → \"Erase all data\" wipes the phone. Settings → Account → \"Delete account\" removes the cloud backup and the account permanently.",
  },
  {
    q: "ml or fl oz?",
    a: "Leo follows your iPhone's measurement system. Force either one in Settings → Units.",
  },
];

export default function Support() {
  return (
    <article className="prose-legal w-full max-w-[640px]">
      <h1 className="text-[clamp(26px,7vw,34px)] leading-[1.1] font-extrabold tracking-[-0.03em]">Leo Support</h1>
      <p className="mt-2 text-[13px] text-mute">Carnivore Diet Tracker for iPhone</p>

      <h2>Contact</h2>
      <p>
        E-mail <a href="mailto:victor@33web.dev">victor@33web.dev</a> and include your iPhone model and iOS version.
        We answer within two business days. Bugs and ideas are welcome.
      </p>

      <h2>Common questions</h2>
      {FAQ.map((f) => (
        <div key={f.q}>
          <h3>{f.q}</h3>
          <p>{f.a}</p>
        </div>
      ))}

      <h2>Privacy</h2>
      <p>
        What Leo stores, where, and how to delete it: <a href="/privacy">Privacy Policy</a>. Terms: <a href="/terms">Terms of Use</a>.
      </p>
    </article>
  );
}
