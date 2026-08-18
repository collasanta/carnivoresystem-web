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

## Later

- Add Meta Pixel / GA tag in `app/layout.tsx` when the store launches.
- `carnivoresystem.app` can host the app's own page separately.
- shadcn/ui is initialized (`components/ui/`) but unused — it's there for future UI.
