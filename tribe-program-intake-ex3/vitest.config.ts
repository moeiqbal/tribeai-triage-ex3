import { defineConfig } from "vitest/config";

// Unit tests in this MVP are plain TypeScript (the AI response parser) with no
// DOM or React, so the lightweight node environment is all we need.
export default defineConfig({
  test: {
    environment: "node",
    include: ["app/**/*.test.ts"],
  },
});
