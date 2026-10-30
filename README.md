# raseeda

A free, local-first invoice generator that runs entirely in your browser. Fill in the details, pick a font and download a PDF. No account needed, no tracking cookies, and your invoices never leave your device. The site counts anonymous usage (event names, country, browser family, OS and device type) and nothing else.

**Live app:** [billsend.io](https://billsend.io)

## Features

- Create invoices with seller and client details, line items, tax, fees, discounts, and terms
- Payment details section: bank name, account and routing numbers, IBAN, BIC / SWIFT, sort code, and payment notes
- Set the whole invoice in any of eleven fonts, with your choice of size and weight
- Save and load invoice documents locally in IndexedDB
- Reusable templates for repeat work
- Upload your logo
- Any currency, with custom symbols when you need them
- Export to PDF in one click
- Import and export all data (invoices, templates, images) as a backup
- Works offline: no network needed once the editor has loaded
- No sign-up, no accounts, no tracking cookies; only anonymous usage counts, off under Global Privacy Control

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
