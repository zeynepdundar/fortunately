import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sample postings are read from disk by /analyze.
  outputFileTracingIncludes: { "/analyze": ["./samples/postings/**/*"] },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
