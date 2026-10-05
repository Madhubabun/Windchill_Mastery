"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, CheckCircle2, Clock, FileDown, Rows3, GalleryHorizontal, X, Zap, NotebookPen } from "lucide-react";
import { XP, type Lesson } from "@wm/core";
import { useStore } from "@/lib/store";
import { catalog, getModule, neighbours } from "@/lib/catalog";
import { BlockView, blockTitle, BLOCK_LABEL } from "./blocks/BlockView";
import { Html } from "./blocks/Html";
import { LevelChip, ModalityChips } from "./ui";

function GlossarySheet({ id, onClose }: { id: string; onClose: () => void }) {
  const g = catalog.glossary.find((x) => x.id === id);
  if (!g) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 anim-rise" onClick={onClose} role="dialog" aria-modal="true" aria-label={g.term}>
      <div className="w-full sm:max-w-md bg-surface rounded-t-[28px] sm:rounded-[28px] p-6 pb-safe shadow-[var(--shadow-sheet)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="eyebrow">Glossary</p>
            <h3 className="text-2xl font-bold mt-1">{g.term}</h3>
          </div>
          <button className="btn btn-ghost size-10 min-h-0 px-0" onClick={onClose} aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-3 rounded-xl bg-mint-soft p-3 font-semibold">💬 {g.plain}</p>
        <Html html={g.definition} className="mt-3" />
        <Link href={`/glossary/#${g.id}`} className="inline-block mt-4 font-semibold text-primary">
          Open in glossary →
        </Link>
      </div>
    </div>
  );
}

export function LessonPlayer({ lesson }: { lesson: Lesson }) {
  const store = useStore();
  const { state, ready } = store;
  const mod = getModule(lesson.moduleId)!;
  const { prev, next } = neighbours(lesson.id);
  const progress = state.lessons[lesson.key];
  const completed = progress?.status === "completed";
  const bookmarked = state.bookmarks.includes(lesson.key);
  const [mode, setMode] = useState<"scroll" | "cards">("scroll");
  const [card, setCard] = useState(0);
  const [gloss, setGloss] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState<string | null>(null);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const blocks = lesson.blocks;
  const total = blocks.length + 1; // + finish card
  const section = mod.sections.find((s) => s.id === lesson.sectionId);
  const position = section ? section.items.findIndex((i) => i.id === lesson.id) + 1 : undefined;

  // Phones default to story-style cards.
  useEffect(() => {
    let m: "scroll" | "cards" = window.matchMedia("(max-width: 767px)").matches ? "cards" : "scroll";
    try {
      const saved = localStorage.getItem("wm:lessonMode");
      if (saved === "scroll" || saved === "cards") m = saved;
    } catch {}
    setMode(m);
  }, []);

  useEffect(() => {
    if (!ready) return;
    store.start(lesson.key);
    setNote(state.notes[lesson.key]?.text ?? "");
    // Resume where the learner left off, in card mode.
    if (state.lessons[lesson.key]?.status === "started") setCard(Math.min(state.lessons[lesson.key].lastBlock, blocks.length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, lesson.key]);

  // Time on task, counted while the tab is visible.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => document.visibilityState === "visible" && store.tick(lesson.key, 15), 15000);
    return () => clearInterval(id);
  }, [ready, lesson.key, store]);

  // Furthest block reached (drop-off analytics + resume).
  useEffect(() => {
    if (!ready || mode !== "scroll") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) store.reach(lesson.key, Number((e.target as HTMLElement).dataset.idx));
      },
      { rootMargin: "0px 0px -40% 0px" },
    );
    blockRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [ready, mode, lesson.key, store]);

  useEffect(() => {
    if (ready && mode === "cards") store.reach(lesson.key, card);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card, mode, ready]);

  const switchMode = (m: "scroll" | "cards") => {
    setMode(m);
    try {
      localStorage.setItem("wm:lessonMode", m);
    } catch {}
  };

  const go = useCallback((k: number) => {
    setCard(Math.max(0, Math.min(total - 1, k)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [total]);

  // Glossary links open a bottom sheet instead of navigating away.
  const onClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest("a.gloss") as HTMLAnchorElement | null;
    if (a?.dataset.term) {
      e.preventDefault();
      setGloss(a.dataset.term);
    }
  };

  const saveNote = () => {
    store.note(lesson.key, note);
    setNoteSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  };

  const complete = () => store.complete(lesson);
  const xp = XP.lesson(lesson.minutes) + (lesson.kind === "capstone" ? XP.capstone : 0);

  const finish = (
    <section className="rounded-[24px] p-6 sm:p-8 text-white relative overflow-hidden" style={{ background: "var(--grad)" }} aria-label="Finish lesson">
      <div className="absolute -right-16 -top-16 size-64 rounded-full border-[40px] border-white/10" aria-hidden />
      <div className="relative">
        {completed ? (
          <>
            <p className="eyebrow !text-white/85">Done</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 flex items-center gap-2">
              <CheckCircle2 className="size-8" /> Lesson complete
            </h2>
          </>
        ) : (
          <>
            <p className="eyebrow !text-white/85">Finish line</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">Ready to lock it in?</h2>
            <p className="opacity-90 mt-1">Mark the lesson complete to earn +{xp} XP and keep your streak.</p>
          </>
        )}
        <div className="flex flex-wrap gap-3 mt-5">
          {!completed && (
            <button className="btn bg-white text-[#3A22C9] min-h-[52px] sm:min-h-[44px]" onClick={complete}>
              <CheckCircle2 className="size-5" /> Complete lesson
            </button>
          )}
          {next && (
            <Link href={next.href} className={`btn min-h-[52px] sm:min-h-[44px] ${completed ? "bg-white text-[#3A22C9]" : "bg-white/15 text-white"}`}>
              Next: {next.title.length > 40 ? next.title.slice(0, 38) + "…" : next.title} <ChevronRight className="size-4" />
            </Link>
          )}
        </div>
      </div>
    </section>
  );

  const isCheckpoint = lesson.kind === "checkpoint";

  return (
    <div onClick={onClick}>
      {/* Breadcrumb + actions */}
      <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-muted">
        <Link href={`/learn/${mod.slug}/`} className="hover:text-text">
          Module {mod.order} · {mod.title}
        </Link>
        {section && (
          <>
            <span aria-hidden>/</span>
            <span>{section.title}</span>
            {position && lesson.kind === "lesson" && (
              <>
                <span aria-hidden>/</span>
                <span className="text-text">Lesson {position} of {section.items.filter((i) => i.kind === "lesson").length}</span>
              </>
            )}
          </>
        )}
        <div className="ml-auto flex gap-2">
          <button className="btn btn-ghost h-10 min-h-0 px-3" onClick={() => store.bookmark(lesson.key)} aria-pressed={bookmarked}>
            {bookmarked ? <BookmarkCheck className="size-4 text-primary" /> : <Bookmark className="size-4" />}
            <span className="hidden sm:inline">{bookmarked ? "Saved" : "Save"}</span>
          </button>
          <button className="btn btn-ghost h-10 min-h-0 px-3" onClick={() => switchMode(mode === "cards" ? "scroll" : "cards")} aria-label={mode === "cards" ? "Switch to scrolling view" : "Switch to card view"}>
            {mode === "cards" ? <Rows3 className="size-4" /> : <GalleryHorizontal className="size-4" />}
            <span className="hidden sm:inline">{mode === "cards" ? "Scroll" : "Cards"}</span>
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-7">
        <div className="flex-[999_1_620px] min-w-0 flex flex-col gap-6">
          <header>
            <div className="flex flex-wrap gap-2">
              <LevelChip level={lesson.level} />
              <span className="chip">
                <Clock className="size-3.5" /> {lesson.minutes} min
              </span>
              <span className="chip bg-primary-soft text-primary">
                <Zap className="size-3.5" /> +{xp} XP
              </span>
              {isCheckpoint && <span className="chip bg-amber-soft text-amber">Checkpoint · pass {Math.round((lesson.passMark ?? 0.8) * 100)}%</span>}
              {lesson.kind === "capstone" && <span className="chip bg-amber-soft text-amber">🏁 Capstone</span>}
              {completed && <span className="chip bg-mint-soft text-mint">✓ Completed</span>}
            </div>
            <h1 className="text-3xl sm:text-[40px] font-extrabold mt-3 leading-tight">{lesson.title}</h1>
            {lesson.subtitle && <p className="text-lg text-muted mt-2 max-w-3xl">{lesson.subtitle}</p>}
            <ModalityChips modalities={lesson.modalities} max={6} className="mt-3" />
          </header>

          {lesson.versionNotes.length > 0 && (
            <div className="rounded-[18px] bg-sky-soft p-4 text-[15px]">
              {lesson.versionNotes.map((n, i) => (
                <div key={i} className="flex gap-2">
                  <span className="chip bg-surface text-sky font-mono shrink-0">{n.versions.join(", ")}</span>
                  <Html html={n.md} />
                </div>
              ))}
            </div>
          )}

          {mode === "scroll" ? (
            <>
              {blocks.map((b, i) => (
                <div key={i} ref={(el) => { blockRefs.current[i] = el; }} data-idx={i} id={`b${i}`} className="scroll-mt-24">
                  <BlockView block={b} lessonKey={lesson.key} index={i} passMark={isCheckpoint ? lesson.passMark : undefined} onQuizPassed={isCheckpoint ? complete : undefined} />
                </div>
              ))}
              {finish}
            </>
          ) : (
            <div
              onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
              onTouchEnd={(e) => {
                if (!touch.current) return;
                const dx = e.changedTouches[0].clientX - touch.current.x;
                const dy = e.changedTouches[0].clientY - touch.current.y;
                const target = e.target as HTMLElement;
                // Ignore swipes on interactive widgets (flashcards, tables, diagrams).
                if (Math.abs(dx) > 70 && Math.abs(dy) < 50 && !target.closest(".flip, table, svg, button")) go(card + (dx < 0 ? 1 : -1));
                touch.current = null;
              }}
            >
              {/* Story segments */}
              <div className="flex gap-1 mb-4" aria-hidden>
                {Array.from({ length: total }).map((_, i) => (
                  <button key={i} onClick={() => go(i)} className="h-1.5 flex-1 rounded-full" style={{ background: i < card ? "var(--primary)" : i === card ? "var(--grad)" : "var(--surface-2)" }} tabIndex={-1} />
                ))}
              </div>
              <p className="eyebrow mb-2">
                {card < blocks.length ? `${card + 1} / ${blocks.length} · ${BLOCK_LABEL[blocks[card].type]}` : "Finish"}
              </p>
              <div key={card} className="anim-rise">
                {card < blocks.length ? (
                  <BlockView block={blocks[card]} lessonKey={lesson.key} index={card} passMark={isCheckpoint ? lesson.passMark : undefined} onQuizPassed={isCheckpoint ? complete : undefined} />
                ) : (
                  finish
                )}
              </div>
              <div className="sticky bottom-[76px] md:bottom-4 z-10 mt-5 grid grid-cols-[auto_1fr] gap-3 rounded-[20px] bg-surface/90 backdrop-blur p-2 border border-line">
                <button className="btn btn-ghost min-h-[52px] w-14 px-0" onClick={() => go(card - 1)} disabled={card === 0} aria-label="Previous">
                  <ChevronLeft className="size-5" />
                </button>
                <button className="btn btn-primary min-h-[52px]" onClick={() => go(card + 1)} disabled={card >= total - 1}>
                  {card >= blocks.length - 1 ? "Finish" : "Next"} <ChevronRight className="size-5" />
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-3 pt-2">
            {prev ? (
              <Link href={prev.href} className="btn btn-ghost">
                <ChevronLeft className="size-4" /> {prev.title.length > 34 ? prev.title.slice(0, 32) + "…" : prev.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={next.href} className="btn btn-ghost">
                {next.title.length > 34 ? next.title.slice(0, 32) + "…" : next.title} <ChevronRight className="size-4" />
              </Link>
            )}
          </div>
        </div>

        <aside className="flex-[1_1_300px] min-w-0 lg:max-w-[360px] flex flex-col gap-5 no-print">
          <section className="card p-5 lg:sticky lg:top-24" aria-labelledby="outline">
            <h2 id="outline" className="text-lg font-bold">
              In this lesson
            </h2>
            <ol className="mt-3 flex flex-col gap-1">
              {blocks.map((b, i) => {
                const reached = (progress?.lastBlock ?? -1) >= i || completed;
                const active = mode === "cards" && card === i;
                return (
                  <li key={i}>
                    <a
                      href={`#b${i}`}
                      onClick={(e) => {
                        if (mode === "cards") {
                          e.preventDefault();
                          go(i);
                        }
                      }}
                      className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-[15px] ${active ? "bg-primary-soft" : "hover:bg-surface-2"}`}
                    >
                      <span className="grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold" style={{ background: reached ? "var(--mint-fill)" : "var(--surface-2)", color: reached ? "#fff" : "var(--muted)" }}>
                        {reached ? "✓" : i + 1}
                      </span>
                      <span className="flex-1 min-w-0 truncate font-semibold">{blockTitle(b)}</span>
                      <span className="text-xs text-muted shrink-0">{BLOCK_LABEL[b.type]}</span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="card p-5" aria-labelledby="notes-h">
            <label id="notes-h" htmlFor="notes" className="font-display text-lg font-bold flex items-center gap-2">
              <NotebookPen className="size-5 text-primary" /> My notes
            </label>
            <textarea
              id="notes"
              rows={5}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={saveNote}
              placeholder="Jot down what clicked. Notes are saved to My Learning."
              className="mt-3 w-full rounded-[14px] border border-line bg-surface-2 p-3 text-[15px] resize-y outline-none focus:border-primary"
            />
            <p className="text-xs text-muted mt-1">{noteSaved ? `Saved at ${noteSaved}` : state.notes[lesson.key] ? "Saved" : "Saves automatically when you click away"}</p>
          </section>

          {mod.cheatsheet && (
            <section className="rounded-[20px] p-5 text-white" style={{ background: "var(--grad)" }}>
              <p className="font-display text-lg font-bold">Module {mod.order} cheat sheet</p>
              <p className="text-sm opacity-90 mt-1">One printable page. Works offline in the app.</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <Link href={`/cheatsheet/${mod.slug}/`} className="btn bg-white text-[#3A22C9]">
                  <FileDown className="size-4" /> Open cheat sheet
                </Link>
              </div>
            </section>
          )}
        </aside>
      </div>
      {gloss && <GlossarySheet id={gloss} onClose={() => setGloss(null)} />}
    </div>
  );
}
