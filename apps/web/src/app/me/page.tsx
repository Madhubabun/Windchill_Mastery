import type { Metadata } from "next";
import { MePage } from "@/components/pages/MePage";

export const metadata: Metadata = { title: "My learning" };
export default function Page() {
  return <MePage />;
}
