import type { Metadata } from "next";
import { catalog } from "@/lib/catalog";
import { CertificatePage } from "@/components/pages/CertificatePage";

export const dynamicParams = false;
export function generateStaticParams() {
  return [...catalog.modules.map((m) => ({ id: m.slug })), ...catalog.paths.map((p) => ({ id: p.id }))];
}
export const metadata: Metadata = { title: "Certificate" };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <CertificatePage id={(await params).id} />;
}
