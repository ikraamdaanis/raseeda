import { format } from "date-fns";
import {
  inspectorFieldClassName,
  InspectorRow,
  InspectorSection
} from "~/components/editor/shell/inspector/inspector-controls";
import { NativeSelect } from "~/components/ui/select";
import { formatCurrency } from "~/consts/currencies";
import { DOCUMENT_TYPE_NAMES } from "~/consts/document-types";
import { cn } from "~/lib/utils";
import {
  CURRENCY_POSITIONS,
  DOCUMENT_TYPES,
  INVOICE_DATE_FORMATS,
  INVOICE_NUMBER_FORMATS,
  INVOICE_PAPER_SIZES
} from "~/schema/invoice";
import {
  useAmountFormatSlice,
  useDetailsSlice,
  useDocumentTypeSlice,
  useMoneyFormat,
  usePaperSizeSlice
} from "~/stores/invoice-selectors";
import { formatNumber } from "~/utils/format-number";

// How the invoice reads: what kind of document it is and how its dates,
// amounts and page are written. Every value is changed on the page.
export function FormatSection() {
  return (
    <InspectorSection id="format" title="Format">
      <DocumentTypeRow />
      <DateFormatRow />
      <NumberFormatRow />
      <CurrencyPositionRow />
      <PaperSizeRow />
    </InspectorSection>
  );
}

// Each format is shown as today's date written that way, so the choice is
// obvious without reading a pattern.
function DateFormatRow() {
  const { dateFormat, setDateFormat } = useDetailsSlice();
  const today = new Date();

  return (
    <InspectorRow label="Date format" htmlFor="inspector-date-format">
      <NativeSelect
        id="inspector-date-format"
        value={dateFormat}
        onChange={event => {
          const next = INVOICE_DATE_FORMATS.find(
            option => option === event.target.value
          );

          if (next) setDateFormat(next);
        }}
        className={cn(inspectorFieldClassName, "pr-7")}
      >
        {INVOICE_DATE_FORMATS.map(option => (
          <option key={option} value={option}>
            {format(today, option)}
          </option>
        ))}
      </NativeSelect>
    </InspectorRow>
  );
}

// Each format is shown as a sample amount written that way.
function NumberFormatRow() {
  const { numberFormat, setNumberFormat } = useAmountFormatSlice();

  return (
    <InspectorRow label="Number format" htmlFor="inspector-number-format">
      <NativeSelect
        id="inspector-number-format"
        value={numberFormat}
        onChange={event => {
          const next = INVOICE_NUMBER_FORMATS.find(
            option => option === event.target.value
          );

          if (next) setNumberFormat(next);
        }}
        className={cn(inspectorFieldClassName, "pr-7")}
      >
        {INVOICE_NUMBER_FORMATS.map(option => (
          <option key={option} value={option}>
            {formatNumber(1234567.89, { numberFormat: option, decimals: 2 })}
          </option>
        ))}
      </NativeSelect>
    </InspectorRow>
  );
}

// Which side of the figure the currency sits, each shown as an amount in the
// invoice's own currency and format.
function CurrencyPositionRow() {
  const { currencyPosition, setCurrencyPosition } = useAmountFormatSlice();
  const money = useMoneyFormat();

  return (
    <InspectorRow label="Symbol" htmlFor="inspector-currency-position">
      <NativeSelect
        id="inspector-currency-position"
        value={currencyPosition}
        onChange={event => {
          const next = CURRENCY_POSITIONS.find(
            option => option === event.target.value
          );

          if (next) setCurrencyPosition(next);
        }}
        className={cn(inspectorFieldClassName, "pr-7")}
      >
        {CURRENCY_POSITIONS.map(position => (
          <option key={position} value={position}>
            {`${position === "before" ? "Before" : "After"}: ${formatCurrency(1234.5, { ...money, position })}`}
          </option>
        ))}
      </NativeSelect>
    </InspectorRow>
  );
}

// What kind of document it is. Changing it swaps the title and the labels
// still on the old type's defaults; renamed ones stay as typed.
function DocumentTypeRow() {
  const { documentType, setDocumentType } = useDocumentTypeSlice();

  return (
    <InspectorRow label="Type" htmlFor="inspector-document-type">
      <NativeSelect
        id="inspector-document-type"
        value={documentType}
        onChange={event => {
          const next = DOCUMENT_TYPES.find(
            option => option === event.target.value
          );

          if (next) setDocumentType(next);
        }}
        className={cn(inspectorFieldClassName, "pr-7")}
      >
        {DOCUMENT_TYPES.map(option => (
          <option key={option} value={option}>
            {DOCUMENT_TYPE_NAMES[option]}
          </option>
        ))}
      </NativeSelect>
    </InspectorRow>
  );
}

const PAPER_SIZE_LABELS = {
  A4: "A4 · 210 × 297 mm",
  Letter: "Letter · 8.5 × 11 in"
};

// The page the PDF, the canvas and print are cut to.
function PaperSizeRow() {
  const { paperSize, setPaperSize } = usePaperSizeSlice();

  return (
    <InspectorRow label="Paper" htmlFor="inspector-paper-size">
      <NativeSelect
        id="inspector-paper-size"
        value={paperSize}
        onChange={event => {
          const next = INVOICE_PAPER_SIZES.find(
            option => option === event.target.value
          );

          if (next) setPaperSize(next);
        }}
        className={cn(inspectorFieldClassName, "pr-7")}
      >
        {INVOICE_PAPER_SIZES.map(option => (
          <option key={option} value={option}>
            {PAPER_SIZE_LABELS[option]}
          </option>
        ))}
      </NativeSelect>
    </InspectorRow>
  );
}
