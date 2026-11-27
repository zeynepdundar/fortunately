/** Aliases the model might emit, mapped to one canonical slug for the gap dashboard. */
const ALIASES: Record<string, string> = {
  reactjs: "react",
  "react-js": "react",
  ts: "typescript",
  js: "javascript",
  nextjs: "next-js",
  next: "next-js",
  nodejs: "node-js",
  node: "node-js",
  "tanstack-react-query": "tanstack-query",
  "react-query": "tanstack-query",
  postgres: "postgresql",
  "github-action": "github-actions",
  "react-native-js": "react-native",
  "vue-js": "vue",
  vuejs: "vue",
  "express-js": "express",
  "ai-sdk": "vercel-ai-sdk",
};

/** Lowercase, kebab-case and alias-resolve a skill name. */
export function normalizeSkill(
  skill: string | null | undefined,
): string | null {
  if (!skill) return null;
  const slug = skill
    .trim()
    .toLowerCase()
    .replace(/\.js\b/g, "-js")
    .replace(/[^a-z0-9+#]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) return null;
  return ALIASES[slug] ?? slug;
}
