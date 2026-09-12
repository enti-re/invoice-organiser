import type { LineItem } from "@/app/components/InvoiceReview.types";

export function LineItemRow({ item }: { item: LineItem }) {
  return (
    <tr className="border-b border-neutral-800">
      <td className="py-2 pr-4 text-neutral-100 break-words">{item.description}</td>
      <td className="py-2 pr-4 text-right font-mono text-neutral-300">{item.quantity ?? "—"}</td>
      <td className="py-2 pr-4 text-right font-mono text-neutral-300">{item.unit_price ?? "—"}</td>
      <td className="py-2 pr-0 text-right font-mono text-neutral-100">{item.amount}</td>
    </tr>
  );
}
