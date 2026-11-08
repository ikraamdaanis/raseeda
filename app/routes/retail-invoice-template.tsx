import { createFileRoute } from "@tanstack/react-router";
import { SiteTemplatePage } from "~/components/templates/site-template-page";
import { siteTemplateHead } from "~/utils/site-template-head";

export const Route = createFileRoute("/retail-invoice-template")({
  component: RetailTemplatePage,
  head: () => siteTemplateHead("retail")
});

function RetailTemplatePage() {
  return <SiteTemplatePage id="retail" />;
}
