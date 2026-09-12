import { InvoiceReview } from "@/app/components/invoice-review/InvoiceReview";

export default async function InvoicePage(props: PageProps<"/invoices/[id]">) {
  const { id } = await props.params;
  return <InvoiceReview id={id} />;
}
