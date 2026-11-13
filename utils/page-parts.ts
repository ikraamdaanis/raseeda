import type { DocumentType, InvoiceSectionKey, InvoiceSections } from "~/types";
import { getTypeSettledSections } from "~/utils/document-type";

// The places on the page an optional part prints, each with its parts in the
// order they print. A part that's off is added back from its area's slot.
const PAGE_AREA_PARTS = {
  logo: [{ key: "logo", label: "Logo" }],
  details: [
    { key: "poNumber", label: "PO number" },
    { key: "supplyDate", label: "Date of supply" },
    { key: "servicePeriod", label: "Service period" }
  ],
  shipping: [{ key: "shipping", label: "Shipping" }],
  totals: [
    { key: "discounts", label: "Discounts" },
    { key: "tax", label: "Tax" },
    { key: "fees", label: "Fees" },
    { key: "amountPaid", label: "Amount paid" }
  ],
  footer: [
    { key: "paymentDetails", label: "Payment details" },
    { key: "notes", label: "Notes" },
    { key: "terms", label: "Terms" },
    { key: "latePayment", label: "Late payment fee" },
    { key: "signature", label: "Signature" }
  ]
} satisfies Record<string, { key: InvoiceSectionKey; label: string }[]>;

/**
 * The parts of one area of the page that are switched off and can be turned
 * on there. A part the document's type settles (a quote's amount paid, a
 * receipt's payment details) is never offered.
 */
export function getAddableParts({
  area,
  sections,
  documentType
}: {
  area: keyof typeof PAGE_AREA_PARTS;
  sections: InvoiceSections;
  documentType: DocumentType;
}): { key: InvoiceSectionKey; label: string }[] {
  const settled = getTypeSettledSections(documentType);

  return PAGE_AREA_PARTS[area].filter(
    part => !sections[part.key] && !settled.includes(part.key)
  );
}
