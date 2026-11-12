# Coding Standards

The reviewer agent loads this during code review via `@.sandcastle/CODING_STANDARDS.md`.
These mirror the repo's `CLAUDE.md` and the operator's global preferences (also
mounted at `~/.claude/CLAUDE.md`). Enforce them on the lines the change touches.

## Imports and exports

- Absolute imports only (the `~/` alias). No relative imports. Enforced by ESLint.
- Types are imported only with a separate `import type { X }` line, never an inline
  `type` qualifier inside a value import (`import { cva, type VariantProps }` is two
  lines: a value import and an `import type`).
- No namespace imports (`import * as X`). Import the bindings by name.
- No blank lines between imports.
- Export each declaration inline (`export function Foo`), never in a bottom
  `export { ... }` block.
- No barrel exports. Import directly from the source file.

## TypeScript

- Never use the non-null assertion operator (postfix `!`). Narrow with a guard, use
  optional chaining, or fix the type instead. The logical-NOT `!cond` is fine.
- Never use single-letter parameter names. Use descriptive names derived from the
  value (`bakedPotatoes.map(bakedPotato => ...)`). Exceptions: classic `for` counters
  (`i`) and `.sort()` comparators (`a, b`).
- Inline a type used exactly once and not exported, directly in the function signature.
  Do not extract a single-use named alias.
- Never `export type|interface|enum` from feature files. Types are exported only from
  `**/types/index.ts` barrels or explicit contract files (`router.ts`, `schema.ts`).
  Single-use types stay local (drop the `export`); shared types move to `types/index.ts`.
- No blank lines inside object literals or object/interface types. Properties sit on
  consecutive lines.
- Leave a blank line above every `return` and around multi-line `if`/`for`/`while`/
  `switch`/`try` blocks. Consecutive single-line guards stack with no blank lines between
  them.
- Avoid unsafe casts (`as`), `any`, and `@ts-expect-error`. Prefer a correct type. If an
  escape hatch is truly unavoidable, justify it with a comment.
- `bun run check-types` must pass.

## React / JSX

- Functional components with hooks only. Props destructured at the definition with type
  annotations.
- React Compiler is enabled. Do not add manual `useMemo`/`useCallback` unless genuinely
  necessary.
- Never write comments inside JSX (`{/* ... */}`). Put explanatory comments as `//` above
  the component or near the relevant logic.
- No blank lines inside JSX. Structure comes from indentation.
- Use `cn()` from `lib/utils` to merge Tailwind classes. Use CVA for component variants.

## CSS / Tailwind

- Never use `space-y-*` / `space-x-*`. Use `flex`/`grid` plus `gap-*`.
- Never use `divide-y` / `divide-x`. Use `flex`/`grid` plus `gap-*` (e.g. `gap-px` with a
  background colour on the parent and `bg-background` children if a divider line is needed).

## State management

- Invoice data lives in the single Zustand store (`stores/invoice-store.ts`) with Immer +
  `subscribeWithSelector`. Write mutable-looking code inside `set()`.
- Subscribe via sliced selectors in `stores/invoice-selectors.ts`, always with
  `useShallow`. Subscribe only to the slice a component needs.
- Totals are derived: any mutation affecting items/tax/fees/discounts must keep
  `recalculate()` as the single source of truth. Do not compute totals ad hoc in
  components.
- UI/document state lives in React Context, not the store.

## Architecture

- No backend for data. All persistence is IndexedDB via Dexie. The only network
  call is the anonymous usage beacon (`utils/track.ts` to `/api/event`): an event
  name and its bucketed fields from `consts/analytics-events.ts`, never names,
  amounts, typed text or an identifier.
  Add no other network calls, telemetry or third-party analytics; the app's
  "local-first, no tracking" promise must hold.
- Keep modules focused on a single responsibility; prefer composition.
- Decisions recorded in `docs/adr/` hold unless an issue says otherwise. Use the terms
  in `GLOSSARY.md`.

## Forms

- A submit button stays loading from the click until there's an error; only a failure
  takes it out of its loading state (`isLoading={mutation.isPending || mutation.isSuccess}`).

## Testing

- Test external behaviour, not implementation details. For pure functions (e.g.
  `calculateInvoiceTotals`), assert inputs → outputs; do not assert internal call order.
- New or changed behaviour should be covered by a test where a test harness exists.

## Naming

- Components `PascalCase`; hooks `use*`; utilities `camelCase`; constants
  `SCREAMING_SNAKE_CASE`; Zustand selectors `use*Slice` / `use*Settings`. Unused vars
  prefixed with `_`.

## Writing (commits, PR text, comments)

- Commit messages are one short imperative line under about 50 characters, with no body
  unless the reason can't be read from the diff.
- Never use the em-dash `—`. Use a comma, semicolon, period, parentheses, or a sparing
  en-dash `–`.
