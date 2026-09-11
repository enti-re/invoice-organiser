# Invoice Extraction with Honest Confidence Scoring

An invoice/receipt extraction tool for accounts-payable/finance-ops workflows: upload a PDF or image invoice, an LLM (Claude) extracts the structured fields, and — the actual point of this project — a confidence-scoring layer flags exactly which fields might be wrong instead of silently trusting whatever the model returns. A reviewer only needs to check the flagged fields, not re-verify everything from scratch.

See [`decisions.md`](./decisions.md) for the full reasoning behind every real decision made while building this — what was considered, what was cut, and why.

**Live demo:** _pending deployment_
**Repo:** https://github.com/enti-re/zamp-invoice-extraction

## What it does

1. Upload a PDF or image invoice (drag-and-drop or file picker).
2. Claude reads the document directly (native document/vision understanding — no separate OCR step) and extracts vendor, invoice number, dates, amounts, tax, and line items as structured data.
3. A confidence layer checks the extraction against itself: the model is prompted to return `null` rather than guess, deterministic rules catch things that are provably inconsistent (bad math, invalid dates, empty required fields), and the model self-reports genuine ambiguity. Any field that fails a check gets flagged.
4. Everything is stored in Postgres and shown in a searchable, sortable, filterable list (by vendor / date / amount).
5. Click an invoice to see it rendered as an actual document — with flagged fields visually called out — and optionally compare it side by side against the original uploaded file.

**What "confidence" honestly means here:** not "verified against ground truth" (there's no independent source of what an invoice actually says — only what the model read off it), but "internally consistent and self-stable." See the "Confidence scoring" section of `decisions.md` for the full design and its limitations.

## Tech stack

- **Next.js 16 / React / TypeScript** — frontend + backend API routes in one deployable app
- **Claude (Anthropic API)**, forced tool-use for structured extraction
- **Postgres (Neon)** via **Drizzle ORM** — typed columns for structured fields, `jsonb` for the naturally variable-shaped ones (`line_items`, `confidence`)
- **Vercel Blob** for storing the original uploaded files
- **Tailwind CSS**, styled per the `/cursor-design` design tokens (warm off-white, one accent color, monospace for data)
- **Vitest** for tests
- Deployed on **Vercel**

## Local setup

### 1. Prerequisites

- Node.js and [pnpm](https://pnpm.io)
- A [Neon](https://neon.tech) Postgres project (free tier is enough)
- An [Anthropic API key](https://console.anthropic.com)
- A [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store token (create a Blob store in a Vercel project's Storage tab, or run `vercel env pull` after linking the project)

### 2. Install and configure

```bash
pnpm install
cp .env.example .env
```

Fill in `.env`:

```
DATABASE_URL=          # from your Neon project's connection details
ANTHROPIC_API_KEY=     # from console.anthropic.com
BLOB_READ_WRITE_TOKEN= # from your Vercel Blob store
```

### 3. Set up the database schema

```bash
pnpm db:push
```

This applies the schema in `src/db/schema.ts` directly to your Neon database (no migration files needed for a project this size — see `decisions.md` if you're wondering why).

### 4. Run it

```bash
pnpm dev
```

Open http://localhost:3000.

## Testing

```bash
pnpm test          # run the test suite (confidence-scoring logic + extraction schema validation)
pnpm lint          # ESLint
pnpm exec tsc --noEmit   # type-check
```

Tests focus on the confidence-scoring logic (`src/lib/confidence.test.ts`) — clean invoices, individually-flagged fields (missing/placeholder values, bad date formats, math inconsistencies, self-reported ambiguity), and a deliberately messy near-all-null invoice that must be handled gracefully rather than throwing.

## Project structure

```
src/
  app/
    page.tsx                    # list/search UI (desktop table, mobile cards)
    components/InvoiceDetail.tsx  # document-style detail view with per-field flagging
    api/invoices/route.ts       # upload+extract+store (POST), search/filter (GET)
    api/invoices/[id]/route.ts  # delete
  db/
    schema.ts                   # Drizzle schema (the `invoices` table)
  lib/
    extract.ts                  # Claude extraction call (forced tool-use)
    confidence.ts                # the actual confidence-scoring logic
    invoice-extraction-schema.ts # Zod schema shared by extraction + confidence
decisions.md                    # real decisions, alternatives considered, reasoning, cuts
```

## Explicitly out of scope

Printed/digital invoices only (no handwriting), single currency (INR) for now, no auth/multi-user, no batch/scale processing, no manual correction UI for flagged fields. All named and reasoned through in `decisions.md`, not oversights.
