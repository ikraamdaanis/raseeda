import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { clamp, mapValues, sum } from "lodash-es";
import type { CurrencyConversion, Invoice, InvoiceLineItemRow } from "~/types";
import { measurePdfText } from "~/utils/measure-pdf-text";
import {
  PDF_PAGE_PADDING,
  PDF_PAGE_WIDTH,
  pdfRoleStyle
} from "~/utils/pdf-styles";
import {
  getAmountColumnLabel,
  getShownColumns,
  getTaxColumnLabel
} from "~/utils/table-columns";

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

// A header line wider than this wraps between its words rather than widening
// its column.
const HEADER_LINE_MAX_WIDTH = 80;

// However long the figures, the description keeps some of the table.
const DESCRIPTION_MIN_SHARE = 0.15;

// Room a column has beyond its text, so the figures sit 22pt apart.
const COLUMN_SPARE_WIDTH = 12;

// The width the columns share: the page inside its margins, less the table's
// border and the rows' padding.
const TABLE_INNER_WIDTH =
  PDF_PAGE_WIDTH - PDF_PAGE_PADDING * 2 - 2 - ROW_PADDING_X * 2;

// How wide a column's widest text is, a figure or a line of its header, with
// the cell's padding.
function measureColumn({
  header,
  cells,
  headerStyle,
  cellStyle
}: {
  header: string[];
  cells: string[];
  headerStyle: Style;
  cellStyle: Style;
}) {
  const headerWidths = header.map(line => {
    const width = measurePdfText(line, headerStyle);

    if (width <= HEADER_LINE_MAX_WIDTH) return width;

    const wordWidths = line
      .split(/\s+/)
      .map(word => measurePdfText(word, headerStyle));

    return Math.max(HEADER_LINE_MAX_WIDTH, ...wordWidths);
  });
  const cellWidths = cells.map(cell => measurePdfText(cell, cellStyle));
  const textWidth = Math.max(0, ...headerWidths, ...cellWidths);

  // A point spare, so rounding never pushes a figure onto a second line.
  return Math.ceil(textWidth) + 1 + CELL_PADDING_X * 2;
}

// Every column but the description is as wide as its text plus its spare
// room, whatever the font, size or amounts, and the description takes the
// rest. A row short of room gives up the spare room first; one whose figures
// still don't fit squeezes its columns, wrapping a figure rather than
// clipping it at the table's edge. A column that isn't shown measures 0.
function getColumnWidths<TColumn extends string>(
  measured: Record<TColumn, number>
) {
  const shown = Object.values<number>(measured).filter(width => width > 0);
  const freeWidth =
    TABLE_INNER_WIDTH * (1 - DESCRIPTION_MIN_SHARE) - sum(shown);
  const spareWidth = clamp(freeWidth / shown.length, 0, COLUMN_SPARE_WIDTH);

  return mapValues(measured, width => ({
    width: width + spareWidth,
    flexShrink: 1
  }));
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
  const headerStyle = pdfRoleStyle(theme, "tableHeaderRight");
  const cellStyle = pdfRoleStyle(theme, "tableRowRight");
  const fromCode = conversion ? [conversion.fromCode] : [];
  const amountLabel = getAmountColumnLabel(labels, invoice.sections.tax);
  const columnWidths = {
    description: {
      flexGrow: 1,
      flexShrink: 0,
      flexBasis: 0,
      minWidth: `${DESCRIPTION_MIN_SHARE * 100}%`
    },
    ...getColumnWidths({
      quantity: columns.quantityAndPrice
        ? measureColumn({
            header: [labels.quantity],
            cells: lineItems.map(row => String(row.quantity)),
            headerStyle,
            cellStyle
          })
        : 0,
      unit: columns.unit
        ? measureColumn({
            header: [labels.unit],
            cells: lineItems.map(row => row.unit),
            headerStyle,
            cellStyle
          })
        : 0,
      unitPrice: columns.quantityAndPrice
        ? measureColumn({
            header: [labels.unitPrice, ...fromCode],
            cells: lineItems.map(row => row.unitPrice),
            headerStyle,
            cellStyle
          })
        : 0,
      tax: hasTaxColumn
        ? measureColumn({
            header: [getTaxColumnLabel(labels, invoice.labels)],
            cells: lineItems.map(row => row.tax),
            headerStyle,
            cellStyle
          })
        : 0,
      amount: measureColumn({
        header: [amountLabel, ...fromCode],
        cells: lineItems.map(row => row.amount),
        headerStyle,
        cellStyle
      }),
      convertedAmount: conversion
        ? measureColumn({
            header: [amountLabel, conversion.toCode],
            cells: lineItems.map(row => row.convertedAmount ?? ""),
            headerStyle,
            cellStyle
          })
        : 0
    })
  };
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
        <View style={[styles.tableCell, columnWidths.description]}>
          <Text style={pdfRoleStyle(theme, "tableHeaderLeft")}>
            {labels.description}
          </Text>
        </View>
        {columns.quantityAndPrice && (
          <View style={[styles.tableCell, columnWidths.quantity]}>
            <Text style={pdfRoleStyle(theme, "tableHeaderCenter")}>
              {labels.quantity}
            </Text>
          </View>
        )}
        {columns.unit && (
          <View style={[styles.tableCell, columnWidths.unit]}>
            <Text style={pdfRoleStyle(theme, "tableHeaderCenter")}>
              {labels.unit}
            </Text>
          </View>
        )}
        {columns.quantityAndPrice && (
          <View style={[styles.tableCell, columnWidths.unitPrice]}>
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
          <View style={[styles.tableCell, columnWidths.tax]}>
            <Text style={pdfRoleStyle(theme, "tableHeaderCenter")}>
              {getTaxColumnLabel(labels, invoice.labels)}
            </Text>
          </View>
        )}
        <View style={[styles.tableCell, columnWidths.amount]}>
          <Text style={pdfRoleStyle(theme, "tableHeaderRight")}>
            {amountLabel}
          </Text>
          {conversion && (
            <Text style={pdfRoleStyle(theme, "tableHeaderRight")}>
              {conversion.fromCode}
            </Text>
          )}
        </View>
        {conversion && (
          <View style={[styles.tableCell, columnWidths.convertedAmount]}>
            <Text style={pdfRoleStyle(theme, "tableHeaderRight")}>
              {amountLabel}
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
            <View style={[styles.tableCell, columnWidths.description]}>
              <Text
                style={pdfRoleStyle(theme, "tableRowLeft")}
                hyphenationCallback={keepWordsWhole}
              >
                {row.description}
              </Text>
            </View>
            {columns.quantityAndPrice && (
              <View style={[styles.tableCell, columnWidths.quantity]}>
                <Text style={pdfRoleStyle(theme, "tableRowCenter")}>
                  {row.quantity}
                </Text>
              </View>
            )}
            {columns.unit && (
              <View style={[styles.tableCell, columnWidths.unit]}>
                <Text style={pdfRoleStyle(theme, "tableRowCenter")}>
                  {row.unit}
                </Text>
              </View>
            )}
            {columns.quantityAndPrice && (
              <View style={[styles.tableCell, columnWidths.unitPrice]}>
                <Text style={pdfRoleStyle(theme, "tableRowCenter")}>
                  {row.unitPrice}
                </Text>
              </View>
            )}
            {hasTaxColumn && (
              <View style={[styles.tableCell, columnWidths.tax]}>
                <Text style={pdfRoleStyle(theme, "tableRowCenter")}>
                  {row.tax}
                </Text>
              </View>
            )}
            <View style={[styles.tableCell, columnWidths.amount]}>
              <Text style={pdfRoleStyle(theme, "tableRowRight")}>
                {row.amount}
              </Text>
            </View>
            {conversion && (
              <View style={[styles.tableCell, columnWidths.convertedAmount]}>
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
