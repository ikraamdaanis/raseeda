import { describe, expect, it } from "vitest";
import { invoiceDefault } from "~/stores/invoice-store";
import type { InvoicePaymentDetails } from "~/types";
import { getPaymentLinkHref, getPaymentRows } from "~/utils/payment-details";

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

  it("prints the payment link last, linked to its address", () => {
    const rows = getPaymentRows(
      paymentDetails({
        iban: "GB33 BUKB 2020 1555 5555 55",
        methods: [{ id: "m1", name: "Venmo", detail: "@jane-designs" }],
        paymentLink: " paypal.me/janedesigns "
      })
    );

    expect(rows.map(row => row.id)).toEqual(["iban", "m1", "paymentLink"]);
    expect(rows[2]).toEqual({
      id: "paymentLink",
      label: "Pay online",
      value: "paypal.me/janedesigns",
      href: "https://paypal.me/janedesigns"
    });
  });

  it("prints a renamed payment link label, or the default when cleared", () => {
    const labels = invoiceDefault.paymentDetails.labels;
    const link = "https://buy.stripe.com/abc";

    expect(
      getPaymentRows(
        paymentDetails({
          paymentLink: link,
          labels: { ...labels, paymentLink: "Pay by card" }
        })
      )[0]?.label
    ).toBe("Pay by card");
    expect(
      getPaymentRows(
        paymentDetails({
          paymentLink: link,
          labels: { ...labels, paymentLink: " " }
        })
      )[0]?.label
    ).toBe("Pay online");
  });

  it("leaves out an empty payment link", () => {
    expect(getPaymentRows(paymentDetails({ paymentLink: "  " }))).toEqual([]);
  });
});

describe("getPaymentLinkHref", () => {
  it("keeps a web address as typed", () => {
    expect(getPaymentLinkHref("https://buy.stripe.com/abc")).toBe(
      "https://buy.stripe.com/abc"
    );
    expect(getPaymentLinkHref("http://example.com/pay")).toBe(
      "http://example.com/pay"
    );
  });

  it("reads an address without a scheme as https", () => {
    expect(getPaymentLinkHref("paypal.me/acme")).toBe("https://paypal.me/acme");
    expect(getPaymentLinkHref("wise.com:443/pay/me")).toBe(
      "https://wise.com/pay/me"
    );
    expect(getPaymentLinkHref("example.com:8080?ref=1")).toBe(
      "https://example.com:8080/?ref=1"
    );
  });

  it("links nothing that isn't a web address", () => {
    expect(getPaymentLinkHref("javascript:alert(1)")).toBeUndefined();
    expect(getPaymentLinkHref("mailto:jane@example.com")).toBeUndefined();
    expect(getPaymentLinkHref("Ask for a link")).toBeUndefined();
    expect(getPaymentLinkHref("localhost")).toBeUndefined();
    expect(getPaymentLinkHref("jane@example.com")).toBeUndefined();
    expect(
      getPaymentLinkHref("https://jane:secret@example.com/pay")
    ).toBeUndefined();
    expect(getPaymentLinkHref("e.g.")).toBeUndefined();
    expect(getPaymentLinkHref("1.234,56")).toBeUndefined();
    expect(getPaymentLinkHref("")).toBeUndefined();
  });
});
