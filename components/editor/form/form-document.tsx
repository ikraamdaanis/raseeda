import { useId } from "react";
import {
  FormArea,
  FormField,
  FormSelect,
  FormSwitch
} from "~/components/editor/form/form-controls";
import {
  currencyPositionOption,
  dateFormatOption,
  numberFormatOption,
  PAPER_SIZE_LABELS
} from "~/components/editor/shell/inspector/format-section";
import { DOCUMENT_TYPE_NAMES } from "~/consts/document-types";
import { LABEL_LANGUAGE_NAMES, LABEL_LANGUAGES } from "~/consts/label-presets";
import {
  CURRENCY_POSITIONS,
  DOCUMENT_TYPES,
  INVOICE_DATE_FORMATS,
  INVOICE_NUMBER_FORMATS,
  INVOICE_PAPER_SIZES
} from "~/schema/invoice";
import { recordHistoryAction } from "~/stores/invoice-history";
import {
  useAmountFormatSlice,
  useDetailsSlice,
  useDocumentTypeSlice,
  useLabelLanguageSlice,
  useMoneyFormat,
  usePaperSizeSlice
} from "~/stores/invoice-selectors";

/**
 * The form's opening card: what the document is and how it's set up, chosen
 * once rather than watched as it changes, so on a phone it lives in the form
 * rather than the Style tray. The type comes first, since it decides the
 * title, the number and which rows the form shows; the language sits by Edit
 * labels, since both change the labels' wording.
 */
export function FormDocument({
  isEditingLabels,
  onEditingLabelsChange
}: {
  isEditingLabels: boolean;
  onEditingLabelsChange: (isEditing: boolean) => void;
}) {
  return (
    <FormArea area="document" title="Document">
      <FormDocumentType />
      <FormLanguage />
      <FormSwitch
        label="Edit labels"
        description="Rename the labels the invoice prints, like Bill To or Due Date."
        checked={isEditingLabels}
        onCheckedChange={onEditingLabelsChange}
      />
      <FormPaperSize />
    </FormArea>
  );
}

function FormDocumentType() {
  const id = useId();
  const { documentType, setDocumentType } = useDocumentTypeSlice();

  return (
    <FormField id={id} title="Type">
      <FormSelect
        id={id}
        value={documentType}
        onChange={event => {
          const next = DOCUMENT_TYPES.find(
            option => option === event.target.value
          );

          if (next) setDocumentType(next);
        }}
      >
        {DOCUMENT_TYPES.map(option => (
          <option key={option} value={option}>
            {DOCUMENT_TYPE_NAMES[option]}
          </option>
        ))}
      </FormSelect>
    </FormField>
  );
}

// Picking a language overwrites every label as one undo step; once one is
// renamed the field reads "Custom labels" until a language is picked again.
function FormLanguage() {
  const id = useId();
  const { language, setLabelLanguage } = useLabelLanguageSlice();

  return (
    <FormField id={id} title="Language">
      <FormSelect
        id={id}
        value={language ?? ""}
        onChange={event => {
          const next = LABEL_LANGUAGES.find(
            option => option === event.target.value
          );

          if (!next) return;

          recordHistoryAction("Language", "page", () => {
            setLabelLanguage(next);
          });
        }}
      >
        {language === null && (
          <option value="" disabled>
            Custom labels
          </option>
        )}
        {LABEL_LANGUAGES.map(option => (
          <option key={option} value={option}>
            {LABEL_LANGUAGE_NAMES[option]}
          </option>
        ))}
      </FormSelect>
    </FormField>
  );
}

function FormPaperSize() {
  const id = useId();
  const { paperSize, setPaperSize } = usePaperSizeSlice();

  return (
    <FormField id={id} title="Paper">
      <FormSelect
        id={id}
        value={paperSize}
        onChange={event => {
          const next = INVOICE_PAPER_SIZES.find(
            option => option === event.target.value
          );

          if (next) setPaperSize(next);
        }}
      >
        {INVOICE_PAPER_SIZES.map(option => (
          <option key={option} value={option}>
            {PAPER_SIZE_LABELS[option]}
          </option>
        ))}
      </FormSelect>
    </FormField>
  );
}

// Under the details' dates: how every date on the invoice is written.
export function FormDateFormat() {
  const id = useId();
  const { dateFormat, setDateFormat } = useDetailsSlice();
  const today = new Date();

  return (
    <FormField id={id} title="Date format">
      <FormSelect
        id={id}
        value={dateFormat}
        onChange={event => {
          const next = INVOICE_DATE_FORMATS.find(
            option => option === event.target.value
          );

          if (next) setDateFormat(next);
        }}
      >
        {INVOICE_DATE_FORMATS.map(option => (
          <option key={option} value={option}>
            {dateFormatOption(option, today)}
          </option>
        ))}
      </FormSelect>
    </FormField>
  );
}

// Under the currency: how every amount is written, and which side of it the
// currency sits.
export function FormAmountFormat() {
  const numberId = useId();
  const positionId = useId();
  const {
    numberFormat,
    setNumberFormat,
    currencyPosition,
    setCurrencyPosition
  } = useAmountFormatSlice();
  const money = useMoneyFormat();

  return (
    <>
      <FormField id={numberId} title="Number format">
        <FormSelect
          id={numberId}
          value={numberFormat}
          onChange={event => {
            const next = INVOICE_NUMBER_FORMATS.find(
              option => option === event.target.value
            );

            if (next) setNumberFormat(next);
          }}
        >
          {INVOICE_NUMBER_FORMATS.map(option => (
            <option key={option} value={option}>
              {numberFormatOption(option)}
            </option>
          ))}
        </FormSelect>
      </FormField>
      <FormField id={positionId} title="Symbol">
        <FormSelect
          id={positionId}
          value={currencyPosition}
          onChange={event => {
            const next = CURRENCY_POSITIONS.find(
              option => option === event.target.value
            );

            if (next) setCurrencyPosition(next);
          }}
        >
          {CURRENCY_POSITIONS.map(position => (
            <option key={position} value={position}>
              {currencyPositionOption(position, money)}
            </option>
          ))}
        </FormSelect>
      </FormField>
    </>
  );
}
