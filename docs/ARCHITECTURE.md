# Architecture

## One codebase, two apps

```
content/*.yaml ──► scripts/build-content.ts ──► apps/web/src/generated/*.json
                         (validate + compile)            │
packages/core  ◄───── shared types, engines ─────────────┤
                                                         ▼
                                     apps/web  (Next.js, output: "export")
                                                         │  apps/web/out  (static HTML/JS/CSS)
                                    ┌────────────────────┴────────────────────┐
                                    ▼                                         ▼
                        any static host (website)              apps/android/build.sh
                        + service worker for offline           → APK with the site in assets/www
```

The website is a fully static export: every page, including all lessons, is pre-rendered HTML.
There is no server code, which makes it cheap to host and lets the Android app ship the exact same
files.

## Content pipeline

`scripts/build-content.ts` runs before every build:

1. Reads `content/curriculum.json` (the outline) and every lesson YAML in `content/lessons/`.
2. Lints the YAML (`scripts/lint-yaml.ts`) and validates it against the zod schema in
   `packages/core/src/schema.ts`.
3. Cross-checks: glossary links (`[[term-id]]`), quiz answer ranges, diagram/animation node and
   edge references, scenario links, simulation fields, comparison cell counts.
4. Renders Markdown to HTML and writes:
   - `catalog.json`: modules, sections, lessons (title, minutes, level, roles, modalities, status), paths
   - `lessons/<id>.json`: one per written lesson
   - `search.json`, `flashcards.json`

A curriculum item without a YAML file appears as **Coming soon**, so the outline for all modules
is visible while content is written module by module.

## Learner state

All progress lives in one JSON object (`LearnerState` in `packages/core/src/progress.ts`) saved in
`localStorage` under `wm:learner:v1`. The functions that change it are pure (state in, state out),
which keeps them testable and identical on web and Android.

- XP: lessons 10–40 by length, capstones +60, 10 per newly-correct quiz answer, +20 for a perfect
  quiz, +50 for the daily goal, +2 per flashcard, +15 per scenario/simulation.
- Levels and ranks (In Work → Under Review → Released → Baseline) follow `xpForLevel`.
- Streaks come from active days; flashcards use Leitner boxes (due after 0, 1, 3, 7, 16 days).
- Badges and certificates are evaluated after every change. A module certificate needs every item
  completed and each checkpoint passed at 80%.
- An analytics event log (last 1000 events) powers the Insights tab.
- Learners can export, import and reset their data from **Me → Settings**.

### Adding accounts and sync later

`SyncAdapter` (pull/push) and `mergeStates` in `progress.ts` are the seam for a backend. Merging
keeps the furthest progress from each device. To add sync: implement an adapter (e.g. Firebase
Auth + Firestore storing one document per learner), call `pull` on sign-in and `push` after
changes in `apps/web/src/lib/store.tsx`. No backend is needed today.

## Website

- Next.js App Router, React, Tailwind CSS v4. Design tokens (colours, fonts, radii) live in
  `apps/web/src/styles/tokens.css`; components use them through CSS variables, so a re-theme is a
  token change. Fonts are self-hosted for offline use.
- `apps/web/src/components/LessonPlayer.tsx` plays a lesson in **cards** mode (one block per
  screen, swipe) or **scroll** mode. Block renderers are in `components/blocks/`.
- `scripts/postbuild-web.ts` writes `out/sw.js`, a service worker that precaches the whole site
  after the first visit (pages network-first, assets cache-first).
- `scripts/build-pdfs.ts` prints each module's cheat sheet page to `out/pdf/`.

## Android app

See [ANDROID.md](ANDROID.md). The app is a thin Java shell around a WebView. It serves the bundled
site from `assets/www` at a private `https://app.windchillmastery.local` origin, so routing,
storage and fonts behave exactly as on the web. A JavaScript bridge (`window.WindchillApp`,
typed in `apps/web/src/lib/native.ts`) gives the site native reminders, printing/PDF and sharing.
