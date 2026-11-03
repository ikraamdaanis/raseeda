import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CurrencyConversion, Invoice, InvoiceSummaryRow } from "~/types";
import { buildExchangeRateLine } from "~/utils/currency-conversion";
import { pdfRoleStyle } from "~/utils/pdf-styles";

// Two columns, as in the editor: the labels right-aligned, 36pt (the
// editor's 3rem) left of values as wide as the widest one. A label and its
// value share a size, so the rows of the two columns line up. A label stays on
// one line, as it is in the editor, so the rows can't drift apart: one wider
// than half the page ends in an ellipsis rather than running off its edge.
// The table's bottom margin spaces the totals, the same 20pt the details
// leave above the table.
const styles = StyleSheet.create({
  totalSection: {
    alignItems: "flex-end"
  },
  columns: {
    flexDirection: "row",
    gap: 36
  },
  // react-pdf sizes text to its content, so the cap is a percentage rather
  // than whatever room the values leave.
  labels: {
    alignItems: "flex-end",
    maxWidth: "50%"
  },
  label: {
    maxLines: 1,
    textOverflow: "ellipsis"
  },
  values: {
    flexShrink: 0,
    alignItems: "flex-end"
  },
  cell: {
    marginBottom: 5
  },
  exchangeRate: {
    marginTop: 6,
    textAlign: "right"
  }
});

export function InvoicePdfTotals({
  invoice,
  summaryRows,
  conversion
}: {
  invoice: Invoice;
  summaryRows: InvoiceSummaryRow[];
  conversion: CurrencyConversion | null;
}) {
  const theme = invoice.theme;
  const rows = summaryRows.filter(row => row.isVisible);

  return (
    <View style={styles.totalSection}>
      <View style={styles.columns}>
        <View style={styles.labels}>
          {rows.map(row => (
            <Text
              key={`${row.id}-${row.label}`}
              style={{
                ...pdfRoleStyle(
                  theme,
                  row.isTotal ? "grandTotalLabel" : "totalsLabel"
                ),
                ...styles.label,
                ...styles.cell
              }}
            >
              {row.percentage === undefined
                ? row.label
                : `${row.label} ${row.percentage}%`}
            </Text>
          ))}
        </View>
        <View style={styles.values}>
          {rows.map(row => (
            <Text
              key={`${row.id}-${row.label}`}
              style={{
                ...pdfRoleStyle(
                  theme,
                  row.isTotal ? "grandTotalValue" : "totalsValue"
                ),
                ...styles.cell
              }}
            >
              {row.value}
            </Text>
          ))}
        </View>
      </View>
      {conversion && invoice.currencyConversion.showRate && (
        <Text
          style={{
            ...pdfRoleStyle(theme, "totalsLabel"),
            ...styles.exchangeRate
          }}
        >
          {buildExchangeRateLine({
            conversion,
            currencyConversion: invoice.currencyConversion,
            dateFormat: invoice.dateFormat
          })}
        </Text>
      )}
    </View>
  );
}
