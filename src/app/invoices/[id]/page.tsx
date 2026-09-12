import { InvoiceReview } from "@/app/components/invoice-review/InvoiceReview";

const InvoicePage = async (props: PageProps<"/invoices/[id]">) => {
  const { id } = await props.params;
  return <InvoiceReview id={id} />;
};

export default InvoicePage;
