import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type {
  CurrencyConversion,
  Invoice,
  InvoiceLineItemRow,
  TableSettings
} from "~/types";
import { pdfRoleStyle } from "~/utils/pdf-styles";
import { getShownColumns, getTaxColumnLabel } from "~/utils/table-columns";

// Column widths in percent of the table, with and without the unit column or
// quantity and price, and with the converted amount taking its room from the
// others. A money column names its currency under its label, so it's only as
// wide as its figures and the description keeps the rest.
const COLUMN_WIDTHS = {
  units: {
    description: 42,
    quantity: 12,
    unit: 10,
    unitPrice: 18,
    amount: 18,
    convertedAmount: 0
  },
  noUnits: {
    description: 48,
    quantity: 14,
    unit: 0,
    unitPrice: 19,
    amount: 19,
    convertedAmount: 0
  },
  convertedUnits: {
    description: 33,
    quantity: 11,
    unit: 9,
    unitPrice: 13,
    amount: 15,
    convertedAmount: 19
  },
  convertedNoUnits: {
    description: 42,
    quantity: 11,
    unit: 0,
    unitPrice: 13,
    amount: 15,
    convertedAmount: 19
  },
  amountOnly: {
    description: 81,
    quantity: 0,
    unit: 0,
    unitPrice: 0,
    amount: 19,
    convertedAmount: 0
  },
  convertedAmountOnly: {
    description: 66,
    quantity: 0,
    unit: 0,
    unitPrice: 0,
    amount: 15,
    convertedAmount: 19
  }
};

// The Tax column, shown when the lines' rates differ, takes its room from the
// description, so the money columns keep theirs. It fits "Exempt" in a
// monospaced font at the large size.
const TAX_COLUMN_WIDTH = 11;

function getColumnWidths({
  columns,
  hasConversion,
  hasTaxColumn
}: {
  columns: TableSettings["columns"];
  hasConversion: boolean;
  hasTaxColumn: boolean;
}) {
  const widths = !columns.quantityAndPrice
    ? hasConversion
      ? COLUMN_WIDTHS.convertedAmountOnly
      : COLUMN_WIDTHS.amountOnly
    : hasConversion
      ? columns.unit
        ? COLUMN_WIDTHS.convertedUnits
        : COLUMN_WIDTHS.convertedNoUnits
      : columns.unit
        ? COLUMN_WIDTHS.units
        : COLUMN_WIDTHS.noUnits;
  const taxWidth = hasTaxColumn ? TAX_COLUMN_WIDTH : 0;

  return {
    description: `${widths.description - taxWidth}%`,
    quantity: `${widths.quantity}%`,
    unit: `${widths.unit}%`,
    unitPrice: `${widths.unitPrice}%`,
    tax: `${taxWidth}%`,
    amount: `${widths.amount}%`,
    convertedAmount: `${widths.convertedAmount}%`
  };
}

// Cells sit 10pt apart, and the row's own padding keeps the outer ones 8pt in
// from the border.
const CELL_PADDING_X = 5;
const ROW_PADDING_X = 3;

// A description wraps between words rather than hyphenating them. A word too
// long to fit the column (a URL, say) may still break anywhere.
const UNBREAKABLE_WORD_MAX_LENGTH = 20;

function keepWordsWhole(word: string) {
  return word.length > UNBREAKABLE_WORD_MAX_LENGTH ? Array.from(word) : [word];
}

export function InvoicePdfItemsTable({
  invoice,
  lineItems,
  conversion,
  hasTaxColumn
}: {
  invoice: Invoice;
  lineItems: InvoiceLineItemRow[];
  conversion: CurrencyConversion | null;
  hasTaxColumn: boolean;
}) {
  const theme = invoice.theme;
  const labels = invoice.tableSettings.columnLabels;

  const columns = getShownColumns({
    columns: invoice.tableSettings.columns,
    items: lineItems,
    isPrinted: true
  });
  const columnWidths = getColumnWidths({
    columns,
    hasConversion: conversion !== null,
    hasTaxColumn
  });
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
      paddingHorizontal: ROW_PADDING_X,
      backgroundColor: invoice.tableSettings.backgroundColor,
      borderBottomWidth: 1,
      borderBottomColor: invoice.tableSettings.borderColor
    },
    tableRow: {
      flexDirection: "row",
      paddingHorizontal: ROW_PADDING_X,
      borderBottomWidth: 1,
      borderBottomColor: invoice.tableSettings.borderColor
    },
    tableLastRow: {
      flexDirection: "row",
      paddingHorizontal: ROW_PADDING_X
    },
    tableCell: {
      paddingVertical: 8,
      paddingHorizontal: CELL_PADDING_X
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
        {columns.quantityAndPrice && (
          <View style={[styles.tableCell, { width: columnWidths.quantity }]}>
            <Text style={pdfRoleStyle(theme, "tableHeaderCenter")}>
              {labels.quantity}
            </Text>
          </View>
        )}
        {columns.unit && (
          <View style={[styles.tableCell, { width: columnWidths.unit }]}>
            <Text style={pdfRoleStyle(theme, "tableHeaderCenter")}>
              {labels.unit}
            </Text>
          </View>
        )}
        {columns.quantityAndPrice && (
          <View style={[styles.tableCell, { width: columnWidths.unitPrice }]}>
            <Text style={pdfRoleStyle(theme, "tableHeaderCenter")}>
              {labels.unitPrice}
            </Text>
            {conversion && (
              <Text style={pdfRoleStyle(theme, "tableHeaderCenter")}>
                {conversion.fromCode}
              </Text>
            )}
          </View>
        )}
        {hasTaxColumn && (
          <View style={[styles.tableCell, { width: columnWidths.tax }]}>
            <Text style={pdfRoleStyle(theme, "tableHeaderCenter")}>
              {getTaxColumnLabel(labels, invoice.labels)}
            </Text>
          </View>
        )}
        <View style={[styles.tableCell, { width: columnWidths.amount }]}>
          <Text style={pdfRoleStyle(theme, "tableHeaderRight")}>
            {labels.amount}
          </Text>
          {conversion && (
            <Text style={pdfRoleStyle(theme, "tableHeaderRight")}>
              {conversion.fromCode}
            </Text>
          )}
        </View>
        {conversion && (
          <View
            style={[styles.tableCell, { width: columnWidths.convertedAmount }]}
          >
            <Text style={pdfRoleStyle(theme, "tableHeaderRight")}>
              {labels.amount || "Amount"}
            </Text>
            <Text style={pdfRoleStyle(theme, "tableHeaderRight")}>
              {conversion.toCode}
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
              <Text
                style={pdfRoleStyle(theme, "tableRowLeft")}
                hyphenationCallback={keepWordsWhole}
              >
                {row.description}
              </Text>
            </View>
            {columns.quantityAndPrice && (
              <View
                style={[styles.tableCell, { width: columnWidths.quantity }]}
              >
                <Text style={pdfRoleStyle(theme, "tableRowCenter")}>
                  {row.quantity}
                </Text>
              </View>
            )}
            {columns.unit && (
              <View style={[styles.tableCell, { width: columnWidths.unit }]}>
                <Text style={pdfRoleStyle(theme, "tableRowCenter")}>
                  {row.unit}
                </Text>
              </View>
            )}
            {columns.quantityAndPrice && (
              <View
                style={[styles.tableCell, { width: columnWidths.unitPrice }]}
              >
                <Text style={pdfRoleStyle(theme, "tableRowCenter")}>
                  {row.unitPrice}
                </Text>
              </View>
            )}
            {hasTaxColumn && (
              <View style={[styles.tableCell, { width: columnWidths.tax }]}>
                <Text style={pdfRoleStyle(theme, "tableRowCenter")}>
                  {row.tax}
                </Text>
              </View>
            )}
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
