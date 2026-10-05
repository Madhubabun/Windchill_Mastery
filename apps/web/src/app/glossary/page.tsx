import type { Metadata } from "next";
import { GlossaryPage } from "@/components/pages/GlossaryPage";

export const metadata: Metadata = { title: "Glossary" };
export default function Page() {
  return <GlossaryPage />;
}
