# Decisions

Real decisions made while building this, in roughly the order they came up. Each entry: the decision, the alternative(s) considered, and why.

## Problem framing

**Decision:** Invoice/receipt extraction with honest confidence scoring, for an AP/finance-ops persona who currently retypes vendor invoice data by hand before payment.

**Alternatives considered:** DB schema version-control/branch-diff-merge on a live 5GB-scale database (one of the offered problem statements) — ruled out, it plays directly to a known personal weak spot (SQL/DB depth) rather than a strength, and is a less product-shaped problem to reason about.

**Why this one:** it's the same "messy documents → structured, queryable data" problem class, but with a concrete persona, a real trigger event (an invoice arrives), and — critically — a natural place to demonstrate judgment rather than just plumbing: knowing when *not* to trust an AI's own output on financial data is a real, defensible differentiator, not a toy feature.

## Tech stack: Next.js (single framework for frontend + backend)

**Alternatives considered:** separate React frontend + Express/Fastify backend (two services, two deploys, CORS between them).

**Why:** the app's actual requirements are small — an upload form, a list/filter UI, a handful of API endpoints, one database. No real-time features, no heavy compute, no service boundaries that need to exist. Next.js gives frontend + backend + deployment (via Vercel) as one unit, which is the right-sized tool for this scope and the time-box. Two separate services would add deployment/CORS overhead with no corresponding benefit at this size.

## Database: Postgres over MongoDB

**Alternatives considered:** MongoDB (document store).

**Why:** most of the extracted data is fixed-shape and always present (vendor, date, amounts) — exactly what relational/typed columns are for. The required "filter by vendor/date/amount" feature needs reliable typed comparisons (range queries on amount, date), which Postgres does natively with indexes. Financial data also benefits from ACID guarantees (a write either fully happens or doesn't) more than a blog-style dataset would. MongoDB's document flexibility isn't needed here — the one part of our data that's genuinely variable-shaped (line items) is handled with a `jsonb` column instead (see below), which gives the same flexibility without giving up strict typing everywhere else.

## Postgres host: Neon over Supabase / Vercel Postgres / Railway / RDS

**Alternatives considered:** Supabase (Postgres + auth/storage/realtime bundled — most of that bundle unused since auth is out of scope), Vercel Postgres (as of 2024 this is Neon under a different dashboard, so functionally the same choice), Railway/Render (usually always-on rather than true scale-to-zero), AWS RDS/Cloud SQL (real infra setup — VPCs, security groups — overkill for a 3-session project).

**Why:** serverless (scales to zero, no idle cost), minimal setup (just a connection string), explicitly one of the two options the assignment brief names, and it's a clean fit with a Vercel deployment.

## Schema shape: strict typed columns + jsonb, one `invoices` table (no normalization)

**Alternatives considered:** a separate `line_items` table with a foreign key back to `invoices` (fully normalized).

**Why:** line items are always read and written together with their parent invoice as one unit — there's no feature that needs to query line items independently across invoices ("all line items over $500 across every invoice" isn't a required capability). Splitting into a second table would add a join and a multi-table transaction on every write for zero real benefit. `line_items` and `confidence` live in `jsonb` columns instead; everything else that's fixed-shape (vendor, date, amounts) gets its own strict typed column so it can be filtered/sorted directly. Rule for revisiting: if a future feature needs to query *inside* the nested data independently of its parent, that's the trigger to normalize — not before.

## `invoice_date` / `due_date` stored as `text`, not Postgres `date`

**Alternatives considered:** native Postgres `date` column type.

**Why:** invoices are messy by design (that's the whole reason this project exists), and a bad/garbled date from the extraction pass would make a strict `date` column reject the insert outright — crashing the pipeline instead of storing the row and flagging it. Storing as text lets a row always save, and "is this a valid, parseable date" becomes one of the Session 2 confidence checks (data-quality problem, not a database-constraint problem).

## No separate OCR step — documents go straight to Claude

**Alternatives considered:** a dedicated OCR library (e.g. Tesseract) converts PDF/image → raw text first, then that text gets fed to the LLM to structure.

**Why:** classic OCR just converts pixels to text with no understanding of what a "vendor" or "total" is — the LLM step would still be required afterward to make sense of that text, so OCR would be a redundant middle step, not an alternative to the LLM. It adds latency, a new dependency, and a new failure mode (bad OCR in → bad extraction out) without adding capability, since Claude reads PDFs/images natively and uses surrounding context to resolve ambiguity that pixel-level OCR can't (e.g. inferring a smudged digit from the surrounding numbers). The assignment's cut item ("don't build OCR from scratch, use an existing library") is satisfied more strongly by not needing a separate OCR stage at all.

## Structured output via forced tool-use, not "ask the model to return JSON"

**Alternatives considered:** prompting the model to reply with JSON in plain text and parsing it.

**Why:** free-text JSON replies are not guaranteed to be well-formed or match a schema — historically a real source of flaky pipelines. Forcing a tool call with a defined input schema (built directly from the same Zod schema used to validate the response, via Zod v4's native `toJSONSchema`) means the API layer guarantees the shape, and there's exactly one schema definition, so the two can't drift apart from each other.

## Original file storage: Vercel Blob

**Alternatives considered:** storing the raw file bytes directly in Postgres (bytea), no persistent storage of the original at all.

**Why:** a reviewer checking a flagged field needs to see the source document, so the original has to be kept somewhere. Vercel Blob integrates natively with the Vercel deployment (no separate account/service), and keeping large binary files out of Postgres avoids bloating the database.

## No manual structured-data-entry form

**Decision:** the only way to add an invoice is upload a document; there's no form to type field values in directly.

**Why:** if the data already exists in clean, typed form, the persona would just enter it straight into their accounting system — they wouldn't need this tool. Building a manual-entry path would solve a problem nobody in this workflow actually has.

## Input formats: PDF and image only, no plain text

**Alternatives considered:** accepting pasted/uploaded plain text as an input type.

**Why:** if the input is already plain text, there's no real extraction problem — pulling "Total: $500" out of clean text is trivial and doesn't exercise the actual hard part of this project (reading an unstructured visual document). It's also not the primary real-world format vendor invoices arrive in (PDF/image attachments dominate B2B billing). Cheap to add later if needed (Claude accepts a plain-text content block the same way it accepts an image), deliberately left out for now.

## Confidence scoring — the actual implementation (Session 2)

Session 1 shipped a clearly-marked stub (`computeConfidence()` always returned full confidence, flagged nothing) so the schema/storage/UI had a stable shape to build against. The real logic, built in Session 2, ended up different from the original plan — worth documenting both the plan and why it changed.

**Original plan:** two signals — cross-verification (a second independent extraction pass, agreement = confidence) plus deterministic sanity rules.

**What actually got built: three signals, from a single extraction call (cross-verification dropped — see below):**

1. **Prompted conservatism** (`extract.ts`) — the extraction prompt explicitly tells the model: only fill a field you're genuinely confident in; return `null` rather than guess; if there are 2-3 plausible readings, pick a best guess but log the ambiguity via a new `uncertain_fields` array instead of silently picking one reading.
2. **Deterministic sanity checks** (`confidence.ts`, pure code, no API calls) — null checks, blank/placeholder-string checks (`"n/a"`, `"tbd"`, etc.), ISO date-format validity, and amount math consistency: `subtotal + tax ≈ total`, and line items sum against `subtotal` (not `total` — see correction below), both with a small rounding tolerance (`max($0.02, 0.5% of the comparison amount)`).
3. **Model self-reported uncertainty** (`uncertain_fields`, folded into the confidence map) — catches a value that's wrong but internally consistent, which no deterministic check can see (e.g. a plausible-but-incorrect vendor name).

**Why cross-verification was dropped after all:** during implementation, weighed against the time-box, it stopped being worth it —
- A second full extraction call roughly doubles both Anthropic spend and p95 latency on every upload, for a demo evaluated by one team, not production traffic.
- What it would uniquely catch beyond the other two signals is narrow: two independent reads of the same image tend to agree or disagree for the same reasons a single careful read already reveals — if a field is genuinely legible, both passes read it the same way (no new information); if it's genuinely ambiguous, that's exactly what signal 1 already asks the model to self-report on the first pass. The case cross-verification uniquely catches — the model confidently misreads the same way twice for a subtle-but-wrong reason — is real, but narrow.
- It would also add a second nontrivial design problem (reconciling two extractions field-by-field, deciding which one "wins" on disagreement) on top of the one this project is already scoped around.

**Schema change:** added `uncertain_fields: { field, reason }[]` to `invoiceExtractionSchema` (default `[]`). Chose model self-reporting over inferring "why flagged" purely after the fact, because deterministic checks can only explain *provable* inconsistency (bad math, bad date format) — they have nothing to say about "this value is plausible-looking but I'm not actually sure," a judgment that only exists inside the model at extraction time and is lost if not captured then. Also added `EXTRACTION_FIELD_KEYS` as the single source of truth for the 9 top-level field names, shared between the `uncertain_fields` enum and `confidence.ts`'s iteration, so they can't drift apart.

**Scoring model — three honest buckets, not a calibrated probability:**
- `score: 1, flagged: false` — no issue found.
- `score: 0.5, flagged: true` — field has a value but is flagged (ambiguous guess, inconsistent math, or self-reported uncertainty). Maps to the "AI has a guess but is unsure" UI state.
- `score: 0, flagged: true` — field is `null`. Maps to the "AI couldn't extract this" UI state.

**A correction made to the literal math-check spec, for correctness:** the plan said check `sum(line_items) ≈ total`. Taken literally, that fails on almost every normal taxed invoice, since line items conventionally exclude tax (`sum(line_items) ≈ subtotal`, not `total`). Implemented as: compare against `subtotal_amount` when one was extracted, falling back to `total_amount` only when there's no separate subtotal (e.g. a simple receipt with no tax breakdown).

**Honest framing (important for product positioning, unchanged from the original plan):** "confidence" here means *internal consistency and stability*, not *verified against ground truth* — there's no independent source of what an invoice actually says, only what the model read off it. Claiming otherwise would be exactly the kind of overclaiming this project's positioning is meant to avoid.

**Real limitations, stated honestly rather than implied away:**
- **No second opinion.** If the model confidently misreads a field the same way every time, and the wrong value happens to be internally consistent (plausible vendor name, doesn't break any amount math, not self-flagged as ambiguous), nothing in this system catches it. This is the direct cost of dropping cross-verification.
- **A null `due_date` can't distinguish "genuinely absent from this invoice" from "illegible."** Plenty of real receipts simply have no due date — that's not an extraction failure, but it's flagged the same way either way, since there's no reliable way to tell the two apart from the output shape alone (the model can soften this via `uncertain_fields`, improving the message, but the flag stays).
- **Amount tolerance is a heuristic** (`max($0.02, 0.5%)`), reasonable for INR/USD-scale invoices in this project's scope, not derived from anything more rigorous — would need revisiting for wildly different currency magnitudes.
- **Placeholder-string detection is a small fixed word list**, not exhaustive.

**Also added:** a 60s timeout on the Anthropic API call (so a hung request fails fast instead of leaving the user waiting indefinitely), and 12 tests covering clean/flagged/messy invoice scenarios including a deliberately near-all-null "messy invoice" case that must not throw.

## Cut: auth / multi-user

**Why:** this is a single-reviewer demo of one capability, not a multi-tenant product — there's no real requirement for per-company data isolation. Explicitly named as a cut in the assignment brief. Honest caveat worth stating: without auth, anyone with the deployed URL can see/upload/query all invoices — acceptable for a demo, would be the first thing added before this touched real company data.

## Cut: manual correction UI for flagged fields (nice-to-have, not must-ship)

**Why:** the must-ship loop (upload → extract → flag → store → search) is complete and demonstrates the core differentiator without it. If there's time left in Session 3 after search/filter + deploy + docs, this could be added, but it's explicitly optional.

## Gap review — decisions made auditing the plan before implementation continued

Before writing more code, went through a deliberate gap-check across product/frontend/backend. Real gaps found and decided:

### Line items get a proper detail view, not just a count

**Problem found:** the list only showed a count of line items (e.g. "3"), never the actual items — undercuts the point of extracting them, since a reviewer has nothing to check the total against without opening the original file.

**Decision:** clicking a row opens a detail view styled like an actual invoice document (vendor header, line-items table, subtotal/tax/total) — not a bare data dump. Uses the same design language as the [Monefy/Finnie Dribbble reference](https://dribbble.com/shots/24792795-Monefy-Invoice-Details) and the `/cursor-design` skill tokens. This detail view is also the natural home for the (still nice-to-have) manual-correction feature later, so it's not wasted surface area if that gets built.

### The list table gets sorting, not just filtering

**Decision:** columns (date, amount, vendor) are sortable by clicking the header, on top of the existing vendor/date/amount filters. Small addition, makes the required "search/filter by vendor/date/amount" feature actually easy to use once there are more than a handful of rows.

### Error handling scoped broadly, not just "Claude API timeout"

**Problem found:** initial plan only covered adding a timeout to the Claude API call. That's one failure point among several — blob upload failure, DB write failure, bad file type/size, extraction failure all need their own handling.

**Decision:** every backend failure point returns a specific, correct error response (not a generic 500), and the frontend shows a specific message per failure mode instead of one generic "something went wrong" — plus a timeout on the Claude API call itself so a hung request fails fast instead of leaving the user waiting indefinitely.

### Currency scope: INR only for now

**Problem found:** the amount filter (`gte`/`lte` on `total_amount`) compares raw numbers with no currency awareness — meaningless if invoices arrive in different currencies (₹500 vs $500 vs €500 are very different real amounts).

**Decision:** scope the product to INR for now — still extract/store the `currency` field per invoice (useful for display and future use), but don't build currency normalization/conversion. Multi-currency support is a named future extension, not attempted in this submission.

### Rate limiting: explicitly skipped, named as a decision point for later

**Problem found:** no auth means anyone with the deployed URL can call the upload endpoint repeatedly, and each call costs real Anthropic API money. Real rate limiting would need shared, persistent state across requests (Vercel functions are serverless — no in-memory state survives between invocations), which would mean tracking request counts in Postgres (reusing existing infra) or adding a dedicated store like Upstash Redis.

**Decision:** skip it for this submission — this is a demo evaluated by one hiring team, not a product with real abuse exposure. Named explicitly here as a conscious trade-off (not an oversight) alongside the no-auth cut, to revisit if this ever became a real product.

### Confirmed: no load balancer needed

Considered and ruled out immediately — Vercel's serverless deployment model already scales function instances automatically per request; there's no fixed server to balance load across, and our actual traffic (a demo reviewed by one team) is nowhere near a scale where this would matter regardless.

## More gap-review decisions

### Reconsidered and rejected: adding Google SSO / session auth

**Why reconsidered:** worried that cutting auth would undersell frontend seniority for a Senior Frontend Engineer role.

**Why still rejected:** the assignment brief itself explicitly lists auth/multi-user as a cut — building it back in would mean ignoring the evaluators' own scoping guidance, which reads as worse judgment, not better. It's also not particularly differentiating engineering (OAuth integration is largely config/boilerplate at this point) compared to what actually demonstrates senior frontend depth here: the confidence-flagging UI, sortable/filterable data handling, graceful degradation on messy AI output, and a deliberately designed UI system. Decided to keep it cut, and to just be explicit in this doc about the reasoning (including how auth *would* be designed if it were in scope: Google SSO via NextAuth, session-based route protection, per-company row-level isolation) rather than build it.

### Original document viewable in the detail view, on demand

**Problem found:** flagged fields need to be verified against the source document, but the only original-file access was a disconnected "view" link in a separate tab.

**Decision:** the detail view defaults to showing the rendered, invoice-styled extracted data. A "View original" toggle reveals the actual uploaded PDF/image alongside it for direct side-by-side comparison — loaded on demand, not eagerly, since most fields won't be flagged and won't need source verification.

**Why not show the original file in the list row itself:** rows exist to be scanned quickly across many invoices — embedding a full document preview per row would make the list slow to scan and defeats its purpose. Document viewing belongs in the detail view, where the reviewer is already focused on one invoice.

### Delete option added, in the row

**Decision:** a hover-revealed delete icon on each row (not tucked into the detail view only), with a confirmation prompt before it actually deletes — needed for clearing test/junk uploads during development and before final review, but delete is irreversible so it shouldn't be a single accidental click.

### Client-side file validation before upload

**Decision:** validate file type and size in the browser immediately on file selection, before the upload request is even sent — instant inline error instead of waiting on a full round trip to have the server reject it. Cheap, meaningfully better UX, relevant polish for a frontend-focused evaluation.

### Mobile: a real responsive layout, not graceful degradation or a "desktop only" wall

**Initial lean:** desktop-first with graceful degradation (horizontal scroll on narrow screens) — reasoning was that the AP/finance-ops persona works at a desk, and evaluators would likely review on a laptop.

**Why revised:** the deployed link gets shared over email, and realistically most people tap an emailed link from their phone first, even if they later switch to a desktop for real review — so the mobile view is very likely the *first impression*, not an edge case. A "not supported on mobile" message or a rough horizontally-scrolling table as someone's first touch is a worse outcome than the effort to avoid it.

**Decision:** build a real (if simple) responsive layout — the list renders as a sortable/filterable table on desktop and as compact stacked cards (vendor, amount, date, status badge) on narrow screens, both fully functional. No "desktop only" gate anywhere.

## Database schema applied via `drizzle-kit push`, not migration files

**Alternatives considered:** generating versioned migration files (`drizzle-kit generate` + a migration runner) and committing them to the repo.

**Why push instead:** migration files exist to give a team a reviewable, ordered history of schema changes across multiple environments (dev, staging, prod) over time — real value when a schema evolves under a live team and live data. This project has one environment, one schema (defined once, in `src/db/schema.ts`), and no live data to migrate around. `drizzle-kit push` applies the schema directly and is genuinely simpler for this scope. Both scripts (`pnpm db:generate`, `pnpm db:push`) are wired up in `package.json` — worth knowing the "real" way exists, but push is the right tool for a project this size.

## Switched LLM provider: Claude (Anthropic) → Gemini (Google), via the Vercel AI SDK

**What changed:** everything through Session 2 used Claude directly via the raw `@anthropic-ai/sdk` package (forced tool-use for structured output). During live end-to-end testing, this switched to **Google Gemini**, called through the **Vercel AI SDK** (`generateObject`) instead of a provider-specific SDK.

**Why — an honest, non-technical reason:** real budget constraint. Anthropic's API is prepaid, pay-as-you-go, separate from any Claude.ai/Claude Code subscription — a brand-new API account starts at $0 balance with no free tier, and needs real money added (a $5 minimum) before any call succeeds. That's a genuinely meaningful amount for a personal project with a tight budget, not a token gesture. Google's Gemini API has a real free tier (rate-limited, no cost) that covers this project's actual usage (a low volume of test/demo extractions) without requiring payment at all. This is a legitimate engineering trade-off — same capability for this use case, zero cost — not a downgrade made grudgingly.

**Why adopt the Vercel AI SDK at the same time, rather than just swapping to Google's own SDK directly:** this was already identified as the better approach earlier in the project (cleaner structured-output handling, no manual JSON-schema conversion, no manually hunting for a tool-use block in the response) but hadn't actually been implemented — the code still called Anthropic's SDK directly. Since a provider switch meant touching this code anyway, this was the moment to fix that instead of deferring it again. Concretely: `generateObject({ model, schema, messages })` replaces manually building a forced-tool-use request and parsing the response — same Zod schema (`invoiceExtractionSchema`) used for both the request shape and response validation, same as before, just less code to get there. If the provider ever needs to change again, it's a one-line change to `src/lib/model.ts`, not a rewrite of `extract.ts`.

**What actually changed in code:**
- `src/lib/anthropic.ts` removed; `src/lib/model.ts` added, exporting a Gemini model instance via `@ai-sdk/google`'s `google()` provider.
- `src/lib/extract.ts` rewritten to call `generateObject()` instead of `anthropic.messages.create()` with manual tool-use — same function signature (`extractInvoice({ base64Data, mediaType }) → { extraction, rawResponse, model }`), so nothing downstream (`confidence.ts`, `route.ts`, the frontend) needed to change.
- Error handling in `src/app/api/invoices/route.ts` updated to check the AI SDK's own error classes (`APICallError`, `NoObjectGeneratedError`) instead of Anthropic-specific ones.
- Model pinned via `gemini-flash-latest` — Google's stable alias for their current recommended fast model, overridable via `GEMINI_MODEL` env var, same pattern as the original `ANTHROPIC_MODEL` override.
- `@anthropic-ai/sdk` dependency removed entirely — nothing in the codebase references it anymore.

**What this doesn't change:** the confidence-scoring design (three signals: prompted conservatism, deterministic checks, self-reported uncertainty), the schema, the "no separate OCR" reasoning (Gemini also reads documents/images natively, same as Claude did) — all of that reasoning is provider-agnostic and holds regardless of which model is actually making the call.

**Model pinned to a specific version, not the `-latest` alias — a real finding from live testing.** `gemini-flash-latest` (Google's stable alias for their current recommended fast model) initially seemed like the safer default — no risk of it going stale. In practice, live testing hit real `503 "This model is currently experiencing high demand"` errors on that alias. Separately, an explicitly pinned older version (`gemini-2.0-flash`) returned a `404` telling us it had been sunset. Settled on `gemini-3.6-flash` (a currently-stable, specific version) as the default, confirmed working end-to-end with a real extraction. Worth knowing for future maintenance: the "-latest" alias trades staleness risk for availability risk, and in this test, availability risk was the one that actually bit.

**First real end-to-end verification (2026-09-11):** uploaded a genuine test invoice image through the running app — full pipeline worked: Blob storage → Gemini extraction → confidence scoring → Postgres insert, all correct. Every field matched the source document exactly (vendor, invoice #, dates, subtotal/tax/total, all 3 line items), and — correctly — nothing was flagged, since the math checked out and nothing was ambiguous. This is the first time any part of this pipeline actually ran against a real, live LLM call rather than just type-checking/unit tests against mocked logic.

**The required "deliberately messy invoice" test, run for real (2026-09-11):** built a second test invoice deliberately containing an ambiguous date ("03/04/26"), a missing due date (a bare "—"), and a total that doesn't match subtotal + tax (printed ₹29,000 vs. the real ₹26,196). Results:
- `invoice_date` flagged, with the model correctly self-reporting the DD/MM vs. MM/DD ambiguity in its own words.
- `due_date` flagged, with the nuanced reason "present but empty" rather than a generic null message — distinguishing "blank field" from "not on the invoice at all."
- `subtotal_amount`, `tax_amount`, and `total_amount` all flagged, caught independently by both the deterministic math check *and* the model's own self-reported `uncertain_fields` entry — two of the three confidence signals agreeing on the same problem.
- `line_items` correctly **not** flagged, even though the printed total was wrong — because the line items (₹18,000 + ₹4,200 = ₹22,200) genuinely do match the subtotal. This is a direct, real validation of the earlier subtotal-vs-total correction to the math check (comparing against `total` instead would have wrongly flagged this too).
- `needsReview: true` at the row level, no crash, clean 201 response throughout.

One honest miss in constructing the test: a CSS blur applied to the vendor name wasn't strong enough to make it genuinely illegible, so the model faithfully transcribed the literal characters (including placeholder underscores typed into the test HTML) instead of flagging it — correct behavior given what was actually on the page, just not the illegibility test case intended. Worth remembering for future test-case construction: synthetic "messiness" needs to be genuinely ambiguous to the model, not just visually styled.

**PDF upload path verified separately from the image path (2026-09-11):** everything above was tested via image upload (`image/jpeg`). Real PDFs go through a different branch in `extract.ts` (a `FilePart` with `mediaType: "application/pdf"` instead of an image) and hadn't been exercised. Generated a real PDF (via headless Chrome's `--print-to-pdf`, not just an image) from the same clean test invoice and uploaded it through the live API — identical correct extraction, confirming the PDF path works independently of the image path. The `DELETE /api/invoices/[id]` endpoint was also exercised for real for the first time here (used to clean up a test row) and worked correctly.

## Visual design: iterated against real screenshots, not applied blind

**Problem found:** the design-system pass built earlier (by a parallel agent) applied the `/cursor-design` tokens correctly on paper, but the agent never actually saw the rendered result — subagents can't take screenshots. Once the app was actually running and visible, real gaps showed up: an unstyled native file input clashing with the rest of the page, a modest hero heading not matching the intended type scale, and a real bug (the "Min amount"/"Max amount" filter placeholders were truncated because the inputs were too narrow).

**Fix:** iterated with actual screenshots — bigger/bolder hero typography with a kicker label, a proper drag-and-drop upload zone replacing the native file input, corrected the truncated placeholders, more generous spacing throughout. Confirms a general lesson: design tokens applied without visual feedback are necessary but not sufficient — someone (or something) has to actually look at the rendered page.

## Detail view: side-by-side comparison auto-opens for flagged invoices

**Where this came from:** a Dribbble reference (a dark-themed invoicing app with a persistent form+live-preview split layout) was suggested as inspiration. The dark theme and multi-page sidebar structure were both explicitly declined (contradicts the chosen light Cursor-style theme and the earlier decision to keep this a single page) — but the underlying idea of an always-visible comparison had real merit for the one case where it actually matters.

**Decision:** the "View original" toggle in the detail view now defaults to **open** when `needsReview` is true (something is actually flagged and worth comparing against the source), and stays **collapsed** otherwise (clean invoices don't need the extra panel). This keeps the original reasoning intact — most invoices don't need source verification, so don't eagerly show it — while adopting the reference's "comparison should feel persistent, not hidden behind a click" idea exactly where it earns its place. Verified live: a flagged invoice opens with "Hide original" already showing the split view; a clean invoice opens collapsed with "View original" available on demand.

## Theme changed to monochrome dark, matching the personal portfolio (nikhilchandna.com)

**What changed:** the app's visual theme moved twice in one session — from the Cursor-inspired warm off-white/amber-accent look, to a monochrome light theme (matching nikhilchandna.com), to that same monochrome theme with **dark as the default and only mode** (no light/dark toggle — out of scope for this assignment; the portfolio site has one, this app doesn't).

**Why:** direct, explicit request — matching a personal brand aesthetic already established elsewhere (the same portfolio site, and the `github.com/enti-re` account this project itself lives under) is a reasonable, deliberate choice for a personal project shown to a hiring team, not scope creep for its own sake.

**How the "one accent color, functional only" principle survived the theme change:** amber stays the only non-monochrome color, used exclusively for confidence-flagging signals (badges, warning icons, flagged-field text) — never decoratively. On a dark background this meant re-tuning the exact shades (`amber-600`→`amber-400/500`, translucent `amber-500/10` washes instead of solid light-mode `amber-50` fills) for contrast, not changing what the color means. The primary action button inverted too (black-on-white in light mode → white-on-black text follows the same logic in dark mode, i.e. white button with black text) to keep the same "one strong monochrome CTA" idea.

**Real bug caught doing this conversion:** the color-token remapping (light→dark) was done as a systematic find-and-replace across `page.tsx` and `InvoiceDetail.tsx` rather than by hand, to avoid missing spots — but the automated mapping initially flipped the modal's backdrop overlay from `bg-black/40` to `bg-white/40`. A backdrop's job is to dim the page behind a modal regardless of the modal's own theme, so this was wrong (it would have washed the page out instead of dimming it) — caught by reviewing every changed class rather than trusting the mechanical mapping blindly, fixed to `bg-black/70`.

**Also added:** `color-scheme: dark` in `globals.css`, so native browser form controls (the date-picker calendar icon, in particular) render in dark-appropriate colors instead of defaulting to a light-mode icon that would be hard to see against the new background.

## Flagging accent color settled on orange; distinct colors given fixed, single meanings

**What happened:** the functional flagging accent went through several quick iterations (amber → violet → teal → red → orange) based on live preference — landed on **orange**. Along the way, two real UI semantics got clarified and fixed:

- **Delete (destructive action) gets its own fixed red**, independent of whatever the flagging accent is. Early in the color iteration, the delete button's hover color had been unintentionally drifting along with each accent swap (it happened to already be a shade of red before the iteration started, so each blanket find-and-replace carried it along by coincidence). Decoupled it — delete is always red, regardless of what color means "needs review."
- **"View/open file" gets its own distinct hover color** (teal), separate from both the flagging accent and the delete color — three colors, three fixed meanings, never reused for anything else.

**Considered and reverted: a decorative oil-painting-style visual panel** (CSS gradients + grain texture, styled after Cursor's landing-page hero structure) below the header. Built and reviewed live — decided it clashed with the restrained, functional-color-only aesthetic established everywhere else in the app (and matched by the actual portfolio reference), so it was removed rather than kept as "extra polish." Worth naming: not every suggestion needs to survive contact with how it actually looks — trying it and reverting quickly was cheaper than debating it in the abstract.

## Delete: always visible (not hover-only), with a custom confirmation modal

**What changed:** the delete icon was originally hidden until row hover (`opacity-0 group-hover:opacity-100`) and used the browser's native `window.confirm()` dialog. Both changed:
- The icon is now always present, but styled subtly (a dim neutral gray, only becoming fully red on hover) — visible without demanding attention, rather than either fully hidden or fully prominent.
- `window.confirm()` replaced with a custom modal matching the app's actual theme (dark, sharp corners, the same overlay pattern as the invoice detail view) — the native browser dialog looked jarring against the rest of the polished UI. The modal names the vendor being deleted and makes clear the action is permanent, before committing to the delete API call.

## Custom date picker, replacing the native `<input type="date">`

**Problem:** the native date input's calendar popup is browser/OS-rendered — `color-scheme: dark` (already set) makes its small calendar icon and the popup's base colors dark-appropriate, but the popup itself is still generic OS chrome, disconnected from the app's actual typography, spacing, and sharp-corner monochrome+orange styling. It can't be made to look like a designed part of the page, only a slightly-tinted version of the OS default.

**Decision:** built a small custom `DatePicker` component (`src/app/components/DatePicker.tsx`) — a button showing the selected date, opening a calendar dropdown (month grid, prev/next navigation, click-to-select, outside-click/Escape to close) styled identically to the rest of the app. No new dependency — plain React state and native `Date` math, consistent with this project's general preference for avoiding dependencies for small, well-scoped UI pieces. Replaces both date-range filter inputs.

**A real lint bug caught building it:** the initial implementation used a `useEffect` to keep the picker's displayed month in sync with the selected date, calling `setViewDate` inside that effect — the same `react-hooks/set-state-in-effect` issue hit earlier in this project (see the Session 1 fix in `page.tsx`'s initial data-fetch effect). Fixed the same way: moved the sync to the moment the picker actually opens (in the button's click handler) instead of reactively watching for value changes via an effect.

## The manual correction/approval feature — the biggest addition after core delivery

**The gap:** the app could flag a field as uncertain, but gave the reviewer no way to actually act on it — they'd have to go fix it in their real accounting system separately. This directly undercuts the product's point ("automate the typing, not the judgment" only works if a human can actually *do* the judgment part here). This was always the designated "if time allows" stretch goal (see the earlier "Cut: manual correction UI" entry) — built now because it's a real product gap, not because the time-box was generous.

**Two actions per flagged field:** "Confirm" (human looked at it, it's actually fine, clear the flag without changing the value) and "Edit" (inline-correct the value, which updates the stored data *and* clears the flag). Scoped to the 8 scalar fields (vendor, invoice #, dates, currency, subtotal/tax/total) — `line_items` gets "Confirm" only, not inline editing, since correcting individual line items (add/remove/edit rows) is a meaningfully different, more involved UI that's a deliberate cut for now.

**Backend:** one endpoint, `PATCH /api/invoices/[id]`, taking `{ field, action: "confirm" | "correct", value? }`. Updates the corrected column (if any), sets that field's confidence entry to `{ score: 1, flagged: false, reason: "Corrected by reviewer" | "Confirmed correct by reviewer" }`, recomputes `needsReview` from whatever's still flagged, returns the updated row. Also added `GET /api/invoices/[id]` (previously only `DELETE` existed) to support the new review page fetching a single invoice.

**A real architecture question that came up: was a modal even the right container for this?** Once editing entered the picture — inline inputs, save/confirm buttons, plus the existing document-comparison panel — a modal capped at `max-w-6xl`/`90vh` stopped being the right fit. Real accounting tools (QuickBooks, Bill.com) treat invoice detail as its own page, never a modal, for the same reason. Converted `InvoiceDetail`'s modal into a real route, `/invoices/[id]` (`InvoiceReview.tsx`), giving the content full viewport width, a real shareable/bookmarkable URL, and back-button support. Worth naming: this adds a route, a small step past the earlier "keep it one page" decision — but that decision was about avoiding sidebar/multi-section navigation sprawl, not about never having a list→detail drill-down, which is a different and much more standard pattern.

**Navigation made explicit, not implicit:** the first version of the page-conversion made the whole row/card clickable to navigate, matching the old modal's click-to-open behavior. Reconsidered: a whole-row click has no visual affordance (nothing signals "this is clickable" beyond a CSS cursor style) — replaced with an explicit "Review" button per row/card, so the way to navigate is obvious rather than discovered by accident.

**List view decluttered as a result:** with editing living entirely on the review page, the list's separate "view" (open original in new tab) link became redundant — the review page already has "View original" built in. Removed the standalone "view"/"File" column entirely; each row now has exactly two actions (Review, delete), each visually distinct, instead of three crammed together (an underlined link, a bordered button, and a bare icon all at different visual weights). Also gave both status states (`Needs review` / `Reviewed`) the same pill shape, differing only by color, instead of one being a bordered badge and the other bare text.

**Loading states got real skeletons instead of a "Loading…" string** — shaped like the actual content (table rows, cards, the invoice layout) rather than a generic spinner/text, on both the list and the review page.

**A second real lint bug, different flavor of the same rule:** the review page's initial data-fetch used a `useCallback`-wrapped async function with a non-empty dependency (`[id]`) called from a `useEffect` with an empty dependency array — same `react-hooks/set-state-in-effect` error as before, but an inline `eslint-disable` comment didn't suppress it this time (unlike the plain `exhaustive-deps` warning elsewhere). Fixed by switching to the standard idiomatic pattern for effect-based data fetching: an async function declared *inside* the effect, called immediately, with a `cancelled` flag returned from the cleanup to avoid setting state after unmount — and the effect's dependency array (`[id]`) now honestly matches what it depends on, needing no disable comment at all.

## Two real loading-state bugs, caught after the fact

**Bug 1 — stale data and the loading skeleton rendering simultaneously.** The list page's filter/sort refetch set `loadingList = true` but never cleared the existing `invoices` array, and the skeleton render condition (`loadingList && ...`) sat *alongside* the real data render (`sortedInvoices.map(...)`), not in place of it — both were unconditional, so during any filter operation the old rows and the skeleton rows showed at once. Fixed by making them properly mutually exclusive (`loading ? skeleton : empty-state ? … : data`), on both the desktop table and mobile cards.

**Bug 2 — stale invoice content on the review page when navigating directly between two different invoices.** The review page's data-fetch effect correctly re-ran when `id` changed, but never reset `invoice`, `loading`, or `showOriginal` state first — so navigating from one invoice's review page straight to another (same route, different `id`, no full page reload) would leave the *previous* invoice's data on screen, with no loading indicator, until the new fetch resolved and silently overwrote it. Fixed by resetting all of that state at the start of the fetch, before the request goes out.

**Why these are worth naming rather than just quietly fixing:** both are the same underlying mistake — treating "is loading" and "what data is currently shown" as independent booleans instead of one real state machine (loading / error / empty / has-data). Worth remembering for any future list-refetch or route-param-driven-fetch code in this codebase.

## Flagging accent color: settled on red

Iterated once more — the accent went from amber → violet → teal → red → orange (see the earlier "Flagging accent color settled on orange" entry) → **red**, the final choice. Applied consistently everywhere the flagging signal appears: the list's `Needs review` badge, the sort-direction indicator, and every warning icon/text on the review page.

**Worth naming honestly:** the delete button's hover state and generic error messages (upload/list failures) were already red before this change (from the dark-theme conversion), and stayed red through this final swap too — meaning red now carries three related-but-distinct meanings in this app: "needs review," "destructive action," and "something went wrong." Considered whether this violates the "one color, one meaning" principle established earlier (see the delete/flagging-color decoupling entry) — concluded it doesn't meaningfully hurt usability here, since all three are variations on "pay attention to this" and appear in visually distinct contexts (a static badge/warning vs. a hover-only icon vs. a transient error message), so there's no real risk of confusing one for another in practice.

## Consolidated repeated warning text on the totals block

**Problem:** when `subtotal_amount`, `tax_amount`, and `total_amount` are all flagged for the same math inconsistency, each field showed its own full copy of the explanation — the same paragraph, repeated three times in a row directly under each amount. Genuinely noisy, and doesn't represent the actual signal correctly: this is *one* reconciliation problem affecting three related numbers, not three independent complaints.

**A subtlety that made the naive fix wrong:** the three fields' reasons aren't always byte-identical. `total_amount` can carry an extra self-reported clause on top of the shared deterministic-check sentence (joined with `"; "` — see `confidence.ts`'s `Array.from(new Set(reasons)).join("; ")` pattern), so a simple string-equality check to detect "these are duplicates" misses cases where one field's reason is a superset of the others'.

**Fix:** when two or more of the three amount fields are flagged, split each one's reason on `"; "`, union the resulting segments across all of them, and show that combined, deduplicated explanation exactly once below all three amounts — each individual field still gets its own compact warning icon and Confirm/Edit controls (correction is still per-field), just not its own repeated paragraph of text.

## Skeleton/content shape mismatch on the line items table, and reverting the auto-open default

**Skeleton mismatch:** the line-items section of the loading skeleton used generic full-width bars, but the real content is an actual 4-column table (Description / Qty / Unit price / Amount) with right-aligned numeric columns. A skeleton is supposed to be a rough visual echo of what's about to appear — generic bars didn't hint "this becomes a table" at all. Rebuilt it as a header row plus a few body rows using the same column proportions as the real table (`flex-1` for description, fixed narrow widths for the three numeric columns), so the loading state and the real content now actually resemble each other.

**Reverted the "auto-open original when flagged" decision.** Session 2 had deliberately made the original-document comparison default to open when `needsReview` was true (see the earlier "Detail view: side-by-side comparison auto-opens for flagged invoices" entry, itself inspired by a Dribbble reference). On reflection this was reversed — the panel now always starts hidden (`View original`), regardless of flag status, and only opens on an explicit click. Simpler, more predictable default; the comparison is still one click away exactly when it's needed.

## Subtotal/Tax/Total alignment fixed to match the line-items table

**Problem:** the totals block's container was correctly pushed to the right edge (`flex justify-end`), but the label/value text inside it stayed left-aligned by default — so short numbers like `32500` ended well before the container's actual right edge, visibly failing to line up under the "Amount" column above them. Real invoices/financial documents conventionally right-align totals under the amount column they summarize; this one didn't.

**Fix:** added an `align` parameter to the shared `renderScalar` helper (defaults to `"left"`, used as `"right"` for Subtotal/Tax/Total only) that right-aligns the label, the value+flag row, and the field's own controls. The metadata grid (Invoice #/Date/Due date/Currency) is unaffected and stays left-aligned, which is correct for that section.

## Flagged-field UI compacted to icon + hover tooltip + click-to-reveal actions

**Problem:** even after right-aligning the totals, a flagged field still rendered a full stack every time — value, warning icon, a paragraph of reason text, and always-visible Confirm/Edit links — regardless of whether the reviewer was looking at it. For a document with several flagged fields (like the deliberately-messy test invoice with 3 flagged amount fields) this meant a lot of permanently-visible red text competing for attention, which undercuts the actual point of confidence scoring: only draw the eye to what needs a second look, and only when the reviewer is engaging with it.

**Fix:** replaced the always-visible reason/controls with a single small warning icon (`FlagIndicator`) next to the value. Hovering it shows the reason in a tooltip; clicking it toggles a small popover with Confirm/Edit (Edit switches the field into the existing inline-input edit mode). Nothing is shown until the reviewer actually interacts with the icon. Applied uniformly everywhere a field can be flagged: the scalar fields via `renderScalar`, the vendor name header, and the line-items block.

**A side effect that made an earlier decision obsolete:** the "consolidate repeated warning text on the totals block" fix (above) existed only because three simultaneously-*visible* paragraphs of near-identical text looked broken. Once reasons only ever appear one at a time, in a tooltip, on hover, that duplication is no longer visible at all — so the segment-union consolidation logic was deleted rather than kept as now-dead complexity. Left the original entry in this log rather than rewriting history, per this file's existing practice of recording reversed decisions honestly.

**A real bug caught during manual testing, not by lint/type-check:** the first version showed the hover tooltip and the click-opened Confirm/Edit popover stacked on top of each other, because moving the mouse to click the icon leaves the browser's `:hover` state active afterward, and both elements were positioned identically (`absolute top-full`). Fixed by hiding the tooltip whenever the popover is expanded (`{reason && !expanded && (...)}`), so only one of the two is ever in the DOM at a time. This is exactly the kind of bug that `tsc`/`eslint`/`vitest` cannot catch — it only showed up when clicking through it live in the browser.

**Follow-up UX gap, also caught only by looking at it live:** a plain warning icon gives no signal that it's clickable — it reads as a passive "something's wrong here" indicator, not a control. Tried appending an explicit action hint to the tooltip ("Click to confirm or edit") plus a stronger hover state on the icon.

**That fix introduced a worse problem, reported live: "click to confirm or edit... but when I go to tooltip, it disappears."** The hint text made the tooltip read as if *it* were the clickable target, but the real click target was the icon; moving the mouse toward the tooltip to interact with it crossed outside the icon's hover box and killed the tooltip before it could be used. This is the same class of bug as the stacking issue above — a hover-dependent UI is fundamentally fragile the moment the thing being hovered needs to also be interacted with.

**Tried a modal next** (click icon → centered dialog with value, reason, Confirm/Edit) to remove the hover dependency entirely. It fixed the interaction bug but introduced a proportionality problem, also only visible by using it: dimming and centering an overlay for what's frequently a single "yes, confirm" click is a lot of ceremony, and it pulls focus away from the invoice the reviewer is actually comparing the value against.

**Landed on an inline accordion instead**, after explicitly laying out the tradeoffs and asking for a decision rather than guessing a fourth time: clicking the icon expands a small panel *in place*, directly below the field — no overlay, no hover state, and the reason/actions stay visually anchored to the exact number they're about. `ReviewModal` was removed; `FlagIcon` now just calls an `onClick` that toggles `expandedField`, and `InlineReviewPanel` renders reason + Confirm/Edit (or the existing `EditRow` when editing) directly under the value. This is the fourth iteration of this specific interaction (always-visible → hover tooltip → modal → inline accordion) — worth naming plainly rather than glossing over, since it's a real example of "ship the simplest thing, test it live, and let the reviewer's actual reaction drive the next iteration" rather than getting it right by pure reasoning up front.

**Refined once more:** the panel initially pushed the rest of the document down when it opened (genuine reflow, not just CLS from a mismatch — the content really was a different height with the panel open vs. closed). Changed it to `position: absolute`, anchored below the field, so it overlays instead of shifting anything below it; each field's wrapping `relative` container anchors its own panel (`left-0` or `right-0` depending on the field's alignment). Also added two small but real usability gaps: an explicit "×" close control (top-right of the panel) for a reviewer who opened it but doesn't want to take either action, and click-outside/Escape-to-close, reusing the exact pattern already established in `DatePicker.tsx` (a `ref` on the panel's container + a `mousedown`/`keydown` listener on `document`, scoped to only run while a panel is open). One click-handling subtlety worth noting: the outside-click ref wraps the *field's whole container* (icon + panel together), not just the panel — wrapping only the panel would make clicking the trigger icon itself register as "outside" on `mousedown` (closing the panel) followed immediately by the icon's own `onClick` re-opening it, a silent toggle-then-reopen bug that never surfaces as an error, only as "the icon doesn't seem to close its own panel."

## Skeleton placeholders resized to measured real dimensions, to fix CLS

**Problem:** both loading skeletons (the invoice list's table/cards, and the review page's document skeleton) used guessed placeholder sizes (`h-3`, `h-4`, arbitrary `space-y-*` gaps) instead of the real content's actual rendered dimensions. The most common guessing mistake: a Tailwind text-size utility's line-height isn't its font-size — `text-xs` is a 12px font but a **16px** line-height, `text-sm` is 14px font but a **20px** line-height — so a label styled `text-xs` needs an `h-4` (16px) placeholder, not `h-3` (12px). Getting this wrong doesn't break anything visually on its own, but it means the skeleton's box height doesn't match the real content's box height, so swapping one for the other shifts the whole layout underneath it — real, measurable Cumulative Layout Shift, not just an aesthetic complaint.

**Fix, done by measurement rather than more guessing:** used `getBoundingClientRect()` in the browser (via a detached DOM node built with each section's real classes) to get the actual real content-box heights, section by section, then resized every skeleton placeholder to match. The worst offender was the review page's totals block: the real Subtotal/Tax/Total block is 3 stacked *label+value pairs* (~122–125px total), but the skeleton was 3 flat bars in a single row (~64px) — the skeleton didn't even have the right internal shape, let alone the right size, so it undershot by roughly 58px. Also fixed: the line-items table header skeleton (used a shared `pb-2` on a flex row instead of matching each real `<th>`'s `py-2`, undershooting by ~13px), the header metadata grid (wrong inner gap, off by 8px), and the desktop table row / mobile card component-level heights (each individual placeholder's height corrected to its real counterpart's measured height, e.g. the row's status-badge and "Review" button placeholders, which were off by 2-8px each).

**What this does and doesn't fix:** every *individual* skeleton row/section now matches its real counterpart's height almost exactly (verified to within 1-3px, the remainder being font sub-pixel rendering, not a structural mismatch). What it does **not** fix is the line-items table's *row count* — the skeleton always shows a fixed number of fake rows, but a real invoice might have 1, 2, or more line items, so a shift proportional to `|fake count - actual count| × row height` can still happen on that specific section. Eliminating that fully would require knowing the row count before the skeleton renders, which isn't possible with client-side data fetching — moving initial data-fetching to the server (so the real count is known before first paint) was raised and explicitly deferred in favor of this narrower, faster fix, given both pages' fetch-on-mount + skeleton pattern is otherwise working and time is better spent elsewhere this close to the deadline.

**Follow-up, caught by asking "do these actually look the same?" rather than assuming the fix was complete:** measured the two states side by side on a real 2-line-item invoice — skeleton card height 538px vs. real 504px, a 34px gap, exactly one row's height, confirming the mismatch was precisely the documented row-count limitation and nothing else had drifted. Reduced the skeleton's fake row count from 3 to 2 (a closer default guess for a typical invoice), which shrinks the *typical* gap without pretending to solve the underlying problem — an invoice with 4 line items will still shift on load. The real fix (server-side initial fetch) remains a known, deliberately deferred tradeoff, not an oversight.

## Missing `cursor-pointer` on every button, project-wide

**Problem:** hovering the Review/Delete buttons (and every other button in the app) kept the default arrow cursor instead of a pointer. The cause: `<button>` elements don't get `cursor: pointer` from the browser by default the way `<a>` links do, and Tailwind's Preflight base reset doesn't add it back — it has to be applied explicitly per element. Since none of the buttons in this app had it, every clickable control (Review, delete icons, Confirm/Edit/Save/Cancel, sort headers, filter/clear, the delete-confirmation modal, the date picker's trigger/nav/day cells) was affected, not just the two that got reported.

**Fix:** added `cursor-pointer` to every `<button>` across `page.tsx`, `InvoiceReview.tsx`, and `DatePicker.tsx`, plus `disabled:cursor-not-allowed` on the ones that have a `disabled` state (previously some only had `disabled:opacity-*`, dimming the button but leaving the cursor still saying "clickable"). Verified via computed style (`getComputedStyle(el).cursor`) rather than just visually, since a missing class is easy to eyeball past.

## First-run empty state redesigned (no filter bar, no table chrome, no emoji)

**Problem, caught by looking at what a brand-new user actually sees:** with zero invoices, the page still showed a full filter toolbar (5 inputs + Filter/Clear buttons) above an empty table — UI for a feature that has nothing to act on yet, pure noise on someone's very first visit. Separately, the empty-state icon went through a few emoji attempts (🧾, then 📄, then 📥) styled with a `grayscale` CSS filter to match the monochrome theme; all of them looked muddy/low-contrast, because filtering a multi-color emoji glyph to gray doesn't produce a clean icon, it produces a washed-out one — the problem was the *technique* (CSS-filtering an emoji), not which emoji was picked. It also visually trailed off at the bottom of an otherwise near-empty page with no real breathing room.

**Fix:** two changes, not one. (1) Replaced the emoji with an actual outline SVG icon (reusing the existing `FileIcon`, the same stroke-based icon component already used elsewhere in this file for consistency — no CSS filter hack needed since it's already a single flat color via `currentColor`). (2) Split "zero rows" into two genuinely different states: a **first-run** state (no invoices exist *and* no filters are active) that hides the filter toolbar and table/card chrome entirely, replacing them with one bordered, generously-padded, centered block (icon + "No invoices yet" + "Upload one above to get started"); versus a **filtered-to-zero** state (invoices exist but the current filter excludes all of them) that keeps the filter toolbar visible — the user still needs it — and shows a smaller inline "No invoices match your filters" message with a one-click "Clear filters" action. Distinguishing these two cases (`hasActiveFilters = Object.values(filters).some(Boolean)`) means the empty state always explains *why* it's empty, rather than always saying "upload one" even when the real issue is an overly-narrow filter.

## Visible progress feedback for upload and delete

**Problem:** clicking Upload or Delete gave almost no feedback that anything was happening. Upload only changed its button text to "Extracting…" — easy to miss, especially once the actual database latency was measured (see the "why is Review slow" investigation below): Gemini extraction plus a Neon round-trip can genuinely take several seconds to over a minute, with nothing on screen actively signaling "still working" versus "frozen." Delete was worse: clicking "Delete" in the confirmation modal closed it *immediately*, before the request had even been sent, so the only in-flight signal was a slightly dimmed trash icon in the row — trivial to miss, and the modal closing looked like the action was already done when it might still fail.

**Fix:**
- Added a reusable `Spinner` (spinning SVG ring) and an indeterminate progress bar (`animate-indeterminate`, a sliding bar — chosen over a percentage bar because there's no real "percent complete" to report for an LLM extraction call; it only claims "still working," not how far along).
- **Upload:** the dropzone itself now shows the spinner, "Extracting fields…", and an explicit "this can take up to a minute" expectation-setting line, plus the indeterminate bar underneath; the dropzone and file input are disabled for the duration so a new file can't be selected mid-extraction. The submit button also gets the spinner alongside its existing text change.
- **Delete:** the confirmation modal now stays open for the duration of the request instead of closing on click — its Delete button shows the spinner and "Deleting…", both buttons and the backdrop-click-to-close are disabled while in flight, and a failure now shows the error *inside* the modal (where the user is already looking) instead of in a separate strip above the table that could be scrolled past. The row's trash icon also swaps to the spinner during the same window, so the list and the modal agree.

## Investigated: why clicking "Review" felt slow to fetch

**Not a code bug.** Timed the database query directly (bypassing the API route and Next.js entirely, six consecutive calls with zero delay between them) and got 0.8–2.4 seconds *per query*, for a single indexed primary-key lookup on a two-row table — that should be low-single-digit milliseconds. Root cause is environmental, not logical: the Neon Postgres instance is in `us-east-2` (Ohio), and local dev testing is happening from much farther away, so every query pays real speed-of-light network distance. That cost is compounded by the `neon-http` driver, which opens a fresh HTTPS connection (full TLS handshake) for *every* query rather than reusing one — the right tradeoff for a stateless serverless function (which is what it'll actually run as, once deployed on Vercel), but the worst case for a long-running local dev server making repeated queries.

**Not fixed, deliberately, for now:** since Vercel functions typically run in a US region, the same query in production would very likely see a US-to-US round trip instead of a cross-continental one, likely resolving most of the perceived slowness on its own. Swapping the local dev driver for one that reuses a persistent connection (e.g. `neon-serverless` with a `Pool`) was considered and explicitly deferred — it would only help local testing, not the deployed app's real performance, and isn't worth the added dependency this close to the deadline. The progress-feedback fix above (previous section) addresses the actual user-facing symptom either way: even if a wait is unavoidable, the user should be able to see that the app is working, not stalled.

## Future plans (not attempted in this submission)

Named here rather than left implicit, so it's clear these are deliberate deferrals with a time-boxed submission, not gaps nobody noticed:

- **Multiple invoice upload at once** (batch upload, one drop/selection with several files, extracted and inserted individually). The current flow is deliberately one-invoice-at-a-time — simpler UI, simpler error handling (one file, one failure mode to show), and enough for the assignment's testing needs. Batch upload would need per-file progress/status in the upload zone and partial-failure handling (some succeed, some don't) that doesn't exist yet.
- **Duplicate-upload detection** ("is this invoice already in the system?" — e.g. by vendor + invoice number, or a file hash, before or after extraction). Nothing today stops the same file being uploaded and extracted twice, creating two rows. Solving it well needs a decision on what "the same invoice" means (exact file re-upload vs. same vendor+invoice number with a re-scanned copy) that's worth its own design pass rather than a quick bolt-on.
