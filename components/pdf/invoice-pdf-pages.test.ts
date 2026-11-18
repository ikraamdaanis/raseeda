import { Font, renderToBuffer } from "@react-pdf/renderer";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { InvoicePDF } from "~/components/pdf/invoice-generator";
import { DEFAULT_INVOICE_SECTIONS } from "~/schema/invoice";
import { invoiceDefault } from "~/stores/invoice-store";
import { loadInvoicePdfFonts } from "~/utils/measure-pdf-text";
import { PDF_FONT_FAMILIES } from "~/utils/register-invoice-pdf-fonts";

// Real PDFs, laid out by react-pdf, to check where pages break. The fonts'
// addresses are the dev server's (/styles/pdf-fonts/...), read from disk here.
beforeAll(() => {
  for (const font of PDF_FONT_FAMILIES) {
    Font.register({
      family: font.family,
      fonts: font.fonts.map(weight => ({
        ...weight,
        src: join(process.cwd(), weight.src)
      }))
    });
  }
});

async function countPages(lineCount: number) {
  const invoice = {
    ...invoiceDefault,
    seller: {
      ...invoiceDefault.seller,
      content: "Juniper Studio Ltd\n14 Mill Road\nLeeds LS1 4AB"
    },
    client: {
      ...invoiceDefault.client,
      content: "Brightwater Cafe\n2 Harbour Street\nBristol"
    },
    items: Array.from({ length: lineCount }, (_, index) => ({
      id: String(index),
      description: `Design work, part ${index + 1}`,
      quantity: 1,
      unit: "",
      unitPrice: 100
    })),
    paymentDetails: {
      ...invoiceDefault.paymentDetails,
      bankName: "Monzo",
      accountName: "Juniper Studio Ltd",
      accountNumber: "12345678",
      iban: "GB29 NWBK 6016 1331 9268 19"
    },
    notes: { ...invoiceDefault.notes, content: "Thank you for your business." },
    terms: {
      ...invoiceDefault.terms,
      content: "Payment within 30 days of the invoice date."
    },
    sections: {
      ...DEFAULT_INVOICE_SECTIONS,
      paymentDetails: true,
      notes: true,
      terms: true
    }
  };

  await loadInvoicePdfFonts(invoice.theme);

  // A plain function component, so calling it gives the Document element.
  const pdf = await renderToBuffer(InvoicePDF({ invoice }));

  return pdf.toString("latin1").match(/\/Type \/Page\b(?!s)/g)?.length ?? 0;
}

describe("InvoicePDF's pages", () => {
  // At one line count the rows just fit page 1 but the table's own bottom
  // margin didn't, and react-pdf moved the whole table to page 2, leaving
  // page 1 with only the header (issue #244): one more page than a line
  // either side.
  it("never takes more pages for fewer lines", async () => {
    const pages: number[] = [];

    for (let lineCount = 12; lineCount <= 22; lineCount++) {
      pages.push(await countPages(lineCount));
    }

    expect(pages).toEqual([...pages].sort((a, b) => a - b));
  }, 60_000);
});
