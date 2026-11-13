import { InvoiceDateField } from "~/components/editor/invoice-date-field";
import { InvoiceInput } from "~/components/editor/invoice-input";
import { RemoveSectionButton } from "~/components/editor/invoice-optional-section";
import {
  DOCUMENT_TYPE_DEFAULTS,
  DOCUMENT_TYPE_ROWS
} from "~/consts/document-types";
import { useIsPreview, useShownSections } from "~/hooks/use-shown-sections";
import {
  useDetailsSlice,
  useDocumentType,
  useSectionsSlice,
  useTheme
} from "~/stores/invoice-selectors";
import type { DocumentType, InvoiceDetailRow } from "~/types";
import { buildDetailRows } from "~/utils/build-invoice-view-model";
import { formatServicePeriod } from "~/utils/format-invoice-date";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";
import {
  addDaysToIsoDate,
  dueDateForNewInvoiceDate,
  getPaymentTermsDays
} from "~/utils/payment-terms";
import { readInvoiceDate } from "~/utils/read-invoice-date";
import { hasText } from "~/utils/section-visibility";

// The rows that are optional parts, each hidden with its own "×".
const OPTIONAL_ROWS = {
  poNumber: "Hide PO number",
  supplyDate: "Hide date of supply",
  servicePeriod: "Hide service period"
} as const;

function isOptionalRow(
  id: InvoiceDetailRow["id"]
): id is keyof typeof OPTIONAL_ROWS {
  return id in OPTIONAL_ROWS;
}

// The number and due date are named for the document's type, so an emptied
// "Valid until" on a quote suggests that, not "Due date".
function buildDetailPlaceholders(
  documentType: DocumentType
): Record<InvoiceDetailRow["id"], { label: string; value: string }> {
  const { labels } = DOCUMENT_TYPE_DEFAULTS[documentType];

  return {
    number: { label: labels.invoiceNumber, value: "########" },
    refersTo: {
      label: "Refers to invoice",
      value: "Add the invoice's number and date"
    },
    poNumber: { label: "PO number", value: "Add a PO / reference" },
    invoiceDate: { label: "Date", value: "Pick a date" },
    supplyDate: { label: "Date of supply", value: "Pick the supply date" },
    dueDate: {
      label: labels.paymentDue,
      value: documentType === "invoice" ? "Pick a due date" : "Pick a date"
    },
    paidBy: { label: "Paid by", value: "Card, bank transfer, cash" },
    servicePeriod: { label: "Service period", value: "Pick the period" }
  };
}

export function InvoiceDetails() {
  const {
    number,
    refersTo,
    poNumber,
    invoiceDate,
    supplyDate,
    dueDate,
    paidBy,
    servicePeriod,
    dateFormat,
    labels
  } = useDetailsSlice();
  const sections = useShownSections();
  const isPreview = useIsPreview();
  const documentType = useDocumentType();
  const placeholders = buildDetailPlaceholders(documentType);
  // Preview leaves out an empty "Refers to invoice" or "Paid by", as the PDF
  // does.
  const rows = buildDetailRows({
    documentType,
    labels,
    number,
    refersTo,
    poNumber,
    invoiceDate,
    supplyDate,
    dueDate,
    paidBy,
    servicePeriod,
    sections,
    dateFormat
  }).filter(
    row =>
      (row.id !== "refersTo" && row.id !== "paidBy") ||
      !isPreview ||
      hasText(row.value)
  );

  return (
    <div data-field-area="details" className="flex flex-col">
      {rows.map(row => (
        <DetailRow
          key={row.id}
          row={row}
          placeholders={placeholders[row.id]}
          hasPaymentTerms={DOCUMENT_TYPE_ROWS[documentType].paymentTerms}
        />
      ))}
    </div>
  );
}

function DetailRow({
  row,
  placeholders,
  hasPaymentTerms
}: {
  row: InvoiceDetailRow;
  placeholders: { label: string; value: string };
  hasPaymentTerms: boolean;
}) {
  const {
    invoiceDate,
    supplyDate,
    dueDate,
    servicePeriod,
    setNumber,
    setRefersTo,
    setPoNumber,
    setInvoiceDate,
    setSupplyDate,
    setDueDate,
    setPaidBy,
    setServicePeriod,
    setLabels
  } = useDetailsSlice();
  const { setSection } = useSectionsSlice();
  const theme = useTheme();
  const labelStyle = getTextStyles({
    settings: getRoleSettings(theme, "detailLabel")
  });
  const valueStyle = getTextStyles({
    settings: getRoleSettings(theme, "detailValue")
  });

  const setValue = {
    number: setNumber,
    refersTo: setRefersTo,
    poNumber: setPoNumber,
    invoiceDate: setInvoiceDate,
    supplyDate: setSupplyDate,
    dueDate: setDueDate,
    paidBy: setPaidBy,
    servicePeriod: setServicePeriod
  }[row.id];
  const dateValues = { invoiceDate, supplyDate, dueDate, servicePeriod };

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

  // Net 7 and the rest set the due date that many days after the issue date,
  // so they wait until there is one. A receipt or credit note has none.
  const terms =
    row.id === "dueDate" && hasPaymentTerms
      ? {
          days: getPaymentTermsDays(invoiceDate, dueDate),
          isDisabled: readInvoiceDate(invoiceDate) === null,
          onPick: (days: number) => {
            const nextDueDate = addDaysToIsoDate(invoiceDate, days);

            if (nextDueDate) setDueDate(nextDueDate);
          }
        }
      : undefined;
  const optionalRow = isOptionalRow(row.id) ? row.id : null;

  function handleLabelChange(value: string) {
    setLabels(prev => ({ ...prev, [row.labelKey]: value }));
  }

  return (
    <div className="group/optional relative flex items-center">
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
      row.id === "dueDate" ||
      row.id === "servicePeriod" ? (
        <InvoiceDateField
          value={dateValues[row.id]}
          label={row.label || placeholders.label}
          placeholder={placeholders.value}
          style={valueStyle}
          allowsRange={row.id === "supplyDate" || row.id === "servicePeriod"}
          formatValue={
            row.id === "servicePeriod" ? formatServicePeriod : undefined
          }
          terms={terms}
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
      {optionalRow && (
        <span className="absolute top-1/2 right-0 -translate-y-1/2">
          <RemoveSectionButton
            label={OPTIONAL_ROWS[optionalRow]}
            onClick={() => setSection(optionalRow, false)}
          />
        </span>
      )}
    </div>
  );
}
