import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CurrencyConversion, Invoice, InvoiceLineItemRow } from "~/types";
import { pdfRoleStyle } from "~/utils/pdf-styles";

// Column widths in percent of the table, with and without the unit column,
// and with the converted amount taking its room from the others.
const COLUMN_WIDTHS = {
  units: {
    description: "34%",
    quantity: "14%",
    unit: "14%",
    unitPrice: "19%",
    amount: "19%",
    convertedAmount: "0%"
  },
  noUnits: {
    description: "40%",
    quantity: "20%",
    unit: "0%",
    unitPrice: "20%",
    amount: "20%",
    convertedAmount: "0%"
  },
  convertedUnits: {
    description: "21%",
    quantity: "13%",
    unit: "9%",
    unitPrice: "18%",
    amount: "18%",
    convertedAmount: "21%"
  },
  convertedNoUnits: {
    description: "28%",
    quantity: "13%",
    unit: "0%",
    unitPrice: "18%",
    amount: "19%",
    convertedAmount: "22%"
  }
};

export function InvoicePdfItemsTable({
  invoice,
  lineItems,
  conversion
}: {
  invoice: Invoice;
  lineItems: InvoiceLineItemRow[];
  conversion: CurrencyConversion | null;
}) {
  const theme = invoice.theme;
  const labels = invoice.tableSettings.columnLabels;
  // An invoice shown in a second currency names its own on the price columns.
  const currencySuffix = conversion ? ` (${conversion.fromCode})` : "";

  // The unit column only prints when at least one item has a unit, so invoices
  // that never use units (including all previously saved ones) keep the
  // original four-column layout instead of gaining an empty column.
  const hasUnits = lineItems.some(row => row.unit.trim().length > 0);
  const columnWidths = conversion
    ? hasUnits
      ? COLUMN_WIDTHS.convertedUnits
      : COLUMN_WIDTHS.convertedNoUnits
    : hasUnits
      ? COLUMN_WIDTHS.units
      : COLUMN_WIDTHS.noUnits;
  const styles = StyleSheet.create({
    table: {
      display: "flex",
      width: "100%",
      marginBottom: 20,
      borderWidth: 1,
      borderColor: invoice.tableSettings.borderColor,
      borderRadius: 4,
      overflow: "hidden"
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: invoice.tableSettings.backgroundColor,
      borderBottomWidth: 1,
      borderBottomColor: invoice.tableSettings.borderColor
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: invoice.tableSettings.borderColor
    },
    tableLastRow: {
      flexDirection: "row"
    },
    tableCell: {
      padding: 8
    }
  });

  return (
    <View style={styles.table}>
      <View
        style={[
          styles.tableHeader,
          { borderTopLeftRadius: 4, borderTopRightRadius: 4 }
        ]}
      >
        <View style={[styles.tableCell, { width: columnWidths.description }]}>
          <Text style={pdfRoleStyle(theme, "tableHeaderLeft")}>
            {labels.description}
          </Text>
        </View>
        <View style={[styles.tableCell, { width: columnWidths.quantity }]}>
          <Text style={pdfRoleStyle(theme, "tableHeaderCenter")}>
            {labels.quantity}
          </Text>
        </View>
        {hasUnits && (
          <View style={[styles.tableCell, { width: columnWidths.unit }]}>
            <Text style={pdfRoleStyle(theme, "tableHeaderCenter")}>
              {labels.unit}
            </Text>
          </View>
        )}
        <View style={[styles.tableCell, { width: columnWidths.unitPrice }]}>
          <Text style={pdfRoleStyle(theme, "tableHeaderCenter")}>
            {`${labels.unitPrice}${currencySuffix}`}
          </Text>
        </View>
        <View style={[styles.tableCell, { width: columnWidths.amount }]}>
          <Text style={pdfRoleStyle(theme, "tableHeaderRight")}>
            {`${labels.amount}${currencySuffix}`}
          </Text>
        </View>
        {conversion && (
          <View
            style={[styles.tableCell, { width: columnWidths.convertedAmount }]}
          >
            <Text style={pdfRoleStyle(theme, "tableHeaderRight")}>
              {`${labels.amount || "Amount"} (${conversion.toCode})`}
            </Text>
          </View>
        )}
      </View>
      {lineItems.map((row, index) => {
        const isLastItem = index === lineItems.length - 1;

        return (
          <View
            key={row.id}
            style={isLastItem ? styles.tableLastRow : styles.tableRow}
          >
            <View
              style={[styles.tableCell, { width: columnWidths.description }]}
            >
              <Text style={pdfRoleStyle(theme, "tableRowLeft")}>
                {row.description}
              </Text>
            </View>
            <View style={[styles.tableCell, { width: columnWidths.quantity }]}>
              <Text style={pdfRoleStyle(theme, "tableRowCenter")}>
                {row.quantity}
              </Text>
            </View>
            {hasUnits && (
              <View style={[styles.tableCell, { width: columnWidths.unit }]}>
                <Text style={pdfRoleStyle(theme, "tableRowCenter")}>
                  {row.unit}
                </Text>
              </View>
            )}
            <View style={[styles.tableCell, { width: columnWidths.unitPrice }]}>
              <Text style={pdfRoleStyle(theme, "tableRowCenter")}>
                {row.unitPrice}
              </Text>
            </View>
            <View style={[styles.tableCell, { width: columnWidths.amount }]}>
              <Text style={pdfRoleStyle(theme, "tableRowRight")}>
                {row.amount}
              </Text>
            </View>
            {conversion && (
              <View
                style={[
                  styles.tableCell,
                  { width: columnWidths.convertedAmount }
                ]}
              >
                <Text style={pdfRoleStyle(theme, "tableRowRight")}>
                  {row.convertedAmount}
                </Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
