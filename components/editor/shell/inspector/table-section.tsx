import { IconRestore } from "@tabler/icons-react";
import { useId, useState } from "react";
import {
  InspectorGroupLabel,
  InspectorRow,
  InspectorSection,
  InspectorSwitch,
  inspectorFieldClassName
} from "~/components/editor/shell/inspector/inspector-controls";
import { cn } from "~/lib/utils";
import { DEFAULT_TABLE_SETTINGS } from "~/schema/invoice";
import { useTableSettingsSlice } from "~/stores/invoice-selectors";
import type { TableSettings } from "~/types";
import { getAmountColumnLabel } from "~/utils/table-columns";
import { HEX_COLOUR, toSixDigitHex } from "~/utils/to-six-digit-hex";

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
          <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
            <button
              type="button"
              onClick={() =>
                setTableSettings(prev => ({
                  ...prev,
                  backgroundColor: DEFAULT_TABLE_SETTINGS.backgroundColor,
                  borderColor: DEFAULT_TABLE_SETTINGS.borderColor
                }))
              }
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative col-start-2 -mx-1 flex h-6 w-fit items-center gap-1 rounded-md px-1 text-xs outline-none focus-visible:ring-1"
            >
              <IconRestore aria-hidden="true" className="size-3.5 shrink-0" />
              Reset colours
              <span
                aria-hidden="true"
                className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
              />
            </button>
          </div>
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

// A colour as a swatch that opens the system's picker, and its hex code,
// which can be typed. A typed code takes once it's whole; leaving the field
// puts back the colour in use, so a half-typed one never sticks. Both carry
// the colour's path, so undo works from either and a drag through the picker
// is one step.
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
  // What's typed, with the colour in use when it was typed: once the colour
  // changes from elsewhere (undo, Reset colours), the field shows that instead.
  const [draft, setDraft] = useState<{ typed: string; colour: string } | null>(
    null
  );

  function handleTyped(typed: string) {
    const code = typed.trim();

    if (!HEX_COLOUR.test(code)) {
      setDraft({ typed, colour: value });

      return;
    }

    const colour = `#${code.replace("#", "").toLowerCase()}`;

    setDraft({ typed, colour });
    onChange(colour);
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
          data-field={field}
          value={toSixDigitHex(value)}
          onChange={event => onChange(event.target.value)}
          className="size-6 shrink-0 cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 [&::-moz-color-swatch]:rounded-sm [&::-moz-color-swatch]:border-black/10 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-black/10 dark:[&::-webkit-color-swatch]:border-white/15 [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <input
          id={id}
          name={field}
          aria-label={`${label} colour code`}
          data-field={field}
          value={draft?.colour === value ? draft.typed : value}
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
