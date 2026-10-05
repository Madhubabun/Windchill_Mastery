import type { QuizQuestion } from "./schema";

/** A learner's answer: option index (single), indices (multi), boolean, or item order (order). */
export type QuizAnswer = number | number[] | boolean | string[];

export function isCorrect(q: QuizQuestion, a: QuizAnswer | undefined): boolean {
  if (a === undefined) return false;
  switch (q.kind) {
    case "single":
      return a === q.answer;
    case "truefalse":
      return a === q.answer;
    case "multi": {
      if (!Array.isArray(a)) return false;
      const got = [...new Set(a as number[])].sort();
      const want = [...new Set(q.answers)].sort();
      return got.length === want.length && got.every((v, i) => v === want[i]);
    }
    case "order":
      return Array.isArray(a) && a.length === q.items.length && a.every((v, i) => v === q.items[i]);
  }
}

export interface QuizResult {
  correct: number;
  total: number;
  score: number;
  passed: boolean;
  perQuestion: boolean[];
}

export function gradeQuiz(questions: QuizQuestion[], answers: (QuizAnswer | undefined)[], passMark = 0.7): QuizResult {
  const perQuestion = questions.map((q, i) => isCorrect(q, answers[i]));
  const correct = perQuestion.filter(Boolean).length;
  const total = questions.length;
  const score = total ? correct / total : 0;
  return { correct, total, score, passed: score >= passMark, perQuestion };
}

/** Deterministic shuffle so a question renders the same on server and client. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Never present an order question already solved.
  if (out.length > 1 && out.every((v, i) => v === items[i])) out.push(out.shift()!);
  return out;
}
