"use client";

import Link from "next/link";
import { moduleItems, moduleProgress, type Module } from "@wm/core";
import { useStore } from "@/lib/store";
import { ModuleIcon } from "./Icon";
import { ProgressRing } from "./ProgressRing";
import { LevelChip } from "./ui";

export function ModuleCard({ m }: { m: Module }) {
  const { state, ready } = useStore();
  const p = moduleProgress(state, moduleItems(m));
  const soon = m.availableCount === 0;
  return (
    <Link href={`/learn/${m.slug}/`} className="card group overflow-hidden flex flex-col transition-transform hover:-translate-y-0.5">
      <div className={`theme-${m.theme} mod-grad h-28 relative p-4 text-white flex items-start justify-between`}>
        <div className="absolute -right-10 -bottom-12 size-40 rounded-full border-[26px] border-white/10" aria-hidden />
        <span className="grid size-11 place-items-center rounded-2xl bg-white/20">
          <ModuleIcon name={m.icon} className="size-6" />
        </span>
        <span className="font-display text-5xl font-extrabold opacity-30 leading-none">{String(m.order).padStart(2, "0")}</span>
      </div>
      <div className="p-5 flex flex-col gap-2 flex-1">
        <p className="text-[13px] font-semibold text-muted">Module {m.order}</p>
        <h3 className="text-lg font-bold leading-snug group-hover:text-primary">{m.title}</h3>
        <p className="text-sm text-muted line-clamp-2">{m.tagline ?? m.summary}</p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {m.levels.slice(0, 2).map((l) => (
            <LevelChip key={l} level={l} />
          ))}
        </div>
        <div className="mt-auto pt-3 flex items-center justify-between gap-3">
          <span className="text-sm text-muted">
            {soon ? "Coming soon" : `${m.availableCount}${m.availableCount < m.totalCount ? `/${m.totalCount}` : ""} lessons · ${Math.round(m.totalMinutes / 60)} h`}
          </span>
          {!soon && <ProgressRing value={ready ? p.ratio : 0} size={40} stroke={5} label={<span className="text-[10px]">{Math.round(p.ratio * 100)}</span>} />}
        </div>
      </div>
    </Link>
  );
}
