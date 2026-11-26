"use server";

import { isDbEnabled } from "@/db";
import { CriteriaConfig } from "@/lib/criteria/config";
import { saveCriteria } from "@/lib/persistence/profile";
import { getOrCreateWorkspaceId } from "@/lib/persistence/workspace";

export type SaveCriteriaResult = { ok: boolean; message: string };

export async function saveCriteriaAction(
  input: unknown,
): Promise<SaveCriteriaResult> {
  if (!isDbEnabled())
    return { ok: false, message: "Saving needs a database (DATABASE_URL)." };
  const parsed = CriteriaConfig.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "Some values are out of range." };
  try {
    const workspaceId = await getOrCreateWorkspaceId();
    if (!workspaceId) return { ok: false, message: "No workspace available." };
    await saveCriteria(workspaceId, parsed.data);
    return {
      ok: true,
      message: "Preferences saved. Postings now use them.",
    };
  } catch (error) {
    console.error(
      "[preferences] could not save:",
      error instanceof Error ? error.message : error,
    );
    return { ok: false, message: "Could not save. Try again." };
  }
}
