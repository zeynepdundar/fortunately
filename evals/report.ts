import type { Summary } from "./score";

/** What one run writes to evals/results/<slug>.json. */
export type RunResult = {
  provider: string;
  model: string;
  promptVersion: string;
  thinking: boolean;
  date: string;
  failures: number;
  medianLatencyMs: number | null;
  summary: Summary;
  cases: {
    id: string;
    latencyMs: number | null;
    failed: boolean;
    paired?: number;
    gold?: number;
    predicted?: number;
    missed?: string[];
    extra?: string[];
  }[];
};

export const START = "<!-- eval:start -->";
export const END = "<!-- eval:end -->";

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Markdown table of every run, best F1 first. */
export function renderTable(results: RunResult[]): string {
  const rows = [...results]
    .sort(
      (a, b) => b.summary.f1 - a.summary.f1 || a.model.localeCompare(b.model),
    )
    .map((r) => {
      const s = r.summary;
      const latency =
        r.medianLatencyMs === null
          ? "–"
          : `${(r.medianLatencyMs / 1000).toFixed(1)} s`;
      return `| ${r.provider}:${r.model}${r.thinking ? " (thinking)" : ""} | ${r.promptVersion} | ${s.cases - r.failures}/${s.cases} | ${pct(s.f1)} | ${pct(s.precision)} | ${pct(s.recall)} | ${pct(s.skillRecall)} | ${pct(s.kindAccuracy)} | ${pct(s.minYearsAccuracy)} | ${pct(s.factsAccuracy.country)} | ${pct(s.factsAccuracy.relocation)} | ${latency} | ${r.date.slice(0, 10)} |`;
    });
  return [
    "| Model | Prompt | Cases | Requirement F1 | Precision | Recall | Skill recall | Must/nice | Years | Country | Relocation | Median latency | Date |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

/** Replace the text between the eval markers; throws when they are missing. */
export function replaceBetweenMarkers(doc: string, content: string): string {
  const start = doc.indexOf(START);
  const end = doc.indexOf(END);
  if (start === -1 || end === -1 || end < start)
    throw new Error(`Markers ${START} / ${END} not found`);
  return `${doc.slice(0, start + START.length)}\n${content}\n${doc.slice(end)}`;
}
