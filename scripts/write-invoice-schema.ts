import { writeFileSync } from "node:fs";
import { buildInvoiceJsonSchema } from "~/utils/invoice-json-schema";

// Writes public/invoice.schema.json, the shape raseeda.createInvoice() takes,
// from the import schema. Run after changing schema/invoice.ts; a unit test
// fails while the file is out of date.
writeFileSync(
  "public/invoice.schema.json",
  `${JSON.stringify(buildInvoiceJsonSchema(), null, 2)}\n`
);
