import { useId } from "react";
import { useShallow } from "zustand/react/shallow";
import { InvoiceInput } from "~/components/editor/invoice-input";
import { NativeSelect } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import {
  PAYMENT_QR_CODE_QUIET_ZONE,
  PAYMENT_QR_CODE_SIZE_MM
} from "~/consts/payment-qr-code";
import { useQrCodePath } from "~/hooks/use-qr-code-path";
import { useIsPreview, useShownSections } from "~/hooks/use-shown-sections";
import { PAYMENT_QR_CODE_CONTENTS } from "~/schema/invoice";
import {
  usePaymentDetailsSlice,
  useSectionsSlice,
  useTheme
} from "~/stores/invoice-selectors";
import { useInvoiceStore } from "~/stores/invoice-store";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";
import { getPaymentQrCode } from "~/utils/payment-qr-code";

const MISSING_NOTES = {
  currency: "A SEPA code prints on invoices in euros (EUR) only.",
  iban: "Add a valid IBAN to print it.",
  name: "Add the account name, which banking apps show as the payee.",
  nothingDue: "Nothing is left to pay, so it isn't printed.",
  amount: "A SEPA code can't ask for more than €999,999,999.99.",
  upiCurrency: "A UPI code prints on invoices in rupees (INR) only.",
  upiId: "Add a valid UPI ID, such as name@bank.",
  upiName: "Add the account name, which UPI apps show as the payee.",
  paymentLink: "Add a payment link that's a web address."
} as const;

const QR_CODE_CONTENT_LABELS = {
  sepa: "SEPA transfer",
  upi: "UPI payment",
  paymentLink: "Payment link"
} as const satisfies Record<(typeof PAYMENT_QR_CODE_CONTENTS)[number], string>;

// What the code encodes, or what it's missing.
function usePaymentQrCode() {
  return useInvoiceStore(
    useShallow(state => {
      const qrCode = getPaymentQrCode(state);

      return "payload" in qrCode
        ? { payload: qrCode.payload, missing: null }
        : { payload: "", missing: qrCode.missing };
    })
  );
}

/**
 * The "Scan to pay" code to the right of the bank rows, 2.5cm across as it
 * prints, once switched on with all it needs to encode what was picked.
 */
export function PaymentQrCode() {
  const sections = useShownSections();
  const theme = useTheme();
  const { payload } = usePaymentQrCode();
  const qrCode = useQrCodePath(sections.paymentQrCode ? payload : "");

  if (!sections.paymentQrCode || !payload) return null;

  const quietZone = PAYMENT_QR_CODE_QUIET_ZONE;
  const fullSize = (qrCode?.size ?? 0) + quietZone * 2;
  const width = qrCode
    ? (PAYMENT_QR_CODE_SIZE_MM / qrCode.size) * fullSize
    : PAYMENT_QR_CODE_SIZE_MM;

  return (
    <figure
      data-testid="payment-qr-code"
      className="flex shrink-0 flex-col items-center gap-0.5"
    >
      {qrCode ? (
        <svg
          role="img"
          aria-label="Payment QR code"
          viewBox={`${-quietZone} ${-quietZone} ${fullSize} ${fullSize}`}
          style={{ width: `${width}mm`, height: `${width}mm` }}
        >
          <rect
            x={-quietZone}
            y={-quietZone}
            width={fullSize}
            height={fullSize}
            fill="#ffffff"
          />
          <path d={qrCode.path} fill="#000000" />
        </svg>
      ) : (
        <div style={{ width: `${width}mm`, height: `${width}mm` }} />
      )}
      <figcaption
        style={getTextStyles({
          settings: getRoleSettings(theme, "termsContent")
        })}
      >
        Scan to pay
      </figcaption>
    </figure>
  );
}

// The switch for the code, while editing, then what it encodes (and the UPI
// ID a UPI code pays), with a note on what it's missing when it can't print.
export function PaymentQrCodeSwitch() {
  const { sections, setSection } = useSectionsSlice();
  const { paymentDetails, setPaymentDetails } = usePaymentDetailsSlice();
  const theme = useTheme();
  const isPreview = useIsPreview();
  const { missing } = usePaymentQrCode();
  const id = useId();
  const contentId = useId();
  const noteId = useId();

  if (isPreview) return null;

  const isOn = sections.paymentQrCode;

  return (
    <div className="mt-2 flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-paper-muted-foreground flex w-fit cursor-pointer items-center gap-2 text-sm pointer-coarse:h-11"
      >
        <Switch
          id={id}
          size="sm"
          data-field="sections.paymentQrCode"
          aria-describedby={isOn && missing ? noteId : undefined}
          checked={isOn}
          onCheckedChange={checked => setSection("paymentQrCode", checked)}
        />
        Print a payment QR code
      </label>
      {isOn && (
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={contentId}
            className="text-paper-muted-foreground text-sm"
          >
            Encodes
          </label>
          <NativeSelect
            id={contentId}
            data-field="paymentDetails.qrCodeContent"
            value={paymentDetails.qrCodeContent}
            onChange={event => {
              const content = PAYMENT_QR_CODE_CONTENTS.find(
                candidate => candidate === event.target.value
              );

              if (!content) return;

              setPaymentDetails(prev => ({ ...prev, qrCodeContent: content }));
            }}
            className="text-paper-foreground h-7 w-fit pr-7 leading-7"
          >
            {PAYMENT_QR_CODE_CONTENTS.map(content => (
              <option key={content} value={content}>
                {QR_CODE_CONTENT_LABELS[content]}
              </option>
            ))}
          </NativeSelect>
          {paymentDetails.qrCodeContent === "upi" && (
            <InvoiceInput
              aria-label="UPI ID"
              data-field="paymentDetails.upiId"
              value={paymentDetails.upiId}
              onChange={value =>
                setPaymentDetails(prev => ({ ...prev, upiId: value }))
              }
              placeholder="UPI ID, e.g. acme@okaxis"
              className="w-56"
              style={getTextStyles({
                settings: getRoleSettings(theme, "termsContent")
              })}
            />
          )}
        </div>
      )}
      {isOn && missing && (
        <p id={noteId} className="text-paper-muted-foreground text-xs">
          {`The QR code is left out. ${MISSING_NOTES[missing]}`}
        </p>
      )}
    </div>
  );
}
