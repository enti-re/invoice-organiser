import { defineConfig, configDefaults } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    // e2e/ holds Playwright specs, run separately via `pnpm test:e2e`.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
