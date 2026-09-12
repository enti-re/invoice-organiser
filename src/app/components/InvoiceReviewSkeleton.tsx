// Placeholder heights are measured from real rendered content, not
// guessed -- e.g. text-xs is a 12px font but a 16px line-height, so its
// placeholder is h-4, not h-3. This is what prevents layout shift (CLS)
// when real data replaces the skeleton.
export function InvoiceReviewSkeleton() {
  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl px-6 py-12 md:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 animate-pulse bg-neutral-800" />
        <div className="h-[30px] w-28 animate-pulse bg-neutral-800" />
      </div>
      {/* showOriginal defaults to true, so the loaded page will almost
          always render this two-column grid -- matching it here (instead
          of a single column that suddenly grows a second one once data
          arrives) avoids the card visibly shrinking/shifting left the
          moment the original-file panel pops in. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-6 border border-neutral-800 bg-neutral-900 p-6 md:p-8">
          <div className="flex flex-col gap-4 border-b border-neutral-800 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="h-8 w-48 animate-pulse bg-neutral-800" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-0.5">
                  <div className="h-4 w-16 animate-pulse bg-neutral-800" />
                  <div className="h-5 w-24 animate-pulse bg-neutral-800" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="h-4 w-20 animate-pulse bg-neutral-800" />
            {/* Column %s match the real table-fixed widths exactly, so nothing
                drifts between skeleton and real content at any viewport width. */}
            <div className="mt-3 grid grid-cols-[52%_12%_18%_18%] border-b border-neutral-800 py-2 pr-0">
              <div className="h-4 w-3/4 animate-pulse bg-neutral-800" />
              <div className="ml-auto h-4 w-6 animate-pulse bg-neutral-800" />
              <div className="ml-auto h-4 w-10 animate-pulse bg-neutral-800" />
              <div className="ml-auto h-4 w-10 animate-pulse bg-neutral-800" />
            </div>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[52%_12%_18%_18%] border-b border-neutral-800 py-2.5 pr-0">
                <div className="h-4 w-full max-w-[85%] animate-pulse bg-neutral-800" />
                <div className="ml-auto h-4 w-6 animate-pulse bg-neutral-800" />
                <div className="ml-auto h-4 w-10 animate-pulse bg-neutral-800" />
                <div className="ml-auto h-4 w-12 animate-pulse bg-neutral-800" />
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t border-neutral-800 pt-4">
            <div className="w-full max-w-xs space-y-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="ml-auto space-y-0.5">
                  <div className="ml-auto h-4 w-16 animate-pulse bg-neutral-800" />
                  <div className="ml-auto h-5 w-24 animate-pulse bg-neutral-800" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex h-full min-h-[400px] flex-col overflow-hidden border border-neutral-800 bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-2">
            <div className="h-4 w-20 animate-pulse bg-neutral-800" />
            <div className="h-4 w-24 animate-pulse bg-neutral-800" />
          </div>
          <div className="min-h-[400px] flex-1 animate-pulse bg-neutral-800" />
        </div>
      </div>
    </div>
  );
}
