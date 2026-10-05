import type { Catalog, LessonSummary, Module } from "@wm/core";
import { allLessons } from "@wm/core";
import catalogJson from "@/generated/catalog.json";

export const catalog = catalogJson as unknown as Catalog;

const lessonsById = new Map(allLessons(catalog).map((l) => [l.id, l]));

export const getLesson = (id: string): LessonSummary | undefined => lessonsById.get(id);
export const getModule = (slugOrId: string): Module | undefined =>
  catalog.modules.find((m) => m.slug === slugOrId || m.id === slugOrId);

/** Previous / next items within the whole course (lessons, checkpoints, capstones). */
export function neighbours(id: string) {
  const list = allLessons(catalog);
  const i = list.findIndex((l) => l.id === id);
  return { prev: i > 0 ? list[i - 1] : undefined, next: i >= 0 && i < list.length - 1 ? list[i + 1] : undefined };
}
