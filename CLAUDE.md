@AGENTS.md

# Project conventions

- **Confidence means internally consistent, not verified against ground truth.** There's no independent source of what an invoice actually says, only what the model read off it — never word UI copy or docs as if flags are ground-truth-verified.
- **One accent color, one meaning.** Red is reserved strictly for "needs attention" (flags, warnings, delete). Never use it decoratively.
- **Every clickable element needs explicit `cursor-pointer`.** `<button>` doesn't get it from the browser by default, and Tailwind's Preflight doesn't add it back.
- **`<body>` is `flex flex-col`** (`layout.tsx`). Every page's top-level content `<div>` needs `w-full min-w-0`, or deeply-nested wide content (e.g. a diagram with `min-w-[...]`) blows out the whole page's width on mobile instead of scrolling within its own `overflow-x-auto` container. Found and fixed once already — see `decisions.md`.
- **Skeletons are measured from the real rendered DOM, not guessed.** Any skeleton sitting next to a real table needs the table to use `table-fixed` + matching explicit `%` column widths, or the two drift apart at different viewport widths.
- **Record every real decision in `decisions.md`** as you go — what was chosen, what was considered, why, including reversals. It's a living project log, not just a document for the final submission.
