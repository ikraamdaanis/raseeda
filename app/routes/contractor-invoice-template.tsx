import { createFileRoute } from "@tanstack/react-router";
import { SiteTemplatePage } from "~/components/templates/site-template-page";
import { siteTemplateHead } from "~/utils/site-template-head";

export const Route = createFileRoute("/contractor-invoice-template")({
  component: ContractorTemplatePage,
  head: () => siteTemplateHead("contractor")
});

function ContractorTemplatePage() {
  return <SiteTemplatePage id="contractor" />;
}
