import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const requirementKind = pgEnum("requirement_kind", ["must", "nice"]);
export const requirementCategory = pgEnum("requirement_category", [
  "technology",
  "experience",
  "domain",
  "education",
  "soft_skill",
  "other",
]);
export const verdict = pgEnum("verdict", ["met", "partial", "missing"]);
export const analysisStatus = pgEnum("analysis_status", [
  "running",
  "done",
  "error",
]);
export const spanType = pgEnum("span_type", ["step", "llm", "tool"]);

/** Anonymous visitor, identified by a random id in an httpOnly cookie. */
export const workspaces = pgTable("workspaces", {
  id: id(),
  createdAt: createdAt(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const cvs = pgTable("cvs", {
  id: id(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, {
    onDelete: "cascade",
  }),
  title: text("title").notNull(),
  rawText: text("raw_text").notNull(),
  /** Numbered lines, fixed at upload: [{ n, text }]. Evidence refers to `n`. */
  lines: jsonb("lines").$type<{ n: number; text: string }[]>().notNull(),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: createdAt(),
});

export const postings = pgTable("postings", {
  id: id(),
  workspaceId: uuid("workspace_id").references(() => workspaces.id, {
    onDelete: "cascade",
  }),
  sourceUrl: text("source_url"),
  title: text("title"),
  company: text("company"),
  rawText: text("raw_text").notNull(),
  contentHash: text("content_hash").notNull(),
  isSample: boolean("is_sample").notNull().default(false),
  createdAt: createdAt(),
});

export const analyses = pgTable("analyses", {
  id: id(),
  postingId: uuid("posting_id")
    .notNull()
    .references(() => postings.id, { onDelete: "cascade" }),
  cvId: uuid("cv_id")
    .notNull()
    .references(() => cvs.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  status: analysisStatus("status").notNull().default("running"),
  tokensIn: integer("tokens_in").notNull().default(0),
  tokensOut: integer("tokens_out").notNull().default(0),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 })
    .notNull()
    .default("0"),
  latencyMs: integer("latency_ms"),
  createdAt: createdAt(),
});

export const requirements = pgTable("requirements", {
  id: id(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  text: text("text").notNull(),
  kind: requirementKind("kind").notNull(),
  category: requirementCategory("category").notNull(),
  /** Canonical slugs ("react"), so the gap dashboard can group across postings. */
  skills: text("skills").array().notNull().default([]),
  /** true when the skills are alternatives: any one is enough. */
  anyOf: boolean("any_of").notNull().default(false),
  minYears: integer("min_years"),
});

export const matches = pgTable("matches", {
  id: id(),
  requirementId: uuid("requirement_id")
    .notNull()
    .references(() => requirements.id, { onDelete: "cascade" }),
  verdict: verdict("verdict").notNull(),
  evidenceLines: integer("evidence_lines").array().notNull().default([]),
  rationale: text("rationale").notNull().default(""),
  /** false = the model cited lines that do not exist; verdict was forced to missing. */
  verified: boolean("verified").notNull(),
});

export const traceSpans = pgTable("trace_spans", {
  id: id(),
  analysisId: uuid("analysis_id")
    .notNull()
    .references(() => analyses.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): AnyPgColumn => traceSpans.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  type: spanType("type").notNull(),
  model: text("model"),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  status: text("status").notNull().default("ok"),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
});
