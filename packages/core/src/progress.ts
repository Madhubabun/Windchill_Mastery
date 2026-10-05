/**
 * Learner state: progress, XP, streaks, badges, bookmarks, notes, flashcard schedule,
 * settings and a local analytics log. Pure functions only; each app persists the state
 * (localStorage on web and inside the Android WebView) and may sync it through a SyncAdapter.
 */
import type { Catalog, LessonSummary, Role, Level } from "./content";
import { allLessons } from "./content";

export const STATE_VERSION = 1;

export interface LessonProgress {
  status: "started" | "completed";
  startedAt: string;
  completedAt?: string;
  /** Index of the furthest block reached. */
  lastBlock: number;
  quizBest?: number;
  quizAttempts: number;
  timeSpentSec: number;
  /** Content version the learner completed, to flag lessons updated since. */
  completedVersion?: string;
}

export interface Profile {
  name: string;
  role: Role;
  level: Level;
  pathId: string;
  dailyGoalMinutes: number;
  createdAt: string;
}

export interface Settings {
  theme: "system" | "light" | "dark";
  reducedMotion: boolean;
  fontScale: number;
  reminder: { enabled: boolean; hour: number; minute: number };
}

export interface AnalyticsEvent {
  t: string;
  type:
    | "lesson_start"
    | "lesson_block"
    | "lesson_complete"
    | "quiz_submit"
    | "flashcard_review"
    | "scenario_end"
    | "simulation_goal"
    | "search";
  key?: string;
  value?: number;
  data?: Record<string, string | number | boolean>;
}

export interface CardState {
  box: number;
  due: string;
}

export interface LearnerState {
  v: number;
  profile: Profile | null;
  lessons: Record<string, LessonProgress>;
  xp: number;
  activityDays: string[];
  minutesByDay: Record<string, number>;
  badges: Record<string, string>;
  bookmarks: string[];
  notes: Record<string, { text: string; updatedAt: string }>;
  cards: Record<string, CardState>;
  certificates: Record<string, { issuedAt: string; name: string; score: number; id: string }>;
  settings: Settings;
  events: AnalyticsEvent[];
  lastSeenContentVersion?: string;
  updatedAt: string;
}

export function emptyState(now = new Date()): LearnerState {
  return {
    v: STATE_VERSION,
    profile: null,
    lessons: {},
    xp: 0,
    activityDays: [],
    minutesByDay: {},
    badges: {},
    bookmarks: [],
    notes: {},
    cards: {},
    certificates: {},
    settings: { theme: "system", reducedMotion: false, fontScale: 1, reminder: { enabled: false, hour: 19, minute: 0 } },
    events: [],
    updatedAt: now.toISOString(),
  };
}

/** Accepts anything (e.g. parsed localStorage or an imported backup) and returns a valid state. */
export function migrateState(raw: unknown): LearnerState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<LearnerState>;
  return {
    ...base,
    ...r,
    v: STATE_VERSION,
    settings: { ...base.settings, ...(r.settings ?? {}), reminder: { ...base.settings.reminder, ...(r.settings?.reminder ?? {}) } },
    lessons: r.lessons ?? {},
    activityDays: r.activityDays ?? [],
    minutesByDay: r.minutesByDay ?? {},
    badges: r.badges ?? {},
    bookmarks: r.bookmarks ?? [],
    notes: r.notes ?? {},
    cards: r.cards ?? {},
    certificates: r.certificates ?? {},
    events: r.events ?? [],
  };
}

export const day = (d: Date) => {
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};

const MAX_EVENTS = 1000;

function touch(s: LearnerState, now: Date, minutes = 0): LearnerState {
  const d = day(now);
  const activityDays = s.activityDays.includes(d) ? s.activityDays : [...s.activityDays, d].slice(-400);
  const minutesByDay = minutes ? { ...s.minutesByDay, [d]: (s.minutesByDay[d] ?? 0) + minutes } : s.minutesByDay;
  return { ...s, activityDays, minutesByDay, updatedAt: now.toISOString() };
}

export function logEvent(s: LearnerState, e: Omit<AnalyticsEvent, "t">, now = new Date()): LearnerState {
  const events = [...s.events, { ...e, t: now.toISOString() }];
  return { ...s, events: events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events };
}

// ---------------------------------------------------------------------------
// XP and levels
// ---------------------------------------------------------------------------

export const XP = {
  lesson: (minutes: number) => 40 + minutes * 4,
  capstone: 120,
  quiz: (score: number) => Math.round(10 + 40 * score),
  perfectQuiz: 25,
  card: 2,
  scenario: 15,
  simulation: 15,
};

export const LEVEL_TITLES = [
  "PLM Rookie",
  "Part Wrangler",
  "BOM Builder",
  "Change Champion",
  "Lifecycle Legend",
  "Config Guru",
  "Windchill Wizard",
  "PLM Grandmaster",
];

/** XP needed to *reach* level n (1-based): 0, 150, 400, 750, ... */
export function xpForLevel(n: number) {
  return n <= 1 ? 0 : 50 * (n - 1) * (n + 2);
}

export function levelInfo(xp: number) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return {
    level,
    title: LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)],
    into: xp - floor,
    span: next - floor,
    progress: (xp - floor) / (next - floor),
  };
}

export function streak(s: LearnerState, now = new Date()): { current: number; best: number; activeToday: boolean } {
  const days = new Set(s.activityDays);
  const today = day(now);
  const cursor = new Date(now);
  if (!days.has(today)) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  while (days.has(day(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of sorted) {
    const cur = new Date(d + "T12:00:00");
    run = prev && Math.round((cur.getTime() - prev.getTime()) / 86400000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = cur;
  }
  return { current, best: Math.max(best, current), activeToday: days.has(today) };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function startLesson(s: LearnerState, key: string, now = new Date()): LearnerState {
  if (s.lessons[key]) return s;
  const next = { ...s, lessons: { ...s.lessons, [key]: { status: "started" as const, startedAt: now.toISOString(), lastBlock: 0, quizAttempts: 0, timeSpentSec: 0 } } };
  return logEvent(touch(next, now), { type: "lesson_start", key }, now);
}

export function reachBlock(s: LearnerState, key: string, index: number, now = new Date()): LearnerState {
  const lp = s.lessons[key];
  if (!lp || index <= lp.lastBlock) return s;
  const next = { ...s, lessons: { ...s.lessons, [key]: { ...lp, lastBlock: index } } };
  return logEvent(next, { type: "lesson_block", key, value: index }, now);
}

export function addTime(s: LearnerState, key: string, seconds: number, now = new Date()): LearnerState {
  const lp = s.lessons[key];
  if (!lp || seconds <= 0) return s;
  const next = { ...s, lessons: { ...s.lessons, [key]: { ...lp, timeSpentSec: lp.timeSpentSec + seconds } } };
  return touch(next, now, seconds / 60);
}

export function completeLesson(s: LearnerState, lesson: LessonSummary, now = new Date()): LearnerState {
  const base = startLesson(s, lesson.key, now);
  const lp = base.lessons[lesson.key];
  if (lp.status === "completed") {
    return { ...base, lessons: { ...base.lessons, [lesson.key]: { ...lp, completedVersion: lesson.version } } };
  }
  const gained = XP.lesson(lesson.minutes) + (lesson.kind === "capstone" ? XP.capstone : 0);
  const next: LearnerState = {
    ...base,
    xp: base.xp + gained,
    lessons: {
      ...base.lessons,
      [lesson.key]: { ...lp, status: "completed", completedAt: now.toISOString(), completedVersion: lesson.version },
    },
  };
  return logEvent(touch(next, now), { type: "lesson_complete", key: lesson.key, value: gained }, now);
}

export function recordQuiz(s: LearnerState, key: string, score: number, now = new Date()): { state: LearnerState; xpGained: number } {
  const base = startLesson(s, key, now);
  const lp = base.lessons[key];
  const prevBest = lp.quizBest ?? 0;
  // XP only for improvement, so retakes can't farm points.
  const xpGained = score > prevBest ? XP.quiz(score) - (lp.quizBest !== undefined ? XP.quiz(prevBest) : 0) + (score === 1 && prevBest < 1 ? XP.perfectQuiz : 0) : 0;
  const next: LearnerState = {
    ...base,
    xp: base.xp + xpGained,
    lessons: { ...base.lessons, [key]: { ...lp, quizBest: Math.max(prevBest, score), quizAttempts: lp.quizAttempts + 1 } },
  };
  return { state: logEvent(touch(next, now), { type: "quiz_submit", key, value: score }, now), xpGained };
}

export function awardXp(s: LearnerState, amount: number, event: Omit<AnalyticsEvent, "t">, now = new Date()): LearnerState {
  return logEvent(touch({ ...s, xp: s.xp + amount }, now), event, now);
}

export function toggleBookmark(s: LearnerState, key: string): LearnerState {
  const has = s.bookmarks.includes(key);
  return { ...s, bookmarks: has ? s.bookmarks.filter((b) => b !== key) : [key, ...s.bookmarks] };
}

export function setNote(s: LearnerState, key: string, text: string, now = new Date()): LearnerState {
  const notes = { ...s.notes };
  if (text.trim()) notes[key] = { text, updatedAt: now.toISOString() };
  else delete notes[key];
  return { ...s, notes };
}

// ---------------------------------------------------------------------------
// Flashcards: Leitner boxes 1..5, due after 0, 1, 3, 7, 16 days.
// ---------------------------------------------------------------------------

const BOX_DAYS = [0, 1, 3, 7, 16];

export function reviewCard(s: LearnerState, cardId: string, knewIt: boolean, now = new Date()): LearnerState {
  const cur = s.cards[cardId]?.box ?? 0;
  const box = knewIt ? Math.min(cur + 1, 5) : 1;
  const due = new Date(now);
  due.setDate(due.getDate() + BOX_DAYS[box - 1]);
  const next = { ...s, cards: { ...s.cards, [cardId]: { box, due: day(due) } } };
  return awardXp(next, XP.card, { type: "flashcard_review", key: cardId, value: knewIt ? 1 : 0 }, now);
}

export function isDue(s: LearnerState, cardId: string, now = new Date()) {
  const c = s.cards[cardId];
  return !c || c.due <= day(now);
}

// ---------------------------------------------------------------------------
// Module completion and certificates
// ---------------------------------------------------------------------------

export function moduleProgress(s: LearnerState, lessons: LessonSummary[]) {
  const done = lessons.filter((l) => s.lessons[l.key]?.status === "completed").length;
  const quizLessons = lessons.filter((l) => l.hasQuiz);
  const scores = quizLessons.map((l) => s.lessons[l.key]?.quizBest ?? 0);
  const avgQuiz = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 1;
  return { done, total: lessons.length, ratio: lessons.length ? done / lessons.length : 0, avgQuiz };
}

/**
 * A module certificate needs every lesson, checkpoint and the capstone completed,
 * and every checkpoint passed at its pass mark (curriculum default 80%).
 */
export function certificateEligible(s: LearnerState, lessons: LessonSummary[]) {
  if (!lessons.length || lessons.some((l) => !l.available)) return false;
  const p = moduleProgress(s, lessons);
  const checkpointsPassed = lessons
    .filter((l) => l.kind === "checkpoint")
    .every((l) => (s.lessons[l.key]?.quizBest ?? 0) >= (l.passMark ?? 0.8));
  return p.done === p.total && checkpointsPassed;
}

export function issueCertificate(s: LearnerState, moduleId: string, lessons: LessonSummary[], now = new Date()): LearnerState {
  if (s.certificates[moduleId] || !certificateEligible(s, lessons)) return s;
  const p = moduleProgress(s, lessons);
  const id = `WM-${moduleId.slice(0, 3).toUpperCase()}-${now.getTime().toString(36).toUpperCase()}`;
  return {
    ...s,
    certificates: { ...s.certificates, [moduleId]: { issuedAt: now.toISOString(), name: s.profile?.name ?? "Learner", score: p.avgQuiz, id } },
  };
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export interface BadgeDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  test: (s: LearnerState, c: Catalog) => boolean;
}

const completedCount = (s: LearnerState) => Object.values(s.lessons).filter((l) => l.status === "completed").length;

export const BADGES: BadgeDef[] = [
  { id: "first-steps", emoji: "🚀", title: "First Click", description: "Complete your first lesson", test: (s) => completedCount(s) >= 1 },
  { id: "five-lessons", emoji: "📚", title: "Bookworm", description: "Complete 5 lessons", test: (s) => completedCount(s) >= 5 },
  { id: "perfect-quiz", emoji: "🎯", title: "Flawless", description: "Score 100% on a quiz", test: (s) => Object.values(s.lessons).some((l) => l.quizBest === 1) },
  {
    id: "capstone",
    emoji: "🧩",
    title: "Scenario Solver",
    description: "Complete a module capstone",
    test: (s, c) => allLessons(c).some((l) => l.kind === "capstone" && s.lessons[l.key]?.status === "completed"),
  },
  { id: "streak-3", emoji: "🔥", title: "On Fire", description: "Learn 3 days in a row", test: (s) => streak(s).best >= 3 },
  { id: "streak-7", emoji: "⚡", title: "Week Streak", description: "Learn 7 days in a row", test: (s) => streak(s).best >= 7 },
  { id: "streak-30", emoji: "🌋", title: "Month Streak", description: "Learn 30 days in a row", test: (s) => streak(s).best >= 30 },
  { id: "card-shark", emoji: "🃏", title: "Card Shark", description: "Review 50 flashcards", test: (s) => s.events.filter((e) => e.type === "flashcard_review").length >= 50 },
  { id: "note-taker", emoji: "📝", title: "Note Taker", description: "Write notes on 3 lessons", test: (s) => Object.keys(s.notes).length >= 3 },
  { id: "sim-pilot", emoji: "🕹️", title: "Sim Pilot", description: "Hit a goal in a simulation", test: (s) => s.events.some((e) => e.type === "simulation_goal") },
  { id: "troubleshooter", emoji: "🛠️", title: "Troubleshooter", description: "Solve a scenario with the best outcome", test: (s) => s.events.some((e) => e.type === "scenario_end" && e.value === 1) },
  {
    id: "module-master",
    emoji: "🏆",
    title: "Module Master",
    description: "Earn your first module certificate",
    test: (s) => Object.keys(s.certificates).length >= 1,
  },
  { id: "level-5", emoji: "💎", title: "Lifecycle Legend", description: "Reach level 5", test: (s) => levelInfo(s.xp).level >= 5 },
];

/** Returns the state with any newly earned badges and the list of new badge ids. */
export function evaluateBadges(s: LearnerState, c: Catalog, now = new Date()): { state: LearnerState; earned: BadgeDef[] } {
  const earned = BADGES.filter((b) => !s.badges[b.id] && b.test(s, c));
  if (!earned.length) return { state: s, earned };
  const badges = { ...s.badges };
  for (const b of earned) badges[b.id] = now.toISOString();
  return { state: { ...s, badges }, earned };
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export interface Recommendation {
  lesson: LessonSummary;
  reason: "continue" | "next-in-path" | "next-in-catalog" | "retake-quiz" | "updated";
}

export function recommend(s: LearnerState, c: Catalog, limit = 3): Recommendation[] {
  const out: Recommendation[] = [];
  const seen = new Set<string>();
  const push = (lesson: LessonSummary | undefined, reason: Recommendation["reason"]) => {
    if (lesson && !seen.has(lesson.key) && out.length < limit) {
      seen.add(lesson.key);
      out.push({ lesson, reason });
    }
  };
  const lessons = allLessons(c);
  const byKey = new Map(lessons.map((l) => [l.key, l]));

  // 1. Most recently started, unfinished lesson.
  const inProgress = Object.entries(s.lessons)
    .filter(([, p]) => p.status === "started")
    .sort((a, b) => b[1].startedAt.localeCompare(a[1].startedAt));
  push(byKey.get(inProgress[0]?.[0] ?? ""), "continue");

  // 2. Next lessons in the learner's path, then the catalog order.
  const path = c.paths.find((p) => p.id === s.profile?.pathId);
  const ordered = path ? path.required.map((id) => byKey.get(id)).filter((l): l is LessonSummary => !!l) : [];
  for (const l of ordered) if (l.available && s.lessons[l.key]?.status !== "completed") push(l, "next-in-path");
  for (const l of lessons) if (l.available && s.lessons[l.key]?.status !== "completed") push(l, "next-in-catalog");

  // 3. Weak quizzes and lessons updated since completion.
  for (const l of lessons) {
    const p = s.lessons[l.key];
    if (p?.status === "completed" && l.hasQuiz && (p.quizBest ?? 0) < 0.7) push(l, "retake-quiz");
    if (p?.status === "completed" && p.completedVersion && p.completedVersion !== l.version) push(l, "updated");
  }
  return out;
}

// ---------------------------------------------------------------------------
// Analytics summary (local). The same events can be shipped to a backend later.
// ---------------------------------------------------------------------------

export function analyticsSummary(s: LearnerState, c: Catalog) {
  const lessons = allLessons(c).filter((l) => l.available);
  const perLesson = lessons.map((l) => {
    const p = s.lessons[l.key];
    const blocks = s.events.filter((e) => e.type === "lesson_block" && e.key === l.key).map((e) => e.value ?? 0);
    return {
      key: l.key,
      title: l.title,
      status: (p?.status ?? "not-started") as "started" | "completed" | "not-started",
      furthestBlock: p?.lastBlock ?? 0,
      dropOff: p?.status === "started" ? Math.max(0, ...blocks) : null,
      quizBest: p?.quizBest,
      quizAttempts: p?.quizAttempts ?? 0,
      minutes: Math.round((p?.timeSpentSec ?? 0) / 60),
    };
  });
  const quizEvents = s.events.filter((e) => e.type === "quiz_submit");
  return {
    lessonsCompleted: perLesson.filter((l) => l.status === "completed").length,
    lessonsStarted: perLesson.filter((l) => l.status !== "not-started").length,
    totalMinutes: Math.round(Object.values(s.minutesByDay).reduce((a, b) => a + b, 0)),
    avgQuiz: quizEvents.length ? quizEvents.reduce((a, e) => a + (e.value ?? 0), 0) / quizEvents.length : null,
    perLesson,
  };
}

// ---------------------------------------------------------------------------
// Sync: plug a backend in here (see docs/ARCHITECTURE.md). Local-only by default.
// ---------------------------------------------------------------------------

export interface SyncAdapter {
  name: string;
  pull(): Promise<LearnerState | null>;
  push(state: LearnerState): Promise<void>;
}

/** Merges two states, keeping the furthest progress from each. Used when syncing devices. */
export function mergeStates(a: LearnerState, b: LearnerState): LearnerState {
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  const lessons: Record<string, LessonProgress> = { ...a.lessons };
  for (const [k, p] of Object.entries(b.lessons)) {
    const q = lessons[k];
    if (!q) lessons[k] = p;
    else
      lessons[k] = {
        ...q,
        status: q.status === "completed" || p.status === "completed" ? "completed" : "started",
        completedAt: q.completedAt ?? p.completedAt,
        lastBlock: Math.max(q.lastBlock, p.lastBlock),
        quizBest: Math.max(q.quizBest ?? 0, p.quizBest ?? 0) || undefined,
        quizAttempts: Math.max(q.quizAttempts, p.quizAttempts),
        timeSpentSec: Math.max(q.timeSpentSec, p.timeSpentSec),
      };
  }
  const minutesByDay = { ...a.minutesByDay };
  for (const [d, m] of Object.entries(b.minutesByDay)) minutesByDay[d] = Math.max(minutesByDay[d] ?? 0, m);
  const cards = { ...a.cards };
  for (const [id, cs] of Object.entries(b.cards)) if (!cards[id] || cs.due > cards[id].due) cards[id] = cs;
  return {
    ...newer,
    lessons,
    xp: Math.max(a.xp, b.xp),
    activityDays: [...new Set([...a.activityDays, ...b.activityDays])].sort(),
    minutesByDay,
    badges: { ...b.badges, ...a.badges },
    bookmarks: [...new Set([...newer.bookmarks])],
    notes: { ...(newer === a ? b.notes : a.notes), ...newer.notes },
    cards,
    certificates: { ...b.certificates, ...a.certificates },
    events: [...a.events, ...b.events].sort((x, y) => x.t.localeCompare(y.t)).slice(-MAX_EVENTS),
  };
}
