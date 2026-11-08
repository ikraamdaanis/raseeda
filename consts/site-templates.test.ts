import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PAGE_VIEW_PATHS } from "~/consts/analytics-events";
import { SITE_TEMPLATES } from "~/consts/site-templates";
import { PAGE_META } from "~/utils/site-meta";
import { siteTemplateStructuredData } from "~/utils/structured-data";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

// Each page is listed in places that can't share one list (the service worker
// and the static headers are plain files; the sitemap's list is in the Vite
// config). A page missing from one would go uncached, unhashed or unindexed.
describe.each(SITE_TEMPLATES)("the $id page", template => {
  it("has a route", () => {
    expect(
      existsSync(new URL(`../app/routes${template.path}.tsx`, import.meta.url))
    ).toBe(true);
  });

  it("has its own meta at its own address", () => {
    expect(PAGE_META[template.id].path).toBe(template.path);
    expect(PAGE_META[template.id].image).toBe(
      `https://raseeda.com/og${template.path.replace("/", "-")}.jpg`
    );
  });

  it("has a share card and a picture at every width", () => {
    const file = `../public/og${template.path.replace("/", "-")}.jpg`;

    expect(existsSync(new URL(file, import.meta.url))).toBe(true);

    for (const suffix of ["", "-400", "-600"]) {
      for (const extension of ["webp", "avif"]) {
        const picture = template.src.replace(".webp", `${suffix}.${extension}`);

        expect(
          existsSync(new URL(`../public${picture}`, import.meta.url))
        ).toBe(true);
      }
    }
  });

  it("is counted, cached and in the sitemap", () => {
    expect(PAGE_VIEW_PATHS).toContain(template.path);
    expect(read("scripts/service-worker.js")).toContain(`"${template.path}"`);
    expect(read("vite.config.ts")).toContain(`"${template.path}"`);
  });

  it("names itself in its trail", () => {
    const [, breadcrumb] = siteTemplateStructuredData(template.id)["@graph"];

    expect(breadcrumb.itemListElement?.at(-1)).toMatchObject({
      position: 3,
      name: template.name,
      item: `https://raseeda.com${template.path}`
    });
  });
});

describe("SITE_TEMPLATES", () => {
  it("gives every page its own copy and picture", () => {
    for (const field of ["heading", "intro", "when", "src", "alt"] as const) {
      const values = SITE_TEMPLATES.map(template => template[field]);

      expect(new Set(values).size).toBe(values.length);
    }
  });
});
