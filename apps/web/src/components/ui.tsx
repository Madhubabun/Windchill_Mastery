"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Clock, Lock, PlayCircle, Trophy, ClipboardCheck } from "lucide-react";
import { MODALITY_LABEL, type Level, type LessonSummary } from "@wm/core";
import { useStore } from "@/lib/store";

export const LEVEL_STYLE: Record<Level, { bg: string; fg: string; label: string }> = {
  beginner: { bg: "var(--mint-soft)", fg: "var(--mint)", label: "Beginner" },
  intermediate: { bg: "var(--sky-soft)", fg: "var(--sky)", label: "Intermediate" },
  advanced: { bg: "var(--primary-soft)", fg: "var(--primary)", label: "Advanced" },
  expert: { bg: "var(--coral-soft)", fg: "var(--coral)", label: "Expert" },
};

export function LevelChip({ level }: { level: Level }) {
  const s = LEVEL_STYLE[level];
  return (
    <span className="chip" style={{ background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

export function ModalityChips({ modalities, max = 4, className = "" }: { modalities: string[]; max?: number; className?: string }) {
  const labels = [...new Set(modalities.map((m) => MODALITY_LABEL[m] ?? m))].slice(0, max);
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {labels.map((l) => (
        <span key={l} className="chip">
          {l}
        </span>
      ))}
    </div>
  );
}

export function ProgressBar({ value, className = "", height = 8 }: { value: number; className?: string; height?: number }) {
  return (
    <div className={`rounded-full bg-surface-2 overflow-hidden ${className}`} style={{ height }} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: "var(--grad)", transition: "width var(--dur-reward) var(--ease)" }} />
    </div>
  );
}

export function useLessonStatus(l: LessonSummary) {
  const { state, ready } = useStore();
  const p = state.lessons[l.key];
  return { ready, status: !l.available ? "soon" : (p?.status ?? "new"), quizBest: p?.quizBest } as const;
}

/** One row in a module's lesson list. */
export function LessonRow({ lesson, index }: { lesson: LessonSummary; index?: number }) {
  const { status, quizBest } = useLessonStatus(lesson);
  const Icon = lesson.kind === "checkpoint" ? ClipboardCheck : lesson.kind === "capstone" ? Trophy : status === "completed" ? CheckCircle2 : status === "started" ? PlayCircle : status === "soon" ? Lock : Circle;
  const tint =
    status === "completed" ? "var(--mint)" : status === "started" ? "var(--primary)" : lesson.kind !== "lesson" ? "var(--amber)" : "var(--muted)";
  return (
    <Link
      href={lesson.href}
      className={`group flex items-center gap-3 rounded-[14px] p-3 transition-all hover:bg-surface-2 ${status === "soon" ? "opacity-70" : ""}`}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl" style={{ background: status === "completed" ? "var(--mint-soft)" : "var(--surface-2)", color: tint }}>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-semibold leading-snug group-hover:text-primary">
          {index !== undefined && lesson.kind === "lesson" && <span className="font-mono text-xs text-muted mr-1.5">{String(index).padStart(2, "0")}</span>}
          {lesson.title}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted mt-0.5">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden /> {lesson.minutes} min
          </span>
          {status === "soon" ? <span>· Coming soon</span> : <span>· {lesson.modalities.slice(0, 3).map((m) => MODALITY_LABEL[m] ?? m).join(" · ")}</span>}
          {quizBest !== undefined && <span className="font-semibold" style={{ color: quizBest >= (lesson.passMark ?? 0.7) ? "var(--mint)" : "var(--amber)" }}>· Quiz {Math.round(quizBest * 100)}%</span>}
        </span>
      </span>
      <span className="sr-only">{status === "completed" ? "Completed" : status === "started" ? "In progress" : status === "soon" ? "Coming soon" : "Not started"}</span>
    </Link>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 mb-3">
      <h2 className="text-xl sm:text-2xl font-bold">{title}</h2>
      {action}
    </div>
  );
}

export function Empty({ emoji, title, body, action }: { emoji: string; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="card p-8 text-center flex flex-col items-center gap-2">
      <span className="text-4xl">{emoji}</span>
      <p className="font-bold text-lg">{title}</p>
      {body && <p className="text-muted max-w-md">{body}</p>}
      {action}
    </div>
  );
}
