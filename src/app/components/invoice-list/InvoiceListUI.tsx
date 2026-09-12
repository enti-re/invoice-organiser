import type { SortDirection } from "@/app/components/invoice-list/InvoiceList.types";

export function StatusBadge({ needsReview }: { needsReview: boolean }) {
  // Both states share the same pill shape; only color signals the difference.
  // Per-field detail lives on the review page, not here.
  if (needsReview) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400 border border-red-500/40">
        Needs review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-neutral-500 border border-neutral-800">
      Reviewed
    </span>
  );
}

export function SortIndicator({ direction }: { direction: SortDirection }) {
  return <span className="text-red-400">{direction === "asc" ? "▲" : "▼"}</span>;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-800 ${className}`} />;
}

// Placeholder heights are measured from real rendered content, not guessed
// -- text-xs is a 12px font but a 16px line-height, so its placeholder is
// h-4, not h-3. This is what prevents layout shift (CLS).
export function SkeletonRow() {
  return (
    <tr className="border-b border-neutral-800 last:border-0">
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-5 w-32" />
      </td>
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-5 w-20" />
      </td>
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-5 w-24" />
      </td>
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-5 w-16" />
      </td>
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-5 w-6" />
      </td>
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-[22px] w-24 rounded-full" />
      </td>
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-[26px] w-20" />
      </td>
      <td className="py-3 pr-4">
        <SkeletonBlock className="h-4 w-4" />
      </td>
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="border border-neutral-800 p-4 space-y-2">
      <div>
        <SkeletonBlock className="h-6 w-32" />
        <SkeletonBlock className="h-7 w-28" />
      </div>
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-5 w-20" />
        <SkeletonBlock className="h-[22px] w-24 rounded-full" />
      </div>
      <SkeletonBlock className="h-5 w-24" />
      <SkeletonBlock className="h-[38px] w-full" />
    </div>
  );
}
