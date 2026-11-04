import { IconMinus, IconPlus } from "@tabler/icons-react";
import { sum } from "lodash-es";
import type { CSSProperties, FocusEvent } from "react";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { InvoiceInput } from "~/components/editor/invoice-input";
import { InvoiceTextArea } from "~/components/editor/invoice-textarea";
import { Button } from "~/components/ui/button";
import { getCurrencyMarker } from "~/consts/currencies";
import { useCurrencyConversion } from "~/hooks/use-currency-conversion";
import { useIsPreview, useShownSections } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import {
  useHasTaxColumn,
  useLineItemsSlice,
  useTheme
} from "~/stores/invoice-selectors";
import { useInvoiceStore } from "~/stores/invoice-store";
import type {
  CurrencyConversion,
  Invoice,
  InvoiceItem,
  InvoiceLineItemRow,
  InvoiceTheme,
  TableSettings,
  TextRole
} from "~/types";
import { buildLineItemRow } from "~/utils/build-invoice-view-model";
import { calculateLineAmount } from "~/utils/calculate-invoice-totals";
import {
  formatDecimalDraft,
  normalizeDecimalInput,
  parseDecimalDraft
} from "~/utils/decimal-input";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";
import { handlePercentageInput } from "~/utils/handle-percentage-input";
import {
  forgetMeasuredWidths,
  measureTextWidth
} from "~/utils/measure-text-width";
import {
  getAmountColumnLabel,
  getShownColumns,
  getTaxColumnLabel
} from "~/utils/table-columns";

type LineItemFieldKey = "description" | "quantity" | "unit" | "unitPrice";

type LineItemColumnKind =
  "text" | "integer" | "currency" | "tax" | "amount" | "convertedAmount";

interface LineItemColumnConfig {
  // The converted amount has no label of its own: it reads as the Amount
  // label in the second currency. The Tax column reads as the tax row's.
  id: keyof TableSettings["columnLabels"] | "tax" | "convertedAmount";
  headerRole: TextRole;
  rowRole: TextRole;
  headerPlaceholder: string;
  headerInputClassName: string;
  cell: {
    kind: LineItemColumnKind;
    itemField?: LineItemFieldKey;
    placeholder?: string;
    wrapperClassName: string;
    inputClassName?: string;
    displayClassName?: string;
  };
}

type UpdateItem = ReturnType<typeof useLineItemsSlice>["updateItem"];
type RemoveItem = ReturnType<typeof useLineItemsSlice>["removeItem"];
type SetItemTax = ReturnType<typeof useLineItemsSlice>["setItemTax"];
type SetItemAmount = ReturnType<typeof useLineItemsSlice>["setItemAmount"];
type SetTableSettings = ReturnType<
  typeof useLineItemsSlice
>["setTableSettings"];
type VisibleColumns = ReturnType<typeof useVisibleColumns>;

const LINE_ITEM_COLUMNS: LineItemColumnConfig[] = [
  {
    id: "description",
    headerRole: "tableHeaderLeft",
    rowRole: "tableRowLeft",
    headerPlaceholder: "Description",
    headerInputClassName:
      "relative h-full w-full rounded-none rounded-tl-sm border-none bg-transparent py-2 pl-2 hover:bg-brand-50 focus-visible:z-10 focus-visible:px-2",
    cell: {
      kind: "text",
      itemField: "description",
      placeholder: "Enter a description",
      wrapperClassName: "col-span-1 flex h-full items-center",
      inputClassName:
        "w-full rounded-none border-none py-2 pl-2 ring-0 outline-none focus-visible:py-2"
    }
  },
  {
    id: "quantity",
    headerRole: "tableHeaderCenter",
    rowRole: "tableRowCenter",
    headerPlaceholder: "Quantity",
    headerInputClassName:
      "relative h-full w-full rounded-none border-none bg-transparent py-2 hover:bg-brand-50 focus-visible:z-10 focus:px-0",
    cell: {
      kind: "integer",
      itemField: "quantity",
      wrapperClassName: "col-span-1 flex h-full items-center",
      inputClassName:
        "w-full rounded-none border-none py-2 ring-0 outline-none focus-visible:py-2"
    }
  },
  {
    id: "unit",
    headerRole: "tableHeaderCenter",
    rowRole: "tableRowCenter",
    headerPlaceholder: "Unit",
    headerInputClassName:
      "relative h-full w-full rounded-none border-none bg-transparent py-2 hover:bg-brand-50 focus-visible:z-10 focus:px-0",
    cell: {
      kind: "text",
      itemField: "unit",
      placeholder: "e.g. hrs",
      wrapperClassName: "col-span-1 flex h-full items-center",
      inputClassName:
        "w-full rounded-none border-none py-2 text-center ring-0 outline-none focus-visible:py-2"
    }
  },
  {
    id: "unitPrice",
    headerRole: "tableHeaderCenter",
    rowRole: "tableRowCenter",
    headerPlaceholder: "Unit Price",
    headerInputClassName:
      "relative h-full w-full rounded-none border-none bg-transparent py-2 hover:bg-brand-50 focus-visible:z-10 focus:px-0",
    cell: {
      kind: "currency",
      itemField: "unitPrice",
      wrapperClassName: "col-span-1 flex h-full items-center",
      inputClassName:
        "w-full rounded-none border-none py-2 ring-0 outline-none focus-visible:py-2"
    }
  },
  {
    id: "tax",
    headerRole: "tableHeaderCenter",
    rowRole: "tableRowCenter",
    headerPlaceholder: "Tax",
    headerInputClassName:
      "relative h-full w-full rounded-none border-none bg-transparent py-2 hover:bg-brand-50 focus-visible:z-10 focus:px-0",
    cell: {
      kind: "tax",
      wrapperClassName: "col-span-1 text-center",
      displayClassName: "inline-block h-full w-full"
    }
  },
  {
    id: "amount",
    headerRole: "tableHeaderRight",
    rowRole: "tableRowRight",
    headerPlaceholder: "Amount",
    headerInputClassName:
      "relative h-auto w-full rounded-none rounded-tr-sm border-none bg-transparent py-2 pr-2 hover:bg-brand-50 focus-visible:z-10 focus:pr-2 focus:pl-0",
    cell: {
      kind: "amount",
      wrapperClassName: "col-span-1 pr-2",
      displayClassName: "inline-block h-full w-full font-medium"
    }
  },
  {
    id: "convertedAmount",
    headerRole: "tableHeaderRight",
    rowRole: "tableRowRight",
    headerPlaceholder: "Converted amount",
    headerInputClassName: "block py-2 pr-2",
    cell: {
      kind: "convertedAmount",
      wrapperClassName: "col-span-1 pr-2",
      displayClassName: "inline-block h-full w-full font-medium"
    }
  }
];

// A column's header as it prints. The Tax and Amount headers follow the tax
// row's label and the tax section until they have labels of their own, and
// the converted amount reads as the Amount header.
function getPrintedColumnLabel({
  column,
  columnLabels,
  taxLabel,
  hasTax
}: {
  column: LineItemColumnConfig;
  columnLabels: TableSettings["columnLabels"];
  taxLabel: string;
  hasTax: boolean;
}) {
  if (column.id === "tax") {
    return getTaxColumnLabel(columnLabels, { tax: taxLabel });
  }

  if (column.id === "amount" || column.id === "convertedAmount") {
    return getAmountColumnLabel(columnLabels, hasTax);
  }

  return columnLabels[column.id];
}

// Whether a header left blank reads as another label rather than as nothing.
function followsLabel(
  column: LineItemColumnConfig
): column is LineItemColumnConfig & { id: "tax" | "amount" } {
  return column.id === "tax" || column.id === "amount";
}

// The converted amount reads as the Amount header in the second currency,
// "Net amount (USD)", wherever a cell needs its column named.
function getColumnLabel({
  conversion,
  ...printed
}: Parameters<typeof getPrintedColumnLabel>[0] & {
  conversion: CurrencyConversion | null;
}) {
  const label = getPrintedColumnLabel(printed);

  if (printed.column.id !== "convertedAmount") return label;

  return `${label} (${conversion?.toCode ?? ""})`;
}

// An invoice shown in a second currency names the currency of each money
// column under its label: the price columns in its own, the converted amount
// in the other.
function getColumnCurrency(
  column: LineItemColumnConfig,
  conversion: CurrencyConversion | null
) {
  if (!conversion) return "";
  if (column.id === "convertedAmount") return conversion.toCode;
  if (column.id !== "unitPrice" && column.id !== "amount") return "";

  return conversion.fromCode;
}

/**
 * Displays the line items for the invoice. Subscribes to the line-items slice
 * once here and passes each cell only the value and handlers it needs, so a
 * single item edit does not fan out store subscriptions across every cell.
 */
// Quantity, Unit and Unit price show as the table's settings say, and the PDF
// leaves out the Unit column when no line has a unit, so Preview does too.
// The Tax column shows, as in the PDF, only while the lines' rates differ.
// While editing with Per line on it always shows, so there's somewhere to set
// a line's rate.
// With quantity and price off, a line's amount is typed in instead.
function useVisibleColumns() {
  const isPreview = useIsPreview();
  const shown = useInvoiceStore(
    useShallow(state =>
      getShownColumns({
        columns: state.tableSettings.columns,
        items: state.items,
        isPrinted: isPreview
      })
    )
  );
  const hasConversion = useCurrencyConversion() !== null;
  const hasMixedRates = useHasTaxColumn();
  const isPerLine = useInvoiceStore(state => state.tax.perLine);
  const sections = useShownSections();
  const canEditLineRates = !isPreview && sections.tax && isPerLine;
  const hasTaxColumn = hasMixedRates || canEditLineRates;
  const columns = LINE_ITEM_COLUMNS.filter(column => {
    switch (column.id) {
      case "quantity":
      case "unitPrice":
        return shown.quantityAndPrice;
      case "unit":
        return shown.unit;
      case "tax":
        return hasTaxColumn;
      case "convertedAmount":
        return hasConversion;
      default:
        return true;
    }
  });

  return {
    columns,
    canEditLineRates,
    canTypeAmount: !isPreview && !shown.quantityAndPrice
  };
}

// The description keeps at least this much of the table while the figures
// leave room for it.
const DESCRIPTION_MIN_WIDTH = "15%";

// What the description keeps however long the figures: a few characters.
const DESCRIPTION_FLOOR_WIDTH = "4em";

// The rows' gap between columns, gap-2.
const COLUMN_GAP_WIDTH = 8;

// Room a field needs beyond its text: its padding while it's edited.
const CELL_PADDING_WIDTH = 16;

// Room a column takes beyond that where the row has it, so the figures don't
// crowd. A row short of room gives it up before the description shrinks.
const COLUMN_SPARE_WIDTH = 12;

// Bumps when a web font finishes loading, so text measured in a fallback font
// is measured again.
function useFontLoads() {
  const [fontLoads, setFontLoads] = useState(0);

  useEffect(() => {
    function handleLoadingDone() {
      forgetMeasuredWidths();
      setFontLoads(count => count + 1);
    }

    document.fonts.addEventListener("loadingdone", handleLoadingDone);

    return () =>
      document.fonts.removeEventListener("loadingdone", handleLoadingDone);
  }, []);

  return fontLoads;
}

// The table's grid: every column but the description as wide as its widest
// text, a label, its currency or a line's figure, and the description the
// rest, the way the PDF sizes them, so Preview matches it. The grid grows a
// column into its spare room only once each column has its text's width, and
// the description takes what's left.
function useColumnTemplate({
  columns,
  items,
  tableSettings,
  currency
}: {
  columns: LineItemColumnConfig[];
  items: InvoiceItem[];
  tableSettings: TableSettings;
  currency: string;
}) {
  // Measured text changes when a font loads, which nothing here reads, so the
  // compiler mustn't keep a template measured in the fallback.
  "use no memo";

  useFontLoads();

  const theme = useTheme();
  const conversion = useCurrencyConversion();
  const tax = useInvoiceStore(state => state.tax);
  const taxLabel = useInvoiceStore(state => state.labels.tax);
  const hasTax = useInvoiceStore(state => state.sections.tax);
  const isPreview = useIsPreview();
  const rows = items.map(item =>
    buildLineItemRow({ item, currency, conversion, tax })
  );

  function getCellTexts(column: LineItemColumnConfig) {
    switch (column.id) {
      case "quantity":
        return items.map(item => String(item.quantity));
      case "unit":
        return items.map(
          item =>
            item.unit || (isPreview ? "" : (column.cell.placeholder ?? ""))
        );
      case "unitPrice":
        return rows.map(row => row.unitPrice);
      case "tax":
        return rows.map(row => row.tax);
      case "amount":
        return rows.map(row => row.amount);
      case "convertedAmount":
        return rows.map(row => row.convertedAmount ?? "");
      default:
        return [];
    }
  }

  // Each figure column's width: its widest text, header line or figure, and
  // the field's padding.
  function measureColumn(column: LineItemColumnConfig) {
    const headerStyle = getTextStyles({
      settings: getRoleSettings(theme, column.headerRole)
    });
    const rowStyle = getTextStyles({
      settings: getRoleSettings(theme, column.rowRole)
    });
    const label =
      getPrintedColumnLabel({
        column,
        columnLabels: tableSettings.columnLabels,
        taxLabel,
        hasTax
      }) || column.headerPlaceholder;
    const headerWidths = [label, getColumnCurrency(column, conversion)].map(
      line => measureTextWidth(line, headerStyle)
    );
    const cellWidths = getCellTexts(column).map(text =>
      measureTextWidth(text, rowStyle)
    );

    return (
      Math.ceil(Math.max(0, ...headerWidths, ...cellWidths)) +
      CELL_PADDING_WIDTH
    );
  }

  const widths = new Map(
    columns
      .filter(column => column.id !== "description")
      .map(column => [column.id, measureColumn(column)])
  );
  // What the figures and the gaps between the columns take. The description
  // keeps its share of the rest, but gives it up before a figure is clipped,
  // as the PDF's does, down to a few characters.
  const figuresWidth =
    sum([...widths.values()]) + COLUMN_GAP_WIDTH * (columns.length - 1);

  return columns
    .map(column => {
      const width = widths.get(column.id);

      if (width === undefined) {
        return `minmax(max(${DESCRIPTION_FLOOR_WIDTH}, min(${DESCRIPTION_MIN_WIDTH}, 100% - ${figuresWidth}px)), 1fr)`;
      }

      return `minmax(${width}px, ${width + COLUMN_SPARE_WIDTH}px)`;
    })
    .join(" ");
}

export function InvoiceLineItems() {
  const {
    items,
    tableSettings,
    currency,
    addItem,
    removeItem,
    updateItem,
    setItemTax,
    setItemAmount,
    setTableSettings
  } = useLineItemsSlice();
  const theme = useTheme();
  const isPreview = useIsPreview();
  const currencySymbol = getCurrencyMarker(currency);
  // Worked out once for the table, so each row doesn't go over every line.
  const visibleColumns = useVisibleColumns();
  const columnTemplate = useColumnTemplate({
    columns: visibleColumns.columns,
    items,
    tableSettings,
    currency
  });

  return (
    <div data-field-area="items" className="w-full">
      <div
        role="table"
        aria-label="Invoice line items"
        className="line-items-container rounded-surface flex flex-col border"
        style={
          {
            borderColor: tableSettings.borderColor,
            "--line-item-columns": columnTemplate
          } as CSSProperties
        }
      >
        <div role="rowgroup" className="flex flex-col">
          <TableHeader
            columns={visibleColumns.columns}
            tableSettings={tableSettings}
            theme={theme}
            setTableSettings={setTableSettings}
          />
        </div>
        <div role="rowgroup" className="flex flex-col">
          <LineItems
            items={items}
            visibleColumns={visibleColumns}
            tableSettings={tableSettings}
            currency={currency}
            currencySymbol={currencySymbol}
            theme={theme}
            updateItem={updateItem}
            setItemTax={setItemTax}
            setItemAmount={setItemAmount}
            removeItem={removeItem}
          />
        </div>
      </div>
      {isPreview ? (
        <div aria-hidden="true" className="my-1.5 h-8" />
      ) : (
        <AddItemButton addItem={addItem} />
      )}
    </div>
  );
}

function TableHeader({
  columns,
  tableSettings,
  theme,
  setTableSettings
}: {
  columns: LineItemColumnConfig[];
  tableSettings: TableSettings;
  theme: InvoiceTheme;
  setTableSettings: SetTableSettings;
}) {
  const conversion = useCurrencyConversion();
  const taxLabel = useInvoiceStore(state => state.labels.tax);
  const hasTax = useInvoiceStore(state => state.sections.tax);
  const isPreview = useIsPreview();

  function getPrintedLabel(column: LineItemColumnConfig) {
    return getPrintedColumnLabel({
      column,
      columnLabels: tableSettings.columnLabels,
      taxLabel,
      hasTax
    });
  }

  // A following header is blank, with what it follows as its placeholder;
  // Preview has no placeholders, so it reads the label itself.
  function getHeaderLabel(column: LineItemColumnConfig) {
    if (isPreview || !followsLabel(column)) return getPrintedLabel(column);

    return tableSettings.columnLabels[column.id];
  }

  function getHeaderPlaceholder(column: LineItemColumnConfig) {
    if (!followsLabel(column)) return column.headerPlaceholder;

    return getPrintedColumnLabel({
      column,
      columnLabels: { ...tableSettings.columnLabels, [column.id]: "" },
      taxLabel,
      hasTax
    });
  }

  return (
    <div
      role="row"
      className="grid items-start gap-2 rounded-t-sm font-medium"
      style={{
        backgroundColor: tableSettings.backgroundColor,
        borderColor: tableSettings.borderColor,
        gridTemplateColumns: "var(--line-item-columns)"
      }}
    >
      {columns.map(column => (
        <TableHeaderCell
          key={column.id}
          column={column}
          label={getHeaderLabel(column)}
          placeholder={getHeaderPlaceholder(column)}
          currencyCode={getColumnCurrency(column, conversion)}
          theme={theme}
          setTableSettings={setTableSettings}
        />
      ))}
    </div>
  );
}

// The labels share the top line; a money column's currency sits under its
// label, so the column stays as narrow as its figures. Over a currency the
// label's highlight hugs its text, 4px clear of the currency, and starts 4px
// lower so the text still lines up with the other labels. Every label is as
// tall as its line, since an input centres its text in whatever height it
// has. A label keeps its padding while it's edited, so it doesn't jump when
// clicked.
function TableHeaderCell({
  column,
  label,
  placeholder,
  currencyCode,
  theme,
  setTableSettings
}: {
  column: LineItemColumnConfig;
  label: string;
  placeholder: string;
  currencyCode: string;
  theme: InvoiceTheme;
  setTableSettings: SetTableSettings;
}) {
  const settings = getRoleSettings(theme, column.headerRole);
  const style = getTextStyles({ settings });
  // A following header's placeholder is what prints, so it reads in the
  // header's own colour rather than as a hint.
  const labelClassName = cn(
    column.headerInputClassName,
    "h-auto",
    currencyCode ? "mt-1 py-1 focus:py-1" : "focus:pt-2 focus:pb-2",
    followsLabel(column) && "placeholder:text-current"
  );

  function handleChange(value: string) {
    setTableSettings(prev => ({
      ...prev,
      columnLabels: { ...prev.columnLabels, [column.id]: value }
    }));
  }

  return (
    <div
      role="columnheader"
      className="col-span-1 flex flex-col text-sm font-medium"
      style={style}
    >
      {column.id === "convertedAmount" ? (
        <span className={labelClassName} style={style}>
          {label}
        </span>
      ) : (
        <InvoiceInput
          aria-label={`${column.headerPlaceholder} column label`}
          data-field={`tableSettings.columnLabels.${column.id}`}
          value={label}
          onChange={handleChange}
          className={labelClassName}
          placeholder={placeholder}
          style={style}
        />
      )}
      {currencyCode && (
        <span
          className={cn(
            "pb-2",
            column.headerRole === "tableHeaderRight" && "pr-2"
          )}
          style={style}
        >
          {currencyCode}
        </span>
      )}
    </div>
  );
}

function LineItems({
  items,
  visibleColumns,
  tableSettings,
  currency,
  currencySymbol,
  theme,
  updateItem,
  setItemTax,
  setItemAmount,
  removeItem
}: {
  items: InvoiceItem[];
  visibleColumns: VisibleColumns;
  tableSettings: TableSettings;
  currency: string;
  currencySymbol: string;
  theme: InvoiceTheme;
  updateItem: UpdateItem;
  setItemTax: SetItemTax;
  setItemAmount: SetItemAmount;
  removeItem: RemoveItem;
}) {
  return (
    <>
      {items.map((item, index) => (
        <LineItem
          key={item.id}
          item={item}
          index={index}
          itemCount={items.length}
          visibleColumns={visibleColumns}
          tableSettings={tableSettings}
          currency={currency}
          currencySymbol={currencySymbol}
          theme={theme}
          updateItem={updateItem}
          setItemTax={setItemTax}
          setItemAmount={setItemAmount}
          removeItem={removeItem}
        />
      ))}
    </>
  );
}

function LineItem({
  item,
  index,
  itemCount,
  visibleColumns,
  tableSettings,
  currency,
  currencySymbol,
  theme,
  updateItem,
  setItemTax,
  setItemAmount,
  removeItem
}: {
  item: InvoiceItem;
  index: number;
  itemCount: number;
  visibleColumns: VisibleColumns;
  tableSettings: TableSettings;
  currency: string;
  currencySymbol: string;
  theme: InvoiceTheme;
  updateItem: UpdateItem;
  setItemTax: SetItemTax;
  setItemAmount: SetItemAmount;
  removeItem: RemoveItem;
}) {
  const conversion = useCurrencyConversion();
  const tax = useInvoiceStore(state => state.tax);
  const taxLabel = useInvoiceStore(state => state.labels.tax);
  const hasTax = useInvoiceStore(state => state.sections.tax);
  const viewRow = buildLineItemRow({ item, currency, conversion, tax });
  const isPreview = useIsPreview();
  const { columns, canEditLineRates, canTypeAmount } = visibleColumns;

  return (
    <div
      role="row"
      className="group/row relative grid items-center gap-2 border-t"
      style={{
        borderColor: tableSettings.borderColor,
        gridTemplateColumns: "var(--line-item-columns)"
      }}
    >
      {columns.map(column => (
        <TableCell
          key={`${item.id}-${column.id}`}
          column={column}
          columnLabel={getColumnLabel({
            column,
            columnLabels: tableSettings.columnLabels,
            taxLabel,
            hasTax,
            conversion
          })}
          item={item}
          index={index}
          viewRow={viewRow}
          currencySymbol={currencySymbol}
          theme={theme}
          invoiceTax={tax}
          canEditLineRates={canEditLineRates}
          canTypeAmount={canTypeAmount}
          updateItem={updateItem}
          setItemTax={setItemTax}
          setItemAmount={setItemAmount}
        />
      ))}
      {itemCount > 1 && !isPreview && (
        <RemoveItemButton
          itemId={item.id}
          index={index}
          removeItem={removeItem}
        />
      )}
    </div>
  );
}

function TableCell({
  column,
  columnLabel,
  item,
  index,
  viewRow,
  currencySymbol,
  theme,
  invoiceTax,
  canEditLineRates,
  canTypeAmount,
  updateItem,
  setItemTax,
  setItemAmount
}: {
  column: LineItemColumnConfig;
  columnLabel: string;
  item: InvoiceItem;
  index: number;
  viewRow: InvoiceLineItemRow;
  currencySymbol: string;
  theme: InvoiceTheme;
  invoiceTax: Invoice["tax"];
  canEditLineRates: boolean;
  canTypeAmount: boolean;
  updateItem: UpdateItem;
  setItemTax: SetItemTax;
  setItemAmount: SetItemAmount;
}) {
  const [isEditingNumeric, setIsEditingNumeric] = useState(false);
  const [numericDraft, setNumericDraft] = useState("");
  const storeNumber =
    column.cell.kind === "currency"
      ? item.unitPrice
      : column.cell.kind === "integer"
        ? item.quantity
        : null;

  // While typing, the draft already stands for the stored number ("5." is 5),
  // so it's left alone. When the number changes from outside (undo, redo, an
  // invoice from another tab), the draft takes the stored value, so the field
  // never shows a number the invoice doesn't have.
  useEffect(() => {
    if (storeNumber === null) return;

    setNumericDraft(draft =>
      parseDecimalDraft(draft) === storeNumber ? draft : String(storeNumber)
    );
  }, [storeNumber]);

  const rowStyle = getTextStyles({
    settings: getRoleSettings(theme, column.rowRole)
  });

  function handleChange(value: string) {
    const itemField = column.cell.itemField;
    if (!itemField) {
      return;
    }

    if (column.cell.kind === "text") {
      updateItem(index, itemField, value);
      return;
    }

    if (column.cell.kind === "integer" || column.cell.kind === "currency") {
      // Strip the symbol before sanitising: a symbol containing a dot (e.g. a
      // custom "Rs.") would otherwise survive as a stray decimal point, turning
      // a typed "5" into 0.05.
      const withoutSymbol =
        column.cell.kind === "currency"
          ? value.replace(currencySymbol, "")
          : value;
      const numericValue = normalizeDecimalInput(withoutSymbol);

      setNumericDraft(numericValue);
      updateItem(index, itemField, parseDecimalDraft(numericValue));
      return;
    }
  }

  function handleBlur({ target }: FocusEvent<HTMLInputElement>) {
    const itemField = column.cell.itemField;
    if (
      (column.cell.kind !== "currency" && column.cell.kind !== "integer") ||
      !itemField
    ) {
      return;
    }

    setIsEditingNumeric(false);
    setNumericDraft("");

    // A leftover draft ("5.", "-") settles on its number; a credit keeps its
    // minus.
    const draft = normalizeDecimalInput(
      target.value.replace(currencySymbol, "")
    );

    updateItem(index, itemField, parseDecimalDraft(draft));
  }

  function handleFocus() {
    if (column.cell.kind === "currency") {
      setNumericDraft(item.unitPrice.toString());
    } else if (column.cell.kind === "integer") {
      setNumericDraft(item.quantity.toString());
    } else {
      return;
    }

    setIsEditingNumeric(true);
  }

  const cellLabel = columnLabel || column.headerPlaceholder;

  if (column.cell.kind === "tax" && canEditLineRates) {
    return (
      <div role="cell" className={column.cell.wrapperClassName}>
        <TaxCell
          item={item}
          label={`${cellLabel}, item ${index + 1}`}
          index={index}
          invoiceTax={invoiceTax}
          style={rowStyle}
          setItemTax={setItemTax}
        />
      </div>
    );
  }

  if (column.cell.kind === "amount" && canTypeAmount) {
    return (
      <div role="cell" className={column.cell.wrapperClassName}>
        <AmountCell
          item={item}
          label={`${cellLabel}, item ${index + 1}`}
          formattedAmount={viewRow.amount}
          currencySymbol={currencySymbol}
          style={rowStyle}
          setItemAmount={setItemAmount}
        />
      </div>
    );
  }

  if (
    column.cell.kind === "amount" ||
    column.cell.kind === "convertedAmount" ||
    column.cell.kind === "tax"
  ) {
    return (
      <div role="cell" className={column.cell.wrapperClassName}>
        <span
          className={column.cell.displayClassName}
          style={rowStyle}
          aria-label={`${cellLabel}, item ${index + 1}`}
        >
          {column.cell.kind === "amount"
            ? viewRow.amount
            : column.cell.kind === "tax"
              ? viewRow.tax
              : viewRow.convertedAmount}
        </span>
      </div>
    );
  }

  let inputValue = "";
  if (column.cell.kind === "text" && column.cell.itemField) {
    inputValue = String(item[column.cell.itemField]);
  }

  if (column.cell.kind === "integer") {
    inputValue = isEditingNumeric ? numericDraft : item.quantity.toString();
  }

  if (column.cell.kind === "currency") {
    inputValue = isEditingNumeric
      ? formatDecimalDraft(numericDraft, currencySymbol)
      : viewRow.unitPrice;
  }

  const focusId =
    index === 0 && column.id === "description"
      ? "invoice-field-table"
      : undefined;

  // A description wraps onto more lines, as it does in the PDF, rather than
  // scrolling out of sight in a narrow column.
  if (column.id === "description") {
    return (
      <div role="cell" className={column.cell.wrapperClassName}>
        <InvoiceTextArea
          id={focusId}
          aria-label={`${cellLabel}, item ${index + 1}`}
          data-field={`items.${item.id}.description`}
          value={inputValue}
          placeholder={column.cell.placeholder}
          onChange={handleChange}
          className={column.cell.inputClassName}
          style={rowStyle}
        />
      </div>
    );
  }

  return (
    <div role="cell" className={column.cell.wrapperClassName}>
      <InvoiceInput
        id={focusId}
        aria-label={`${cellLabel}, item ${index + 1}`}
        data-field={`items.${item.id}.${column.cell.itemField}`}
        value={inputValue}
        placeholder={column.cell.placeholder}
        onChange={handleChange}
        className={column.cell.inputClassName}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={rowStyle}
      />
    </div>
  );
}

// A line's amount, typed straight in while quantity and price are hidden. It
// reads as the amount until focused, then as the bare figure; typing makes
// the line one at that price, so the hidden columns always add up to it.
function AmountCell({
  item,
  label,
  formattedAmount,
  currencySymbol,
  style,
  setItemAmount
}: {
  item: InvoiceItem;
  label: string;
  formattedAmount: string;
  currencySymbol: string;
  style: CSSProperties;
  setItemAmount: SetItemAmount;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const amount = calculateLineAmount(item.quantity, item.unitPrice);

  // An outside change (undo, another tab) while focused shows the new figure.
  useEffect(() => {
    setDraft(previous =>
      previous === null || parseDecimalDraft(previous) === amount
        ? previous
        : String(amount)
    );
  }, [amount]);

  function handleChange(value: string) {
    const numericValue = normalizeDecimalInput(
      value.replace(currencySymbol, "")
    );

    setDraft(numericValue);
    setItemAmount(item.id, parseDecimalDraft(numericValue));
  }

  return (
    <InvoiceInput
      aria-label={label}
      data-field={`items.${item.id}.amount`}
      value={
        draft === null
          ? formattedAmount
          : formatDecimalDraft(draft, currencySymbol)
      }
      onChange={handleChange}
      onFocus={() => setDraft(String(amount))}
      onBlur={() => setDraft(null)}
      className="w-full rounded-none border-none py-2 font-medium ring-0 outline-none focus-visible:py-2"
      style={style}
    />
  );
}

// What a line's rate field shows for its own rate: the digits being typed
// while they stand for it ("5." is 5), otherwise the rate itself. A line on
// the invoice's rate shows nothing, leaving the placeholder.
function reconcileRateDraft(draft: string, percentage: number | undefined) {
  if (percentage === undefined) return "";
  if (draft !== "" && Number(draft) === percentage) return draft;

  return String(percentage);
}

// A line's own tax rate. Left blank, the line is on the invoice's rate, which
// shows as the placeholder; cleared, it goes back on it. The toggle after it
// marks the line exempt, hiding the rate but keeping it for when it's toggled
// back, and stays the same button either way so focus stays on it. A line on
// an exempt invoice rate has no toggle, as it's already exempt.
function TaxCell({
  item,
  label,
  index,
  invoiceTax,
  style,
  setItemTax
}: {
  item: InvoiceItem;
  label: string;
  index: number;
  invoiceTax: Invoice["tax"];
  style: CSSProperties;
  setItemTax: SetItemTax;
}) {
  const ownTax = item.tax;
  const isExempt = ownTax?.exempt ?? false;
  const inheritsExempt = !ownTax && invoiceTax.exempt;
  const [draft, setDraft] = useState(() =>
    reconcileRateDraft("", ownTax?.percentage)
  );

  useEffect(() => {
    setDraft(previous => reconcileRateDraft(previous, ownTax?.percentage));
  }, [ownTax?.percentage]);

  function handleChange(value: string) {
    const numericValue = handlePercentageInput(value);

    setDraft(numericValue);
    setItemTax(
      item.id,
      numericValue === ""
        ? undefined
        : { percentage: Number(numericValue), exempt: false }
    );
  }

  function handleBlur() {
    if (draft.endsWith(".")) setDraft(draft.slice(0, -1));
  }

  function toggleExempt() {
    setItemTax(item.id, {
      percentage: ownTax?.percentage ?? invoiceTax.percentage,
      exempt: !isExempt
    });
  }

  const placeholder = invoiceTax.exempt
    ? "Exempt"
    : String(invoiceTax.percentage);
  // The field's width in characters, where the browser has no field-sizing
  // to fit it to its text and would otherwise make it 20 characters wide.
  const fieldSize = Math.max(1, (draft || placeholder).length);

  return (
    <span className="flex h-full items-center justify-center">
      {!isExempt && (
        <InvoiceInput
          aria-label={label}
          data-field={`items.${item.id}.tax.percentage`}
          value={draft}
          placeholder={placeholder}
          onChange={handleChange}
          onBlur={handleBlur}
          size={fieldSize}
          className="field-sizing-content w-auto min-w-[2ch] py-2 text-right focus:px-1 focus:py-2"
          style={style}
        />
      )}
      {!inheritsExempt && (
        <button
          type="button"
          aria-label={`Toggle exempt, item ${index + 1}`}
          aria-pressed={isExempt}
          data-field={`items.${item.id}.tax.exempt`}
          onClick={toggleExempt}
          className="hover:bg-paper-muted focus-visible:ring-ring rounded px-0.5 outline-none focus-visible:ring-1"
          style={style}
        >
          {isExempt ? "Exempt" : "%"}
        </button>
      )}
    </span>
  );
}

function RemoveItemButton({
  itemId,
  index,
  removeItem
}: {
  itemId: string;
  index: number;
  removeItem: RemoveItem;
}) {
  return (
    <div className="absolute -right-10">
      <Button
        size="icon"
        variant="ghost"
        aria-label={`Remove item ${index + 1}`}
        onClick={() => removeItem(itemId)}
        className="text-paper-muted-foreground hover:text-destructive opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
      >
        <IconMinus className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

function AddItemButton({
  addItem
}: {
  addItem: ReturnType<typeof useLineItemsSlice>["addItem"];
}) {
  function handleAddItem() {
    addItem({
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unit: "",
      unitPrice: 0
    });
  }

  // A quiet button under the table, always there while editing and only as
  // wide as its label; it fills in on hover.
  return (
    <button
      type="button"
      onClick={handleAddItem}
      className="text-paper-muted-foreground hover:bg-paper-muted hover:text-paper-foreground focus-visible:ring-ring rounded-control my-1.5 flex h-8 w-fit items-center gap-1.5 px-2 text-sm transition-colors outline-none focus-visible:ring-1 pointer-coarse:h-11"
    >
      <IconPlus aria-hidden="true" className="size-3.5" />
      Add item
    </button>
  );
}
