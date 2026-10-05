"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Award, Bell, BookmarkCheck, Download, Flame, Moon, NotebookPen, RotateCcw, Sun, Monitor, Upload, Type, Sparkles, BarChart3, Clock, Target, GraduationCap } from "lucide-react";
import { BADGES, analyticsSummary, levelInfo, streak, type Settings } from "@wm/core";
import { catalog, getLesson, getModule } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { isNativeApp } from "@/lib/native";
import { ProgressBar } from "../ui";
import { ROLE_EMOJI } from "./PathsPage";

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="relative h-8 w-[52px] shrink-0 rounded-full transition-colors" style={{ background: checked ? "var(--primary)" : "var(--line)" }}>
      <span className="absolute top-1 size-6 rounded-full bg-white shadow transition-all" style={{ left: checked ? 24 : 4 }} />
    </button>
  );
}

function Tile({ icon: I, label, value, tone = "var(--primary)" }: { icon: typeof Flame; label: string; value: string; tone?: string }) {
  return (
    <div className="card p-4">
      <I className="size-5" style={{ color: tone }} />
      <p className="font-display text-3xl font-extrabold mt-2">{value}</p>
      <p className="text-sm text-muted font-semibold">{label}</p>
    </div>
  );
}

export function MePage() {
  const store = useStore();
  const { state, ready, updateSettings, setProfile } = store;
  const [tab, setTab] = useState<"progress" | "saved" | "insights" | "settings">("progress");
  const fileRef = useRef<HTMLInputElement>(null);
  if (!ready) return null;

  const lvl = levelInfo(state.xp);
  const st = streak(state);
  const a = analyticsSummary(state, catalog);
  const p = state.profile;
  const initials = (p?.name ?? "L").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const s = state.settings;
  const set = (patch: Partial<Settings>) => updateSettings(patch);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `windchill-mastery-progress-${new Date().toISOString().slice(0, 10)}.json`;
    el.click();
    URL.revokeObjectURL(url);
  };
  const importData = async (f: File) => {
    try {
      store.importState(JSON.parse(await f.text()));
      store.notify({ emoji: "✅", title: "Progress restored", tone: "info" });
    } catch {
      store.notify({ emoji: "⚠️", title: "That file isn't a progress backup", tone: "info" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-5 sm:p-6 flex flex-wrap items-center gap-5">
        <span className="grid size-20 place-items-center rounded-full text-2xl font-extrabold text-white" style={{ background: "var(--grad)" }}>
          {initials}
        </span>
        <div className="flex-1 min-w-[220px]">
          <h1 className="text-3xl font-extrabold">{p?.name ?? "Learner"}</h1>
          <p className="text-muted font-semibold">
            {p ? `${ROLE_EMOJI[p.role]} ${catalog.roles.find((r) => r.id === p.role)?.name}` : "No role picked yet"} · Level {lvl.level} · {lvl.rank}
          </p>
          <ProgressBar value={lvl.progress} className="mt-3 max-w-md" />
          <p className="text-xs text-muted mt-1">
            {state.xp.toLocaleString()} XP · {lvl.span - lvl.into} XP to level {lvl.level + 1}
          </p>
        </div>
      </section>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Tile icon={GraduationCap} label="Lessons done" value={String(a.lessonsCompleted)} />
        <Tile icon={Flame} label={`Day streak · best ${st.best}`} value={String(st.current)} tone="var(--amber)" />
        <Tile icon={Clock} label="Minutes learned" value={String(a.totalMinutes)} tone="var(--sky)" />
        <Tile icon={Target} label="Avg quiz score" value={a.avgQuiz === null ? "–" : `${Math.round(a.avgQuiz * 100)}%`} tone="var(--mint)" />
      </div>

      <div className="flex gap-1 p-1 rounded-[16px] bg-surface-2 self-start overflow-x-auto max-w-full" role="tablist">
        {(
          [
            ["progress", "Badges & certificates"],
            ["saved", "Saved & notes"],
            ["insights", "Insights"],
            ["settings", "Settings"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`px-4 h-10 rounded-[12px] text-sm font-semibold whitespace-nowrap ${tab === k ? "bg-surface shadow text-text" : "text-muted"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "progress" && (
        <div className="flex flex-col gap-6">
          <section className="card p-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Award className="size-5 text-amber" /> Certificates
            </h2>
            {Object.keys(state.certificates).length ? (
              <ul className="mt-3 flex flex-col gap-2">
                {Object.entries(state.certificates).map(([mid, c]) => {
                  const m = getModule(mid);
                  return (
                    <li key={mid}>
                      <Link href={`/certificate/${m?.slug}/`} className="flex items-center gap-3 p-3 rounded-[14px] bg-amber-soft">
                        <Award className="size-6 text-amber" />
                        <span className="flex-1 font-semibold">{m?.title}</span>
                        <span className="text-sm text-muted">{new Date(c.issuedAt).toLocaleDateString()}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted mt-2">Finish every lesson, checkpoint and the capstone of a module to earn its certificate.</p>
            )}
          </section>
          <section className="card p-5">
            <h2 className="text-xl font-bold">Badges</h2>
            <div className="grid gap-4 mt-4 grid-cols-[repeat(auto-fill,minmax(130px,1fr))]">
              {BADGES.map((b) => {
                const got = state.badges[b.id];
                return (
                  <div key={b.id} className={`rounded-[18px] p-4 text-center ${got ? "bg-primary-soft" : "bg-surface-2"}`}>
                    <div className={`mx-auto size-14 grid place-items-center rounded-[18px] bg-surface text-3xl -rotate-3 ${got ? "" : "grayscale opacity-40"}`}>{b.emoji}</div>
                    <p className="font-bold mt-2 text-sm">{b.title}</p>
                    <p className="text-xs text-muted mt-0.5">{got ? `Earned ${new Date(got).toLocaleDateString()}` : b.description}</p>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {tab === "saved" && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="card p-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <BookmarkCheck className="size-5 text-primary" /> Bookmarks
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {state.bookmarks.length ? (
                state.bookmarks.map((k) => {
                  const l = getLesson(k);
                  return l ? (
                    <li key={k}>
                      <Link href={l.href} className="block p-3 rounded-[14px] bg-surface-2 font-semibold hover:text-primary">
                        {l.title}
                      </Link>
                    </li>
                  ) : null;
                })
              ) : (
                <p className="text-muted">Nothing saved yet.</p>
              )}
            </ul>
          </section>
          <section className="card p-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <NotebookPen className="size-5 text-primary" /> Notes
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {Object.keys(state.notes).length ? (
                Object.entries(state.notes).map(([k, n]) => {
                  const l = getLesson(k);
                  return (
                    <li key={k} className="p-3 rounded-[14px] bg-surface-2">
                      <Link href={l?.href ?? "#"} className="font-semibold hover:text-primary">
                        {l?.title ?? k}
                      </Link>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{n.text}</p>
                      <p className="text-xs text-muted mt-1">{new Date(n.updatedAt).toLocaleString()}</p>
                    </li>
                  );
                })
              ) : (
                <p className="text-muted">Your lesson notes will appear here.</p>
              )}
            </ul>
          </section>
        </div>
      )}

      {tab === "insights" && (
        <section className="card p-5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" /> Your learning insights
          </h2>
          <p className="text-sm text-muted mt-1">Where you stopped in each lesson, time spent and quiz attempts. Stored on this device only.</p>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-muted">
                  <th className="p-2">Lesson</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Reached</th>
                  <th className="p-2">Minutes</th>
                  <th className="p-2">Quiz best</th>
                  <th className="p-2">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {a.perLesson
                  .filter((l) => l.status !== "not-started")
                  .map((l) => {
                    const blocks = 0;
                    return (
                      <tr key={l.key} className="border-t border-line">
                        <td className="p-2 font-semibold">{l.title}</td>
                        <td className="p-2">{l.status === "completed" ? "✅ Done" : "⏸ In progress"}</td>
                        <td className="p-2">{l.status === "completed" ? "End" : `Block ${l.furthestBlock + 1 + blocks}`}</td>
                        <td className="p-2">{l.minutes}</td>
                        <td className="p-2">{l.quizBest === undefined ? "–" : `${Math.round(l.quizBest * 100)}%`}</td>
                        <td className="p-2">{l.quizAttempts}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {!a.lessonsStarted && <p className="text-muted mt-3">Start a lesson to see insights.</p>}
          </div>
        </section>
      )}

      {tab === "settings" && (
        <div className="grid gap-6 md:grid-cols-2">
          <section className="card p-5 flex flex-col gap-5">
            <h2 className="text-xl font-bold">Look & feel</h2>
            <div>
              <p className="font-semibold mb-2">Theme</p>
              <div className="flex gap-2" role="radiogroup" aria-label="Theme">
                {(
                  [
                    ["system", "Auto", Monitor],
                    ["light", "Light", Sun],
                    ["dark", "Dark", Moon],
                  ] as const
                ).map(([v, label, I]) => (
                  <button key={v} role="radio" aria-checked={s.theme === v} onClick={() => set({ theme: v })} className={`btn flex-1 ${s.theme === v ? "btn-primary" : "btn-ghost"}`}>
                    <I className="size-4" /> {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-semibold mb-2 flex items-center gap-2">
                <Type className="size-4" /> Text size
              </p>
              <div className="flex gap-2" role="radiogroup" aria-label="Text size">
                {[
                  [0.9, "S"],
                  [1, "M"],
                  [1.12, "L"],
                  [1.25, "XL"],
                ].map(([v, label]) => (
                  <button key={label} role="radio" aria-checked={s.fontScale === v} onClick={() => set({ fontScale: v as number })} className={`btn flex-1 ${s.fontScale === v ? "btn-primary" : "btn-ghost"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <Sparkles className="size-4" /> Reduce motion
                </p>
                <p className="text-sm text-muted">Turns off confetti and animations.</p>
              </div>
              <Switch checked={s.reducedMotion} onChange={(v) => set({ reducedMotion: v })} label="Reduce motion" />
            </div>
          </section>

          <section className="card p-5 flex flex-col gap-5">
            <h2 className="text-xl font-bold">Learning</h2>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold flex items-center gap-2">
                  <Bell className="size-4" /> Daily reminder
                </p>
                <p className="text-sm text-muted">{isNativeApp() ? "A nudge at your chosen time to keep the streak going." : "Reminders work in the Android app."}</p>
              </div>
              <Switch checked={s.reminder.enabled} onChange={(v) => set({ reminder: { ...s.reminder, enabled: v } })} label="Daily reminder" />
            </div>
            {s.reminder.enabled && (
              <label className="flex items-center justify-between gap-3">
                <span className="font-semibold">Reminder time</span>
                <input
                  type="time"
                  value={`${String(s.reminder.hour).padStart(2, "0")}:${String(s.reminder.minute).padStart(2, "0")}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":").map(Number);
                    set({ reminder: { enabled: true, hour: h, minute: m } });
                  }}
                  className="h-11 rounded-xl border border-line bg-surface-2 px-3"
                />
              </label>
            )}
            {p && (
              <>
                <label className="flex items-center justify-between gap-3">
                  <span className="font-semibold">Name</span>
                  <input defaultValue={p.name} onBlur={(e) => setProfile({ ...p, name: e.target.value.trim() || p.name })} className="h-11 rounded-xl border border-line bg-surface-2 px-3 w-48" />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="font-semibold">Learning path</span>
                  <select value={p.pathId} onChange={(e) => {
                    const path = catalog.paths.find((x) => x.id === e.target.value)!;
                    setProfile({ ...p, pathId: path.id, role: path.role });
                  }} className="h-11 rounded-xl border border-line bg-surface-2 px-3 w-48">
                    {catalog.paths.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="font-semibold">Daily goal</span>
                  <select value={p.dailyGoal} onChange={(e) => setProfile({ ...p, dailyGoal: Number(e.target.value) })} className="h-11 rounded-xl border border-line bg-surface-2 px-3 w-48">
                    {[1, 2, 3, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} lesson{n > 1 ? "s" : ""} a day
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </section>

          <section className="card p-5 flex flex-col gap-3">
            <h2 className="text-xl font-bold">Your data</h2>
            <p className="text-sm text-muted">Progress is saved on this device. Back it up, or move it to another device or browser.</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-ghost" onClick={exportData}>
                <Download className="size-4" /> Export backup
              </button>
              <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
                <Upload className="size-4" /> Import backup
              </button>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
              <button
                className="btn btn-ghost text-coral"
                onClick={() => {
                  if (confirm("Reset all progress, badges and notes on this device?")) store.reset();
                }}
              >
                <RotateCcw className="size-4" /> Reset
              </button>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-xl font-bold">What's new</h2>
            <p className="text-sm text-muted">Content version {catalog.contentVersion}</p>
            <ul className="mt-3 flex flex-col gap-3">
              {catalog.changelog.map((c) => (
                <li key={c.version}>
                  <p className="font-semibold">
                    {c.title} <span className="text-xs text-muted font-mono">v{c.version} · {c.date}</span>
                  </p>
                  <ul className="list-disc pl-5 text-sm text-muted mt-1">
                    {c.items.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
