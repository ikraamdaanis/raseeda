import { createFileRoute } from "@tanstack/react-router";
import { SiteTemplatePage } from "~/components/templates/site-template-page";
import { siteTemplateHead } from "~/utils/site-template-head";

export const Route = createFileRoute("/proforma-invoice-template")({
  component: ProformaInvoiceTemplatePage,
  head: () => siteTemplateHead("proforma-invoice")
});

function ProformaInvoiceTemplatePage() {
  return <SiteTemplatePage id="proforma-invoice" />;
}
