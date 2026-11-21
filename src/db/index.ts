import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | undefined;

/** Lazily connect, so builds and tests do not need DATABASE_URL. */
export function getDb() {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  db ??= drizzle(neon(env.DATABASE_URL), { schema });
  return db;
}
