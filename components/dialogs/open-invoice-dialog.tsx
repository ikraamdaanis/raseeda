import {
  IconCopy,
  IconFolderOpen,
  IconLoader2,
  IconPencil,
  IconSearch,
  IconTrash,
  IconX
} from "@tabler/icons-react";
import type { KeyboardEvent, MouseEvent } from "react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { RenameInvoiceDialog } from "~/components/dialogs/rename-invoice-dialog";
import { TouchRowActions } from "~/components/dialogs/touch-row-actions";
import { LibraryViewOptions } from "~/components/editor/shell/library-view-options";
import {
  InvoiceListStripeFiller,
  InvoiceListTable
} from "~/components/tables/invoice-list-table";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIcon,
  DialogTitle
} from "~/components/ui/dialog";
import { renameInvoice, watchInvoices } from "~/db";
import { usePersistentState } from "~/hooks/use-persistent-state";
import { cn } from "~/lib/utils";
import type { InvoiceDocument, InvoiceLibraryView } from "~/types";
import {
  DEFAULT_LIBRARY_VIEW,
  filterInvoices,
  parseLibraryView
} from "~/utils/invoice-library";
import { seedDummyInvoice } from "~/utils/seed-dummy-invoice";

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function OpenInvoiceDialog({
  open,
  onOpenChange,
  onSelectInvoice,
  currentInvoiceId,
  onDeleteInvoices,
  onDuplicateInvoice
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectInvoice: (invoice: InvoiceDocument) => void;
  currentInvoiceId: string | null;
  // Deleting goes through the editor, which replaces the open invoice when
  // it's one of them.
  onDeleteInvoices: (ids: string[]) => Promise<void>;
  onDuplicateInvoice: (invoice: InvoiceDocument) => void;
}) {
  const [query, setQuery] = useState("");
  // Sort and filters are remembered across opens and reloads, like the
  // invoices panel's (but separately, since this list has no grouping).
  const [view, setView] = usePersistentState<InvoiceLibraryView>(
    "editor-open-invoice-view",
    DEFAULT_LIBRARY_VIEW,
    parseLibraryView
  );
  const [invoices, setInvoices] = useState<InvoiceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [seeding, startSeedTransition] = useTransition();
  const [selection, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<
    { mode: "selection" } | { mode: "single"; invoice: InvoiceDocument } | null
  >(null);
  const [renameTarget, setRenameTarget] = useState<InvoiceDocument | null>(
    null
  );

  useEffect(() => {
    if (!open) return;

    setSelectedIds([]);
    setDeleteTarget(null);
    setQuery("");
    setLoading(true);

    // Live while open, so a rename, duplicate or delete (here, from the
    // invoices panel or in another tab) shows straight away.
    return watchInvoices(
      next => {
        setInvoices(next);
        setLoading(false);
      },
      error => {
        toast.error(error.message);
        setLoading(false);
      }
    );
  }, [open]);

  const visibleInvoices = filterInvoices(invoices, {
    query,
    view,
    now: new Date()
  });
  const isNarrowed =
    invoices.length > 0 && visibleInvoices.length < invoices.length;
  // Only what's on screen counts as selected: an invoice hidden by the search
  // or deleted elsewhere is never opened or deleted with the rest.
  const visibleIds = new Set(visibleInvoices.map(invoice => invoice.id));
  const selectedIds = selection.filter(id => visibleIds.has(id));
  const selectedInvoice =
    selectedIds.length === 1
      ? visibleInvoices.find(invoice => invoice.id === selectedIds[0])
      : undefined;

  function clearFilters() {
    setQuery("");
    setView({ ...view, dateRange: "all", client: null, currency: null });
  }

  useEffect(() => {
    if (deleteTarget?.mode === "selection" && selectedIds.length === 0) {
      setDeleteTarget(null);
    }
  }, [deleteTarget, selectedIds]);

  const pendingDeleteInvoices =
    deleteTarget === null
      ? []
      : deleteTarget.mode === "single"
        ? [deleteTarget.invoice]
        : visibleInvoices.filter(invoice => selectedIds.includes(invoice.id));

  const deletePrompt =
    pendingDeleteInvoices.length === 1
      ? `Delete “${truncate(pendingDeleteInvoices[0].name, 42)}”?`
      : `Delete ${pendingDeleteInvoices.length} invoices?`;

  // On touch the footer holds the selected invoice's actions, until a delete
  // asks to be confirmed.
  const touchActionsInvoice =
    pendingDeleteInvoices.length === 0 ? selectedInvoice : undefined;

  const footerLabel =
    pendingDeleteInvoices.length > 0 || selectedIds.length === 0
      ? `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`
      : `${selectedIds.length} selected`;

  function handleOpenInvoice(invoice: InvoiceDocument) {
    onSelectInvoice(invoice);
    onOpenChange(false);
  }

  function handleContentClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;

    // The Rename dialog is portaled out of this one, but its clicks still
    // bubble here through React.
    if (!event.currentTarget.contains(target)) return;

    // A row menu's items are portaled, but their clicks still bubble here
    // through React; they act on their own row.
    if (target.closest("[role='menu'], [role='menuitem']")) return;

    if (pendingDeleteInvoices.length > 0) {
      if (target.closest("[data-slot='delete-confirm']")) return;

      if (target.closest("thead")) return;

      const isSelectionGesture =
        target.closest("tr") &&
        (event.shiftKey || event.metaKey || event.ctrlKey);

      if (isSelectionGesture) return;

      setDeleteTarget(null);

      return;
    }

    if (selectedIds.length === 0) return;

    if (
      target.closest(
        "tr, button, a, input, textarea, select, label, [role='menuitem'], [data-slot='popover-content']"
      )
    ) {
      return;
    }

    setSelectedIds([]);
  }

  function handleContentKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && pendingDeleteInvoices.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      setDeleteTarget(null);
    }
  }

  function handleOpenSelected() {
    if (!selectedInvoice) return;

    handleOpenInvoice(selectedInvoice);
  }

  function handleSeedDummyInvoice() {
    startSeedTransition(async () => {
      try {
        await seedDummyInvoice();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to seed a dummy invoice."
        );
      }
    });
  }

  function handleRequestDelete(targets: InvoiceDocument[]) {
    if (targets.length === 0) return;

    const followsSelection = targets.every(invoice =>
      selectedIds.includes(invoice.id)
    );

    if (followsSelection) {
      setDeleteTarget({ mode: "selection" });

      return;
    }

    setSelectedIds([]);
    setDeleteTarget({ mode: "single", invoice: targets[0] });
  }

  function handleConfirmDelete() {
    const targets = pendingDeleteInvoices;

    if (targets.length === 0) return;

    const targetIds = new Set(targets.map(invoice => invoice.id));

    startTransition(async () => {
      try {
        await onDeleteInvoices([...targetIds]);
        setSelectedIds(prev => prev.filter(id => !targetIds.has(id)));
        setDeleteTarget(null);
        toast.success(
          targets.length === 1
            ? "Invoice deleted"
            : `Deleted ${targets.length} invoices`
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete invoices"
        );
      }
    });
  }

  async function handleRenameInvoice(
    invoice: InvoiceDocument,
    newName: string
  ) {
    try {
      await renameInvoice(invoice.id, newName);
      toast.success("Invoice renamed successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to rename invoice"
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[85vh] min-h-112 w-3xl flex-col"
        onClick={handleContentClick}
        onKeyDown={handleContentKeyDown}
      >
        <DialogHeader
          className="border-border border-b pb-4"
          icon={
            <DialogIcon tone="neutral">
              <IconFolderOpen />
            </DialogIcon>
          }
        >
          <DialogTitle>Open Invoice</DialogTitle>
          <DialogDescription>Invoices saved in this browser.</DialogDescription>
        </DialogHeader>
        {invoices.length > 0 && (
          <div className="border-border flex items-center gap-2 border-b px-4 py-2">
            <label className="bg-muted text-muted-foreground focus-within:border-ring flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded-md border border-transparent px-2">
              <IconSearch aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="sr-only">Search invoices</span>
              <input
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search by name, client, number or item"
                className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[0.8125rem] outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                  className="hover:text-foreground rounded-sm"
                >
                  <IconX aria-hidden="true" className="size-3.5" />
                </button>
              )}
            </label>
            <LibraryViewOptions
              view={view}
              onViewChange={setView}
              invoices={invoices}
              showGroup={false}
              align="end"
              size="sm"
            />
          </div>
        )}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="@container flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {loading ? (
              <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-sm">
                <IconLoader2 className="size-4 shrink-0 animate-spin" />
                Loading invoices
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <IconFolderOpen className="text-muted-foreground/70 size-8 shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-foreground text-base font-medium">
                    No saved invoices yet
                  </h3>
                  <p className="text-muted-foreground max-w-sm text-sm">
                    Save an invoice and it will appear here, ready to reopen
                    anytime.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <InvoiceListTable
                  invoices={visibleInvoices}
                  currentInvoiceId={currentInvoiceId}
                  selectedIds={selectedIds}
                  deletingIds={pendingDeleteInvoices.map(invoice => invoice.id)}
                  onSelectionChange={setSelectedIds}
                  onOpenInvoice={handleOpenInvoice}
                  onRenameInvoice={handleRenameInvoice}
                  onDuplicateInvoice={onDuplicateInvoice}
                  sort={view.sort}
                  direction={view.direction}
                  onSortChange={(sort, direction) =>
                    setView({ ...view, sort, direction })
                  }
                  onDeleteInvoices={handleRequestDelete}
                />
                {visibleInvoices.length === 0 && (
                  <p className="text-muted-foreground px-4 py-4 text-center text-sm">
                    No invoices match. Try another search or filter.
                  </p>
                )}
                <InvoiceListStripeFiller
                  rowCount={visibleInvoices.length}
                  twoLineWhenNarrow
                />
              </>
            )}
          </div>
          {pendingDeleteInvoices.length > 0 && (
            <div
              data-slot="delete-confirm"
              className="border-border bg-popover absolute inset-x-3 bottom-2 z-10 flex items-center justify-between gap-3 rounded-[6px] border px-3 py-1.5 shadow-sm"
            >
              <span className="text-foreground min-w-0 truncate text-sm">
                {deletePrompt}{" "}
                <span className="text-muted-foreground">
                  This cannot be undone.
                </span>
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(null)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleConfirmDelete}
                  disabled={pending}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter
          layout="bar"
          className="flex-row items-center justify-between sm:justify-between"
        >
          {isNarrowed && selectedIds.length === 0 ? (
            <span className="text-muted-foreground flex items-center gap-2 text-sm">
              <span className="tabular-nums">
                {visibleInvoices.length} of {invoices.length} invoices
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="hover:text-foreground focus-visible:ring-ring rounded-sm font-medium underline-offset-2 outline-none hover:underline focus-visible:ring-1"
              >
                Clear filters
              </button>
            </span>
          ) : (
            <span
              className={cn(
                "text-muted-foreground text-sm",
                touchActionsInvoice && "pointer-coarse:hidden"
              )}
            >
              {footerLabel}
            </span>
          )}
          {touchActionsInvoice && (
            <TouchRowActions
              actions={[
                {
                  label: "Delete",
                  icon: IconTrash,
                  onSelect: () => handleRequestDelete([touchActionsInvoice]),
                  destructive: true
                },
                {
                  label: "Duplicate",
                  icon: IconCopy,
                  onSelect: () => onDuplicateInvoice(touchActionsInvoice)
                },
                {
                  label: "Rename",
                  icon: IconPencil,
                  onSelect: () => setRenameTarget(touchActionsInvoice)
                }
              ]}
            />
          )}
          <div className="flex items-center gap-2">
            {import.meta.env.DEV && (
              <Button
                variant="secondary"
                onClick={handleSeedDummyInvoice}
                disabled={seeding}
                className={cn(touchActionsInvoice && "pointer-coarse:hidden")}
              >
                Add dummy
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="pointer-coarse:hidden"
            >
              Close
            </Button>
            <Button
              className="pointer-coarse:h-10"
              disabled={selectedIds.length !== 1}
              title={
                selectedIds.length !== 1
                  ? "Select a single invoice to open"
                  : undefined
              }
              onClick={handleOpenSelected}
            >
              Open
            </Button>
          </div>
        </DialogFooter>
        <RenameInvoiceDialog
          open={renameTarget !== null}
          onOpenChange={isOpen => {
            if (!isOpen) setRenameTarget(null);
          }}
          currentName={renameTarget?.name ?? ""}
          onRename={async newName => {
            if (renameTarget) await handleRenameInvoice(renameTarget, newName);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
