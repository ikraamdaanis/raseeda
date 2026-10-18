import { IconChevronDown } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useId } from "react";
import { parseBoolean, usePersistentState } from "~/hooks/use-persistent-state";
import { cn } from "~/lib/utils";

// The building blocks of the inspector: collapsible sections, label/value rows
// and a segmented control, in the same tight scale as the rest of the chrome.

export const inspectorFieldClassName =
  "bg-muted dark:bg-muted dark:hover:bg-muted hover:border-input focus-visible:border-ring text-foreground h-8 w-full min-w-0 rounded-md border border-transparent px-2 text-[13px] outline-none";

// Open or collapsed is remembered per section across reloads. Collapsed, the
// section is just its 44px header row, centred between the dividers.
export function InspectorSection({
  id,
  title,
  children
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const [open, setOpen] = usePersistentState(
    `editor-inspector-${id}`,
    true,
    parseBoolean
  );
  const contentId = useId();

  return (
    <section
      className={cn(
        "border-border flex flex-col border-b px-4 last:border-b-0",
        open && "pb-4"
      )}
    >
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen(!open)}
          className="text-foreground focus-visible:ring-ring -mx-1 flex h-11 w-[calc(100%+0.5rem)] items-center justify-between rounded-md px-1 text-[13px] font-semibold outline-none focus-visible:ring-1"
        >
          {title}
          <IconChevronDown
            aria-hidden="true"
            className={cn(
              "text-muted-foreground size-3.5 transition-transform motion-reduce:transition-none",
              !open && "-rotate-90"
            )}
          />
        </button>
      </h2>
      {open && (
        <div id={contentId} className="flex flex-col gap-3">
          {children}
        </div>
      )}
    </section>
  );
}

export function InspectorRow({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-2">
      <label htmlFor={htmlFor} className="text-muted-foreground text-[13px]">
        {label}
      </label>
      {children}
    </div>
  );
}

export function InspectorGroupLabel({ children }: { children: ReactNode }) {
  return (
    <span className="text-muted-foreground text-xs font-medium">
      {children}
    </span>
  );
}

export function SegmentedControl<TValue extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: TValue;
  options: { value: TValue; label: string; className?: string }[];
  onChange: (value: TValue) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="bg-muted flex w-full items-center rounded-lg p-0.5"
    >
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "text-muted-foreground hover:text-foreground focus-visible:ring-ring flex h-7 min-w-0 flex-1 items-center justify-center truncate rounded-md px-1.5 text-xs outline-none focus-visible:ring-1 pointer-coarse:h-10",
            value === option.value &&
              "bg-popover text-foreground ring-foreground/10 shadow-xs ring-1",
            option.className
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
