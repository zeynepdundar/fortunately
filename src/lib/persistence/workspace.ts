import "server-only";
import { cookies } from "next/headers";
import { sql } from "drizzle-orm";
import { getDb, isDbEnabled } from "@/db";
import { workspaces } from "@/db/schema";

export const WORKSPACE_COOKIE = "fortunately_ws";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIX_MONTHS = 60 * 60 * 24 * 180;

/** The visitor's workspace id from the cookie, or null when there is none or no database. */
export async function readWorkspaceId(): Promise<string | null> {
  if (!isDbEnabled()) return null;
  const id = (await cookies()).get(WORKSPACE_COOKIE)?.value;
  return id && UUID.test(id) ? id : null;
}

/**
 * Return the visitor's workspace, creating it (and the cookie) on first use.
 * Returns null when no database is configured. Only call from a Route Handler or Server Action.
 */
export async function getOrCreateWorkspaceId(): Promise<string | null> {
  if (!isDbEnabled()) return null;
  const db = getDb();
  const existing = await readWorkspaceId();
  const id = existing ?? crypto.randomUUID();

  await db
    .insert(workspaces)
    .values({ id })
    .onConflictDoUpdate({
      target: workspaces.id,
      set: { lastSeenAt: sql`now()` },
    });

  if (!existing) {
    (await cookies()).set(WORKSPACE_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SIX_MONTHS,
    });
  }
  return id;
}
