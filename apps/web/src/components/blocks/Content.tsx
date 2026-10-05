"use client";

import { useState } from "react";
import { Check, CheckCircle2, ChevronRight, Lightbulb, AlertTriangle, Sparkles, Info, Languages, History, Briefcase, Building2, ListChecks, FlaskConical } from "lucide-react";
import type { Block } from "@wm/core";
import { Html } from "./Html";

type B<T extends Block["type"]> = Extract<Block, { type: T }>;

export function TextBlock({ block }: { block: B<"text"> }) {
  return <Html html={block.md} className="text-[17px] max-w-3xl" />;
}

const CALLOUTS = {
  "pro-tip": { label: "Pro tip", bg: "var(--mint-soft)", fg: "var(--mint)", icon: Lightbulb },
  pitfall: { label: "Common pitfall", bg: "var(--amber-soft)", fg: "var(--amber)", icon: AlertTriangle },
  "why-it-matters": { label: "Why this matters in real companies", bg: "var(--primary-soft)", fg: "var(--primary)", icon: Briefcase },
  note: { label: "Note", bg: "var(--surface-2)", fg: "var(--muted)", icon: Info },
  terms: { label: "Plain words → Windchill words", bg: "var(--sky-soft)", fg: "var(--sky)", icon: Languages },
  "version-note": { label: "Version note", bg: "var(--sky-soft)", fg: "var(--sky)", icon: History },
} as const;

export function CalloutBlock({ block }: { block: B<"callout"> }) {
  const c = CALLOUTS[block.variant];
  const Icon = c.icon;
  return (
    <aside className="rounded-[18px] p-5" style={{ background: c.bg }} aria-label={block.title ?? c.label}>
      <p className="flex items-center gap-2 font-bold" style={{ color: c.fg }}>
        <Icon className="size-5" aria-hidden /> {block.title ?? c.label}
        {block.versions && <span className="chip bg-surface font-mono" style={{ color: c.fg }}>{block.versions.join(", ")}</span>}
      </p>
      <Html html={block.md} className="mt-2" />
    </aside>
  );
}

export function ExampleBlock({ block }: { block: B<"example"> }) {
  return (
    <section className="card p-5 sm:p-6" aria-label={block.title}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip bg-sky-soft text-sky">
          <Building2 className="size-3.5" aria-hidden /> {block.variant === "case-study" ? "Case study" : "Real example"}
        </span>
        <span className="chip">{block.industry}</span>
      </div>
      <h2 className="text-xl sm:text-2xl font-bold mt-3">{block.title}</h2>
      <Html html={block.md} className="mt-3" />
      {block.takeaway && (
        <p className="mt-4 rounded-xl bg-surface-2 p-3 font-semibold flex gap-2">
          <Sparkles className="size-5 text-primary shrink-0" aria-hidden /> {block.takeaway}
        </p>
      )}
    </section>
  );
}

export function ComparisonBlock({ block }: { block: B<"comparison"> }) {
  const colColors = ["var(--primary)", "var(--mint)", "var(--sky)", "var(--amber)", "var(--coral)"];
  return (
    <section className="card p-5 sm:p-6" aria-label={block.title}>
      <h2 className="text-xl sm:text-2xl font-bold">{block.title}</h2>
      <div className="overflow-x-auto mt-4 -mx-1 px-1">
        <table className="w-full border-separate border-spacing-0 text-[15px] min-w-[480px]">
          <thead>
            <tr>
              <th scope="col" className="eyebrow text-left p-3 border-b border-line">&nbsp;</th>
              {block.columns.map((c, i) => (
                <th key={i} scope="col" className="text-left p-3 border-b border-line text-xs font-bold uppercase tracking-wider" style={{ color: colColors[i % colColors.length] }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i} className="odd:bg-surface-2/40">
                <th scope="row" className="text-left p-3 font-bold align-top border-b border-line">{r.label}</th>
                {r.cells.map((c, j) => (
                  <td key={j} className="p-3 align-top border-b border-line">{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.takeaway && <p className="mt-4 font-semibold">💡 {block.takeaway}</p>}
    </section>
  );
}

/** "Do it in Windchill": navigation path chips + numbered steps. Never a screen mock-up. */
export function WalkthroughBlock({ block }: { block: B<"walkthrough"> }) {
  const path = block.where.length ? block.where : block.steps[0]?.where ?? [];
  return (
    <section className="card p-5 sm:p-6 flex flex-col gap-4" aria-label={block.title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="eyebrow">Do it in Windchill</p>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">{block.title}</h2>
        </div>
        <span className="chip">Navigation path · menu names can vary by setup</span>
      </div>
      {block.who && <p className="text-sm text-muted">👤 {block.who}</p>}
      {path.length > 0 && <PathChips path={path} />}
      <ol className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(230px,1fr))]">
        {block.steps.map((s, i) => {
          const own = s.where.length && s.where.join(">") !== path.join(">");
          return (
            <li key={i} className="rounded-[14px] bg-surface-2 p-4 flex flex-col gap-1.5">
              <span className="font-mono text-[13px] text-primary font-semibold">STEP {i + 1}</span>
              <p className="font-bold">{s.title}</p>
              {own ? <PathChips path={s.where} small /> : null}
              <Html html={s.md} className="text-[15px] text-muted [&_strong]:text-text" />
            </li>
          );
        })}
      </ol>
      {block.result && (
        <div className="flex gap-2 text-[15px]">
          <CheckCircle2 className="size-5 text-mint shrink-0 mt-0.5" aria-hidden />
          <div>
            <b>You will see: </b>
            <Html html={block.result} inline />
          </div>
        </div>
      )}
    </section>
  );
}

export function PathChips({ path, small = false }: { path: string[]; small?: boolean }) {
  return (
    <nav aria-label="Where to go in Windchill" className="flex flex-wrap items-center gap-1.5">
      {path.map((p, i) => {
        const last = i === path.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            <span
              className={`font-mono rounded-[10px] ${small ? "px-2 py-1 text-xs" : "px-3 py-2 text-sm"}`}
              style={{ background: last ? "var(--primary)" : "var(--primary-soft)", color: last ? "var(--on-primary)" : "var(--primary)" }}
            >
              {p}
            </span>
            {!last && <ChevronRight className="size-4 text-muted" aria-hidden />}
          </span>
        );
      })}
    </nav>
  );
}

export function ExerciseBlock({ block }: { block: B<"exercise"> }) {
  const [done, setDone] = useState<boolean[]>(() => block.steps.map(() => false));
  const env = { "windchill-trial": "Try it in a Windchill trial or training system", described: "Follow along in your head", paper: "Pen-and-paper exercise" }[block.environment];
  const all = done.every(Boolean);
  return (
    <section className="card p-5 sm:p-6" aria-label={block.title}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip bg-mint-soft text-mint">
          <FlaskConical className="size-3.5" aria-hidden /> Practice
        </span>
        <span className="chip">{env}</span>
      </div>
      <h2 className="text-xl sm:text-2xl font-bold mt-3">{block.title}</h2>
      <Html html={block.goal} className="mt-2" />
      <ol className="mt-4 flex flex-col gap-2">
        {block.steps.map((s, i) => (
          <li key={i}>
            <label className={`flex items-start gap-3 rounded-xl p-3 cursor-pointer transition-colors ${done[i] ? "bg-mint-soft" : "bg-surface-2"}`}>
              <input type="checkbox" className="mt-1 size-5 accent-[var(--mint-fill)]" checked={done[i]} onChange={() => setDone(done.map((d, j) => (j === i ? !d : d)))} />
              <span>
                <span className="font-mono text-xs text-muted mr-1">{i + 1}.</span>
                <span className={done[i] ? "line-through opacity-70" : ""} dangerouslySetInnerHTML={{ __html: s }} />
              </span>
            </label>
          </li>
        ))}
      </ol>
      {block.expected && (
        <div className={`mt-4 rounded-xl p-3 ${all ? "bg-mint-soft anim-rise" : "bg-surface-2"}`}>
          <b>{all ? "🎉 Expected result: " : "Expected result: "}</b>
          <Html html={block.expected} inline />
        </div>
      )}
    </section>
  );
}

export function SummaryBlock({ block }: { block: B<"summary"> }) {
  return (
    <section className="rounded-[20px] p-5 sm:p-6 border-2 border-dashed border-primary/40 bg-primary-soft/40" aria-label={block.title}>
      <h2 className="text-xl font-bold flex items-center gap-2">
        <ListChecks className="size-6 text-primary" aria-hidden /> {block.title}
      </h2>
      <ul className="mt-3 flex flex-col gap-2">
        {block.points.map((p, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
              <Check className="size-4" aria-hidden />
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function VideoBlock({ block }: { block: B<"video"> }) {
  const [el, setEl] = useState<HTMLVideoElement | null>(null);
  return (
    <section className="card overflow-hidden" aria-label={block.title}>
      <video ref={setEl} src={block.src} poster={block.poster} controls preload="metadata" className="w-full bg-black aspect-video" />
      <div className="p-4">
        <h2 className="font-bold text-lg">{block.title}</h2>
        {block.chapters.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {block.chapters.map((c, i) => (
              <button key={i} className="btn btn-ghost min-h-9 h-9 px-3 text-sm" onClick={() => el && ((el.currentTime = c.at), el.play())}>
                <span className="font-mono text-xs">{Math.floor(c.at / 60)}:{String(c.at % 60).padStart(2, "0")}</span> {c.title}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
