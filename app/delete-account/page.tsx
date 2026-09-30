import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete your Leo account — The Carnivore System",
  description: "How to delete your LeoDiet account and all associated data.",
};

export default function DeleteAccount() {
  return (
    <article className="prose-legal w-full max-w-[640px]">
      <h1 className="text-[clamp(26px,7vw,34px)] leading-[1.1] font-extrabold tracking-[-0.03em]">Delete your Leo account</h1>
      <p className="mt-2 text-[13px] text-mute">LeoDiet — Carnivore Diet Tracker</p>

      <h2>In the app (instant)</h2>
      <ol>
        <li>Open Leo and go to <strong>Settings</strong>.</li>
        <li>Tap <strong>Delete account</strong> and confirm.</li>
      </ol>
      <p>
        Your account and every row of your cloud backup (log, settings, profile) are erased immediately. Data that only
        lives on your phone is removed with <strong>Settings → Erase all data</strong> or by uninstalling the app.
      </p>

      <h2>By e-mail</h2>
      <p>
        Can&rsquo;t open the app? Write to <a href="mailto:leo@leodiet.com">leo@leodiet.com</a> from the e-mail address
        of the account and ask us to delete it. We delete the account and its data within 30 days, usually much sooner.
      </p>

      <h2>What gets deleted</h2>
      <ul>
        <li>Your e-mail address and account record.</li>
        <li>Your cloud backup: daily logs, weight and training profile, settings.</li>
        <li>Voice usage records (recordings and transcripts are never stored).</li>
      </ul>
      <p>
        Anonymous analytics and crash reports are not tied to your e-mail and expire on their own (analytics 1 year,
        session replays 30 days, crash reports 90 days). Purchase records kept by Apple or Google are managed by them.
        See the <a href="/privacy">Privacy Policy</a> for details.
      </p>
    </article>
  );
}
