import { endOfMonth, format, subMonths } from "date-fns";
import { InvoiceDateField } from "~/components/editor/invoice-date-field";
import { InvoiceInput } from "~/components/editor/invoice-input";
import { useShownSections } from "~/hooks/use-shown-sections";
import { useDetailsSlice, useTheme } from "~/stores/invoice-selectors";
import type { InvoiceDetailRow } from "~/types";
import { buildDetailRows } from "~/utils/build-invoice-view-model";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";
import { dueDateForNewInvoiceDate } from "~/utils/payment-terms";

// The previous whole calendar month as a realistic Service period example, e.g.
// "1–30 Jun 2026" (and "1–31 Dec 2025" when run in January, since the year rolls
// back with the month). The editor is client-only, so reading the clock here
// can't cause a server/client hydration mismatch.
function getServicePeriodExample(): string {
  const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));

  return `e.g. 1–${format(lastMonthEnd, "d MMM yyyy")}`;
}

function buildDetailPlaceholders(): Record<
  InvoiceDetailRow["id"],
  { label: string; value: string }
> {
  return {
    number: { label: "Invoice No.", value: "########" },
    poNumber: { label: "PO number", value: "Add a PO / reference" },
    invoiceDate: { label: "Date", value: "Pick a date" },
    supplyDate: { label: "Date of supply", value: "Pick the supply date" },
    dueDate: { label: "Due date", value: "Pick a due date" },
    servicePeriod: {
      label: "Service period",
      value: getServicePeriodExample()
    }
  };
}

export function InvoiceDetails() {
  const {
    number,
    poNumber,
    invoiceDate,
    supplyDate,
    dueDate,
    servicePeriod,
    dateFormat,
    labels
  } = useDetailsSlice();
  const sections = useShownSections();
  const placeholders = buildDetailPlaceholders();
  const rows = buildDetailRows({
    labels,
    number,
    poNumber,
    invoiceDate,
    supplyDate,
    dueDate,
    servicePeriod,
    sections,
    dateFormat
  });

  return (
    <div data-field-area="details" className="flex flex-col">
      {rows.map(row => (
        <DetailRow key={row.id} row={row} placeholders={placeholders[row.id]} />
      ))}
    </div>
  );
}

function DetailRow({
  row,
  placeholders
}: {
  row: InvoiceDetailRow;
  placeholders: { label: string; value: string };
}) {
  const {
    invoiceDate,
    supplyDate,
    dueDate,
    setNumber,
    setPoNumber,
    setInvoiceDate,
    setSupplyDate,
    setDueDate,
    setServicePeriod,
    setLabels
  } = useDetailsSlice();
  const theme = useTheme();
  const labelStyle = getTextStyles({
    settings: getRoleSettings(theme, "detailLabel")
  });
  const valueStyle = getTextStyles({
    settings: getRoleSettings(theme, "detailValue")
  });

  const setValue = {
    number: setNumber,
    poNumber: setPoNumber,
    invoiceDate: setInvoiceDate,
    supplyDate: setSupplyDate,
    dueDate: setDueDate,
    servicePeriod: setServicePeriod
  }[row.id];
  const dateValues = { invoiceDate, supplyDate, dueDate };

  // Moving the invoice date carries a Net 7/14/30/60 due date along with it.
  function handleDateSelect(isoDate: string) {
    if (row.id !== "invoiceDate") {
      setValue(isoDate);

      return;
    }

    const nextDueDate = dueDateForNewInvoiceDate({
      invoiceDate,
      dueDate,
      nextInvoiceDate: isoDate
    });

    setInvoiceDate(isoDate);
    if (nextDueDate) setDueDate(nextDueDate);
  }

  function handleLabelChange(value: string) {
    setLabels(prev => ({ ...prev, [row.labelKey]: value }));
  }

  return (
    <div className="flex items-center">
      <div className="flex min-w-32 items-center" style={labelStyle}>
        <InvoiceInput
          aria-label={`${placeholders.label} field label`}
          data-field={`labels.${row.labelKey}`}
          value={row.label}
          onChange={handleLabelChange}
          className="leading-paper-row field-sizing-content h-[unset]! w-auto min-w-fit py-0"
          style={labelStyle}
          placeholder={placeholders.label}
        />
      </div>
      {row.id === "invoiceDate" ||
      row.id === "supplyDate" ||
      row.id === "dueDate" ? (
        <InvoiceDateField
          value={dateValues[row.id]}
          label={row.label || placeholders.label}
          placeholder={placeholders.value}
          style={valueStyle}
          onSelect={handleDateSelect}
        />
      ) : (
        <InvoiceInput
          id={row.id === "number" ? "invoice-field-details" : undefined}
          aria-label={row.label || placeholders.label}
          data-field={row.id}
          value={row.value}
          onChange={setValue}
          className="leading-paper-row h-[unset]! w-full py-0"
          style={valueStyle}
          placeholder={placeholders.value}
        />
      )}
    </div>
  );
}
