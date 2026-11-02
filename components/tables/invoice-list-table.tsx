import {
  IconCopy,
  IconFileText,
  IconFolderOpen,
  IconPencil,
  IconTrash
} from "@tabler/icons-react";
import type { KeyboardEvent, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { RowActionsCell } from "~/components/tables/row-actions-cell";
import { RowMenuItems } from "~/components/tables/row-menu-items";
import { SortHeaderCell } from "~/components/tables/sort-header-cell";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger
} from "~/components/ui/context-menu";
import { formatCurrency } from "~/consts/currencies";
import { cn } from "~/lib/utils";
import type {
  InvoiceDocument,
  InvoiceLibrarySort,
  SortDirection
} from "~/types";
import { formatFullDate, formatListDate } from "~/utils/format-list-date";
import {
  getClientName,
  getInvoiceTotal,
  LIBRARY_SORTS,
  sortInvoices
} from "~/utils/invoice-library";

// The columns that sort, mapped to the library's sort orders.
const COLUMN_SORTS = {
  name: "name",
  client: "client",
  amount: "amount",
  updatedAt: "updated"
} as const satisfies Record<string, InvoiceLibrarySort>;

type SortKey = keyof typeof COLUMN_SORTS;

// Continues the rows' stripes down the rest of the list. The stripe height
// follows the rows' (see the row's className): 24px, 44px on touch, and 44px
// where narrow invoice rows go to two lines.
const STRIPE_COLOR = "color-mix(in oklab, var(--muted) 50%, transparent)";

export function InvoiceListStripeFiller({
  rowCount,
  twoLineWhenNarrow = false
}: {
  rowCount: number;
  twoLineWhenNarrow?: boolean;
}) {
  const single = "var(--row-height)";
  const double = "calc(var(--row-height) * 2)";
  const stops =
    rowCount % 2 === 1
      ? `${STRIPE_COLOR} 0, ${STRIPE_COLOR} ${single}, transparent ${single}, transparent ${double}`
      : `transparent 0, transparent ${single}, ${STRIPE_COLOR} ${single}, ${STRIPE_COLOR} ${double}`;
  const backgroundImage = `repeating-linear-gradient(to bottom, ${stops})`;

  return (
    <div
      aria-hidden
      className={cn(
        "min-h-14 flex-1 [--row-height:24px] pointer-coarse:[--row-height:44px]",
        twoLineWhenNarrow && "@max-xl:[--row-height:44px]"
      )}
      style={{ backgroundImage }}
    />
  );
}

export function InvoiceListTable({
  invoices,
  currentInvoiceId,
  selectedIds,
  deletingIds,
  onSelectionChange,
  onOpenInvoice,
  onRenameInvoice,
  onDuplicateInvoice,
  onDeleteInvoices,
  sort,
  direction,
  onSortChange
}: {
  invoices: InvoiceDocument[];
  currentInvoiceId: string | null;
  selectedIds: string[];
  deletingIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onOpenInvoice: (invoice: InvoiceDocument) => void;
  onRenameInvoice: (invoice: InvoiceDocument, newName: string) => void;
  onDuplicateInvoice: (invoice: InvoiceDocument) => void;
  onDeleteInvoices: (invoices: InvoiceDocument[]) => void;
  // The order is the caller's, so the column headers and any other sort
  // control (the dialog's View options) stay in step.
  sort: InvoiceLibrarySort;
  direction: SortDirection;
  onSortChange: (sort: InvoiceLibrarySort, direction: SortDirection) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [contextMenuRowId, setContextMenuRowId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const editingIdRef = useRef<string | null>(null);
  const anchorIdRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tbodyRef = useRef<HTMLTableSectionElement>(null);

  useEffect(() => {
    if (!editingId) return;

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => cancelAnimationFrame(frame);
  }, [editingId]);

  function toggleSort(key: SortKey) {
    const columnSort = COLUMN_SORTS[key];

    if (columnSort === sort) {
      onSortChange(sort, direction === "asc" ? "desc" : "asc");

      return;
    }

    // A newly picked column starts the natural way round: names A to Z, the
    // biggest amounts and the latest edits first.
    onSortChange(
      columnSort,
      LIBRARY_SORTS.find(option => option.value === columnSort)
        ?.defaultDirection ?? "asc"
    );
  }

  function startRename(invoice: InvoiceDocument) {
    editingIdRef.current = invoice.id;
    anchorIdRef.current = invoice.id;
    setEditingId(invoice.id);
    setEditingValue(invoice.name);
    onSelectionChange([invoice.id]);
  }

  function finishRename(invoice: InvoiceDocument, shouldSave: boolean) {
    if (editingIdRef.current !== invoice.id) return;

    editingIdRef.current = null;
    setEditingId(null);

    const trimmed = editingValue.trim();

    if (shouldSave && trimmed && trimmed !== invoice.name) {
      onRenameInvoice(invoice, trimmed);
    }
  }

  function handleEditKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    invoice: InvoiceDocument
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      finishRename(invoice, true);

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      finishRename(invoice, false);
    }
  }

  const sortedInvoices = sortInvoices(invoices, sort, direction);
  // The row Tab lands on: the last one used, or the first when that row has
  // been deleted or filtered out, so the table never drops out of Tab order.
  const tabbableId = sortedInvoices.some(invoice => invoice.id === activeId)
    ? activeId
    : sortedInvoices[0]?.id;

  const selectedSet = new Set(selectedIds);
  const deletingSet = new Set(deletingIds);
  const selectedInvoices = sortedInvoices.filter(invoice =>
    selectedSet.has(invoice.id)
  );

  function focusRow(targetIndex: number) {
    const row = tbodyRef.current?.querySelector<HTMLTableRowElement>(
      `tr[data-index="${targetIndex}"]`
    );
    row?.focus();
  }

  function selectRange(targetId: string) {
    const anchorId = anchorIdRef.current;
    const anchorIndex = sortedInvoices.findIndex(
      invoice => invoice.id === anchorId
    );
    const targetIndex = sortedInvoices.findIndex(
      invoice => invoice.id === targetId
    );

    if (anchorIndex === -1) {
      onSelectionChange([targetId]);

      return;
    }

    const start = Math.min(anchorIndex, targetIndex);
    const end = Math.max(anchorIndex, targetIndex);

    onSelectionChange(
      sortedInvoices.slice(start, end + 1).map(invoice => invoice.id)
    );
  }

  function handleRowClick(
    event: MouseEvent<HTMLTableRowElement>,
    invoice: InvoiceDocument
  ) {
    if (editingId) return;

    if (event.shiftKey && anchorIdRef.current) {
      selectRange(invoice.id);

      return;
    }

    if (event.metaKey || event.ctrlKey) {
      anchorIdRef.current = invoice.id;

      onSelectionChange(
        selectedSet.has(invoice.id)
          ? selectedIds.filter(selectedId => selectedId !== invoice.id)
          : [...selectedIds, invoice.id]
      );

      return;
    }

    anchorIdRef.current = invoice.id;

    const isOnlySelection =
      selectedSet.has(invoice.id) && selectedIds.length === 1;

    onSelectionChange(isOnlySelection ? [] : [invoice.id]);
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLTableSectionElement>) {
    if (editingId) return;
    // The row's ⋯ menu handles its own keys.
    if ((event.target as HTMLElement).closest("[data-slot='row-actions']"))
      return;

    const rowElement = (event.target as HTMLElement).closest<HTMLElement>(
      "tr[data-index]"
    );

    if (!rowElement) return;

    const index = Number(rowElement.dataset.index);

    if (!Number.isInteger(index) || index < 0 || index >= sortedInvoices.length)
      return;

    const invoice = sortedInvoices[index];

    const handled = () => {
      event.preventDefault();
      event.stopPropagation();
    };

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      handled();

      const lastIndex = sortedInvoices.length - 1;
      const nextIndex =
        event.key === "ArrowDown"
          ? Math.min(index + 1, lastIndex)
          : Math.max(index - 1, 0);

      if (nextIndex === index) return;

      const nextInvoice = sortedInvoices[nextIndex];
      setActiveId(nextInvoice.id);
      focusRow(nextIndex);

      if (event.shiftKey) {
        selectRange(nextInvoice.id);

        return;
      }

      anchorIdRef.current = nextInvoice.id;
      onSelectionChange([nextInvoice.id]);

      return;
    }

    if (event.key === "Enter") {
      handled();
      onOpenInvoice(invoice);

      return;
    }

    if (event.key === " ") {
      handled();
      anchorIdRef.current = invoice.id;

      onSelectionChange(
        selectedSet.has(invoice.id)
          ? selectedIds.filter(selectedId => selectedId !== invoice.id)
          : [...selectedIds, invoice.id]
      );

      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
      handled();
      onSelectionChange(
        sortedInvoices.map(currentInvoice => currentInvoice.id)
      );

      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      handled();
      onDeleteInvoices(selectedIds.length > 0 ? selectedInvoices : [invoice]);

      return;
    }

    if (event.key === "F2") {
      handled();
      startRename(invoice);
    }
  }

  return (
    <table
      role="grid"
      aria-multiselectable
      className="w-full table-fixed text-[0.8125rem]/5"
    >
      <colgroup>
        <col />
        <col className="w-40 @max-xl:hidden" />
        <col className="w-28 @max-xl:hidden" />
        <col className="w-24 @max-xl:hidden" />
        <col className="w-7 pointer-coarse:hidden" />
      </colgroup>
      <thead>
        <tr className="text-muted-foreground text-left text-xs">
          <SortHeaderCell
            label="Name"
            active={sort === COLUMN_SORTS.name}
            direction={direction}
            onClick={() => toggleSort("name")}
            className="pl-4"
          />
          <SortHeaderCell
            label="Client"
            active={sort === COLUMN_SORTS.client}
            direction={direction}
            onClick={() => toggleSort("client")}
            className="@max-xl:hidden"
          />
          <SortHeaderCell
            label="Amount"
            align="end"
            active={sort === COLUMN_SORTS.amount}
            direction={direction}
            onClick={() => toggleSort("amount")}
            className="@max-xl:hidden"
          />
          <SortHeaderCell
            label="Modified"
            active={sort === COLUMN_SORTS.updatedAt}
            direction={direction}
            onClick={() => toggleSort("updatedAt")}
            className="@max-xl:hidden"
          />
          <th className="bg-popover sticky top-0 shadow-[inset_0_-1px_0_0_var(--border)] pointer-coarse:hidden">
            <span className="sr-only">Actions</span>
          </th>
        </tr>
      </thead>
      <tbody ref={tbodyRef} onKeyDownCapture={handleListKeyDown}>
        {sortedInvoices.map((invoice, index) => {
          const isCurrent = currentInvoiceId === invoice.id;
          const isSelected = selectedSet.has(invoice.id);
          const isDeleting = deletingSet.has(invoice.id);
          const isEditing = editingId === invoice.id;
          const isStriped = index % 2 === 1;
          const isContextFocused = contextMenuRowId === invoice.id;
          const showBulkDelete = isSelected && selectedIds.length > 1;
          const isTabbable = invoice.id === tabbableId;
          const rowActions = showBulkDelete
            ? [
                {
                  label: `Delete ${selectedIds.length} invoices`,
                  icon: IconTrash,
                  onSelect: () => onDeleteInvoices(selectedInvoices),
                  destructive: true
                }
              ]
            : [
                {
                  label: "Open",
                  icon: IconFolderOpen,
                  onSelect: () => onOpenInvoice(invoice)
                },
                {
                  label: "Rename",
                  icon: IconPencil,
                  onSelect: () => startRename(invoice)
                },
                {
                  label: "Duplicate",
                  icon: IconCopy,
                  onSelect: () => onDuplicateInvoice(invoice)
                },
                {
                  label: "Delete",
                  icon: IconTrash,
                  onSelect: () => onDeleteInvoices([invoice]),
                  destructive: true,
                  separated: true
                }
              ];
          const secondaryTextClass = isDeleting
            ? "text-destructive/70"
            : "text-muted-foreground";

          return (
            <ContextMenu
              key={invoice.id}
              onOpenChange={isOpen =>
                setContextMenuRowId(prev =>
                  isOpen ? invoice.id : prev === invoice.id ? null : prev
                )
              }
            >
              <ContextMenuTrigger
                render={
                  <tr
                    data-index={index}
                    role="row"
                    aria-selected={isSelected}
                    tabIndex={isTabbable ? 0 : -1}
                    onClick={event => handleRowClick(event, invoice)}
                    onDoubleClick={() => {
                      if (isEditing) return;

                      onOpenInvoice(invoice);
                    }}
                    onFocus={() => setActiveId(invoice.id)}
                    className={cn(
                      "group/row h-6 cursor-pointer scroll-mt-6 outline-none select-none @max-xl:h-11 pointer-coarse:h-11",
                      !isSelected && !isDeleting && isStriped && "bg-muted/50",
                      !isSelected && !isDeleting && "hover:bg-accent",
                      isSelected &&
                        !isDeleting &&
                        "bg-brand-100 dark:bg-brand-500/20",
                      isDeleting && "bg-destructive/10 text-destructive",
                      isContextFocused &&
                        !isDeleting &&
                        "outline-brand-500 outline-2 -outline-offset-2",
                      isDeleting &&
                        "outline-destructive/50 outline-2 -outline-offset-2",
                      isEditing && !isSelected && "bg-accent",
                      "focus-visible:outline-brand-500 focus-visible:outline-2 focus-visible:-outline-offset-2"
                    )}
                  />
                }
              >
                <td
                  role="gridcell"
                  className="overflow-hidden py-0.5 pr-4 pl-4"
                  onClick={
                    isEditing ? event => event.stopPropagation() : undefined
                  }
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <IconFileText
                      aria-hidden="true"
                      className={cn(
                        "size-3.5 shrink-0",
                        isDeleting
                          ? "text-destructive"
                          : isSelected
                            ? "text-brand-600 dark:text-brand-400"
                            : "text-muted-foreground"
                      )}
                    />
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        name="invoiceName"
                        aria-label="Invoice name"
                        maxLength={100}
                        value={editingValue}
                        onChange={event => setEditingValue(event.target.value)}
                        onFocus={event => event.currentTarget.select()}
                        onKeyDown={event => handleEditKeyDown(event, invoice)}
                        onBlur={() => finishRename(invoice, true)}
                        className="bg-background text-foreground outline-brand-500 rounded-surface -my-0.5 -ml-1 h-5 w-full min-w-0 px-1 text-[0.8125rem] font-medium outline-2 -outline-offset-1"
                      />
                    ) : (
                      <>
                        <span className="min-w-0 truncate font-medium">
                          {invoice.name}
                        </span>
                        {isCurrent && (
                          <span
                            className={cn(
                              "shrink-0 text-xs",
                              isDeleting
                                ? "text-destructive/70"
                                : "text-muted-foreground"
                            )}
                          >
                            Current
                          </span>
                        )}
                        <span
                          title={formatFullDate(invoice.updatedAt)}
                          className={cn(
                            "ml-auto shrink-0 text-xs tabular-nums @xl:hidden",
                            secondaryTextClass
                          )}
                        >
                          {formatListDate(invoice.updatedAt)}
                        </span>
                      </>
                    )}
                  </div>
                  <div
                    className={cn(
                      "truncate pl-5.5 text-xs/5 @xl:hidden",
                      secondaryTextClass
                    )}
                  >
                    {getClientName(invoice)} ·{" "}
                    {formatCurrency(
                      getInvoiceTotal(invoice),
                      invoice.invoiceData.currency
                    )}
                  </div>
                </td>
                <td
                  role="gridcell"
                  className={cn(
                    "truncate py-0.5 pr-4 @max-xl:hidden",
                    secondaryTextClass
                  )}
                >
                  {getClientName(invoice)}
                </td>
                <td
                  role="gridcell"
                  className={cn(
                    "py-0.5 pr-4 text-right whitespace-nowrap tabular-nums @max-xl:hidden",
                    secondaryTextClass
                  )}
                >
                  {formatCurrency(
                    getInvoiceTotal(invoice),
                    invoice.invoiceData.currency
                  )}
                </td>
                <td
                  role="gridcell"
                  title={formatFullDate(invoice.updatedAt)}
                  className={cn(
                    "py-0.5 pr-4 whitespace-nowrap tabular-nums @max-xl:hidden",
                    secondaryTextClass
                  )}
                >
                  {formatListDate(invoice.updatedAt)}
                </td>
                <RowActionsCell
                  label={`Actions for ${invoice.name}`}
                  selected={isSelected && !isDeleting}
                >
                  <RowMenuItems menu="dropdown" actions={rowActions} />
                </RowActionsCell>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <RowMenuItems menu="context" actions={rowActions} />
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </tbody>
    </table>
  );
}
