import {
  IconChevronDown,
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
import { DocumentTypePill } from "~/components/editor/shell/document-type-pill";
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
import {
  DOCUMENT_TYPE_NAMES,
  OTHER_DOCUMENT_TYPES
} from "~/consts/document-types";
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

// The saved documents and templates in this browser, one click away, like the
// pages list in Framer: searchable, sortable, filterable and grouped, with a
// menu on each row for the rest. Each row that isn't an invoice carries its
// type's pill (issue #215). Opening one saves the open document first,
// as the project menu does. ⌘O, Find Document and Find Template open it on a
// tab with focus in the search, except on a phone, where that would raise the
// keyboard over the sheet before anyone asked to search. The tab, sort,
// grouping and filters are remembered across reloads; the search is not.
// On a phone it's the document list screen, with `headerEnd` beside the tabs
// (the list's menu). New invoice, the one most reach for, has the other
// document types in the menu beside it.
export function DocumentsPanel({ headerEnd }: { headerEnd?: ReactNode }) {
  const {
    libraryTab: tab,
    setLibraryTab,
    librarySearchRequest,
    isNarrow
  } = useEditorUi();
  const [view, setView] = usePersistentState<InvoiceLibraryView>(
    "editor-library-view",
    DEFAULT_LIBRARY_VIEW,
    parseLibraryView
  );
  const [query, setQuery] = useState("");
  const documents = useWatchedList(watchInvoices);
  const templates = useWatchedList(watchTemplates);
  const { newInvoice, newDocument, pending } = useFileActions();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (librarySearchRequest > 0 && !isNarrow) searchRef.current?.focus();
  }, [librarySearchRequest, isNarrow]);

  return (
    <>
      <div className="flex shrink-0 flex-col gap-2 px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-2">
          <SegmentedControl
            label="Library"
            value={tab}
            options={[
              { value: "documents", label: "Documents" },
              { value: "templates", label: "Templates" }
            ]}
            onChange={setLibraryTab}
          />
          {headerEnd}
        </div>
        <SearchField
          ref={searchRef}
          label={tab === "documents" ? "Search documents" : "Search templates"}
          value={query}
          onChange={setQuery}
        >
          {tab === "documents" && (
            <LibraryViewOptions
              view={view}
              onViewChange={setView}
              invoices={documents.rows ?? []}
            />
          )}
        </SearchField>
      </div>
      {tab === "documents" ? (
        <DocumentList
          documents={documents.rows}
          error={documents.error}
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
      <div className="border-border flex shrink-0 gap-2 border-t p-3 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          variant="secondary"
          onClick={newInvoice}
          className="min-w-0 flex-1 max-md:h-11 max-md:text-base pointer-coarse:h-11"
        >
          <IconPlus aria-hidden="true" />
          New invoice
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="secondary"
                aria-label="New document"
                className="size-8 max-md:size-11 pointer-coarse:size-11"
              />
            }
          >
            <IconChevronDown aria-hidden="true" className="max-md:size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="w-44 max-md:w-48"
          >
            {OTHER_DOCUMENT_TYPES.map(newType => (
              <DropdownMenuItem
                key={newType}
                onClick={() => newDocument(newType)}
                disabled={pending}
              >
                New {DOCUMENT_TYPE_NAMES[newType].toLowerCase()}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
    const gesture = clickGesture(event);

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

// Shift extends a range from the anchor; ⌘/Ctrl adds or removes one row.
function clickGesture(event: MouseEvent) {
  if (event.shiftKey) return "range";
  if (event.metaKey || event.ctrlKey) return "toggle";

  return null;
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
    <div className="flex items-center gap-1.5 max-md:gap-2">
      <label className="bg-muted text-muted-foreground focus-within:border-ring flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md border border-transparent px-2 max-md:h-11 max-md:gap-2 max-md:px-3">
        <IconSearch
          aria-hidden="true"
          className="size-3.5 shrink-0 max-md:size-5"
        />
        <span className="sr-only">{label}</span>
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={label}
          className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 self-stretch bg-transparent text-[13px] outline-none max-md:text-base [&::-webkit-search-cancel-button]:hidden"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onChange("")}
            className="hover:text-foreground relative -mr-0.5 rounded-sm after:absolute after:top-1/2 after:left-1/2 after:size-11 after:-translate-1/2 pointer-fine:after:hidden"
          >
            <IconX aria-hidden="true" className="size-3.5 max-md:size-5" />
          </button>
        )}
      </label>
      {children}
    </div>
  );
}

function DocumentList({
  documents,
  error,
  query,
  view,
  onClearFilters
}: {
  documents: InvoiceDocument[] | null;
  error: string | null;
  query: string;
  view: InvoiceLibraryView;
  onClearFilters: () => void;
}) {
  const { libraryDocumentId } = useInvoiceDocument();
  const actions = useFileActions();
  const matches = filterInvoices(documents ?? [], {
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
  if (!documents) return <ListScroller />;

  if (documents.length === 0) {
    return (
      <ListScroller>
        <ListMessage>
          No documents yet. Everything you make saves itself as you edit, and
          shows here once you start on it.
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
        matches.length < documents.length && (
          <div className="text-muted-foreground flex shrink-0 items-center justify-between gap-2 px-4 pb-1.5 text-xs max-md:min-h-11 max-md:pb-0 max-md:text-base">
            <span className="tabular-nums">
              {matches.length} of {documents.length} documents
            </span>
            <button
              type="button"
              onClick={onClearFilters}
              className="hover:text-foreground focus-visible:ring-ring rounded-sm font-medium outline-none focus-visible:ring-1 max-md:h-11"
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
              <h3 className="text-muted-foreground flex items-center justify-between gap-2 px-2 pt-1 pb-0.5 text-[11px] font-medium max-md:pt-2 max-md:pb-1 max-md:text-sm">
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
                badge={
                  document.invoiceData.documentType !== "invoice" && (
                    <DocumentTypePill
                      documentType={document.invoiceData.documentType}
                      className="max-md:h-5 max-md:px-1.5 max-md:text-[13px]"
                    />
                  )
                }
                meta={documentMeta(document, view)}
                onClick={event =>
                  selection.handleRowClick(event, document.id, () =>
                    actions.openInvoice(document.id)
                  )
                }
                menu={
                  selection.isBulk(document.id) ? (
                    <DeleteItem
                      label={`Delete ${selectedDocuments.length} documents…`}
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

// The second line of a row, after its type's pill: its number, then the date
// the sort is about (when it's due for a due-date sort, when it was edited for
// the default sort).
function documentMeta(document: InvoiceDocument, view: InvoiceLibraryView) {
  const { number, dueDate } = document.invoiceData;
  const due = formatLibraryDate(readInvoiceDate(dueDate));
  const edited = formatLibraryDate(document.updatedAt);
  const date =
    view.sort === "dueDate" && due
      ? `Due ${due}`
      : view.sort === "updated"
        ? edited && `Edited ${edited}`
        : formatLibraryDate(getInvoiceDate(document));

  return [number && `No. ${number}`, date].filter(Boolean).join(" · ");
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
          className="text-foreground hover:bg-muted focus-visible:ring-ring mx-2 w-fit rounded-md px-2 py-1 text-xs font-medium outline-none focus-visible:ring-1 max-md:h-11 max-md:px-3 max-md:text-base"
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
          <h3 className="text-muted-foreground px-2 pt-1 pb-0.5 text-[11px] font-medium max-md:pt-2 max-md:pb-1 max-md:text-sm">
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
    <div className="text-muted-foreground flex shrink-0 items-center justify-between gap-2 px-4 pb-1.5 text-xs max-md:min-h-11 max-md:pb-0 max-md:text-base">
      <span className="tabular-nums">{count} selected</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClear}
          className="hover:text-foreground focus-visible:ring-ring rounded-sm font-medium outline-none focus-visible:ring-1 max-md:h-11"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-destructive focus-visible:ring-ring rounded-sm font-medium outline-none hover:underline focus-visible:ring-1 max-md:h-11"
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

// A row, under a title that is never blank, with `badge` leading its second
// line: clicking the row opens the item
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
  badge,
  meta,
  onClick,
  menu
}: {
  current: boolean;
  selected: boolean;
  title: string;
  aside?: string;
  badge?: ReactNode;
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
              selected && "bg-brand-100 dark:bg-brand-500/20",
              !selected && current && "bg-accent",
              !selected &&
                !current &&
                "hover:bg-muted has-aria-expanded:bg-muted data-popup-open:bg-muted"
            )}
          />
        }
      >
        <button
          type="button"
          aria-current={current ? "true" : undefined}
          onClick={onClick}
          className="focus-visible:ring-ring grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-2 rounded-md py-1.5 pr-9 pl-2 text-left outline-none select-none focus-visible:ring-1 max-md:gap-y-0.5 max-md:py-3 max-md:pr-13 max-md:pl-3 pointer-coarse:py-2.5 pointer-coarse:pr-13"
        >
          <span className="text-foreground truncate text-[13px] font-medium max-md:text-base">
            {title}
            {selected && <span className="sr-only">, selected</span>}
          </span>
          {aside && (
            <span className="text-muted-foreground text-xs leading-5 tabular-nums max-md:text-base/6">
              {aside}
            </span>
          )}
          {(meta || badge) && (
            <span className="text-muted-foreground col-span-2 flex min-w-0 items-center gap-1.5 text-xs max-md:text-base">
              {badge}
              <span className="truncate">{meta}</span>
            </span>
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${title}`}
            className="text-muted-foreground hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground focus-visible:ring-ring absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-md opacity-0 outline-none group-focus-within/item:opacity-100 group-hover/item:opacity-100 focus-visible:opacity-100 focus-visible:ring-1 aria-expanded:opacity-100 max-md:size-11 max-md:opacity-100 pointer-coarse:size-11 pointer-coarse:opacity-100"
          >
            <IconDots aria-hidden="true" className="size-4 max-md:size-5" />
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
    <p className="text-muted-foreground px-2 py-3 text-xs text-pretty max-md:text-base/6">
      {children}
    </p>
  );
}
