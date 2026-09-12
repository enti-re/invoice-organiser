# Invoice Extraction with Honest Confidence Scoring

An invoice/receipt extraction tool for accounts-payable/finance-ops workflows: upload a PDF or image invoice, an LLM (Gemini) extracts the structured fields, and — the actual point of this project — a confidence-scoring layer flags exactly which fields might be wrong instead of silently trusting whatever the model returns. A reviewer only needs to check the flagged fields, not re-verify everything from scratch.

See [`decisions.md`](./decisions.md) for the full reasoning behind every real decision made while building this — what was considered, what was cut, and why.

**Live demo:** _pending deployment_
**Repo:** https://github.com/enti-re/zamp-invoice-extraction

## What it does

1. Upload a PDF or image invoice (drag-and-drop or file picker).
2. Gemini reads the document directly (native document/vision understanding — no separate OCR step) and extracts vendor, invoice number, dates, amounts, tax, and line items as structured data.
3. A confidence layer checks the extraction against itself: the model is prompted to return `null` rather than guess, deterministic rules catch things that are provably inconsistent (bad math, invalid dates, empty required fields), and the model self-reports genuine ambiguity. Any field that fails a check gets flagged. Separately, the model also judges whether the uploaded document is actually an invoice/receipt at all — a resume or unrelated document is flagged as a whole, not silently extracted as if it were valid.
4. Everything is stored in Postgres and shown in a searchable, sortable list (live search by vendor).
5. Click an invoice to see it rendered as an actual document — with flagged fields visually called out — and optionally compare it side by side against the original uploaded file.

**What "confidence" honestly means here:** not "verified against ground truth" (there's no independent source of what an invoice actually says — only what the model read off it), but "internally consistent and self-stable." See the "Confidence scoring" section of `decisions.md` for the full design and its limitations.

## Tech stack

- **Next.js 16 / React / TypeScript** — frontend + backend API routes in one deployable app
- **Google Gemini**, via the **Vercel AI SDK** (`generateObject`) for structured extraction
- **Postgres (Neon)** via **Drizzle ORM** — typed columns for structured fields, `jsonb` for the naturally variable-shaped ones (`line_items`, `confidence`)
- **Vercel Blob** for storing the original uploaded files
- **Tailwind CSS**, styled per the `/nikhilchandna-design` design tokens (monochrome dark theme, one functional accent color, monospace for data)
- **Vitest** for tests
- Deployed on **Vercel**

## Local setup

### 1. Prerequisites

- Node.js and [pnpm](https://pnpm.io)
- A [Neon](https://neon.tech) Postgres project (free tier is enough)
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier)
- A [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) store token (create a Blob store in a Vercel project's Storage tab, or run `vercel env pull` after linking the project)

### 2. Install and configure

```bash
pnpm install
cp .env.example .env
```

Fill in `.env`:

```
DATABASE_URL=          # from your Neon project's connection details
GOOGLE_GENERATIVE_AI_API_KEY= # from aistudio.google.com/apikey
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
    page.tsx                       # list/search UI (desktop table, mobile cards)
    invoices/[id]/page.tsx         # invoice review page (route wrapper)
    components/InvoiceReview.tsx   # document-style review UI, field-level flagging + correction
    components/DatePicker.tsx      # custom themed date picker (filter inputs)
    api/invoices/route.ts          # upload+extract+store (POST), search/filter (GET)
    api/invoices/[id]/route.ts     # fetch (GET), delete (DELETE), correct/confirm a field (PATCH)
  db/
    schema.ts                      # Drizzle schema (the `invoices` table)
  lib/
    extract.ts                     # Gemini extraction call (Vercel AI SDK, generateObject)
    model.ts                       # AI SDK model provider setup
    confidence.ts                  # the actual confidence-scoring logic
    invoice-extraction-schema.ts   # Zod schema shared by extraction + confidence
decisions.md                       # real decisions, alternatives considered, reasoning, cuts
```

## Reviewing and correcting a flagged invoice

Click "Review" on any row to open its detail page (`/invoices/[id]`). Flagged fields show why they were flagged, plus two actions: **Confirm** (it's actually correct, dismiss the flag) or **Edit** (correct the value inline — updates the stored data and clears the flag). If anything's flagged, the original document is shown alongside the extracted data automatically, for direct comparison; otherwise it's available on demand via "View original."

## Explicitly out of scope

Printed/digital invoices only (no handwriting), single currency (INR) for now, no auth/multi-user, no batch/scale processing, no inline editing of individual line items (line items can be confirmed as correct, but not corrected field-by-field — that would need a meaningfully different editor UI). All named and reasoned through in `decisions.md`, not oversights.
