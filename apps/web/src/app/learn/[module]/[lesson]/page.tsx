import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { moduleItems } from "@wm/core";
import { catalog, getModule } from "@/lib/catalog";
import { readLesson } from "@/lib/lessons.server";
import { LessonPlayer } from "@/components/LessonPlayer";
import { ComingSoon } from "@/components/ComingSoon";

export const dynamicParams = false;

export function generateStaticParams() {
  return catalog.modules.flatMap((m) => moduleItems(m).map((l) => ({ module: m.slug, lesson: l.slug })));
}

type Params = { params: Promise<{ module: string; lesson: string }> };

function find(moduleSlug: string, lessonSlug: string) {
  const mod = getModule(moduleSlug);
  return mod ? moduleItems(mod).find((l) => l.slug === lessonSlug) : undefined;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { module, lesson } = await params;
  const l = find(module, lesson);
  return { title: l?.title, description: l?.objectives.join(" ") };
}

export default async function LessonPage({ params }: Params) {
  const { module, lesson } = await params;
  const summary = find(module, lesson);
  if (!summary) notFound();
  const full = summary.available ? readLesson(summary.id) : null;
  return full ? <LessonPlayer lesson={full} /> : <ComingSoon lesson={summary} />;
}
