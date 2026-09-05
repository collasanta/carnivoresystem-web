import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — The Carnivore System",
  description: "How The Carnivore System website and the Leo app handle your data.",
};

const UPDATED = "September 5, 2026";

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

      <h2>Leo app: local first</h2>
      <p>
        Leo works without an account. Everything you log — water, salted glasses, meals, cheat days, cramps, mood,
        symptoms, stools, your weight and training profile — is stored <strong>on your device</strong>. It only leaves
        your phone if you choose to sign in (see &ldquo;Cloud backup&rdquo; below).
      </p>
      <ul>
        <li><strong>Notifications.</strong> If you enable reminders, Leo schedules local notifications on your phone. No push service is involved.</li>
        <li><strong>Sharing.</strong> When you tap &ldquo;Share&rdquo;, Leo renders an image on your device and hands it to the iOS share sheet. Where it goes from there is your choice.</li>
        <li><strong>Deleting local data.</strong> Settings → &ldquo;Erase all data&rdquo; wipes everything on the device, and uninstalling the app does the same.</li>
      </ul>

      <h2>Cloud backup (optional, requires sign-in)</h2>
      <p>
        If you sign in with Apple or with your e-mail, Leo backs up your log and settings so you can restore them on a
        new phone. This is what we store, and where:
      </p>
      <ul>
        <li><strong>What:</strong> your e-mail address (or the private relay address Apple gives you), a user ID, your settings, and your daily log (water, salted glasses, meals, cheats, mood, symptoms, stools). We never store your Apple password; sign-in codes sent by e-mail expire in 10 minutes.</li>
        <li><strong>Where:</strong> Supabase (database and authentication), hosted in the United States, encrypted in transit and at rest. Access is restricted per user: only your account can read or write your rows.</li>
        <li><strong>E-mail delivery:</strong> sign-in codes are sent through Resend from <em>leo@thecarnivoresystem.com</em>.</li>
        <li><strong>Retention:</strong> as long as your account exists.</li>
        <li><strong>Deletion:</strong> Settings → Account → &ldquo;Delete account&rdquo; permanently removes your account and every row tied to it from our database, immediately. Signing out keeps the backup; deleting removes it.</li>
      </ul>

      <h2>Analytics and crash reports</h2>
      <p>
        To understand what works and to fix bugs, Leo sends usage and diagnostic data to two providers. None of it is
        used for advertising, none of it is sold, and we do not track you across other apps or websites.
      </p>
      <ul>
        <li><strong>PostHog (product analytics).</strong> Which screens you open and which features you use (for example: &ldquo;salted glass logged&rdquo;, &ldquo;meal logged&rdquo;), device model, OS version, app version, language, and a session replay of the app screens and taps. In replays, text fields are masked. Analytics are tied to a random user ID, never to your e-mail. Hosted in the United States.</li>
        <li><strong>Sentry (crash reports).</strong> When the app crashes or hits an error, a report is sent with the stack trace, device model, OS version and app version, tied to the same random user ID. No e-mail, no log contents. Hosted in the United States.</li>
      </ul>
      <p>
        Both providers process this data on our behalf under their own privacy terms and delete it after their standard
        retention windows (replays: 30 days; events and crash reports: up to 90 days).
      </p>

      <h2>Your rights</h2>
      <p>
        You can access, export or delete your cloud data by deleting your account in the app, or by e-mailing us. If you
        are in the EU/UK or Brazil (LGPD), you also have the right to object to or restrict processing and to complain to
        your supervisory authority. We answer within 30 days.
      </p>

      <h2>Health notice</h2>
      <p>
        Leo gives general hydration and salt guidance for people on a carnivore diet. It is not medical advice and does
        not diagnose or treat any condition. Talk to a doctor before increasing salt if you have kidney, heart or
        blood-pressure conditions, are pregnant, or take diuretics.
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
