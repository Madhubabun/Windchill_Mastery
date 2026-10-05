"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Hourglass, Target } from "lucide-react";
import type { LessonSummary } from "@wm/core";
import { getModule, getLesson, neighbours } from "@/lib/catalog";
import { LevelChip, ModalityChips } from "./ui";

export function ComingSoon({ lesson }: { lesson: LessonSummary }) {
  const mod = getModule(lesson.moduleId)!;
  const { prev, next } = neighbours(lesson.id);
  const prereqs = lesson.prerequisites.map((id) => getLesson(id)).filter((l): l is LessonSummary => !!l);
  return (
    <div className="max-w-3xl">
      <Link href={`/learn/${mod.slug}/`} className="text-sm font-semibold text-muted hover:text-text">
        Module {mod.order} · {mod.title}
      </Link>
      <div className="flex flex-wrap gap-2 mt-4">
        <LevelChip level={lesson.level} />
        <span className="chip">{lesson.minutes} min</span>
        <span className="chip bg-amber-soft text-amber">
          <Hourglass className="size-3.5" /> Coming soon
        </span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold mt-3">{lesson.title}</h1>
      <p className="text-muted mt-2">This lesson is planned and in production. Here's what it will cover.</p>

      <section className="card p-6 mt-6">
        <h2 className="font-bold text-lg flex items-center gap-2">
          <Target className="size-5 text-primary" /> You'll be able to
        </h2>
        <ul className="mt-3 flex flex-col gap-2 list-disc pl-5">
          {lesson.objectives.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
        <p className="eyebrow mt-5">How it will teach</p>
        <ModalityChips modalities={lesson.modalities} max={6} className="mt-2" />
        {prereqs.length > 0 && (
          <>
            <p className="eyebrow mt-5">Good to know first</p>
            <ul className="mt-2 flex flex-col gap-1">
              {prereqs.map((p) => (
                <li key={p.id}>
                  <Link href={p.href} className="font-semibold text-primary">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="flex flex-wrap justify-between gap-3 mt-6">
        {prev ? (
          <Link href={prev.href} className="btn btn-ghost">
            <ChevronLeft className="size-4" /> Previous
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={next.href} className="btn btn-ghost">
            Next <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
    </div>
  );
}
