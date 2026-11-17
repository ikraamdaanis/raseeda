import { StyleSheet, Text, View } from "@react-pdf/renderer";
import { PdfMultilineText } from "~/components/pdf/invoice-pdf-text";
import type { Invoice, InvoiceDetailRow } from "~/types";
import {
  DETAILS_COLUMN_GAP,
  getDetailLabelWidth
} from "~/utils/detail-label-width";
import { measurePdfText } from "~/utils/measure-pdf-text";
import { PDF_ROW_LINE_HEIGHT, pdfRoleStyle } from "~/utils/pdf-styles";
import { getPrintedSections } from "~/utils/section-visibility";

const styles = StyleSheet.create({
  detailsSection: {
    marginBottom: 20
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: DETAILS_COLUMN_GAP
  },
  clientInfo: {
    flex: 1
  },
  invoiceDetails: {
    flex: 1
  },
  clientLabel: {
    fontWeight: "medium",
    fontSize: 12,
    lineHeight: PDF_ROW_LINE_HEIGHT
  },
  shippingBlock: {
    marginTop: 12
  },
  detailsField: {
    flexDirection: "row",
    alignItems: "center"
  },
  detailsLabel: {
    fontSize: 10,
    color: "#6b7280",
    lineHeight: PDF_ROW_LINE_HEIGHT
  },
  detailsValue: {
    flex: 1,
    lineHeight: PDF_ROW_LINE_HEIGHT
  }
});

export function InvoicePdfDetails({
  invoice,
  detailRows
}: {
  invoice: Invoice;
  detailRows: InvoiceDetailRow[];
}) {
  const theme = invoice.theme;
  const hasShipping = getPrintedSections(invoice).shipping;
  // Optional detail rows (PO number, service period) only appear once filled;
  // the always-present rows (number, dates) render even when blank.
  const visibleDetailRows = detailRows.filter(
    row => !row.isOptional || row.value.trim().length > 0
  );
  const labelStyle = {
    ...styles.detailsLabel,
    ...pdfRoleStyle(theme, "detailLabel")
  };
  const labelWidth = getDetailLabelWidth({
    labels: visibleDetailRows.map(row => row.label),
    paperSize: invoice.paperSize,
    measure: label => measurePdfText(label, labelStyle)
  });

  return (
    <View style={styles.detailsSection}>
      <View style={styles.detailsRow}>
        <View style={styles.clientInfo}>
          {invoice.client.label && (
            <Text
              style={{
                ...styles.clientLabel,
                ...pdfRoleStyle(theme, "sectionLabel")
              }}
            >
              {invoice.client.label}
            </Text>
          )}
          <PdfMultilineText
            text={invoice.client.content}
            style={pdfRoleStyle(theme, "sectionContent", {
              lineHeight: PDF_ROW_LINE_HEIGHT
            })}
          />
          {hasShipping && (
            <View style={styles.shippingBlock}>
              {invoice.shipping.label && (
                <Text
                  style={{
                    ...styles.clientLabel,
                    ...pdfRoleStyle(theme, "sectionLabel")
                  }}
                >
                  {invoice.shipping.label}
                </Text>
              )}
              <PdfMultilineText
                text={invoice.shipping.content}
                style={pdfRoleStyle(theme, "sectionContent", {
                  lineHeight: PDF_ROW_LINE_HEIGHT
                })}
              />
            </View>
          )}
        </View>
        <View style={styles.invoiceDetails}>
          {visibleDetailRows.map(row => (
            <View key={row.id} style={styles.detailsField}>
              <Text style={{ ...labelStyle, width: labelWidth }}>
                {row.label}
              </Text>
              <Text
                style={{
                  ...styles.detailsValue,
                  ...pdfRoleStyle(theme, "detailValue")
                }}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
