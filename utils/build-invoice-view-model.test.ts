import { describe, expect, it } from "vitest";
import {
  DEFAULT_CURRENCY_CONVERSION,
  DEFAULT_INVOICE_SECTIONS
} from "~/schema/invoice";
import type { Invoice, InvoiceItem } from "~/types";
import { buildInvoiceViewModel } from "~/utils/build-invoice-view-model";
import { buildExchangeRateLine } from "~/utils/currency-conversion";

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "test",
    title: "Invoice",
    image: "",
    number: "INV-001",
    poNumber: "",
    invoiceDate: "2026-01-01",
    dueDate: "2026-01-31",
    servicePeriod: "",
    supplyDate: "",
    seller: { label: "From", content: "", placeholder: "" },
    client: { label: "To", content: "", placeholder: "" },
    shipping: { label: "Ship to", content: "", placeholder: "" },
    items: [],
    tableSettings: {
      columnLabels: {
        description: "Item",
        quantity: "Quantity",
        unit: "Unit",
        unitPrice: "Unit Price",
        amount: "Amount"
      },
      backgroundColor: "#f9fafb",
      borderColor: "#e5e7eb"
    },
    labels: {
      invoiceNumber: "Invoice No.",
      invoiceDate: "Date",
      paymentDue: "Due date",
      poNumber: "PO number",
      servicePeriod: "Service period",
      supplyDate: "Date of supply",
      subtotal: "Subtotal",
      tax: "Tax",
      fees: "Fees",
      discounts: "Discounts",
      total: "Total",
      amountPaid: "Amount paid",
      balanceDue: "Balance due"
    },
    tax: { percentage: 0, exempt: false, note: "" },
    fees: 0,
    discounts: 0,
    discountType: "fixed",
    amountPaid: 0,
    currencyConversion: DEFAULT_CURRENCY_CONVERSION,
    terms: { label: "Terms", content: "" },
    notes: { label: "Notes", content: "" },
    latePayment: { label: "Late payment", content: "" },
    paymentDetails: {
      label: "Payment details",
      bankName: "",
      accountNumber: "",
      routingNumber: "",
      iban: "",
      bic: "",
      sortCode: "",
      terms: ""
    },
    pdfSettings: { backgroundColor: "#ffffff" },
    currency: "£",
    currencyCode: "",
    theme: {
      font: "geist",
      fontWeight: "Normal",
      size: "medium",
      accent: "#1a1a1a"
    },
    sections: { ...DEFAULT_INVOICE_SECTIONS },
    dateFormat: "yyyy-MM-dd",
    ...overrides
  };
}

function makeItem(overrides: Partial<InvoiceItem> = {}): InvoiceItem {
  return {
    id: crypto.randomUUID(),
    description: "Item",
    quantity: 1,
    unit: "",
    unitPrice: 0,
    ...overrides
  };
}

describe("buildInvoiceViewModel", () => {
  describe("detailRows", () => {
    it("emits the detail rows in order, PO number and service period included", () => {
      const { detailRows } = buildInvoiceViewModel(makeInvoice());

      expect(detailRows.map(row => row.id)).toEqual([
        "number",
        "poNumber",
        "invoiceDate",
        "dueDate",
        "servicePeriod"
      ]);
    });

    it("resolves each row's label from the invoice labels and value from the field", () => {
      const { detailRows } = buildInvoiceViewModel(
        makeInvoice({
          number: "INV-42",
          invoiceDate: "2026-02-01",
          dueDate: "2026-03-01",
          labels: {
            invoiceNumber: "Ref",
            invoiceDate: "Issued",
            paymentDue: "Pay by",
            poNumber: "PO number",
            servicePeriod: "Service period",
            supplyDate: "Date of supply",
            subtotal: "Subtotal",
            tax: "Tax",
            fees: "Fees",
            discounts: "Discounts",
            total: "Total",
            amountPaid: "Amount paid",
            balanceDue: "Balance due"
          }
        })
      );

      expect(detailRows.filter(row => !row.isOptional || row.value)).toEqual([
        {
          id: "number",
          labelKey: "invoiceNumber",
          label: "Ref",
          value: "INV-42",
          isOptional: false
        },
        {
          id: "invoiceDate",
          labelKey: "invoiceDate",
          label: "Issued",
          value: "2026-02-01",
          isOptional: false
        },
        {
          id: "dueDate",
          labelKey: "paymentDue",
          label: "Pay by",
          value: "2026-03-01",
          isOptional: false
        }
      ]);
    });

    it("emits optional PO number and service period rows when filled", () => {
      const { detailRows } = buildInvoiceViewModel(
        makeInvoice({ poNumber: "PO-99", servicePeriod: "Jan 2026" })
      );
      const byId = Object.fromEntries(detailRows.map(row => [row.id, row]));

      expect(detailRows.map(row => row.id)).toEqual([
        "number",
        "poNumber",
        "invoiceDate",
        "dueDate",
        "servicePeriod"
      ]);
      expect(byId.poNumber).toMatchObject({
        value: "PO-99",
        isOptional: true
      });
      expect(byId.servicePeriod).toMatchObject({
        value: "Jan 2026",
        isOptional: true
      });
    });
  });

  describe("lineItems", () => {
    it("formats unit price and computes the amount once per item", () => {
      const { lineItems } = buildInvoiceViewModel(
        makeInvoice({
          items: [
            makeItem({ description: "Design", quantity: 2, unitPrice: 50 }),
            makeItem({ description: "Build", quantity: 3, unitPrice: 10.5 })
          ]
        })
      );

      expect(lineItems[0]).toMatchObject({
        description: "Design",
        quantity: 2,
        unitPrice: "£50.00",
        amount: "£100.00"
      });
      expect(lineItems[1]).toMatchObject({
        description: "Build",
        quantity: 3,
        unitPrice: "£10.50",
        amount: "£31.50"
      });
    });

    it("formats with the invoice currency symbol", () => {
      const { lineItems } = buildInvoiceViewModel(
        makeInvoice({
          currency: "$",
          items: [makeItem({ quantity: 1, unitPrice: 9 })]
        })
      );

      expect(lineItems[0].unitPrice).toBe("$9.00");
      expect(lineItems[0].amount).toBe("$9.00");
    });

    it("renders a legible ASCII marker for the Riyal and Dirham symbols", () => {
      const riyal = buildInvoiceViewModel(
        makeInvoice({
          currency: "⃁",
          items: [makeItem({ quantity: 2, unitPrice: 50 })]
        })
      );

      expect(riyal.lineItems[0].unitPrice).toBe("SAR50.00");
      expect(riyal.lineItems[0].amount).toBe("SAR100.00");

      const dirham = buildInvoiceViewModel(
        makeInvoice({
          currency: "د.إ",
          items: [makeItem({ quantity: 1, unitPrice: 9 })]
        })
      );

      expect(dirham.lineItems[0].unitPrice).toBe("AED9.00");
      expect(dirham.lineItems[0].amount).toBe("AED9.00");
    });
  });

  describe("summaryRows", () => {
    it("orders the rows subtotal, discounts, tax, fees, total, amount paid, balance due", () => {
      const { summaryRows } = buildInvoiceViewModel(makeInvoice());

      expect(summaryRows.map(row => row.id)).toEqual([
        "subtotal",
        "discounts",
        "tax",
        "fees",
        "total",
        "amountPaid",
        "balanceDue"
      ]);
    });

    it("keeps subtotal, tax and total visible but hides the other optional rows when empty", () => {
      const { summaryRows } = buildInvoiceViewModel(makeInvoice());
      const visibleById = Object.fromEntries(
        summaryRows.map(row => [row.id, row.isVisible])
      );

      expect(visibleById).toEqual({
        subtotal: true,
        tax: true,
        fees: false,
        discounts: false,
        total: true,
        amountPaid: false,
        balanceDue: false
      });
    });

    it("shows amount paid and balance due once a payment is recorded", () => {
      const { summaryRows } = buildInvoiceViewModel(
        makeInvoice({
          items: [makeItem({ quantity: 1, unitPrice: 100 })],
          amountPaid: 40
        })
      );
      const byId = Object.fromEntries(summaryRows.map(row => [row.id, row]));

      expect(byId.amountPaid.isVisible).toBe(true);
      expect(byId.amountPaid.value).toBe("-£40.00");
      expect(byId.balanceDue.isVisible).toBe(true);
      expect(byId.balanceDue.value).toBe("£60.00");
      expect(byId.balanceDue.isTotal).toBe(true);
      expect(byId.total.isTotal).toBe(false);
    });

    it("shows a zero-rated tax row at 0% with a zero amount", () => {
      const { summaryRows } = buildInvoiceViewModel(
        makeInvoice({
          items: [makeItem({ quantity: 1, unitPrice: 100 })],
          tax: { percentage: 0, exempt: false, note: "" }
        })
      );
      const tax = summaryRows.find(row => row.id === "tax");

      expect(tax?.isVisible).toBe(true);
      expect(tax?.percentage).toBe(0);
      expect(tax?.value).toBe("£0.00");
    });

    it("marks tax exempt with the note in place of an amount", () => {
      const { summaryRows } = buildInvoiceViewModel(
        makeInvoice({
          items: [makeItem({ quantity: 1, unitPrice: 100 })],
          tax: { percentage: 20, exempt: true, note: "Reverse charge" }
        })
      );
      const tax = summaryRows.find(row => row.id === "tax");

      expect(tax?.isVisible).toBe(true);
      expect(tax?.value).toBe("Reverse charge");
      expect(tax?.percentage).toBeUndefined();
    });

    it("carries the discount percentage and applies it to the subtotal", () => {
      const { summaryRows } = buildInvoiceViewModel(
        makeInvoice({
          items: [makeItem({ quantity: 1, unitPrice: 200 })],
          discounts: 10,
          discountType: "percentage"
        })
      );
      const discount = summaryRows.find(row => row.id === "discounts");

      expect(discount?.percentage).toBe(10);
      expect(discount?.value).toBe("-£20.00");
    });

    it("appends the ISO currency code to the grand total when set", () => {
      const { summaryRows } = buildInvoiceViewModel(
        makeInvoice({
          items: [makeItem({ quantity: 1, unitPrice: 100 })],
          currency: "$",
          currencyCode: "USD"
        })
      );
      const total = summaryRows.find(row => row.id === "total");

      expect(total?.value).toBe("$100.00 USD");
    });

    it("skips the code suffix when the rendered marker already is the code", () => {
      const { summaryRows } = buildInvoiceViewModel(
        makeInvoice({
          items: [makeItem({ quantity: 1, unitPrice: 100 })],
          currency: "CHF",
          currencyCode: "CHF"
        })
      );
      const total = summaryRows.find(row => row.id === "total");

      expect(total?.value).toBe("CHF100.00");
    });

    it("skips the code suffix for tofu-replacement markers like SAR", () => {
      const { summaryRows } = buildInvoiceViewModel(
        makeInvoice({
          items: [makeItem({ quantity: 1, unitPrice: 100 })],
          currency: "⃁",
          currencyCode: "SAR"
        })
      );
      const total = summaryRows.find(row => row.id === "total");

      expect(total?.value).toBe("SAR100.00");
    });

    it("shows tax, fees, and discounts once they have a value", () => {
      const { summaryRows } = buildInvoiceViewModel(
        makeInvoice({
          tax: { percentage: 20, exempt: false, note: "" },
          fees: 5,
          discounts: 3
        })
      );
      const visible = summaryRows
        .filter(row => row.isVisible)
        .map(row => row.id);

      expect(visible).toEqual([
        "subtotal",
        "discounts",
        "tax",
        "fees",
        "total"
      ]);
    });

    it("derives and formats each summary value and carries the tax percentage", () => {
      const { summaryRows } = buildInvoiceViewModel(
        makeInvoice({
          items: [makeItem({ quantity: 1, unitPrice: 100 })],
          tax: { percentage: 7.5, exempt: false, note: "" },
          fees: 12,
          discounts: 4
        })
      );
      const byId = Object.fromEntries(summaryRows.map(row => [row.id, row]));

      expect(byId.subtotal.value).toBe("£100.00");
      expect(byId.tax.value).toBe("£7.20");
      expect(byId.tax.percentage).toBe(7.5);
      expect(byId.fees.value).toBe("£12.00");
      expect(byId.discounts.value).toBe("-£4.00");
      expect(byId.total.value).toBe("£115.20");
    });

    it("caps the displayed discount at the subtotal when over-discounted", () => {
      const { summaryRows } = buildInvoiceViewModel(
        makeInvoice({
          items: [makeItem({ quantity: 1, unitPrice: 100 })],
          tax: { percentage: 10, exempt: false, note: "" },
          fees: 5,
          discounts: 1000
        })
      );
      const byId = Object.fromEntries(summaryRows.map(row => [row.id, row]));

      expect(byId.discounts.value).toBe("-£100.00");
      expect(byId.tax.value).toBe("£0.00");
      expect(byId.total.value).toBe("£5.00");
    });

    it("flags only the total row as the grand total", () => {
      const { summaryRows } = buildInvoiceViewModel(makeInvoice());
      const totalRows = summaryRows
        .filter(row => row.isTotal)
        .map(row => row.id);

      expect(totalRows).toEqual(["total"]);
    });
  });
});

describe("buildInvoiceViewModel with a second currency", () => {
  function makeGbpInvoice(overrides: Partial<Invoice> = {}): Invoice {
    return makeInvoice({
      currency: "£",
      currencyCode: "GBP",
      items: [makeItem({ quantity: 22, unitPrice: 325 })],
      sections: { ...DEFAULT_INVOICE_SECTIONS, currencyConversion: true },
      currencyConversion: {
        ...DEFAULT_CURRENCY_CONVERSION,
        rate: 1.2875,
        date: "2026-10-30",
        source: "Bank of England rate"
      },
      dateFormat: "d MMM yyyy",
      ...overrides
    });
  }

  it("converts the line, subtotal and total, and shows zero tax at 0%", () => {
    const { lineItems, summaryRows, conversion } =
      buildInvoiceViewModel(makeGbpInvoice());
    const valueById = Object.fromEntries(
      summaryRows.map(row => [row.id, row.value])
    );

    expect(conversion).toEqual({
      rate: 1.2875,
      fromCode: "GBP",
      toCurrency: "$",
      toCode: "USD"
    });
    expect(lineItems[0].convertedAmount).toBe("$9,205.63");
    expect(valueById.subtotal).toBe("£7,150.00 / $9,205.63");
    expect(valueById.tax).toBe("£0.00 / $0.00");
    expect(valueById.total).toBe("£7,150.00 / $9,205.63");
  });

  it("converts to any currency, a custom one included", () => {
    const { lineItems, conversion } = buildInvoiceViewModel(
      makeGbpInvoice({
        currencyConversion: {
          ...DEFAULT_CURRENCY_CONVERSION,
          currency: "€",
          currencyCode: "EUR",
          rate: 1.2
        }
      })
    );
    const franc = buildInvoiceViewModel(
      makeGbpInvoice({
        currencyConversion: {
          ...DEFAULT_CURRENCY_CONVERSION,
          currency: "CHF",
          currencyCode: "CHF",
          rate: 0.88
        }
      })
    );
    const custom = buildInvoiceViewModel(
      makeGbpInvoice({
        currencyConversion: {
          ...DEFAULT_CURRENCY_CONVERSION,
          currency: "Rs",
          currencyCode: "INR",
          rate: 110
        }
      })
    );

    expect(conversion?.toCode).toBe("EUR");
    expect(lineItems[0].convertedAmount).toBe("€8,580.00");
    expect(franc.lineItems[0].convertedAmount).toBe("CHF 6,292.00");
    expect(custom.lineItems[0].convertedAmount).toBe("Rs 786,500.00");
  });

  it("writes the rate line with its source and date", () => {
    const invoice = makeGbpInvoice();
    const { conversion } = buildInvoiceViewModel(invoice);

    expect(
      conversion &&
        buildExchangeRateLine({
          conversion,
          currencyConversion: invoice.currencyConversion,
          dateFormat: invoice.dateFormat
        })
    ).toBe(
      "Exchange rate: 1 GBP = 1.2875 USD (Bank of England rate, 30 Oct 2026)"
    );
  });

  it("leaves out the conversion when off, without a rate, or into the invoice's own currency", () => {
    const off = buildInvoiceViewModel(
      makeGbpInvoice({ sections: { ...DEFAULT_INVOICE_SECTIONS } })
    );
    const noRate = buildInvoiceViewModel(
      makeGbpInvoice({
        currencyConversion: { ...DEFAULT_CURRENCY_CONVERSION, rate: 0 }
      })
    );
    const sameCurrency = buildInvoiceViewModel(
      makeGbpInvoice({ currency: "$", currencyCode: "USD" })
    );

    for (const viewModel of [off, noRate, sameCurrency]) {
      expect(viewModel.conversion).toBeNull();
      expect(viewModel.lineItems[0].convertedAmount).toBeUndefined();
      expect(viewModel.summaryRows[0].value).not.toContain("/");
    }
  });

  it("adds the date of supply after the issue date once its section is on", () => {
    const { detailRows } = buildInvoiceViewModel(
      makeInvoice({
        supplyDate: "2026-10-31",
        dateFormat: "d MMM yyyy",
        sections: { ...DEFAULT_INVOICE_SECTIONS, supplyDate: true }
      })
    );

    expect(detailRows.map(row => row.id)).toEqual([
      "number",
      "poNumber",
      "invoiceDate",
      "supplyDate",
      "dueDate",
      "servicePeriod"
    ]);
    expect(detailRows[3].value).toBe("31 Oct 2026");
  });
});
