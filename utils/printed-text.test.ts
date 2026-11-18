import { describe, expect, it } from "vitest";
import { DEFAULT_INVOICE_SECTIONS } from "~/schema/invoice";
import { invoiceDefault } from "~/stores/invoice-store";
import { getPrintedText } from "~/utils/printed-text";

describe("getPrintedText", () => {
  it("holds the parties, the lines and the notes that print", () => {
    const text = getPrintedText({
      ...invoiceDefault,
      client: { ...invoiceDefault.client, content: "Общество «Ромашка»" },
      items: [{ ...invoiceDefault.items[0], description: "Λογότυπο" }],
      sections: { ...DEFAULT_INVOICE_SECTIONS, notes: true },
      notes: { ...invoiceDefault.notes, content: "Merci beaucoup" }
    });

    expect(text).toContain("Общество «Ромашка»");
    expect(text).toContain("Λογότυπο");
    expect(text).toContain("Merci beaucoup");
  });

  it("leaves out a part that's switched off", () => {
    const text = getPrintedText({
      ...invoiceDefault,
      sections: { ...DEFAULT_INVOICE_SECTIONS, notes: false },
      notes: { ...invoiceDefault.notes, content: "株式会社" }
    });

    expect(text).not.toContain("株式会社");
  });
});
