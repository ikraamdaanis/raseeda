import {
  AddPartSlot,
  useAddableParts
} from "~/components/editor/invoice-add-part";
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
import type {
  DocumentType,
  InvoiceDetailRow,
  InvoiceSectionKey
} from "~/types";
import { buildDetailRows } from "~/utils/build-invoice-view-model";
import { formatServicePeriod } from "~/utils/format-invoice-date";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";
import {
  dueDateForNewInvoiceDate,
  getPaymentTermsOptions
} from "~/utils/payment-terms";
import { hasText } from "~/utils/section-visibility";

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

// The rows that are a section of their own, hidden with their own ×.
const ROW_SECTIONS: Partial<
  Record<InvoiceDetailRow["id"], { key: InvoiceSectionKey; name: string }>
> = {
  poNumber: { key: "poNumber", name: "PO number" },
  supplyDate: { key: "supplyDate", name: "date of supply" },
  servicePeriod: { key: "servicePeriod", name: "service period" }
};

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
  const addableParts = useAddableParts("details");
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
        <DetailRow key={row.id} row={row} placeholders={placeholders[row.id]} />
      ))}
      <AddPartSlot
        areaName="details"
        parts={addableParts}
        className="-mx-1 mt-1"
      />
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
  const documentType = useDocumentType();
  const theme = useTheme();
  const section = ROW_SECTIONS[row.id];
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
  // Net 7 to 60 count from the issue date; a receipt or a credit note has no
  // terms to offer.
  const presets =
    row.id === "dueDate" && DOCUMENT_TYPE_ROWS[documentType].paymentTerms
      ? getPaymentTermsOptions(invoiceDate, dueDate).map(option => ({
          label: option.label,
          value: option.dueDate,
          isSelected: option.isSelected
        }))
      : [];

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
    <div className="group/optional relative flex items-center">
      {section && (
        <RemoveSectionButton
          label={`Hide ${section.name}`}
          onClick={() => setSection(section.key, false)}
          className="absolute top-1/2 right-full mr-1 -translate-y-1/2"
        />
      )}
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
          presets={presets}
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
