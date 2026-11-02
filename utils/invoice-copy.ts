import { differenceInCalendarDays, format } from "date-fns";
import type { Invoice } from "~/types";
import { addDaysToIsoDate } from "~/utils/payment-terms";
import { readInvoiceDate } from "~/utils/read-invoice-date";

// The last run of digits in a number, with what comes before and after it:
// "FRL-0014" is "FRL-", "0014" and "".
const NUMBER_PARTS = /^(.*?)(\d+)(\D*)$/;

const MONTH_NAMES =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

// Text that names a date or a period: a month (with a day or a year beside
// it, so "may" alone doesn't count), a quarter, or a written-out date.
const DATE_MENTION = new RegExp(
  [
    `\\b(?:\\d{1,2}(?:st|nd|rd|th)?\\s+)?(?:${MONTH_NAMES})\\.?\\s+\\d{4}\\b`,
    `\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTH_NAMES})\\b`,
    `\\b(?:${MONTH_NAMES})\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?\\b`,
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

// A duplicated invoice set up as the next one: the next number in its series,
// dated `today` and due the same number of days later as the original, with
// nothing paid yet.
export function prepareInvoiceCopy({
  invoice,
  takenNumbers,
  today
}: {
  invoice: Invoice;
  takenNumbers: string[];
  today: Date;
}): Invoice {
  const invoiceDate = format(today, "yyyy-MM-dd");
  const start = readInvoiceDate(invoice.invoiceDate);
  const end = readInvoiceDate(invoice.dueDate);
  const dueDate =
    start && end
      ? (addDaysToIsoDate(invoiceDate, differenceInCalendarDays(end, start)) ??
        invoice.dueDate)
      : invoice.dueDate;

  return {
    ...invoice,
    number: nextInvoiceNumber(invoice.number, takenNumbers),
    invoiceDate,
    dueDate,
    amountPaid: 0,
    paidDate: ""
  };
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
