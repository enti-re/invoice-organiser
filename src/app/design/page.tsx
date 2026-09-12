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

      <section className="space-y-3 border-t border-neutral-800 pt-10">
        <h2 className="text-xl font-semibold text-neutral-100">Problem statement</h2>
        <p className="text-sm leading-relaxed text-neutral-300">
          An LLM can read an invoice and pull out the fields, but a reviewer still can&apos;t just
          trust it — and re-checking every field by hand defeats the point of automating it. This
          app scores each field&apos;s confidence and flags only what actually looks wrong,
          including documents that aren&apos;t invoices at all.
        </p>
      </section>

      <section className="space-y-8 border-t border-neutral-800 pt-10">
        <h2 className="text-xl font-semibold text-neutral-100">Tech stack &amp; why</h2>

        <div className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Frontend</h3>
          <StackRow items={["Next.js 16 (App Router)", "React", "TypeScript", "Tailwind CSS"]} />
          <ul className="space-y-2 text-sm text-neutral-300">
            <li>
              <span className="text-neutral-100">Next.js App Router</span> — one app for pages and
              API routes, nothing separate to deploy. Considered a separate backend; skipped, not
              needed at this size.
            </li>
            <li>
              <span className="text-neutral-100">No state library</span> — actions save to the server
              and re-render from its response. Considered Redux/React Query; skipped, would just add
              a second copy of data to keep in sync.
            </li>
            <li>
              <span className="text-neutral-100">Custom design system</span> — a small, consistent
              dark theme. Considered a component library; skipped to avoid a borrowed look.
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Backend</h3>
          <StackRow items={["PostgreSQL (Neon)", "Drizzle ORM", "Gemini", "Vercel Blob"]} />
          <ul className="space-y-2 text-sm text-neutral-300">
            <li>
              <span className="text-neutral-100">Typed columns + <code className="text-xs">jsonb</code></span>{" "}
              — vendor, dates, and amounts are real columns; line items and confidence are{" "}
              <code className="text-xs">jsonb</code>, since their shape varies. Considered
              all-<code className="text-xs">jsonb</code>; skipped, loses the ability to query them.
            </li>
            <li>
              <span className="text-neutral-100">One shared schema</span> — the same Zod schema
              drives both extraction and confidence scoring, so they can&apos;t drift apart.
            </li>
            <li>
              <span className="text-neutral-100">Gemini reads documents directly</span> — no OCR step.
              Considered a separate OCR pipeline; skipped, one less thing that can break.
            </li>
            <li>
              <span className="text-neutral-100">Synchronous extraction on upload</span> — simple, and
              fine for one user at a time. First thing to change at scale (see below).
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-3 border-t border-neutral-800 pt-10">
        <h2 className="text-xl font-semibold text-neutral-100">Product &amp; UX decisions</h2>
        <ul className="space-y-2 text-sm text-neutral-300">
          <li>
            <span className="text-neutral-100">Confidence is honest, not decorative</span> — a
            document-level check flags things that aren&apos;t invoices at all. Caught a resume and a
            wedding invite during testing.
          </li>
          <li>
            <span className="text-neutral-100">Flagged fields open inline,</span> right next to the
            number. Tried a tooltip, then a modal — both got in the way; inline won.
          </li>
          <li>
            <span className="text-neutral-100">Loading skeletons match the real layout,</span> so
            nothing shifts once data loads.
          </li>
          <li>
            <span className="text-neutral-100">Mobile has its own layout,</span> not a squeezed-down
            table.
          </li>
        </ul>
      </section>

      <section className="space-y-3 border-t border-neutral-800 pt-10">
        <h2 className="text-xl font-semibold text-neutral-100">What I&apos;d do differently at scale</h2>
        <ul className="space-y-2 text-sm text-neutral-300">
          <li>Move extraction off the upload request, into a queue.</li>
          <li>Add login — right now everyone shares one workspace.</li>
          <li>Detect duplicate uploads.</li>
          <li>Support uploading more than one invoice at a time.</li>
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
