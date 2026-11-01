import { Document, Page, StyleSheet } from "@react-pdf/renderer";
import { InvoicePdfDetails } from "~/components/pdf/invoice-pdf-details";
import { InvoicePdfHeader } from "~/components/pdf/invoice-pdf-header";
import { InvoicePdfItemsTable } from "~/components/pdf/invoice-pdf-items-table";
import { InvoicePdfPaymentDetails } from "~/components/pdf/invoice-pdf-payment-details";
import { InvoicePdfTerms } from "~/components/pdf/invoice-pdf-terms";
import { InvoicePdfTextSection } from "~/components/pdf/invoice-pdf-text-section";
import { InvoicePdfTotals } from "~/components/pdf/invoice-pdf-totals";
import { getInvoiceFontDefinition } from "~/consts/invoice-fonts";
import type { Invoice } from "~/types";
import { buildInvoiceViewModel } from "~/utils/build-invoice-view-model";
import { registerInvoicePdfFonts } from "~/utils/register-invoice-pdf-fonts";
import { getPrintedSections } from "~/utils/section-visibility";

registerInvoicePdfFonts();

export function InvoicePDF({ invoice }: { invoice: Invoice }) {
  // invoice.image should already be a blob URL or empty string
  const printed = getPrintedSections(invoice);
  const imageUrl = printed.logo ? invoice.image : "";
  // Sets the PDF's /Title metadata, which the browser's viewer uses as the
  // default filename when the user saves. Without it, saving from the preview
  // tab defaults to the blob URL's UUID (e.g. b3d1c2a8-….pdf).
  const documentTitle = invoice.number
    ? `Invoice ${invoice.number}`
    : invoice.title || "Invoice";
  const baseFont = getInvoiceFontDefinition(invoice.theme.font);
  const { detailRows, lineItems, summaryRows, conversion } =
    buildInvoiceViewModel(invoice);
  const styles = StyleSheet.create({
    page: {
      fontFamily: baseFont.pdfFamily,
      fontSize: 12,
      padding: 40,
      backgroundColor: invoice.pdfSettings.backgroundColor
    }
  });

  return (
    <Document title={documentTitle}>
      <Page size="A4" style={styles.page}>
        <InvoicePdfHeader invoice={invoice} imageUrl={imageUrl} />
        <InvoicePdfDetails invoice={invoice} detailRows={detailRows} />
        <InvoicePdfItemsTable
          invoice={invoice}
          lineItems={lineItems}
          conversion={conversion}
        />
        <InvoicePdfTotals
          invoice={invoice}
          summaryRows={summaryRows}
          conversion={conversion}
        />
        {printed.paymentDetails && (
          <InvoicePdfPaymentDetails invoice={invoice} />
        )}
        {printed.notes && (
          <InvoicePdfTextSection
            theme={invoice.theme}
            label={invoice.notes.label}
            content={invoice.notes.content}
          />
        )}
        {printed.terms && <InvoicePdfTerms invoice={invoice} />}
        {printed.latePayment && (
          <InvoicePdfTextSection
            theme={invoice.theme}
            label={invoice.latePayment.label}
            content={invoice.latePayment.content}
          />
        )}
      </Page>
    </Document>
  );
}
