import { createFileRoute } from "@tanstack/react-router";
import { SiteTemplatePage } from "~/components/templates/site-template-page";
import { siteTemplateHead } from "~/utils/site-template-head";

export const Route = createFileRoute("/receipt-template")({
  component: ReceiptTemplatePage,
  head: () => siteTemplateHead("receipt")
});

function ReceiptTemplatePage() {
  return <SiteTemplatePage id="receipt" />;
}
