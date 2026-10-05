# Windchill Mastery

An interactive learning platform that teaches PTC Windchill PLM from first principles to expert
level. One codebase produces:

- a **responsive website** (static, works offline once visited, installable as a PWA), and
- an **Android app** (an APK that bundles the whole site, so it works with no connection at all,
  plus daily reminder notifications).

Lessons are 5–15 minutes and mix animations, interactive diagrams, real-world examples,
"Do it in Windchill" navigation paths, simulations, scenarios, quizzes and flashcards. Progress,
XP, streaks, badges, notes, bookmarks and certificates are stored on the device.

## Quick start

```bash
npm install
npm run dev            # http://localhost:3000
```

| Command | What it does |
| --- | --- |
| `npm run content:check` | Validate every lesson, glossary and module file |
| `npm run build:web` | Build the static site into `apps/web/out` (plus cheat-sheet PDFs and the offline cache) |
| `npm run build:android` | Package `apps/web/out` into a signed APK in `apps/android/build/` |
| `npm run build` | Both of the above |
| `npm run preview` | Serve the built site on http://localhost:4173 |
| `npm test` / `npm run typecheck` | Unit tests and TypeScript checks |

`build:web` renders PDFs with a headless Chromium. Point `CHROMIUM_PATH` at one if Playwright's
default can't be found.

## Repository layout

```
content/            Course content (YAML) – the part authors edit
  curriculum.json   Module → section → lesson outline and learning paths
  lessons/mNN/      One file per lesson, checkpoint and capstone
  glossary/         Glossary terms
  modules/          Per-module colour, icon, tagline and cheat sheet
  changelog.yaml    Content version and "What's new"
packages/core/      Shared TypeScript: content schema, quiz engine, progress/XP/badges, simulations
apps/web/           Next.js website (static export)
apps/android/       Android shell (Java, no Gradle) and build.sh
scripts/            Content compiler, PDF/offline/icon builders
docs/               Guides (start with HANDOVER.md)
```

## Documentation

- [Hand-over](docs/HANDOVER.md): what exists, what's next, how to run everything
- [Content authoring](docs/CONTENT_AUTHORING.md): writing lessons
- [Architecture](docs/ARCHITECTURE.md): how the pieces fit together
- [Android app](docs/ANDROID.md): building and installing the APK
- [Deployment](docs/DEPLOYMENT.md): putting the website online
