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
import {
  DEFAULT_PAYMENT_LABELS,
  PAYMENT_QR_CODE_CONTENTS
} from "~/schema/invoice";
import {
  usePaymentDetailsSlice,
  useSectionsSlice,
  useTheme
} from "~/stores/invoice-selectors";
import { useInvoiceStore } from "~/stores/invoice-store";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";
import { getPaymentQrCode } from "~/utils/payment-qr-code";

export const MISSING_NOTES = {
  currency: "A SEPA code prints on invoices in euros (EUR) only.",
  iban: "Add a valid IBAN to print it.",
  name: "Add the account name, which banking apps show as the payee.",
  nothingDue: "Nothing is left to pay, so it isn't printed.",
  amount: "A SEPA code can't ask for more than €999,999,999.99.",
  upiCurrency: "A UPI code prints on invoices in rupees (INR) only.",
  upiId: "Add a valid UPI ID, such as name@bank.",
  upiName: "Add the account name, which UPI apps show as the payee."
} as const;

export const QR_CODE_CONTENT_LABELS = {
  sepa: "SEPA transfer",
  upi: "UPI payment",
  paymentLink: "Link to pay online"
} as const satisfies Record<(typeof PAYMENT_QR_CODE_CONTENTS)[number], string>;

// The payment link's row, which a code of the link reads.
const PAYMENT_LINK_FIELD = "paymentDetails.paymentLink";

// What a code of the payment link is missing, by the name its row prints
// under: a link, or one that's a web address.
export function getPaymentLinkNote({
  linkLabel,
  hasLink
}: {
  linkLabel: string;
  hasLink: boolean;
}) {
  return hasLink
    ? `The “${linkLabel}” row needs a web address, such as paypal.me/acme.`
    : `Add your link in the “${linkLabel}” row.`;
}

// What the code encodes, or what it's missing.
export function usePaymentQrCode() {
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
// A code of the payment link names the row the link is typed in, which shows
// an example link until then, and its button goes to it.
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
  const linkLabel =
    paymentDetails.labels.paymentLink.trim() ||
    DEFAULT_PAYMENT_LABELS.paymentLink;
  const hasLink = paymentDetails.paymentLink.trim() !== "";

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
        <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
          <p id={noteId} className="text-paper-muted-foreground">
            {`The QR code is left out. ${
              missing === "paymentLink"
                ? getPaymentLinkNote({ linkLabel, hasLink })
                : MISSING_NOTES[missing]
            }`}
          </p>
          {missing === "paymentLink" && (
            <button
              type="button"
              onClick={() =>
                document
                  .querySelector<HTMLElement>(
                    `[data-field="${PAYMENT_LINK_FIELD}"]`
                  )
                  ?.focus()
              }
              className="text-paper-foreground decoration-paper-border hover:decoration-paper-foreground focus-visible:ring-ring relative rounded-sm underline underline-offset-2 outline-none focus-visible:ring-1 pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:inset-y-[calc((100%-2.75rem)/2)]"
            >
              {hasLink ? "Fix the link" : "Add the link"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
