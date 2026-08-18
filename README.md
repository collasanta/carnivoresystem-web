# The Carnivore System — Landing Page

Link-in-bio landing page for [thecarnivoresystem.com](https://thecarnivoresystem.com).
Next.js (App Router) + Tailwind CSS v4, statically prerendered, hosted on Vercel.

## Develop

```bash
npm install
npm run dev
```

## Structure

- `app/layout.tsx` — fonts (Archivo Black + Space Mono), metadata, Open Graph.
- `app/page.tsx` — page content; the five channels live in the `MODULES` array.
- `components/link-module.tsx` — one link row (index, name, detail, Live/In dev chip).
- `app/globals.css` — brand tokens (`--color-char`, `--color-ember`, `--color-blood`, …),
  the ember pulse keyframes, and the body grain/gradient background.

## Updating links

- **App / Store go live:** in `app/page.tsx`, replace the module's `href` and drop its
  `dev: true` flag. The chip flips from "In dev" to "Live" automatically.
- Social URLs point at the `@carnivoresystem` handles.

## Waitlist (/app)

`/app` is the app waitlist page; CS.04 on the homepage links to it. The form posts
to `app/api/waitlist/route.ts`, which forwards to whichever provider is configured.
**Until you set one, submissions fail with a 502** — the page renders and validates
fine, but nothing is stored.

Set one of these in Vercel → Settings → Environment Variables, then redeploy:

| Provider | Variables | Use when |
|---|---|---|
| Kit (ConvertKit) | `KIT_API_KEY`, `KIT_FORM_ID` | You want to broadcast a launch series to the list later. Checked first. |
| Formspree | `FORMSPREE_FORM_ID` | You just want the addresses in a dashboard. Simpler to set up. |

The form has a honeypot field: a submission with `company` filled returns 200 and
stores nothing, so bots get no signal.

## Later

- Add Meta Pixel / GA tag in `app/layout.tsx` when the store launches.
- `carnivoresystem.app` can host the app's own page separately.
- shadcn/ui is initialized (`components/ui/`) but unused — it's there for future UI.
