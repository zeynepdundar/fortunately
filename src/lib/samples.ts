import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type SamplePosting = { id: string; title: string; body: string };

const POSTINGS_DIR = path.join(process.cwd(), "samples", "postings");

/** Synthetic postings shipped in the repo, used for "Try a sample". */
export async function loadSamplePostings(): Promise<SamplePosting[]> {
  "use cache";
  const files = (await readdir(POSTINGS_DIR))
    .filter((f) => f.endsWith(".md"))
    .sort();
  return Promise.all(
    files.map(async (file) => {
      const body = (
        await readFile(path.join(POSTINGS_DIR, file), "utf8")
      ).trim();
      const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? file;
      return { id: file.replace(/\.md$/, ""), title, body };
    }),
  );
}
