import type { Invoice } from "~/types";
import { calculateInvoiceTotals } from "~/utils/calculate-invoice-totals";

// The most a SEPA (EPC) code may ask for, and the most bytes it may hold
// (EPC069-12).
const EPC_MAX_AMOUNT = 999_999_999.99;
const EPC_MAX_BYTES = 331;
const EPC_MAX_NAME_LENGTH = 70;
const EPC_MAX_REFERENCE_LENGTH = 140;

// Text on one line with its spaces tidied, cut to a number of characters.
function toEpcText(value: string, maxLength: number) {
  return Array.from(value.replace(/\s+/g, " ").trim())
    .slice(0, maxLength)
    .join("");
}

// An IBAN without its spaces, when its check digits add up.
function readIban(value: string) {
  const iban = value.replace(/\s+/g, "").toUpperCase();

  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return null;

  const digits = Array.from(iban.slice(4) + iban.slice(0, 4))
    .map(character => parseInt(character, 36))
    .join("");
  let remainder = 0;

  for (const digit of digits) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }

  return remainder === 1 ? iban : null;
}

function readBic(value: string) {
  const bic = value.replace(/\s+/g, "").toUpperCase();

  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic) ? bic : "";
}

/**
 * The text of a SEPA credit transfer QR code (EPC069-12, version 002, UTF-8),
 * which banking apps in the EU scan to fill in a transfer: the BIC (left out
 * when it isn't one), the payee's name (up to 70 characters), the IBAN, the
 * amount in euros ("EUR12.30") and the reference as unstructured text (up to
 * 140 characters, cut further if the code would hold more than 331 bytes).
 * Null when there's no name, the IBAN isn't one, or the amount is outside
 * what a code may ask for.
 */
export function buildEpcPayload({
  name,
  iban,
  bic,
  amount,
  reference
}: {
  name: string;
  iban: string;
  bic: string;
  amount: number;
  reference: string;
}): string | null {
  const payeeName = toEpcText(name, EPC_MAX_NAME_LENGTH);
  const payeeIban = readIban(iban);

  if (!payeeName || !payeeIban) return null;
  if (!(amount >= 0.01 && amount <= EPC_MAX_AMOUNT)) return null;

  const lines = [
    "BCD",
    "002",
    "1",
    "SCT",
    readBic(bic),
    payeeName,
    payeeIban,
    `EUR${amount.toFixed(2)}`
  ];
  const encoder = new TextEncoder();
  const fixedBytes = encoder.encode(lines.join("\n")).length;
  // The two empty lines are the purpose and the structured reference.
  let remittance = Array.from(toEpcText(reference, EPC_MAX_REFERENCE_LENGTH));

  while (
    remittance.length > 0 &&
    fixedBytes + encoder.encode(`\n\n\n${remittance.join("")}`).length >
      EPC_MAX_BYTES
  ) {
    remittance = remittance.slice(0, -1);
  }

  const text = remittance.join("").trim();

  if (!text) return lines.join("\n");

  return [...lines, "", "", text].join("\n");
}

/**
 * The SEPA code an invoice prints in its payment details: the account name as
 * the payee, the IBAN and BIC, the balance due and the invoice number. Else
 * what it's missing: an invoice that isn't in euros, no account name, no
 * valid IBAN, nothing left to pay, or more than a code may ask for.
 */
export function getSepaQrCode(
  invoice: Pick<
    Invoice,
    | "documentType"
    | "items"
    | "tax"
    | "fees"
    | "discounts"
    | "discountType"
    | "amountPaid"
    | "currency"
    | "currencyCode"
    | "sections"
    | "number"
    | "paymentDetails"
  >
):
  | { payload: string }
  | { missing: "currency" | "iban" | "name" | "nothingDue" | "amount" } {
  const { paymentDetails } = invoice;
  const { balanceDue } = calculateInvoiceTotals(invoice);

  if (invoice.currencyCode !== "EUR") return { missing: "currency" };
  if (!readIban(paymentDetails.iban)) return { missing: "iban" };
  if (!toEpcText(paymentDetails.accountName, 1)) return { missing: "name" };
  if (balanceDue <= 0) return { missing: "nothingDue" };

  const payload = buildEpcPayload({
    name: paymentDetails.accountName,
    iban: paymentDetails.iban,
    bic: paymentDetails.bic,
    amount: balanceDue,
    reference: invoice.number
  });

  if (!payload) return { missing: "amount" };

  return { payload };
}
