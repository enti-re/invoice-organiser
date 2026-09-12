<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

- **Keep each component/page file under 250 lines.** If a file is heading past that, it's a sign something self-contained inside it (a diagram, a sub-view, a reusable piece) belongs in its own file under `src/app/components/` — see `ArchitectureDiagram.tsx` being split out of `design/page.tsx` for the pattern.
- **Keep types and pure helpers/utils out of component files.** Types belong in a dedicated types file (or `src/db/schema.ts` if they describe stored data — reuse those instead of redefining them); non-JSX helper functions belong in `src/lib/`. A component file should hold JSX and the state/handlers wired directly to it, not type declarations or standalone logic someone else might also need.
