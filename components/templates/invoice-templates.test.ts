import { describe, expect, it } from "vitest";
import {
  INVOICE_TEMPLATES,
  templateSrc,
  templateSrcSet
} from "~/components/templates/invoice-templates";

const template = { src: "/templates/freelance.webp" };

describe("templateSrc", () => {
  it("keeps the full render's plain name", () => {
    expect(templateSrc(template, 800)).toBe("/templates/freelance.webp");
  });

  it("names a narrower copy by its width", () => {
    expect(templateSrc(template, 400)).toBe("/templates/freelance-400.webp");
  });

  it("throws for a render that isn't a WebP", () => {
    expect(() => templateSrc({ src: "/templates/retail.png" }, 400)).toThrow(
      "/templates/retail.png"
    );
  });

  it("gives every template a different file at each width", () => {
    const files = INVOICE_TEMPLATES.flatMap(invoiceTemplate =>
      [400, 600, 800].map(width => templateSrc(invoiceTemplate, width))
    );

    expect(new Set(files).size).toBe(files.length);
  });
});

describe("templateSrcSet", () => {
  it("lists every width, narrowest first", () => {
    expect(templateSrcSet(template)).toBe(
      "/templates/freelance-400.webp 400w, /templates/freelance-600.webp 600w, /templates/freelance.webp 800w"
    );
  });
});
