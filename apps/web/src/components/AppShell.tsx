"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, CloudDownload, Flame, Home, Layers3, Moon, Search, Sun, Type, User, Route, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { getLesson, catalog } from "@/lib/catalog";
import { moduleProgress, type LessonSummary } from "@wm/core";
import { levelInfo, streak } from "@wm/core";
import { useStore } from "@/lib/store";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/paths/", label: "Learning paths", icon: Route },
  { href: "/learn/", label: "Modules", icon: BookOpen },
  { href: "/review/", label: "Practice & review", icon: Layers3 },
  { href: "/glossary/", label: "Glossary", icon: Type },
  { href: "/me/", label: "My Learning", icon: User },
  { href: "/offline/", label: "Offline", icon: CloudDownload },
];

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/learn/", label: "Learn", icon: BookOpen },
  { href: "/offline/", label: "Offline", icon: CloudDownload },
  { href: "/me/", label: "Me", icon: User },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-[38px] place-items-center rounded-xl" style={{ background: "linear-gradient(135deg,#5B3DF5 0%,#7B5CFF 45%,#12B5A0 100%)" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
          <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
        </svg>
      </span>
      {!compact && (
        <span className="font-display font-extrabold text-[19px] leading-none tracking-[-0.02em]">
          Windchill<span className="text-primary">Mastery</span>
        </span>
      )}
    </span>
  );
}

function StatsPill() {
  const { state, ready } = useStore();
  if (!ready) return <div className="h-9 w-28" />;
  const s = streak(state);
  return (
    <Link href="/me/" className="flex items-center gap-2" aria-label={`${s.current}-day streak, level ${levelInfo(state.xp).level}, ${state.xp} XP`}>
      <span className={`chip h-9 px-3 ${s.activeToday ? "bg-amber-soft text-amber" : ""}`}>
        <Flame className="size-4" aria-hidden /> {s.current}
        <span className="hidden lg:inline">day streak</span>
      </span>
      <span className="chip h-9 px-3 bg-primary-soft text-primary">
        <Zap className="size-4" aria-hidden /> {state.xp.toLocaleString()}
        <span className="hidden sm:inline">XP</span>
      </span>
    </Link>
  );
}

function ThemeToggle() {
  const { state, updateSettings, ready } = useStore();
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const t = state.settings.theme;
    setDark(t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));
  }, [state.settings.theme, ready]);
  return (
    <button className="btn btn-ghost size-11 min-h-0 px-0 border-0 bg-surface-2" onClick={() => updateSettings({ theme: dark ? "light" : "dark" })} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

function HeaderSearch() {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <form
      className="hidden md:flex flex-[1_1_260px] max-w-[520px] items-center gap-2.5 h-11 px-3.5 rounded-[14px] bg-surface-2 text-muted"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/search/?q=${encodeURIComponent(ref.current?.value ?? "")}`);
      }}
      role="search"
    >
      <Search className="size-[18px]" aria-hidden />
      <input ref={ref} type="search" aria-label="Search lessons and glossary" placeholder="Search lessons, objects, glossary terms" className="flex-1 min-w-0 bg-transparent outline-none text-[15px] font-medium text-text" />
      <span className="font-mono text-xs px-1.5 py-0.5 rounded-md border border-line">Ctrl K</span>
    </form>
  );
}

function PathCard() {
  const { state, ready } = useStore();
  const p = catalog.paths.find((x) => x.id === state.profile?.pathId);
  if (!ready || !p) return null;
  const items = p.required.map((id) => getLesson(id)).filter((l): l is LessonSummary => !!l);
  const prog = moduleProgress(state, items);
  return (
    <Link href={`/paths/${p.id}/`} className="card mt-5 p-4 !shadow-none block hover:border-primary">
      <p className="eyebrow">Your path</p>
      <p className="font-bold mt-1.5">{p.title}</p>
      <div className="h-2 rounded-full bg-surface-2 mt-2.5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${prog.ratio * 100}%`, background: "var(--grad)" }} />
      </div>
      <p className="text-[13px] text-muted mt-2">
        {prog.done} of {prog.total} items
      </p>
    </Link>
  );
}

function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="fixed z-50 left-1/2 -translate-x-1/2 top-3 sm:top-auto sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0 flex flex-col gap-2 w-[min(92vw,360px)]" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="card anim-rise flex items-start gap-3 p-3 pr-2">
          <span className="text-2xl anim-pop" aria-hidden>
            {t.emoji}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold leading-tight">{t.title}</p>
            {t.body && <p className="text-sm text-muted truncate">{t.body}</p>}
          </div>
          <button className="p-1 text-muted hover:text-text" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() || "/";
  const focus = /^\/(certificate|cheatsheet)\//.test(path);

  // Register the offline service worker on the web (not inside the Android app, which bundles everything).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || window.WindchillApp || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  if (focus) return <>{children}<Toasts /></>;

  return (
    <div className="min-h-dvh flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 btn btn-primary">
        Skip to content
      </a>
      <header className="no-print sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-7 h-16 flex items-center gap-4">
          <Link href="/" aria-label="Windchill Mastery home" className="mr-2">
            <span className="hidden sm:block"><Logo /></span>
            <span className="sm:hidden"><Logo compact /></span>
          </Link>
          <HeaderSearch />
          <div className="ml-auto flex items-center gap-2">
            <Link href="/search/" className="md:hidden btn btn-ghost size-11 min-h-0 px-0 border-0 bg-surface-2" aria-label="Search">
              <Search className="size-5" />
            </Link>
            <StatsPill />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="flex-1 w-full mx-auto max-w-[1440px] flex gap-7 px-4 sm:px-7 pt-5 sm:pt-7 pb-28 md:pb-16">
        <nav aria-label="Main" className="no-print hidden md:flex flex-col gap-1 w-[220px] shrink-0 sticky top-[92px] self-start">
          {NAV.map((n) => {
            const active = isActive(path, n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 min-h-11 px-3.5 rounded-xl font-semibold transition-colors ${active ? "bg-primary-soft text-primary" : "text-muted hover:bg-surface-2 hover:text-text"}`}>
                <n.icon className="size-5" aria-hidden /> {n.label}
              </Link>
            );
          })}
          <PathCard />
        </nav>
        <main id="main" className="flex-1 min-w-0">
          {children}
        </main>
      </div>

      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md pb-safe" aria-label="Tabs">
        <div className="grid grid-cols-4">
          {TABS.map((t) => {
            const active = isActive(path, t.href) || (t.href === "/learn/" && /^\/(paths|review|glossary|search)/.test(path));
            return (
              <Link key={t.href} href={t.href} className={`flex flex-col items-center justify-center gap-0.5 h-16 text-[11px] font-semibold ${active ? "text-primary" : "text-muted"}`} aria-current={active ? "page" : undefined}>
                <span className={`grid place-items-center h-7 w-14 rounded-full transition-colors ${active ? "bg-primary-soft" : ""}`}>
                  <t.icon className="size-5" aria-hidden />
                </span>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <Toasts />
    </div>
  );
}
