import { isPlainObject } from "lodash-es";
import { z } from "zod";
import { LABEL_LANGUAGES } from "~/consts/label-presets";
import "~/lib/configure-zod";
import {
  invoiceItemSchema,
  invoiceSchema,
  paymentMethodSchema,
  STORED_INVOICE_FORMATS
} from "~/schema/invoice";
import { createBlankDocument } from "~/stores/invoice-store";
import { SITE_URL } from "~/utils/site-meta";

// Where the schema is served (public/invoice.schema.json), as its $id.
const SCHEMA_URL = `${SITE_URL}/invoice.schema.json`;

// Fields a script can't usefully set: the invoice's and each line's id are
// given on save, and the logo and signature are images stored on the device.
// A contact's placeholder is the editor's hint text and never prints.
const LEFT_OUT = new Set([
  "id",
  "image",
  "items.id",
  "seller.placeholder",
  "client.placeholder",
  "shipping.placeholder",
  "signature.image"
]);

// Fields whose value, left out, depends on the day, so the schema states no
// default for them.
const NO_DEFAULT = new Set(["invoiceDate", "dueDate"]);

// What a field holds, where its name and type don't say it, by its path.
const DESCRIPTIONS: Record<string, string> = {
  documentType:
    "What the document is. Sets the default title, sample number, labels and closing rows",
  title: "The heading printed at the top. Left out, the type's, such as Quote",
  number:
    "The document number, such as INV-0042. Left out, the type's sample number (INV-0001, QUO-0001, PRO-0001, REC-0001, CN-0001)",
  refersTo:
    "A credit note's invoice, as printed text (its number and date). Only a credit note prints it",
  poNumber: "The client's purchase order number",
  invoiceDate: "The issue date, yyyy-MM-dd. Left out, today",
  dueDate:
    "yyyy-MM-dd. Left out, the type's days after invoiceDate (a quote's Valid until, a receipt's Date paid)",
  paidBy:
    "How a receipt was paid, as printed text, such as Card. Only a receipt prints it",
  servicePeriod: "The period the work covers, as printed text",
  supplyDate: "The date of supply, yyyy-MM-dd",
  seller: "Who the document is from",
  "seller.content": "Name, address and other details, one per line",
  client: "Who the document is to",
  "client.content": "Name, address and other details, one per line",
  shipping: "Where goods go, printed with sections.shipping on",
  "shipping.content": "Name and address, one per line",
  items: "The line items, in order",
  labels:
    "The printed labels. Left out, the type's in the language given (an English invoice's are shown); labels given are laid over them",
  "items.quantity":
    "Left out, 0. With tableSettings.columns.quantityAndPrice off, give 1 and the amount as unitPrice",
  "items.unit": "Such as hrs or kg",
  "items.unitPrice": "The price of one unit, in the invoice's currency",
  "items.tax":
    "The line's own rate, used while tax.perLine is on; a line without one takes the invoice's rate",
  tax: "The invoice's tax rate, printed with sections.tax on",
  "tax.percentage": "Such as 20 for 20%",
  "tax.exempt": "No tax is charged; the rate is kept",
  "tax.note": "Printed with an exempt rate, such as Reverse charge",
  "tax.perLine": "Lets each item carry a rate of its own (items.tax)",
  fees: "A fee added to the total, printed with sections.fees on",
  discounts:
    "The discount, printed with sections.discounts on: an amount or a percentage, as discountType says",
  amountPaid:
    "What has been paid, printed with sections.amountPaid on. A receipt with 0 is paid in full",
  paidDate: "The day the amount paid came in, yyyy-MM-dd",
  currencyConversion:
    "Every amount also in a second currency, printed with sections.currencyConversion on and a rate",
  "currencyConversion.rate": "One unit of the invoice's currency in the second",
  paymentDetails:
    "How to pay, printed with sections.paymentDetails on: bank fields, then methods, then paymentLink",
  "paymentDetails.labels":
    "Renames the bank fields, such as BSB for routingNumber",
  "paymentDetails.methods":
    "Other ways to pay, printed below the bank fields. A method with no detail doesn't print",
  "paymentDetails.paymentLink":
    "A link to pay online, printed last and clickable in the PDF",
  "paymentDetails.qrCodeContent":
    "What the QR code encodes, printed with sections.paymentQrCode on",
  "paymentDetails.upiId": "The payee of a UPI QR code",
  signature:
    "Printed with sections.signature on. Only the caption can be set here; the image is drawn or uploaded in the editor",
  currency: "The symbol printed, such as $ or €",
  currencyCode:
    "ISO 4217, such as USD. Left out with a currency given, the code of its symbol",
  theme: "The invoice's look",
  "theme.accent":
    "Hex colour of the title, section headings, table header and total",
  "theme.textColor": "Hex colour of everything else",
  sections: "Which optional parts are on",
  dateFormat: "How dates print",
  numberFormat:
    "How amounts are written: 1,234.56, 1.234,56, 1 234,56, 1’234.56 or 12,34,567.89",
  currencyPosition: "$1,234.56 or 1.234,56 €",
  paperSize: "The PDF's page size",
  language:
    "Sets every printed label from this language's preset; labels given are laid over it. English when left out"
};

// The JSON Schema of the data raseeda.createInvoice() takes (the shape of an
// export's invoiceData), served at /invoice.schema.json for agents. It's
// written from the import schema, so it can't drift from what's accepted.
// Every field is optional: one left out takes a new invoice's value, which is
// its default here, and an object given is laid over the new invoice's.
export function buildInvoiceJsonSchema() {
  const blank = createBlankDocument("invoice", {
    ...STORED_INVOICE_FORMATS,
    language: "en"
  });
  const itemSchema = toJsonSchema(invoiceItemSchema);
  const methodSchema = toJsonSchema(paymentMethodSchema);
  // The line items and payment methods are read one entry at a time (a bad
  // entry drops only itself), so the array schemas hold unknowns; each
  // entry's shape is put back here.
  const jsonSchema = z.toJSONSchema(invoiceSchema, {
    io: "input",
    unrepresentable: "any",
    override(context) {
      if (context.zodSchema === invoiceSchema.shape.items) {
        Object.assign(context.jsonSchema, { type: "array", items: itemSchema });
      }

      if (context.zodSchema === invoiceSchema.shape.paymentDetails) {
        const properties: unknown = Reflect.get(
          context.jsonSchema,
          "properties"
        );

        if (isPlainObject(properties)) {
          Reflect.set(Object(properties), "methods", {
            type: "array",
            items: methodSchema
          });
        }
      }
    }
  });
  const { $schema, properties, ...rest } = tidy(jsonSchema, {
    path: "",
    blankValue: blank,
    isArrayEntry: false,
    isDescribed: true
  });

  return {
    $schema,
    $id: SCHEMA_URL,
    title: "raseeda invoice data",
    description:
      "What raseeda.createInvoice(data) takes in raseeda's editor (https://raseeda.com/create). Every field is optional: one left out takes a new invoice's value (its default), and an object given is laid over the new invoice's, so its fields left out keep theirs. A value of the wrong type is replaced by the default. Amounts are numbers in the invoice's currency; totals are worked out, never given.",
    ...rest,
    properties: {
      ...Object(properties),
      language: {
        type: "string",
        enum: LABEL_LANGUAGES,
        description: DESCRIPTIONS.language
      }
    }
  };
}

function toJsonSchema(schema: z.ZodType) {
  const { $schema: _schema, ...rest } = z.toJSONSchema(schema, {
    io: "input"
  });

  return rest;
}

// Walks the schema by field path, beside the new invoice's value there. It
// drops `required` (every field is optional to createInvoice) and the fields
// a script can't set, adds descriptions (an array's once, not again on its
// entries) and gives each field the new invoice's value as its default; an
// object's or array's is left out, since each field inside says its own. A
// line item or payment method given keeps the schema's own defaults, since
// it's read on its own rather than laid over the new invoice's.
function tidy(
  node: Record<string, unknown>,
  {
    path,
    blankValue,
    isArrayEntry,
    isDescribed
  }: {
    path: string;
    blankValue: unknown;
    isArrayEntry: boolean;
    isDescribed: boolean;
  }
) {
  const tidied: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(node)) {
    if (key === "required") continue;

    if (key === "default") {
      const fieldDefault = isArrayEntry ? value : blankValue;

      if (!isPlainObject(fieldDefault) && !Array.isArray(fieldDefault)) {
        if (!NO_DEFAULT.has(path)) tidied.default = fieldDefault;
      }

      continue;
    }

    if (key === "properties" && isPlainObject(value)) {
      tidied.properties = Object.fromEntries(
        Object.entries(Object(value)).flatMap(([name, child]) => {
          const childPath = path ? `${path}.${name}` : name;

          if (LEFT_OUT.has(childPath) || !isPlainObject(child)) return [];

          return [
            [
              name,
              tidy(Object(child), {
                path: childPath,
                blankValue: isPlainObject(blankValue)
                  ? Reflect.get(Object(blankValue), name)
                  : undefined,
                isArrayEntry,
                isDescribed: true
              })
            ]
          ];
        })
      );
      continue;
    }

    if (key === "items" && isPlainObject(value)) {
      tidied.items = tidy(Object(value), {
        path,
        blankValue: undefined,
        isArrayEntry: true,
        isDescribed: false
      });
      continue;
    }

    tidied[key] = value;
  }

  const description = isDescribed ? DESCRIPTIONS[path] : undefined;

  return description ? { ...tidied, description } : tidied;
}
