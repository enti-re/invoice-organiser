import Link from "next/link";

import { ArchitectureDiagram } from "@/app/components/ArchitectureDiagram";

const DesignPage = () => {
  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-8 px-6 py-16 md:px-8">
      <header className="flex items-start justify-between gap-4">
        <h1 className="text-3xl font-semibold text-neutral-100 tracking-tight">Design overview</h1>
        <Link href="/" className="shrink-0 text-sm text-neutral-400 hover:text-white">
          Home
        </Link>
      </header>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-100">Problem statement</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          Accounts Payable teams manually enter invoice data, which is slow and error-prone.
          Artificial intelligence can automate extraction, but incorrect data creates financial
          risk. The product must reduce manual work{" "}
          <span className="font-semibold text-neutral-100">without compromising trust.</span>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-100">Product scope</h2>
        <ul className="space-y-2 text-sm text-neutral-300">
          <li>
            <span className="font-semibold text-neutral-100">Invoice uploads</span> — PDF and image files.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Automatic extraction</span> — extract key invoice
            fields using artificial intelligence.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Confidence scoring</span> — flag fields that may
            need review.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Inline correction</span> — review and correct
            flagged fields.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-100">Product decisions &amp; rationale</h2>
        <ul className="space-y-2 text-sm text-neutral-300">
          <li>
            <span className="font-semibold text-neutral-100">Upload-only:</span> invoices usually arrive as
            documents, so manual entry is unnecessary for day-to-day use. Backlog migration is a
            future consideration.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Confidence model:</span> combines model
            uncertainty, deterministic format/math checks, and model-reported ambiguity. Each
            field is scored <span className="font-semibold text-neutral-100">1, 0.5, or 0</span>.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Document-type check:</span> prevents incorrect
            documents from being treated as valid invoices.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Flagged-field correction:</span> lets users fix
            uncertain data without leaving the workflow.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-100">Confidence model</h2>
        <ul className="space-y-2 text-sm text-neutral-300">
          <li>
            <span className="font-semibold text-neutral-100">Document-level confidence:</span> first checks
            whether the uploaded file is actually an invoice.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Field-level confidence:</span> each extracted
            field receives a score of <span className="font-semibold text-neutral-100">1, 0.5, or 0</span>.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Multiple signals:</span> scores combine model
            uncertainty, deterministic format/math checks, and model-reported ambiguity.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Needs review:</span> low-confidence fields are
            flagged for user verification instead of requiring users to re-check everything.
          </li>
        </ul>
      </section>


      <section className="space-y-8">
        <h2 className="text-xl font-semibold text-neutral-100">Architecture &amp; technical design</h2>

        <ArchitectureDiagram />

        <ul className="space-y-2 text-sm text-neutral-300">
          <li>
            <span className="font-semibold text-neutral-100">Frontend:</span> Next.js 16 App Router, React,
            TypeScript, and Tailwind CSS.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">API:</span> Next.js API routes handle uploads,
            extraction, confidence scoring, and data operations.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">AI:</span> Vercel AI SDK with Gemini extracts
            structured invoice data using a shared Zod schema.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Database:</span> Neon PostgreSQL stores invoice
            fields, line items, and confidence data through Drizzle ORM.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Storage:</span> Vercel Blob stores the original
            invoice PDFs and images.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Validation:</span> Zod validates the structured AI
            output before it is stored.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Deployment:</span> the entire application runs on
            Vercel, keeping the initial architecture simple.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Development:</span> Claude Code, with a
            design-language skill and a systematic-refactoring skill.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-100">Alternative approaches considered</h2>
        <ul className="space-y-2 text-sm text-neutral-300">
          <li>
            <span className="font-semibold text-neutral-100">MongoDB → PostgreSQL:</span> typed columns and
            indexes are a better fit for structured invoice data.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">React + Express → Next.js:</span> one application
            avoids unnecessary service and deployment overhead.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Gemini SDK → Vercel AI SDK:</span> structured
            output and shared schemas make extraction safer and provider changes easier.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Second extraction pass → Single pass:</span> avoids
            doubling cost and latency for limited additional value.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Separate OCR → Direct Gemini:</span> removes an
            unnecessary processing step.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Manual entry → Upload-only:</span> keeps the
            product focused on eliminating manual invoice entry.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-neutral-100">Scale, rollout &amp; future decisions</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-neutral-300 marker:text-neutral-600">
          <li>
            <span className="font-semibold text-neutral-100">Authentication:</span> required before handling
            real company data.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Tracking:</span> measure flags, corrections, and
            confidence to improve the product.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Async processing:</span> move extraction to a
            queue as usage grows.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Duplicate detection:</span> prevent duplicate
            invoice uploads.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Batch uploads:</span> support multiple invoices at
            once.
          </li>
          <li>
            <span className="font-semibold text-neutral-100">Initial rollout:</span> start with one Accounts
            Payable team and validate before expanding.
          </li>
        </ol>
      </section>
    </div>
  );
};

export default DesignPage;
