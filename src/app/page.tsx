import Image from "next/image";
import Link from "next/link";

export default function IntroPage() {
  return (
    <div className="relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden px-6 md:px-8">
      <Image
        src="/hero-still-life.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/78 via-black/65 to-black/82" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_640px_320px_at_center,rgba(0,0,0,0.65),transparent_70%)]" />

      <div className="relative mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold text-white tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          Invoice Organiser
        </h1>
        <p className="mt-4 text-base leading-relaxed text-neutral-200 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
          Upload an invoice. AI extracts the fields and flags only those that need review.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/app"
            className="cursor-pointer bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-neutral-200"
          >
            Open the app
          </Link>
          <Link
            href="/design-doc"
            className="cursor-pointer border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-100 hover:border-white"
          >
            Design overview
          </Link>
        </div>
      </div>
    </div>
  );
}
