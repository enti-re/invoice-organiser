const StackBox = ({ label, title }: { label: string; title: string }) => {
  return (
    <div className="min-w-[210px] border border-neutral-800 bg-neutral-900 px-5 py-3.5 text-center">
      <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-neutral-100">{title}</div>
    </div>
  );
};

// Every link is a request/response pair, so the label states what travels
// each way rather than leaving the double-headed arrow to speak for itself.
const VLink = ({ height = 64, down, up }: { height?: number; down?: string; up?: string }) => {
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
};

const HLink = ({ width = 150, label }: { width?: number; label: string }) => {
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
};

export const ArchitectureDiagram = () => {
  return (
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
  );
};
