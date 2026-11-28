import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { SampleResult } from "./sample-result-schema";

export { SAMPLE_PROFILE, type SampleResult } from "./sample-result-schema";

const RESULTS_DIR = path.join(process.cwd(), "samples", "results");

/**
 * Precomputed analyses of the sample postings against the sample CV, committed to the
 * repo: "Try a sample" needs no key, no model call and no database.
 */
export async function loadSampleResults(): Promise<SampleResult[]> {
  "use cache";
  let files: string[];
  try {
    files = (await readdir(RESULTS_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const results = await Promise.all(
    files.sort().map(async (file) => {
      const parsed = SampleResult.safeParse(
        JSON.parse(await readFile(path.join(RESULTS_DIR, file), "utf8")),
      );
      if (!parsed.success) {
        console.error(`[samples] ${file} does not match the schema`);
        return null;
      }
      return parsed.data;
    }),
  );
  return results.filter((r): r is SampleResult => r !== null);
}

export async function loadSampleResult(
  id: string,
): Promise<SampleResult | null> {
  return (await loadSampleResults()).find((r) => r.id === id) ?? null;
}
