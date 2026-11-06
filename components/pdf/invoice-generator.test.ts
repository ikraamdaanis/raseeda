import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { InvoicePDF } from "~/components/pdf/invoice-generator";
import { invoiceDefault } from "~/stores/invoice-store";

// The document is a plain function component, so calling it gives the
// element tree without rendering a PDF.
function pageSizeOf(paperSize: "A4" | "Letter") {
  const document = InvoicePDF({ invoice: { ...invoiceDefault, paperSize } });
  const page: unknown = document.props.children;

  if (!isValidElement<{ size: unknown }>(page)) {
    throw new Error("The document has no page");
  }

  return page.props.size;
}

describe("InvoicePDF", () => {
  it("prints on the invoice's paper size", () => {
    expect(pageSizeOf("A4")).toEqual({ width: 595.28, height: 841.89 });
    expect(pageSizeOf("Letter")).toEqual({ width: 612, height: 792 });
  });
});
