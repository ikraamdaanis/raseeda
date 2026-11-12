import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SITE_TEMPLATES } from "~/consts/site-templates";

// Everything else about a page is built from SITE_TEMPLATES; its pictures and
// its public/_headers entry are files, so they're checked here.
describe.each(SITE_TEMPLATES)("the $id page", template => {
  it("has a share card and a picture at every width", () => {
    const file = `../public/og-${template.path.slice(1)}.jpg`;

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

  it("has its public/_headers entry", () => {
    const lines = readFileSync(
      new URL("../public/_headers", import.meta.url),
      "utf8"
    ).split("\n");

    expect(lines).toContain(template.path);
    expect(lines).toContain(`${template.path}.html`);
  });
});

describe("SITE_TEMPLATES", () => {
  it("gives every page its own copy and picture", () => {
    for (const field of [
      "title",
      "description",
      "heading",
      "intro",
      "when",
      "src",
      "alt"
    ] as const) {
      const values = SITE_TEMPLATES.map(template => template[field]);

      expect(new Set(values).size).toBe(values.length);
    }
  });
});
