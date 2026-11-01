import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Invoice, InvoiceSummaryRow, InvoiceTheme } from "~/types";
import { pdfRoleStyle } from "~/utils/pdf-styles";

const styles = StyleSheet.create({
  totalSection: {
    marginTop: 20,
    paddingTop: 10,
    alignItems: "flex-end"
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 4,
    marginBottom: 5,
    width: "100%"
  },
  // Labels share a column as wide as the shortest fits, and a longer one
  // ("VAT (zero-rated export of services)") widens to the left rather than
  // wrapping, like the editor's. It wraps only past the rest of the width.
  // react-pdf sizes text to its content, so textAlign can't push a short
  // label to the right of this column; alignItems does.
  totalLabel: {
    alignItems: "flex-end",
    minWidth: "16%",
    maxWidth: "75%"
  },
  totalValue: {
    width: "24%"
  }
});

function InvoicePdfTotalRow({
  theme,
  label,
  value,
  isTotal
}: {
  theme: InvoiceTheme;
  label: string;
  value: string;
  isTotal: boolean;
}) {
  return (
    <View style={styles.totalRow}>
      <View style={styles.totalLabel}>
        <Text
          style={pdfRoleStyle(
            theme,
            isTotal ? "grandTotalLabel" : "totalsLabel"
          )}
        >
          {label}
        </Text>
      </View>
      <Text
        style={{
          ...styles.totalValue,
          ...pdfRoleStyle(theme, isTotal ? "grandTotalValue" : "totalsValue")
        }}
      >
        {value}
      </Text>
    </View>
  );
}

export function InvoicePdfTotals({
  invoice,
  summaryRows
}: {
  invoice: Invoice;
  summaryRows: InvoiceSummaryRow[];
}) {
  const theme = invoice.theme;

  return (
    <View style={styles.totalSection}>
      {summaryRows
        .filter(row => row.isVisible)
        .map(row => (
          <InvoicePdfTotalRow
            key={row.id}
            theme={theme}
            label={
              row.percentage === undefined
                ? row.label
                : `${row.label} ${row.percentage}%`
            }
            value={row.value}
            isTotal={row.isTotal}
          />
        ))}
    </View>
  );
}
