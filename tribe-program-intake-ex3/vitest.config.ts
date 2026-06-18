import { defineConfig } from "vitest/config";

// Unit tests in this MVP are plain TypeScript (the AI response parser, schemas,
// triage, and route handlers) with no DOM or React, so the lightweight node
// environment is all we need. The `@/` alias mirrors tsconfig's paths so tests
// can import modules the same way app code does.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
    alias: { "@/": new URL("./", import.meta.url).pathname },
  },
});
