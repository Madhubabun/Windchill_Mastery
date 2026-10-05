import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalog, getModule } from "@/lib/catalog";
import { CheatsheetPage } from "@/components/pages/CheatsheetPage";

export const dynamicParams = false;
export function generateStaticParams() {
  return catalog.modules.filter((m) => m.cheatsheet).map((m) => ({ module: m.slug }));
}
type Params = { params: Promise<{ module: string }> };
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  return { title: `${getModule((await params).module)?.title} cheat sheet` };
}
export default async function Page({ params }: Params) {
  const m = getModule((await params).module);
  if (!m?.cheatsheet) notFound();
  return <CheatsheetPage moduleId={m.id} />;
}
