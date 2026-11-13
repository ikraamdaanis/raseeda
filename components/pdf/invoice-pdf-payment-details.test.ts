import { isValidElement } from "react";
import { describe, expect, it } from "vitest";
import { InvoicePdfPaymentDetails } from "~/components/pdf/invoice-pdf-payment-details";
import { InvoicePdfPaymentQrCode } from "~/components/pdf/invoice-pdf-payment-qr-code";
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
  if (!isValidElement<{ children?: unknown }>(node)) return [];

  return textOf(node.props.children);
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

// The payment QR codes the rendered section holds, by the text they encode.
function qrPayloadsOf(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(qrPayloadsOf);
  if (!isValidElement<{ children?: unknown; payload?: string }>(node)) {
    return [];
  }
  if (node.type === InvoicePdfPaymentQrCode) return [node.props.payload ?? ""];

  return qrPayloadsOf(node.props.children);
}

describe("InvoicePdfPaymentDetails payment QR code", () => {
  function sepaInvoice(): Invoice {
    const invoice = invoiceWithPayment({
      accountName: "Acme Studio",
      iban: "DE89370400440532013000"
    });

    return {
      ...invoice,
      currency: "€",
      currencyCode: "EUR",
      number: "INV-0007",
      items: [
        { id: "a", description: "Design", quantity: 1, unit: "", unitPrice: 50 }
      ],
      tax: { ...invoice.tax, percentage: 0 },
      sections: { ...invoice.sections, paymentQrCode: true }
    };
  }

  it("prints the SEPA code beside the bank rows once switched on", () => {
    expect(
      qrPayloadsOf(InvoicePdfPaymentDetails({ invoice: sepaInvoice() }))
    ).toEqual([
      "BCD\n002\n1\nSCT\n\nAcme Studio\nDE89370400440532013000\nEUR50.00\n\n\nINV-0007"
    ]);
  });

  it("prints no code while switched off or not in euros", () => {
    const invoice = sepaInvoice();

    expect(
      qrPayloadsOf(
        InvoicePdfPaymentDetails({
          invoice: {
            ...invoice,
            sections: { ...invoice.sections, paymentQrCode: false }
          }
        })
      )
    ).toEqual([]);
    expect(
      qrPayloadsOf(
        InvoicePdfPaymentDetails({
          invoice: { ...invoice, currency: "$", currencyCode: "USD" }
        })
      )
    ).toEqual([]);
  });
});
