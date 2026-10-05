import type { Metadata } from "next";
import { ReviewPage } from "@/components/pages/ReviewPage";

export const metadata: Metadata = { title: "Review" };
export default function Page() {
  return <ReviewPage />;
}
