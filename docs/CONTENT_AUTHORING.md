# Content authoring guide

This guide is for anyone writing or updating lessons for Windchill Mastery. Lessons are plain YAML
files in this repository. The website and the Android app are both built from them, so a new
lesson shows up everywhere after a rebuild.

- [How content is organised](#how-content-is-organised)
- [Writing a lesson](#writing-a-lesson)
- [Block reference](#block-reference)
- [Style rules](#style-rules)
- [Checking your work](#checking-your-work)
- [Updating for a new Windchill release](#updating-for-a-new-windchill-release)

## How content is organised

```
content/
  curriculum.json          Structure: modules → sections → lessons, checkpoints, capstones, paths.
                           Owned by the curriculum workstream. Do not hand-edit; re-sync it.
  lessons/m01/<id>.yaml    One file per written lesson, named by its curriculum id.
  modules/m01.yaml         Optional per-module look: colour theme, icon, tagline, cheat sheet.
  glossary/*.yaml          Glossary terms (any number of files).
  changelog.yaml           Content version and "What's new" entries.
```

A lesson listed in `curriculum.json` with no YAML file is shown as **coming soon**. Add the file and
it becomes available. You never need to touch app code to add or update content.

Ids come from the curriculum:

| Kind | Id example | Notes |
| --- | --- | --- |
| Lesson | `m01-s03-l02` | Title, level, minutes, roles and objectives come from the curriculum. |
| Section checkpoint | `m01-s03-check` | A quiz (aim for the curriculum's question count) plus flashcards. Pass mark comes from the curriculum (80%). |
| Module capstone | `m01-cap` | The end-of-module scenario or mini-project. Brief and tasks come from the curriculum. |

## Writing a lesson

Start by copying `content/lessons/m01/m01-s01-l01.yaml`, the reference lesson.

```yaml
id: m01-s03-l02                # must match the file name and a curriculum id
subtitle: One line that sells the lesson.   # optional
title: Override title          # optional; normally taken from the curriculum
minutes: 8                     # optional override
objectives: [...]              # optional override
version: 1.0.0                 # bump when you change the lesson (see below)
updated: "2026-10-05"
tags: [navigation, contexts]
versionNotes:                  # optional; see "Updating for a new Windchill release"
  - versions: ["13.0+"]
    md: The Navigator also shows ...
blocks:
  - type: text
    md: ...
```

A lesson is a list of **blocks**. Aim for the shape below, which follows the teaching style rules:

1. A short hook in plain words (`text`), then the official terms (`callout` variant `terms`).
2. A visual: `diagram` (click-to-explore) and/or `animation` (chaptered motion graphic).
3. "Why this matters in real companies" (`callout` variant `why-it-matters`) and a real-world
   `example`.
4. For any task done in Windchill: a `walkthrough` that gives the **navigation path** and what to do.
   We do **not** mock up or screenshot Windchill screens.
5. Hands-on: a `simulation`, `scenario` (what-if / troubleshooting) or `exercise`.
6. A `pitfall` and a `pro-tip` callout from real implementations.
7. Check understanding: `quiz` and/or `flashcards`.
8. `summary`.

The build warns when a lesson uses fewer than **three teaching modalities**. Modalities are:
diagram, animation, simulation, real-world example, walkthrough, quiz/flashcards, scenario,
comparison and exercise.

### Markdown

Fields named `md`, `detail`, `definition`, `goal`, `intro`, `expected`, `explanation`, `result`
accept full Markdown (lists, tables, **bold**, `code`). Fields named `prompt` and `caption` and the
items of an exercise's `steps` accept inline Markdown. Other strings are plain text.

Link a glossary term with `[[term-id]]` or `[[term-id|your text]]`. An unknown id fails the build.

Use YAML block scalars (`md: |`) for anything longer than one line. Quote strings that contain
`: `, start with a quote, or contain `#`.

## Block reference

### text
```yaml
- type: text
  md: |
    Paragraphs, lists, tables...
```

### callout
`variant`: `why-it-matters`, `pro-tip`, `pitfall`, `note`, `terms` (plain words → official term),
`version-note` (add `versions: ["12.1"]`).
```yaml
- type: callout
  variant: pitfall
  title: Optional title
  md: Don't ...
```

### diagram
An interactive SVG. Nodes are boxes placed on a canvas (default 800 × 450). Clicking or hovering a
node shows its `detail`. `groups` draw labelled background zones (e.g. "Server tier").
```yaml
- type: diagram
  title: The big picture
  caption: Click a box to learn what it does.
  diagram:
    width: 800
    height: 360
    groups:
      - { label: Server tier, x: 200, y: 20, w: 380, h: 320, tone: neutral }
    nodes:
      - id: browser            # kebab-case, unique in this diagram
        label: Browser
        sublabel: your laptop  # optional second line
        x: 20
        y: 150
        w: 140                 # default 160
        h: 56                  # default 56
        tone: accent           # primary | accent | success | warning | danger | neutral | info
        shape: rect            # rect | pill | cylinder (databases, vaults) | circle | doc (files)
        detail: Markdown shown in the panel.
        real: Optional "In real companies" line shown under the detail.
    edges:
      - { from: browser, to: web, label: HTTPS, dashed: false, bidirectional: false }
```
Layout tips: keep 20px+ between boxes, keep labels under ~22 characters, and check it at phone
width (the diagram scales down, so tiny text becomes unreadable). Node `w`/`h` include the label.

### animation
A diagram that plays through **chapters** like a short motion graphic, with play/pause, chapter
list and captions. Each chapter can reveal nodes (`show`), make them glow (`highlight`) and animate
data moving along edges (`flow`, written `from>to`, must be an existing edge).
```yaml
- type: animation
  title: What happens when you click Search
  diagram: { ...same as diagram... }
  chapters:
    - title: You type a number
      caption: Inline **markdown**.
      show: [browser]          # omit to show all nodes
      highlight: [browser]
      flow: []
      seconds: 6               # chapter duration when auto-playing
```

### walkthrough (navigation paths)
How to do a task in Windchill, as **where to go** + **what to do**. No screenshots or mock screens.
Use version-neutral names for menus and tabs (e.g. "Browse", "Products", "Folders", "Actions",
"Information page → Structure tab"). When releases differ, add a `version-note` callout.
```yaml
- type: walkthrough
  title: Find a product's folders
  who: Any user who is a member of the product team   # optional
  where: [Browse, Products]                            # optional overall path, shown as chips
  steps:
    - title: Open the Navigator
      where: [Navigator, Browse]
      md: Expand the Navigator panel on the left and choose **Browse**.
    - title: Open the product
      where: [Browse, Products, "<your product>"]
      md: Click the product name...
  result: You see the product's folder tree...                     # optional
```

### simulation
A sandbox the learner drives with buttons. Define the object's fields, the actions (each enabled
only `when` its conditions match) and optional goals.

Operations in `do`: `{ set: { field: value } }`, `{ inc: field }` (number + 1),
`{ nextLetter: field }` (A → B, Z → AA). `log` and `headline` accept `{field}` placeholders.
In `when`, a list means "any of".
```yaml
- type: simulation
  title: Check out, change, check in
  intro: Markdown intro.
  headline: "Bracket {revision}.{iteration} · {state}"
  initial: { revision: A, iteration: 1, state: In Work, checkedOut: false }
  actions:
    - id: checkout
      label: Check out
      when: { checkedOut: false }
      do: [{ set: { checkedOut: true } }]
      log: Checked out {revision}.{iteration}. Nobody else can edit it now.
      blockedHint: It's already checked out.
    - id: checkin
      label: Check in
      when: { checkedOut: true }
      do: [{ inc: iteration }, { set: { checkedOut: false } }]
      log: Checked in → new iteration {revision}.{iteration}.
  goals:
    - label: Reach iteration A.3
      when: { iteration: 3, revision: A }
      message: Each check-in adds one iteration.
```

### comparison
```yaml
- type: comparison
  title: PDM vs PLM
  columns: [PDM, PLM]           # the row label column is automatic
  rows:
    - { label: Scope, cells: [Engineering data, Whole product lifecycle] }
  takeaway: Optional one-liner.
```

### example
`variant`: `real-world` (short) or `case-study` (story with outcome). Use fictional company names;
the course uses **Acme Mobility** (scooters and e-bikes) as its running example.
```yaml
- type: example
  variant: case-study
  title: The cold-weather hinge
  industry: Micromobility
  md: |
    Story...
  takeaway: One line.
```

### quiz
Question kinds: `single` (`answer` = option index from 0), `multi` (`answers`), `truefalse`,
`order` (list `items` in the **correct** order; the app shuffles them). Every question needs an
`explanation` that teaches, not just "correct".
```yaml
- type: quiz
  title: Check your understanding   # optional
  passMark: 0.7                     # checkpoints use the curriculum pass mark instead
  questions:
    - kind: single
      prompt: Question?
      options: [A, B, C]
      answer: 1
      explanation: Why B is right and the others are not.
```

### flashcards
Cards feed the learner's spaced-repetition deck.
```yaml
- type: flashcards
  cards:
    - { front: Iteration, back: The number after the dot - goes up on every check-in. }
```

### scenario
A branching "what if", troubleshooting case or challenge. Nodes are steps; choices lead to other
nodes. Ending nodes have `outcome: success | partial | fail`. Mark the best choices `good: true`.
```yaml
- type: scenario
  variant: troubleshooting          # what-if | troubleshooting | challenge
  title: The search that finds nothing
  start: s1
  nodes:
    - id: s1
      md: Your search for 1000-0423 returns nothing. What do you check first?
      choices:
        - { label: The object type filter, next: s2, good: true, feedback: Good instinct... }
        - { label: Call IT, next: fail1, feedback: Too early... }
    - id: s2
      md: ...
      outcome: success
```

### exercise
Practice for a Windchill trial or training system (`environment: windchill-trial`), or as a
paper/described exercise.
```yaml
- type: exercise
  title: Save your first search
  environment: windchill-trial
  goal: Markdown goal.
  steps:
    - Inline markdown step.
  expected: What success looks like.
```

### video
For future real videos. `chapters` are seconds offsets.
```yaml
- type: video
  title: ...
  src: /media/intro.mp4
  chapters: [{ at: 0, title: Intro }]
```

### summary
```yaml
- type: summary
  points: [..., ...]
```

## YAML pitfall: commas in one-line mappings

`{ label: Fast, cheap, good }` is **not** one string: YAML splits it at the commas into extra keys,
and the schema silently drops them. Use one-line `{ ... }` only for short values with no commas
(ids, numbers, coordinates). For anything with prose, use block style or quote the value:
```yaml
- label: "Fast, cheap, good"
  next: done
```
`npm run content:check` flags null values and unbalanced brackets that usually mean this happened,
and checks that every comparison row has one cell per column.

## Style rules

- **Simple language first, then the official term.** "The number after the dot goes up each time
  you save your changes. Windchill calls this the *iteration*."
- **Always say why it matters in real companies.**
- **Visual first**: diagram → animation → navigation path.
- **Include a pitfall and a pro tip** from real implementations.
- **Short**: 5–15 minutes per lesson. Roughly 150 words per minute of reading, plus time for
  interactions.
- **Version-neutral**: teach concepts and generic navigation; record release differences with
  `version-note` callouts or `versionNotes`.
- **Accurate**: if you are not sure a menu name or behaviour is the same in every release, describe
  it generically ("open the object's Actions menu") rather than guess.
- **Inclusive and energetic**: written for Gen Z / Gen Alpha learners. Short sentences, second
  person, concrete examples. No walls of text; break them up with blocks.
- **No real customer names or PTC screenshots.** Use the fictional Acme Mobility.

## Checking your work

```bash
npm run content:check    # validate every lesson; prints errors and warnings
npm run dev              # preview on http://localhost:3000
```

The build fails on YAML lint errors (see above), schema errors, unknown glossary links, broken scenario links, quiz answers out of
range, animation chapters that reference missing nodes, and lesson files whose id isn't in the
curriculum.

## Updating for a new Windchill release

Lessons are version-neutral, so most releases need no change. When something differs:

1. Add a `version-note` callout next to the affected step, or a lesson-level `versionNotes` entry:
   ```yaml
   versionNotes:
     - versions: ["13.1+"]
       md: In 13.1 and later, saved searches can also be ...
   ```
2. Bump the lesson `version` (patch for wording, minor for new blocks, major for a rewrite) and
   `updated`.
3. Bump `contentVersion` in `content/changelog.yaml` and add an entry. Learners who completed the
   lesson see it flagged as **updated** in their recommendations.

To pick up a new curriculum outline, copy the curriculum workstream's `curriculum.json` into
`content/curriculum.json` and run `npm run content:check`.
