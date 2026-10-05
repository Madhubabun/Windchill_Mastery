"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Captions, Pause, Play, RotateCcw, ListVideo } from "lucide-react";
import type { Block } from "@wm/core";
import { DiagramCanvas, TONES } from "./Diagram";
import { Html } from "./Html";

type DiagramB = Extract<Block, { type: "diagram" }>;
type AnimationB = Extract<Block, { type: "animation" }>;

export function DiagramBlock({ block }: { block: DiagramB }) {
  const interactive = block.diagram.nodes.filter((n) => n.detail || n.real);
  const [sel, setSel] = useState<string | null>(interactive[0]?.id ?? null);
  const node = block.diagram.nodes.find((n) => n.id === sel);

  return (
    <section className="card p-5 sm:p-6" aria-label={block.title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl sm:text-2xl font-bold">{block.title}</h2>
        <span className="text-sm text-muted">{interactive.length ? "Tap a box to explore" : "Diagram"}</span>
      </div>
      {block.caption && <p className="text-muted mt-1">{block.caption}</p>}
      <div className={`mt-4 grid gap-5 ${interactive.length ? "2xl:grid-cols-[1fr_320px]" : ""}`}>
        <div className="rounded-2xl bg-surface-2/50 p-2 sm:p-3">
          <DiagramCanvas spec={block.diagram} selected={sel} onSelect={setSel} title={block.title} />
        </div>
        {interactive.length > 0 && (
          <div className="flex flex-col gap-3">
            {/* Accessible, phone-friendly list of the same nodes. */}
            <div className="flex flex-wrap gap-2" role="list">
              {interactive.map((n) => (
                <button
                  key={n.id}
                  role="listitem"
                  aria-expanded={sel === n.id}
                  onClick={() => setSel(n.id)}
                  className="chip min-h-9 text-[13px] border"
                  style={{
                    background: sel === n.id ? "var(--primary)" : TONES[n.tone].fill.startsWith("url") ? "var(--primary-soft)" : TONES[n.tone].fill,
                    color: sel === n.id ? "var(--on-primary)" : "var(--text)",
                    borderColor: sel === n.id ? "var(--primary)" : "var(--line)",
                  }}
                >
                  {n.label}
                </button>
              ))}
            </div>
            {node && (
              <div key={node.id} className="anim-rise rounded-[18px] p-5 bg-primary-soft flex flex-col gap-2" aria-live="polite">
                <span className="chip self-start bg-surface text-primary">{node.sublabel ?? "Detail"}</span>
                <h3 className="text-xl font-bold">{node.label}</h3>
                {node.detail && <Html html={node.detail} />}
                {node.real && (
                  <div className="text-sm text-muted">
                    <b className="text-text">In real companies: </b>
                    <Html html={node.real} inline />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const SPEEDS = [1, 1.5, 2];

export function AnimationBlock({ block }: { block: AnimationB }) {
  const chapters = block.chapters;
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [cc, setCc] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const last = useRef<number | null>(null);
  const total = chapters.reduce((a, c) => a + c.seconds, 0);
  const startOf = (k: number) => chapters.slice(0, k).reduce((a, c) => a + c.seconds, 0);
  const ch = chapters[i];

  useEffect(() => {
    if (!playing) {
      last.current = null;
      return;
    }
    let raf = 0;
    const step = (t: number) => {
      if (last.current !== null) {
        const dt = ((t - last.current) / 1000) * speed;
        setElapsed((e) => {
          const ne = e + dt;
          if (ne >= ch.seconds) {
            if (i < chapters.length - 1) {
              setI(i + 1);
              return 0;
            }
            setPlaying(false);
            return ch.seconds;
          }
          return ne;
        });
      }
      last.current = t;
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, i, ch.seconds, chapters.length]);

  const go = useCallback((k: number) => {
    setI(Math.max(0, Math.min(chapters.length - 1, k)));
    setElapsed(0);
  }, [chapters.length]);

  const visible = useMemo(() => (ch.show ? new Set(ch.show) : undefined), [ch]);
  const highlight = useMemo(() => new Set(ch.highlight), [ch]);
  const flow = useMemo(() => new Set(ch.flow), [ch]);
  const position = startOf(i) + elapsed;
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const finished = !playing && i === chapters.length - 1 && elapsed >= ch.seconds;

  return (
    <section className="card overflow-hidden" aria-label={`Animated explainer: ${block.title}`}>
      <div data-theme="dark" className="relative" style={{ background: "#0B0E24" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(60% 80% at 25% 35%, rgba(123,92,255,.40), transparent 70%), radial-gradient(50% 70% at 80% 70%, rgba(18,181,160,.30), transparent 70%)" }} />
        <div className="relative px-3 pt-12 pb-4 sm:px-6">
          <span className="absolute left-4 top-3 chip bg-white/10 text-white">{block.title}</span>
          <span className="absolute right-4 top-3 chip bg-white/10 text-white font-mono">
            {fmt(position)} / {fmt(total)}
          </span>
          <DiagramCanvas spec={block.diagram} visible={visible} highlight={highlight} flow={flow} title={block.title} />
          {cc && (
            <div className="mt-3 mx-auto max-w-3xl rounded-xl bg-black/55 text-white px-4 py-2.5 text-center text-[15px] leading-snug" aria-live="polite">
              <b className="block text-sm opacity-80">{ch.title}</b>
              <span dangerouslySetInnerHTML={{ __html: ch.caption }} />
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-5 py-4">
        {/* Timeline with chapter markers */}
        <div className="relative h-2 rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={Math.round(total)} aria-valuenow={Math.round(position)} aria-label="Animation progress">
          <div className="h-full rounded-full" style={{ width: `${(position / total) * 100}%`, background: "var(--grad)" }} />
          {chapters.slice(1).map((_, k) => (
            <span key={k} className="absolute -top-1 h-4 w-1 rounded bg-text/70" style={{ left: `${(startOf(k + 1) / total) * 100}%` }} />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button className="btn btn-primary w-12 px-0 rounded-full" onClick={() => (finished ? (go(0), setPlaying(true)) : setPlaying(!playing))} aria-label={playing ? "Pause" : finished ? "Replay" : "Play"}>
            {playing ? <Pause className="size-5" /> : finished ? <RotateCcw className="size-5" /> : <Play className="size-5" fill="currentColor" />}
          </button>
          <button className="btn btn-ghost w-11 px-0" onClick={() => go(i - 1)} disabled={i === 0} aria-label="Previous chapter">
            <ChevronLeft className="size-5" />
          </button>
          <button className="btn btn-ghost w-11 px-0" onClick={() => go(i + 1)} disabled={i === chapters.length - 1} aria-label="Next chapter">
            <ChevronRight className="size-5" />
          </button>
          <span className="text-sm font-semibold text-muted ml-1">
            Chapter {i + 1} of {chapters.length}
          </span>
          <div className="ml-auto flex gap-2">
            <button className="btn btn-ghost h-10 min-h-0 px-3 text-sm" onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])} aria-label={`Playback speed ${speed}x`}>
              {speed}x
            </button>
            <button className={`btn h-10 min-h-0 px-3 text-sm ${cc ? "btn-soft" : "btn-ghost"}`} onClick={() => setCc(!cc)} aria-pressed={cc} aria-label="Captions">
              <Captions className="size-4" />
            </button>
            <button className={`btn h-10 min-h-0 px-3 text-sm ${showTranscript ? "btn-soft" : "btn-ghost"}`} onClick={() => setShowTranscript(!showTranscript)} aria-pressed={showTranscript} aria-label="Transcript">
              <ListVideo className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {chapters.map((c, k) => (
            <button
              key={k}
              onClick={() => go(k)}
              className={`btn min-h-9 h-9 px-3 text-sm ${k === i ? "btn-primary" : "btn-ghost"}`}
              aria-current={k === i ? "step" : undefined}
            >
              <span className="font-mono text-xs opacity-80">{fmt(startOf(k))}</span> {c.title}
            </button>
          ))}
        </div>

        {showTranscript && (
          <ol className="mt-4 flex flex-col gap-2 text-[15px]">
            {chapters.map((c, k) => (
              <li key={k} className="rounded-xl bg-surface-2 p-3">
                <b>{c.title}. </b>
                <span dangerouslySetInnerHTML={{ __html: c.caption }} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
