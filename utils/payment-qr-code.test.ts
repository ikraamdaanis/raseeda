import { describe, expect, it } from "vitest";
import { createBlankInvoice } from "~/stores/invoice-store";
import type { Invoice } from "~/types";
import { buildUpiUri, getPaymentQrCode } from "~/utils/payment-qr-code";

describe("buildUpiUri", () => {
  it("writes a upi://pay URI with the payee, amount in INR and note", () => {
    expect(
      buildUpiUri({
        upiId: "acme@okaxis",
        name: "Acme",
        amount: 1500,
        reference: "INV-0001"
      })
    ).toBe("upi://pay?pa=acme@okaxis&pn=Acme&am=1500.00&cu=INR&tn=INV-0001");
  });

  it("escapes the name and note", () => {
    expect(
      buildUpiUri({
        upiId: "acme@okaxis",
        name: "Ravi & Sons = Co #1?",
        amount: 12.3,
        reference: "INV 7/8"
      })
    ).toBe(
      "upi://pay?pa=acme@okaxis&pn=Ravi%20%26%20Sons%20%3D%20Co%20%231%3F&am=12.30&cu=INR&tn=INV%207%2F8"
    );
  });

  it("escapes letters outside ASCII as UTF-8", () => {
    expect(
      buildUpiUri({
        upiId: "shop@upi",
        name: "शर्मा",
        amount: 1,
        reference: ""
      })
    ).toBe(
      "upi://pay?pa=shop@upi&pn=%E0%A4%B6%E0%A4%B0%E0%A5%8D%E0%A4%AE%E0%A4%BE&am=1.00&cu=INR"
    );
  });

  it("tidies the UPI ID and puts a name on one line", () => {
    expect(
      buildUpiUri({
        upiId: " Acme.Studio-1@OKHDFCBank ",
        name: "Acme\nStudio ",
        amount: 5,
        reference: " INV-0002 "
      })
    ).toBe(
      "upi://pay?pa=acme.studio-1@okhdfcbank&pn=Acme%20Studio&am=5.00&cu=INR&tn=INV-0002"
    );
  });

  it("refuses a UPI ID that isn't one, no name or no amount", () => {
    const payment = { name: "Acme", amount: 5, reference: "" };

    expect(buildUpiUri({ ...payment, upiId: "acme" })).toBeNull();
    expect(buildUpiUri({ ...payment, upiId: "acme@" })).toBeNull();
    expect(buildUpiUri({ ...payment, upiId: "ac me@upi" })).toBeNull();
    expect(buildUpiUri({ ...payment, upiId: "a&b=c@upi" })).toBeNull();
    expect(
      buildUpiUri({ ...payment, upiId: "acme@upi", name: " " })
    ).toBeNull();
    expect(
      buildUpiUri({ ...payment, upiId: "acme@upi", amount: 0 })
    ).toBeNull();
  });
});

describe("getPaymentQrCode", () => {
  function makeInvoice(
    paymentDetails: Partial<Invoice["paymentDetails"]>,
    overrides: Partial<Invoice> = {}
  ): Invoice {
    const blank = createBlankInvoice();

    return {
      ...blank,
      currency: "€",
      currencyCode: "EUR",
      number: "INV-0042",
      items: [
        { id: "a", description: "Design", quantity: 2, unit: "", unitPrice: 50 }
      ],
      tax: { percentage: 0, exempt: false, note: "", perLine: false },
      paymentDetails: {
        ...blank.paymentDetails,
        accountName: "Acme Studio",
        iban: "DE89 3704 0044 0532 0130 00",
        ...paymentDetails
      },
      ...overrides
    };
  }

  it("encodes a SEPA transfer by default", () => {
    const qrCode = getPaymentQrCode(makeInvoice({}));

    expect("payload" in qrCode && qrCode.payload.startsWith("BCD\n")).toBe(
      true
    );
  });

  it("encodes a UPI payment of the balance due in rupees", () => {
    const invoice = makeInvoice(
      { qrCodeContent: "upi", upiId: "acme@okaxis" },
      { currency: "₹", currencyCode: "INR", amountPaid: 30 }
    );

    expect(getPaymentQrCode(invoice)).toEqual({
      payload:
        "upi://pay?pa=acme@okaxis&pn=Acme%20Studio&am=70.00&cu=INR&tn=INV-0042"
    });
  });

  it("says why a UPI code is left out", () => {
    const invoice = makeInvoice(
      { qrCodeContent: "upi", upiId: "acme@okaxis" },
      { currency: "₹", currencyCode: "INR" }
    );

    expect(
      getPaymentQrCode({ ...invoice, currency: "€", currencyCode: "EUR" })
    ).toEqual({ missing: "upiCurrency" });
    expect(
      getPaymentQrCode({
        ...invoice,
        paymentDetails: { ...invoice.paymentDetails, upiId: "acme" }
      })
    ).toEqual({ missing: "upiId" });
    expect(
      getPaymentQrCode({
        ...invoice,
        paymentDetails: { ...invoice.paymentDetails, accountName: "" }
      })
    ).toEqual({ missing: "upiName" });
    expect(getPaymentQrCode({ ...invoice, amountPaid: 100 })).toEqual({
      missing: "nothingDue"
    });
  });

  it("encodes the payment link as the address it opens", () => {
    expect(
      getPaymentQrCode(
        makeInvoice({
          qrCodeContent: "paymentLink",
          paymentLink: " https://pay.stripe.com/acme?a=1 "
        })
      )
    ).toEqual({ payload: "https://pay.stripe.com/acme?a=1" });
    expect(
      getPaymentQrCode(
        makeInvoice({
          qrCodeContent: "paymentLink",
          paymentLink: "paypal.me/acme"
        })
      )
    ).toEqual({ payload: "https://paypal.me/acme" });
  });

  it("leaves out a link code with no link, or one that isn't a web address", () => {
    expect(
      getPaymentQrCode(makeInvoice({ qrCodeContent: "paymentLink" }))
    ).toEqual({ missing: "paymentLink" });
    expect(
      getPaymentQrCode(
        makeInvoice({
          qrCodeContent: "paymentLink",
          paymentLink: "jane@example.com"
        })
      )
    ).toEqual({ missing: "paymentLink" });
  });

  it("encodes a link whatever the amount or currency", () => {
    const qrCode = getPaymentQrCode(
      makeInvoice(
        { qrCodeContent: "paymentLink", paymentLink: "https://wise.com/pay/r" },
        { currency: "$", currencyCode: "USD", amountPaid: 100 }
      )
    );

    expect(qrCode).toEqual({ payload: "https://wise.com/pay/r" });
  });
});
