import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { catalog } from "@/lib/catalog";
import { PathPage } from "@/components/pages/PathsPage";

export const dynamicParams = false;
export function generateStaticParams() {
  return catalog.paths.map((p) => ({ path: p.id }));
}
type Params = { params: Promise<{ path: string }> };
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const id = (await params).path;
  const p = catalog.paths.find((x) => x.id === id);
  return { title: p ? `${p.title} path` : "Path", description: p?.summary };
}
export default async function Page({ params }: Params) {
  const id = (await params).path;
  if (!catalog.paths.some((p) => p.id === id)) notFound();
  return <PathPage pathId={id} />;
}
