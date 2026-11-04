import { describe, expect, it } from "vitest";
import { migrateInvoiceData } from "~/schema/migrations";
import { createBlankInvoice, useInvoiceStore } from "~/stores/invoice-store";

function tableWithAmountLabel(amount: string) {
  return {
    tableSettings: {
      columnLabels: {
        description: "Item",
        quantity: "Quantity",
        unitPrice: "Unit Price",
        amount
      }
    }
  };
}

describe("amount label migration (v2 -> v3)", () => {
  it("clears the old default so the label follows the tax section", () => {
    const invoice = migrateInvoiceData(tableWithAmountLabel("Amount"), 2);

    expect(invoice.tableSettings.columnLabels.amount).toBe("");
  });

  it("keeps a label that was typed", () => {
    const invoice = migrateInvoiceData(tableWithAmountLabel("Total"), 2);

    expect(invoice.tableSettings.columnLabels.amount).toBe("Total");
  });

  it("leaves a current invoice's typed Amount alone", () => {
    const invoice = migrateInvoiceData(tableWithAmountLabel("Amount"), 3);

    expect(invoice.tableSettings.columnLabels.amount).toBe("Amount");
  });

  it("keeps a typed Amount when an invoice opens in the editor", () => {
    const blank = createBlankInvoice();

    useInvoiceStore.getState().setInvoice({
      ...blank,
      tableSettings: {
        ...blank.tableSettings,
        columnLabels: { ...blank.tableSettings.columnLabels, amount: "Amount" }
      }
    });

    expect(useInvoiceStore.getState().tableSettings.columnLabels.amount).toBe(
      "Amount"
    );
  });
});
