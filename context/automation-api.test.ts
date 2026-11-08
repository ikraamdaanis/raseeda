import { beforeEach, describe, expect, it, vi } from "vitest";
import { exposeAutomationApi } from "~/context/automation-api";
import { deleteAllData } from "~/db";

// Opening an invoice drives the whole editor session; these tests only need
// what createInvoice stores.
vi.mock("~/context/document-session", () => ({
  documentActions: { openInvoice: vi.fn(async () => {}) }
}));

vi.stubGlobal("window", globalThis);

exposeAutomationApi();

// Nothing declares the API on the global, since only scripts in the page
// call it, so the test names the calls it uses.
const { raseeda } = globalThis as unknown as {
  raseeda: {
    createInvoice: (data: unknown) => Promise<string>;
    getInvoice: (id: string) => Promise<{
      documentType: string;
      dueDate: string;
      title: string;
      labels: Record<string, string>;
    }>;
    listInvoices: () => Promise<{ id: string; documentType: string }[]>;
  };
};

describe("automation API document types", () => {
  beforeEach(async () => {
    await deleteAllData();
  });

  it("makes an invoice when no type is given", async () => {
    const id = await raseeda.createInvoice({ number: "INV-0009" });
    const invoice = await raseeda.getInvoice(id);

    expect(invoice.documentType).toBe("invoice");
    expect(invoice.title).toBe("Invoice");
    expect(invoice.labels.paymentDue).toBe("Due date");
  });

  it("gives a type's title and labels to what's left out", async () => {
    const id = await raseeda.createInvoice({ documentType: "quote" });
    const invoice = await raseeda.getInvoice(id);

    expect(invoice.documentType).toBe("quote");
    expect(invoice.title).toBe("Quote");
    expect(invoice.labels.invoiceNumber).toBe("Quote No.");
    expect(invoice.labels.paymentDue).toBe("Valid until");
  });

  it("keeps the type's labels beside the ones given", async () => {
    const id = await raseeda.createInvoice({
      documentType: "receipt",
      title: "Payment receipt",
      labels: { total: "Paid in full" }
    });
    const invoice = await raseeda.getInvoice(id);

    expect(invoice.title).toBe("Payment receipt");
    expect(invoice.labels.total).toBe("Paid in full");
    expect(invoice.labels.invoiceNumber).toBe("Receipt No.");
    expect(invoice.labels.paymentDue).toBe("Date paid");
    expect(invoice.labels.subtotal).toBe("Subtotal");
  });

  it("treats a key given as undefined as left out", async () => {
    const id = await raseeda.createInvoice({
      documentType: "quote",
      title: undefined,
      labels: { paymentDue: undefined, total: "Sum" }
    });
    const invoice = await raseeda.getInvoice(id);

    expect(invoice.title).toBe("Quote");
    expect(invoice.labels.paymentDue).toBe("Valid until");
    expect(invoice.labels.total).toBe("Sum");
  });

  it("treats a key given as null as left out", async () => {
    const id = await raseeda.createInvoice({
      documentType: "quote",
      title: null,
      labels: { paymentDue: null }
    });
    const invoice = await raseeda.getInvoice(id);

    expect(invoice.title).toBe("Quote");
    expect(invoice.labels.paymentDue).toBe("Valid until");
  });

  it("dates the due date from the issue date given", async () => {
    const receiptId = await raseeda.createInvoice({
      documentType: "receipt",
      invoiceDate: "2026-01-05"
    });
    const invoiceId = await raseeda.createInvoice({
      invoiceDate: "2026-01-05"
    });

    expect((await raseeda.getInvoice(receiptId)).dueDate).toBe("2026-01-05");
    expect((await raseeda.getInvoice(invoiceId)).dueDate).toBe("2026-02-04");
  });

  it("lists each invoice's type", async () => {
    const id = await raseeda.createInvoice({ documentType: "credit-note" });
    const [row] = await raseeda.listInvoices();

    expect(row).toMatchObject({ id, documentType: "credit-note" });
  });
});
