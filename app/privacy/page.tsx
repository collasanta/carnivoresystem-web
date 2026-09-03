import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — The Carnivore System",
  description: "How The Carnivore System website and the Leo app handle your data.",
};

const UPDATED = "September 3, 2026";

export default function Privacy() {
  return (
    <article className="prose-legal w-full max-w-[640px]">
      <h1 className="text-[clamp(26px,7vw,34px)] leading-[1.1] font-extrabold tracking-[-0.03em]">Privacy Policy</h1>
      <p className="mt-2 text-[13px] text-mute">Last updated {UPDATED}</p>

      <h2>Who we are</h2>
      <p>
        The Carnivore System website and the <strong>Leo — Carnivore Diet Tracker</strong> iOS app are operated by
        33WEB SOFTWARE LTDA (&ldquo;we&rdquo;). Contact: <a href="mailto:victor@33web.dev">victor@33web.dev</a>.
      </p>

      <h2>Leo app: your data stays on your phone</h2>
      <p>
        Leo does not require an account. Everything you log — water, salted glasses, meals, cheat days, cramps, mood,
        symptoms, stools, your weight and training profile — is stored <strong>only on your device</strong>. We do not
        upload it, we do not have servers that receive it, and we cannot see it.
      </p>
      <ul>
        <li><strong>Notifications.</strong> If you enable reminders, Leo schedules local notifications on your phone. No push service is involved.</li>
        <li><strong>Sharing.</strong> When you tap &ldquo;Share to story&rdquo;, Leo renders an image on your device and hands it to the iOS share sheet. Where it goes from there is your choice.</li>
        <li><strong>Analytics and tracking.</strong> Leo contains no analytics SDK, no advertising SDK and no third-party tracking.</li>
        <li><strong>Deleting your data.</strong> Settings → &ldquo;Erase all data&rdquo; wipes everything, and uninstalling the app does the same.</li>
      </ul>
      <p>
        Leo gives general hydration and salt guidance for people on a carnivore diet. It is not medical advice and does
        not diagnose or treat any condition. Talk to a doctor if you have kidney, heart or blood-pressure conditions
        before increasing salt intake.
      </p>

      <h2>Website</h2>
      <p>
        thecarnivoresystem.com uses Vercel Analytics, which counts page views without cookies and without identifying
        you. The Diet Analyzer quiz runs in your browser; answers are not stored on our servers unless you enter your
        e-mail to receive results, in which case we keep that e-mail to send them and occasional updates. You can ask us
        to delete it at any time.
      </p>

      <h2>Children</h2>
      <p>Our products are not directed at children under 13 and we do not knowingly collect data from them.</p>

      <h2>Changes</h2>
      <p>If this policy changes we will update the date above. Material changes to the app will also be noted in the App Store release notes.</p>
    </article>
  );
}
