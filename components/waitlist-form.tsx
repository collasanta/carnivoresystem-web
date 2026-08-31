"use client";

import { useState } from "react";

type State = { status: "idle" | "sending" | "done" | "error"; message?: string };

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot; humans leave it empty
  const [state, setState] = useState<State>({ status: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status === "sending") return;
    setState({ status: "sending" });

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Something went wrong." });
        return;
      }
      setState({ status: "done" });
    } catch {
      setState({ status: "error", message: "Network error. Try again." });
    }
  }

  if (state.status === "done") {
    return (
      <p role="status" className="rounded-2xl border border-line bg-card p-5 text-[13px] leading-relaxed">
        <span className="mb-1 block text-[14px] font-bold text-ink">You&rsquo;re on the list</span>
        <span className="text-mute">
          The TestFlight invite goes out the day it ships. Nothing else in between.
        </span>
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <label
        htmlFor="email"
        className="text-[11px] font-semibold tracking-[0.14em] text-mute uppercase"
      >
        Email
      </label>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={state.status === "error"}
          className="min-w-0 flex-1 rounded-full border border-line bg-card px-5 py-3.5 text-[14px] text-ink placeholder:text-faint focus:border-cta focus:outline-2 focus:outline-offset-2 focus:outline-cta"
        />

        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />

        <button
          type="submit"
          disabled={state.status === "sending"}
          className="rounded-full bg-cta px-7 py-3.5 text-[12.5px] font-bold tracking-[0.12em] whitespace-nowrap text-card uppercase transition-colors duration-150 hover:bg-ctah focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cta disabled:opacity-60"
        >
          {state.status === "sending" ? "Sending…" : "Join waitlist"}
        </button>
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-[12px] font-medium text-bad">
          {state.message}
        </p>
      )}

      <p className="text-[12px] leading-relaxed text-mute">
        One email when the app ships. No newsletter, no selling your address.
      </p>
    </form>
  );
}
