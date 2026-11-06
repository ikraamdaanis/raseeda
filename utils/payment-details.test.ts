import { describe, expect, it } from "vitest";
import { invoiceDefault } from "~/stores/invoice-store";
import type { InvoicePaymentDetails } from "~/types";
import { getPaymentRows } from "~/utils/payment-details";

function paymentDetails(
  overrides: Partial<InvoicePaymentDetails>
): InvoicePaymentDetails {
  return { ...invoiceDefault.paymentDetails, ...overrides };
}

describe("getPaymentRows", () => {
  it("prints the filled-in bank fields under their own labels", () => {
    const rows = getPaymentRows(
      paymentDetails({
        bankName: "Westpac",
        routingNumber: "032-000",
        accountNumber: "123456",
        labels: {
          ...invoiceDefault.paymentDetails.labels,
          routingNumber: "BSB"
        }
      })
    );

    expect(rows).toEqual([
      { id: "bankName", label: "Bank name", value: "Westpac" },
      { id: "accountNumber", label: "Account number", value: "123456" },
      { id: "routingNumber", label: "BSB", value: "032-000" }
    ]);
  });

  it("prints the default label for a bank field whose label was cleared", () => {
    const rows = getPaymentRows(
      paymentDetails({
        iban: "DE89 3704 0044 0532 0130 00",
        labels: { ...invoiceDefault.paymentDetails.labels, iban: "  " }
      })
    );

    expect(rows).toEqual([
      { id: "iban", label: "IBAN", value: "DE89 3704 0044 0532 0130 00" }
    ]);
  });

  it("prints the other ways to pay below the bank fields, in their order", () => {
    const rows = getPaymentRows(
      paymentDetails({
        iban: "GB33 BUKB 2020 1555 5555 55",
        methods: [
          { id: "m1", name: "Venmo", detail: "@jane-designs" },
          { id: "m2", name: "PayPal", detail: "jane@example.com" }
        ]
      })
    );

    expect(rows).toEqual([
      { id: "iban", label: "IBAN", value: "GB33 BUKB 2020 1555 5555 55" },
      { id: "m1", label: "Venmo", value: "@jane-designs" },
      { id: "m2", label: "PayPal", value: "jane@example.com" }
    ]);
  });

  it("leaves out a way to pay with no detail", () => {
    const rows = getPaymentRows(
      paymentDetails({
        methods: [
          { id: "m1", name: "Zelle", detail: "" },
          { id: "m2", name: "Pix", detail: "   " },
          { id: "m3", name: "", detail: "jane@example.com" }
        ]
      })
    );

    expect(rows).toEqual([{ id: "m3", label: "", value: "jane@example.com" }]);
  });
});
