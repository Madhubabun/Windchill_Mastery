/**
 * Types of the *compiled* content that `npm run content` emits for the apps.
 * Structure (modules → sections → lessons, paths) comes from content/curriculum.json;
 * lesson bodies come from content/lessons/**.yaml. Markdown fields arrive as HTML.
 */
import type { Block, GlossaryEntry, Level, Role } from "./schema";

export type { Block, GlossaryEntry, Level, Role };

export type LessonKind = "lesson" | "checkpoint" | "capstone";

export interface LessonSummary {
  /** Curriculum id, e.g. m01-s01-l01. Used as the key for progress, bookmarks and notes. */
  id: string;
  key: string;
  slug: string;
  kind: LessonKind;
  moduleId: string;
  moduleSlug: string;
  sectionId?: string;
  href: string;
  title: string;
  subtitle?: string;
  level: Level;
  minutes: number;
  roles: Role[];
  objectives: string[];
  prerequisites: string[];
  /** false = outlined in the curriculum but not written yet. */
  available: boolean;
  version?: string;
  updated?: string;
  /** Teaching modalities actually used (available lessons) or planned (outlined ones). */
  modalities: string[];
  hasQuiz: boolean;
  flashcardCount: number;
  passMark?: number;
}

export interface Lesson extends LessonSummary {
  versionNotes: { versions: string[]; md: string }[];
  tags: string[];
  blocks: Block[];
}

export interface Section {
  id: string;
  title: string;
  summary: string;
  /** Lessons in order, followed by the section checkpoint when there is one. */
  items: LessonSummary[];
}

export type Theme = "violet" | "blue" | "teal" | "amber" | "rose" | "indigo" | "emerald" | "slate";

export interface Module {
  id: string;
  slug: string;
  order: number;
  title: string;
  summary: string;
  tagline?: string;
  levels: Level[];
  theme: Theme;
  icon: string;
  sections: Section[];
  capstone?: LessonSummary & { brief: string; tasks: string[] };
  badge?: { id: string; name: string; rule: string };
  cheatsheet?: { sections: { title: string; points: string[] }[] };
  totalMinutes: number;
  availableCount: number;
  totalCount: number;
}

export interface LearningPath {
  id: string;
  role: Role;
  title: string;
  summary: string;
  targetLevel: Level;
  requiredUnits: string[];
  optionalUnits: string[];
  /** Resolved lesson ids for required units, in order. */
  required: string[];
  optional: string[];
  estimatedMinutes: number;
  certificate?: { id: string; name: string; rule: string };
}

export interface SearchDoc {
  id: string;
  kind: "lesson" | "module" | "glossary";
  title: string;
  text: string;
  href: string;
  meta?: string;
}

export interface Catalog {
  contentVersion: string;
  builtAt: string;
  roles: { id: Role; name: string; description: string }[];
  levels: { id: Level; name: string; description: string }[];
  modules: Module[];
  paths: LearningPath[];
  glossary: GlossaryEntry[];
  changelog: { date: string; version: string; title: string; items: string[] }[];
}

export const MODALITY_LABEL: Record<string, string> = {
  illustration: "Diagrams",
  animation: "Animation",
  simulation: "Simulation",
  "real-world": "Real-world case",
  walkthrough: "Step-by-step",
  assessment: "Quiz",
  scenario: "Scenario",
  comparison: "Comparison",
  practice: "Practice",
  // Curriculum modality codes (for outlined lessons)
  ill: "Diagrams",
  ani: "Animation",
  sim: "Simulation",
  walk: "Step-by-step",
  case: "Real-world case",
  cmp: "Comparison",
  scen: "Scenario",
  whatif: "What-if",
  quiz: "Quiz",
  flash: "Flashcards",
  cheat: "Cheat sheet",
};

export function moduleItems(m: Module): LessonSummary[] {
  const items = m.sections.flatMap((s) => s.items);
  return m.capstone ? [...items, m.capstone] : items;
}

export function allLessons(c: Catalog): LessonSummary[] {
  return c.modules.flatMap(moduleItems);
}

export function findLesson(c: Catalog, id: string): LessonSummary | undefined {
  return allLessons(c).find((l) => l.id === id);
}

export function roleName(c: Catalog, role: Role) {
  return c.roles.find((r) => r.id === role)?.name ?? role;
}

export function levelName(c: Catalog, level: Level) {
  return c.levels.find((l) => l.id === level)?.name ?? level;
}
