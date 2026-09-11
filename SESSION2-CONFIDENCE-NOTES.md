# Session 2 — confidence-scoring implementation notes

Scratch notes for whoever merges this into `decisions.md`. `decisions.md` still
describes the Session 1 plan (cross-verification + deterministic rules) —
that plan changed before this was built; see below.

## The three-signal design (what got built)

`decisions.md`'s existing "Confidence scoring" entry names **cross-verification**
(a second independent extraction pass, agreement = confidence) as the primary
signal. That was reconsidered and replaced with three signals that need only
one extraction call:

1. **Prompted conservatism** (`extract.ts`) — the extraction prompt now
   explicitly tells the model: only fill a field you're genuinely confident
   in; return `null` rather than guess; if there are 2-3 plausible readings,
   pick a best guess but log the ambiguity via `uncertain_fields` instead of
   silently picking one reading.
2. **Deterministic sanity checks** (`confidence.ts`, pure code, no API
   calls) — null checks, blank/placeholder-string checks, ISO date-format
   validity, and two amount-math checks (subtotal + tax ≈ total; line items
   sum ≈ subtotal or total).
3. **Model self-reported uncertainty** (`uncertain_fields`, folded into the
   confidence map) — catches a value that's wrong but internally
   consistent, which no deterministic check can see (e.g. a plausible but
   incorrect vendor name).

## Why cross-verification was dropped

Cost and complexity relative to the time-box, for a differentiator that
would mostly overlap with what the deterministic checks already catch:

- **Cost**: a second full extraction call roughly doubles Anthropic spend
  and roughly doubles p95 latency on every upload, for a feature that's
  already scoped to a demo evaluated by one team, not production traffic.
- **What it would actually catch beyond the other two signals is narrow.**
  Two independent reads of the *same* image tend to agree or disagree for
  the same reasons a single careful read already reveals: if a field is
  genuinely legible, both passes read it the same way (no new information);
  if it's genuinely ambiguous, that's exactly the case Signal 1 asks the
  model to self-report on the *first* pass instead of silently guessing.
  The main case cross-verification uniquely catches — the model
  confidently misreads the same way twice for a subtle-but-wrong reason —
  is real but narrow, and not worth 2x cost/latency for a project this
  size.
- **Extra complexity**: reconciling two extractions (field-by-field diffing,
  deciding which one "wins" when they disagree, or whether disagreement
  alone is enough to flag without a value to show) is a second nontrivial
  design problem layered on top of the one this project is already scoped
  around. Time is better spent making the deterministic + self-report
  signals solid and well-tested.

This is a real trade-off, not a free lunch — see Limitations below for what
it costs us.

## Schema change: added `uncertain_fields` to `invoiceExtractionSchema`

```ts
uncertain_fields: z.array({ field: <enum of top-level field names>, reason: string }).default([])
```

Went with model self-reporting (option B in the brief) over inferring
"why flagged" purely post-hoc, because:

- The deterministic checks can only explain *provable* inconsistency (bad
  math, bad date format). They have nothing to say about "this value is
  plausible-looking but I'm not actually sure" — that judgment only exists
  inside the model at extraction time, and is lost forever if it isn't
  captured then.
- It reuses the same forced-tool-use mechanism already in place — no new
  API surface, no follow-up call.

Also added `EXTRACTION_FIELD_KEYS` (exported from
`invoice-extraction-schema.ts`) as the single source of the 9 top-level
field names, shared by the `uncertain_fields` enum and by
`confidence.ts`'s iteration/lookup — same "one definition, can't drift"
principle the codebase already uses for the extraction JSON schema itself.

## Scoring model

Three honest buckets, not a calibrated probability (deliberately — see
"Honest framing" below):

- `score: 1, flagged: false` — no issue found.
- `score: 0.5, flagged: true` — field has a value, but flagged (ambiguous
  guess, inconsistent math, or model self-reported uncertainty). Maps to
  the "AI has a guess but is unsure" UI state.
- `score: 0, flagged: true` — field is `null`. Maps to the "AI couldn't
  extract this" UI state.

When a field is flagged for being `null` *and* the model separately logged
a reason for that same field in `uncertain_fields`, the specific
model-provided reason replaces the generic "Unable to extract" text (still
`score: 0`, just a better explanation — e.g. "No due date is printed on
this document" instead of an unqualified "unable to extract").

## Real limitations worth flagging

- **No cross-verification means no second opinion.** If the model
  confidently misreads a field the same way on every pass, and the wrong
  value happens to be internally consistent (plausible vendor name, doesn't
  break any amount math, not something the model itself flagged as
  ambiguous), nothing in this system will catch it. This is the direct
  cost of the trade-off above — worth being upfront about rather than
  implying the flagging is more complete than it is.
- **`due_date` (and any genuinely optional field) can't distinguish "not
  on this invoice" from "illegible."** A null `due_date` gets flagged like
  any other null field, even though plenty of real receipts simply don't
  have one — that's not a extraction failure. The model *can* soften this
  via `uncertain_fields` (e.g. "no due date printed on this document"),
  which improves the review-queue message, but the field still shows as
  flagged either way, since there's no reliable way to tell "confidently
  absent" from "silently gave up" from the output shape alone.
- **The subtotal-vs-total line-item check needed a correction from the
  literal spec.** The task description said to check
  `sum(line_items.amount) ≈ total_amount`. Taken literally, that fails on
  almost every normal taxed invoice, since line items conventionally
  exclude tax (sum(line_items) ≈ subtotal, not total). Implemented it as:
  compare against `subtotal_amount` when one was extracted, falling back to
  `total_amount` only when there's no separate subtotal (e.g. a simple
  receipt with no tax breakdown). Flagged here since it's a deviation from
  the literal instruction, made for correctness.
- **Amount tolerance is a heuristic, not derived from anything.** Using
  `max(0.02, 0.5% of the comparison amount)` to allow for rounding
  across multiple line items. Reasonable for INR/USD-scale invoices in this
  project's scope; would need revisiting for e.g. multi-currency amounts
  with very different typical magnitudes.
- **Placeholder-string detection is a small fixed word list** (`n/a`,
  `unknown`, `test`, etc.), not exhaustive — will miss creative placeholder
  values a real invoice generator might produce.

## Other

- Added a 60s timeout (`{ timeout: 60_000 }` as the second argument to
  `anthropic.messages.create()`) so a hung request fails fast — confirmed
  against the installed `@anthropic-ai/sdk` (`^0.125.0`) type definitions
  (`RequestOptions.timeout`, in `internal/request-options.d.ts`) rather than
  guessed.
- No new dependencies added.
