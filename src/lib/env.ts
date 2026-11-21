import "server-only";
import { z } from "zod";

const ServerEnv = z.object({
  DATABASE_URL: z.string().url().optional(),
  FIRECRAWL_API_KEY: z.string().optional(),
  DEMO_PROVIDER: z.enum(["anthropic", "openai"]).default("anthropic"),
  DEMO_MODEL: z.string().optional(),
  DEMO_ANTHROPIC_API_KEY: z.string().optional(),
  DEMO_OPENAI_API_KEY: z.string().optional(),
  DEMO_RUNS_PER_IP_PER_DAY: z.coerce.number().int().nonnegative().default(3),
  DEMO_DAILY_BUDGET_USD: z.coerce.number().nonnegative().default(1),
});

const emptyToUndefined = Object.fromEntries(
  Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v]),
);

export const env = ServerEnv.parse(emptyToUndefined);
