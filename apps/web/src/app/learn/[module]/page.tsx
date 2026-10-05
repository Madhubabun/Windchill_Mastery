import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalog, getModule } from "@/lib/catalog";
import { ModulePage } from "@/components/pages/ModulePage";

export const dynamicParams = false;

export function generateStaticParams() {
  return catalog.modules.map((m) => ({ module: m.slug }));
}

type Params = { params: Promise<{ module: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const m = getModule((await params).module);
  return { title: m?.title, description: m?.summary };
}

export default async function Page({ params }: Params) {
  const m = getModule((await params).module);
  if (!m) notFound();
  return <ModulePage moduleId={m.id} />;
}
