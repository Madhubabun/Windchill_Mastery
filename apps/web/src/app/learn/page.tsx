import type { Metadata } from "next";
import { catalog } from "@/lib/catalog";
import { ModuleCard } from "@/components/ModuleCard";

export const metadata: Metadata = { title: "All modules" };

export default function LearnPage() {
  const ready = catalog.modules.reduce((a, m) => a + m.availableCount, 0);
  const total = catalog.modules.reduce((a, m) => a + m.totalCount, 0);
  return (
    <div>
      <p className="eyebrow">Curriculum</p>
      <h1 className="text-3xl sm:text-[40px] font-extrabold mt-1">From PLM rookie to Windchill expert</h1>
      <p className="text-muted mt-2 max-w-2xl">
        {catalog.modules.length} modules, {total} lessons, checkpoints and capstones. {ready} are ready now and new ones land with each content update.
      </p>
      <div className="grid gap-5 mt-8 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
        {catalog.modules.map((m) => (
          <ModuleCard key={m.id} m={m} />
        ))}
      </div>
    </div>
  );
}
