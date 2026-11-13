import { describe, expect, it } from "vitest";
import { DEFAULT_INVOICE_SECTIONS } from "~/schema/invoice";
import type { InvoiceSections } from "~/types";
import { getAddableParts } from "~/utils/page-parts";

const allOff = Object.fromEntries(
  Object.keys(DEFAULT_INVOICE_SECTIONS).map(key => [key, false])
) as InvoiceSections;

describe("getAddableParts", () => {
  it("lists an area's switched-off parts in the order they print", () => {
    expect(
      getAddableParts({
        area: "footer",
        sections: { ...allOff, notes: true },
        documentType: "invoice"
      }).map(part => part.key)
    ).toEqual(["paymentDetails", "terms", "latePayment"]);
  });

  it("leaves out the parts the document's type settles", () => {
    expect(
      getAddableParts({
        area: "totals",
        sections: allOff,
        documentType: "quote"
      }).map(part => part.key)
    ).toEqual(["discounts", "tax", "fees"]);
    expect(
      getAddableParts({
        area: "footer",
        sections: allOff,
        documentType: "receipt"
      }).map(part => part.key)
    ).toEqual(["notes", "terms"]);
  });

  it("names each part as the page does", () => {
    expect(
      getAddableParts({
        area: "details",
        sections: allOff,
        documentType: "invoice"
      })
    ).toEqual([
      { key: "poNumber", label: "PO number" },
      { key: "supplyDate", label: "Date of supply" },
      { key: "servicePeriod", label: "Service period" }
    ]);
  });

  it("has nothing to add once every part is on", () => {
    expect(
      getAddableParts({
        area: "logo",
        sections: { ...allOff, logo: true },
        documentType: "invoice"
      })
    ).toEqual([]);
  });
});
