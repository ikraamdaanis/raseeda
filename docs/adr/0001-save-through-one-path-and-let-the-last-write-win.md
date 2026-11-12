---
status: accepted
---

# Save through one path, from one editor tab

raseeda is a simple local-first invoice creator, but the editor's saving layer (`context/document-session.ts`, about 2,200 lines plus 3,000 lines of tests) has become the source of a steady run of multi-tab and failed-write bugs (#149, #153, #154, #159, #169, #171, #172). It promises that two tabs can have one invoice open without ever overwriting each other and that no edit is ever lost, and keeping both promises takes revision compare-and-swap, a Web Lock per invoice, a read-only mode that follows the editing tab, localStorage stashes and per-session leftovers, conflict versions, and a recovery pass on every load. Each fix adds a flag the next change has to check. One person on one device almost never wants the editor open twice, so we stop supporting it: one tab edits at a time, and every other part of the design gets to assume that.

## Decision

- **One editor tab.** The editor holds a single app-wide Web Lock for as long as it's open, taken before it opens the database. A second `/create` tab shows "raseeda is open in another tab" with **Use here** instead of the editor. Use here asks the first tab (over a BroadcastChannel) to write what's pending and let go; the first tab then shows the same notice, and the second opens the editor. Pages other than `/create` never touch the database and are unaffected.
- **IndexedDB is the only truth.** The editor reads the open invoice from it when it opens one. Nothing else writes that invoice while the editor holds the lock, so there is no live query and nothing to merge.
- **One write path.** The save controller (500ms debounce, 2s max wait) creates the invoice on its first real edit and after that does a single update of its content (and its name while that's automatic). No revision compare-and-swap.
- **Leaving the page.** Pending edits are written when the tab is hidden, and the browser asks before closing while a write is pending or failing.
- **A failed write is shown, not recovered.** A "Can't save" banner with Export; the edits stay in memory, the controller retries, and the page asks before it closes. No localStorage stashes or leftovers. Use here still hands over while writes fail: the first tab keeps its edits in memory, with the banner, Export and the close prompt, so a failing tab never blocks the others. A tab that gets the editor back with edits still unwritten writes them; otherwise it reads the invoice afresh.
- **Deleted is derived.** The open invoice can only be deleted from the editor itself, which starts a blank in its place. If a write finds the row gone anyway, the editor shows the deleted notice and "Keep a copy".

## What's kept

The invoice store, forms, undo/redo, PDF, library, templates, version history (opened, idle, before a large removal, before a restore), a new invoice joining the library on its first edit, blank-invoice cleanup when an invoice edited back to blank is left in the app, refusing to leave an invoice whose writes are failing, the automation API, the Safari backup suggestion, the "unavailable" state when the browser gives no storage, and the reload notice when another tab upgrades the database. `useInvoiceDocument` and `documentActions` keep their interface (less `takeOver`), so the editor doesn't change beyond losing the read-only banner.

A tab closed on an invoice edited back to blank no longer leaves a `blank:<id>` marker: the next visit reopens that invoice (it's the last opened), and leaving it in the app deletes it.

## Considered options

- **Keep patching the current session.** Each fix adds a flag the next change must check; the bug list shows where that goes.
- **An explicit state machine that keeps today's guarantees.** It would prevent some of the interleaving bugs, but it keeps all the recovery machinery, and the guarantees themselves are the real cost.
- **Any tab can edit, last write wins.** No lock at all: every tab follows the invoice through a live query, and another tab's write replaces this tab's copy unless this tab has unwritten edits. Simpler than today, but it still needs echo detection, deleted-elsewhere handling, undo clearing when another tab writes, and it loses a tab's work whenever two are typed in. All of that exists only to support two editor tabs, which nobody needs.
- **CRDTs (Yjs, Automerge).** Built for several people editing at once and for sync, which `PRODUCT.md` rules out.

## Consequences

What we accept losing:

- Having the editor open in two tabs at once, the read-only banner and "Edit here".
- Edits made while writes fail, if the tab is closed anyway after the prompt.
- A blank invoice sitting in the library between closing the tab on it and the next visit.

The rule for the next change: if a case seems to need another flag, lock or storage key, revisit this decision rather than adding one.

## Migration

1. Build the new session and the editor lock next to the old session, with tests written against the decision above. Nothing switches yet.
2. Switch the editor over. Bump the IndexedDB version with no schema change, so a tab still on the old release gets the reload notice and stops writing (stashing what it had pending). On each load, a one-time recovery brings in the `unsaved:<id>` stashes and `unwritten:<session>:<id>` leftovers already on the device, by today's rule: written into the invoice when nothing was written since (its `rev` still matches), otherwise kept as a version, and as a new invoice when the invoice was deleted; then the key is removed. Writes keep bumping `rev` while the recovery exists.
3. Delete the old session, its storage keys, the per-invoice locks and the compare-and-swap write, and update the Autosave section of `CLAUDE.md`.
4. In May 2027, remove the recovery and the `rev` bump.
