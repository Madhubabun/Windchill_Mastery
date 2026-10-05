/**
 * Content schema for Windchill Mastery.
 *
 * Every lesson, module, learning path and glossary entry in /content is validated
 * against these schemas by `npm run content`. The authoring guide in
 * docs/CONTENT_AUTHORING.md documents each field with examples.
 *
 * Bump SCHEMA_VERSION when a change would break existing content files.
 */
import { z } from "zod";

export const SCHEMA_VERSION = 1;

export const Level = z.enum(["beginner", "intermediate", "advanced", "expert"]);
export type Level = z.infer<typeof Level>;

/** Roles and levels mirror content/curriculum.json (owned by the curriculum workstream). */
export const Role = z.enum([
  "end-user",
  "change-manager",
  "business-admin",
  "system-admin",
  "migration-specialist",
  "developer",
  "architect",
]);
export type Role = z.infer<typeof Role>;

/** Markdown string. Supports **bold**, lists, tables, `code`, links and [[glossary-term]] links. */
const Md = z.string().min(1);
const Id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "ids are lowercase-kebab-case");

// ---------------------------------------------------------------------------
// Blocks: the building pieces of a lesson. `type` selects the renderer.
// ---------------------------------------------------------------------------

const TextBlock = z.object({ type: z.literal("text"), md: Md });

/** A release-specific remark, e.g. { versions: ["13.0+"], md: "The Navigator also has ..." }. */
export const VersionNote = z.object({ versions: z.array(z.string()).min(1), md: Md });

const CalloutBlock = z.object({
  type: z.literal("callout"),
  /** why-it-matters: real-company relevance. pro-tip / pitfall: implementation experience.
   *  terms: plain words first, then the official Windchill term. */
  variant: z.enum(["why-it-matters", "pro-tip", "pitfall", "note", "terms", "version-note"]),
  title: z.string().optional(),
  /** Only for version-note callouts: the Windchill releases the note applies to. */
  versions: z.array(z.string()).optional(),
  md: Md,
});

const DiagramNode = z.object({
  id: Id,
  label: z.string(),
  sublabel: z.string().optional(),
  x: z.number(),
  y: z.number(),
  w: z.number().default(160),
  h: z.number().default(56),
  /** Colour family for the node. */
  tone: z.enum(["primary", "accent", "success", "warning", "danger", "neutral", "info"]).default("primary"),
  shape: z.enum(["rect", "pill", "cylinder", "circle", "doc"]).default("rect"),
  /** Shown in the detail panel when the node is clicked or hovered. */
  detail: Md.optional(),
});

const DiagramEdge = z.object({
  from: Id,
  to: Id,
  label: z.string().optional(),
  dashed: z.boolean().default(false),
  bidirectional: z.boolean().default(false),
});

const DiagramGroup = z.object({
  label: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  tone: z.enum(["primary", "accent", "success", "warning", "danger", "neutral", "info"]).default("neutral"),
});

export const DiagramSpec = z.object({
  width: z.number().default(800),
  height: z.number().default(450),
  groups: z.array(DiagramGroup).default([]),
  nodes: z.array(DiagramNode).min(1),
  edges: z.array(DiagramEdge).default([]),
});
export type DiagramSpec = z.infer<typeof DiagramSpec>;

const DiagramBlock = z.object({
  type: z.literal("diagram"),
  title: z.string(),
  caption: z.string().optional(),
  diagram: DiagramSpec,
});

/** A short motion-graphic explanation: a diagram that plays through chapters. */
const AnimationBlock = z.object({
  type: z.literal("animation"),
  title: z.string(),
  diagram: DiagramSpec,
  chapters: z
    .array(
      z.object({
        title: z.string(),
        caption: Md,
        /** Node ids shown in this chapter. Omit to show every node. */
        show: z.array(Id).optional(),
        /** Node ids emphasised (glow + pulse). */
        highlight: z.array(Id).default([]),
        /** Edges animated as "flowing" in this chapter, written "from>to". */
        flow: z.array(z.string()).default([]),
        seconds: z.number().default(6),
      }),
    )
    .min(2),
});

/**
 * Step-by-step "where to go and what to do" guide. Lessons do not mock up Windchill
 * screens: each step names the navigation path in Windchill (`where`, version-neutral
 * menu names) and explains the action in words.
 */
const WalkthroughBlock = z.object({
  type: z.literal("walkthrough"),
  title: z.string(),
  /** Who can normally do this (e.g. "Any user with Modify access"). */
  who: z.string().optional(),
  steps: z
    .array(
      z.object({
        title: z.string(),
        /** Navigation path, e.g. ["Browse", "Products", "<your product>", "Folders"]. */
        where: z.array(z.string()).default([]),
        md: Md,
      }),
    )
    .min(1),
  /** What the learner should see when done. */
  result: Md.optional(),
});

/** Sandboxed simulation: a small state machine the learner drives with buttons. */
const SimOp = z.union([
  z.object({ set: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])) }),
  z.object({ inc: z.string() }),
  z.object({ nextLetter: z.string() }),
]);
const Condition = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number(), z.boolean()]))]));
const SimulationBlock = z.object({
  type: z.literal("simulation"),
  title: z.string(),
  intro: Md,
  /** Fields of the simulated object. Display order follows this map. */
  initial: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  /** Optional template for a computed headline, e.g. "{revision}.{iteration}". */
  headline: z.string().optional(),
  actions: z
    .array(
      z.object({
        id: Id,
        label: z.string(),
        /** All conditions must match for the action to be enabled. Arrays mean "any of". */
        when: Condition.default({}),
        do: z.array(SimOp).min(1),
        /** Message added to the activity log. Supports {field} placeholders. */
        log: z.string(),
        /** Explanation shown when the button is disabled. */
        blockedHint: z.string().optional(),
      }),
    )
    .min(1),
  goals: z
    .array(z.object({ label: z.string(), when: Condition, message: z.string().optional() }))
    .default([]),
});

const ComparisonBlock = z.object({
  type: z.literal("comparison"),
  title: z.string(),
  columns: z.array(z.string()).min(2),
  rows: z.array(z.object({ label: z.string(), cells: z.array(z.string()) })).min(1),
  takeaway: z.string().optional(),
});

const ExampleBlock = z.object({
  type: z.literal("example"),
  /** real-world: short industry example. case-study: longer story with outcome. */
  variant: z.enum(["real-world", "case-study"]).default("real-world"),
  title: z.string(),
  industry: z.string(),
  md: Md,
  takeaway: z.string().optional(),
});

const QuizQuestion = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("single"),
    prompt: Md,
    options: z.array(z.string()).min(2),
    answer: z.number().int(),
    explanation: Md,
  }),
  z.object({
    kind: z.literal("multi"),
    prompt: Md,
    options: z.array(z.string()).min(2),
    answers: z.array(z.number().int()).min(1),
    explanation: Md,
  }),
  z.object({ kind: z.literal("truefalse"), prompt: Md, answer: z.boolean(), explanation: Md }),
  z.object({
    kind: z.literal("order"),
    prompt: Md,
    /** Items in the CORRECT order. The player shuffles them. */
    items: z.array(z.string()).min(3),
    explanation: Md,
  }),
]);
export type QuizQuestion = z.infer<typeof QuizQuestion>;

const QuizBlock = z.object({
  type: z.literal("quiz"),
  title: z.string().default("Check your understanding"),
  /** Score (0–1) needed to count the quiz as passed. */
  passMark: z.number().min(0).max(1).default(0.7),
  questions: z.array(QuizQuestion).min(1),
});

const FlashcardsBlock = z.object({
  type: z.literal("flashcards"),
  title: z.string().default("Flashcards"),
  cards: z.array(z.object({ front: z.string(), back: z.string() })).min(2),
});

/** Branching "what if" / troubleshooting scenario. */
const ScenarioBlock = z.object({
  type: z.literal("scenario"),
  variant: z.enum(["what-if", "troubleshooting", "challenge"]).default("what-if"),
  title: z.string(),
  start: Id,
  nodes: z
    .array(
      z.object({
        id: Id,
        md: Md,
        choices: z
          .array(z.object({ label: z.string(), next: Id.optional(), feedback: z.string().optional(), good: z.boolean().optional() }))
          .default([]),
        /** Marks an ending. */
        outcome: z.enum(["success", "partial", "fail"]).optional(),
      }),
    )
    .min(2),
});

const ExerciseBlock = z.object({
  type: z.literal("exercise"),
  title: z.string(),
  /** Where the exercise can be done. */
  environment: z.enum(["windchill-trial", "described", "paper"]).default("windchill-trial"),
  goal: Md,
  steps: z.array(Md).min(1),
  expected: Md.optional(),
});

const VideoBlock = z.object({
  type: z.literal("video"),
  title: z.string(),
  src: z.string(),
  poster: z.string().optional(),
  chapters: z.array(z.object({ at: z.number(), title: z.string() })).default([]),
});

const SummaryBlock = z.object({
  type: z.literal("summary"),
  title: z.string().default("Key takeaways"),
  points: z.array(z.string()).min(1),
});

export const Block = z.discriminatedUnion("type", [
  TextBlock,
  CalloutBlock,
  DiagramBlock,
  AnimationBlock,
  WalkthroughBlock,
  SimulationBlock,
  ComparisonBlock,
  ExampleBlock,
  QuizBlock,
  FlashcardsBlock,
  ScenarioBlock,
  ExerciseBlock,
  VideoBlock,
  SummaryBlock,
]);
export type Block = z.infer<typeof Block>;
export type BlockType = Block["type"];

/** Block types that count as a distinct teaching modality (for the "3–4 per topic" rule). */
export const MODALITY_OF: Partial<Record<BlockType, string>> = {
  diagram: "illustration",
  animation: "animation",
  simulation: "simulation",
  example: "real-world",
  walkthrough: "walkthrough",
  quiz: "assessment",
  flashcards: "assessment",
  scenario: "scenario",
  comparison: "comparison",
  video: "animation",
  exercise: "practice",
};

// ---------------------------------------------------------------------------
// Lesson files: content/lessons/<module id>/<lesson id>.yaml
// The lesson id is the curriculum id, e.g. m01-s01-l01, m01-s01-check, m01-cap.
// Title, level, minutes, roles and objectives come from curriculum.json unless overridden.
// ---------------------------------------------------------------------------

export const LessonFile = z.object({
  id: z.string().regex(/^m\d{2}(-s\d{2}(-l\d{2}|-check)?|-cap)$/, "use the curriculum id, e.g. m01-s01-l01"),
  /** Optional overrides of the curriculum outline. */
  title: z.string().optional(),
  subtitle: z.string().optional(),
  minutes: z.number().int().min(1).max(30).optional(),
  objectives: z.array(z.string()).optional(),
  /** Lesson content version (semver). Bump when the lesson changes meaningfully. */
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /**
   * Lessons are version-neutral: they teach concepts, and tasks are shown as navigation
   * paths, not screenshots. Use `versionNotes` (or a `version-note` callout) to record
   * differences between Windchill releases without forking the lesson.
   */
  versionNotes: z.array(VersionNote).default([]),
  tags: z.array(z.string()).default([]),
  blocks: z.array(Block).min(1),
});
export type LessonFile = z.infer<typeof LessonFile>;

/** Optional presentation file per module: content/modules/<module id>.yaml */
export const ModuleStyleFile = z.object({
  id: z.string(),
  theme: z.enum(["violet", "blue", "teal", "amber", "rose", "indigo", "emerald", "slate"]),
  icon: z.string(),
  tagline: z.string().optional(),
  cheatsheet: z
    .object({ sections: z.array(z.object({ title: z.string(), points: z.array(z.string()) })).min(1) })
    .optional(),
});
export type ModuleStyleFile = z.infer<typeof ModuleStyleFile>;

export const GlossaryEntry = z.object({
  term: z.string(),
  id: Id,
  plain: z.string(),
  definition: Md,
  aka: z.array(z.string()).default([]),
  related: z.array(Id).default([]),
});
export type GlossaryEntry = z.infer<typeof GlossaryEntry>;

export const ChangelogFile = z.object({
  contentVersion: z.string(),
  entries: z.array(z.object({ date: z.string(), version: z.string(), title: z.string(), items: z.array(z.string()) })),
});

// ---------------------------------------------------------------------------
// curriculum.json (produced by the curriculum workstream; we read a subset)
// ---------------------------------------------------------------------------

const CurLesson = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  level: Level,
  roles: z.array(Role),
  durationMinutes: z.number(),
  prerequisites: z.array(z.string()).default([]),
  objectives: z.array(z.string()),
  modalities: z.array(z.string()).default([]),
});
export const Curriculum = z.object({
  schemaVersion: z.string(),
  roles: z.array(z.object({ id: Role, name: z.string(), description: z.string() })),
  levels: z.array(z.object({ id: Level, name: z.string(), description: z.string() })),
  modules: z.array(
    z.object({
      id: z.string(),
      order: z.number(),
      slug: z.string(),
      title: z.string(),
      summary: z.string(),
      levels: z.array(Level),
      prerequisites: z.array(z.string()).default([]),
      sections: z.array(
        z.object({
          id: z.string(),
          title: z.string(),
          summary: z.string(),
          lessons: z.array(CurLesson),
          checkpoint: z.object({ id: z.string(), questions: z.number(), passMark: z.number(), durationMinutes: z.number() }).optional(),
        }),
      ),
      capstone: z
        .object({ id: z.string(), title: z.string(), durationMinutes: z.number(), brief: z.string(), tasks: z.array(z.string()) })
        .optional(),
      badge: z.object({ id: z.string(), name: z.string(), rule: z.string() }).optional(),
    }),
  ),
  paths: z.array(
    z.object({
      id: z.string(),
      role: Role,
      title: z.string(),
      targetLevel: Level,
      summary: z.string(),
      requiredUnits: z.array(z.string()),
      optionalUnits: z.array(z.string()).default([]),
      estimatedMinutes: z.number().optional(),
      certificate: z.object({ id: z.string(), name: z.string(), rule: z.string() }).optional(),
    }),
  ),
});
export type Curriculum = z.infer<typeof Curriculum>;
