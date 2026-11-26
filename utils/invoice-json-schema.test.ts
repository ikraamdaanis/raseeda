import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { invoiceSchema } from "~/schema/invoice";
import { buildInvoiceJsonSchema } from "~/utils/invoice-json-schema";

describe("invoice JSON Schema", () => {
  it("is served as it's built from the import schema", () => {
    const served: unknown = JSON.parse(
      readFileSync("public/invoice.schema.json", "utf8")
    );

    // Out of date: run `bun run build:invoice-schema`.
    expect(served).toEqual(
      JSON.parse(JSON.stringify(buildInvoiceJsonSchema()))
    );
  });

  it("names every field a script can set, and the language", () => {
    const { properties } = buildInvoiceJsonSchema();
    const settable = Object.keys(invoiceSchema.shape).filter(
      key => key !== "id" && key !== "image"
    );

    expect(Object.keys(properties).sort()).toEqual(
      [...settable, "language"].sort()
    );
  });

  it("gives the new invoice's values as defaults", () => {
    const { properties } = buildInvoiceJsonSchema();

    expect(properties.number.default).toBe("INV-0001");
    expect(properties.currencyCode.default).toBe("USD");
    expect(properties.invoiceDate).not.toHaveProperty("default");
  });
});
