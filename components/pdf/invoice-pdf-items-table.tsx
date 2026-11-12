import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import type {
  CurrencyConversion,
  Invoice,
  InvoiceLineItemRow,
  InvoicePaperSize
} from "~/types";
import { layoutColumns } from "~/utils/layout-columns";
import { measurePdfText } from "~/utils/measure-pdf-text";
import { breakBeforeCurrency } from "~/utils/pdf-money-breaks";
import {
  PDF_PAGE_PADDING,
  PDF_PAGE_SIZES,
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

// The width the columns share: the page inside its margins, less the table's
// border and the rows' padding. Letter is 17pt wider than A4.
function getTableInnerWidth(paperSize: InvoicePaperSize) {
  return (
    PDF_PAGE_SIZES[paperSize].width -
    PDF_PAGE_PADDING * 2 -
    2 -
    ROW_PADDING_X * 2
  );
}

// How wide a text sets in the table, a header line as wide as it is once it
// wraps between its words.
function measureTableText(text: string, style: Style, part: "header" | "cell") {
  const width = measurePdfText(text, style);

  if (part === "cell" || width <= HEADER_LINE_MAX_WIDTH) return width;

  const wordWidths = text.split(/\s+/).map(word => measurePdfText(word, style));

  return Math.max(HEADER_LINE_MAX_WIDTH, ...wordWidths);
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
  const amountLabel = getAmountColumnLabel(labels, invoice.sections.tax);
  const layout = layoutColumns({
    columns: { ...columns, tax: hasTaxColumn },
    rows: lineItems,
    labels: {
      ...labels,
      tax: getTaxColumnLabel(labels, invoice.labels),
      amount: amountLabel
    },
    conversion,
    tableWidth: getTableInnerWidth(invoice.paperSize),
    measure: (text, part) =>
      measureTableText(text, part === "header" ? headerStyle : cellStyle, part)
  });
  const descriptionWidth = {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
    minWidth: `${layout.descriptionMinShare * 100}%`
  };

  // A row whose figures don't fit squeezes its columns, wrapping a figure
  // rather than clipping it at the table's edge.
  function getColumnWidth(id: (typeof layout.columns)[number]["id"]) {
    const width = layout.columns.find(column => column.id === id)?.width ?? 0;

    return { width, flexShrink: 1 };
  }

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
        <View style={[styles.tableCell, descriptionWidth]}>
          <Text style={pdfRoleStyle(theme, "tableHeaderLeft")}>
            {labels.description}
          </Text>
        </View>
        {columns.quantityAndPrice && (
          <View style={[styles.tableCell, getColumnWidth("quantity")]}>
            <Text style={pdfRoleStyle(theme, "tableHeaderCenter")}>
              {labels.quantity}
            </Text>
          </View>
        )}
        {columns.unit && (
          <View style={[styles.tableCell, getColumnWidth("unit")]}>
            <Text style={pdfRoleStyle(theme, "tableHeaderCenter")}>
              {labels.unit}
            </Text>
          </View>
        )}
        {columns.quantityAndPrice && (
          <View style={[styles.tableCell, getColumnWidth("unitPrice")]}>
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
          <View style={[styles.tableCell, getColumnWidth("tax")]}>
            <Text style={pdfRoleStyle(theme, "tableHeaderCenter")}>
              {getTaxColumnLabel(labels, invoice.labels)}
            </Text>
          </View>
        )}
        <View style={[styles.tableCell, getColumnWidth("amount")]}>
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
          <View style={[styles.tableCell, getColumnWidth("convertedAmount")]}>
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
            <View style={[styles.tableCell, descriptionWidth]}>
              <Text
                style={pdfRoleStyle(theme, "tableRowLeft")}
                hyphenationCallback={keepWordsWhole}
              >
                {row.description}
              </Text>
            </View>
            {columns.quantityAndPrice && (
              <View style={[styles.tableCell, getColumnWidth("quantity")]}>
                <Text style={pdfRoleStyle(theme, "tableRowCenter")}>
                  {row.quantity}
                </Text>
              </View>
            )}
            {columns.unit && (
              <View style={[styles.tableCell, getColumnWidth("unit")]}>
                <Text style={pdfRoleStyle(theme, "tableRowCenter")}>
                  {row.unit}
                </Text>
              </View>
            )}
            {columns.quantityAndPrice && (
              <View style={[styles.tableCell, getColumnWidth("unitPrice")]}>
                <Text
                  style={pdfRoleStyle(theme, "tableRowCenter")}
                  hyphenationCallback={breakBeforeCurrency}
                >
                  {row.unitPrice}
                </Text>
              </View>
            )}
            {hasTaxColumn && (
              <View style={[styles.tableCell, getColumnWidth("tax")]}>
                <Text style={pdfRoleStyle(theme, "tableRowCenter")}>
                  {row.tax}
                </Text>
              </View>
            )}
            <View style={[styles.tableCell, getColumnWidth("amount")]}>
              <Text
                style={pdfRoleStyle(theme, "tableRowRight")}
                hyphenationCallback={breakBeforeCurrency}
              >
                {row.amount}
              </Text>
            </View>
            {conversion && (
              <View
                style={[styles.tableCell, getColumnWidth("convertedAmount")]}
              >
                <Text
                  style={pdfRoleStyle(theme, "tableRowRight")}
                  hyphenationCallback={breakBeforeCurrency}
                >
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
