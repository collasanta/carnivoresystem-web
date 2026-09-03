import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use — The Carnivore System",
  description: "Terms for using The Carnivore System website and the Leo app.",
};

const UPDATED = "September 3, 2026";

export default function Terms() {
  return (
    <article className="prose-legal w-full max-w-[640px]">
      <h1 className="text-[clamp(26px,7vw,34px)] leading-[1.1] font-extrabold tracking-[-0.03em]">Terms of Use</h1>
      <p className="mt-2 text-[13px] text-mute">Last updated {UPDATED}</p>

      <p>
        By using thecarnivoresystem.com or the <strong>Leo — Carnivore Diet Tracker</strong> app (together, the
        &ldquo;Services&rdquo;), operated by 33WEB SOFTWARE LTDA, you agree to these terms.
      </p>

      <h2>Not medical advice</h2>
      <p>
        The Services provide general information and tracking tools for people following a carnivore diet. They are not
        a substitute for professional medical advice, diagnosis or treatment. Salt and water targets are estimates based
        on the answers you give; adjust them with your own judgement and consult a healthcare professional, especially
        if you have kidney, heart or blood-pressure conditions, are pregnant, or take medication that affects
        electrolytes.
      </p>

      <h2>Your responsibility</h2>
      <p>
        You are responsible for what you eat and drink. Stop and seek help if you feel unwell. Do not rely on the
        Services in an emergency.
      </p>

      <h2>Licence</h2>
      <p>
        We grant you a personal, non-transferable licence to use the app on Apple devices you own or control, subject to
        the App Store terms. You may not reverse-engineer, resell or redistribute it.
      </p>

      <h2>Content you share</h2>
      <p>
        Images you create with the share feature are yours. You may post them anywhere; we claim no rights over them.
      </p>

      <h2>No warranty, limited liability</h2>
      <p>
        The Services are provided &ldquo;as is&rdquo;. To the fullest extent permitted by law we disclaim all
        warranties and are not liable for any indirect, incidental or consequential damages arising from your use of
        the Services.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms; the date above will change when we do. Questions:{" "}
        <a href="mailto:victor@33web.dev">victor@33web.dev</a>.
      </p>
    </article>
  );
}
