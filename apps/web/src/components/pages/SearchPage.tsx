"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import MiniSearch from "minisearch";
import { BookOpen, GraduationCap, Search, Tag } from "lucide-react";
import type { SearchDoc } from "@wm/core";
import searchDocs from "@/generated/search.json";
import { useStore } from "@/lib/store";

const ICON = { lesson: GraduationCap, module: BookOpen, glossary: Tag };

export function SearchPage() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | SearchDoc["kind"]>("all");
  const input = useRef<HTMLInputElement>(null);

  const index = useMemo(() => {
    const ms = new MiniSearch<SearchDoc>({
      fields: ["title", "text", "meta"],
      storeFields: ["id", "kind", "title", "href", "meta", "text"],
      searchOptions: { boost: { title: 4 }, prefix: true, fuzzy: 0.2 },
    });
    ms.addAll(searchDocs as SearchDoc[]);
    return ms;
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(location.search).get("q");
    if (p) setQ(p);
    input.current?.focus();
  }, []);

  const results = useMemo(() => {
    if (q.trim().length < 2) return [];
    return index.search(q).filter((r) => kind === "all" || r.kind === kind).slice(0, 40) as unknown as (SearchDoc & { score: number })[];
  }, [q, kind, index]);

  const snippet = (text: string) => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const lower = text.toLowerCase();
    const at = Math.max(0, ...words.map((w) => lower.indexOf(w)).filter((i) => i >= 0).slice(0, 1));
    return (at > 60 ? "…" : "") + text.slice(Math.max(0, at - 60), at + 140) + "…";
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl sm:text-[40px] font-extrabold">Search</h1>
      <label className="mt-5 flex items-center gap-2.5 h-14 px-4 rounded-[16px] bg-surface border border-line focus-within:border-primary shadow-[var(--shadow-card)]">
        <Search className="size-5 text-muted" />
        <input ref={input} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Lessons, objects, glossary terms…" className="flex-1 bg-transparent outline-none text-lg" aria-label="Search lessons and glossary" />
      </label>
      <div className="flex flex-wrap gap-2 mt-3" role="radiogroup" aria-label="Filter results">
        {(["all", "lesson", "glossary", "module"] as const).map((k) => (
          <button key={k} role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`chip min-h-9 px-3.5 capitalize ${kind === k ? "!bg-primary !text-on-primary" : ""}`}>
            {k === "all" ? "Everything" : `${k}s`}
          </button>
        ))}
      </div>
      <ul className="mt-6 flex flex-col gap-3" aria-live="polite">
        {results.map((r) => {
          const I = ICON[r.kind];
          const done = r.kind === "lesson" && state.lessons[r.id]?.status === "completed";
          return (
            <li key={r.id}>
              <Link href={r.href} className="card p-4 flex gap-3.5 hover:-translate-y-0.5 transition-transform">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <I className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-bold">
                    {r.title} {done && <span className="chip bg-mint-soft text-mint ml-1">✓ done</span>}
                  </span>
                  <span className="block text-[13px] text-muted">{r.meta}</span>
                  <span className="block text-sm text-muted mt-1 line-clamp-2">{snippet(r.text)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {q.trim().length >= 2 && !results.length && <p className="mt-8 text-muted">No matches for “{q}”. Try a shorter word, or browse the glossary.</p>}
      {q.trim().length < 2 && (
        <div className="mt-8">
          <p className="eyebrow">Try</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {["iteration", "change notice", "method server", "vault", "saved search", "BOM", "promotion request"].map((s) => (
              <button key={s} className="chip min-h-9 px-3.5 hover:bg-primary-soft hover:text-primary" onClick={() => setQ(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
