import { addDays, format } from "date-fns";
import { currencyOptions } from "~/consts/currencies";
import { saveInvoice } from "~/db";
import { invoiceDefault } from "~/stores/invoice-store";
import type {
  Invoice,
  InvoiceDocument,
  InvoicePaymentDetails,
  InvoiceSize,
  TableSettings
} from "~/types";
import { deriveInvoiceName } from "~/utils/invoice-name";

const COMPANY_NAMES = [
  "Acme Studio",
  "Northwind Co.",
  "Globex Design",
  "Initech LLC",
  "Umbrella Works",
  "Soylent Studio",
  "Hooli Labs",
  "Stark Creative",
  "Wayne & Co.",
  "Wonka Workshop",
  "Pied Piper",
  "Dunder Mifflin"
];

const FIRST_NAMES = [
  "Jordan",
  "Riley",
  "Morgan",
  "Casey",
  "Avery",
  "Sam",
  "Alex",
  "Taylor",
  "Jamie",
  "Cameron"
];

const LAST_NAMES = [
  "Bennett",
  "Carter",
  "Diaz",
  "Okafor",
  "Nguyen",
  "Patel",
  "Schmidt",
  "Rossi",
  "Andersson",
  "Walsh"
];

const STREETS = [
  "123 Main St.",
  "88 Market Ave.",
  "12 Castle Row",
  "47 Harbour Lane",
  "9 Bishopsgate",
  "250 King Street",
  "1600 Pennsylvania Ave.",
  "5 Rue de Rivoli"
];

const CITIES = [
  "London EC1A 1BB",
  "New York, NY 10001",
  "Berlin 10115",
  "Paris 75001",
  "Austin, TX 73301",
  "Toronto, ON M5H 2N2",
  "Sydney NSW 2000",
  "Dublin D02 AF30"
];

const ITEM_DESCRIPTIONS = [
  "Brand identity design",
  "Landing page build",
  "Monthly retainer",
  "Logo exploration",
  "Website redesign",
  "SEO audit",
  "Copywriting",
  "Social media management",
  "Photography session",
  "UX research",
  "Consulting (hourly)",
  "Hosting & maintenance",
  "Email campaign",
  "Illustration set",
  "Mobile app prototype",
  "Design system setup"
];

const TITLES = [
  "Invoice",
  "Tax Invoice",
  "Sales Invoice",
  "Pro Forma Invoice",
  "Receipt",
  "Bill",
  "Statement"
];

const FROM_LABELS = ["From", "Billed by", "From:", "Bill from"];
const TO_LABELS = ["To", "Bill to", "Billed to", "Invoice to"];

const TERMS_LABELS = [
  "Terms and conditions",
  "Notes",
  "Payment terms",
  "Terms"
];

const TERMS_CONTENTS = [
  "Payment is due within 30 days of the invoice date.",
  "Please pay by bank transfer and quote the invoice number as the reference.",
  "Late payments are subject to a 2% monthly fee.",
  "Thank you for your business, it is a pleasure working with you.",
  "A 50% deposit is required up front; the balance is due on completion.",
  "All amounts are in the currency shown and exclude any bank charges."
];

const BANKS = [
  { name: "Barclays", code: "BARC" },
  { name: "HSBC UK", code: "HBUK" },
  { name: "Lloyds Bank", code: "LOYD" },
  { name: "NatWest", code: "NWBK" },
  { name: "Santander", code: "ABBY" },
  { name: "Monzo", code: "MONZ" },
  { name: "Starling Bank", code: "SRLG" },
  { name: "Halifax", code: "HLFX" }
];

const PAYMENT_INSTRUCTIONS = [
  "Net 30",
  "Due on receipt",
  "Please pay within 14 days of the invoice date.",
  "Payment due within 30 days. Late payments incur a 2% monthly fee.",
  "Bank transfer preferred; please quote the invoice number as the reference."
];

const COLUMN_LABEL_SETS: TableSettings["columnLabels"][] = [
  {
    description: "Item",
    quantity: "Quantity",
    unit: "Unit",
    unitPrice: "Unit Price",
    tax: "",
    amount: ""
  },
  {
    description: "Description",
    quantity: "Qty",
    unit: "Unit",
    unitPrice: "Rate",
    tax: "",
    amount: "Total"
  },
  {
    description: "Service",
    quantity: "Hours",
    unit: "Unit",
    unitPrice: "Rate",
    tax: "",
    amount: ""
  },
  {
    description: "Product",
    quantity: "Qty",
    unit: "Unit",
    unitPrice: "Price",
    tax: "",
    amount: "Subtotal"
  }
];

const UNITS = ["", "hrs", "units", "days", "kg", "ea"];

const SIZES: InvoiceSize[] = ["small", "medium", "large"];

const TAX_RATES = [0, 5, 7.5, 10, 20];
const DUE_IN_DAYS = [14, 30, 45, 60];

function pickRandom<TItem>(items: TItem[]): TItem {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildContactBlock(name: string): string {
  const handle = name.toLowerCase().replace(/[^a-z0-9]+/g, "");

  return [
    name,
    pickRandom(STREETS),
    pickRandom(CITIES),
    `(555) ${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
    `hello@${handle}.com`
  ].join("\n");
}

function buildPaymentDetails(sellerName: string): InvoicePaymentDetails {
  const bank = pickRandom(BANKS);
  const accountNumber = String(randomInt(10000000, 99999999));
  const sortDigits = `${randomInt(10, 99)}${randomInt(10, 99)}${randomInt(10, 99)}`;
  const sortCode = `${sortDigits.slice(0, 2)}-${sortDigits.slice(2, 4)}-${sortDigits.slice(4)}`;
  const ibanBody =
    (sortDigits + accountNumber).match(/.{1,4}/g)?.join(" ") ?? "";
  const iban = `GB${randomInt(10, 99)} ${bank.code} ${ibanBody}`;
  const bic = `${bank.code}GB2${pickRandom(["L", "A", "B"])}`;
  const handle = sellerName.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const terms =
    Math.random() < 0.5
      ? pickRandom(PAYMENT_INSTRUCTIONS)
      : `Bank transfer or PayPal to pay@${handle}.com`;

  return {
    label: "Payment details",
    bankName: bank.name,
    accountName: sellerName,
    accountNumber,
    routingNumber: "",
    iban,
    bic,
    sortCode,
    terms
  };
}

/**
 * Dev-only helper. Builds an invoice with random but realistic data and writes
 * it straight to IndexedDB so the Open Invoice list can be tested with many
 * entries. Not referenced from any production code path.
 */
export async function seedDummyInvoice(): Promise<InvoiceDocument> {
  const sellerName = pickRandom(COMPANY_NAMES);
  const clientName = `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`;
  const invoiceNumber = `INV-${String(randomInt(1, 9999)).padStart(4, "0")}`;
  const currencyOption = pickRandom(currencyOptions);

  const items = Array.from({ length: randomInt(1, 6) }, () => ({
    id: crypto.randomUUID(),
    description: pickRandom(ITEM_DESCRIPTIONS),
    quantity: randomInt(1, 12),
    unit: pickRandom(UNITS),
    unitPrice: randomInt(1, 80) * 25
  }));

  const createdAt = new Date(
    Date.now() - randomInt(0, 120) * 24 * 60 * 60 * 1000
  );
  const updatedAt = new Date(
    createdAt.getTime() + randomInt(0, 48) * 3600 * 1000
  );

  const invoiceData: Invoice = {
    ...invoiceDefault,
    id: crypto.randomUUID(),
    title: pickRandom(TITLES),
    number: invoiceNumber,
    invoiceDate: format(createdAt, "yyyy-MM-dd"),
    dueDate: format(addDays(createdAt, pickRandom(DUE_IN_DAYS)), "yyyy-MM-dd"),
    seller: {
      ...invoiceDefault.seller,
      label: pickRandom(FROM_LABELS),
      content: buildContactBlock(sellerName)
    },
    client: {
      ...invoiceDefault.client,
      label: pickRandom(TO_LABELS),
      content: buildContactBlock(clientName)
    },
    items,
    tableSettings: {
      ...invoiceDefault.tableSettings,
      columnLabels: pickRandom(COLUMN_LABEL_SETS)
    },
    tax: {
      percentage: pickRandom(TAX_RATES),
      exempt: false,
      note: "",
      perLine: false
    },
    fees: Math.random() < 0.3 ? randomInt(1, 20) * 5 : 0,
    discounts: Math.random() < 0.25 ? randomInt(1, 20) * 5 : 0,
    terms: {
      label: pickRandom(TERMS_LABELS),
      content: pickRandom(TERMS_CONTENTS)
    },
    paymentDetails: buildPaymentDetails(sellerName),
    currency: currencyOption.symbol,
    currencyCode: currencyOption.code,
    theme: { ...invoiceDefault.theme, size: pickRandom(SIZES) }
  };

  const invoiceDocument: InvoiceDocument = {
    id: crypto.randomUUID(),
    name: deriveInvoiceName(invoiceData),
    nameSource: "auto",
    invoiceData,
    templateId: null,
    rev: 1,
    createdAt,
    updatedAt
  };

  await saveInvoice(invoiceDocument);

  return invoiceDocument;
}
