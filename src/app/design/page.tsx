import Link from "next/link";

const DECISIONS_DOC_URL = "https://github.com/enti-re/zamp-invoice-extraction/blob/main/decisions.md";

function FlowBox({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="flex-1 border border-neutral-800 bg-neutral-900 px-4 py-3 text-center">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-100">{label}</div>
      <div className="mt-1 text-xs text-neutral-500">{detail}</div>
    </div>
  );
}

function Arrow() {
  return <div className="hidden shrink-0 self-center px-1 text-neutral-700 md:block">→</div>;
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

      <section className="space-y-4">
        <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          How a document moves through the system
        </h2>
        <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
          <FlowBox label="Upload" detail="PDF / image" />
          <Arrow />
          <FlowBox label="Extraction" detail="Gemini, structured output" />
          <Arrow />
          <FlowBox label="Confidence scoring" detail="4 honest signals" />
          <Arrow />
          <FlowBox label="Postgres + Blob" detail="typed cols + jsonb" />
          <Arrow />
          <FlowBox label="Review UI" detail="only flags need a look" />
        </div>
      </section>

      <section className="space-y-4 border-t border-neutral-800 pt-10">
        <h2 className="text-xl font-semibold text-neutral-100">1. Product thinking &amp; UI/UX</h2>
        <p className="text-sm text-neutral-400">
          The actual bet this project makes: don&apos;t blindly trust the AI, and don&apos;t make a
          human re-check everything either — surface exactly what&apos;s uncertain, nothing else.
        </p>
        <ul className="space-y-2 text-sm text-neutral-300">
          <li>
            <span className="text-neutral-100">Confidence is honest, not performative.</span>{" "}
            Three field-level signals (model told to say &quot;null&quot; rather than guess,
            deterministic math/format checks, model self-reported ambiguity) plus a document-level
            check (&quot;is this even an invoice?&quot;) — caught a resume and a wedding invitation
            during real testing that field-level checks alone would have missed.
          </li>
          <li>
            <span className="text-neutral-100">Reviewer interaction, iterated live.</span> The
            flagged-field control went through four real versions (always-visible text →
            hover-tooltip → modal → inline accordion) — each one shipped, tested by actually clicking
            through it, and replaced when it didn&apos;t hold up. The inline accordion won because it
            stays anchored to the exact number it&apos;s about, with no overlay and no hover
            fragility.
          </li>
          <li>
            <span className="text-neutral-100">Loading states as a real design surface, not an
            afterthought.</span> Every skeleton is sized from the real rendered DOM
            (<code className="text-xs">getBoundingClientRect</code>), not guessed — measured to
            avoid layout shift when real data replaces it, on both the list and the review page.
          </li>
          <li>
            <span className="text-neutral-100">Mobile is a real second layout,</span> not a
            horizontally-scrolling table — the deployed link is realistically opened on a phone first.
          </li>
        </ul>
      </section>

      <section className="space-y-4 border-t border-neutral-800 pt-10">
        <h2 className="text-xl font-semibold text-neutral-100">2. Frontend</h2>
        <ul className="space-y-2 text-sm text-neutral-300">
          <li>
            <span className="text-neutral-100">Next.js App Router + React + TypeScript,</span>{" "}
            one deployable app — no separate frontend/backend services for a project this size.
          </li>
          <li>
            <span className="text-neutral-100">No global state library.</span> Component-local state
            throughout; confirm/edit actions patch the server and update from the response, rather
            than maintaining a separate client cache to keep in sync.
          </li>
          <li>
            <span className="text-neutral-100">A real, custom design system.</span> Monochrome dark
            theme, one functional accent color (red, reserved strictly for &quot;needs
            attention&quot;), sharp corners, no UI-component-library dependency — a custom date
            picker and every skeleton/icon are hand-built and match the rest of the app exactly.
          </li>
          <li>
            <span className="text-neutral-100">Debounced live search,</span> optimistic-feeling
            confirm/edit, visible progress feedback (spinners, indeterminate progress bar) on every
            action that can take more than an instant.
          </li>
        </ul>
      </section>

      <section className="space-y-4 border-t border-neutral-800 pt-10">
        <h2 className="text-xl font-semibold text-neutral-100">3. Backend</h2>
        <ul className="space-y-2 text-sm text-neutral-300">
          <li>
            <span className="text-neutral-100">Postgres (Neon) via Drizzle ORM</span> — strict typed
            columns for fixed-shape fields (vendor, dates, amounts), <code className="text-xs">jsonb</code>{" "}
            only for the naturally variable-shaped data (line items, the confidence map).
          </li>
          <li>
            <span className="text-neutral-100">Gemini via the Vercel AI SDK&apos;s{" "}
            <code className="text-xs">generateObject</code>,</span> one Zod schema shared between the
            extraction call&apos;s structured output and the confidence-computation logic, so they
            can&apos;t drift apart.
          </li>
          <li>
            <span className="text-neutral-100">Vercel Blob</span> for the original uploaded files,
            referenced by URL from the invoice row.
          </li>
          <li>
            <span className="text-neutral-100">Every failure point handled specifically</span> —
            blob upload, extraction, DB write each return a distinct error, not one generic 500.
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
