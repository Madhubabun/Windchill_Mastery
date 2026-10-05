"use client";

import { useMemo, useState, useRef } from "react";
import { ArrowDown, ArrowUp, Check, RotateCcw, X, Trophy, Zap, Flag, Gamepad2, MessageCircleQuestion, Layers3 } from "lucide-react";
import { applyOps, fill, gradeQuiz, isCorrect, matches, seededShuffle, XP, type Block, type QuizAnswer, type QuizQuestion, type SimState } from "@wm/core";
import { useStore, celebrate } from "@/lib/store";
import { ProgressRing } from "../ProgressRing";
import { Html } from "./Html";

type B<T extends Block["type"]> = Extract<Block, { type: T }>;

// ===================================================================== Quiz

function OptionButton({ label, state, onClick, disabled, multi }: { label: string; state: "idle" | "selected" | "correct" | "wrong" | "missed"; onClick?: () => void; disabled?: boolean; multi?: boolean }) {
  const styles = {
    idle: { bg: "var(--surface)", border: "var(--line)", fg: "var(--text)" },
    selected: { bg: "var(--primary-soft)", border: "var(--primary)", fg: "var(--text)" },
    correct: { bg: "var(--mint-soft)", border: "var(--mint)", fg: "var(--text)" },
    wrong: { bg: "var(--coral-soft)", border: "var(--coral)", fg: "var(--text)" },
    missed: { bg: "var(--surface)", border: "var(--mint)", fg: "var(--text)" },
  }[state];
  const tag = { correct: "Correct", wrong: "Your pick", missed: "Correct answer", selected: "", idle: "" }[state];
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={state === "selected" || state === "correct" || state === "wrong"}
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left flex items-center gap-3 min-h-[52px] px-4 py-3 rounded-[14px] border-[1.5px] font-semibold transition-all ${state === "wrong" ? "anim-shake" : ""} ${!disabled ? "hover:-translate-y-px" : ""}`}
      style={{ background: styles.bg, borderColor: styles.border, color: styles.fg }}
    >
      <span className={`grid size-6 shrink-0 place-items-center border-2 ${multi ? "rounded-md" : "rounded-full"}`} style={{ borderColor: styles.border, background: state === "selected" ? "var(--primary)" : state === "correct" || state === "missed" ? "var(--mint-fill)" : state === "wrong" ? "var(--coral)" : "transparent" }}>
        {(state === "selected" || state === "correct" || state === "missed") && <Check className="size-4 text-white" />}
        {state === "wrong" && <X className="size-4 text-white" />}
      </span>
      <span className="flex-1">{label}</span>
      {tag && <span className="text-xs font-bold uppercase tracking-wide" style={{ color: state === "wrong" ? "var(--coral)" : "var(--mint)" }}>{tag}</span>}
    </button>
  );
}

function QuestionView({ q, seed, answer, setAnswer, checked }: { q: QuizQuestion; seed: string; answer: QuizAnswer | undefined; setAnswer: (a: QuizAnswer) => void; checked: boolean }) {
  const shuffled = useMemo(() => (q.kind === "order" ? seededShuffle(q.items, seed) : []), [q, seed]);
  if (q.kind === "single" || q.kind === "multi" || q.kind === "truefalse") {
    const options = q.kind === "truefalse" ? ["True", "False"] : q.options;
    const correctSet = new Set(q.kind === "single" ? [q.answer] : q.kind === "multi" ? q.answers : [q.answer ? 0 : 1]);
    const chosen = new Set<number>(q.kind === "multi" ? ((answer as number[]) ?? []) : answer === undefined ? [] : [q.kind === "truefalse" ? (answer ? 0 : 1) : (answer as number)]);
    return (
      <div className="flex flex-col gap-2.5" role={q.kind === "multi" ? "group" : "radiogroup"}>
        {q.kind === "multi" && !checked && <p className="text-sm text-muted">Choose all that apply.</p>}
        {options.map((o, i) => {
          let state: "idle" | "selected" | "correct" | "wrong" | "missed" = chosen.has(i) ? "selected" : "idle";
          if (checked) state = chosen.has(i) ? (correctSet.has(i) ? "correct" : "wrong") : correctSet.has(i) ? "missed" : "idle";
          return (
            <OptionButton
              key={i}
              label={o}
              state={state}
              multi={q.kind === "multi"}
              disabled={checked}
              onClick={() => {
                if (q.kind === "multi") {
                  const next = new Set(chosen);
                  next.has(i) ? next.delete(i) : next.add(i);
                  setAnswer([...next].sort());
                } else if (q.kind === "truefalse") setAnswer(i === 0);
                else setAnswer(i);
              }}
            />
          );
        })}
      </div>
    );
  }
  // order
  const current = (answer as string[] | undefined) ?? shuffled;
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= current.length) return;
    const next = [...current];
    [next[i], next[j]] = [next[j], next[i]];
    setAnswer(next);
  };
  return (
    <div>
      {!checked && <p className="text-sm text-muted mb-2">Use the arrows to put these in the right order.</p>}
      <ol className="flex flex-col gap-2">
        {current.map((item, i) => {
          const ok = checked && q.items[i] === item;
          return (
            <li key={item} className="flex items-center gap-2 rounded-[14px] border-[1.5px] px-3 py-2 min-h-[52px] font-semibold transition-all" style={{ background: checked ? (ok ? "var(--mint-soft)" : "var(--coral-soft)") : "var(--surface)", borderColor: checked ? (ok ? "var(--mint)" : "var(--coral)") : "var(--line)" }}>
              <span className="font-mono text-sm text-muted w-5">{i + 1}</span>
              <span className="flex-1">{item}</span>
              {checked ? (
                !ok && <span className="text-xs text-coral font-bold">→ #{q.items.indexOf(item) + 1}</span>
              ) : (
                <span className="flex gap-1">
                  <button type="button" className="btn btn-ghost size-10 min-h-0 px-0" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${item} up`}>
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" className="btn btn-ghost size-10 min-h-0 px-0" onClick={() => move(i, 1)} disabled={i === current.length - 1} aria-label={`Move ${item} down`}>
                    <ArrowDown className="size-4" />
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function QuizBlock({ block, lessonKey, passMark, onPassed }: { block: B<"quiz">; lessonKey: string; passMark?: number; onPassed?: () => void }) {
  const { quiz, state } = useStore();
  const qs = block.questions;
  const mark = passMark ?? block.passMark;
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(QuizAnswer | undefined)[]>(() => qs.map(() => undefined));
  const [checked, setChecked] = useState<boolean[]>(() => qs.map(() => false));
  const [finished, setFinished] = useState(false);
  const [gained, setGained] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [combo, setCombo] = useState(0);
  const best = state.lessons[lessonKey]?.quizBest;

  const q = qs[idx];
  const a = answers[idx];
  const isChecked = checked[idx];
  const correctNow = isChecked && isCorrect(q, a);
  const hasAnswer = a !== undefined && !(Array.isArray(a) && a.length === 0);
  const result = gradeQuiz(qs, answers, mark);

  const check = () => {
    const ok = isCorrect(q, a ?? (q.kind === "order" ? seededShuffle(q.items, `${lessonKey}-${idx}-${attempt}`) : undefined));
    if (q.kind === "order" && a === undefined) setAnswers(answers.map((x, i) => (i === idx ? seededShuffle(q.items, `${lessonKey}-${idx}-${attempt}`) : x)));
    setChecked(checked.map((c, i) => (i === idx ? true : c)));
    setCombo(ok ? combo + 1 : 0);
  };
  const next = () => {
    if (idx < qs.length - 1) setIdx(idx + 1);
    else {
      const r = gradeQuiz(qs, answers, mark);
      setGained(quiz(lessonKey, r.score, qs.length));
      setFinished(true);
      if (r.passed) {
        celebrate(r.score === 1 ? 1 : 0.5);
        onPassed?.();
      }
    }
  };
  const retry = () => {
    setIdx(0);
    setAnswers(qs.map(() => undefined));
    setChecked(qs.map(() => false));
    setFinished(false);
    setCombo(0);
    setAttempt(attempt + 1);
  };

  if (finished) {
    return (
      <section className="card p-6 text-center flex flex-col items-center gap-3" aria-label="Quiz results">
        <ProgressRing value={result.score} size={120} stroke={12} label={<span className="font-display text-2xl font-extrabold">{Math.round(result.score * 100)}%</span>} />
        <h2 className="text-2xl font-bold">{result.passed ? (result.score === 1 ? "Flawless! 💯" : "Nice work! You passed 🎉") : "Almost there, try again 💪"}</h2>
        <p className="text-muted">
          {result.correct} of {result.total} correct · pass mark {Math.round(mark * 100)}%{best !== undefined ? ` · best ${Math.round(Math.max(best, result.score) * 100)}%` : ""}
        </p>
        {gained > 0 && (
          <span className="chip bg-primary-soft text-primary text-sm anim-pop">
            <Zap className="size-4" /> +{gained} XP
          </span>
        )}
        <div className="flex flex-wrap justify-center gap-2 mt-2">
          {result.perQuestion.map((ok, i) => (
            <span key={i} className="grid size-8 place-items-center rounded-full text-sm font-bold" style={{ background: ok ? "var(--mint-soft)" : "var(--coral-soft)", color: ok ? "var(--mint)" : "var(--coral)" }} aria-label={`Question ${i + 1} ${ok ? "correct" : "wrong"}`}>
              {i + 1}
            </span>
          ))}
        </div>
        <button className="btn btn-ghost mt-2" onClick={retry}>
          <RotateCcw className="size-4" /> {result.passed ? "Retake" : "Try again"}
        </button>
      </section>
    );
  }

  return (
    <section className="card p-5 sm:p-6" aria-label={block.title}>
      <div className="flex items-center justify-between gap-3">
        <span className="chip bg-primary-soft text-primary">
          <MessageCircleQuestion className="size-3.5" /> {block.title}
        </span>
        <span className="text-sm font-semibold text-muted">
          {idx + 1} / {qs.length}
        </span>
      </div>
      {/* Segmented progress */}
      <div className="flex gap-1.5 mt-4" aria-hidden>
        {qs.map((qq, i) => (
          <span key={i} className="h-2 flex-1 rounded-full" style={{ background: checked[i] ? (isCorrect(qq, answers[i]) ? "var(--mint-fill)" : "var(--coral)") : i === idx ? "var(--primary)" : "var(--surface-2)" }} />
        ))}
      </div>
      <Html html={q.prompt} className="text-lg sm:text-xl font-bold mt-5 font-display" />
      <div className="mt-4">
        <QuestionView key={`${idx}-${attempt}`} q={q} seed={`${lessonKey}-${idx}-${attempt}`} answer={a} setAnswer={(v) => setAnswers(answers.map((x, i) => (i === idx ? v : x)))} checked={isChecked} />
      </div>

      {isChecked && (
        <div className="mt-4 rounded-[18px] p-4 anim-rise" style={{ background: correctNow ? "var(--mint-soft)" : "var(--coral-soft)" }} role="status">
          <div className="flex items-center gap-2 font-bold" style={{ color: correctNow ? "var(--mint)" : "var(--coral)" }}>
            {correctNow ? <Check className="size-5" /> : <X className="size-5" />}
            {correctNow ? "Correct!" : "Not quite"}
            {correctNow && combo >= 3 && <span className="chip bg-amber-soft text-amber ml-1">🔥 {combo} in a row</span>}
            {correctNow && <span className="chip bg-surface text-primary ml-auto">+{XP.answer} XP</span>}
          </div>
          <Html html={q.explanation} className="mt-2 text-[15px]" />
        </div>
      )}

      <div className="mt-5 flex justify-end">
        {!isChecked ? (
          <button className="btn btn-primary w-full sm:w-auto min-h-[52px] sm:min-h-[44px]" onClick={check} disabled={!hasAnswer && q.kind !== "order"}>
            Check answer
          </button>
        ) : (
          <button className="btn btn-primary w-full sm:w-auto min-h-[52px] sm:min-h-[44px]" onClick={next}>
            {idx < qs.length - 1 ? "Next question" : "See results"}
          </button>
        )}
      </div>
    </section>
  );
}

// ===================================================================== Flashcards

export function FlashcardsBlock({ block, lessonKey, blockIndex }: { block: B<"flashcards">; lessonKey: string; blockIndex: number }) {
  const { review } = useStore();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [drag, setDrag] = useState(0);
  const startX = useRef<number | null>(null);
  const done = i >= block.cards.length;
  const card = block.cards[i];

  const answer = (ok: boolean) => {
    review(`${lessonKey}:${blockIndex}:${i}`, ok);
    if (ok) setKnown(known + 1);
    setFlipped(false);
    setDrag(0);
    setI(i + 1);
  };

  return (
    <section className="card p-5 sm:p-6" aria-label={block.title}>
      <div className="flex items-center justify-between">
        <span className="chip bg-amber-soft text-amber">
          <Layers3 className="size-3.5" /> {block.title}
        </span>
        <span className="text-sm font-semibold text-muted">{Math.min(i + 1, block.cards.length)} / {block.cards.length}</span>
      </div>
      {done ? (
        <div className="text-center py-8 flex flex-col items-center gap-3">
          <Trophy className="size-10 text-amber" />
          <p className="text-xl font-bold">Deck done: you knew {known} of {block.cards.length}</p>
          <p className="text-muted text-sm">Cards you missed come back sooner in Review.</p>
          <button className="btn btn-ghost" onClick={() => { setI(0); setKnown(0); }}>
            <RotateCcw className="size-4" /> Go again
          </button>
        </div>
      ) : (
        <>
          <div
            className="flip mt-4 touch-pan-y"
            onPointerDown={(e) => (startX.current = e.clientX)}
            onPointerMove={(e) => startX.current !== null && flipped && setDrag(e.clientX - startX.current)}
            onPointerUp={() => {
              if (flipped && Math.abs(drag) > 90) answer(drag > 0);
              else setDrag(0);
              startX.current = null;
            }}
            style={{ transform: `translateX(${drag}px) rotate(${drag / 30}deg)`, transition: drag ? "none" : "transform var(--dur-slow) var(--ease)" }}
          >
            <button type="button" className={`flip-inner w-full min-h-[200px] block ${flipped ? "flipped" : ""}`} onClick={() => !drag && setFlipped(!flipped)} aria-label={flipped ? `Answer: ${card.back}. Tap to see the question` : `${card.front}. Tap to reveal the answer`}>
              <div className="flip-face min-h-[200px] rounded-[20px] grid place-items-center p-6 text-center" style={{ background: "var(--grad)", color: "#fff" }}>
                <div>
                  <p className="font-display text-2xl font-extrabold">{card.front}</p>
                  <p className="text-sm opacity-80 mt-3">Tap to flip</p>
                </div>
              </div>
              <div className="flip-face flip-back min-h-[200px] rounded-[20px] grid place-items-center p-6 text-center bg-surface-2 border border-line">
                <p className="text-lg">{card.back}</p>
              </div>
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button className="btn btn-ghost min-h-[52px]" onClick={() => answer(false)} disabled={!flipped}>
              <RotateCcw className="size-4" /> Again
            </button>
            <button className="btn btn-primary min-h-[52px]" onClick={() => answer(true)} disabled={!flipped}>
              <Check className="size-4" /> Got it
            </button>
          </div>
          <p className="text-center text-xs text-muted mt-2">{flipped ? "Swipe right if you knew it, left to see it again" : "Flip the card first"}</p>
        </>
      )}
    </section>
  );
}

// ===================================================================== Scenario

export function ScenarioBlock({ block, lessonKey, blockIndex }: { block: B<"scenario">; lessonKey: string; blockIndex: number }) {
  const { bonus, state } = useStore();
  const byId = useMemo(() => new Map(block.nodes.map((n) => [n.id, n])), [block.nodes]);
  const [trail, setTrail] = useState<{ node: string; choice?: number }[]>([{ node: block.start }]);
  const cur = byId.get(trail[trail.length - 1].node)!;
  const key = `${lessonKey}:${blockIndex}`;
  const label = { "what-if": "What if?", troubleshooting: "Troubleshooting", challenge: "Challenge" }[block.variant];

  const choose = (ci: number) => {
    const c = cur.choices[ci];
    const nextTrail = [...trail.slice(0, -1), { node: cur.id, choice: ci }];
    if (c.next) nextTrail.push({ node: c.next });
    setTrail(nextTrail);
    const target = c.next ? byId.get(c.next) : undefined;
    if (target?.outcome === "success" && !state.events.some((e) => e.type === "scenario_end" && e.key === key && e.value === 1)) {
      bonus(XP.scenario, { type: "scenario_end", key, value: 1 }, "Scenario solved");
      celebrate(0.7);
    }
  };

  const outcomeStyle = cur.outcome && {
    success: { bg: "var(--mint-soft)", fg: "var(--mint)", text: "Best outcome" },
    partial: { bg: "var(--amber-soft)", fg: "var(--amber)", text: "OK, but not ideal" },
    fail: { bg: "var(--coral-soft)", fg: "var(--coral)", text: "That went badly" },
  }[cur.outcome];

  return (
    <section className="card p-5 sm:p-6" aria-label={block.title}>
      <span className="chip bg-sky-soft text-sky">
        <Gamepad2 className="size-3.5" /> {label}
      </span>
      <h2 className="text-xl sm:text-2xl font-bold mt-3">{block.title}</h2>
      <ol className="mt-4 flex flex-col gap-3">
        {trail.slice(0, -1).map((t, i) => {
          const n = byId.get(t.node)!;
          const c = t.choice !== undefined ? n.choices[t.choice] : undefined;
          return (
            <li key={i} className="flex flex-col gap-2 opacity-80">
              <Html html={n.md} className="rounded-2xl rounded-tl-sm bg-surface-2 p-3 text-[15px]" />
              {c && (
                <div className="self-end max-w-[85%] text-right">
                  <span className="inline-block rounded-2xl rounded-tr-sm px-3 py-2 text-[15px] font-semibold" style={{ background: c.good ? "var(--mint-soft)" : "var(--primary-soft)" }}>
                    {c.label}
                  </span>
                  {c.feedback && <p className="text-sm text-muted mt-1">{c.feedback}</p>}
                </div>
              )}
            </li>
          );
        })}
        <li key={`${cur.id}-${trail.length}`} className="anim-rise">
          <Html html={cur.md} className="rounded-2xl rounded-tl-sm bg-surface-2 p-4" />
        </li>
      </ol>
      {outcomeStyle ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[18px] p-4 anim-pop" style={{ background: outcomeStyle.bg }}>
          <Flag className="size-5" style={{ color: outcomeStyle.fg }} />
          <b style={{ color: outcomeStyle.fg }}>{outcomeStyle.text}</b>
          <button className="btn btn-ghost ml-auto bg-surface" onClick={() => setTrail([{ node: block.start }])}>
            <RotateCcw className="size-4" /> Play again
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {cur.choices.map((c, i) => (
            <button key={i} className="btn btn-ghost justify-start text-left min-h-[52px] h-auto py-3" onClick={() => choose(i)}>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-primary text-sm font-bold">{String.fromCharCode(65 + i)}</span>
              {c.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// ===================================================================== Simulation

export function SimulationBlock({ block, lessonKey, blockIndex }: { block: B<"simulation">; lessonKey: string; blockIndex: number }) {
  const { bonus, state: learner } = useStore();
  const [sim, setSim] = useState<SimState>(block.initial);
  const [log, setLog] = useState<{ text: string; ok: boolean }[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const key = `${lessonKey}:${blockIndex}`;
  const goalsMet = block.goals.map((g) => matches(sim, g.when));
  const [seen, setSeen] = useState<boolean[]>(() => block.goals.map(() => false));

  const run = (actionIdx: number) => {
    const a = block.actions[actionIdx];
    if (!matches(sim, a.when)) {
      setLog([{ text: a.blockedHint ?? `“${a.label}” isn't possible right now.`, ok: false }, ...log].slice(0, 12));
      return;
    }
    const next = applyOps(sim, a.do);
    setSim(next);
    setFlash(a.id);
    setTimeout(() => setFlash(null), 500);
    setLog([{ text: fill(a.log, next), ok: true }, ...log].slice(0, 12));
    const nowMet = block.goals.map((g) => matches(next, g.when));
    const newly = nowMet.findIndex((m, i) => m && !seen[i]);
    if (newly >= 0) {
      setSeen(seen.map((s, i) => s || nowMet[i]));
      const all = nowMet.every((m, i) => m || seen[i]);
      if (all && !learner.events.some((e) => e.type === "simulation_goal" && e.key === key)) {
        bonus(XP.simulation, { type: "simulation_goal", key }, "Simulation goals complete");
        celebrate(0.6);
      }
    }
  };

  return (
    <section className="card p-5 sm:p-6" aria-label={block.title}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip bg-mint-soft text-mint">
          <Gamepad2 className="size-3.5" /> Simulation · concept sandbox
        </span>
      </div>
      <h2 className="text-xl sm:text-2xl font-bold mt-3">{block.title}</h2>
      <Html html={block.intro} className="mt-2 text-muted" />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[18px] p-4 sm:p-5" style={{ background: "var(--grad)", color: "#fff" }}>
          {block.headline && <p className="font-mono text-lg sm:text-xl font-semibold" aria-live="polite">{fill(block.headline, sim)}</p>}
          <dl className="mt-3 grid grid-cols-2 gap-2">
            {Object.entries(sim).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-white/15 px-3 py-2">
                <dt className="text-[11px] uppercase tracking-wider opacity-80">{k.replace(/([A-Z])/g, " $1")}</dt>
                <dd className="font-mono font-semibold">{typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            {block.actions.map((a, i) => {
              const enabled = matches(sim, a.when);
              return (
                <button key={a.id} className={`btn min-h-[48px] h-auto py-2 text-[15px] ${enabled ? "btn-soft" : "btn-ghost opacity-60"} ${flash === a.id ? "anim-pop" : ""}`} onClick={() => run(i)} aria-disabled={!enabled}>
                  {a.label}
                </button>
              );
            })}
          </div>
          <button className="btn btn-ghost min-h-9 h-9 text-sm self-start" onClick={() => { setSim(block.initial); setLog([]); }}>
            <RotateCcw className="size-4" /> Reset
          </button>
        </div>
      </div>

      {block.goals.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {block.goals.map((g, i) => {
            const met = goalsMet[i] || seen[i];
            return (
              <li key={i} className={`flex items-start gap-3 rounded-xl p-3 ${met ? "bg-mint-soft" : "bg-surface-2"}`}>
                <span className={`grid size-6 shrink-0 place-items-center rounded-full ${met ? "bg-mint-fill text-white anim-pop" : "border-2 border-line"}`}>{met && <Check className="size-4" />}</span>
                <div>
                  <p className="font-semibold">🎯 {g.label}</p>
                  {met && g.message && <p className="text-sm text-muted">{g.message}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {log.length > 0 && (
        <div className="mt-4">
          <p className="eyebrow">Activity log</p>
          <ol className="mt-2 flex flex-col gap-1.5 font-mono text-[13px]" aria-live="polite">
            {log.map((l, i) => (
              <li key={log.length - i} className={`rounded-lg px-3 py-2 ${i === 0 ? "anim-rise" : "opacity-70"}`} style={{ background: l.ok ? "var(--surface-2)" : "var(--amber-soft)", color: l.ok ? "var(--text)" : "var(--amber)" }}>
                {l.ok ? "›" : "⚠"} {l.text}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
