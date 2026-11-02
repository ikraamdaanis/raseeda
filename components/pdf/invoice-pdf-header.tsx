import { Image as PDFImage, StyleSheet, Text, View } from "@react-pdf/renderer";
import { PdfMultilineText } from "~/components/pdf/invoice-pdf-text";
import type { Invoice } from "~/types";
import { PDF_ROW_LINE_HEIGHT, pdfRoleStyle } from "~/utils/pdf-styles";
import { getPrintedSections } from "~/utils/section-visibility";

const styles = StyleSheet.create({
  header: {
    // The editor's 8px gap plus the two fields' 1px borders, at the PDF's
    // 0.75 scale.
    marginBottom: 7.5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  headerContent: {
    flex: 1,
    flexDirection: "column",
    gap: 16
  },
  logo: {
    width: 96,
    height: 96,
    objectFit: "cover",
    borderRadius: 4,
    backgroundColor: "#FFF3E8",
    marginLeft: 24
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  // The editor's stamp at the PDF's 0.75 scale.
  paidStamp: {
    borderWidth: 1.5,
    borderRadius: 4.5,
    paddingHorizontal: 7.5,
    paddingVertical: 1.5,
    transform: "rotate(-6deg)"
  },
  sellerLabel: {
    fontWeight: "medium",
    fontSize: 12,
    lineHeight: PDF_ROW_LINE_HEIGHT
  }
});

export function InvoicePdfHeader({
  invoice,
  imageUrl
}: {
  invoice: Invoice;
  imageUrl: string;
}) {
  const theme = invoice.theme;

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.titleRow}>
          <Text style={pdfRoleStyle(theme, "title")}>{invoice.title}</Text>
          {getPrintedSections(invoice).paidStamp && (
            <View style={{ ...styles.paidStamp, borderColor: theme.accent }}>
              <Text
                style={pdfRoleStyle(theme, "title", {
                  fontSize: 13.5,
                  letterSpacing: 2.7,
                  color: theme.accent
                })}
              >
                PAID
              </Text>
            </View>
          )}
        </View>
        <View>
          {invoice.seller.label && (
            <Text
              style={{
                ...styles.sellerLabel,
                ...pdfRoleStyle(theme, "sectionLabel")
              }}
            >
              {invoice.seller.label}
            </Text>
          )}
          <PdfMultilineText
            text={invoice.seller.content}
            style={pdfRoleStyle(theme, "sectionContent", {
              lineHeight: PDF_ROW_LINE_HEIGHT
            })}
          />
        </View>
      </View>
      {!!imageUrl && <PDFImage src={imageUrl} style={styles.logo} />}
    </View>
  );
}
