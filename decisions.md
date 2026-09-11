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

## Confidence scoring: stubbed in Session 1, real logic is Session 2's job

**Decision:** `computeConfidence()` currently always returns full confidence and flags nothing — a clearly marked placeholder — so the schema, storage, and list UI have a stable shape to build against before the real scoring logic exists.

**Planned approach for Session 2 (decided in discussion, not yet built):** two independent signal types, neither of which requires knowing ground truth (we never have access to the "real" invoice data independently of what the AI reads off the image):
1. **Cross-verification** — a second independent extraction pass; agreement between two independent reads is evidence of correctness, disagreement is evidence of ambiguity worth flagging.
2. **Deterministic sanity rules** — internal consistency checks that don't need to know the true value: does `subtotal + tax ≈ total`? does `total ≈ sum(line_items)`? is `invoice_date` a valid, parseable date? is `vendor_name` non-empty?

**Honest framing (important for product positioning):** "confidence" here means *internal consistency and stability across independent extraction attempts*, not *verified against ground truth* — we can't claim the latter without a human in the loop, and claiming it anyway would be exactly the kind of overclaiming this project's positioning is explicitly trying to avoid.

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
