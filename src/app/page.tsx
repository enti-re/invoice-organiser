import Image from "next/image";
import Link from "next/link";

const DECISIONS_DOC_URL = "https://github.com/enti-re/zamp-invoice-extraction/blob/main/decisions.md";

export default function IntroPage() {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden px-6 md:px-8">
      {/* A 17th-century Dutch still life of scattered papers/ledgers on a desk --
          the actual literal subject matter this product is for (messy documents,
          organized). A grayscale version was tried first for strict consistency
          with the app's monochrome-plus-one-accent system, but it flattened the
          image's own tonal detail and hurt legibility more than the color it
          removed helped -- kept in its natural tones with a dark overlay instead. */}
      <Image
        src="/hero-still-life.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/78 via-black/65 to-black/82" />
      {/* Extra darkening focused behind the text block specifically, rather than
          crushing the whole image again -- keeps the painting's edges/corners
          visible while guaranteeing contrast exactly where it's needed. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_640px_320px_at_center,rgba(0,0,0,0.65),transparent_70%)]" />

      <div className="relative mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          Invoice Organiser
        </h1>
        <p className="mt-4 text-base leading-relaxed text-neutral-200 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
          Upload an invoice, let the LLM extract the fields, and use confidence scoring to flag only
          the fields that need review, rather than blindly trusting AI or manually checking
          everything.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/app"
            className="cursor-pointer bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
          >
            Open the app
          </Link>
          <a
            href={DECISIONS_DOC_URL}
            target="_blank"
            rel="noreferrer"
            className="cursor-pointer border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-100 hover:border-white"
          >
            Read the design doc
          </a>
        </div>
      </div>
    </div>
  );
}
