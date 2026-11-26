import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { cvs, profiles } from "@/db/schema";
import { toNumberedLines } from "@/lib/cv";
import type { ProfileInput } from "@/lib/profile/schema";

export type StoredProfile = {
  yearsOfExperience: number | null;
  targetCountries: string[];
  relocationNeeded: boolean;
  cv: { id: string; rawText: string; lineCount: number } | null;
};

export async function getProfile(
  workspaceId: string,
): Promise<StoredProfile | null> {
  const db = getDb();
  const [row] = await db
    .select({
      yearsOfExperience: profiles.yearsOfExperience,
      targetCountries: profiles.targetCountries,
      relocationNeeded: profiles.relocationNeeded,
      cvId: cvs.id,
      cvText: cvs.rawText,
      cvLines: cvs.lines,
    })
    .from(profiles)
    .leftJoin(cvs, eq(profiles.activeCvId, cvs.id))
    .where(eq(profiles.workspaceId, workspaceId))
    .limit(1);
  if (!row) return null;
  return {
    yearsOfExperience: row.yearsOfExperience,
    targetCountries: row.targetCountries,
    relocationNeeded: row.relocationNeeded,
    cv:
      row.cvId && row.cvText !== null
        ? {
            id: row.cvId,
            rawText: row.cvText,
            lineCount: row.cvLines?.length ?? 0,
          }
        : null,
  };
}

/**
 * Save the profile. A changed CV is stored as a new row, so analyses that
 * already cite line numbers of the old CV keep pointing at the right text.
 */
export async function saveProfile(
  workspaceId: string,
  input: ProfileInput,
): Promise<void> {
  const db = getDb();
  const current = await getProfile(workspaceId);

  let activeCvId = current?.cv?.id ?? null;
  if (!input.cvText) {
    activeCvId = null;
  } else if (input.cvText !== current?.cv?.rawText) {
    const [cv] = await db
      .insert(cvs)
      .values({
        workspaceId,
        title: "My CV",
        rawText: input.cvText,
        lines: toNumberedLines(input.cvText),
      })
      .returning({ id: cvs.id });
    activeCvId = cv.id;
  }

  const values = {
    yearsOfExperience: input.yearsOfExperience,
    targetCountries: input.targetCountries,
    relocationNeeded: input.relocationNeeded,
    activeCvId,
  };
  await db
    .insert(profiles)
    .values({ workspaceId, ...values })
    .onConflictDoUpdate({
      target: profiles.workspaceId,
      set: { ...values, updatedAt: sql`now()` },
    });
}
