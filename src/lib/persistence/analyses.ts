import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { analyses, postings, requirements } from "@/db/schema";
import type { Requirement } from "@/lib/schemas";
import { postingHash, postingTitle } from "./posting-meta";

/** Create (or reuse) the posting and open a running analysis. Returns the analysis id. */
export async function startAnalysis(input: {
  workspaceId: string;
  posting: string;
  provider: string;
  modelId: string;
  promptVersion: string;
}): Promise<string> {
  const db = getDb();
  const contentHash = postingHash(input.posting);

  const [found] = await db
    .select({ id: postings.id })
    .from(postings)
    .where(
      and(
        eq(postings.workspaceId, input.workspaceId),
        eq(postings.contentHash, contentHash),
      ),
    )
    .limit(1);

  const postingId =
    found?.id ??
    (
      await db
        .insert(postings)
        .values({
          workspaceId: input.workspaceId,
          rawText: input.posting,
          contentHash,
          title: postingTitle(input.posting),
        })
        .returning({ id: postings.id })
    )[0].id;

  const [analysis] = await db
    .insert(analyses)
    .values({
      postingId,
      provider: input.provider,
      model: input.modelId,
      promptVersion: input.promptVersion,
    })
    .returning({ id: analyses.id });
  return analysis.id;
}

/** Store the cleaned requirements and close the analysis. */
export async function finishAnalysis(
  analysisId: string,
  result: {
    requirements: Requirement[];
    latencyMs: number;
    tokensIn?: number;
    tokensOut?: number;
  },
): Promise<void> {
  const db = getDb();
  if (result.requirements.length > 0) {
    await db.insert(requirements).values(
      result.requirements.map((r, position) => ({
        analysisId,
        position,
        text: r.text,
        kind: r.kind,
        category: r.category,
        skills: r.skills,
        anyOf: r.anyOf,
        minYears: r.minYears,
      })),
    );
  }
  await db
    .update(analyses)
    .set({
      status: "done",
      latencyMs: Math.round(result.latencyMs),
      tokensIn: result.tokensIn ?? 0,
      tokensOut: result.tokensOut ?? 0,
    })
    .where(eq(analyses.id, analysisId));
}

export async function failAnalysis(
  analysisId: string,
  latencyMs: number,
): Promise<void> {
  await getDb()
    .update(analyses)
    .set({ status: "error", latencyMs: Math.round(latencyMs) })
    .where(eq(analyses.id, analysisId));
}

export type StoredAnalysis = NonNullable<
  Awaited<ReturnType<typeof getAnalysis>>
>;

/** One analysis with its posting and requirements, only if it belongs to the workspace. */
export async function getAnalysis(analysisId: string, workspaceId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: analyses.id,
      status: analyses.status,
      provider: analyses.provider,
      model: analyses.model,
      promptVersion: analyses.promptVersion,
      latencyMs: analyses.latencyMs,
      createdAt: analyses.createdAt,
      postingTitle: postings.title,
      postingText: postings.rawText,
    })
    .from(analyses)
    .innerJoin(postings, eq(analyses.postingId, postings.id))
    .where(
      and(eq(analyses.id, analysisId), eq(postings.workspaceId, workspaceId)),
    )
    .limit(1);
  if (!row) return null;

  const items = await db
    .select({
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

  return { ...row, requirements: items };
}
