"use client";

import Link from "next/link";
import { Award, FileDown, Hourglass, Play, Trophy } from "lucide-react";
import { certificateEligible, moduleItems, moduleProgress } from "@wm/core";
import { getModule } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { ProgressRing } from "../ProgressRing";
import { ModuleIcon } from "../Icon";
import { LessonRow, LevelChip, ProgressBar } from "../ui";

export function ModulePage({ moduleId }: { moduleId: string }) {
  const m = getModule(moduleId)!;
  const { state, ready } = useStore();
  const items = moduleItems(m);
  const p = moduleProgress(state, items);
  const nextUp = items.find((l) => l.available && state.lessons[l.key]?.status !== "completed");
  const cert = state.certificates[m.id];
  const comingSoon = m.availableCount === 0;
  let lessonNo = 0;

  return (
    <div className="flex flex-col gap-8">
      <section className={`theme-${m.theme} mod-grad rounded-[28px] p-6 sm:p-9 text-white relative overflow-hidden`}>
        <div className="absolute -right-20 -top-20 size-80 rounded-full border-[50px] border-white/10" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="flex-1 min-w-[260px]">
            <p className="eyebrow !text-white/85 flex items-center gap-2">
              <ModuleIcon name={m.icon} className="size-4" /> Module {m.order}
            </p>
            <h1 className="text-3xl sm:text-[42px] font-extrabold mt-2 leading-tight">{m.title}</h1>
            <p className="text-lg opacity-90 mt-2 max-w-2xl">{m.tagline ?? m.summary}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {m.levels.map((l) => (
                <span key={l} className="chip bg-white/20 text-white capitalize">{l}</span>
              ))}
              <span className="chip bg-white/20 text-white">{m.sections.length} sections</span>
              <span className="chip bg-white/20 text-white">≈ {Math.round(m.totalMinutes / 60)} h</span>
              {m.availableCount < m.totalCount && (
                <span className="chip bg-white/20 text-white">
                  {m.availableCount} of {m.totalCount} ready
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-6">
              {nextUp ? (
                <Link href={nextUp.href} className="btn bg-white text-[#3A22C9] min-h-[52px] sm:min-h-[44px]">
                  <Play className="size-4" fill="currentColor" /> {p.done ? "Continue" : "Start module"}
                </Link>
              ) : comingSoon ? (
                <span className="btn bg-white/15 text-white cursor-default">
                  <Hourglass className="size-4" /> Lessons coming soon
                </span>
              ) : null}
              {m.cheatsheet && (
                <Link href={`/cheatsheet/${m.slug}/`} className="btn bg-white/15 text-white">
                  <FileDown className="size-4" /> Cheat sheet
                </Link>
              )}
            </div>
          </div>
          {!comingSoon && (
            <ProgressRing
              value={ready ? p.ratio : 0}
              size={140}
              stroke={14}
              track="rgba(255,255,255,.22)"
              color="#fff"
              label={
                <span className="text-center text-white">
                  <span className="block font-display text-3xl font-extrabold leading-none">{Math.round((ready ? p.ratio : 0) * 100)}%</span>
                  <span className="text-xs opacity-90">
                    {p.done}/{p.total} done
                  </span>
                </span>
              }
            />
          )}
        </div>
      </section>

      <div className="flex flex-wrap gap-7">
        <div className="flex-[999_1_560px] min-w-0 flex flex-col gap-5">
          {m.sections.map((s, si) => {
            const sp = moduleProgress(state, s.items);
            return (
              <section key={s.id} className="card p-4 sm:p-5" aria-labelledby={s.id}>
                <div className="flex flex-wrap items-start gap-3 px-1">
                  <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary font-display font-extrabold">{si + 1}</span>
                  <div className="flex-1 min-w-[200px]">
                    <h2 id={s.id} className="text-xl font-bold">
                      {s.title}
                    </h2>
                    <p className="text-muted text-[15px]">{s.summary}</p>
                  </div>
                  <span className="text-sm font-semibold text-muted">
                    {sp.done}/{sp.total}
                  </span>
                </div>
                <ProgressBar value={sp.ratio} className="mt-3 mx-1" height={6} />
                <div className="mt-2 flex flex-col">
                  {s.items.map((l) => (
                    <LessonRow key={l.id} lesson={l} index={l.kind === "lesson" ? ++lessonNo : undefined} />
                  ))}
                </div>
              </section>
            );
          })}
          {m.capstone && (
            <section className="card p-5 sm:p-6 border-2 !border-amber-fill/60" aria-label="Capstone">
              <p className="eyebrow flex items-center gap-2 !text-amber">
                <Trophy className="size-4" /> Capstone · {m.capstone.minutes} min
              </p>
              <h2 className="text-2xl font-bold mt-2">{m.capstone.title}</h2>
              <p className="mt-2">{m.capstone.brief}</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {m.capstone.tasks.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="text-amber">◆</span> {t}
                  </li>
                ))}
              </ul>
              <Link href={m.capstone.href} className={`btn mt-4 ${m.capstone.available ? "btn-primary" : "btn-ghost"}`}>
                {m.capstone.available ? (state.lessons[m.capstone.key]?.status === "completed" ? "Replay capstone" : "Take on the capstone") : "Coming soon"}
              </Link>
            </section>
          )}
        </div>

        <aside className="flex-[1_1_280px] lg:max-w-[340px] flex flex-col gap-5">
          <section className="card p-5" aria-label="Module certificate">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-amber-soft text-amber -rotate-3">
                <Award className="size-6" />
              </span>
              <div>
                <p className="font-bold">Module certificate</p>
                <p className="text-sm text-muted">{cert ? `Earned ${new Date(cert.issuedAt).toLocaleDateString()}` : m.badge?.rule ?? "Complete every lesson and checkpoint"}</p>
              </div>
            </div>
            {cert ? (
              <Link href={`/certificate/${m.slug}/`} className="btn btn-grad w-full mt-4">
                View certificate
              </Link>
            ) : (
              <>
                <ProgressBar value={p.ratio} className="mt-4" />
                <p className="text-xs text-muted mt-2">
                  {p.done} of {p.total} items · checkpoints need {80}%{certificateEligible(state, items) ? " · ready!" : ""}
                </p>
              </>
            )}
          </section>
          <section className="card p-5">
            <p className="font-bold">Levels covered</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {m.levels.map((l) => (
                <LevelChip key={l} level={l} />
              ))}
            </div>
            <p className="text-sm text-muted mt-4">Lessons are 5–15 minutes. Jump to any lesson, or follow them in order.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
