# CLAUDE.md

## Project Overview

raseeda is a free, local-first invoice generator that runs entirely in the browser. No accounts, no tracking of individuals; all invoice data stays on the user's device in IndexedDB. The only thing pages send back is an anonymous usage event: its name and a few bucketed fields, never invoice content.

What raseeda is for, and what it deliberately leaves out (it is not an invoice tracker), is in the Scope section of `PRODUCT.md`. Check a feature against it before proposing or building one.

## Tech Stack

- **Framework:** TanStack Start (React 19 + TanStack Router)
- **Language:** TypeScript (strict mode)
- **Build:** Vite 8 with React Compiler (Babel plugin)
- **Styling:** Tailwind CSS 4 + shadcn/ui (new-york style) + Radix UI primitives
- **State:** Zustand (with Immer + subscribeWithSelector middleware) for invoice data; React Context for UI state
- **Storage:** Dexie (IndexedDB wrapper); no backend for data. The only request is the anonymous usage beacon to `/api/event`
- **PDF:** @react-pdf/renderer
- **Forms:** React Hook Form + Zod validation
- **Icons:** lucide-react
- **Package Manager:** Bun
- **Deployment:** Cloudflare Workers (`wrangler deploy`)

## Commands

```bash
bun run dev          # Start dev server (port 3000)
bun run build        # Production build
bun run serve        # Preview production build
bun run test         # Run the test suite (Vitest)
bun run lint         # ESLint
bun run format       # Prettier
bun run check        # Format + lint fix
bun run check-types  # TypeScript type check (no emit)
bun run ts-lint      # Type check with watch mode
bun run cf-typegen   # Regenerate the Worker's Env types (worker-configuration.d.ts)
```

Run tests with `bun run test`, not plain `bun test`. The `test` script runs
Vitest, which loads the setup file that shims IndexedDB (`fake-indexeddb`);
`bun test` invokes Bun's own runner instead, bypassing that setup and failing
the Dexie/migration suites with what looks like real breakage.

## Project Structure

```
app/routes/          # TanStack file-based routes (__root.tsx, index.tsx, create.tsx)
components/          # React components
components/ui/       # shadcn/ui primitives (Button, Dialog, Drawer, etc.)
stores/              # Zustand store + selectors
context/             # React Context providers (UI state, document state)
db/                  # Dexie IndexedDB setup and CRUD operations
hooks/               # Custom React hooks
utils/               # Utility functions
consts/              # Constants (currencies, events)
types/               # TypeScript type definitions
styles/              # Global CSS (Tailwind theme, fonts)
lib/                 # Helper utilities (cn() classname merger)
```

## Code Conventions

### Imports

- **Absolute imports only** via the `~/` path alias (e.g. `~/components/...`), configured in tsconfig `paths`; no relative imports (enforced by ESLint).
- Use `import type { X }` for type-only imports (enforced).

### Naming

- Components: `PascalCase` (e.g., `InvoiceEditor`)
- Hooks: `use*` prefix (e.g., `useInvoiceStore`)
- Utilities: `camelCase` (e.g., `calculateInvoiceTotals`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `DEFAULT_FONT_COLOUR`)
- Types: `PascalCase` (e.g., `InvoiceTemplate`, `TextSettings`)
- Zustand selectors: `use*Slice` / `use*Settings` (e.g., `useTitleSlice`, `useTableSettingsSlice`)
- Unused variables: prefix with `_`

### Formatting (Prettier)

- 2-space indentation, 80-char print width
- Double quotes, semicolons, no trailing commas
- Tailwind class sorting via prettier-plugin-tailwindcss

### Components

- Functional components with hooks only
- Props destructured at definition with type annotations
- Use `cn()` from `lib/utils` to merge Tailwind classes
- Use CVA (class-variance-authority) for component variants

## State Management Patterns

### Zustand Store (invoice data)

- Single store in `stores/invoice-store.ts` with Immer + subscribeWithSelector
- Write mutable-looking code inside `set()`; Immer handles immutability
- Use `applyUpdater<T>()` helper for value-or-function updaters
- Auto-recalculate totals via `recalculate()` when items/tax/fees/discounts change

### Selectors (performance)

- Define sliced selectors in `stores/invoice-selectors.ts`
- Always use `useShallow()` for shallow equality to prevent unnecessary re-renders
- Subscribe only to the state slice a component needs

### Context (UI state)

- `InvoiceDocumentProvider`: hydrates the editor session and attaches the editor to the open invoice; `useInvoiceDocument` exposes its identity, status and actions
- `EditorUiProvider`: edit/preview mode, which side panels are open, the command palette
- `FileActionsProvider`: new/open/duplicate/version history/templates/import/export and their dialogs, shared by the project menu, invoices panel and command palette
- `CanvasViewProvider`: zoom (a level or fit)

## Key Architecture Decisions

- **No backend for data**; all persistence is IndexedDB via Dexie. The Worker's one endpoint is `POST /api/event` (`app/analytics-event.ts`)
- **Anonymous usage counts** (issues #85, #104): `track()` / `trackInvoice()` / `trackPageView()` (`utils/track.ts`) send an event name from `consts/analytics-events.ts` by `sendBeacon` to `/api/event`, with `key=value` fields that are each bucketed in the browser and checked against a list in `consts/analytics-events.ts` on the server (`EVENT_FIELDS`): the kind of site the visit came from (`utils/traffic-source.ts`, never the address) and the `?ref=`/`utm_source`, language, display mode, and for the editor's events a library-size range, the invoice's currency code (listed codes only) and a PDF's printed sections. The server adds country plus bucketed browser, OS and device (`utils/user-agent.ts`) and writes Workers Analytics Engine (`ANALYTICS` binding); blob and double positions are append-only. The channel lives in memory for the page load. No-op in dev and under Global Privacy Control; nothing stored on the device, and IndexedDB is never opened just to count. Never add names, amounts, typed text or identifiers to an event, and never store more of `request.cf` than the country. Queries live in `scripts/usage-report.sql`; count with `SUM(_sample_interval)`
- **Autosave, no Save step** (issue #86): `context/document-session.ts` gives each open invoice a save controller (`context/save-controller.ts`: 500ms debounce, 2s max wait, one write at a time). Content writes are a compare-and-swap on the invoice's `rev`; a new invoice joins the library on its first real edit; one tab edits an invoice at a time (a Web Lock per invoice, the other tab follows read-only with "Edit here"). Edits unwritten at page exit are stashed in localStorage and recovered. Each invoice keeps a `versions` history (`utils/version-thinning.ts`)
- **Undo and redo** (`stores/invoice-history.ts`): snapshots of the invoice data, grouped by the focused field's `data-field` path within 500ms, every discrete action its own step. Store changes carry an origin (`stores/change-origin.ts`): `edit` is recorded and saved, `history` is saved, `load` is neither. Image cleanup keeps blobs the history or versions reference
- **Content-Security-Policy** on every page (`consts/content-security-policy.ts`, sent from `app/server.ts`) only allows raseeda's own origin; it is what keeps raseeda's no-data-leaves-the-device promise true, so never loosen it to add a third-party request. raseeda's own origin receives the anonymous usage events; the policy still blocks every other origin. Zod runs jitless (`lib/configure-zod.ts`, imported wherever zod is) because the policy forbids eval
- **React Compiler enabled**: automatic memoization; avoid manual useMemo/useCallback unless necessary
- **PDF generation** (`@react-pdf/renderer`) lives in the `components/pdf/invoice-pdf-*` modules and is built on demand by `hooks/use-invoice-pdf.ts`, which loads the builder lazily
- **PDF fonts** (issue #117): react-pdf takes one file per weight and has no font fallback, so each invoice font's weights are merged from the script subsets Fontsource ships for it (Latin, Latin Extended, Vietnamese, Cyrillic, Greek; each character keeps its Latin glyph, so Latin text kerns as before; a Latin Extended or Vietnamese letter next to one the Latin subset shares, as in "ȚA", sets unkerned) into `styles/pdf-fonts/` by `bun run build:pdf-fonts` (needs fontTools). The same script writes `consts/font-coverage.ts`; `getCurrencyMarker` prints a currency's code instead of a symbol the invoice's font can't draw ("₹" in Lora prints "INR"), in the editor and the PDF alike
- **Number format** (issue #117): each invoice's `numberFormat` (comma-dot, dot-comma, space-comma, apostrophe-dot, indian) and `currencyPosition` (before, after) say how every amount is written; `formatCurrency(amount, getMoneyFormat(invoice))` writes it, never Intl, so the editor, PDF and library agree. Spaces are U+00A0 and Swiss groups U+2019, since no invoice font has U+202F. Zero-decimal currencies (`ZERO_DECIMAL_CURRENCIES`) round to whole units in `calculateInvoiceTotals`. Money and quantity inputs read the invoice's decimal separator (`toPlainDecimal`). A new blank invoice in the editor takes both from `navigator.language` (`utils/locale-defaults.ts`); stored invoices without them, and the automation API, use comma-dot and before
- **Paper size** (issue #117): `paperSize` is A4 or Letter. The PDF page and the items table's width read `PDF_PAGE_SIZES` (`utils/pdf-styles.ts`), the canvas sizes the page by it, and a Letter canvas adds an `@page { size: letter }` style, so print takes the invoice's size. New blank invoices take Letter in CLDR's Letter territories; stored invoices, templates and the home preview are A4
- **Payment details** (issue #117): each bank field prints under `paymentDetails.labels` (renameable, a cleared one prints the default), then `paymentDetails.methods` (`{ id, name, detail }`), other ways to pay, in order, then `paymentDetails.paymentLink` (issue #136), which the PDF links when `getPaymentLinkHref` reads it as a web address. `getPaymentRows` (`utils/payment-details.ts`) is what prints; the PDF and `getPrintedSections` read it, Preview hides the same rows, and a method with no detail is left out
- **Document types** (issue #132): `invoice.documentType` (schema v4) is invoice, quote, proforma-invoice, receipt or credit-note. `DOCUMENT_TYPE_DEFAULTS` (`consts/document-types.ts`) gives each its title, sample number (INV-, QUO-, PRO-, REC-, CN-0001), due days and its `invoiceNumber`, `paymentDue` and `total` labels; `applyDocumentType` (`utils/document-type.ts`) swaps only the ones still equal to the old type's default, so renamed ones stay. A blank of any type counts as blank (`isBlankInvoice` compares it with a blank of its own type). `DOCUMENT_TYPE_ROWS` (issue #133) gives the closing rows each type settles: `getTypeSections` reads the switches as the type says (a quote's and a credit note's amount paid and PAID stamp off, a proforma's stamp off, a receipt's amount paid on, payment details and late payment fee off on receipts and credit notes) wherever totals, Preview and the PDF read them, and never changes the stored switches, so switching back restores the rows. A receipt with `amountPaid` 0 is paid in full (`calculateInvoiceTotals`). A receipt prints `paidBy` under its date paid. A credit note prints `refersTo` under its number and no due date row; receipts and credit notes offer no payment terms. Duplicate As (issue #134) copies a document as another type with nothing linking the two: `prepareInvoiceCopy` (`utils/invoice-copy.ts`) applies the type, numbers the copy after the newest document of that type (else the type's sample number), keeps the due date's span only between types whose due row means the same, and fills an invoice-made credit note's empty `refersTo` with the invoice's number and date
- **Section switches**: `invoice.sections` (schema v2) says which optional parts are on. `utils/section-visibility.ts` (`getPrintedSections`) decides what prints, and both the PDF and the editor's Preview read it; switched-off pricing rows also drop out of `calculateInvoiceTotals`
- **Second currency** (issue #99): the `currencyConversion` section shows every amount in a second currency too (any preset or custom currency), at a rate typed in and stored with the invoice. `utils/currency-conversion.ts` does the sums; each line, discount, tax row, fee and payment is its own amount times the rate, rounded to the second currency's decimals, and the subtotal, total and balance due are added up from those (`calculateConvertedTotals`), so the second currency's column adds up. It's left out when the invoice is already in that currency, and prints only once it has a rate
- **Editor theme**: the editor alone has light/dark, applied as `data-editor-theme` on `<html>` (`utils/editor-theme.ts`, `hooks/use-editor-theme.ts`); the invoice page (`[data-paper]`) stays light in both
- **App name** lives only in `consts/app.ts` (`APP_NAME`). Copy in code reads it; identifiers, storage keys, lock and cache names never carry the name, so renaming the app is a one-line change plus docs. The app was called billsend: `utils/legacy-storage-keys.ts` and the service worker clear up its old `billsend-` keys and caches, and import accepts any `appName`
- **Search**: each page's title, description, robots rules and share card live in `PAGE_META` (`utils/site-meta.ts`), its JSON-LD in `utils/structured-data.ts` (added with `jsonLdScript`). The editor is `noindex` and left out of the sitemap. Each sitemap `lastmod` is the last commit touching that page's files (`PAGE_FILES` in `vite.config.ts`), so deploy from a full clone: a shallow one falls back to the build date. The build deletes TanStack's `pages.json`. `bun run render:home` also draws the template gallery's share card
- **No barrel exports**; import directly from the source file
- **date-fns** for dates (not dayjs or moment)
- **lodash-es** for utilities (tree-shakeable ES module version)
