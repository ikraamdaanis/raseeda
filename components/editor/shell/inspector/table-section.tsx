import { useId } from "react";
import {
  ColourRow,
  inspectorFieldClassName,
  InspectorGroupLabel,
  InspectorRow,
  InspectorSection,
  InspectorSwitch,
  ResetColoursButton
} from "~/components/editor/shell/inspector/inspector-controls";
import { cn } from "~/lib/utils";
import { DEFAULT_TABLE_SETTINGS } from "~/schema/invoice";
import { useTableSettingsSlice } from "~/stores/invoice-selectors";
import type { TableSettings } from "~/types";
import { getAmountColumnLabel } from "~/utils/table-columns";

type ColumnLabelKey = keyof TableSettings["columnLabels"];

const LABEL_ROWS: { key: ColumnLabelKey; label: string }[] = [
  { key: "description", label: "Description" },
  { key: "quantity", label: "Quantity" },
  { key: "unit", label: "Unit" },
  { key: "unitPrice", label: "Unit price" },
  { key: "tax", label: "Tax" },
  { key: "amount", label: "Amount" }
];

// The line items' columns, their labels and colours. The labels are the same
// ones the table's header edits on the page; the Tax and Amount labels are
// blank while they follow, with what they follow as their placeholders.
export function TableSection() {
  const {
    tableSettings,
    taxLabel,
    hasTax,
    isPerLine,
    setTableSettings,
    setTax
  } = useTableSettingsSlice();
  const { columns, columnLabels } = tableSettings;
  const hasDefaultColours =
    tableSettings.backgroundColor === DEFAULT_TABLE_SETTINGS.backgroundColor &&
    tableSettings.borderColor === DEFAULT_TABLE_SETTINGS.borderColor;
  const shownLabels = LABEL_ROWS.filter(row => {
    switch (row.key) {
      case "quantity":
      case "unitPrice":
        return columns.quantityAndPrice;
      case "unit":
        return columns.quantityAndPrice && columns.unit;
      case "tax":
        return hasTax && isPerLine;
      default:
        return true;
    }
  });

  // A label left blank follows: the Tax column the tax row's label, the
  // Amount column the tax section ("Net amount" while tax is on).
  function getPlaceholder(row: { key: ColumnLabelKey; label: string }) {
    if (row.key === "tax") return taxLabel;

    if (row.key === "amount") {
      return getAmountColumnLabel({ ...columnLabels, amount: "" }, hasTax);
    }

    return row.label;
  }

  function setColumn(column: keyof TableSettings["columns"], isOn: boolean) {
    setTableSettings(prev => ({
      ...prev,
      columns: { ...prev.columns, [column]: isOn }
    }));
  }

  function setColumnLabel(column: ColumnLabelKey, label: string) {
    setTableSettings(prev => ({
      ...prev,
      columnLabels: { ...prev.columnLabels, [column]: label }
    }));
  }

  return (
    <InspectorSection id="table" title="Table">
      <div className="flex flex-col gap-0.5">
        <InspectorGroupLabel>Columns</InspectorGroupLabel>
        <InspectorSwitch
          label="Quantity and price"
          field="tableSettings.columns.quantityAndPrice"
          checked={columns.quantityAndPrice}
          onCheckedChange={isOn => setColumn("quantityAndPrice", isOn)}
        />
        {columns.quantityAndPrice ? (
          <InspectorSwitch
            label="Unit"
            field="tableSettings.columns.unit"
            checked={columns.unit}
            onCheckedChange={isOn => setColumn("unit", isOn)}
          />
        ) : (
          <p className="text-muted-foreground pb-1 text-xs">
            Each line is a description and an amount you type, without a
            quantity or unit price.
          </p>
        )}
        {hasTax && (
          <InspectorSwitch
            label="Tax per line"
            field="tax.perLine"
            checked={isPerLine}
            onCheckedChange={perLine => setTax(prev => ({ ...prev, perLine }))}
          />
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <InspectorGroupLabel>Labels</InspectorGroupLabel>
        {shownLabels.map(row => (
          <ColumnLabelRow
            key={row.key}
            column={row.key}
            label={row.label}
            value={columnLabels[row.key]}
            placeholder={getPlaceholder(row)}
            onChange={value => setColumnLabel(row.key, value)}
          />
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        <InspectorGroupLabel>Colours</InspectorGroupLabel>
        <ColourRow
          label="Header"
          field="tableSettings.backgroundColor"
          value={tableSettings.backgroundColor}
          onChange={backgroundColor =>
            setTableSettings(prev => ({ ...prev, backgroundColor }))
          }
        />
        <ColourRow
          label="Borders"
          field="tableSettings.borderColor"
          value={tableSettings.borderColor}
          onChange={borderColor =>
            setTableSettings(prev => ({ ...prev, borderColor }))
          }
        />
        {!hasDefaultColours && (
          <ResetColoursButton
            onClick={() =>
              setTableSettings(prev => ({
                ...prev,
                backgroundColor: DEFAULT_TABLE_SETTINGS.backgroundColor,
                borderColor: DEFAULT_TABLE_SETTINGS.borderColor
              }))
            }
          />
        )}
      </div>
    </InspectorSection>
  );
}

function ColumnLabelRow({
  column,
  label,
  value,
  placeholder,
  onChange
}: {
  column: ColumnLabelKey;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const id = useId();

  return (
    <InspectorRow label={label} htmlFor={id}>
      <input
        id={id}
        name={`column-label-${column}`}
        aria-label={`${label} column`}
        data-field={`tableSettings.columnLabels.${column}`}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          inspectorFieldClassName,
          "placeholder:text-muted-foreground"
        )}
      />
    </InspectorRow>
  );
}
