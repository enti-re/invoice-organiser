import Link from "next/link";

function StackBox({ label, title }: { label: string; title: string }) {
  return (
    <div className="min-w-[210px] border border-neutral-800 bg-neutral-900 px-5 py-3.5 text-center">
      <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-neutral-100">{title}</div>
    </div>
  );
}

/** A vertical connector with arrowheads at both ends — every link here is a
 * request/response pair, so the label (when given) states what travels each way
 * rather than leaving the double-headed arrow to speak for itself. */
function VLink({ height = 64, down, up }: { height?: number; down?: string; up?: string }) {
  return (
    <div className="relative flex flex-col items-center" style={{ height }}>
      <div className="h-0 w-0 border-x-4 border-x-transparent border-b-[6px] border-b-neutral-600" />
      <div className="w-px flex-1 bg-neutral-600" />
      <div className="h-0 w-0 border-x-4 border-x-transparent border-t-[6px] border-t-neutral-600" />
      {down && up ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-neutral-950 px-2 py-1 text-center text-[0.65rem] leading-relaxed text-neutral-500">
          <div>
            <span className="text-neutral-300">↓</span> {down}
          </div>
          <div>
            <span className="text-neutral-300">↑</span> {up}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HLink({ width = 150, label }: { width?: number; label: string }) {
  return (
    <div className="relative flex items-center" style={{ width }}>
      <div className="h-0 w-0 border-y-4 border-y-transparent border-r-[6px] border-r-neutral-600" />
      <div className="h-px flex-1 bg-neutral-600" />
      <div className="h-0 w-0 border-y-4 border-y-transparent border-l-[6px] border-l-neutral-600" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-neutral-950 px-2 text-center text-[0.65rem] text-neutral-500">
        {label}
      </div>
    </div>
  );
}

export default function DesignPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-16 md:px-8">
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

        <div className="space-y-2">
          <div className="overflow-x-auto pt-4">
            <div className="flex min-w-[720px] flex-col items-center pb-2">
              <StackBox label="Client" title="Browser" />
              <VLink height={32} />

              <div className="relative w-full max-w-3xl border border-dashed border-neutral-700 px-6 pt-7 pb-6">
                <span className="absolute -top-[0.6rem] left-6 bg-neutral-950 px-2 text-[0.65rem] font-semibold uppercase tracking-wide text-neutral-500">
                  Vercel deployment
                </span>
                <div className="mb-4 text-center text-[0.68rem] font-semibold uppercase tracking-wide text-neutral-500">
                  Application framework — Next.js 16 (App Router)
                </div>

                <div className="flex items-center justify-center">
                  <StackBox label="Client component" title="Pages / UI" />
                  <HLink label="JSON" />
                  <StackBox label="Server" title="API routes" />
                </div>

                <svg viewBox="0 0 760 46" className="mx-auto block h-[46px] w-full max-w-3xl">
                  <defs>
                    {/* points backward along the path, so at a path's start point (with the path
                        drawn downward) it points up — used only on the API routes stub, to show
                        responses flowing back up */}
                    <marker
                      id="stackArrowBoth"
                      viewBox="0 0 10 10"
                      refX="5"
                      refY="5"
                      markerWidth="7"
                      markerHeight="7"
                      orient="auto-start-reverse"
                    >
                      <path d="M0,0 L10,5 L0,10 Z" fill="#525252" />
                    </marker>
                    {/* points forward along the path — used on each branch's drop into its box */}
                    <marker
                      id="stackArrowFwd"
                      viewBox="0 0 10 10"
                      refX="5"
                      refY="5"
                      markerWidth="7"
                      markerHeight="7"
                      orient="auto"
                    >
                      <path d="M0,0 L10,5 L0,10 Z" fill="#525252" />
                    </marker>
                  </defs>
                  <g fill="none" stroke="#525252" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                    {/* stub down from API routes (not the row's midpoint) to the shared spine */}
                    <path d="M570 2 V14" markerStart="url(#stackArrowBoth)" />

                    {/* shared spine — plain wire routing, not a connection of its own */}
                    <path d="M127 14 H633" />

                    {/* three drops from the spine into each service box */}
                    <path d="M127 14 V38" markerEnd="url(#stackArrowFwd)" />
                    <path d="M380 14 V38" markerEnd="url(#stackArrowFwd)" />
                    <path d="M633 14 V38" markerEnd="url(#stackArrowFwd)" />
                  </g>
                </svg>

                <div className="grid grid-cols-3 gap-4">
                  <StackBox label="AI / extraction" title="Vercel AI SDK" />
                  <StackBox label="Data" title="PostgreSQL (Neon)" />
                  <StackBox label="File storage" title="Vercel Blob" />
                </div>
              </div>
            </div>
          </div>
        </div>

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
}
