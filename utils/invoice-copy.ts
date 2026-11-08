import { differenceInCalendarDays, format } from "date-fns";
import { maxBy } from "lodash-es";
import {
  DOCUMENT_TYPE_DEFAULTS,
  DOCUMENT_TYPE_NAMES,
  DOCUMENT_TYPE_ROWS
} from "~/consts/document-types";
import type { DocumentType, Invoice } from "~/types";
import { applyDocumentType } from "~/utils/document-type";
import { formatInvoiceDate } from "~/utils/format-invoice-date";
import { addDaysToIsoDate } from "~/utils/payment-terms";
import { readInvoiceDate } from "~/utils/read-invoice-date";

// The last run of digits in a number, with what comes before and after it:
// "FRL-0014" is "FRL-", "0014" and "".
const NUMBER_PARTS = /^(.*?)(\d+)(\D*)$/;

// May is left out of the patterns without a year, where "item 3 may vary"
// would read as a date.
const MONTHS_EXCEPT_MAY =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const MONTH_NAMES = `${MONTHS_EXCEPT_MAY}|may`;
const DAY = "(?:3[01]|[12]\\d|0?[1-9])(?:st|nd|rd|th)?";

// Text that names a date or a period: a month with a year ("October 2026"),
// a day and a month either way round ("3 March", "March 3", but not "Jan 5
// hours"), a quarter, or a written-out date.
const DATE_MENTION = new RegExp(
  [
    `\\b(?:${DAY}\\s+)?(?:${MONTH_NAMES})\\.?\\s+\\d{4}\\b`,
    `\\b${DAY}\\s+(?:${MONTHS_EXCEPT_MAY})\\b`,
    `\\b(?:${MONTHS_EXCEPT_MAY})\\.?\\s+${DAY}\\b(?!\\s+[a-z])`,
    "\\bQ[1-4]\\s+\\d{4}\\b",
    "\\b\\d{4}-\\d{2}-\\d{2}\\b",
    "\\b\\d{1,2}[/.]\\d{1,2}[/.]\\d{2,4}\\b"
  ].join("|"),
  "i"
);

// The number after the highest one in the copy's series: the numbers in
// `takenNumbers` sharing its prefix and suffix (ignoring case), plus one,
// keeping its zero padding. A number with no digits is left as it is.
export function nextInvoiceNumber(
  number: string,
  takenNumbers: string[]
): string {
  const parts = NUMBER_PARTS.exec(number.trim());

  if (!parts) return number;

  const [, prefix, digits, suffix] = parts;
  const highest = [number, ...takenNumbers].reduce((max, taken) => {
    const takenParts = NUMBER_PARTS.exec(taken.trim());

    if (!takenParts) return max;

    const [, takenPrefix, takenDigits, takenSuffix] = takenParts;

    if (
      takenPrefix.toLowerCase() !== prefix.toLowerCase() ||
      takenSuffix.toLowerCase() !== suffix.toLowerCase()
    ) {
      return max;
    }

    return Math.max(max, Number(takenDigits));
  }, 0);

  return `${prefix}${String(highest + 1).padStart(digits.length, "0")}${suffix}`;
}

// Whether two numbers are in the same series: the same text around their
// last run of digits, ignoring case ("FRL-0014" and "frl-0002").
function isSameSeries(number: string, other: string) {
  const parts = NUMBER_PARTS.exec(number.trim());
  const otherParts = NUMBER_PARTS.exec(other.trim());

  if (!parts || !otherParts) return false;

  return (
    parts[1].toLowerCase() === otherParts[1].toLowerCase() &&
    parts[3].toLowerCase() === otherParts[3].toLowerCase()
  );
}

// The number a copy of another type starts with: the next one in the series
// of the newest document of that type, since each type keeps its own series
// (a quote's number on an invoice would break the invoices' sequence). A
// document of that type still numbered in the original's series (a quote
// switched to an invoice in the inspector keeps QUO-0007) is passed over for
// one in a series of its own, when there is one. With none of that type yet,
// or a newest one whose number has no digits to count on, the type's sample
// number, moved on past any taken.
function nextNumberOfType({
  original,
  documentType,
  library
}: {
  original: string;
  documentType: DocumentType;
  library: { number: string; documentType: DocumentType; createdAt: Date }[];
}) {
  const takenNumbers = library.map(document => document.number);
  const ofType = library.filter(
    document => document.documentType === documentType && document.number.trim()
  );
  const ownSeries = ofType.filter(
    document => !isSameSeries(document.number, original)
  );
  const newest = maxBy(ownSeries.length > 0 ? ownSeries : ofType, document =>
    document.createdAt.getTime()
  );
  const next = newest && nextInvoiceNumber(newest.number, takenNumbers);

  if (
    newest &&
    next &&
    next.trim().toLowerCase() !== newest.number.trim().toLowerCase()
  ) {
    return next;
  }

  const sample = DOCUMENT_TYPE_DEFAULTS[documentType].number;
  const taken = new Set(
    takenNumbers.map(number => number.trim().toLowerCase())
  );

  return taken.has(sample.toLowerCase())
    ? nextInvoiceNumber(sample, takenNumbers)
    : sample;
}

// The copy's due date. Between types whose due date means the same thing (an
// invoice's and a proforma's "Due date") it keeps the original's span from
// today; otherwise it starts as a new blank of the type would, since a
// quote's "Valid until" isn't a receipt's "Date paid" or an invoice's terms,
// and a credit note prints no due date to keep.
function copyDueDate({
  invoice,
  documentType,
  invoiceDate
}: {
  invoice: Invoice;
  documentType: DocumentType;
  invoiceDate: string;
}) {
  const before = DOCUMENT_TYPE_DEFAULTS[invoice.documentType];
  const after = DOCUMENT_TYPE_DEFAULTS[documentType];
  const isSameMeaning =
    before.labels.paymentDue === after.labels.paymentDue &&
    DOCUMENT_TYPE_ROWS[invoice.documentType].dueDate &&
    DOCUMENT_TYPE_ROWS[documentType].dueDate;

  if (!isSameMeaning) {
    return addDaysToIsoDate(invoiceDate, after.dueDays) ?? invoice.dueDate;
  }

  const start = readInvoiceDate(invoice.invoiceDate);
  const end = readInvoiceDate(invoice.dueDate);

  if (!start || !end) return invoice.dueDate;

  return (
    addDaysToIsoDate(invoiceDate, differenceInCalendarDays(end, start)) ??
    invoice.dueDate
  );
}

// How a credit note names the invoice it's made from: its number and date, as
// a VAT credit note must (HMRC VAT Notice 700, 18.2.3), in the invoice's own
// date format. Empty when the invoice has no number to name.
function describeInvoiceReference(invoice: Invoice) {
  const number = invoice.number.trim();
  const date = invoice.invoiceDate.trim()
    ? formatInvoiceDate(invoice.invoiceDate, invoice.dateFormat)
    : "";

  if (!number) return "";

  return date ? `${number}, ${date}` : number;
}

/**
 * A duplicated document set up as the next one, as `documentType`: dated
 * `today`, with no payment typed (so nothing paid yet, or a receipt's total).
 * Of the same type, it takes the next number in its series. Of another type,
 * it takes that type's title and labels where they're still on the old type's
 * defaults (`applyDocumentType`) and the next number in that type's series;
 * an invoice made into a credit note names the invoice it refers to (its
 * number and date) as printed text. Nothing in the copy points back at the
 * original.
 */
export function prepareInvoiceCopy({
  invoice,
  documentType,
  library,
  today
}: {
  invoice: Invoice;
  documentType: DocumentType;
  library: { number: string; documentType: DocumentType; createdAt: Date }[];
  today: Date;
}): Invoice {
  const invoiceDate = format(today, "yyyy-MM-dd");
  const isSameType = documentType === invoice.documentType;
  const typed = isSameType ? invoice : applyDocumentType(invoice, documentType);
  const before = DOCUMENT_TYPE_ROWS[invoice.documentType];
  const after = DOCUMENT_TYPE_ROWS[documentType];
  // A field the original's type doesn't print is left over from another type
  // (a credit note made into an invoice keeps its "Refers to invoice"), so a
  // type that prints it starts it afresh rather than show a stale value.
  const refersTo =
    before.refersTo || !after.refersTo
      ? invoice.refersTo
      : invoice.documentType === "invoice"
        ? describeInvoiceReference(invoice)
        : "";
  const paidBy = before.paidBy || !after.paidBy ? invoice.paidBy : "";

  return {
    ...typed,
    number: isSameType
      ? nextInvoiceNumber(
          invoice.number,
          library.map(document => document.number)
        )
      : nextNumberOfType({
          original: invoice.number,
          documentType,
          library
        }),
    invoiceDate,
    dueDate: copyDueDate({ invoice, documentType, invoiceDate }),
    refersTo,
    paidBy,
    amountPaid: 0,
    paidDate: ""
  };
}

// "an invoice", "a quote".
function withArticle(name: string) {
  return `${/^[aeiou]/i.test(name) ? "an" : "a"} ${name}`;
}

/**
 * The banner a copy opens with: what it was copied from (`original`, its
 * number or name), the type it was made as when that's another one than the
 * original's type, and what it carried over that probably needs
 * changing.
 */
export function describeCopy({
  original,
  copy,
  originalType = copy.documentType
}: {
  original: string;
  copy: Invoice;
  originalType?: DocumentType;
}): string {
  const source =
    originalType === copy.documentType
      ? `Copied from ${original}`
      : `Copied from ${original} as ${withArticle(
          DOCUMENT_TYPE_NAMES[copy.documentType].toLowerCase()
        )}`;
  const review = describeCopyReview(copy);

  return review ? `${source}. Check ${review}.` : `${source} and dated today.`;
}

// The first date or period a piece of text mentions, if any.
export function findDateMention(text: string): string | null {
  return DATE_MENTION.exec(text)?.[0] ?? null;
}

function countLabel(count: number, singular: string, plural: string) {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

function listPhrase(parts: string[]) {
  if (parts.length <= 1) return parts.join("");

  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

// What a copy carried over that probably needs changing, as one sentence for
// the banner the copy opens with: its service period and date of supply, and
// any line item, note or term that mentions a date. Null when there's none.
export function describeCopyReview(invoice: Invoice): string | null {
  const { sections } = invoice;
  const fields: string[] = [];

  if (sections.servicePeriod && invoice.servicePeriod.trim()) {
    fields.push("the service period");
  }

  if (sections.supplyDate && invoice.supplyDate.trim()) {
    fields.push("the date of supply");
  }

  if (sections.currencyConversion && invoice.currencyConversion.date) {
    fields.push("the exchange rate");
  }

  const mentions = new Set<string>();
  const itemCount = invoice.items.filter(item => {
    const mention = findDateMention(item.description);

    if (mention) mentions.add(mention.toLowerCase());

    return mention !== null;
  }).length;
  const texts = [
    sections.notes && { text: invoice.notes.content, name: "the notes" },
    sections.terms && { text: invoice.terms.content, name: "the terms" }
  ].flatMap(entry => (entry ? [entry] : []));
  const mentioningTexts = texts.filter(({ text }) => {
    const mention = findDateMention(text);

    if (mention) mentions.add(mention.toLowerCase());

    return mention !== null;
  });
  const mentioning = [
    ...(itemCount > 0
      ? [countLabel(itemCount, "line item", "line items")]
      : []),
    ...mentioningTexts.map(({ name }) => name)
  ];

  if (mentioning.length > 0) {
    const [onlyMention] = [...mentions];
    const verb =
      itemCount === 1 && mentioningTexts.length === 0 ? "mentions" : "mention";
    const what =
      mentions.size === 1 && onlyMention
        ? findOriginalMention(invoice, onlyMention)
        : "a date";

    fields.push(`${listPhrase(mentioning)} that ${verb} ${what}`);
  }

  return fields.length > 0 ? listPhrase(fields) : null;
}

// The mention as it was written, for quoting it back.
function findOriginalMention(invoice: Invoice, lowerCased: string) {
  const texts = [
    ...invoice.items.map(item => item.description),
    invoice.notes.content,
    invoice.terms.content
  ];

  for (const text of texts) {
    const mention = findDateMention(text);

    if (mention?.toLowerCase() === lowerCased) return mention;
  }

  return lowerCased;
}
