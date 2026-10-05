"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { catalog } from "@/lib/catalog";
import { Html } from "../blocks/Html";

export function GlossaryPage() {
  const [q, setQ] = useState("");
  const [hash, setHash] = useState("");
  useEffect(() => {
    const read = () => setHash(decodeURIComponent(location.hash.slice(1)));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  useEffect(() => {
    if (hash) document.getElementById(hash)?.scrollIntoView({ block: "center" });
  }, [hash]);

  const terms = useMemo(() => {
    const s = q.trim().toLowerCase();
    return catalog.glossary.filter((g) => !s || `${g.term} ${g.plain} ${g.aka.join(" ")}`.toLowerCase().includes(s));
  }, [q]);
  const letters = [...new Set(terms.map((t) => t.term[0].toUpperCase()))];
  const byId = new Map(catalog.glossary.map((g) => [g.id, g]));

  return (
    <div>
      <p className="eyebrow">Glossary</p>
      <h1 className="text-3xl sm:text-[40px] font-extrabold mt-1">Windchill words, in plain English</h1>
      <p className="text-muted mt-2">{catalog.glossary.length} terms. Every term starts with a simple version, then the official definition.</p>
      <div className="sticky top-16 z-10 mt-6 bg-bg/90 backdrop-blur py-2">
        <label className="flex items-center gap-2.5 h-12 px-4 rounded-[14px] bg-surface border border-line focus-within:border-primary">
          <Search className="size-5 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter terms, e.g. iteration, ECN, vault" className="flex-1 bg-transparent outline-none text-[16px]" aria-label="Filter glossary" />
        </label>
        <nav className="flex flex-wrap gap-1 mt-2" aria-label="Jump to letter">
          {letters.map((l) => (
            <a key={l} href={`#letter-${l}`} className="chip hover:bg-primary-soft hover:text-primary">
              {l}
            </a>
          ))}
        </nav>
      </div>
      <dl className="mt-4 grid gap-4 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
        {terms.map((g, i) => {
          const first = i === 0 || terms[i - 1].term[0].toUpperCase() !== g.term[0].toUpperCase();
          return (
            <div key={g.id} id={g.id} className={`card p-5 scroll-mt-40 ${hash === g.id ? "ring-2 ring-primary" : ""}`}>
              {first && <span id={`letter-${g.term[0].toUpperCase()}`} className="block scroll-mt-48" />}
              <dt className="text-lg font-bold">{g.term}</dt>
              {g.aka.length > 0 && <p className="text-xs text-muted font-mono mt-0.5">aka {g.aka.join(", ")}</p>}
              <dd>
                <p className="mt-2 rounded-xl bg-mint-soft px-3 py-2 text-[15px] font-semibold">💬 {g.plain}</p>
                <Html html={g.definition} className="mt-2 text-[15px]" />
                {g.related.length > 0 && (
                  <p className="mt-3 flex flex-wrap gap-1.5">
                    {g.related.map((r) => (
                      <a key={r} href={`#${r}`} className="chip hover:bg-primary-soft hover:text-primary">
                        {byId.get(r)?.term.split(" (")[0] ?? r}
                      </a>
                    ))}
                  </p>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
