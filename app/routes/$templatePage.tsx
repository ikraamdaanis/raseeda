import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteTemplatePage } from "~/components/templates/site-template-page";
import { SITE_TEMPLATES } from "~/consts/site-templates";
import { siteTemplateHead } from "~/utils/site-template-head";

// Every site template page (consts/site-templates.ts), at its own address.
// Any other slug is not found. The fixed routes (/create, /privacy,
// /invoice-template) rank above this one, so it never shadows them.
export const Route = createFileRoute("/$templatePage")({
  loader: ({ params }) => {
    const template = SITE_TEMPLATES.find(
      siteTemplate => siteTemplate.path === `/${params.templatePage}`
    );

    if (!template) throw notFound();

    return template.id;
  },
  head: ({ loaderData }) => (loaderData ? siteTemplateHead(loaderData) : {}),
  component: TemplatePage
});

function TemplatePage() {
  const id = Route.useLoaderData();

  return <SiteTemplatePage id={id} />;
}
