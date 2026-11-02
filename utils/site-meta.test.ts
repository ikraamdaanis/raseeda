import { describe, expect, it } from "vitest";
import { INVOICE_TEMPLATES } from "~/components/templates/invoice-templates";
import { APP_NAME } from "~/consts/app";
import {
  PAGE_META,
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_OG_IMAGE,
  SITE_TITLE,
  canonicalLink,
  siteMeta
} from "~/utils/site-meta";
import {
  HOME_STRUCTURED_DATA,
  TEMPLATES_STRUCTURED_DATA,
  jsonLdScript,
  privacyStructuredData
} from "~/utils/structured-data";

function findMeta(meta: ReturnType<typeof siteMeta>, key: string) {
  return meta.find(
    entry =>
      ("name" in entry && entry.name === key) ||
      ("property" in entry && entry.property === key)
  );
}

describe("siteMeta", () => {
  const meta = siteMeta();

  function findByName(name: string) {
    return meta.find(entry => "name" in entry && entry.name === name);
  }

  function findByProperty(property: string) {
    return meta.find(
      entry => "property" in entry && entry.property === property
    );
  }

  it("leads the title with the search phrase and ends with the name", () => {
    const titleEntry = meta.find(entry => "title" in entry);

    expect(titleEntry).toEqual({ title: SITE_TITLE });
    expect(SITE_TITLE.startsWith("Free Invoice Generator")).toBe(true);
    expect(SITE_TITLE.endsWith(` | ${APP_NAME}`)).toBe(true);
  });

  it("lets search show large image previews by default", () => {
    expect(findByName("robots")?.content).toBe("max-image-preview:large");
  });

  it("names the locale the copy is written in", () => {
    expect(findByProperty("og:locale")?.content).toBe(SITE_LOCALE);
    expect(SITE_LOCALE).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
  });

  it("includes a non-empty meta description", () => {
    const description = findByName("description");

    expect(description?.content).toBe(SITE_DESCRIPTION);
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(0);
  });

  it("includes the core Open Graph tags", () => {
    expect(findByProperty("og:type")?.content).toBe("website");
    expect(findByProperty("og:title")?.content).toBe(SITE_TITLE);
    expect(findByProperty("og:description")?.content).toBe(SITE_DESCRIPTION);
    expect(findByProperty("og:url")?.content).toMatch(/^https:\/\//);
    expect(findByProperty("og:image")?.content).toMatch(
      /^https:\/\/.+\.(png|jpe?g)$/
    );
  });

  it("includes Twitter card tags with an absolute image", () => {
    expect(findByName("twitter:card")?.content).toBe("summary_large_image");
    expect(findByName("twitter:title")?.content).toBe(SITE_TITLE);
    expect(findByName("twitter:description")?.content).toBe(SITE_DESCRIPTION);
    expect(findByName("twitter:image")?.content).toMatch(/^https:\/\//);
  });

  it("keeps the description short enough not to be cut off in previews", () => {
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(125);
  });

  it("points og:url at the page it describes", () => {
    const pageMeta = siteMeta({
      path: "/create",
      title: "Create",
      description: "Make one."
    });
    const ogUrl = pageMeta.find(
      entry => "property" in entry && entry.property === "og:url"
    );
    const pageTitle = pageMeta.find(entry => "title" in entry);

    expect(ogUrl?.content).toBe("https://raseeda.com/create");
    expect(pageTitle).toEqual({ title: "Create" });
  });
});

describe("canonicalLink", () => {
  it("gives an absolute address with no query string", () => {
    expect(canonicalLink("/")).toEqual({
      rel: "canonical",
      href: "https://raseeda.com/"
    });
    expect(canonicalLink("/create").href).toBe("https://raseeda.com/create");
  });
});

describe("PAGE_META", () => {
  const pages = Object.values(PAGE_META);

  it("gives every page its own title and description", () => {
    expect(new Set(pages.map(page => page.title)).size).toBe(pages.length);
    expect(new Set(pages.map(page => page.description)).size).toBe(
      pages.length
    );
  });

  it("ends every title with the name", () => {
    for (const page of pages) {
      expect(page.title.endsWith(` | ${APP_NAME}`)).toBe(true);
    }
  });

  it("keeps every description short enough not to be cut off", () => {
    for (const page of pages) {
      expect(page.description.length).toBeLessThanOrEqual(125);
    }
  });

  it("keeps the share and Twitter titles in step with the page title", () => {
    for (const page of pages) {
      const pageMeta = siteMeta(page);

      expect(findMeta(pageMeta, "og:title")?.content).toBe(page.title);
      expect(findMeta(pageMeta, "twitter:title")?.content).toBe(page.title);
      expect(findMeta(pageMeta, "og:url")?.content).toBe(
        `https://raseeda.com${page.path}`
      );
    }
  });

  it("keeps the editor out of search results", () => {
    const createMeta = siteMeta(PAGE_META.create);

    expect(findMeta(createMeta, "robots")?.content).toBe("noindex");
  });

  it("lets every other page be indexed with large image previews", () => {
    for (const page of [
      PAGE_META.home,
      PAGE_META.templates,
      PAGE_META.privacy
    ]) {
      expect(findMeta(siteMeta(page), "robots")?.content).toBe(
        "max-image-preview:large"
      );
    }
  });

  it("gives the template gallery its own share image and alt text", () => {
    const templatesMeta = siteMeta(PAGE_META.templates);
    const image = findMeta(templatesMeta, "og:image")?.content;

    expect(image).toBe("https://raseeda.com/og-invoice-template.jpg");
    expect(image).not.toBe(SITE_OG_IMAGE);
    expect(findMeta(templatesMeta, "twitter:image")?.content).toBe(image);
    expect(findMeta(templatesMeta, "og:image:alt")?.content).toBe(
      PAGE_META.templates.imageAlt
    );
    expect(findMeta(templatesMeta, "twitter:image:alt")?.content).toBe(
      PAGE_META.templates.imageAlt
    );
  });
});

describe("structured data", () => {
  const homeGraph = HOME_STRUCTURED_DATA["@graph"];
  const homeIds = new Set(homeGraph.map(node => node["@id"]));

  function findNode(graph: Record<string, unknown>[], type: string) {
    return graph.find(node => node["@type"] === type);
  }

  it("offers the domain as the site's alternate name", () => {
    expect(findNode(homeGraph, "WebSite")?.alternateName).toBe("raseeda.com");
  });

  it("names the maker as a person, not a handle", () => {
    const person = findNode(homeGraph, "Person");

    expect(person?.name).toBe("Ikraam");
    expect(person?.name).not.toMatch(/\|/);
  });

  describe("template gallery", () => {
    const graph = TEMPLATES_STRUCTURED_DATA["@graph"];
    const page = graph[0];
    const breadcrumb = graph[1];

    it("is a collection page of the site, published by its organization", () => {
      expect(page["@type"]).toBe("CollectionPage");
      expect(page.url).toBe("https://raseeda.com/invoice-template");
      expect(homeIds.has(page.isPartOf["@id"])).toBe(true);
      expect(homeIds.has(page.publisher["@id"])).toBe(true);
      expect(page.breadcrumb["@id"]).toBe(breadcrumb["@id"]);
      expect(page.primaryImageOfPage.url).toBe(PAGE_META.templates.image);
    });

    it("lists each template in order, at its card's anchor", () => {
      const items = page.mainEntity.itemListElement;

      expect(page.mainEntity.numberOfItems).toBe(INVOICE_TEMPLATES.length);
      expect(items).toHaveLength(INVOICE_TEMPLATES.length);

      items.forEach((listItem, index) => {
        const template = INVOICE_TEMPLATES[index];

        expect(listItem.position).toBe(index + 1);
        expect(listItem.item.url).toBe(
          `https://raseeda.com/invoice-template#${template.id}`
        );
        expect(listItem.item.name).toBe(`${template.name} invoice template`);
        expect(listItem.item.image).toBe(`https://raseeda.com${template.src}`);
      });
    });

    it("has a breadcrumb trail from the homepage", () => {
      expect(breadcrumb["@type"]).toBe("BreadcrumbList");
      expect(breadcrumb.itemListElement).toEqual([
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://raseeda.com/"
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Invoice templates",
          item: "https://raseeda.com/invoice-template"
        }
      ]);
    });
  });

  it("dates the privacy page and ties it to the site", () => {
    const privacy = privacyStructuredData("2026-11-01");

    expect(privacy["@type"]).toBe("WebPage");
    expect(privacy.url).toBe("https://raseeda.com/privacy");
    expect(privacy.dateModified).toBe("2026-11-01");
    expect(homeIds.has(privacy.isPartOf["@id"])).toBe(true);
  });

  it("escapes < so no text can close the script tag", () => {
    const script = jsonLdScript({ name: "</script><script>alert(1)" });

    expect(script.type).toBe("application/ld+json");
    expect(script.children).not.toContain("<");
    expect(JSON.parse(script.children)).toEqual({
      name: "</script><script>alert(1)"
    });
  });
});
