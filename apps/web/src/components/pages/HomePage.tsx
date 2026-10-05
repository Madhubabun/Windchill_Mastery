"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bookmark, Flame, Layers3, Play, Sparkles, Zap } from "lucide-react";
import {
  BADGES,
  MODALITY_LABEL,
  RANKS,
  dailyGoalProgress,
  day,
  isDue,
  levelInfo,
  moduleItems,
  moduleProgress,
  recommend,
  streak,
  type Level,
  type Role,
} from "@wm/core";
import { catalog, getLesson, getModule } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { ProgressRing } from "../ProgressRing";
import { LevelChip, ModalityChips, ProgressBar } from "../ui";
import { ROLE_EMOJI } from "./PathsPage";

// ------------------------------------------------------------------ onboarding

function Onboarding() {
  const { setProfile, notify } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [level, setLevel] = useState<Level>("beginner");
  const [goal, setGoal] = useState(1);

  const finish = () => {
    if (!role) return;
    setProfile({ name: name.trim() || "Learner", role, level, pathId: catalog.paths.find((p) => p.role === role)?.id ?? catalog.paths[0].id, dailyGoal: goal, createdAt: new Date().toISOString() });
    notify({ emoji: "👋", title: `Welcome${name.trim() ? `, ${name.trim()}` : ""}!`, body: "Your path is ready. Let's go.", tone: "info" });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex gap-1.5 mb-6" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i <= step ? "var(--grad)" : "var(--surface-2)" }} />
        ))}
      </div>
      {step === 0 && (
        <section className="anim-rise text-center sm:text-left">
          <p className="eyebrow">Welcome to Windchill Mastery</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold mt-2 leading-tight">
            Learn PLM the <span className="grad-text">fun way.</span>
          </h1>
          <p className="text-lg text-muted mt-3">Bite-size lessons, animations, simulations and real scenarios that take you from zero to Windchill pro. No Windchill install needed.</p>
          <label className="block mt-8 font-semibold" htmlFor="name">
            What should we call you?
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setStep(1)}
            placeholder="Your first name"
            className="mt-2 w-full max-w-md h-[52px] rounded-[14px] border border-line bg-surface px-4 text-lg outline-none focus:border-primary"
            autoComplete="given-name"
          />
          <div className="mt-6">
            <button className="btn btn-primary min-h-[52px] px-8" onClick={() => setStep(1)}>
              Next <ArrowRight className="size-4" />
            </button>
          </div>
        </section>
      )}
      {step === 1 && (
        <section className="anim-rise">
          <h1 className="text-3xl sm:text-4xl font-extrabold">What's your role?</h1>
          <p className="text-muted mt-2">We'll build your learning path around it. You can switch any time.</p>
          <div className="grid gap-3 mt-6 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]" role="radiogroup">
            {catalog.roles.map((r) => (
              <button
                key={r.id}
                role="radio"
                aria-checked={role === r.id}
                onClick={() => setRole(r.id)}
                className={`card text-left p-4 transition-all ${role === r.id ? "!border-primary ring-2 ring-primary scale-[1.02]" : "hover:-translate-y-0.5"}`}
              >
                <span className="text-2xl">{ROLE_EMOJI[r.id]}</span>
                <p className="font-bold mt-2">{r.name}</p>
                <p className="text-sm text-muted mt-1">{r.description}</p>
              </button>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <button className="btn btn-ghost" onClick={() => setStep(0)}>
              Back
            </button>
            <button className="btn btn-primary min-h-[52px] px-8" onClick={() => setStep(2)} disabled={!role}>
              Next <ArrowRight className="size-4" />
            </button>
          </div>
        </section>
      )}
      {step === 2 && (
        <section className="anim-rise">
          <h1 className="text-3xl sm:text-4xl font-extrabold">How well do you know Windchill?</h1>
          <div className="grid gap-3 mt-6 sm:grid-cols-2" role="radiogroup">
            {catalog.levels.map((l) => (
              <button key={l.id} role="radio" aria-checked={level === l.id} onClick={() => setLevel(l.id)} className={`card text-left p-4 ${level === l.id ? "!border-primary ring-2 ring-primary" : ""}`}>
                <LevelChip level={l.id} />
                <p className="text-sm text-muted mt-2">{l.description}</p>
              </button>
            ))}
          </div>
          <p className="font-bold mt-8">Daily goal</p>
          <div className="flex flex-wrap gap-2 mt-2" role="radiogroup">
            {[
              [1, "Casual · 1 lesson"],
              [2, "Regular · 2 lessons"],
              [3, "Serious · 3 lessons"],
            ].map(([n, label]) => (
              <button key={n} role="radio" aria-checked={goal === n} onClick={() => setGoal(n as number)} className={`btn ${goal === n ? "btn-primary" : "btn-ghost"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="mt-8 flex gap-3">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn btn-grad min-h-[52px] px-8" onClick={finish}>
              <Sparkles className="size-4" /> Start learning
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ dashboard

const GLYPH: Record<string, string> = {
  illustration: "◇─◇",
  animation: "▶ ▷ ▷",
  simulation: "{sim}",
  "real-world": "★ case",
  walkthrough: "A › B",
  assessment: "? → ✓",
  scenario: "if → ?",
  comparison: "A | B",
  practice: "try it",
};

const REC_TINTS = [
  ["var(--sky-soft)", "var(--sky)"],
  ["var(--primary-soft)", "var(--primary)"],
  ["var(--mint-soft)", "var(--mint)"],
];
const REASON: Record<string, string> = {
  continue: "Pick up where you left off",
  "next-in-path": "Next in your path",
  "next-in-catalog": "Up next",
  "retake-quiz": "Boost your quiz score",
  updated: "Updated since you took it",
};

function Dashboard() {
  const { state } = useStore();
  const now = new Date();
  const profile = state.profile!;
  const lvl = levelInfo(state.xp);
  const st = streak(state, now);
  const goal = dailyGoalProgress(state, now);
  const recs = recommend(state, catalog, 4);
  const cont = recs[0];
  const contModule = cont && getModule(cont.lesson.moduleId);
  const contProg = contModule ? moduleProgress(state, moduleItems(contModule)) : null;
  const path = catalog.paths.find((p) => p.id === profile.pathId);
  const dueCards = Object.keys(state.cards).filter((id) => isDue(state, id, now)).length;
  const term = catalog.glossary[Math.floor(now.getTime() / 86400000) % catalog.glossary.length];
  const week = Array.from({ length: 7 }).map((_, k) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - k));
    return { label: d.toLocaleDateString(undefined, { weekday: "narrow" }), min: state.minutesByDay[day(d)] ?? 0, today: k === 6 };
  });
  const weekMax = Math.max(15, ...week.map((w) => w.min));
  const weekTotal = Math.round(week.reduce((a, w) => a + w.min, 0));
  const hour = now.getHours();
  const hello = hour < 12 ? "Good morning" : hour < 18 ? "Hey" : "Good evening";
  const rankIdx = RANKS.findIndex((r) => r.name === lvl.rank);
  const earnedBadges = BADGES.filter((b) => state.badges[b.id]);
  const saved = state.bookmarks.map((k) => getLesson(k)).filter((x) => !!x).slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted font-semibold">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="text-3xl sm:text-[40px] font-extrabold mt-1 leading-tight">
            {hello} {profile.name}, ready to level up?
          </h1>
        </div>
        <Link href="/learn/" className="btn btn-ghost">
          Browse all modules
        </Link>
      </div>

      <div className="flex flex-wrap gap-5">
        {cont ? (
          <section className="flex-[2_1_520px] min-w-0 rounded-[24px] p-6 sm:p-7 text-white flex flex-wrap gap-6 items-center relative overflow-hidden" style={{ background: "var(--grad)" }} aria-labelledby="cont">
            <div className="absolute -right-16 -top-16 size-64 rounded-full border-[40px] border-white/10" aria-hidden />
            <ProgressRing value={contProg?.ratio ?? 0} size={120} stroke={12} track="rgba(255,255,255,.22)" color="#fff" label={<span className="text-white text-center"><span className="block font-display text-3xl font-extrabold leading-none">{Math.round((contProg?.ratio ?? 0) * 100)}%</span><span className="text-xs opacity-90">module</span></span>} />
            <div className="flex-[1_1_260px] min-w-0 relative">
              <p id="cont" className="eyebrow !text-white/90">
                {REASON[cont.reason]} · Module {contModule?.order}
              </p>
              <h2 className="text-2xl sm:text-[28px] font-extrabold mt-2 leading-tight">{cont.lesson.title}</h2>
              <p className="opacity-90 mt-1.5 line-clamp-2">{cont.lesson.objectives[0]}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {cont.lesson.modalities.slice(0, 3).map((m) => (
                  <span key={m} className="chip bg-white/20 text-white">{MODALITY_LABEL[m] ?? m}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-2.5 mt-5">
                <Link href={cont.lesson.href} className="btn bg-white text-[#3A22C9] min-h-[52px] sm:min-h-[44px]">
                  <Play className="size-4" fill="currentColor" /> {cont.reason === "continue" ? "Resume lesson" : "Start lesson"}
                </Link>
                <span className="btn bg-white/15 text-white cursor-default">{cont.lesson.minutes} min</span>
              </div>
            </div>
          </section>
        ) : (
          <section className="flex-[2_1_520px] rounded-[24px] p-7 text-white" style={{ background: "var(--grad)" }}>
            <h2 className="text-2xl font-extrabold">You've finished everything that's ready! 🎉</h2>
            <p className="opacity-90 mt-2">New lessons arrive with each content update. Review your flashcards to keep it fresh.</p>
          </section>
        )}

        <section className="card flex-[1_1_280px] min-w-0 p-5 flex flex-col gap-3.5" aria-labelledby="rank">
          <div className="flex items-center justify-between">
            <h3 id="rank" className="text-lg font-bold">
              Lifecycle rank
            </h3>
            <span className="chip bg-sky-soft text-sky">Level {lvl.level}</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {RANKS.map((r, i) => (
              <span key={r.name} className="flex items-center gap-1.5">
                <span className="chip" style={i === rankIdx ? { background: "var(--primary)", color: "var(--on-primary)" } : undefined}>{r.name}</span>
                {i < RANKS.length - 1 && <ArrowRight className="size-3.5 text-muted" aria-hidden />}
              </span>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-sm font-semibold">
              <span>{state.xp.toLocaleString()} XP</span>
              <span className="text-muted">{lvl.nextRank ? `${lvl.xpToNextRank.toLocaleString()} to ${lvl.nextRank}` : "Top rank!"}</span>
            </div>
            <ProgressBar value={lvl.progress} className="mt-2" height={10} />
            <p className="text-xs text-muted mt-1.5">
              {lvl.span - lvl.into} XP to level {lvl.level + 1}
            </p>
          </div>
          <p className="text-sm text-muted">Ranks follow a Windchill life cycle, so the game teaches the vocabulary too.</p>
        </section>
      </div>

      <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
        <section className="card p-5 flex gap-4 items-center" aria-labelledby="goal">
          <ProgressRing value={goal.done / goal.goal} size={84} stroke={10} color="var(--mint-fill)" label={<span className="font-display text-lg font-extrabold">{Math.min(goal.done, goal.goal)}/{goal.goal}</span>} />
          <div>
            <h3 id="goal" className="text-lg font-bold">
              Daily goal
            </h3>
            <p className="text-sm text-muted mt-1">
              {goal.done >= goal.goal ? `Goal hit! +50 XP. Your streak is ${st.current} day${st.current === 1 ? "" : "s"}.` : `${goal.goal - goal.done} more lesson${goal.goal - goal.done === 1 ? "" : "s"} ${st.current ? `keeps your ${st.current}-day streak alive` : "starts a streak"}.`}
            </p>
          </div>
        </section>
        <section className="card p-5" aria-labelledby="week">
          <div className="flex justify-between items-baseline">
            <h3 id="week" className="text-lg font-bold">
              This week
            </h3>
            <span className="text-sm text-muted">{weekTotal} min</span>
          </div>
          <div className="flex items-end gap-2.5 h-[76px] mt-3">
            {week.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full max-w-[22px] rounded-md" style={{ height: Math.max(4, (d.min / weekMax) * 56), background: d.today ? "var(--primary)" : "var(--primary-soft)" }} title={`${Math.round(d.min)} min`} />
                <span className="text-xs text-muted font-semibold">{d.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card p-5" aria-labelledby="term">
          <p className="eyebrow">Term of the day</p>
          <h3 id="term" className="text-xl font-bold mt-1.5">
            {term.term}
          </h3>
          <p className="text-sm text-muted mt-1.5">{term.plain}</p>
          <Link href={`/glossary/#${term.id}`} className="inline-block mt-2.5 text-sm font-semibold text-primary">
            Open glossary
          </Link>
        </section>
      </div>

      {recs.length > 1 && (
        <section aria-labelledby="recs">
          <div className="flex justify-between items-baseline mb-3.5">
            <h2 id="recs" className="text-2xl font-bold">
              Recommended next
            </h2>
            {path && (
              <Link href={`/paths/${path.id}/`} className="font-semibold text-primary">
                See your path
              </Link>
            )}
          </div>
          <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
            {recs.slice(1).map((r, i) => {
              const [tint, ink] = REC_TINTS[i % REC_TINTS.length];
              const m = getModule(r.lesson.moduleId)!;
              return (
                <Link key={r.lesson.id} href={r.lesson.href} className="card overflow-hidden flex flex-col transition-transform hover:-translate-y-0.5">
                  <div className="h-[110px] relative grid place-items-center" style={{ background: tint }}>
                    <span className="font-mono text-3xl font-semibold" style={{ color: ink }}>
                      {r.lesson.kind === "checkpoint" ? "✓ 80%" : r.lesson.kind === "capstone" ? "🏁 go" : (GLYPH[r.lesson.modalities[0]] ?? "A.1")}
                    </span>
                    <span className="absolute left-3.5 top-3.5">
                      <LevelChip level={r.lesson.level} />
                    </span>
                  </div>
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <p className="text-[13px] text-muted font-semibold">
                      Module {m.order} · {REASON[r.reason]}
                    </p>
                    <h3 className="text-[17px] font-bold leading-snug">{r.lesson.title}</h3>
                    <div className="mt-auto pt-1.5 flex flex-wrap gap-1.5">
                      <ModalityChips modalities={r.lesson.modalities} max={1} />
                      <span className="chip">{r.lesson.minutes} min</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
        <section className="card p-5" aria-labelledby="ml">
          <div className="flex justify-between items-baseline">
            <h2 id="ml" className="text-xl font-bold">
              My Learning
            </h2>
            <Link href="/me/" className="text-sm font-semibold text-primary">
              Open
            </Link>
          </div>
          <div className="flex flex-col gap-2.5 mt-3.5">
            {dueCards > 0 && (
              <Link href="/review/" className="flex items-center gap-3.5 p-3 rounded-[14px] bg-amber-soft">
                <span className="grid size-10 place-items-center rounded-xl bg-surface text-amber">
                  <Layers3 className="size-5" />
                </span>
                <span className="flex-1">
                  <b className="block">{dueCards} flashcards due</b>
                  <span className="text-[13px] text-muted">Quick review keeps it in your head</span>
                </span>
              </Link>
            )}
            {saved.length ? (
              saved.map((l) => (
                <Link key={l!.id} href={l!.href} className="flex items-center gap-3.5 p-3 rounded-[14px] bg-surface-2">
                  <span className="grid size-10 place-items-center rounded-xl bg-surface text-primary">
                    <Bookmark className="size-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <b className="block truncate">{l!.title}</b>
                    <span className="text-[13px] text-muted truncate block">{state.notes[l!.key] ? `Note: “${state.notes[l!.key].text.slice(0, 50)}”` : `Module ${getModule(l!.moduleId)?.order} · saved`}</span>
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted">Tap “Save” on any lesson to keep it here. Your notes show up here too.</p>
            )}
          </div>
        </section>
        <section className="card p-5" aria-labelledby="bdg">
          <div className="flex justify-between items-baseline">
            <h2 id="bdg" className="text-xl font-bold">
              Badges
            </h2>
            <span className="text-sm text-muted">
              {earnedBadges.length} of {BADGES.length}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-3.5">
            {BADGES.slice(0, 8).map((b) => {
              const got = !!state.badges[b.id];
              return (
                <div key={b.id} className="flex flex-col items-center gap-1.5 text-center" title={b.description}>
                  <div className={`size-14 rounded-[18px] grid place-items-center text-2xl -rotate-3 ${got ? "bg-primary-soft anim-pop" : "bg-surface-2 grayscale opacity-50"}`}>{b.emoji}</div>
                  <span className="text-xs font-semibold leading-tight">{b.title}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 p-3.5 rounded-[14px] border border-dashed border-line flex items-center gap-3 text-sm">
            <Zap className="size-5 text-amber shrink-0" />
            <span>
              <b>Fundamentals certificate</b> unlocks after every Module 1 lesson, checkpoint and the capstone.
            </span>
          </div>
        </section>
      </div>
      {st.current > 0 && !st.activeToday && (
        <p className="text-center text-sm text-muted flex items-center justify-center gap-1.5">
          <Flame className="size-4 text-amber" /> Complete a lesson today to keep your {st.current}-day streak.
        </p>
      )}
    </div>
  );
}

export function HomePage() {
  const { state, ready } = useStore();
  if (!ready) return <div className="h-[60vh]" aria-busy="true" />;
  return state.profile ? <Dashboard /> : <Onboarding />;
}
