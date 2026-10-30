# CLAUDE.md

## Project Overview

raseeda is a free, local-first invoice generator that runs entirely in the browser. No accounts, no tracking of individuals; all invoice data stays on the user's device in IndexedDB. The only thing pages send back is an anonymous event name for the usage counts.

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
- **Anonymous usage counts** (issue #85): `track()` / `trackPageView()` (`utils/track.ts`) send an event name from `consts/analytics-events.ts` by `sendBeacon` to `/api/event`, which writes country plus bucketed browser, OS and device (`utils/user-agent.ts`) to Workers Analytics Engine (`ANALYTICS` binding). No-op in dev and under Global Privacy Control; nothing stored on the device. Never add invoice content, names, amounts or identifiers to an event, and never store more of `request.cf` than the country. Queries live in `scripts/usage-report.sql`; count with `SUM(_sample_interval)`
- **Autosave, no Save step** (issue #86): `context/document-session.ts` gives each open invoice a save controller (`context/save-controller.ts`: 500ms debounce, 2s max wait, one write at a time). Content writes are a compare-and-swap on the invoice's `rev`; a new invoice joins the library on its first real edit; one tab edits an invoice at a time (a Web Lock per invoice, the other tab follows read-only with "Edit here"). Edits unwritten at page exit are stashed in localStorage and recovered. Each invoice keeps a `versions` history (`utils/version-thinning.ts`)
- **Undo and redo** (`stores/invoice-history.ts`): snapshots of the invoice data, grouped by the focused field's `data-field` path within 500ms, every discrete action its own step. Store changes carry an origin (`stores/change-origin.ts`): `edit` is recorded and saved, `history` is saved, `load` is neither. Image cleanup keeps blobs the history or versions reference
- **Content-Security-Policy** on every page (`consts/content-security-policy.ts`, sent from `app/server.ts`) only allows raseeda's own origin; it is what keeps raseeda's no-data-leaves-the-device promise true, so never loosen it to add a third-party request. raseeda's own origin receives the anonymous event names; the policy still blocks every other origin. Zod runs jitless (`lib/configure-zod.ts`, imported wherever zod is) because the policy forbids eval
- **React Compiler enabled**: automatic memoization; avoid manual useMemo/useCallback unless necessary
- **PDF generation** (`@react-pdf/renderer`) lives in the `components/pdf/invoice-pdf-*` modules and is built on demand by `hooks/use-invoice-pdf.ts`, which loads the builder lazily
- **Section switches**: `invoice.sections` (schema v2) says which optional parts are on. `utils/section-visibility.ts` (`getPrintedSections`) decides what prints, and both the PDF and the editor's Preview read it; switched-off pricing rows also drop out of `calculateInvoiceTotals`
- **Editor theme**: the editor alone has light/dark, applied as `data-editor-theme` on `<html>` (`utils/editor-theme.ts`, `hooks/use-editor-theme.ts`); the invoice page (`[data-paper]`) stays light in both
- **App name** lives only in `consts/app.ts` (`APP_NAME`). Copy in code reads it; identifiers, storage keys, lock and cache names never carry the name, so renaming the app is a one-line change plus docs. The app was called billsend: `utils/legacy-storage-keys.ts` and the service worker clear up its old `billsend-` keys and caches, and import accepts any `appName`
- **No barrel exports**; import directly from the source file
- **date-fns** for dates (not dayjs or moment)
- **lodash-es** for utilities (tree-shakeable ES module version)
