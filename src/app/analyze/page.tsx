import type { Metadata } from "next";
import { loadSamplePostings } from "@/lib/samples";
import { AnalyzeClient } from "./analyze-client";

export const metadata: Metadata = { title: "Analyze a posting — Fortunately" };

export default async function AnalyzePage() {
  const samples = await loadSamplePostings();
  return <AnalyzeClient samples={samples} />;
}
