import type { SiteTemplateId } from "~/types";
import { canonicalLink, PAGE_META, siteMeta } from "~/utils/site-meta";
import {
  jsonLdScript,
  siteTemplateStructuredData
} from "~/utils/structured-data";

// A site template page's `head()`: its own title, description, share card,
// canonical address and structured data.
export function siteTemplateHead(id: SiteTemplateId) {
  return {
    meta: siteMeta(PAGE_META[id]),
    links: [canonicalLink(PAGE_META[id].path)],
    scripts: [jsonLdScript(siteTemplateStructuredData(id))]
  };
}
