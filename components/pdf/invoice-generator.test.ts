import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { InvoicePDF } from "~/components/pdf/invoice-generator";
import { InvoicePdfSignature } from "~/components/pdf/invoice-pdf-signature";
import { DEFAULT_INVOICE_SECTIONS } from "~/schema/invoice";
import { invoiceDefault } from "~/stores/invoice-store";

// The document is a plain function component, so calling it gives the
// element tree without rendering a PDF.
function pageOf(invoice: typeof invoiceDefault) {
  const document = InvoicePDF({ invoice });
  const page: unknown = document.props.children;

  if (!isValidElement<{ size: unknown; children: unknown[] }>(page)) {
    throw new Error("The document has no page");
  }

  return page;
}

function pageSizeOf(paperSize: "A4" | "Letter") {
  return pageOf({ ...invoiceDefault, paperSize }).props.size;
}

describe("InvoicePDF", () => {
  it("prints on the invoice's paper size", () => {
    expect(pageSizeOf("A4")).toEqual({ width: 595.28, height: 841.89 });
    expect(pageSizeOf("Letter")).toEqual({ width: 612, height: 792 });
  });

  it("prints a switched-on signature last, at its stored image", () => {
    const children = pageOf({
      ...invoiceDefault,
      sections: { ...DEFAULT_INVOICE_SECTIONS, signature: true },
      signature: { image: "blob:signature", caption: "Jane Doe" }
    }).props.children.filter(child => isValidElement(child));
    const last = children.at(-1);

    expect(isValidElement(last) && last.type).toBe(InvoicePdfSignature);
    expect(
      isValidElement<{ imageUrl: string }>(last) && last.props.imageUrl
    ).toBe("blob:signature");
  });

  it("prints no signature while it's switched off", () => {
    const children = pageOf({
      ...invoiceDefault,
      signature: { image: "blob:signature", caption: "Jane Doe" }
    }).props.children;

    expect(
      children.some(
        child => isValidElement(child) && child.type === InvoicePdfSignature
      )
    ).toBe(false);
  });
});
