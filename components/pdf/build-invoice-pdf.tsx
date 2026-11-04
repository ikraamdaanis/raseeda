import { pdf } from "@react-pdf/renderer";
import { InvoicePDF } from "~/components/pdf/invoice-generator";
import type { Invoice } from "~/types";
import { loadInvoicePdfFonts } from "~/utils/measure-pdf-text";
import { registerInvoicePdfFonts } from "~/utils/register-invoice-pdf-fonts";

// Everything that needs react-pdf, behind one entry point. The editor imports
// this module on demand, so the PDF engine (most of the editor's weight)
// downloads when someone is about to make a PDF rather than with the page.
export async function buildInvoicePdfBlob(invoice: Invoice) {
  registerInvoicePdfFonts();
  await loadInvoicePdfFonts(invoice.theme);

  return pdf(<InvoicePDF invoice={invoice} />).toBlob();
}
