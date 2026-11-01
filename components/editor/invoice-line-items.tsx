import { IconMinus, IconPlus } from "@tabler/icons-react";
import type { FocusEvent } from "react";
import { useEffect, useState } from "react";
import { InvoiceInput } from "~/components/editor/invoice-input";
import { Button } from "~/components/ui/button";
import { getCurrencyMarker } from "~/consts/currencies";
import { useCurrencyConversion } from "~/hooks/use-currency-conversion";
import { useIsPreview } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import { useLineItemsSlice, useTheme } from "~/stores/invoice-selectors";
import { useInvoiceStore } from "~/stores/invoice-store";
import type {
  CurrencyConversion,
  InvoiceItem,
  InvoiceLineItemRow,
  InvoiceTheme,
  TableSettings,
  TextRole
} from "~/types";
import { buildLineItemRow } from "~/utils/build-invoice-view-model";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";

type LineItemFieldKey = "description" | "quantity" | "unit" | "unitPrice";

type LineItemColumnKind =
  "text" | "integer" | "currency" | "amount" | "convertedAmount";

interface LineItemColumnConfig {
  // The converted amount has no label of its own: it reads as the Amount
  // label in the second currency.
  id: keyof TableSettings["columnLabels"] | "convertedAmount";
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
type SetTableSettings = ReturnType<
  typeof useLineItemsSlice
>["setTableSettings"];

// Coerce raw input into a decimal draft string: drop everything that is not a
// digit or a dot (this also strips any currency symbol), keep only the first
// dot, cap at two decimal places, and remove leading zeros.
function normalizeDecimalInput(value: string): string {
  let numericValue = value.replace(/[^0-9.]/g, "");

  const firstDot = numericValue.indexOf(".");

  if (firstDot !== -1) {
    const wholePart = numericValue.slice(0, firstDot);
    const decimalPart = numericValue
      .slice(firstDot + 1)
      .replace(/\./g, "")
      .slice(0, 2);
    numericValue = `${wholePart}.${decimalPart}`;
  }

  if (
    numericValue.length > 1 &&
    numericValue.startsWith("0") &&
    !numericValue.startsWith("0.")
  ) {
    numericValue = numericValue.replace(/^0+/, "");
  }

  return numericValue;
}

// An in-progress draft like "" or "." has no numeric value yet, so it commits
// as 0.
function parseDecimalDraft(draft: string): number {
  return draft === "" || draft === "." ? 0 : Number(draft);
}

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
      "relative h-full w-full rounded-none border-none bg-transparent py-2 hover:bg-brand-50 focus-visible:z-10 focus-visible:px-2",
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
      "relative h-full w-full rounded-none border-none bg-transparent py-2 hover:bg-brand-50 focus-visible:z-10 focus-visible:px-2",
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
      "relative h-full w-full rounded-none border-none bg-transparent py-2 hover:bg-brand-50 focus-visible:z-10 focus-visible:px-2",
    cell: {
      kind: "currency",
      itemField: "unitPrice",
      wrapperClassName: "col-span-1 flex h-full items-center",
      inputClassName:
        "w-full rounded-none border-none py-2 ring-0 outline-none focus-visible:py-2"
    }
  },
  {
    id: "amount",
    headerRole: "tableHeaderRight",
    rowRole: "tableRowRight",
    headerPlaceholder: "Amount",
    headerInputClassName:
      "relative h-auto w-full rounded-none rounded-tr-sm border-none bg-transparent py-2 pr-2 hover:bg-brand-50 focus-visible:z-10 focus-visible:p-2",
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

// An invoice shown in a second currency names its own on the price columns,
// "Unit Price (GBP)", beside the amount in the other, "Amount (USD)".
function getColumnLabel(
  column: LineItemColumnConfig,
  columnLabels: TableSettings["columnLabels"],
  conversion: CurrencyConversion | null
) {
  return column.id === "convertedAmount"
    ? `${columnLabels.amount || "Amount"} (${conversion?.toCode ?? ""})`
    : columnLabels[column.id];
}

function columnCurrencySuffix(
  column: LineItemColumnConfig,
  conversion: CurrencyConversion | null
) {
  if (!conversion) return "";
  if (column.id !== "unitPrice" && column.id !== "amount") return "";

  return `(${conversion.fromCode})`;
}

/**
 * Displays the line items for the invoice. Subscribes to the line-items slice
 * once here and passes each cell only the value and handlers it needs, so a
 * single item edit does not fan out store subscriptions across every cell.
 */
// The PDF leaves out the Unit column when no line has a unit, so Preview does
// too. While editing it always shows, so there's somewhere to type one.
// The converted amount takes its room from the other columns, so the table
// keeps the page's width.
function useVisibleColumns() {
  const isPreview = useIsPreview();
  const hasUnits = useInvoiceStore(state =>
    state.items.some(item => item.unit.trim())
  );
  const hasConversion = useCurrencyConversion() !== null;
  const hideUnit = isPreview && !hasUnits;
  const columns = LINE_ITEM_COLUMNS.filter(
    column =>
      (column.id !== "unit" || !hideUnit) &&
      (column.id !== "convertedAmount" || hasConversion)
  );

  if (hasConversion) {
    return {
      columns,
      gridClassName: hideUnit
        ? "grid-cols-[1fr_64px_120px_130px_130px]"
        : "grid-cols-[1fr_64px_64px_120px_130px_130px]"
    };
  }

  return {
    columns,
    gridClassName: hideUnit
      ? "grid-cols-[1fr_80px_120px_150px]"
      : "grid-cols-[1fr_80px_80px_120px_150px]"
  };
}

export function InvoiceLineItems() {
  const {
    items,
    tableSettings,
    currency,
    addItem,
    removeItem,
    updateItem,
    setTableSettings
  } = useLineItemsSlice();
  const theme = useTheme();
  const isPreview = useIsPreview();
  const currencySymbol = getCurrencyMarker(currency);

  return (
    <div data-field-area="items" className="w-full">
      <div
        role="table"
        aria-label="Invoice line items"
        className="line-items-container rounded-surface flex flex-col border"
        style={{ borderColor: tableSettings.borderColor }}
      >
        <div role="rowgroup" className="flex flex-col">
          <TableHeader
            tableSettings={tableSettings}
            theme={theme}
            setTableSettings={setTableSettings}
          />
        </div>
        <div role="rowgroup" className="flex flex-col">
          <LineItems
            items={items}
            tableSettings={tableSettings}
            currency={currency}
            currencySymbol={currencySymbol}
            theme={theme}
            updateItem={updateItem}
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
  tableSettings,
  theme,
  setTableSettings
}: {
  tableSettings: TableSettings;
  theme: InvoiceTheme;
  setTableSettings: SetTableSettings;
}) {
  const { columns, gridClassName } = useVisibleColumns();
  const conversion = useCurrencyConversion();

  return (
    <div
      role="row"
      className={cn("grid gap-2 rounded-t-sm font-medium", gridClassName)}
      style={{
        backgroundColor: tableSettings.backgroundColor,
        borderColor: tableSettings.borderColor
      }}
    >
      {columns.map(column => (
        <TableHeaderCell
          key={column.id}
          column={column}
          label={getColumnLabel(column, tableSettings.columnLabels, conversion)}
          suffix={columnCurrencySuffix(column, conversion)}
          theme={theme}
          setTableSettings={setTableSettings}
        />
      ))}
    </div>
  );
}

function TableHeaderCell({
  column,
  label,
  suffix,
  theme,
  setTableSettings
}: {
  column: LineItemColumnConfig;
  label: string;
  suffix: string;
  theme: InvoiceTheme;
  setTableSettings: SetTableSettings;
}) {
  const settings = getRoleSettings(theme, column.headerRole);
  const style = getTextStyles({ settings });

  function handleChange(value: string) {
    setTableSettings(prev => ({
      ...prev,
      columnLabels: { ...prev.columnLabels, [column.id]: value }
    }));
  }

  if (column.id === "convertedAmount") {
    return (
      <div
        role="columnheader"
        className="col-span-1 text-sm font-medium"
        style={style}
      >
        <span className={column.headerInputClassName} style={style}>
          {label}
        </span>
      </div>
    );
  }

  // The currency sits beside the label, so the label stays editable on its own.
  if (suffix) {
    return (
      <div
        role="columnheader"
        className="col-span-1 flex h-full items-center text-sm font-medium"
        style={{ ...style, justifyContent: settings.align }}
      >
        <InvoiceInput
          aria-label={`${column.headerPlaceholder} column label`}
          data-field={`tableSettings.columnLabels.${column.id}`}
          value={label}
          onChange={handleChange}
          className={cn(
            column.headerInputClassName,
            "field-sizing-content w-auto min-w-fit pr-1"
          )}
          placeholder={column.headerPlaceholder}
          style={getTextStyles({ settings, remove: ["align"] })}
        />
        <span className={column.id === "amount" ? "shrink-0 pr-2" : "shrink-0"}>
          {suffix}
        </span>
      </div>
    );
  }

  return (
    <div
      role="columnheader"
      className="col-span-1 text-sm font-medium"
      style={style}
    >
      <InvoiceInput
        aria-label={`${column.headerPlaceholder} column label`}
        data-field={`tableSettings.columnLabels.${column.id}`}
        value={label}
        onChange={handleChange}
        className={column.headerInputClassName}
        placeholder={column.headerPlaceholder}
        style={style}
      />
    </div>
  );
}

function LineItems({
  items,
  tableSettings,
  currency,
  currencySymbol,
  theme,
  updateItem,
  removeItem
}: {
  items: InvoiceItem[];
  tableSettings: TableSettings;
  currency: string;
  currencySymbol: string;
  theme: InvoiceTheme;
  updateItem: UpdateItem;
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
          tableSettings={tableSettings}
          currency={currency}
          currencySymbol={currencySymbol}
          theme={theme}
          updateItem={updateItem}
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
  tableSettings,
  currency,
  currencySymbol,
  theme,
  updateItem,
  removeItem
}: {
  item: InvoiceItem;
  index: number;
  itemCount: number;
  tableSettings: TableSettings;
  currency: string;
  currencySymbol: string;
  theme: InvoiceTheme;
  updateItem: UpdateItem;
  removeItem: RemoveItem;
}) {
  const conversion = useCurrencyConversion();
  const viewRow = buildLineItemRow(item, currency, conversion);
  const isPreview = useIsPreview();
  const { columns, gridClassName } = useVisibleColumns();

  return (
    <div
      role="row"
      className={cn(
        "group/row relative grid items-center gap-2 border-t",
        gridClassName
      )}
      style={{ borderColor: tableSettings.borderColor }}
    >
      {columns.map(column => (
        <TableCell
          key={`${item.id}-${column.id}`}
          column={column}
          columnLabel={getColumnLabel(
            column,
            tableSettings.columnLabels,
            conversion
          )}
          item={item}
          index={index}
          viewRow={viewRow}
          currencySymbol={currencySymbol}
          theme={theme}
          updateItem={updateItem}
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
  updateItem
}: {
  column: LineItemColumnConfig;
  columnLabel: string;
  item: InvoiceItem;
  index: number;
  viewRow: InvoiceLineItemRow;
  currencySymbol: string;
  theme: InvoiceTheme;
  updateItem: UpdateItem;
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

    const hasDigits = /\d/.test(target.value);
    const number = Number(
      target.value.replace(currencySymbol, "").replace(/[^0-9.]/g, "")
    );

    updateItem(index, itemField, hasDigits ? number : 0);
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

  if (column.cell.kind === "amount" || column.cell.kind === "convertedAmount") {
    return (
      <div role="cell" className={column.cell.wrapperClassName}>
        <span
          className={column.cell.displayClassName}
          style={rowStyle}
          aria-label={`${cellLabel}, item ${index + 1}`}
        >
          {column.cell.kind === "amount"
            ? viewRow.amount
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
      ? `${currencySymbol}${numericDraft}`
      : viewRow.unitPrice;
  }

  const focusId =
    index === 0 && column.id === "description"
      ? "invoice-field-table"
      : undefined;

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

  // A quiet row under the table, always there while editing; it only fills in
  // on hover.
  return (
    <button
      type="button"
      onClick={handleAddItem}
      className="text-paper-muted-foreground hover:bg-paper-muted hover:text-paper-foreground focus-visible:ring-ring rounded-control my-1.5 flex h-8 w-full items-center gap-1.5 px-2 text-sm transition-colors outline-none focus-visible:ring-1 pointer-coarse:h-11"
    >
      <IconPlus aria-hidden="true" className="size-3.5" />
      Add item
    </button>
  );
}
