import type { ReactNode } from "react";
import Link from "next/link";

const DECISIONS_DOC_URL = "https://github.com/enti-re/zamp-invoice-extraction/blob/main/decisions.md";

function StackBox({ label, title, detail }: { label: string; title: string; detail: ReactNode }) {
  return (
    <div className="min-w-[210px] border border-neutral-800 bg-neutral-900 px-5 py-3.5 text-center">
      <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-neutral-100">{title}</div>
      <div className="mt-1 text-xs leading-relaxed text-neutral-400">{detail}</div>
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

function HLink({ width = 150, left, right }: { width?: number; left: string; right: string }) {
  return (
    <div className="relative flex items-center" style={{ width }}>
      <div className="h-0 w-0 border-y-4 border-y-transparent border-r-[6px] border-r-neutral-600" />
      <div className="h-px flex-1 bg-neutral-600" />
      <div className="h-0 w-0 border-y-4 border-y-transparent border-l-[6px] border-l-neutral-600" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-neutral-950 px-2 text-center text-[0.65rem] text-neutral-500">
        <span className="text-neutral-300">→</span> {left} &nbsp;&nbsp; <span className="text-neutral-300">←</span> {right}
      </div>
    </div>
  );
}

function StackRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function DesignPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-14 px-6 py-16 md:px-8">
      <header className="space-y-3">
        <Link href="/" className="text-sm text-neutral-100 underline hover:text-white">
          ← Back
        </Link>
        <h1 className="text-3xl font-semibold text-neutral-100 tracking-tight">Design overview</h1>
        <p className="max-w-2xl text-base leading-relaxed text-neutral-400">
          A short, visual summary — not a replacement for{" "}
          <a
            href={DECISIONS_DOC_URL}
            target="_blank"
            rel="noreferrer"
            className="text-neutral-100 underline hover:text-white"
          >
            decisions.md
          </a>
          , which is the full log of every real decision, alternative, and cut. This page is the
          10-minute version.
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          How a request moves through the stack
        </h2>
        <p className="text-xs text-neutral-600">
          Every arrow runs both ways — a call down, its data back up. Everything inside the dashed
          boundary is one deployment on Vercel.
        </p>

        <div className="overflow-x-auto pt-4">
          <div className="flex min-w-[720px] flex-col items-center pb-2">
            <StackBox label="Client" title="Browser" detail="React 19 · TypeScript · Tailwind CSS" />
            <VLink height={60} down="page load / fetch()" up="HTML, JSON" />

            <div className="relative w-full max-w-3xl border border-dashed border-neutral-700 px-6 pt-7 pb-6">
              <span className="absolute -top-[0.6rem] left-6 bg-neutral-950 px-2 text-[0.65rem] font-semibold uppercase tracking-wide text-neutral-500">
                Vercel deployment
              </span>
              <div className="mb-4 text-center text-[0.68rem] font-semibold uppercase tracking-wide text-neutral-500">
                Application framework — Next.js 16 (App Router)
              </div>

              <div className="flex items-center justify-center">
                <StackBox
                  label="Client component"
                  title="Pages / UI"
                  detail={
                    <>
                      / , /app, /design,
                      <br />
                      /invoices/[id]
                    </>
                  }
                />
                <HLink left="fetch()" right="JSON" />
                <StackBox
                  label="Server"
                  title="API routes"
                  detail={
                    <>
                      <code className="text-[0.7rem]">/api/invoices</code>
                      <br />
                      upload · list · get · patch · delete
                    </>
                  }
                />
              </div>

              <div className="mx-auto h-4 w-px bg-neutral-600" />

              <svg viewBox="0 0 760 46" className="mx-auto block h-[46px] w-full max-w-3xl">
                <defs>
                  {/* used on the center branch's two ends — reversed at the start so it points
                      back up toward API routes, forward at the end so it points down into the box */}
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
                  {/* used everywhere else — always points forward along the path, so a
                      leftward segment gets a left-pointing arrow and a downward one gets a
                      down-pointing arrow, instead of stacking arrows at the branch point */}
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
                  {/* center: API routes <-> Postgres, up into the box / down out of it */}
                  <path d="M380 2 V38" markerStart="url(#stackArrowBoth)" markerEnd="url(#stackArrowBoth)" />

                  {/* left branch: turns left toward AI, then drops down into the box */}
                  <path d="M380 14 H127" markerEnd="url(#stackArrowFwd)" />
                  <path d="M127 14 V38" markerEnd="url(#stackArrowFwd)" />

                  {/* right branch: turns right toward file storage, then drops down */}
                  <path d="M380 14 H633" markerEnd="url(#stackArrowFwd)" />
                  <path d="M633 14 V38" markerEnd="url(#stackArrowFwd)" />
                </g>
              </svg>

              <div className="grid grid-cols-3 gap-4">
                <StackBox
                  label="AI / extraction"
                  title="Vercel AI SDK"
                  detail={
                    <>
                      <code className="text-[0.7rem]">generateObject()</code>
                      <br />
                      Google Gemini · Zod schema
                    </>
                  }
                />
                <StackBox
                  label="Data"
                  title="Drizzle ORM"
                  detail={
                    <>
                      Neon Postgres
                      <br />
                      typed columns + <code className="text-[0.7rem]">jsonb</code>
                    </>
                  }
                />
                <StackBox
                  label="File storage"
                  title="Vercel Blob"
                  detail={
                    <>
                      original invoice
                      <br />
                      PDFs &amp; images
                    </>
                  }
                />
              </div>
            </div>

            <div className="mt-6 text-center text-xs text-neutral-500">
              Tooling: <span className="text-neutral-300">Vitest</span> (tests) ·{" "}
              <span className="text-neutral-300">ESLint</span> · <span className="text-neutral-300">pnpm</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 border-t border-neutral-800 pt-10">
        <h2 className="text-xl font-semibold text-neutral-100">1. Problem framing</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          An LLM extraction is only useful if a reviewer can trust it without re-checking every
          field by hand — and it&apos;s only safe if they don&apos;t trust it blindly either. Most
          &quot;AI extraction&quot; tools pick one of those two failure modes: either the confidence
          number is decorative and everyone re-checks everything anyway, or nothing is flagged and
          wrong data slips straight into the record. The actual design problem here is making
          confidence <em>mean</em> something — narrow enough that a reviewer only looks at what&apos;s
          genuinely uncertain, honest enough that &quot;not flagged&quot; is a real guarantee, not an
          optimistic default.
        </p>
        <p className="text-sm leading-relaxed text-neutral-300">
          That problem doesn&apos;t stop at individual fields. Field-level checks alone couldn&apos;t
          catch the wrong <em>kind</em> of document — a resume run through the extractor came back
          with plausible-shaped nulls and would have quietly passed. That gap only surfaced from
          testing with real adversarial input, not from the spec, which is why a document-level
          &quot;is this even an invoice&quot; check exists as its own signal rather than being folded
          into the field checks.
        </p>
      </section>

      <section className="space-y-8 border-t border-neutral-800 pt-10">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-neutral-100">2. Key decisions &amp; tradeoffs</h2>
          <p className="text-sm text-neutral-400">
            Framed as what was chosen over what, and why — the alternatives were real options, not
            straw men.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Frontend</h3>
          <StackRow items={["Next.js 16 (App Router)", "React", "TypeScript", "Tailwind CSS"]} />
          <ul className="space-y-3 text-sm text-neutral-300">
            <li>
              <span className="text-neutral-100">Inline accordion over a hover-tooltip or a modal,</span>{" "}
              for the flagged-field review control. Both alternatives shipped and were actually
              clicked through first: the tooltip fought its own hover state (moving toward the hint
              text dismissed it), and a modal disconnected the flag from the number it was about. The
              accordion stays anchored to the exact field, with no overlay and nothing to lose focus
              on.
            </li>
            <li>
              <span className="text-neutral-100">No global state library, over a client cache.</span>{" "}
              Confirm/edit actions patch the server directly and re-render from its response.
              Redux/Zustand/React Query would add a second source of truth to keep in sync for data
              that&apos;s already server-owned — the wrong cost for this surface area, though it
              would start to matter if the app grew multiple views sharing the same live data.
            </li>
            <li>
              <span className="text-neutral-100">Hand-built design system, over a component library.</span>{" "}
              Buys a monochrome-plus-one-accent look with nothing borrowed from a UI kit, at the cost
              of building and maintaining every skeleton, icon, and the date picker by hand — a
              tradeoff that stops paying off past a certain surface area.
            </li>
            <li>
              <span className="text-neutral-100">Measured skeletons, over guessed placeholder shapes.</span>{" "}
              Every loading state is sized from the real rendered DOM (
              <code className="text-xs">getBoundingClientRect</code>) instead of an approximate box,
              so nothing shifts when data arrives — more upfront effort per skeleton, worth it because
              layout shift on a data-review page directly undermines trust in the data itself.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Backend</h3>
          <StackRow items={["PostgreSQL (Neon)", "Drizzle ORM", "Gemini", "Vercel Blob"]} />
          <ul className="space-y-3 text-sm text-neutral-300">
            <li>
              <span className="text-neutral-100">Typed columns for fixed-shape fields, <code className="text-xs">jsonb</code> only where the shape genuinely varies,</span>{" "}
              over an all-<code className="text-xs">jsonb</code> or all-typed schema. Vendor, dates,
              amounts, and tax stay indexable and queryable columns; line items and the confidence map
              are <code className="text-xs">jsonb</code> because forcing them into fixed columns would
              mean a migration every time an invoice&apos;s shape doesn&apos;t match the last one.
            </li>
            <li>
              <span className="text-neutral-100">One schema shared between extraction and scoring,</span>{" "}
              over two separately maintained ones. The same Zod schema drives Gemini&apos;s structured
              output and the confidence-computation logic, so a field added to one can&apos;t silently
              stop being checked by the other.
            </li>
            <li>
              <span className="text-neutral-100">Native document understanding, over a separate OCR
              step.</span> Gemini reads the PDF/image directly via the Vercel AI SDK&apos;s{" "}
              <code className="text-xs">generateObject</code> — one fewer moving part and one fewer
              place for text to get mangled before extraction even starts.
            </li>
            <li>
              <span className="text-neutral-100">Synchronous extraction on upload, over a background
              job queue.</span> The upload request blocks until Gemini returns, which is simple and
              was the right call for something demoed and tested by one person at a time — the first
              thing that would need to change under real load (see below).
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4 border-t border-neutral-800 pt-10">
        <h2 className="text-xl font-semibold text-neutral-100">3. What I&apos;d do differently at scale</h2>
        <p className="text-sm text-neutral-400">
          Named honestly rather than pretending this is a finished product — these are the specific
          things that would break or become wrong first under real usage, not a generic roadmap.
        </p>
        <ul className="space-y-2 text-sm text-neutral-300">
          <li>
            <span className="text-neutral-100">Move extraction off the request path.</span> A
            synchronous Gemini call inside the upload request works for one user at a time; a queue
            (upload → enqueue → poll or stream status) would stop a slow or rate-limited extraction
            from holding a connection open, and would let uploads degrade gracefully under load
            instead of timing out.
          </li>
          <li>
            <span className="text-neutral-100">Add auth and per-user/org data isolation.</span> There
            is currently one implicit shared workspace and no login — the right call for a
            single-reviewer test, not for multiple real companies&apos; invoices in the same table.
          </li>
          <li>
            <span className="text-neutral-100">Duplicate-upload detection</span> — nothing today stops
            the same invoice being uploaded twice and creating two rows; needs a real decision on what
            &quot;the same invoice&quot; means (exact file vs. same vendor+invoice number) before it&apos;s
            worth building.
          </li>
          <li>
            <span className="text-neutral-100">Batch upload,</span> with per-file status and
            partial-failure handling — today&apos;s one-file-at-a-time flow was the right scope for
            this submission, not the right ceiling for a real tool.
          </li>
        </ul>
      </section>

      <div className="border-t border-neutral-800 pt-8 text-sm text-neutral-500">
        Every decision above — including the ones later reversed — is reasoned through in full in{" "}
        <a
          href={DECISIONS_DOC_URL}
          target="_blank"
          rel="noreferrer"
          className="text-neutral-100 underline hover:text-white"
        >
          decisions.md
        </a>
        .
      </div>
    </div>
  );
}
