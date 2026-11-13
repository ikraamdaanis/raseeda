import { useId } from "react";
import { useShallow } from "zustand/react/shallow";
import { Switch } from "~/components/ui/switch";
import {
  PAYMENT_QR_CODE_QUIET_ZONE,
  PAYMENT_QR_CODE_SIZE_MM
} from "~/consts/payment-qr-code";
import { useQrCodePath } from "~/hooks/use-qr-code-path";
import { useIsPreview, useShownSections } from "~/hooks/use-shown-sections";
import { useSectionsSlice, useTheme } from "~/stores/invoice-selectors";
import { useInvoiceStore } from "~/stores/invoice-store";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";
import { getSepaQrCode } from "~/utils/sepa-qr-code";

const MISSING_NOTES = {
  currency: "Prints on invoices in euros (EUR) only.",
  iban: "Add a valid IBAN to print it.",
  name: "Add the account name, which banking apps show as the payee.",
  nothingDue: "Nothing is left to pay, so it isn't printed.",
  amount: "A SEPA code can't ask for more than €999,999,999.99."
} as const;

// The SEPA transfer the code encodes, or what it's missing.
function useSepaQrCode() {
  return useInvoiceStore(
    useShallow(state => {
      const qrCode = getSepaQrCode(state);

      return "payload" in qrCode
        ? { payload: qrCode.payload, missing: null }
        : { payload: "", missing: qrCode.missing };
    })
  );
}

/**
 * The "Scan to pay" code to the right of the bank rows, 2.5cm across as it
 * prints, once switched on with all a SEPA transfer needs.
 */
export function PaymentQrCode() {
  const sections = useShownSections();
  const theme = useTheme();
  const { payload } = useSepaQrCode();
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

// The switch for the code, while editing, with a note on what it's missing
// when it can't print.
export function PaymentQrCodeSwitch() {
  const { sections, setSection } = useSectionsSlice();
  const isPreview = useIsPreview();
  const { missing } = useSepaQrCode();
  const id = useId();
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
        Print a SEPA QR code
      </label>
      {isOn && missing && (
        <p id={noteId} className="text-paper-muted-foreground text-xs">
          {`The QR code is left out. ${MISSING_NOTES[missing]}`}
        </p>
      )}
    </div>
  );
}
