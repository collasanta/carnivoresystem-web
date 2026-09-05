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
        33WEB SOFTWARE LTDA (&ldquo;we&rdquo;), Brazil. Contact: <a href="mailto:leo@leodiet.com">leo@leodiet.com</a>.
      </p>

      <h2>Leo app: local first</h2>
      <p>
        Leo works without an account. Everything you log — water, salted glasses, meals, cheat days, cramps, mood,
        symptoms, stools, your weight and training profile — is stored <strong>on your device</strong> and stays
        there unless you choose to sign in.
      </p>

      <h2>If you sign in (optional)</h2>
      <p>
        Signing in with Apple or with an e-mail code turns on cloud backup and sync. From then on we store, on servers
        operated by Supabase in the United States:
      </p>
      <ul>
        <li><strong>Your e-mail address</strong> (or the private relay address Apple gives you), used only to identify your account and send sign-in codes.</li>
        <li><strong>Your log</strong> (the items listed above, one record per day) and your settings, so they can be restored on a new phone.</li>
      </ul>
      <p>
        Each account can only read and write its own rows (row-level security). We do not sell this data, do not use it
        for advertising and do not share it with anyone except the service providers below, who process it on our behalf.
        Sign-in e-mails are delivered by Resend. Signing out keeps the backup; <strong>Settings → Delete account</strong>
        erases the account and every row immediately.
      </p>

      <h2>Analytics and crash reports</h2>
      <p>
        To understand how Leo is used and to fix crashes we use two services:
      </p>
      <ul>
        <li>
          <strong>PostHog</strong> (product analytics, US). We record which screens are opened, which buttons are tapped and
          feature events such as &ldquo;salted glass logged&rdquo;, together with a random device identifier, the app version,
          device model, OS version and language. Some sessions are recorded as a visual replay of the screen. In those
          replays every text field is masked. We never send your e-mail address to PostHog; when you are signed in, events are
          tied to a random account identifier only.
        </li>
        <li>
          <strong>Sentry</strong> (crash reporting, US). When the app crashes or a sync fails we receive a technical report
          with the error, the app version, device model and OS version. No log contents, no e-mail address.
        </li>
      </ul>
      <p>
        None of this is used for advertising, and Leo does not use Apple&rsquo;s App Tracking Transparency because it does not
        track you across other apps or websites.
      </p>

      <h2>Notifications and sharing</h2>
      <ul>
        <li>If you enable reminders, Leo schedules local notifications on your phone. No push service is involved.</li>
        <li>&ldquo;Share your progress&rdquo; renders an image on your device and hands it to the iOS share sheet. Where it goes is your choice.</li>
      </ul>

      <h2>Retention and deletion</h2>
      <ul>
        <li>Device data: until you erase it (Settings → Erase all data) or uninstall the app.</li>
        <li>Account and cloud backup: until you delete the account in Settings, or on request by e-mail.</li>
        <li>Analytics events: 1 year. Session replays: 30 days. Crash reports: 90 days.</li>
      </ul>

      <h2>Health notice</h2>
      <p>
        Leo gives general hydration and salt guidance for people on a carnivore diet. It is not medical advice and does
        not diagnose or treat any condition. If you have high blood pressure, kidney or heart disease, are pregnant or take
        diuretics, talk to a doctor before increasing salt intake.
      </p>

      <h2>Website</h2>
      <p>
        thecarnivoresystem.com uses Vercel Analytics, which counts page views without cookies and without identifying
        you. The Diet Analyzer quiz runs in your browser; answers are not stored on our servers unless you enter your
        e-mail to receive results, in which case we keep that e-mail to send them and occasional updates. You can ask us
        to delete it at any time.
      </p>

      <h2>Your rights</h2>
      <p>
        You can access, export or delete your data at any time from the app, or by writing to
        <a href="mailto:leo@leodiet.com"> leo@leodiet.com</a>. We answer within 30 days.
      </p>

      <h2>Children</h2>
      <p>Our products are not directed at children under 13 and we do not knowingly collect data from them.</p>

      <h2>Changes</h2>
      <p>If this policy changes we will update the date above. Material changes to the app will also be noted in the App Store release notes.</p>
    </article>
  );
}
