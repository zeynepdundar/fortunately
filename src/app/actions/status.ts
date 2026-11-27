"use server";

import { z } from "zod";
import { isDbEnabled } from "@/db";
import { ApplicationStatus } from "@/lib/application-status";
import { setPostingStatus } from "@/lib/persistence/postings";
import { readWorkspaceId } from "@/lib/persistence/workspace";

const Input = z.object({ postingId: z.uuid(), status: ApplicationStatus });

export type SetStatusResult = { ok: boolean; message?: string };

/** Change where the visitor stands with one of their postings. */
export async function setStatusAction(
  input: unknown,
): Promise<SetStatusResult> {
  if (!isDbEnabled())
    return { ok: false, message: "Saving needs a database (DATABASE_URL)." };
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Unknown status." };
  try {
    const workspaceId = await readWorkspaceId();
    if (!workspaceId) return { ok: false, message: "Posting not found." };
    const found = await setPostingStatus(
      workspaceId,
      parsed.data.postingId,
      parsed.data.status,
    );
    return found ? { ok: true } : { ok: false, message: "Posting not found." };
  } catch (error) {
    console.error(
      "[status] could not save:",
      error instanceof Error ? error.message : error,
    );
    return { ok: false, message: "Could not save. Try again." };
  }
}
