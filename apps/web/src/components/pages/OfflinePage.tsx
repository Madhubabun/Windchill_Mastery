"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CloudOff, Download, HardDrive, Wifi } from "lucide-react";
import { catalog } from "@/lib/catalog";
import { isNativeApp } from "@/lib/native";
import { ModuleIcon } from "../Icon";

export function OfflinePage() {
  const [native, setNative] = useState(false);
  const [online, setOnline] = useState(true);
  const [sw, setSw] = useState<"none" | "installing" | "ready">("none");
  const [usage, setUsage] = useState<string | null>(null);

  useEffect(() => {
    setNative(isNativeApp());
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    navigator.serviceWorker?.getRegistration().then((r) => setSw(r?.active ? "ready" : r ? "installing" : "none"));
    navigator.storage?.estimate?.().then((e) => e.usage && setUsage(`${(e.usage / 1024 / 1024).toFixed(1)} MB`));
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const ready = native || sw === "ready";
  const lessons = catalog.modules.reduce((a, m) => a + m.availableCount, 0);

  return (
    <div className="max-w-3xl">
      <p className="eyebrow">Offline learning</p>
      <h1 className="text-3xl sm:text-[40px] font-extrabold mt-1">Learn anywhere, even with no signal</h1>
      <div className="card p-5 mt-6 flex items-center gap-4">
        <span className={`grid size-14 place-items-center rounded-2xl ${ready ? "bg-mint-soft text-mint" : "bg-amber-soft text-amber"}`}>{ready ? <CheckCircle2 className="size-7" /> : <Download className="size-7" />}</span>
        <div className="flex-1">
          <p className="font-bold text-lg">{ready ? `All ${lessons} lessons are saved on this device` : "Getting offline copies ready…"}</p>
          <p className="text-sm text-muted">
            {native
              ? "The app ships with every lesson, animation, quiz and cheat sheet built in. Nothing to download."
              : sw === "ready"
                ? "This browser keeps a copy of the whole course. It refreshes automatically when content is updated."
                : "Keep this page open for a moment while your browser saves the course. Then it works offline."}
          </p>
        </div>
      </div>
      <div className="grid gap-4 mt-4 sm:grid-cols-2">
        <div className="card p-4 flex items-center gap-3">
          {online ? <Wifi className="size-5 text-mint" /> : <CloudOff className="size-5 text-amber" />}
          <span className="font-semibold">{online ? "You're online" : "You're offline, and that's fine"}</span>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <HardDrive className="size-5 text-sky" />
          <span className="font-semibold">{usage ? `${usage} used on this device` : "Progress is stored on this device"}</span>
        </div>
      </div>
      <h2 className="text-xl font-bold mt-8">Modules</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {catalog.modules.map((m) => (
          <li key={m.id} className="card p-4 flex items-center gap-3">
            <span className={`theme-${m.theme} mod-grad grid size-10 place-items-center rounded-xl text-white`}>
              <ModuleIcon name={m.icon} className="size-5" />
            </span>
            <span className="flex-1 font-semibold">{m.title}</span>
            <span className={`chip ${m.availableCount ? (ready ? "bg-mint-soft text-mint" : "") : ""}`}>{m.availableCount ? (ready ? "✓ Offline" : `${m.availableCount} lessons`) : "Coming soon"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
