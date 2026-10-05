"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { getModule } from "@/lib/catalog";
import { isNativeApp, printPage } from "@/lib/native";
import { Logo } from "../AppShell";

export function CheatsheetPage({ moduleId }: { moduleId: string }) {
  const m = getModule(moduleId)!;
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeApp()), []);
  return (
    <div className="min-h-dvh bg-bg p-4 sm:p-8 flex flex-col items-center gap-5">
      <div className="no-print w-full max-w-[210mm] flex flex-wrap gap-2 justify-between">
        <Link href={`/learn/${m.slug}/`} className="btn btn-ghost">
          <ArrowLeft className="size-4" /> Back to module
        </Link>
        <div className="flex gap-2">
          {!native && (
            <a className="btn btn-ghost" href={`/pdf/${m.slug}-cheatsheet.pdf`} download>
              <Download className="size-4" /> Download PDF
            </a>
          )}
          <button className="btn btn-primary" onClick={() => printPage(`${m.title} cheat sheet`)}>
            <Printer className="size-4" /> Print / Save PDF
          </button>
        </div>
      </div>
      <article className="print-page w-full max-w-[210mm] bg-white text-[#12142B] rounded-[20px] shadow-[var(--shadow-card)] p-[10mm] sm:p-[14mm]" data-theme="light">
        <header className="flex items-center justify-between gap-4 pb-4 border-b-2 border-[#ECE8FF]">
          <Logo />
          <span className="text-xs font-bold uppercase tracking-widest text-[#545873]">Cheat sheet · Module {m.order}</span>
        </header>
        <h1 className="font-display text-3xl font-extrabold mt-5">{m.title}</h1>
        <p className="text-[#545873] mt-1">{m.tagline ?? m.summary}</p>
        <div className="grid sm:grid-cols-2 gap-4 mt-6 print:grid-cols-2">
          {m.cheatsheet!.sections.map((s, i) => (
            <section key={s.title} className="rounded-2xl p-4 break-inside-avoid" style={{ background: ["#ECE8FF", "#DDF5F0", "#E3EEFC", "#FFF1D6"][i % 4] }}>
              <h2 className="font-display text-lg font-bold">{s.title}</h2>
              <ul className="mt-2 flex flex-col gap-1.5 text-[14px] leading-snug">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="text-[#5B3DF5] font-bold">›</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <footer className="mt-6 pt-3 border-t border-[#DEDCEA] text-xs text-[#545873] flex justify-between">
          <span>Windchill Mastery · version-neutral · menu names can vary by setup</span>
          <span>windchill-mastery</span>
        </footer>
      </article>
    </div>
  );
}
