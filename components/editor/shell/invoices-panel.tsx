import {
  IconCopy,
  IconCopyPlus,
  IconDots,
  IconFolderOpen,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX
} from "@tabler/icons-react";
import { startCase } from "lodash-es";
import type { MouseEvent, ReactNode, Ref } from "react";
import { useEffect, useRef, useState } from "react";
import { SegmentedControl } from "~/components/editor/shell/inspector/inspector-controls";
import { LibraryViewOptions } from "~/components/editor/shell/library-view-options";
import { Button } from "~/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger
} from "~/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "~/components/ui/dropdown-menu";
import { formatCurrency, getMoneyFormat } from "~/consts/currencies";
import { DOCUMENT_TYPE_NAMES } from "~/consts/document-types";
import { useEditorUi } from "~/context/editor-ui-context";
import { useFileActions } from "~/context/file-actions-context";
import { useInvoiceDocument } from "~/context/invoice-document-context";
import { watchInvoices, watchTemplates } from "~/db";
import { usePersistentState } from "~/hooks/use-persistent-state";
import { cn } from "~/lib/utils";
import { DOCUMENT_TYPES } from "~/schema/invoice";
import type {
  InvoiceDocument,
  InvoiceLibraryView,
  InvoiceTemplate,
  LibrarySelection
} from "~/types";
import {
  DEFAULT_LIBRARY_VIEW,
  filterInvoices,
  formatLibraryDate,
  getInvoiceDate,
  getInvoiceTotal,
  groupInvoices,
  parseLibraryView,
  sortInvoices
} from "~/utils/invoice-library";
import { selectRows } from "~/utils/library-selection";
import { hasOpenOverlay } from "~/utils/open-overlay";
import { readInvoiceDate } from "~/utils/read-invoice-date";

// Keeps a list in step with a Dexie table while the panel is open.
function useWatchedList<TRow>(
  watch: (
    onChange: (rows: TRow[]) => void,
    onError: (error: Error) => void
  ) => () => void
) {
  const [rows, setRows] = useState<TRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () =>
      watch(
        next => {
          setRows(next);
          setError(null);
        },
        failure => setError(failure.message)
      ),
    [watch]
  );

  return { rows, error };
}

// The saved invoices and templates in this browser, one click away, like the
// pages list in Framer: searchable, sortable, filterable and grouped, with a
// menu on each row for the rest. Opening one saves the open invoice first,
// as the project menu does. ⌘O, Open Invoice and Open Template open it on a
// tab with focus in the search. The tab, sort, grouping and filters are
// remembered across reloads; the search is not.
export function InvoicesPanel() {
  const {
    libraryTab: tab,
    setLibraryTab,
    librarySearchRequest
  } = useEditorUi();
  const [view, setView] = usePersistentState<InvoiceLibraryView>(
    "editor-library-view",
    DEFAULT_LIBRARY_VIEW,
    parseLibraryView
  );
  const [query, setQuery] = useState("");
  const invoices = useWatchedList(watchInvoices);
  const templates = useWatchedList(watchTemplates);
  const { newInvoice } = useFileActions();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (librarySearchRequest > 0) searchRef.current?.focus();
  }, [librarySearchRequest]);

  return (
    <>
      <div className="flex shrink-0 flex-col gap-2 px-3 pt-2.5 pb-2">
        <SegmentedControl
          label="Library"
          value={tab}
          options={[
            { value: "invoices", label: "Invoices" },
            { value: "templates", label: "Templates" }
          ]}
          onChange={setLibraryTab}
        />
        <SearchField
          ref={searchRef}
          label={tab === "invoices" ? "Search invoices" : "Search templates"}
          value={query}
          onChange={setQuery}
        >
          {tab === "invoices" && (
            <LibraryViewOptions
              view={view}
              onViewChange={setView}
              invoices={invoices.rows ?? []}
            />
          )}
        </SearchField>
      </div>
      {tab === "invoices" ? (
        <InvoiceList
          invoices={invoices.rows}
          error={invoices.error}
          query={query}
          view={view}
          onClearFilters={() => {
            setQuery("");
            setView({
              ...view,
              dateRange: "all",
              client: null,
              currency: null,
              documentType: null
            });
          }}
        />
      ) : (
        <TemplateList
          templates={templates.rows}
          error={templates.error}
          query={query}
        />
      )}
      <div className="border-border flex shrink-0 flex-col border-t p-3">
        <Button variant="secondary" onClick={newInvoice} className="w-full">
          <IconPlus aria-hidden="true" />
          New invoice
        </Button>
      </div>
    </>
  );
}

// The rows picked out with ⌘/Ctrl-click and Shift-click, for deleting
// together. Only listed rows count: one the search hides, or one deleted
// elsewhere, is never deleted with the rest. Escape clears it, unless a menu
// or dialog has Escape for itself.
function useRowSelection(order: string[]) {
  const [selection, setSelection] = useState<LibrarySelection>({
    ids: [],
    anchor: null
  });
  const selectedIds = selection.ids.filter(id => order.includes(id));
  const hasSelection = selectedIds.length > 0;

  function clear() {
    setSelection(current => ({ ...current, ids: [] }));
  }

  useEffect(() => {
    if (!hasSelection) return;

    function listener(event: KeyboardEvent) {
      if (event.key === "Escape" && !hasOpenOverlay()) clear();
    }

    window.addEventListener("keydown", listener);

    return () => window.removeEventListener("keydown", listener);
  }, [hasSelection]);

  // A modified click changes the selection; a plain one opens the row.
  function handleRowClick(event: MouseEvent, id: string, open: () => void) {
    const gesture = event.shiftKey
      ? "range"
      : event.metaKey || event.ctrlKey
        ? "toggle"
        : null;

    if (gesture) {
      setSelection(
        selectRows({
          selection: { ids: selectedIds, anchor: selection.anchor },
          order,
          id,
          gesture
        })
      );

      return;
    }

    setSelection({ ids: [], anchor: id });
    open();
  }

  return {
    selectedIds,
    clear,
    handleRowClick,
    // A selected row's menu acts on the whole selection when it holds more.
    isBulk: (id: string) => selectedIds.length > 1 && selectedIds.includes(id)
  };
}

function SearchField({
  ref,
  label,
  value,
  onChange,
  children
}: {
  ref: Ref<HTMLInputElement>;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <label className="bg-muted text-muted-foreground focus-within:border-ring flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md border border-transparent px-2">
        <IconSearch aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="sr-only">{label}</span>
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={label}
          className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-[13px] outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange("")}
            className="hover:text-foreground -mr-0.5 rounded-sm"
          >
            <IconX aria-hidden="true" className="size-3.5" />
          </button>
        )}
      </label>
      {children}
    </div>
  );
}

function InvoiceList({
  invoices,
  error,
  query,
  view,
  onClearFilters
}: {
  invoices: InvoiceDocument[] | null;
  error: string | null;
  query: string;
  view: InvoiceLibraryView;
  onClearFilters: () => void;
}) {
  const { libraryDocumentId } = useInvoiceDocument();
  const actions = useFileActions();
  const matches = filterInvoices(invoices ?? [], {
    query,
    view,
    now: new Date()
  });
  const groups = groupInvoices(
    sortInvoices(matches, view.sort, view.direction),
    view.group
  );
  const listed = groups.flatMap(group => group.documents);
  const selection = useRowSelection(listed.map(document => document.id));
  const selectedDocuments = listed.filter(document =>
    selection.selectedIds.includes(document.id)
  );

  if (error)
    return (
      <ListScroller>
        <ListMessage>{error}</ListMessage>
      </ListScroller>
    );
  if (!invoices) return <ListScroller />;

  if (invoices.length === 0) {
    return (
      <ListScroller>
        <ListMessage>
          No invoices yet. Every invoice saves itself as you edit, and shows
          here once you start on it.
        </ListMessage>
      </ListScroller>
    );
  }

  return (
    <>
      {selectedDocuments.length > 0 ? (
        <SelectionBar
          count={selectedDocuments.length}
          onClear={selection.clear}
          onDelete={() => actions.deleteInvoices(selectedDocuments)}
        />
      ) : (
        matches.length < invoices.length && (
          <div className="text-muted-foreground flex shrink-0 items-center justify-between gap-2 px-4 pb-1.5 text-xs">
            <span className="tabular-nums">
              {matches.length} of {invoices.length} invoices
            </span>
            <button
              type="button"
              onClick={onClearFilters}
              className="hover:text-foreground focus-visible:ring-ring rounded-sm font-medium outline-none focus-visible:ring-1"
            >
              Clear filters
            </button>
          </div>
        )
      )}
      <ListScroller>
        {matches.length === 0 && (
          <ListMessage>
            Nothing matches. Try another search or filter.
          </ListMessage>
        )}
        {groups.map(group => (
          <section key={group.key} className="flex flex-col gap-px">
            {group.label && (
              <h3 className="text-muted-foreground flex items-center justify-between gap-2 px-2 pt-1 pb-0.5 text-[11px] font-medium">
                <span className="truncate">{group.label}</span>
                <span className="tabular-nums">{group.documents.length}</span>
              </h3>
            )}
            {group.documents.map(document => (
              <LibraryItem
                key={document.id}
                current={document.id === libraryDocumentId}
                selected={selection.selectedIds.includes(document.id)}
                title={document.name || "Untitled invoice"}
                aside={formatCurrency(
                  getInvoiceTotal(document),
                  getMoneyFormat(document.invoiceData)
                )}
                meta={invoiceMeta(document, view)}
                onClick={event =>
                  selection.handleRowClick(event, document.id, () =>
                    actions.openInvoice(document.id)
                  )
                }
                menu={
                  selection.isBulk(document.id) ? (
                    <DeleteItem
                      label={`Delete ${selectedDocuments.length} invoices…`}
                      onClick={() => actions.deleteInvoices(selectedDocuments)}
                    />
                  ) : (
                    <>
                      <DropdownMenuItem
                        onClick={() => actions.openInvoice(document.id)}
                      >
                        <IconFolderOpen aria-hidden="true" />
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => actions.renameInvoice(document)}
                      >
                        <IconPencil aria-hidden="true" />
                        Rename…
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => actions.duplicateInvoice(document)}
                      >
                        <IconCopy aria-hidden="true" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <IconCopyPlus aria-hidden="true" />
                          Duplicate As
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-44">
                          {DOCUMENT_TYPES.filter(
                            otherType =>
                              otherType !== document.invoiceData.documentType
                          ).map(otherType => (
                            <DropdownMenuItem
                              key={otherType}
                              onClick={() =>
                                actions.duplicateInvoice(document, otherType)
                              }
                            >
                              {startCase(DOCUMENT_TYPE_NAMES[otherType])}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DeleteItem
                        label="Delete…"
                        onClick={() => actions.deleteInvoices([document])}
                      />
                    </>
                  )
                }
              />
            ))}
          </section>
        ))}
      </ListScroller>
    </>
  );
}

// The second line of a row: its type when it isn't an invoice, its number,
// then the date the sort is about (when it's due for a due-date sort, when it
// was edited for the default sort).
function invoiceMeta(document: InvoiceDocument, view: InvoiceLibraryView) {
  const { documentType, number, dueDate } = document.invoiceData;
  const due = formatLibraryDate(readInvoiceDate(dueDate));
  const edited = formatLibraryDate(document.updatedAt);
  const date =
    view.sort === "dueDate" && due
      ? `Due ${due}`
      : view.sort === "updated"
        ? edited && `Edited ${edited}`
        : formatLibraryDate(getInvoiceDate(document));

  return [
    documentType !== "invoice" && DOCUMENT_TYPE_NAMES[documentType],
    number && `No. ${number}`,
    date
  ]
    .filter(Boolean)
    .join(" · ");
}

function templateMeta(template: InvoiceTemplate) {
  const edited = formatLibraryDate(template.updatedAt);

  return template.description || (edited ? `Edited ${edited}` : "");
}

function TemplateList({
  templates,
  error,
  query
}: {
  templates: InvoiceTemplate[] | null;
  error: string | null;
  query: string;
}) {
  const actions = useFileActions();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (templates ?? [])
    .filter(template =>
      words.every(word =>
        `${template.name} ${template.description ?? ""}`
          .toLowerCase()
          .includes(word)
      )
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  const selection = useRowSelection(matches.map(template => template.id));
  const selectedTemplates = matches.filter(template =>
    selection.selectedIds.includes(template.id)
  );

  if (error)
    return (
      <ListScroller>
        <ListMessage>{error}</ListMessage>
      </ListScroller>
    );
  if (!templates) return <ListScroller />;

  if (templates.length === 0) {
    return (
      <ListScroller>
        <ListMessage>
          No templates yet. Save this invoice as one to start the next from it.
        </ListMessage>
        <button
          type="button"
          onClick={actions.saveAsTemplate}
          className="text-foreground hover:bg-muted focus-visible:ring-ring mx-2 w-fit rounded-md px-2 py-1 text-xs font-medium outline-none focus-visible:ring-1"
        >
          Save as template
        </button>
      </ListScroller>
    );
  }

  return (
    <>
      {selectedTemplates.length > 0 && (
        <SelectionBar
          count={selectedTemplates.length}
          onClear={selection.clear}
          onDelete={() => actions.deleteTemplates(selectedTemplates)}
        />
      )}
      <ListScroller>
        <section className="flex flex-col gap-px">
          <h3 className="text-muted-foreground px-2 pt-1 pb-0.5 text-[11px] font-medium">
            Start a new invoice from
          </h3>
          {matches.length === 0 && (
            <ListMessage>No templates match “{query.trim()}”.</ListMessage>
          )}
          {matches.map(template => (
            <LibraryItem
              key={template.id}
              current={false}
              selected={selection.selectedIds.includes(template.id)}
              title={template.name || "Untitled template"}
              meta={templateMeta(template)}
              onClick={event =>
                selection.handleRowClick(event, template.id, () =>
                  actions.applyTemplate(template)
                )
              }
              menu={
                selection.isBulk(template.id) ? (
                  <DeleteItem
                    label={`Delete ${selectedTemplates.length} templates…`}
                    onClick={() => actions.deleteTemplates(selectedTemplates)}
                  />
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => actions.applyTemplate(template)}
                    >
                      <IconFolderOpen aria-hidden="true" />
                      Use template
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => actions.renameTemplate(template)}
                    >
                      <IconPencil aria-hidden="true" />
                      Rename…
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DeleteItem
                      label="Delete…"
                      onClick={() => actions.deleteTemplates([template])}
                    />
                  </>
                )
              }
            />
          ))}
        </section>
      </ListScroller>
    </>
  );
}

// Above a list with rows selected: how many, and what can be done with them.
function SelectionBar({
  count,
  onClear,
  onDelete
}: {
  count: number;
  onClear: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="text-muted-foreground flex shrink-0 items-center justify-between gap-2 px-4 pb-1.5 text-xs">
      <span className="tabular-nums">{count} selected</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClear}
          className="hover:text-foreground focus-visible:ring-ring rounded-sm font-medium outline-none focus-visible:ring-1"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-destructive focus-visible:ring-ring rounded-sm font-medium outline-none hover:underline focus-visible:ring-1"
        >
          Delete…
        </button>
      </div>
    </div>
  );
}

function DeleteItem({
  label,
  onClick
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <DropdownMenuItem variant="destructive" onClick={onClick}>
      <IconTrash aria-hidden="true" />
      {label}
    </DropdownMenuItem>
  );
}

function ListScroller({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-1.5 pb-2">
      {children}
    </div>
  );
}

// A row, under a title that is never blank: clicking the row opens the item
// (or, with ⌘/Ctrl or Shift held, selects it), and its right-click menu and
// the ⋯ button on it (shown on hover, on focus and while its menu is open;
// always on touch, where it is the way to act on a row) hold the rest. Both
// menus hold the same items: the menu primitives are shared, so the dropdown
// items render in the context menu too.
function LibraryItem({
  current,
  selected,
  title,
  aside,
  meta,
  onClick,
  menu
}: {
  current: boolean;
  selected: boolean;
  title: string;
  aside?: string;
  meta: string;
  onClick: (event: MouseEvent) => void;
  menu: ReactNode;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <div
            data-selected={selected ? "" : undefined}
            className={cn(
              "group/item relative flex rounded-md",
              selected
                ? "bg-brand-100 dark:bg-brand-500/20"
                : current
                  ? "bg-accent"
                  : "hover:bg-muted has-aria-expanded:bg-muted data-popup-open:bg-muted"
            )}
          />
        }
      >
        <button
          type="button"
          aria-current={current ? "true" : undefined}
          onClick={onClick}
          className="focus-visible:ring-ring grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-2 rounded-md py-1.5 pr-9 pl-2 text-left outline-none select-none focus-visible:ring-1 pointer-coarse:py-2.5 pointer-coarse:pr-11"
        >
          <span className="text-foreground truncate text-[13px] font-medium">
            {title}
            {selected && <span className="sr-only">, selected</span>}
          </span>
          {aside && (
            <span className="text-muted-foreground text-xs leading-5 tabular-nums">
              {aside}
            </span>
          )}
          {meta && (
            <span className="text-muted-foreground col-span-2 truncate text-xs">
              {meta}
            </span>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${title}`}
            className="text-muted-foreground hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground focus-visible:ring-ring absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md opacity-0 outline-none group-focus-within/item:opacity-100 group-hover/item:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 aria-expanded:opacity-100 pointer-coarse:size-9 pointer-coarse:opacity-100"
          >
            <IconDots aria-hidden="true" className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {menu}
          </DropdownMenuContent>
        </DropdownMenu>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-44">{menu}</ContextMenuContent>
    </ContextMenu>
  );
}

function ListMessage({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground px-2 py-3 text-xs text-pretty">
      {children}
    </p>
  );
}
