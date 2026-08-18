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
      <p
        role="status"
        className="border border-ember px-4 py-4 text-[13px] leading-relaxed text-bone"
      >
        <span className="mb-1 block font-display text-[13px] tracking-[0.04em] uppercase">
          You&rsquo;re on the list
        </span>
        <span className="text-salt">
          The TestFlight invite goes out the day it ships. Nothing else in between.
        </span>
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <label htmlFor="email" className="text-[10px] tracking-[0.2em] text-salt uppercase">
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
          className="min-w-0 flex-1 border border-edge bg-smoke px-4 py-3 text-[13px] text-bone placeholder:text-salt/70 focus:border-ember focus:outline-2 focus:outline-offset-2 focus:outline-ember"
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
          className="border border-ember bg-ember px-6 py-3 font-display text-[12px] tracking-[0.14em] whitespace-nowrap text-char uppercase transition-[opacity,background-color] duration-[180ms] ease-out hover:bg-blood focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-60"
        >
          {state.status === "sending" ? "Sending…" : "Join waitlist"}
        </button>
      </div>

      {state.status === "error" && (
        <p role="alert" className="text-[12px] text-ember">
          {state.message}
        </p>
      )}

      <p className="text-[11px] leading-relaxed text-salt">
        One email when the app ships. No newsletter, no selling your address.
      </p>
    </form>
  );
}
