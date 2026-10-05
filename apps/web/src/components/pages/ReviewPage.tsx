"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, RotateCcw, Trophy } from "lucide-react";
import { isDue } from "@wm/core";
import cardsJson from "@/generated/flashcards.json";
import { getLesson } from "@/lib/catalog";
import { useStore } from "@/lib/store";

type Card = { id: string; lessonId: string; front: string; back: string };
const ALL = cardsJson as Card[];

export function ReviewPage() {
  const { state, ready, review } = useStore();
  const [session, setSession] = useState<Card[] | null>(null);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);

  // Due = previously reviewed and due now, plus unseen cards from lessons the learner has opened.
  const due = useMemo(
    () => ALL.filter((c) => (state.cards[c.id] ? isDue(state, c.id) : !!state.lessons[c.lessonId])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.cards, state.lessons],
  );
  const mastered = ALL.filter((c) => (state.cards[c.id]?.box ?? 0) >= 4).length;

  const start = (cards: Card[]) => {
    setSession([...cards].sort(() => Math.random() - 0.5).slice(0, 20));
    setI(0);
    setKnown(0);
    setFlipped(false);
  };
  const answer = (ok: boolean) => {
    if (!session) return;
    review(session[i].id, ok);
    if (ok) setKnown(known + 1);
    setFlipped(false);
    setI(i + 1);
  };

  if (!ready) return null;

  if (session && i < session.length) {
    const c = session[i];
    const l = getLesson(c.lessonId);
    return (
      <div className="max-w-xl mx-auto">
        <div className="flex gap-1 mb-5" aria-hidden>
          {session.map((_, k) => (
            <span key={k} className="h-1.5 flex-1 rounded-full" style={{ background: k < i ? "var(--primary)" : k === i ? "var(--grad)" : "var(--surface-2)" }} />
          ))}
        </div>
        <p className="text-sm text-muted font-semibold">
          Card {i + 1} of {session.length} · {l?.title}
        </p>
        <div className="flip mt-3">
          <button className={`flip-inner w-full min-h-[280px] block ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)} aria-label={flipped ? c.back : `${c.front}. Tap to reveal`}>
            <div className="flip-face min-h-[280px] rounded-[24px] grid place-items-center p-8 text-center text-white" style={{ background: "var(--grad)" }}>
              <div>
                <p className="font-display text-3xl font-extrabold">{c.front}</p>
                <p className="text-sm opacity-80 mt-4">Tap to flip</p>
              </div>
            </div>
            <div className="flip-face flip-back min-h-[280px] rounded-[24px] grid place-items-center p-8 text-center bg-surface border border-line">
              <p className="text-xl">{c.back}</p>
            </div>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-5">
          <button className="btn btn-ghost min-h-[52px]" disabled={!flipped} onClick={() => answer(false)}>
            <RotateCcw className="size-4" /> Again
          </button>
          <button className="btn btn-primary min-h-[52px]" disabled={!flipped} onClick={() => answer(true)}>
            <Check className="size-4" /> Got it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <p className="eyebrow">Spaced repetition</p>
      <h1 className="text-3xl sm:text-[40px] font-extrabold mt-1">Review</h1>
      <p className="text-muted mt-2">Cards you get right come back later; cards you miss come back sooner. Five minutes a day beats an hour once a week.</p>
      {session && (
        <div className="card p-6 mt-6 text-center anim-pop">
          <Trophy className="size-10 text-amber mx-auto" />
          <p className="text-xl font-bold mt-2">
            Session done: {known}/{session.length} known
          </p>
        </div>
      )}
      <div className="grid gap-4 mt-6 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-muted font-semibold">Due now</p>
          <p className="font-display text-4xl font-extrabold mt-1">{due.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted font-semibold">Mastered</p>
          <p className="font-display text-4xl font-extrabold mt-1 text-mint">{mastered}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted font-semibold">In the deck</p>
          <p className="font-display text-4xl font-extrabold mt-1">{ALL.length}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-6">
        <button className="btn btn-grad min-h-[52px] px-6" disabled={!due.length} onClick={() => start(due)}>
          Review {Math.min(20, due.length)} due cards
        </button>
        <button className="btn btn-ghost min-h-[52px]" onClick={() => start(ALL)}>
          Practice random cards
        </button>
      </div>
      {!due.length && (
        <p className="text-sm text-muted mt-4">
          Nothing due. Open a lesson to add its cards, like <Link href={ALL[0] ? getLesson(ALL[0].lessonId)?.href ?? "/learn/" : "/learn/"} className="text-primary font-semibold">this one</Link>.
        </p>
      )}
    </div>
  );
}
