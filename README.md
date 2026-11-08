# raseeda

A free, local-first invoice generator that runs entirely in your browser. Fill in the details, pick a font and download a PDF. No account needed, no tracking cookies, and your invoices never leave your device. The site counts anonymous usage (event names, country, browser family, OS, device type, language, the kind of site a visit came from, and a few bucketed details of the invoices made, such as the currency code) and nothing else.

**Live app:** [raseeda.com](https://raseeda.com)

raseeda makes the document and stops there: it isn't an invoice tracker, CRM or accounting tool. What's in and out of scope is in [PRODUCT.md](PRODUCT.md#scope).

## Features

- Create invoices with seller and client details, line items, tax, fees, discounts, and terms
- Make quotes, proforma invoices, receipts and credit notes too, each with its own title and labels ("Valid until", "Date paid", "Total credit"), all renameable
- Payment details section: bank name, account and routing numbers, IBAN, BIC / SWIFT and sort code, each under a label you can rename ("BSB", "IFSC", "CLABE"), other ways to pay such as PayPal, Venmo, Pix or UPI, and payment notes
- Set the whole invoice in any of eleven fonts, with your choice of size and weight
- Pick an accent colour for the title, section headings, table header and total, and a colour for the rest of the text
- Save and load invoice documents locally in IndexedDB
- Reusable templates for repeat work
- Fill in a client from your past invoices as you type their name
- Upload your logo
- Any currency, with custom symbols when you need them
- Export to PDF in one click
- Import and export all data (invoices, templates, images) as a backup, or delete it all
- Show a payment on the invoice with its date, and an optional PAID stamp
- A small on-device API for scripts and assistants (see below)
- Works offline: no network needed once the editor has loaded
- No sign-up, no accounts, no tracking cookies; only anonymous usage counts, off under Global Privacy Control

## Scripting the editor

While the editor (`/create`) is open, `window.raseeda` lets a script or an AI assistant driving the browser make and export invoices without clicking. It reads and writes the same browser storage the editor does; nothing is sent anywhere.

| Call | What it does |
| --- | --- |
| `version` | The API version, currently `1` |
| `listInvoices()` | Every invoice: `id`, `name`, `documentType`, `number`, `client`, `total`, `currency`, `currencyCode`, `invoiceDate`, `dueDate`, `updatedAt` |
| `getInvoice(id)` | An invoice's data, in the shape an export's `invoiceData` has |
| `createInvoice(data)` | Adds an invoice and opens it, returning its id. Takes the same shape; anything left out takes a new invoice's value |
| `openInvoice(id)` | Opens an invoice in the editor |
| `getPdf(id?)` | The PDF of that invoice, or the open one, as a `Blob` |
| `downloadPdf(id?)` | Saves that PDF as a download |
| `importData(json)` | Imports a whole export file (its text or the parsed object), as Import Data does |

Every call except `version` returns a promise.

```js
const id = await raseeda.createInvoice({
  number: "INV-0042",
  client: { content: "Acme Ltd\n1 High Street" },
  items: [{ description: "Design work", quantity: 10, unit: "hrs", unitPrice: 80 }]
});
await raseeda.downloadPdf(id);
```

Tax is the invoice's `tax`: `{ percentage, exempt, note, perLine }`. With `perLine: true`, an item can carry a rate of its own, `tax: { percentage, exempt }`, and an item without one is taxed at the invoice's rate. The totals then show a row per rate. With `perLine: false`, every item is taxed at the invoice's rate and any item rates are kept but ignored.

```js
await raseeda.createInvoice({
  tax: { percentage: 20, exempt: false, note: "Exempt supply", perLine: true },
  items: [
    { description: "Design work", quantity: 10, unitPrice: 80 },
    { description: "Printed books", quantity: 2, unitPrice: 15, tax: { percentage: 0, exempt: false } },
    { description: "Training", quantity: 1, unitPrice: 300, tax: { percentage: 0, exempt: true } }
  ]
});
```

`documentType` is what the document is: `"invoice"` (the default), `"quote"`, `"proforma-invoice"`, `"receipt"` or `"credit-note"`. It sets the defaults for the title, the sample number and three labels: a quote is titled "Quote", numbered "QUO-0001", with "Quote No." and "Valid until" for the due date; a proforma invoice "Proforma invoice", "PRO-0001", with "Proforma No."; a receipt "Receipt", "REC-0001", with "Receipt No." and "Date paid"; and a credit note "Credit note", "CN-0001", with "Credit note No." and "Total credit". A `title`, `number` or `labels.invoiceNumber`, `labels.paymentDue` or `labels.total` given in the data is kept as given. A receipt left without a `dueDate` (its "Date paid") is dated on its `invoiceDate`; the other types are due 30 days after it. Invoices saved or exported before document types existed read as invoices.

```js
await raseeda.createInvoice({
  documentType: "quote",
  number: "Q-0007",
  items: [{ description: "Website redesign", quantity: 1, unitPrice: 4800 }]
});
```

The line items table is `tableSettings`: `{ columnLabels, columns, backgroundColor, borderColor }`. `columns` is `{ quantityAndPrice, unit }`, both on by default. With `quantityAndPrice: false`, the Quantity, Unit and Unit price columns are hidden and each item is a description and an amount, so give each one `quantity: 1` and the amount as its `unitPrice`. `columnLabels.tax` names the Tax column; left blank, it uses the tax row's label (`labels.tax`). `columnLabels.amount` names the Amount column; left blank, it reads "Net amount" while the tax section is on and "Amount" while it's off.

The invoice's colours are `theme.accent`, for the title, the section headings, the table's header and the total, and `theme.textColor`, for everything else; both are hex codes such as `"#1a1a1a"`.

How amounts are written is `numberFormat` and `currencyPosition`. `numberFormat` is one of `"comma-dot"` (1,234.56), `"dot-comma"` (1.234,56), `"space-comma"` (1 234,56), `"apostrophe-dot"` (1’234.56) or `"indian"` (12,34,567.89); `currencyPosition` is `"before"` ($1,234.56) or `"after"` (1.234,56 €). `paperSize` is `"A4"` or `"Letter"`, for the PDF, the page in the editor and print. A script's invoice left without them is `"comma-dot"`, `"before"` and `"A4"`, whatever the browser's language; a blank invoice made in the editor starts on the browser's. Currencies with no minor unit (JPY, KRW, VND and the rest of ISO 4217's zero-decimal list) are reckoned and printed in whole units.

`paymentDetails.labels` names each bank field on the page (`{ bankName, accountName, accountNumber, routingNumber, iban, bic, sortCode }`, left out it reads "Bank name", "Routing number" and so on), and `paymentDetails.methods` lists other ways to pay, printed below the bank fields in order: `[{ id, name, detail }]`, such as `{ id: "venmo", name: "Venmo", detail: "@jane-designs" }`. A method with no `detail` doesn't print. `paymentDetails.paymentLink` is a link to pay online, such as `"https://paypal.me/janedesigns"`, printed last under `paymentDetails.labels.paymentLink` ("Pay online" when left out) and clickable in the PDF.

```js
await raseeda.createInvoice({
  currency: "€",
  currencyCode: "EUR",
  numberFormat: "dot-comma",
  currencyPosition: "after",
  items: [{ description: "Beratung", quantity: 1.5, unitPrice: 120 }]
});
```

## Tech Stack

- **React 19** with the React Compiler
- **TanStack Start** and **TanStack Router**: app framework and routing
- **Vite 8**: build tooling
- **TypeScript**: strict mode
- **Zustand** + **Immer**: invoice state
- **Dexie**: IndexedDB persistence
- **Zod**: invoice schema and validation
- **React Hook Form** + **Zod**: dialog forms
- **@react-pdf/renderer**: PDF export
- **Tailwind CSS 4** + **shadcn/ui** + **Base UI**: styling and components
- **Tabler Icons**: icon set
- **Sonner**: toast notifications
- **date-fns**: date formatting
- **lodash-es**: utilities

## Getting Started

Requires [Bun](https://bun.sh).

```bash
bun install
bun run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Development

```bash
bun run dev          # Dev server (port 3000)
bun run build        # Production build
bun run serve        # Preview production build
bun run test         # Run tests (Vitest)
bun run lint         # ESLint
bun run format       # Prettier
bun run check        # Format + lint fix
bun run check-types  # TypeScript (no emit)
bun run ts-lint      # Type check (watch)
bun run deploy       # Build and deploy to Cloudflare Workers
```

Run the suite with `bun run test`, not plain `bun test`. The script runs Vitest,
which shims IndexedDB via `fake-indexeddb`; `bun test` uses Bun's own runner and
skips that setup, so the Dexie-backed tests fail as if something were broken.

## Project Structure

```
app/
  routes/              # TanStack file-based routes (/, /create)
  router.tsx           # Router and query client setup
components/
  editor/              # Invoice editor UI
  pdf/                 # PDF layout and download
  dialogs/             # Save, open, import, and template modals
  tables/              # Invoice and template list views
  ui/                  # shadcn/ui primitives
context/               # React Context (document state, canvas view)
db/                    # Dexie IndexedDB setup and CRUD
schema/                # Zod invoice schema and migrations
stores/                # Zustand store and selectors
hooks/                 # Custom React hooks
utils/                 # Utility functions
consts/                # Constants (currencies, fonts, events)
types/                 # TypeScript type definitions
styles/                # Global CSS (Tailwind theme, fonts)
lib/                   # Helper utilities (cn() classname merger)
```

## Deployment

Deployed to Cloudflare Workers via Wrangler. Run `bun run deploy` to build and deploy. Configure targets in `wrangler.jsonc`.

## License

[MIT](LICENSE)
