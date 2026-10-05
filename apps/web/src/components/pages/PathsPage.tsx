"use client";

import Link from "next/link";
import { Award, Check, Clock, Route } from "lucide-react";
import { certificateEligible, moduleProgress, type LearningPath, type LessonSummary } from "@wm/core";
import { catalog, getLesson, getModule } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { LessonRow, LevelChip, ProgressBar } from "../ui";
import { ProgressRing } from "../ProgressRing";

export const ROLE_EMOJI: Record<string, string> = {
  "end-user": "🛠️",
  "change-manager": "🔁",
  "business-admin": "🧩",
  "system-admin": "🖥️",
  "migration-specialist": "🚚",
  developer: "💻",
  architect: "🏛️",
};

const items = (ids: string[]) => ids.map((id) => getLesson(id)).filter((l): l is LessonSummary => !!l);

function PathCard({ p }: { p: LearningPath }) {
  const { state } = useStore();
  const req = items(p.required);
  const prog = moduleProgress(state, req);
  const mine = state.profile?.pathId === p.id;
  return (
    <Link href={`/paths/${p.id}/`} className={`card p-5 flex flex-col gap-3 transition-transform hover:-translate-y-0.5 ${mine ? "ring-2 ring-primary" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-2xl">{ROLE_EMOJI[p.role] ?? "🎓"}</span>
        {mine && <span className="chip bg-primary text-on-primary">Your path</span>}
      </div>
      <h3 className="text-xl font-bold">{p.title}</h3>
      <p className="text-sm text-muted flex-1">{p.summary}</p>
      <div className="flex flex-wrap gap-1.5">
        <LevelChip level={p.targetLevel} />
        <span className="chip">
          <Clock className="size-3.5" /> ≈ {Math.round(p.estimatedMinutes / 60)} h
        </span>
        <span className="chip">{req.filter((l) => l.kind !== "checkpoint").length} lessons</span>
      </div>
      <ProgressBar value={prog.ratio} />
    </Link>
  );
}

export function PathsPage() {
  return (
    <div>
      <p className="eyebrow">Role-based learning</p>
      <h1 className="text-3xl sm:text-[40px] font-extrabold mt-1">Pick a path that fits your job</h1>
      <p className="text-muted mt-2 max-w-2xl">Each path strings together the modules and sections your role needs, in the right order, and ends with a path certificate.</p>
      <div className="grid gap-5 mt-8 grid-cols-[repeat(auto-fill,minmax(270px,1fr))]">
        {catalog.paths.map((p) => (
          <PathCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}

export function PathPage({ pathId }: { pathId: string }) {
  const p = catalog.paths.find((x) => x.id === pathId)!;
  const { state, setProfile, ready } = useStore();
  const req = items(p.required);
  const opt = items(p.optional);
  const prog = moduleProgress(state, req);
  const mine = state.profile?.pathId === p.id;
  const eligible = certificateEligible(state, req);
  const byModule = new Map<string, LessonSummary[]>();
  for (const l of req) byModule.set(l.moduleId, [...(byModule.get(l.moduleId) ?? []), l]);
  const next = req.find((l) => l.available && state.lessons[l.key]?.status !== "completed");

  return (
    <div className="flex flex-col gap-7">
      <section className="rounded-[28px] p-6 sm:p-9 text-white relative overflow-hidden" style={{ background: "var(--grad)" }}>
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="flex-1 min-w-[260px]">
            <p className="eyebrow !text-white/85 flex items-center gap-2">
              <Route className="size-4" /> Learning path
            </p>
            <h1 className="text-3xl sm:text-[42px] font-extrabold mt-2">
              {ROLE_EMOJI[p.role]} {p.title}
            </h1>
            <p className="text-lg opacity-90 mt-2 max-w-2xl">{p.summary}</p>
            <div className="flex flex-wrap gap-3 mt-6">
              {next && (
                <Link href={next.href} className="btn bg-white text-[#3A22C9]">
                  {prog.done ? "Continue path" : "Start path"}
                </Link>
              )}
              {ready && !mine && (
                <button
                  className="btn bg-white/15 text-white"
                  onClick={() =>
                    setProfile({
                      name: state.profile?.name ?? "Learner",
                      role: p.role,
                      level: state.profile?.level ?? "beginner",
                      dailyGoal: state.profile?.dailyGoal ?? 1,
                      createdAt: state.profile?.createdAt ?? new Date().toISOString(),
                      pathId: p.id,
                    })
                  }
                >
                  Make this my path
                </button>
              )}
              {mine && (
                <span className="btn bg-white/15 text-white cursor-default">
                  <Check className="size-4" /> Your path
                </span>
              )}
            </div>
          </div>
          <ProgressRing value={ready ? prog.ratio : 0} size={130} stroke={13} track="rgba(255,255,255,.22)" color="#fff" label={<span className="text-white font-display text-2xl font-extrabold">{Math.round(prog.ratio * 100)}%</span>} />
        </div>
      </section>

      <div className="flex flex-wrap gap-7">
        <div className="flex-[999_1_560px] min-w-0 flex flex-col gap-5">
          {[...byModule.entries()].map(([mid, ls]) => {
            const m = getModule(mid)!;
            return (
              <section key={mid} className="card p-4 sm:p-5">
                <Link href={`/learn/${m.slug}/`} className="flex items-center gap-3 px-1 hover:text-primary">
                  <span className={`theme-${m.theme} mod-grad grid size-9 place-items-center rounded-xl text-white font-display font-extrabold`}>{m.order}</span>
                  <h2 className="text-xl font-bold flex-1">{m.title}</h2>
                  <span className="text-sm text-muted">{moduleProgress(state, ls).done}/{ls.length}</span>
                </Link>
                <div className="mt-2 flex flex-col">
                  {ls.map((l) => (
                    <LessonRow key={l.id} lesson={l} />
                  ))}
                </div>
              </section>
            );
          })}
          {opt.length > 0 && (
            <section className="card p-4 sm:p-5">
              <h2 className="text-xl font-bold px-1">Electives</h2>
              <div className="mt-2 flex flex-col">
                {opt.map((l) => (
                  <LessonRow key={l.id} lesson={l} />
                ))}
              </div>
            </section>
          )}
        </div>
        <aside className="flex-[1_1_280px] lg:max-w-[340px]">
          {p.certificate && (
            <section className="card p-5 lg:sticky lg:top-24">
              <div className="flex items-center gap-3">
                <span className="grid size-12 place-items-center rounded-2xl bg-amber-soft text-amber -rotate-3">
                  <Award className="size-6" />
                </span>
                <p className="font-bold">{p.certificate.name}</p>
              </div>
              <p className="text-sm text-muted mt-3">{p.certificate.rule}</p>
              <ProgressBar value={prog.ratio} className="mt-4" />
              <p className="text-xs text-muted mt-2">
                {prog.done} of {prog.total} required items
              </p>
              {eligible && (
                <Link href={`/certificate/${p.id}/`} className="btn btn-grad w-full mt-4">
                  View path certificate
                </Link>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
