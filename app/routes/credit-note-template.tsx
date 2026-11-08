import { createFileRoute } from "@tanstack/react-router";
import { SiteTemplatePage } from "~/components/templates/site-template-page";
import { siteTemplateHead } from "~/utils/site-template-head";

export const Route = createFileRoute("/credit-note-template")({
  component: CreditNoteTemplatePage,
  head: () => siteTemplateHead("credit-note")
});

function CreditNoteTemplatePage() {
  return <SiteTemplatePage id="credit-note" />;
}
