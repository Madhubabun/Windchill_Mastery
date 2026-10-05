# Hand-over

## What's built (v0.1.0)

**Platform (website + Android app, one codebase)**
- Onboarding (role, level, daily goal) that picks one of 7 role-based learning paths.
- Dashboard: continue card, recommendations, daily goal ring, streak, XP and rank, path progress.
- Catalogue of all 7 modules from the curriculum outline. Unwritten lessons show as *Coming soon*.
- Lesson player with cards (swipe) and scroll modes, outline, glossary pop-ups, notes, bookmarks.
- Teaching blocks: animations with chapters/captions/transcript, interactive diagrams,
  "Do it in Windchill" navigation paths, real-world examples and case studies, comparisons,
  simulations, what-if/troubleshooting scenarios, quizzes (4 question types), flashcards,
  exercises, summaries, callouts (pro tip, pitfall, why it matters, version note).
- Checkpoints and capstones, module and path certificates (printable / save as PDF).
- Gamification: XP, levels, ranks named after lifecycle states, 15 badges, streaks, daily goal.
- Practice & review: spaced-repetition flashcard deck across all lessons.
- Glossary, full-text search, cheat sheets (page + PDF), dark/light mode, text size, reduced
  motion, keyboard navigation, screen-reader labels.
- Me: badges, certificates, saved lessons, notes, insights (time, scores, activity), settings,
  export/import/reset, What's new.
- Offline: service worker on the web; everything bundled in the Android app.
- Android: daily reminder notifications, native print/share, back button, works in flight mode.

**Content**: Module 1 (Fundamentals of Windchill & PLM) is complete: 19 lessons, 4 section
checkpoints and a capstone. Module 4 (Business Administration) is complete: 38 lessons, 9 section
checkpoints and a capstone. Both have cheat sheets; the glossary has 147 terms. The other
modules are outlined.

## Not done yet / known limits

- **No accounts or cloud sync.** Progress stays on each device. Export/import moves it manually.
  The sync seam is ready (see ARCHITECTURE.md); adding it needs a backend account (e.g. Firebase).
- **No server-sent push.** Reminders are local notifications scheduled on the phone.
- **The APK has not been run on a physical device or emulator** in the build environment. Its
  page loading was tested by emulating the app's file serving in a phone-sized browser.
- **Modules 2, 3 and 5–7 need lessons.** Write them in `content/lessons/mNN/` following
  CONTENT_AUTHORING.md; the platform picks them up automatically.
- Videos: the `video` block exists, but no videos are produced yet.
- Analytics are per learner (Insights tab). There's no admin dashboard across learners.

## Day-to-day tasks

| Task | How |
| --- | --- |
| Add or edit a lesson | Edit YAML in `content/lessons/`, run `npm run content:check`, preview with `npm run dev` |
| Release new content | Bump lesson `version`s and `content/changelog.yaml`, bump root `package.json` `version`, run `npm run build` |
| Update the website | Deploy `apps/web/out` (DEPLOYMENT.md) |
| Update the app | Install the new APK over the old one (same signing key) |
| Re-theme | Edit `apps/web/src/styles/tokens.css`; icons via `apps/web/public/icon.svg` then `npm run icons` |
| Pick up a new curriculum outline | Replace `content/curriculum.json`, run `npm run content:check` |

## Decisions on record

- **Version-neutral** Windchill content; release differences go in version notes.
- **No Windchill screen mock-ups.** Tasks are taught as navigation paths (where to go, what to
  do); concepts are taught with examples, diagrams and animations.
- **Static website + WebView Android shell** rather than React Native, so one build serves both
  and the APK can be produced without Google's Gradle downloads.
- **Local-first progress**; backend only when login/sync/push is actually needed.
