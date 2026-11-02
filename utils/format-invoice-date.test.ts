import { describe, expect, it } from "vitest";
import { createBlankInvoice } from "~/stores/invoice-store";
import { buildInvoiceViewModel } from "~/utils/build-invoice-view-model";
import { formatInvoiceDate } from "~/utils/format-invoice-date";

describe("invoice dates", () => {
  it("writes a stored date in each format", () => {
    expect(formatInvoiceDate("2026-10-07", "d MMM yyyy")).toBe("7 Oct 2026");
    expect(formatInvoiceDate("2026-10-07", "MMMM d, yyyy")).toBe(
      "October 7, 2026"
    );
    expect(formatInvoiceDate("2026-10-07", "dd/MM/yyyy")).toBe("07/10/2026");
    expect(formatInvoiceDate("2026-10-07", "MM/dd/yyyy")).toBe("10/07/2026");
    expect(formatInvoiceDate("2026-10-07", "yyyy-MM-dd")).toBe("2026-10-07");
  });

  it("leaves a value that isn't a date as it is", () => {
    expect(formatInvoiceDate("next Tuesday", "d MMM yyyy")).toBe(
      "next Tuesday"
    );
    expect(formatInvoiceDate("", "d MMM yyyy")).toBe("");
  });

  it("writes a stored range, sharing what both ends have in common", () => {
    const sameMonth = "2026-10-01/2026-10-31";
    const sameYear = "2026-10-15/2026-11-14";
    const acrossYears = "2026-12-01/2027-01-31";

    expect(formatInvoiceDate(sameMonth, "d MMM yyyy")).toBe("1–31 Oct 2026");
    expect(formatInvoiceDate(sameYear, "d MMM yyyy")).toBe(
      "15 Oct – 14 Nov 2026"
    );
    expect(formatInvoiceDate(acrossYears, "d MMM yyyy")).toBe(
      "1 Dec 2026 – 31 Jan 2027"
    );
    expect(formatInvoiceDate(sameMonth, "MMMM d, yyyy")).toBe(
      "October 1–31, 2026"
    );
    expect(formatInvoiceDate(sameYear, "MMMM d, yyyy")).toBe(
      "October 15 – November 14, 2026"
    );
    expect(formatInvoiceDate(sameMonth, "dd/MM/yyyy")).toBe(
      "01/10/2026 – 31/10/2026"
    );
  });

  it("writes a one-day range as a single date", () => {
    expect(formatInvoiceDate("2026-10-31/2026-10-31", "d MMM yyyy")).toBe(
      "31 Oct 2026"
    );
  });

  it("leaves a backwards or malformed range as it is", () => {
    expect(formatInvoiceDate("2026-10-31/2026-10-01", "d MMM yyyy")).toBe(
      "2026-10-31/2026-10-01"
    );
    expect(formatInvoiceDate("1–31 October 2026", "d MMM yyyy")).toBe(
      "1–31 October 2026"
    );
  });

  it("prints the PDF's dates in the invoice's format", () => {
    const viewModel = buildInvoiceViewModel({
      ...createBlankInvoice(),
      invoiceDate: "2026-10-17",
      dueDate: "2026-11-16",
      dateFormat: "MMMM d, yyyy"
    });
    const values = Object.fromEntries(
      viewModel.detailRows.map(row => [row.id, row.value])
    );

    expect(values.invoiceDate).toBe("October 17, 2026");
    expect(values.dueDate).toBe("November 16, 2026");
  });
});
