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
