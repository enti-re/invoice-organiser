---
name: nikhilchandna-design
description: Apply the monochrome dark design language from nikhilchandna.com (Nikhil's personal portfolio) to a web app's UI — pure black/white, no decorative color, flat layout, minimal text-first structure. Use when the user asks for "my portfolio theme," "the black and white theme," or "dark mode like my site."
---

# nikhilchandna.com design language

Reference: https://www.nikhilchandna.com/ (captured 2026-09-12). A personal engineering portfolio — extremely minimal, monochrome, text-first, almost no UI chrome (no cards, no colored buttons, no shadows).

## Core principles

1. **Fully monochrome.** Black, white, and grays only. No decorative accent color anywhere — links are just underlined text, not colored. If a color is needed, it must be functional (see below), never decorative.
2. **Dark as default.** The portfolio has a light/dark toggle; when adapting this theme for another project, treat dark as the primary/only mode unless a toggle is explicitly requested — building a full light/dark switcher is extra scope, don't add it unasked.
3. **Flat, not carded.** No bordered boxes wrapping every section, no rounded corners, no drop shadows. Structure comes from whitespace and thin hairline dividers (`border-b`), not containers.
4. **Text-first, generous whitespace, comfortable reading width.** Minimal nav (small, understated — gray for inactive, full-opacity for active). Body copy at a relaxed line-height.
5. **Sharp corners.** No `rounded-*` utilities on structural elements (buttons, inputs, containers) — this is a harder-edged aesthetic than typical SaaS product design.
6. **Functional exceptions to "no color," each tied to one specific meaning, never reused for anything else:** a flagged/needs-attention signal gets one accent color; a destructive action (e.g. delete) gets its own fixed red, independent of whatever the flagging accent is — don't let a delete button's hover color drift along when the flagging accent changes, they mean different things; a "view/open" affordance can get its own distinct hover color too. Each color = one meaning, consistently, everywhere it appears.

## Concrete Tailwind tokens (dark, the default mode)

```
Background:       #0a0a0a  (near-black, not pure #000 — set via CSS var, not a Tailwind bg-black utility, so it's a single source of truth)
Foreground/text:   #ededed  (near-white — set via the same CSS var pattern)
color-scheme:      dark     (in :root, so native form controls like date pickers render correctly)
Primary text:      text-neutral-100
Secondary text:    text-neutral-400
Tertiary/muted:    text-neutral-500
Borders:           border-neutral-800 (subtle dividers), border-neutral-700 (input borders)
Hover/focus border: border-white (or border-neutral-600 for a softer hover state)
Primary button:    bg-white text-black px-4 py-2 font-medium — NO rounded-full, sharp corners. This is the one inverted-monochrome surface (light button on dark page), not a colored CTA.
Secondary button:  border border-neutral-300/700 text-neutral-100, sharp corners
Links:             underline, no color — text-black/text-neutral-100 depending on theme, hover:text-neutral-400/600
Hairline dividers:  border-b border-neutral-800 instead of wrapping sections in bordered cards
Functional accent — flagging/needs-review signal (pick ONE hue, orange used in practice):
  Badge/pill:      bg-orange-500/10 text-orange-400 border border-orange-500/40 (translucent wash, not solid fill)
  Icon/warning:    text-orange-400, or a small solid bg-orange-500 circle with text-black for a filled icon badge
Destructive action hover (delete, etc.) — always red, independent of the flagging accent:
  hover:text-red-500
View/open-file hover — its own distinct color, independent of the other two:
  hover:text-teal-400
Font:              Geist Sans (next/font default from create-next-app) — clean geometric sans, matches the portfolio's type
```

## What NOT to do

- Don't add a second accent color, ever — including for a "success" or "info" state; if it's not the one functional flag color, it's monochrome.
- Don't add rounded corners to buttons/inputs/containers — sharp rectangles throughout.
- Don't wrap every section in a bordered/shadowed card — use whitespace and hairline dividers instead.
- Don't build a light/dark toggle unless explicitly asked — dark-only is the correct scope by default.
- **When converting an existing light theme to this dark theme via find-and-replace on color classes, manually re-check backdrop/overlay colors** (e.g. a modal's `bg-black/40` scrim) — a systematic light→dark token swap will often flip these to a light overlay by mistake, which is wrong: a backdrop's job is to dim the page regardless of the modal's own theme, so it should stay dark in both light and dark modes.

## When applying to a data-heavy app (tables/lists, not just a personal site)

- Table rows: hairline `border-b` dividers only, no zebra striping, no card wrapper around the table.
- Status/flag indicators: small translucent-amber badges (see tokens above), not solid colored fills — keeps the "restrained, not loud" feel even where color is functionally necessary.
- Everything else (vendor names, labels, non-flagged data) stays strictly monochrome — the flagged color should be the only thing that visually stands out on the page, by design.
