import { describe, expect, it } from "vitest";
import {
  applyOps,
  completeLesson,
  emptyState,
  gradeQuiz,
  levelInfo,
  mergeStates,
  nextLetter,
  recordQuiz,
  reviewCard,
  seededShuffle,
  streak,
  xpForLevel,
  type LessonSummary,
  type QuizQuestion,
} from "../src";

const lesson = (over: Partial<LessonSummary> = {}) =>
  ({ id: "m01-s01-l01", key: "m01-s01-l01", kind: "lesson", minutes: 8, version: "1.0.0", ...over }) as LessonSummary;

describe("quiz", () => {
  const qs = [
    { kind: "single", prompt: "a", options: ["x", "y"], answer: 1 },
    { kind: "multi", prompt: "b", options: ["x", "y", "z"], answers: [0, 2] },
    { kind: "truefalse", prompt: "c", answer: false },
    { kind: "order", prompt: "d", items: ["1", "2", "3"] },
  ] as QuizQuestion[];

  it("grades every question kind", () => {
    const r = gradeQuiz(qs, [1, [2, 0], false, ["1", "2", "3"]]);
    expect(r).toMatchObject({ correct: 4, total: 4, score: 1, passed: true });
    expect(gradeQuiz(qs, [0, [0], true, ["3", "2", "1"]]).correct).toBe(0);
  });

  it("shuffles deterministically and never shows a solved order", () => {
    const items = ["a", "b", "c"];
    expect(seededShuffle(items, "seed")).toEqual(seededShuffle(items, "seed"));
    for (let i = 0; i < 50; i++) expect(seededShuffle(items, `s${i}`)).not.toEqual(items);
  });
});

describe("simulation", () => {
  it("steps revision letters like Windchill", () => {
    expect(nextLetter("")).toBe("A");
    expect(nextLetter("A")).toBe("B");
    expect(nextLetter("Z")).toBe("AA");
    expect(nextLetter("AZ")).toBe("BA");
  });

  it("applies ops in order", () => {
    expect(applyOps({ rev: "A", it: 3 }, [{ nextLetter: "rev" }, { set: { it: 1, state: "In Work" } }])).toEqual({ rev: "B", it: 1, state: "In Work" });
  });
});

describe("progress", () => {
  const now = new Date("2026-10-05T10:00:00");

  it("uses the documented level curve", () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 100, 250, 450, 700]);
    expect(levelInfo(260)).toMatchObject({ level: 3, into: 10, span: 200 });
  });

  it("awards lesson XP once and the daily goal bonus", () => {
    let s = emptyState(now);
    s = completeLesson(s, lesson(), now);
    const xp = s.xp;
    expect(xp).toBe(26 + 50);
    s = completeLesson(s, lesson(), now);
    expect(s.xp).toBe(xp);
  });

  it("only gives quiz XP for improvement", () => {
    let s = emptyState(now);
    const a = recordQuiz(s, "k", 0.6, 5, now);
    expect(a.xpGained).toBe(30);
    const b = recordQuiz(a.state, "k", 0.6, 5, now);
    expect(b.xpGained).toBe(0);
    const c = recordQuiz(b.state, "k", 1, 5, now);
    expect(c.xpGained).toBe(20 + 20);
    s = c.state;
    expect(s.lessons.k.quizAttempts).toBe(3);
  });

  it("counts streaks across days", () => {
    const s = { ...emptyState(now), activityDays: ["2026-10-02", "2026-10-03", "2026-10-04"] };
    expect(streak(s, now)).toMatchObject({ current: 3, best: 3, activeToday: false });
  });

  it("moves flashcards through Leitner boxes", () => {
    let s = reviewCard(emptyState(now), "c1", true, now);
    expect(s.cards.c1).toEqual({ box: 1, due: "2026-10-05" });
    s = reviewCard(s, "c1", true, now);
    expect(s.cards.c1).toEqual({ box: 2, due: "2026-10-06" });
    s = reviewCard(s, "c1", false, now);
    expect(s.cards.c1.box).toBe(1);
  });

  it("merges two devices keeping the furthest progress", () => {
    const a = completeLesson(emptyState(now), lesson(), now);
    const b = recordQuiz(emptyState(now), "m01-s01-l02", 1, 5, now).state;
    const m = mergeStates(a, b);
    expect(m.lessons["m01-s01-l01"].status).toBe("completed");
    expect(m.lessons["m01-s01-l02"].quizBest).toBe(1);
    expect(m.xp).toBe(Math.max(a.xp, b.xp));
  });
});
