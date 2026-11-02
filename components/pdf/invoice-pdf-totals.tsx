import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CurrencyConversion, Invoice, InvoiceSummaryRow } from "~/types";
import { buildExchangeRateLine } from "~/utils/currency-conversion";
import { pdfRoleStyle } from "~/utils/pdf-styles";

// Two columns, as in the editor: the labels right-aligned, 36pt (the
// editor's 3rem) left of values as wide as the widest one. A label and its
// value share a size, so the rows of the two columns line up.
const styles = StyleSheet.create({
  totalSection: {
    marginTop: 20,
    paddingTop: 10,
    alignItems: "flex-end"
  },
  columns: {
    flexDirection: "row",
    gap: 36
  },
  labels: {
    alignItems: "flex-end"
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
              key={row.id}
              style={{
                ...pdfRoleStyle(
                  theme,
                  row.isTotal ? "grandTotalLabel" : "totalsLabel"
                ),
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
              key={row.id}
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
      {conversion && (
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
