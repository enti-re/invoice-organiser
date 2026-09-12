---
name: systematic-refactoring
description: Apply a consistent set of code-organization rules when refactoring an existing codebase for readability — file-size limits, extracting types/helpers/hooks, deduplicating repeated strings and logic, splitting long functions into named steps, and reordering files so entry points read last. Use when the user says "refactor this," "clean this up," "organize this file/folder," "extract this," "this file is too big," or "reduce duplication."
---

# Systematic refactoring

A methodology for turning a working-but-messy file into several small, named, obviously-scoped pieces — developed over a real refactoring pass across a Next.js app's API routes, hooks, and components. Every rule below was applied for a concrete reason, not for its own sake: the underlying goal is "a new reader can tell what a file does from the first screen," not smaller files as a goal in itself.

## Core principles

1. **A file-size limit (e.g. ~250 lines per component/page/route) is a smell detector, not the goal.** Crossing it is the trigger to look for something self-contained inside the file, not a rule to satisfy by moving code arbitrarily. If nothing self-contained fits, the file's job itself is too broad — that's the real problem.
2. **Extract on the second real usage, not the first.** Don't pull something into a shared file "just in case." Duplication becomes real cost when a second call site needs the identical thing — that's the moment to centralize it, and also the moment you can see both call sites well enough to name it correctly.
3. **Split a long function into its actual sequential steps, not into pieces of similar length.** A 100-line handler doing "validate → upload → extract → save" becomes four named functions matching those four verbs, not four ~25-line chunks. Name each step after what it does, never "part1/part2" or "helper1/helper2."
4. **Give multi-step functions a uniform success/failure shape** so the orchestrator reads as `if (!result.ok) return result.response; ...`:
   ```ts
   type StepFailure = { ok: false; response: NextResponse };
   function fail(message: string, status: number): StepFailure {
     return { ok: false, response: NextResponse.json({ error: message }, { status }) };
   }
   type StepResult = { ok: true; value: T } | StepFailure;
   ```
   Reuse this exact shape everywhere the same problem recurs in the codebase — don't redefine an equivalent type per file once one already exists.
5. **Types and pure, non-JSX helpers never live inside a component file.** Types go in a dedicated `X.types.ts` (or a shared schema/model file if they describe stored or API data — reuse those types instead of redefining them, which is the single most common accidental duplication in a growing codebase). Helpers go in a `lib/`-style directory, one level away from any JSX.
6. **When a component holds too much state, effects, or handlers, extract a custom hook** that owns all of it and returns one object. Export `type XController = ReturnType<typeof useX>` and pass that whole object as one prop into child components, instead of drilling ten individual props through them.
7. **Never leave an inline closure that renders JSX "for now."** If a `.map()` body or a `renderX()` closure has real structure, promote it to its own named component with clean props — independently readable, independently testable.
8. **Deduplicate repeated string literals — especially user-facing error messages — into grouped named constants**, grouped by the concern they belong to, not one flat list (`UPLOAD_ERRORS`, `COMMON_ERRORS`, not `MESSAGES.msg17`).
9. **Order a file so a reader sees the real entry points last, helpers first.** For a route/handler file: types at the top, helper functions grouped by which exported handler they serve, then a final "entry points" section holding the exported functions themselves as thin wrappers (parse input → call the real logic → catch-all error handling).
10. **Once a directory crosses roughly 15-20 files, split it into feature subfolders** — grouped by what actually imports what (check the real import graph first), not by guessing from filenames. Leave genuinely cross-cutting, single-file utilities at the directory root rather than forcing them into one subfolder or the other.
11. **Comments explain WHY, never WHAT.** Delete a comment that only restates what the following line obviously does. Keep a comment solely for a hidden constraint, a subtle invariant, or a workaround for behavior that would otherwise surprise a reader.
12. **Record every non-trivial refactor decision as you make it**, in whatever running decision log the project already keeps (e.g. `decisions.md`) — the decision, what else was considered, and why. This is what lets a large refactor be reviewed later without re-deriving the reasoning from the diff alone.

## What NOT to do

- Don't extract something into a shared file on its first use "for reusability" — wait for the second real call site.
- Don't split a file into N pieces of roughly equal size; split along its actual logical steps, however uneven those turn out to be.
- Don't invent a new success/failure convention per file once an equivalent one already exists in the codebase — reuse it.
- Don't move type declarations or helpers out of a file without checking every call site's import path afterward — a mechanical move that leaves one stale import is worse than not moving it.
- Don't reorder or restructure a file without immediately running the project's typecheck/lint/test suite — a refactor with zero intended behavior change should have zero excuse for a broken build.
- Don't touch a comment that already explains a real, non-obvious WHY — the trim-comments rule targets restated WHAT, not legitimate context.

## A known gotcha to check for after extracting a custom hook

If a hook returns an object bundling a `ref` alongside plain state (e.g. `{ fileInputRef, uploading, error }`), and a component uses that ref directly as `ref={hookResult.fileInputRef}`, some `react-hooks/refs`-style lint rules treat the *entire* bundled identifier as "tainted" for the rest of that render and flag unrelated property accesses on it too (e.g. `hookResult.error`) as invalid ref access. Fix: destructure the ref to a local variable before using it as a `ref=` prop (`const { fileInputRef } = hookResult;` then `ref={fileInputRef}`).
