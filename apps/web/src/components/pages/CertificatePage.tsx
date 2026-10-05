"use client";

import Link from "next/link";
import { ArrowLeft, Lock, Printer, Share2 } from "lucide-react";
import { certificateEligible, moduleItems, moduleProgress, type LessonSummary } from "@wm/core";
import { catalog, getLesson, getModule } from "@/lib/catalog";
import { useStore } from "@/lib/store";
import { printPage, shareText } from "@/lib/native";
import { Logo } from "../AppShell";

export function CertificatePage({ id }: { id: string }) {
  const { state, ready } = useStore();
  const mod = getModule(id);
  const path = catalog.paths.find((p) => p.id === id);
  if (!ready) return null;

  const items: LessonSummary[] = mod ? moduleItems(mod) : (path?.required.map((x) => getLesson(x)).filter((l): l is LessonSummary => !!l) ?? []);
  const issued = mod ? state.certificates[mod.id] : undefined;
  const eligible = !!issued || certificateEligible(state, items);
  const title = mod ? mod.title : (path?.certificate?.name ?? path?.title ?? "");
  const back = mod ? `/learn/${mod.slug}/` : `/paths/${id}/`;
  const prog = moduleProgress(state, items);
  const date = issued ? new Date(issued.issuedAt) : new Date(Math.max(...items.map((l) => Date.parse(state.lessons[l.key]?.completedAt ?? "0"))));
  const certId = issued?.id ?? `WM-${id.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)}-${date.getTime().toString(36).toUpperCase()}`;

  if (!eligible)
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="card p-8 max-w-md text-center">
          <Lock className="size-10 mx-auto text-muted" />
          <h1 className="text-2xl font-bold mt-3">Not unlocked yet</h1>
          <p className="text-muted mt-2">
            {prog.done} of {prog.total} items done. Complete every lesson and pass each checkpoint at 80% to earn this certificate.
          </p>
          <Link href={back} className="btn btn-primary mt-5">
            Keep going
          </Link>
        </div>
      </div>
    );

  return (
    <div className="min-h-dvh bg-bg p-4 sm:p-8 flex flex-col items-center gap-5">
      <div className="no-print w-full max-w-4xl flex flex-wrap gap-2 justify-between">
        <Link href={back} className="btn btn-ghost">
          <ArrowLeft className="size-4" /> Back
        </Link>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => shareText("Windchill Mastery certificate", `I just earned my "${title}" certificate on Windchill Mastery! 🎓`)}>
            <Share2 className="size-4" /> Share
          </button>
          <button className="btn btn-primary" onClick={() => printPage(`Certificate - ${title}`)}>
            <Printer className="size-4" /> Save as PDF
          </button>
        </div>
      </div>
      <article className="print-page w-full max-w-4xl aspect-[1.414] bg-white text-[#12142B] rounded-[24px] shadow-[var(--shadow-card)] relative overflow-hidden p-[6%] flex flex-col" data-theme="light">
        <div className="absolute inset-3 rounded-[18px] border-[3px] border-[#5B3DF5]/25 pointer-events-none" />
        <div className="absolute -right-24 -top-24 size-72 rounded-full" style={{ background: "linear-gradient(135deg,#5B3DF5,#12B5A0)", opacity: 0.12 }} />
        <div className="absolute -left-16 -bottom-16 size-56 rounded-full" style={{ background: "linear-gradient(135deg,#7B5CFF,#12B5A0)", opacity: 0.1 }} />
        <Logo />
        <div className="flex-1 flex flex-col justify-center text-center">
          <p className="text-[clamp(10px,1.6vw,14px)] font-bold tracking-[0.25em] uppercase text-[#545873]">Certificate of completion</p>
          <p className="text-[clamp(12px,1.8vw,16px)] mt-[3%] text-[#545873]">This certifies that</p>
          <h1 className="font-display text-[clamp(28px,6vw,60px)] font-extrabold mt-[1%]" style={{ background: "linear-gradient(135deg,#5B3DF5,#7B5CFF 45%,#12B5A0)", WebkitBackgroundClip: "text", color: "transparent" }}>
            {state.profile?.name ?? "Learner"}
          </h1>
          <p className="text-[clamp(12px,1.8vw,16px)] mt-[2%] text-[#545873]">has completed</p>
          <h2 className="font-display text-[clamp(18px,3.4vw,34px)] font-bold mt-[1%]">{title}</h2>
          <p className="text-[clamp(11px,1.5vw,14px)] mt-[2%] text-[#545873]">
            {items.length} lessons, checkpoints and capstone · average checkpoint score {Math.round(prog.avgQuiz * 100)}%
          </p>
        </div>
        <div className="flex justify-between items-end text-[clamp(10px,1.4vw,13px)] text-[#545873]">
          <div>
            <p className="font-bold text-[#12142B]">{date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p>
            <p>Date</p>
          </div>
          <div className="text-right">
            <p className="font-mono font-semibold text-[#12142B]">{certId}</p>
            <p>Certificate ID</p>
          </div>
        </div>
      </article>
    </div>
  );
}
