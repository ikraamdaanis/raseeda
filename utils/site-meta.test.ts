import { describe, expect, it } from "vitest";
import { APP_NAME } from "~/consts/app";
import {
  SITE_DESCRIPTION,
  SITE_TITLE,
  canonicalLink,
  siteMeta
} from "~/utils/site-meta";

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

  it("sets a lowercase-branded, descriptive title", () => {
    const titleEntry = meta.find(entry => "title" in entry);

    expect(titleEntry).toEqual({ title: SITE_TITLE });
    expect(SITE_TITLE.startsWith(APP_NAME)).toBe(true);
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

  it("keeps the description short enough not to be cut off in results", () => {
    expect(SITE_DESCRIPTION.length).toBeLessThanOrEqual(160);
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

    expect(ogUrl?.content).toBe("https://billsend.io/create");
    expect(pageTitle).toEqual({ title: "Create" });
  });
});

describe("canonicalLink", () => {
  it("gives an absolute address with no query string", () => {
    expect(canonicalLink("/")).toEqual({
      rel: "canonical",
      href: "https://billsend.io/"
    });
    expect(canonicalLink("/create").href).toBe("https://billsend.io/create");
  });
});
