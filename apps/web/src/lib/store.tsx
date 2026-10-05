"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  addTime,
  awardXp,
  completeLesson,
  emptyState,
  evaluateBadges,
  issueCertificate,
  levelInfo,
  migrateState,
  moduleItems,
  reachBlock,
  recordQuiz,
  reviewCard,
  setNote,
  startLesson,
  toggleBookmark,
  type AnalyticsEvent,
  type BadgeDef,
  type LearnerState,
  type LessonSummary,
  type Profile,
  type Settings,
} from "@wm/core";
import { catalog, getModule } from "./catalog";
import { native } from "./native";

const KEY = "wm:learner:v1";

export interface Toast {
  id: number;
  emoji: string;
  title: string;
  body?: string;
  tone?: "xp" | "badge" | "info" | "level";
}

interface Store {
  state: LearnerState;
  ready: boolean;
  toasts: Toast[];
  dismissToast(id: number): void;
  notify(t: Omit<Toast, "id">): void;
  setProfile(p: Profile): void;
  updateSettings(s: Partial<Settings>): void;
  start(key: string): void;
  reach(key: string, index: number): void;
  tick(key: string, seconds: number): void;
  complete(lesson: LessonSummary): void;
  quiz(key: string, score: number, questions: number): number;
  bonus(amount: number, event: Omit<AnalyticsEvent, "t">, label: string): void;
  bookmark(key: string): void;
  note(key: string, text: string): void;
  review(cardId: string, knewIt: boolean): void;
  importState(raw: unknown): void;
  reset(): void;
}

const Ctx = createContext<Store | null>(null);

function load(): LearnerState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrateState(JSON.parse(raw)) : emptyState();
  } catch {
    return emptyState();
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LearnerState>(() => emptyState(new Date(0)));
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(1);

  useEffect(() => {
    setState(load());
    setReady(true);
  }, []);

  // Persist after hydration.
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: progress stays in memory */
    }
  }, [state, ready]);

  // Apply theme, font scale and motion preferences to <html>.
  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    const { theme, fontScale, reducedMotion } = state.settings;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    root.style.setProperty("--font-scale", String(fontScale));
    root.setAttribute("data-reduced-motion", String(reducedMotion));
    try {
      localStorage.setItem("wm:theme", theme);
    } catch {}
  }, [state.settings, ready]);

  const notify = useCallback((t: Omit<Toast, "id">) => {
    const id = toastId.current++;
    setToasts((ts) => [...ts.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 4200);
  }, []);

  /** Applies a change, then awards badges, certificates and level-ups with celebrations. */
  const apply = useCallback(
    (fn: (s: LearnerState) => LearnerState) => {
      setState((prev) => {
        let next = fn(prev);
        // Certificates for any module that just became complete.
        for (const m of catalog.modules) next = issueCertificate(next, m.id, moduleItems(m));
        const { state: withBadges, earned } = evaluateBadges(next, catalog);
        const before = levelInfo(prev.xp).level;
        const after = levelInfo(withBadges.xp);
        queueMicrotask(() => {
          for (const b of earned as BadgeDef[]) notify({ emoji: b.emoji, title: `Badge unlocked: ${b.title}`, body: b.description, tone: "badge" });
          for (const id of Object.keys(withBadges.certificates))
            if (!prev.certificates[id]) notify({ emoji: "🎓", title: "Certificate earned!", body: getModule(id)?.title, tone: "badge" });
          if (prev.updatedAt !== new Date(0).toISOString() && after.level > before)
            notify({ emoji: "⬆️", title: `Level ${after.level}: ${after.title}`, tone: "level" });
          if (earned.length || after.level > before) celebrate();
        });
        return withBadges;
      });
    },
    [notify],
  );

  const store = useMemo<Store>(
    () => ({
      state,
      ready,
      toasts,
      notify,
      dismissToast: (id) => setToasts((ts) => ts.filter((t) => t.id !== id)),
      setProfile: (p) => apply((s) => ({ ...s, profile: p })),
      updateSettings: (patch) => {
        apply((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
        const n = native();
        if (n && patch.reminder) {
          if (patch.reminder.enabled) {
            n.requestNotificationPermission();
            n.scheduleReminder(patch.reminder.hour, patch.reminder.minute);
          } else n.cancelReminder();
        }
      },
      start: (key) => apply((s) => startLesson(s, key)),
      reach: (key, i) => setState((s) => reachBlock(s, key, i)),
      tick: (key, sec) => setState((s) => addTime(s, key, sec)),
      complete: (lesson) => {
        const already = state.lessons[lesson.key]?.status === "completed";
        apply((s) => completeLesson(s, lesson));
        if (!already) {
          notify({ emoji: "✨", title: "Lesson complete!", body: `+${lesson.kind === "capstone" ? "XP bonus + " : ""}XP earned`, tone: "xp" });
          celebrate(0.6);
        }
      },
      quiz: (key, score, questions) => {
        const gained = recordQuiz(state, key, score, questions).xpGained;
        apply((s) => recordQuiz(s, key, score, questions).state);
        return gained;
      },
      bonus: (amount, event, label) => {
        apply((s) => awardXp(s, amount, event));
        notify({ emoji: "⚡", title: `+${amount} XP`, body: label, tone: "xp" });
      },
      bookmark: (key) => setState((s) => toggleBookmark(s, key)),
      note: (key, text) => apply((s) => setNote(s, key, text)),
      review: (id, ok) => apply((s) => reviewCard(s, id, ok)),
      importState: (raw) => setState(migrateState(raw)),
      reset: () => setState(emptyState()),
    }),
    [state, ready, toasts, apply, notify],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

/** Confetti burst, skipped when the learner prefers reduced motion. */
export async function celebrate(intensity = 1) {
  if (typeof window === "undefined") return;
  if (document.documentElement.getAttribute("data-reduced-motion") === "true") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const confetti = (await import("canvas-confetti")).default;
  confetti({
    particleCount: Math.round(90 * intensity),
    spread: 75,
    origin: { y: 0.7 },
    colors: ["#5B3DF5", "#7B5CFF", "#12B5A0", "#FFB020", "#FF7A90"],
    disableForReducedMotion: true,
  });
}
