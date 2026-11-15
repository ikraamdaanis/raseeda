import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { InvoicePDF } from "~/components/pdf/invoice-generator";
import { InvoicePdfItemsTable } from "~/components/pdf/invoice-pdf-items-table";
import { InvoicePdfPageNumber } from "~/components/pdf/invoice-pdf-page-number";
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

  it("numbers every page of a PDF that runs onto another", () => {
    const children = pageOf(invoiceDefault).props.children;
    const pageNumber = children.find(
      child => isValidElement(child) && child.type === InvoicePdfPageNumber
    );

    expect(pageNumber).toBeDefined();
  });
});

describe("InvoicePdfPageNumber", () => {
  it("sits on every page and reads the page against the total", () => {
    const text: unknown = InvoicePdfPageNumber({ theme: invoiceDefault.theme });

    if (
      !isValidElement<{
        fixed: boolean;
        render: (page: { pageNumber: number; totalPages: number }) => string;
      }>(text)
    ) {
      throw new Error("The page number is not an element");
    }

    const { fixed, render } = text.props;

    expect(fixed).toBe(true);
    expect(render({ pageNumber: 2, totalPages: 3 })).toBe("2 / 3");
    expect(render({ pageNumber: 1, totalPages: 1 })).toBe("");
  });
});

describe("InvoicePdfItemsTable", () => {
  const lineItems = [
    {
      id: "a",
      description: "Design",
      quantity: "1",
      unit: "",
      unitPrice: "£10.00",
      tax: "",
      amount: "£10.00",
      convertedAmount: ""
    },
    {
      id: "b",
      description: "Build",
      quantity: "1",
      unit: "",
      unitPrice: "£10.00",
      tax: "",
      amount: "£10.00",
      convertedAmount: ""
    }
  ];
  const table: unknown = InvoicePdfItemsTable({
    invoice: invoiceDefault,
    lineItems,
    conversion: null,
    hasTaxColumn: false
  });

  if (!isValidElement<{ children: [unknown, unknown[]] }>(table)) {
    throw new Error("The items table is not an element");
  }

  const [header, rows] = table.props.children;

  it("repeats its header on each page it continues onto", () => {
    expect(
      isValidElement<{ fixed?: boolean }>(header) && header.props.fixed
    ).toBe(true);
  });

  it("never splits an item row across pages", () => {
    expect(
      rows.map(row => isValidElement<{ wrap?: boolean }>(row) && row.props.wrap)
    ).toEqual([false, false]);
  });
});
