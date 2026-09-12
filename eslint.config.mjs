import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // .next/**, out/**, build/**, next-env.d.ts are already ignored by
  // eslint-config-next's own default ignores (verified in its installed
  // source) -- restating them here was redundant.
  globalIgnores([
    // Isolated agent worktrees (and their own generated .next/**) live under here.
    ".claude/**",
  ]),
]);

export default eslintConfig;
