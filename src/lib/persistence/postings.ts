import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { analyses, matches, postings, requirements } from "@/db/schema";
import type { ApplicationStatus } from "@/lib/application-status";
import type { ListedAnalysis } from "@/lib/criteria/postings-list";

/** The latest finished analysis of every posting in the workspace, with requirements and verdicts. */
export async function listLatestAnalyses(
  workspaceId: string,
): Promise<ListedAnalysis[]> {
  const db = getDb();
  const rows = await db
    .select({
      analysisId: analyses.id,
      postingId: analyses.postingId,
      jobTitle: analyses.jobTitle,
      postingTitle: postings.title,
      status: postings.status,
      statusChangedAt: postings.statusChangedAt,
      company: analyses.company,
      city: analyses.city,
      country: analyses.country,
      workMode: analyses.workMode,
      relocation: analyses.relocation,
      createdAt: analyses.createdAt,
    })
    .from(analyses)
    .innerJoin(postings, eq(analyses.postingId, postings.id))
    .where(
      and(eq(postings.workspaceId, workspaceId), eq(analyses.status, "done")),
    )
    .orderBy(desc(analyses.createdAt));

  const seen = new Set<string>();
  const latest = rows.filter((r) =>
    seen.has(r.postingId) ? false : (seen.add(r.postingId), true),
  );
  if (latest.length === 0) return [];

  const ids = latest.map((r) => r.analysisId);
  const reqRows = await db
    .select({
      id: requirements.id,
      analysisId: requirements.analysisId,
      position: requirements.position,
      kind: requirements.kind,
      category: requirements.category,
      skills: requirements.skills,
      minYears: requirements.minYears,
    })
    .from(requirements)
    .where(inArray(requirements.analysisId, ids));
  const matchRows = reqRows.length
    ? await db
        .select({
          requirementId: matches.requirementId,
          verdict: matches.verdict,
        })
        .from(matches)
        .where(
          inArray(
            matches.requirementId,
            reqRows.map((r) => r.id),
          ),
        )
    : [];
  const verdictByRequirement = new Map(
    matchRows.map((m) => [m.requirementId, m.verdict]),
  );

  return latest.map((r) => {
    const reqs = reqRows
      .filter((q) => q.analysisId === r.analysisId)
      .sort((a, b) => a.position - b.position);
    return {
      analysisId: r.analysisId,
      postingId: r.postingId,
      status: r.status,
      statusChangedAt: r.statusChangedAt,
      title: r.jobTitle ?? r.postingTitle ?? "Untitled posting",
      company: r.company,
      city: r.city,
      country: r.country,
      workMode: r.workMode,
      relocation: r.relocation ?? "not_stated",
      createdAt: r.createdAt,
      requirements: reqs.map((q) => ({
        kind: q.kind,
        category: q.category,
        skills: q.skills,
        minYears: q.minYears,
      })),
      matches: reqs.map((q) => {
        const verdict = verdictByRequirement.get(q.id);
        return verdict ? { verdict } : undefined;
      }),
    };
  });
}

/** Set the application status of a posting in the workspace. False when the posting is not there. */
export async function setPostingStatus(
  workspaceId: string,
  postingId: string,
  status: ApplicationStatus,
): Promise<boolean> {
  const updated = await getDb()
    .update(postings)
    .set({ status, statusChangedAt: new Date() })
    .where(
      and(eq(postings.id, postingId), eq(postings.workspaceId, workspaceId)),
    )
    .returning({ id: postings.id });
  return updated.length > 0;
}
