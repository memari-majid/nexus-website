import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * Unit tests for the pure library logic (pricing tiers, registration state,
 * workshop recommendation, suggestion resolution). Node environment only — no
 * DOM — so these run fast and stay independent of Next/React. The `@/` alias
 * mirrors tsconfig so tests import the same way app code does.
 */
export default defineConfig({
  resolve: {
    alias: { "@": root },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
