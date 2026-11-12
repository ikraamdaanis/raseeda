import { IconMinus, IconPlus } from "@tabler/icons-react";
import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { InvoiceInput } from "~/components/editor/invoice-input";
import { InvoiceTextArea } from "~/components/editor/invoice-textarea";
import { NumberField, useNumberField } from "~/components/editor/number-field";
import { Button } from "~/components/ui/button";
import { useCurrencyConversion } from "~/hooks/use-currency-conversion";
import { useIsPreview, useShownSections } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import {
  useLineItemsSlice,
  useMoneyFormat,
  usePaperSize,
  useTheme
} from "~/stores/invoice-selectors";
import { useInvoiceStore } from "~/stores/invoice-store";
import type {
  CurrencyConversion,
  Invoice,
  InvoiceItem,
  InvoiceLineItemRow,
  InvoicePaperSize,
  InvoiceTheme,
  MoneyFormat,
  TableSettings,
  TextRole
} from "~/types";
import {
  buildLineItemRow,
  showsTaxColumn
} from "~/utils/build-invoice-view-model";
import { calculateLineAmount } from "~/utils/calculate-invoice-totals";
import { formatPlainNumber } from "~/utils/format-number";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";
import { layoutColumns } from "~/utils/layout-columns";
import {
  forgetMeasuredWidths,
  measureTextWidth
} from "~/utils/measure-text-width";
import { PDF_PAGE_PADDING, PDF_PAGE_SIZES } from "~/utils/pdf-styles";
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
// The Tax column shows, as in the PDF, whenever tax is on and charged per
// line; while editing, its cells are where a line's rate is set.
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
  const isPerLine = useInvoiceStore(state => state.tax.perLine);
  const sections = useShownSections();
  const hasTaxColumn = showsTaxColumn({
    tax: { perLine: isPerLine },
    sections
  });
  const canEditLineRates = !isPreview && hasTaxColumn;
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

// What the description keeps however long the figures: a few characters.
const DESCRIPTION_FLOOR_WIDTH = "4em";

// The rows' gap between columns, gap-2.
const COLUMN_GAP_WIDTH = 8;

// CSS pixels in a point: the canvas draws the page at the PDF's size.
const PX_PER_PT = 96 / 72;

// The width the columns share: the page inside its border and margins, less
// the table's border.
function getTableInnerWidth(paperSize: InvoicePaperSize) {
  return (
    (PDF_PAGE_SIZES[paperSize].width - PDF_PAGE_PADDING * 2) * PX_PER_PT - 4
  );
}

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

// The table's grid, laid out as the PDF lays out its columns, so Preview
// matches it. A blank header measures as its placeholder, and while editing a
// blank unit as its placeholder. The description takes the rest, giving up
// its share before a figure is clipped, down to a few characters.
function useColumnTemplate({
  columns,
  items,
  tableSettings,
  money
}: {
  columns: LineItemColumnConfig[];
  items: InvoiceItem[];
  tableSettings: TableSettings;
  money: MoneyFormat;
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
  const paperSize = usePaperSize();
  const isPreview = useIsPreview();
  const shownIds = new Set(columns.map(column => column.id));
  const unitPlaceholder = isPreview
    ? ""
    : (LINE_ITEM_COLUMNS.find(column => column.id === "unit")?.cell
        .placeholder ?? "");
  const rows = items.map(item => ({
    ...buildLineItemRow({ item, money, conversion, tax }),
    unit: item.unit || unitPlaceholder
  }));

  function getLabel(id: LineItemColumnConfig["id"]) {
    const column = LINE_ITEM_COLUMNS.find(config => config.id === id);

    if (!column) return "";

    return (
      getPrintedColumnLabel({
        column,
        columnLabels: tableSettings.columnLabels,
        taxLabel,
        hasTax
      }) || column.headerPlaceholder
    );
  }

  const headerStyle = getTextStyles({
    settings: getRoleSettings(theme, "tableHeaderRight")
  });
  const cellStyle = getTextStyles({
    settings: getRoleSettings(theme, "tableRowRight")
  });
  const layout = layoutColumns({
    columns: {
      quantityAndPrice: shownIds.has("quantity"),
      unit: shownIds.has("unit"),
      tax: shownIds.has("tax")
    },
    rows,
    labels: {
      quantity: getLabel("quantity"),
      unit: getLabel("unit"),
      unitPrice: getLabel("unitPrice"),
      tax: getLabel("tax"),
      amount: getLabel("amount")
    },
    conversion: shownIds.has("convertedAmount") ? conversion : null,
    tableWidth: getTableInnerWidth(paperSize),
    columnGap: COLUMN_GAP_WIDTH,
    measure: (text, part) =>
      measureTextWidth(text, part === "header" ? headerStyle : cellStyle)
  });
  const widths = new Map<string, number>(
    layout.columns.map(column => [column.id, column.width])
  );
  const descriptionMinWidth = `${layout.descriptionMinShare * 100}%`;

  return columns
    .map(column => {
      const width = widths.get(column.id);

      if (width === undefined) {
        return `minmax(max(${DESCRIPTION_FLOOR_WIDTH}, min(${descriptionMinWidth}, 100% - ${layout.figuresWidth}px)), 1fr)`;
      }

      return `${width}px`;
    })
    .join(" ");
}

export function InvoiceLineItems() {
  const {
    items,
    tableSettings,
    addItem,
    removeItem,
    updateItem,
    setItemTax,
    setItemAmount,
    setTableSettings
  } = useLineItemsSlice();
  const theme = useTheme();
  const isPreview = useIsPreview();
  const money = useMoneyFormat();
  // Worked out once for the table, so each row doesn't go over every line.
  const visibleColumns = useVisibleColumns();
  const columnTemplate = useColumnTemplate({
    columns: visibleColumns.columns,
    items,
    tableSettings,
    money
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
            money={money}
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
  money,
  theme,
  updateItem,
  setItemTax,
  setItemAmount,
  removeItem
}: {
  items: InvoiceItem[];
  visibleColumns: VisibleColumns;
  tableSettings: TableSettings;
  money: MoneyFormat;
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
          money={money}
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
  money,
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
  money: MoneyFormat;
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
  const viewRow = buildLineItemRow({ item, money, conversion, tax });
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
          money={money}
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
  money,
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
  money: MoneyFormat;
  theme: InvoiceTheme;
  invoiceTax: Invoice["tax"];
  canEditLineRates: boolean;
  canTypeAmount: boolean;
  updateItem: UpdateItem;
  setItemTax: SetItemTax;
  setItemAmount: SetItemAmount;
}) {
  const rowStyle = getTextStyles({
    settings: getRoleSettings(theme, column.rowRole)
  });

  function handleTextChange(value: string) {
    const itemField = column.cell.itemField;

    if (column.cell.kind !== "text" || !itemField) return;

    updateItem(index, itemField, value);
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
          money={money}
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
          money={money}
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

  const focusId =
    index === 0 && column.id === "description"
      ? "invoice-field-table"
      : undefined;
  const fieldLabel = `${cellLabel}, item ${index + 1}`;
  const dataField = `items.${item.id}.${column.cell.itemField}`;

  // A quantity reads the invoice's decimal separator, with up to two places
  // whatever the currency; a unit price takes the currency's. Either can be
  // negative, so a line can be a credit.
  if (column.cell.kind === "integer" || column.cell.kind === "currency") {
    const isPrice = column.cell.kind === "currency";

    return (
      <div role="cell" className={column.cell.wrapperClassName}>
        <NumberField
          aria-label={fieldLabel}
          data-field={dataField}
          value={isPrice ? item.unitPrice : item.quantity}
          onChange={value =>
            updateItem(index, isPrice ? "unitPrice" : "quantity", value)
          }
          money={money}
          decimals={isPrice ? money.decimals : 2}
          display={isPrice ? viewRow.unitPrice : undefined}
          showMarker={isPrice}
          placeholder={column.cell.placeholder}
          className={column.cell.inputClassName}
          style={rowStyle}
        />
      </div>
    );
  }

  const inputValue =
    column.cell.itemField === "description" || column.cell.itemField === "unit"
      ? item[column.cell.itemField]
      : "";

  // A description wraps onto more lines, as it does in the PDF, rather than
  // scrolling out of sight in a narrow column.
  if (column.id === "description") {
    return (
      <div role="cell" className={column.cell.wrapperClassName}>
        <InvoiceTextArea
          id={focusId}
          aria-label={fieldLabel}
          data-field={`items.${item.id}.description`}
          value={inputValue}
          placeholder={column.cell.placeholder}
          onChange={handleTextChange}
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
        aria-label={fieldLabel}
        data-field={dataField}
        value={inputValue}
        placeholder={column.cell.placeholder}
        onChange={handleTextChange}
        className={column.cell.inputClassName}
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
  money,
  style,
  setItemAmount
}: {
  item: InvoiceItem;
  label: string;
  formattedAmount: string;
  money: MoneyFormat;
  style: CSSProperties;
  setItemAmount: SetItemAmount;
}) {
  const amount = calculateLineAmount(
    item.quantity,
    item.unitPrice,
    money.decimals
  );

  return (
    <NumberField
      aria-label={label}
      data-field={`items.${item.id}.amount`}
      value={amount}
      onChange={value => setItemAmount(item.id, value)}
      money={money}
      decimals={money.decimals}
      display={formattedAmount}
      showMarker
      className="w-full rounded-none border-none py-2 font-medium ring-0 outline-none focus-visible:py-2"
      style={style}
    />
  );
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
  money,
  style,
  setItemTax
}: {
  item: InvoiceItem;
  label: string;
  index: number;
  invoiceTax: Invoice["tax"];
  money: MoneyFormat;
  style: CSSProperties;
  setItemTax: SetItemTax;
}) {
  const ownTax = item.tax;
  const isExempt = ownTax?.exempt ?? false;
  const inheritsExempt = !ownTax && invoiceTax.exempt;
  const field = useNumberField({
    value: ownTax?.percentage,
    onChange: percentage => setItemTax(item.id, { percentage, exempt: false }),
    onClear: () => setItemTax(item.id, undefined),
    money,
    decimals: 2,
    min: 0,
    max: 100
  });

  function toggleExempt() {
    setItemTax(item.id, {
      percentage: ownTax?.percentage ?? invoiceTax.percentage,
      exempt: !isExempt
    });
  }

  const placeholder = invoiceTax.exempt
    ? "Exempt"
    : formatPlainNumber(invoiceTax.percentage, money.numberFormat);
  // The field's width in characters, where the browser has no field-sizing
  // to fit it to its text and would otherwise make it 20 characters wide.
  const fieldSize = Math.max(1, (field.value || placeholder).length);

  return (
    <span className="flex h-full items-center justify-center">
      {!isExempt && (
        <InvoiceInput
          aria-label={label}
          data-field={`items.${item.id}.tax.percentage`}
          {...field}
          placeholder={placeholder}
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
