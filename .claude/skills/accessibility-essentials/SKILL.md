---
name: accessibility-essentials
description: Apply a real, verifiable accessibility pass to a web app — landmarks, keyboard navigation, focus trapping on modals/popovers, computed color contrast, heading hierarchy, and live regions for async feedback, checked with automated tooling rather than a cosmetic aria-label sweep. Use when the user asks to "add accessibility," "make this accessible," "a11y pass," or when a job/rubric explicitly names accessibility as a requirement.
---

# Accessibility essentials

A methodology for a real accessibility pass, developed from an actual audit-fix-verify cycle on a production app. The point is finding and fixing real barriers, not sprinkling `aria-label` everywhere to look thorough — an audit that finds nothing wrong should say so, not invent busywork.

## Core principles

1. **Every page needs exactly one `<main>` landmark.** This is the single most common, highest-impact miss and the one automated tools flag loudest (a missing `<main>` can produce dozens of violation instances on a content-heavy page). Check every route's root element is `<main>`, not a bare `<div>`.
2. **Anything that looks clickable must be operable by keyboard.** A `<div onClick={...}>` — a dropzone, a custom toggle, a card — is invisible to keyboard and screen-reader users unless it has `role="button"`, `tabIndex={0}`, a real `aria-label`, and an `onKeyDown` handler treating Enter and Space the same as a click. This is a common, easy-to-miss gap because it looks and works fine with a mouse.
3. **Every popover, modal, or dropdown needs focus trapping and focus restoration**, not just close-on-outside-click/Escape. Concretely: focus moves into the panel when it opens; Tab cannot escape it while open (wraps from last focusable element back to the first, and Shift+Tab from the first back to the last); focus returns to whatever element opened it when it closes. If a codebase already has an outside-click/Escape-close pattern (common), this is usually the missing half, not a replacement for it. Centralize it as one shared hook once more than one component needs it — see the pattern below.
4. **Color contrast must be computed, not eyeballed.** WCAG AA: 4.5:1 for normal text, 3:1 for large text (≥18pt/24px, or ≥14pt/18.66px bold) and UI components/graphical objects. A muted gray that looks "fine" against a dark background routinely fails this in practice — actually compute the ratio for every text/background pair in use, especially the most-muted "secondary" and "tertiary" text shades, which are the ones most likely to have been chosen by eye and never checked.
5. **Heading hierarchy must not skip levels.** One `h1` per page; don't jump from `h1` to `h3` because an `h2`-styled heading "looked too big" for a section — restyle it instead of skipping the semantic level.
6. **Every table header needs real accessible text.** An empty `<th>` for an actions column (e.g. holding only icon buttons) is invisible to screen readers as a column — give it visually-hidden text (e.g. a `sr-only`-style utility) rather than leaving it blank.
7. **Async feedback needs a live region.** When an action succeeds or fails asynchronously (upload, delete, save, a validation error) and the only signal is a DOM change, screen-reader users get nothing. Add `role="alert"` for errors (assertive, interrupts) or `role="status"`/`aria-live="polite"` for success/neutral updates (announced without interrupting).
8. **Icon-only buttons need a specific `aria-label`, not a generic one.** "Delete invoice" not "Delete"; "Close filter panel" not "Close" — specific enough that a screen-reader user hearing only the label knows exactly what it does out of context.

## A reusable focus-trap hook

```ts
import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const useFocusTrap = <T extends HTMLElement = HTMLDivElement>(active: boolean) => {
  const containerRef = useRef<T>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;
    const focusable = container?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable?.[0] ?? container)?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !container) return;
      const items = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [active]);

  return containerRef;
};
```

Wire it by passing `active` (whatever boolean already controls the panel's open state) and attaching the returned ref to the panel's container element — no other code needs to change.

## Verify with automated tooling, not manual claims

- Add `@axe-core/playwright` (or the equivalent for your test runner) and scan every real page/route for violations — including non-default states worth checking (an empty list, a filtered-to-zero-results state, an error state), since those often have different markup than the happy path.
- Write real keyboard-interaction tests for anything you fixed for keyboard access: `page.keyboard.press("Tab")` through a previously-mouse-only control and assert it receives focus; open a modal/popover and assert focus moved in, Tab wraps, and focus returns to the trigger on close.
- Run the full existing test suite afterward — an accessibility pass touches shared markup (root elements, headings) and can regress something unrelated if done carelessly.

## What NOT to do

- Don't add `aria-label` to elements that already have accessible text from their content (a button that says "Delete" doesn't need a redundant `aria-label="Delete"`).
- Don't claim a contrast fix without stating the actual computed ratio before and after — "improved contrast" is not verifiable; "3.8:1 → 7.2:1" is.
- Don't treat close-on-Escape/outside-click as equivalent to focus trapping — they solve different problems and most codebases already have the first without the second.
- Don't pad an audit with invented issues to have something to report — if an area (e.g. existing icon labels, table semantics) is already correct, say so plainly.
- Don't skip re-running the full test suite after the pass — accessibility fixes often touch root/shared elements used everywhere.
