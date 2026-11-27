import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { Extraction } from "@/lib/schemas";

/** Resolved from the repo root: pnpm runs scripts and tests there. */
export const CASES_DIR = path.join(process.cwd(), "evals", "cases");

/** One labelled, synthetic posting. */
export const EvalCase = z.object({
  id: z.string().regex(/^[0-9]{2}-[a-z0-9-]+$/),
  role: z.enum(["frontend", "full-stack", "mobile", "ai", "backend"]),
  level: z.enum(["junior", "mid", "senior", "staff"]),
  posting: z.string().min(80),
  gold: Extraction,
});
export type EvalCase = z.infer<typeof EvalCase>;

/** Every case file, sorted by id; throws with the file name when one is invalid. */
export function loadCases(dir = CASES_DIR): EvalCase[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => {
      const parsed = EvalCase.safeParse(
        JSON.parse(readFileSync(path.join(dir, f), "utf8")),
      );
      if (!parsed.success)
        throw new Error(`${f}: ${z.prettifyError(parsed.error)}`);
      if (`${parsed.data.id}.json` !== f)
        throw new Error(`${f}: id must match the file name`);
      return parsed.data;
    });
}
