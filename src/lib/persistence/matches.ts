import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  analyses,
  cvs,
  matches,
  postings,
  profiles,
  requirements,
} from "@/db/schema";
import type { CvLine } from "@/lib/cv";
import type { CheckedMatch, Requirement } from "@/lib/schemas";

export type MatchContext =
  | { status: "not_found" }
  | { status: "running" }
  | { status: "no_cv" }
  | { status: "no_requirements" }
  | {
      status: "ready";
      requirementIds: string[];
      requirements: Requirement[];
      cv: { id: string; lines: CvLine[] };
    };

/** Everything needed to match one of the workspace's analyses against its profile CV. */
export async function loadMatchContext(
  analysisId: string,
  workspaceId: string,
): Promise<MatchContext> {
  const db = getDb();
  const [analysis] = await db
    .select({ status: analyses.status })
    .from(analyses)
    .innerJoin(postings, eq(analyses.postingId, postings.id))
    .where(
      and(eq(analyses.id, analysisId), eq(postings.workspaceId, workspaceId)),
    )
    .limit(1);
  if (!analysis) return { status: "not_found" };
  if (analysis.status === "running") return { status: "running" };

  const rows = await db
    .select({
      id: requirements.id,
      text: requirements.text,
      kind: requirements.kind,
      category: requirements.category,
      skills: requirements.skills,
      anyOf: requirements.anyOf,
      minYears: requirements.minYears,
    })
    .from(requirements)
    .where(eq(requirements.analysisId, analysisId))
    .orderBy(asc(requirements.position));
  if (rows.length === 0) return { status: "no_requirements" };

  const [cv] = await db
    .select({ id: cvs.id, lines: cvs.lines })
    .from(profiles)
    .innerJoin(cvs, eq(profiles.activeCvId, cvs.id))
    .where(eq(profiles.workspaceId, workspaceId))
    .limit(1);
  if (!cv) return { status: "no_cv" };

  return {
    status: "ready",
    requirementIds: rows.map((r) => r.id),
    requirements: rows.map((r) => ({
      text: r.text,
      kind: r.kind,
      category: r.category,
      skills: r.skills,
      anyOf: r.anyOf,
      minYears: r.minYears,
    })),
    cv: { id: cv.id, lines: cv.lines },
  };
}

/** Wait briefly for the extraction to finish saving (it completes as its stream ends). */
export async function waitForMatchContext(
  analysisId: string,
  workspaceId: string,
  { attempts = 10, delayMs = 300 } = {},
): Promise<MatchContext> {
  let context = await loadMatchContext(analysisId, workspaceId);
  for (let i = 1; i < attempts && context.status === "running"; i++) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    context = await loadMatchContext(analysisId, workspaceId);
  }
  return context;
}

/** Replace the analysis' matches with the checked ones and record which CV was used. */
export async function saveMatches(
  analysisId: string,
  cvId: string,
  requirementIds: string[],
  checked: CheckedMatch[],
): Promise<void> {
  const db = getDb();
  await db
    .delete(matches)
    .where(inArray(matches.requirementId, requirementIds));
  const rows = checked
    .filter((m) => requirementIds[m.requirementIndex])
    .map((m) => ({
      requirementId: requirementIds[m.requirementIndex],
      verdict: m.verdict,
      evidenceLines: m.evidence.map((e) => e.n),
      rationale: m.rationale,
      verified: m.verified,
    }));
  if (rows.length > 0) await db.insert(matches).values(rows);
  await db.update(analyses).set({ cvId }).where(eq(analyses.id, analysisId));
}
