import { createFileRoute } from "@tanstack/react-router";
import { SiteTemplatePage } from "~/components/templates/site-template-page";
import { siteTemplateHead } from "~/utils/site-template-head";

export const Route = createFileRoute("/quote-template")({
  component: QuoteTemplatePage,
  head: () => siteTemplateHead("quote")
});

function QuoteTemplatePage() {
  return <SiteTemplatePage id="quote" />;
}
