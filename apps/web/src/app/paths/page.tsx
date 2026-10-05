import type { Metadata } from "next";
import { PathsPage } from "@/components/pages/PathsPage";

export const metadata: Metadata = { title: "Learning paths" };

export default function Page() {
  return <PathsPage />;
}
