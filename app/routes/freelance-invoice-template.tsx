import { createFileRoute } from "@tanstack/react-router";
import { SiteTemplatePage } from "~/components/templates/site-template-page";
import { siteTemplateHead } from "~/utils/site-template-head";

export const Route = createFileRoute("/freelance-invoice-template")({
  component: FreelanceTemplatePage,
  head: () => siteTemplateHead("freelance")
});

function FreelanceTemplatePage() {
  return <SiteTemplatePage id="freelance" />;
}
