import { useId, useState } from "react";
import {
  InspectorGroupLabel,
  InspectorRow,
  InspectorSection,
  InspectorSwitch,
  inspectorFieldClassName
} from "~/components/editor/shell/inspector/inspector-controls";
import { cn } from "~/lib/utils";
import { useTableSettingsSlice } from "~/stores/invoice-selectors";
import type { TableSettings } from "~/types";

type ColumnLabelKey = keyof TableSettings["columnLabels"];

const LABEL_ROWS: { key: ColumnLabelKey; label: string }[] = [
  { key: "description", label: "Description" },
  { key: "quantity", label: "Quantity" },
  { key: "unit", label: "Unit" },
  { key: "unitPrice", label: "Unit price" },
  { key: "tax", label: "Tax" },
  { key: "amount", label: "Amount" }
];

// A whole hex code, with or without its "#": three digits or six.
const HEX_COLOUR = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

// The line items' columns, their labels and colours. The labels are the same
// ones the table's header edits on the page; the Tax label is blank while it
// follows the tax row's, which shows as its placeholder.
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
  const shownLabels = LABEL_ROWS.filter(row => {
    switch (row.key) {
      case "quantity":
      case "unitPrice":
        return columns.quantityAndPrice;
      case "unit":
        return columns.quantityAndPrice && columns.unit;
      case "tax":
        return hasTax;
      default:
        return true;
    }
  });

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
            nested
          />
        ) : (
          <p className="text-muted-foreground pb-1 text-xs">
            Each line is a description and an amount you type.
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
            placeholder={row.key === "tax" ? taxLabel : row.label}
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

// The colour input wants all six digits.
function toSixDigitHex(colour: string) {
  const match = HEX_COLOUR.exec(colour);

  if (!match) return "#000000";

  const digits = match[1];

  return digits.length === 3
    ? `#${Array.from(digits, digit => digit + digit).join("")}`
    : `#${digits}`;
}

// A colour as a swatch that opens the system's picker, and its hex code,
// which can be typed. A typed code takes once it's whole; leaving the field
// puts back the colour in use, so a half-typed one never sticks.
function ColourRow({
  label,
  field,
  value,
  onChange
}: {
  label: string;
  field: string;
  value: string;
  onChange: (colour: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);

  function handleTyped(typed: string) {
    setDraft(typed);

    if (HEX_COLOUR.test(typed.trim())) {
      onChange(`#${typed.trim().replace("#", "").toLowerCase()}`);
    }
  }

  return (
    <InspectorRow label={label} htmlFor={id}>
      <div
        className={cn(
          inspectorFieldClassName,
          "focus-within:border-ring flex items-center gap-2 pl-1"
        )}
      >
        <input
          type="color"
          name={`${field}-picker`}
          aria-label={`${label} colour`}
          value={toSixDigitHex(value)}
          onChange={event => onChange(event.target.value)}
          className="size-6 shrink-0 cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 [&::-moz-color-swatch]:rounded-sm [&::-moz-color-swatch]:border-black/10 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-black/10 dark:[&::-webkit-color-swatch]:border-white/15 [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <input
          id={id}
          name={field}
          aria-label={`${label} colour code`}
          data-field={field}
          value={draft ?? value}
          onChange={event => handleTyped(event.target.value)}
          onBlur={() => setDraft(null)}
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent tabular-nums outline-none"
        />
      </div>
    </InspectorRow>
  );
}
