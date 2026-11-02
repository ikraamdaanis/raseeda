import {
  IconAdjustmentsHorizontal,
  IconSortAscending,
  IconSortDescending
} from "@tabler/icons-react";
import { isEqual } from "lodash-es";
import type { ReactNode } from "react";
import { SegmentedControl } from "~/components/editor/shell/inspector/inspector-controls";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "~/components/ui/popover";
import { NativeSelect } from "~/components/ui/select";
import { getCurrencyMarker } from "~/consts/currencies";
import { cn } from "~/lib/utils";
import type { InvoiceDocument, InvoiceLibraryView } from "~/types";
import {
  countActiveFilters,
  DEFAULT_LIBRARY_VIEW,
  LIBRARY_DATE_RANGES,
  LIBRARY_GROUPS,
  LIBRARY_SORTS,
  listClients,
  listCurrencies
} from "~/utils/invoice-library";

const fieldClassName =
  "bg-muted dark:bg-muted dark:hover:bg-muted hover:border-input focus-visible:border-ring text-foreground h-8 w-full min-w-0 rounded-md border border-transparent pr-7 pl-2 text-[13px] outline-none";

// Sort, group and filter for a saved-invoice list, behind one button with a
// badge counting the filters that are on. Grouping is optional, for lists that
// can't show groups (the Open Invoice table).
export function LibraryViewOptions({
  view,
  onViewChange,
  invoices,
  showGroup = true,
  align = "start",
  size = "default"
}: {
  view: InvoiceLibraryView;
  onViewChange: (view: InvoiceLibraryView) => void;
  invoices: InvoiceDocument[];
  showGroup?: boolean;
  align?: "start" | "end";
  // Square, the height of the search field beside it: `sm` in the dialogs'
  // compact toolbars, `default` in the invoices panel.
  size?: "sm" | "default";
}) {
  const activeFilters = countActiveFilters(view);
  // A filter stays listed after its last invoice changes, so it still shows
  // what it is set to and can be cleared.
  const clients = withChosen(listClients(invoices), view.client);
  const currencies = withChosen(listCurrencies(invoices), view.currency);
  const defaultView = showGroup
    ? DEFAULT_LIBRARY_VIEW
    : { ...DEFAULT_LIBRARY_VIEW, group: view.group };
  const isDefault = isEqual(view, defaultView);

  function update(changes: Partial<InvoiceLibraryView>) {
    onViewChange({ ...view, ...changes });
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label={
          activeFilters > 0
            ? `View options, ${activeFilters} filter${activeFilters === 1 ? "" : "s"} on`
            : "View options"
        }
        title="Sort, group and filter"
        className={cn(
          "bg-muted text-muted-foreground hover:text-foreground aria-expanded:text-foreground focus-visible:ring-ring relative flex shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-1",
          size === "sm" ? "size-7" : "size-8"
        )}
      >
        <IconAdjustmentsHorizontal aria-hidden="true" className="size-4" />
        {activeFilters > 0 && (
          <span
            aria-hidden="true"
            className="bg-ring absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold text-white tabular-nums"
          >
            {activeFilters}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-64 gap-3 p-3">
        <OptionGroup label="Sort by" htmlFor="library-sort">
          <div className="flex items-center gap-1.5">
            <NativeSelect
              id="library-sort"
              value={view.sort}
              onChange={event => {
                const sort = LIBRARY_SORTS.find(
                  option => option.value === event.target.value
                );

                if (sort) {
                  update({
                    sort: sort.value,
                    direction: sort.defaultDirection
                  });
                }
              }}
              className={fieldClassName}
            >
              {LIBRARY_SORTS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
            <button
              type="button"
              aria-label={
                view.direction === "asc"
                  ? "Ascending, switch to descending"
                  : "Descending, switch to ascending"
              }
              title={view.direction === "asc" ? "Ascending" : "Descending"}
              onClick={() =>
                update({ direction: view.direction === "asc" ? "desc" : "asc" })
              }
              className="bg-muted text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-8 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-1"
            >
              {view.direction === "asc" ? (
                <IconSortAscending aria-hidden="true" className="size-4" />
              ) : (
                <IconSortDescending aria-hidden="true" className="size-4" />
              )}
            </button>
          </div>
        </OptionGroup>
        {showGroup && (
          <OptionGroup label="Group by">
            <SegmentedControl
              label="Group by"
              value={view.group}
              options={LIBRARY_GROUPS}
              onChange={group => update({ group })}
            />
          </OptionGroup>
        )}
        <div className="border-border -mx-3 border-t" />
        <OptionGroup label="Invoice date" htmlFor="library-date">
          <NativeSelect
            id="library-date"
            value={view.dateRange}
            onChange={event => {
              const range = LIBRARY_DATE_RANGES.find(
                option => option.value === event.target.value
              );

              if (range) update({ dateRange: range.value });
            }}
            className={fieldClassName}
          >
            {LIBRARY_DATE_RANGES.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </OptionGroup>
        <OptionGroup label="Client" htmlFor="library-client">
          <NativeSelect
            id="library-client"
            value={view.client ?? ""}
            onChange={event => update({ client: event.target.value || null })}
            className={fieldClassName}
          >
            <option value="">Any client</option>
            {clients.map(client => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </NativeSelect>
        </OptionGroup>
        {(currencies.length > 1 || view.currency !== null) && (
          <OptionGroup label="Currency" htmlFor="library-currency">
            <NativeSelect
              id="library-currency"
              value={view.currency ?? ""}
              onChange={event =>
                update({ currency: event.target.value || null })
              }
              className={fieldClassName}
            >
              <option value="">Any currency</option>
              {currencies.map(currency => (
                <option key={currency} value={currency}>
                  {getCurrencyMarker(currency)}
                </option>
              ))}
            </NativeSelect>
          </OptionGroup>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={isDefault}
          onClick={() => onViewChange(defaultView)}
          className="text-muted-foreground -mx-1 w-fit"
        >
          Reset to default
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function OptionGroup({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-muted-foreground text-xs font-medium"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function withChosen(options: string[], chosen: string | null) {
  return chosen !== null && !options.includes(chosen)
    ? [chosen, ...options]
    : options;
}
