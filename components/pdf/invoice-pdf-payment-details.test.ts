import { describe, expect, it } from "vitest";
import { InvoicePdfPaymentDetails } from "~/components/pdf/invoice-pdf-payment-details";
import { migrateInvoiceData } from "~/schema/migrations";
import type { Invoice, InvoicePaymentDetails } from "~/types";

// The render node is a plain function component that reads only its `invoice`
// prop (no hooks), so calling it directly returns the element tree or null.
// That lets us assert the appearing/suppressing behaviour without a full PDF
// render.
function invoiceWithPayment(
  paymentDetails: Partial<InvoicePaymentDetails>
): Invoice {
  const invoice = migrateInvoiceData({});

  return {
    ...invoice,
    paymentDetails: { ...invoice.paymentDetails, ...paymentDetails }
  };
}

describe("InvoicePdfPaymentDetails", () => {
  it("suppresses the section when every content field is empty", () => {
    const invoice = invoiceWithPayment({});

    expect(InvoicePdfPaymentDetails({ invoice })).toBeNull();
  });

  it("suppresses the section when fields hold only whitespace", () => {
    const invoice = invoiceWithPayment({ bankName: "   ", terms: "  " });

    expect(InvoicePdfPaymentDetails({ invoice })).toBeNull();
  });

  it("renders the section when a bank field is present", () => {
    const invoice = invoiceWithPayment({ bankName: "Acme Bank" });

    expect(InvoicePdfPaymentDetails({ invoice })).not.toBeNull();
  });

  it("renders the section when only the free-text terms are present", () => {
    const invoice = invoiceWithPayment({ terms: "Net 30" });

    expect(InvoicePdfPaymentDetails({ invoice })).not.toBeNull();
  });
});

// Every string the rendered section holds, in order.
function textOf(node: unknown): string[] {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node.flatMap(textOf);
  if (node && typeof node === "object" && "props" in node) {
    const { props } = node as { props: { children?: unknown } };

    return textOf(props.children);
  }

  return [];
}

describe("InvoicePdfPaymentDetails other ways to pay", () => {
  it("prints a section holding only a way to pay", () => {
    const invoice = invoiceWithPayment({
      methods: [{ id: "m1", name: "Venmo", detail: "@jane-designs" }]
    });

    expect(textOf(InvoicePdfPaymentDetails({ invoice }))).toEqual([
      "Payment details",
      "Venmo",
      "@jane-designs"
    ]);
  });

  it("prints a renamed bank label", () => {
    const invoice = invoiceWithPayment({
      routingNumber: "032-000",
      labels: {
        ...migrateInvoiceData({}).paymentDetails.labels,
        routingNumber: "BSB"
      }
    });

    expect(textOf(InvoicePdfPaymentDetails({ invoice }))).toEqual([
      "Payment details",
      "BSB",
      "032-000"
    ]);
  });

  it("suppresses a section whose only way to pay has no detail", () => {
    const invoice = invoiceWithPayment({
      methods: [{ id: "m1", name: "Venmo", detail: " " }]
    });

    expect(InvoicePdfPaymentDetails({ invoice })).toBeNull();
  });
});
