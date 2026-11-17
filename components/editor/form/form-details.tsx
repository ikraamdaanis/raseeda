import { IconX } from "@tabler/icons-react";
import { useId } from "react";
import {
  FormAddParts,
  FormArea,
  FormField,
  formFieldClassName,
  formIconButtonClassName,
  FormInput,
  formLabelClassName
} from "~/components/editor/form/form-controls";
import {
  FormAmountFormat,
  FormDateFormat
} from "~/components/editor/form/form-document";
import { useAddableParts } from "~/components/editor/invoice-add-part";
import { InvoiceDateField } from "~/components/editor/invoice-date-field";
import {
  buildDetailPlaceholders,
  DETAIL_ROW_SECTIONS,
  useDetailRowActions,
  useDetailRows
} from "~/components/editor/invoice-details";
import { CurrencyControls } from "~/components/editor/invoice-total-currency";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import {
  useDetailsSlice,
  useDocumentType,
  useSectionsSlice
} from "~/stores/invoice-selectors";
import type { InvoiceDetailRow } from "~/types";
import { formatServicePeriod } from "~/utils/format-invoice-date";

// The number, dates and references, as the page's details rows list them.
export function FormDetails() {
  const documentType = useDocumentType();
  const placeholders = buildDetailPlaceholders(documentType);
  const addableParts = useAddableParts("details");
  const rows = useDetailRows();
  const { setLabels } = useDetailsSlice();
  // A credit note's Refers to and a receipt's Paid by print only once filled.
  const printedRows = rows.filter(
    row =>
      (row.id !== "refersTo" && row.id !== "paidBy") || row.value.trim() !== ""
  );

  return (
    <FormArea
      area="details"
      title="Details"
      labels={printedRows.map(row => ({
        name: placeholders[row.id].label,
        value: row.label,
        field: `labels.${row.labelKey}`,
        onChange: value =>
          setLabels(prev => ({ ...prev, [row.labelKey]: value }))
      }))}
    >
      {rows.map(row => (
        <FormDetailRow
          key={row.id}
          row={row}
          placeholders={placeholders[row.id]}
        />
      ))}
      <FormDateFormat />
      <CurrencyControls
        part="currency"
        classNames={{
          field: cn(formFieldClassName, "leading-11"),
          label: formLabelClassName
        }}
      />
      <FormAmountFormat />
      <FormAddParts parts={addableParts} />
    </FormArea>
  );
}

function FormDetailRow({
  row,
  placeholders
}: {
  row: InvoiceDetailRow;
  placeholders: { label: string; value: string };
}) {
  const id = useId();
  const { setSection } = useSectionsSlice();
  const { setValue, selectDate, presets, dateValue } = useDetailRowActions(row);
  const section = DETAIL_ROW_SECTIONS[row.id];
  const title = row.label.trim() || placeholders.label;

  return (
    <div className="flex items-end gap-2">
      <FormField
        id={id}
        title={title}
        labelField={`labels.${row.labelKey}`}
        className="flex-1"
      >
        {dateValue !== null ? (
          <InvoiceDateField
            value={dateValue}
            label={title}
            placeholder={placeholders.value}
            allowsRange={row.id === "supplyDate" || row.id === "servicePeriod"}
            formatValue={
              row.id === "servicePeriod" ? formatServicePeriod : undefined
            }
            presets={presets}
            triggerClassName={cn(
              formFieldClassName,
              "border-input dark:bg-input/30 focus-visible:border-ring aria-expanded:border-ring rounded-surface w-full border px-2.5 text-left outline-none"
            )}
            onSelect={selectDate}
          />
        ) : (
          <FormInput
            id={id}
            data-field={row.id}
            value={row.value}
            onChange={setValue}
            placeholder={placeholders.value}
          />
        )}
      </FormField>
      {section && (
        <Button
          variant="ghost"
          aria-label={`Hide ${section.name}`}
          onClick={() => setSection(section.key, false)}
          className={cn(formIconButtonClassName, "-mr-2 h-11")}
        >
          <IconX aria-hidden="true" className="size-5" />
        </Button>
      )}
    </div>
  );
}
