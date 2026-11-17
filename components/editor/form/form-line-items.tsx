import { IconTrash } from "@tabler/icons-react";
import { useId } from "react";
import { useShallow } from "zustand/react/shallow";
import { SuggestionList } from "~/components/editor/field-suggestions";
import {
  FormAddButton,
  FormAmount,
  FormArea,
  formCardClassName,
  FormField,
  FormFieldTitle,
  formIconButtonClassName,
  FormInput,
  formLabelClassName,
  FormNumberInput,
  FormTextArea
} from "~/components/editor/form/form-controls";
import { useLineItemSuggestions } from "~/components/editor/invoice-line-items";
import { Button } from "~/components/ui/button";
import { formatCurrency } from "~/consts/currencies";
import { useCurrencyConversion } from "~/hooks/use-currency-conversion";
import { useShownSections } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import { useLineItemsSlice, useMoneyFormat } from "~/stores/invoice-selectors";
import { useInvoiceStore } from "~/stores/invoice-store";
import type { InvoiceItem, TableSettings } from "~/types";
import {
  buildLineItemRow,
  showsTaxColumn
} from "~/utils/build-invoice-view-model";
import { calculateLineAmount } from "~/utils/calculate-invoice-totals";
import { formatPlainNumber } from "~/utils/format-number";
import {
  getAmountColumnLabel,
  getShownColumns,
  getTaxColumnLabel
} from "~/utils/table-columns";

// What each column is called before it's renamed.
const COLUMN_NAMES = {
  description: "Description",
  quantity: "Quantity",
  unit: "Unit",
  unitPrice: "Unit Price",
  tax: "Tax",
  amount: "Amount"
} as const satisfies Record<keyof TableSettings["columnLabels"], string>;

// Which of a line's fields show, as the table's settings say, and what each is
// called: the page's column headers.
function useLineColumns() {
  const shown = useInvoiceStore(
    useShallow(state =>
      getShownColumns({
        columns: state.tableSettings.columns,
        items: state.items,
        isPrinted: false
      })
    )
  );
  const { columnLabels, taxLabel, isPerLine, hasTax } = useInvoiceStore(
    useShallow(state => ({
      columnLabels: state.tableSettings.columnLabels,
      taxLabel: state.labels.tax,
      isPerLine: state.tax.perLine,
      hasTax: state.sections.tax
    }))
  );
  const sections = useShownSections();
  const hasTaxColumn = showsTaxColumn({
    tax: { perLine: isPerLine },
    sections
  });

  return {
    shown,
    hasTaxColumn,
    labels: {
      description: columnLabels.description || COLUMN_NAMES.description,
      quantity: columnLabels.quantity || COLUMN_NAMES.quantity,
      unit: columnLabels.unit || COLUMN_NAMES.unit,
      unitPrice: columnLabels.unitPrice || COLUMN_NAMES.unitPrice,
      tax: getTaxColumnLabel(columnLabels, { tax: taxLabel }),
      amount: getAmountColumnLabel(columnLabels, hasTax)
    }
  };
}

// The line items as cards, one per line, in the order they print. The column
// headers every card shares are renamed from any card's titles.
export function FormLineItems() {
  const { items, addItem, tableSettings, setTableSettings } =
    useLineItemsSlice();
  const columns = useLineColumns();
  const shownColumns = (
    Object.keys(COLUMN_NAMES) as (keyof typeof COLUMN_NAMES)[]
  ).filter(column => {
    if (column === "quantity" || column === "unitPrice") {
      return columns.shown.quantityAndPrice;
    }

    if (column === "unit") return columns.shown.unit;
    if (column === "tax") return columns.hasTaxColumn;

    return true;
  });

  function setColumnLabel(column: keyof typeof COLUMN_NAMES, value: string) {
    setTableSettings(prev => ({
      ...prev,
      columnLabels: { ...prev.columnLabels, [column]: value }
    }));
  }

  function handleAddItem() {
    addItem({
      id: crypto.randomUUID(),
      description: "",
      quantity: 1,
      unit: "",
      unitPrice: 0
    });
  }

  return (
    <FormArea
      area="items"
      title="Items"
      labels={shownColumns.map(column => ({
        name:
          column === "tax" || column === "amount"
            ? columns.labels[column]
            : COLUMN_NAMES[column],
        value: tableSettings.columnLabels[column],
        field: `tableSettings.columnLabels.${column}`,
        onChange: value => setColumnLabel(column, value)
      }))}
    >
      <ol aria-label="Invoice line items" className="flex flex-col gap-4">
        {items.map((item, index) => (
          <li key={item.id}>
            <LineItemCard
              item={item}
              index={index}
              itemCount={items.length}
              columns={columns}
            />
          </li>
        ))}
      </ol>
      <FormAddButton onClick={handleAddItem}>Add item</FormAddButton>
    </FormArea>
  );
}

function LineItemCard({
  item,
  index,
  itemCount,
  columns
}: {
  item: InvoiceItem;
  index: number;
  itemCount: number;
  columns: ReturnType<typeof useLineColumns>;
}) {
  const { removeItem, updateItem } = useLineItemsSlice();
  const money = useMoneyFormat();
  const conversion = useCurrencyConversion();
  const tax = useInvoiceStore(state => state.tax);
  const viewRow = buildLineItemRow({ item, money, conversion, tax });
  const descriptionId = useId();
  const quantityId = useId();
  const unitId = useId();
  const priceId = useId();
  const { labels, shown, hasTaxColumn } = columns;
  // Quantity, unit, price and tax sit two to a row; an odd last one takes the
  // whole row rather than leaving a gap beside it.
  const fieldCount = 2 + (shown.unit ? 1 : 0) + (hasTaxColumn ? 1 : 0);
  const lastFieldClassName = fieldCount % 2 === 1 ? "col-span-2" : undefined;
  const {
    suggestions,
    isShown,
    activeIndex,
    listId,
    pick,
    onType,
    fieldProps
  } = useLineItemSuggestions({ item, index, updateItem });
  const amount = viewRow.convertedAmount
    ? `${viewRow.amount} / ${viewRow.convertedAmount}`
    : viewRow.amount;

  return (
    <article aria-label={`Item ${index + 1}`} className={formCardClassName}>
      <div className="relative flex flex-col gap-2">
        <FormFieldTitle
          htmlFor={descriptionId}
          field="tableSettings.columnLabels.description"
          className={formLabelClassName}
        >
          {labels.description}
        </FormFieldTitle>
        <FormTextArea
          id={descriptionId}
          aria-label={`${labels.description}, item ${index + 1}`}
          {...fieldProps}
          data-field={`items.${item.id}.description`}
          value={item.description}
          placeholder="Enter a description"
          onChange={value => {
            updateItem(index, "description", value);
            onType();
          }}
        />
        {isShown && (
          <SuggestionList
            listId={listId}
            label="Items from past invoices"
            suggestions={suggestions}
            activeIndex={activeIndex}
            pick={pick}
            getKey={suggestion => suggestion.description}
            renderSuggestion={suggestion => (
              <span className="flex items-baseline gap-3">
                <span
                  title={suggestion.description}
                  className="min-w-0 flex-1 truncate font-medium"
                >
                  {suggestion.description}
                </span>
                <span className="text-muted-foreground shrink-0 text-sm">
                  {formatCurrency(suggestion.unitPrice, money)}
                  {suggestion.unit && ` / ${suggestion.unit}`}
                </span>
              </span>
            )}
          />
        )}
      </div>
      {shown.quantityAndPrice && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4">
          <FormField
            id={quantityId}
            title={labels.quantity}
            labelField="tableSettings.columnLabels.quantity"
          >
            <FormNumberInput
              id={quantityId}
              aria-label={`${labels.quantity}, item ${index + 1}`}
              data-field={`items.${item.id}.quantity`}
              value={item.quantity}
              onChange={value => updateItem(index, "quantity", value)}
              money={money}
              decimals={2}
            />
          </FormField>
          {shown.unit && (
            <FormField
              id={unitId}
              title={labels.unit}
              labelField="tableSettings.columnLabels.unit"
            >
              <FormInput
                id={unitId}
                aria-label={`${labels.unit}, item ${index + 1}`}
                data-field={`items.${item.id}.unit`}
                value={item.unit}
                onChange={value => updateItem(index, "unit", value)}
                placeholder="hrs, days"
              />
            </FormField>
          )}
          <FormField
            id={priceId}
            title={labels.unitPrice}
            unit={money.marker}
            labelField="tableSettings.columnLabels.unitPrice"
            className={hasTaxColumn ? undefined : lastFieldClassName}
          >
            <FormNumberInput
              id={priceId}
              aria-label={`${labels.unitPrice}, item ${index + 1}`}
              data-field={`items.${item.id}.unitPrice`}
              value={item.unitPrice}
              onChange={value => updateItem(index, "unitPrice", value)}
              money={money}
              decimals={money.decimals}
            />
          </FormField>
          {hasTaxColumn && (
            <LineTax
              item={item}
              index={index}
              label={labels.tax}
              className={lastFieldClassName}
            />
          )}
        </div>
      )}
      {!shown.quantityAndPrice && hasTaxColumn && (
        <LineTax item={item} index={index} label={labels.tax} />
      )}
      <div className="border-border flex items-center gap-3 border-t pt-4">
        {shown.quantityAndPrice ? (
          <div className="flex min-w-0 flex-1">
            <FormFieldTitle
              field="tableSettings.columnLabels.amount"
              className="text-muted-foreground text-base"
            >
              {labels.amount}
            </FormFieldTitle>
          </div>
        ) : (
          <LineAmount
            item={item}
            index={index}
            label={labels.amount}
            formattedAmount={viewRow.amount}
          />
        )}
        {shown.quantityAndPrice && (
          <FormAmount value={amount} className="font-medium" />
        )}
        {itemCount > 1 && (
          <Button
            variant="ghost"
            aria-label={`Remove item ${index + 1}`}
            onClick={() => removeItem(item.id)}
            className={cn(formIconButtonClassName, "-mr-2")}
          >
            <IconTrash aria-hidden="true" className="size-5" />
          </Button>
        )}
      </div>
    </article>
  );
}

// A line's amount, typed straight in while quantity and price are hidden, as
// on the page: typing makes the line one at that price.
function LineAmount({
  item,
  index,
  label,
  formattedAmount
}: {
  item: InvoiceItem;
  index: number;
  label: string;
  formattedAmount: string;
}) {
  const id = useId();
  const { setItemAmount } = useLineItemsSlice();
  const money = useMoneyFormat();

  return (
    <FormField
      id={id}
      title={label}
      unit={money.marker}
      labelField="tableSettings.columnLabels.amount"
      className="flex-1"
    >
      <FormNumberInput
        id={id}
        aria-label={`${label}, item ${index + 1}`}
        data-field={`items.${item.id}.amount`}
        value={calculateLineAmount(
          item.quantity,
          item.unitPrice,
          money.decimals
        )}
        onChange={value => setItemAmount(item.id, value)}
        money={money}
        decimals={money.decimals}
        display={formattedAmount}
      />
    </FormField>
  );
}

// A line's own tax rate, as the page's Tax column sets it: left blank, the line
// is on the invoice's rate (its placeholder); Exempt hides the rate but keeps
// it for when it's toggled back. A line on an exempt invoice rate is already
// exempt.
function LineTax({
  item,
  index,
  label,
  className
}: {
  item: InvoiceItem;
  index: number;
  label: string;
  className?: string;
}) {
  const id = useId();
  const { setItemTax } = useLineItemsSlice();
  const invoiceTax = useInvoiceStore(state => state.tax);
  const money = useMoneyFormat();
  const ownTax = item.tax;
  const isExempt = ownTax?.exempt ?? false;
  const inheritsExempt = !ownTax && invoiceTax.exempt;
  const placeholder = invoiceTax.exempt
    ? "Exempt"
    : formatPlainNumber(invoiceTax.percentage, money.numberFormat);

  function toggleExempt() {
    setItemTax(item.id, {
      percentage: ownTax?.percentage ?? invoiceTax.percentage,
      exempt: !isExempt
    });
  }

  return (
    <FormField
      id={id}
      title={label}
      unit="%"
      labelField="tableSettings.columnLabels.tax"
      className={className}
    >
      <div className="flex items-center gap-2">
        {isExempt || inheritsExempt ? (
          <span className="text-muted-foreground flex h-11 flex-1 items-center text-base">
            Exempt
          </span>
        ) : (
          <FormNumberInput
            id={id}
            aria-label={`${label}, item ${index + 1}`}
            data-field={`items.${item.id}.tax.percentage`}
            value={ownTax?.percentage}
            onChange={percentage =>
              setItemTax(item.id, { percentage, exempt: false })
            }
            onClear={() => setItemTax(item.id, undefined)}
            money={money}
            decimals={2}
            min={0}
            max={100}
            placeholder={placeholder}
            className="min-w-0 flex-1"
          />
        )}
        {!inheritsExempt && (
          <Button
            variant="outline"
            aria-label={`Toggle exempt, item ${index + 1}`}
            aria-pressed={isExempt}
            data-field={`items.${item.id}.tax.exempt`}
            onClick={toggleExempt}
            className="aria-pressed:bg-accent h-11 shrink-0 px-3 text-base"
          >
            Exempt
          </Button>
        )}
      </div>
    </FormField>
  );
}
