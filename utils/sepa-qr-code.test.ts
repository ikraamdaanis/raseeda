import { describe, expect, it } from "vitest";
import { createBlankInvoice } from "~/stores/invoice-store";
import type { Invoice } from "~/types";
import { buildEpcPayload, getSepaQrCode } from "~/utils/sepa-qr-code";

describe("buildEpcPayload", () => {
  it("writes the EPC069-12 lines for a transfer", () => {
    expect(
      buildEpcPayload({
        name: "Red Cross of Belgium",
        iban: "BE72000000001616",
        bic: "BPOTBEB1",
        amount: 1,
        reference: "Urgency fund"
      })
    ).toBe(
      [
        "BCD",
        "002",
        "1",
        "SCT",
        "BPOTBEB1",
        "Red Cross of Belgium",
        "BE72000000001616",
        "EUR1.00",
        "",
        "",
        "Urgency fund"
      ].join("\n")
    );
  });

  it("writes the amount with two decimals and no grouping", () => {
    const payload = buildEpcPayload({
      name: "Acme",
      iban: "DE89370400440532013000",
      bic: "",
      amount: 1234.3,
      reference: "INV-0001"
    });

    expect(payload?.split("\n")[7]).toBe("EUR1234.30");
  });

  it("tidies the IBAN and BIC and leaves out a BIC that isn't one", () => {
    const lines = buildEpcPayload({
      name: "Acme",
      iban: " de89 3704 0044 0532 0130 00 ",
      bic: "cobadeffxxx",
      amount: 12.3,
      reference: ""
    })?.split("\n");

    expect(lines?.[4]).toBe("COBADEFFXXX");
    expect(lines?.[6]).toBe("DE89370400440532013000");
    expect(
      buildEpcPayload({
        name: "Acme",
        iban: "DE89370400440532013000",
        bic: "Commerzbank AG",
        amount: 12.3,
        reference: ""
      })?.split("\n")[4]
    ).toBe("");
  });

  it("ends at the amount when there's no reference", () => {
    expect(
      buildEpcPayload({
        name: "Acme",
        iban: "DE89370400440532013000",
        bic: "",
        amount: 12.3,
        reference: "  "
      })
    ).toBe("BCD\n002\n1\nSCT\n\nAcme\nDE89370400440532013000\nEUR12.30");
  });

  it("cuts a long name to 70 characters and a reference to 140", () => {
    const lines = buildEpcPayload({
      name: "A".repeat(80),
      iban: "DE89370400440532013000",
      bic: "",
      amount: 5,
      reference: "R".repeat(200)
    })?.split("\n");

    expect(lines?.[5]).toBe("A".repeat(70));
    expect(lines?.[10]).toBe("R".repeat(140));
  });

  it("keeps accented characters, as UTF-8 text", () => {
    const lines = buildEpcPayload({
      name: "Franz Mustermänner Ærøskøbing",
      iban: "DE89370400440532013000",
      bic: "",
      amount: 5,
      reference: "Rechnung Nr. Ü-7"
    })?.split("\n");

    expect(lines?.[2]).toBe("1");
    expect(lines?.[5]).toBe("Franz Mustermänner Ærøskøbing");
    expect(lines?.[10]).toBe("Rechnung Nr. Ü-7");
  });

  it("puts line breaks in a name or reference on one line", () => {
    const lines = buildEpcPayload({
      name: "Acme\nStudio",
      iban: "DE89370400440532013000",
      bic: "",
      amount: 5,
      reference: "INV\r\n0001"
    })?.split("\n");

    expect(lines).toHaveLength(11);
    expect(lines?.[5]).toBe("Acme Studio");
    expect(lines?.[10]).toBe("INV 0001");
  });

  it("stays within the 331 bytes a code may hold", () => {
    const payload = buildEpcPayload({
      name: "é".repeat(70),
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
      amount: 999999999.99,
      reference: "ü".repeat(140)
    });

    expect(new TextEncoder().encode(payload ?? "").length).toBeLessThanOrEqual(
      331
    );
    expect(payload?.split("\n")[5]).toBe("é".repeat(70));
  });

  it("takes the largest amount EPC allows and refuses one over it", () => {
    const transfer = {
      name: "Acme",
      iban: "DE89370400440532013000",
      bic: "",
      reference: ""
    };

    expect(
      buildEpcPayload({ ...transfer, amount: 999999999.99 })?.split("\n")[7]
    ).toBe("EUR999999999.99");
    expect(buildEpcPayload({ ...transfer, amount: 1000000000 })).toBeNull();
    expect(buildEpcPayload({ ...transfer, amount: 0 })).toBeNull();
  });

  it("refuses a missing name or an IBAN that isn't one", () => {
    const transfer = { bic: "", amount: 5, reference: "" };

    expect(
      buildEpcPayload({
        ...transfer,
        name: " ",
        iban: "DE89370400440532013000"
      })
    ).toBeNull();
    expect(buildEpcPayload({ ...transfer, name: "Acme", iban: "" })).toBeNull();
    expect(
      buildEpcPayload({
        ...transfer,
        name: "Acme",
        iban: "DE89370400440532013001"
      })
    ).toBeNull();
  });
});

describe("getSepaQrCode", () => {
  function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
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
        bic: "COBADEFFXXX"
      },
      ...overrides
    };
  }

  it("encodes the payee, IBAN, balance due and invoice number", () => {
    expect(getSepaQrCode(makeInvoice({ amountPaid: 30 }))).toEqual({
      payload: [
        "BCD",
        "002",
        "1",
        "SCT",
        "COBADEFFXXX",
        "Acme Studio",
        "DE89370400440532013000",
        "EUR70.00",
        "",
        "",
        "INV-0042"
      ].join("\n")
    });
  });

  it("says why it's left out", () => {
    const invoice = makeInvoice();

    expect(
      getSepaQrCode({ ...invoice, currency: "$", currencyCode: "USD" })
    ).toEqual({ missing: "currency" });
    expect(
      getSepaQrCode({
        ...invoice,
        paymentDetails: { ...invoice.paymentDetails, iban: "" }
      })
    ).toEqual({ missing: "iban" });
    expect(
      getSepaQrCode({
        ...invoice,
        paymentDetails: { ...invoice.paymentDetails, accountName: "" }
      })
    ).toEqual({ missing: "name" });
    expect(getSepaQrCode({ ...invoice, amountPaid: 100 })).toEqual({
      missing: "nothingDue"
    });
    expect(
      getSepaQrCode({
        ...invoice,
        items: [
          {
            id: "a",
            description: "Plant",
            quantity: 1,
            unit: "",
            unitPrice: 2000000000
          }
        ]
      })
    ).toEqual({ missing: "amount" });
  });
});
