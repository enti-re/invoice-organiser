"use client";

import { useState } from "react";

// Render as its own component (rather than inline state in the parent) so
// mounting it fresh per invoice -- via `key={invoice.id}` at the call site --
// naturally resets `fileLoaded` on navigation, instead of the parent having
// to remember to reset it manually.
export const OriginalFilePanel = ({ fileUrl, fileName }: { fileUrl: string; fileName: string }) => {
  const [fileLoaded, setFileLoaded] = useState(false);
  const isPdf = /\.pdf(\?|#|$)/i.test(fileName) || /\.pdf(\?|#|$)/i.test(fileUrl);

  return (
    <div className="flex h-full min-h-[400px] flex-col overflow-hidden border border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-2 text-xs text-neutral-500">
        <span>Original file</span>
        <a href={fileUrl} target="_blank" rel="noreferrer" className="text-neutral-100 underline hover:text-white">
          Open in new tab
        </a>
      </div>
      <div className="relative min-h-[400px] flex-1">
        {!fileLoaded && <div className="absolute inset-0 animate-pulse bg-neutral-800" />}
        {isPdf ? (
          <iframe
            src={fileUrl}
            title="Original invoice file"
            onLoad={() => setFileLoaded(true)}
            className={`h-full min-h-[400px] w-full transition-opacity duration-300 ${
              fileLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote/blob source
          <img
            src={fileUrl}
            alt="Original invoice"
            onLoad={() => setFileLoaded(true)}
            onError={() => setFileLoaded(true)}
            className={`h-full w-full object-contain transition-opacity duration-300 ${
              fileLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}
      </div>
    </div>
  );
};
