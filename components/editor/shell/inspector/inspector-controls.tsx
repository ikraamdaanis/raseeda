import { IconChevronDown, IconRestore } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { Switch } from "~/components/ui/switch";
import { parseBoolean, usePersistentState } from "~/hooks/use-persistent-state";
import { cn } from "~/lib/utils";
import { HEX_COLOUR, toSixDigitHex } from "~/utils/to-six-digit-hex";

// The building blocks of the inspector: collapsible sections, label/value rows
// and a segmented control, in the same tight scale as the rest of the chrome.

export const inspectorFieldClassName =
  "bg-muted dark:bg-muted dark:hover:bg-muted hover:border-input focus-visible:border-ring text-foreground h-8 w-full min-w-0 rounded-md border border-transparent px-2 text-[13px] outline-none";

// Open or collapsed is remembered per section across reloads. Collapsed, the
// section is just its 44px header row, centred between the dividers. The
// header sticks to the top of the panel until its section scrolls past, and
// while it's stuck a fade below it softens the rows sliding underneath. The
// fade is its own element, not ::after: Chrome can leave a pseudo-element's
// reversed opacity transition painted after scrolling back to the top.
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
  const sectionRef = useRef<HTMLElement>(null);
  const [isStuck, setIsStuck] = useState(false);

  // The header is pinned once its section's top has scrolled above the
  // panel's; resting at the top it isn't, so the first rows stay unfaded.
  useEffect(() => {
    const section = sectionRef.current;
    const panel = section?.closest("[data-inspector-scroll]");
    if (!section || !panel) return;

    function updateStuck() {
      if (!section || !panel) return;

      const sectionTop = section.getBoundingClientRect().top;
      const panelTop = panel.getBoundingClientRect().top;
      setIsStuck(sectionTop < panelTop - 0.5);
    }

    updateStuck();
    panel.addEventListener("scroll", updateStuck, { passive: true });

    return () => panel.removeEventListener("scroll", updateStuck);
  }, []);

  return (
    <section
      ref={sectionRef}
      className={cn(
        "border-border flex flex-col border-b px-4 last:border-b-0",
        open && "pb-4"
      )}
    >
      <h2 className="bg-background sticky top-0 z-10 -mx-4 px-4">
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
        <span
          aria-hidden="true"
          className={cn(
            "from-background pointer-events-none absolute inset-x-0 top-full h-4 bg-linear-to-b to-transparent transition-opacity motion-reduce:transition-none",
            isStuck ? "opacity-100" : "opacity-0"
          )}
        />
      </h2>
      {open && (
        <div id={contentId} className="flex flex-col gap-3">
          {children}
        </div>
      )}
    </section>
  );
}

// A nested row indents its label, for rows that belong to the one above.
export function InspectorRow({
  label,
  htmlFor,
  nested = false,
  children
}: {
  label: string;
  htmlFor?: string;
  nested?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-2">
      <label
        htmlFor={htmlFor}
        className={cn("text-muted-foreground text-[13px]", nested && "pl-3")}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

// A setting that's on or off, the whole row its label.
export function InspectorSwitch({
  label,
  checked,
  onCheckedChange,
  field
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  field?: string;
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className="hover:bg-muted -mx-1.5 flex h-8 cursor-pointer items-center justify-between gap-3 rounded-md px-1.5 text-[13px] pointer-coarse:h-11"
    >
      <span className="text-foreground">{label}</span>
      <Switch
        id={id}
        size="sm"
        aria-label={label}
        data-field={field}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </label>
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

// A colour as a swatch that opens the system's picker, and its hex code,
// which can be typed. A typed code takes once it's whole; leaving the field
// puts back the colour in use, so a half-typed one never sticks. Both carry
// the colour's path, so undo works from either and a drag through the picker
// is one step.
export function ColourRow({
  label,
  field,
  value,
  onChange
}: {
  label: string;
  field: string;
  value: string;
  onChange: (colour: string) => void;
}) {
  const id = useId();
  // What's typed, with the colour in use when it was typed: once the colour
  // changes from elsewhere (undo, Reset colours), the field shows that instead.
  const [draft, setDraft] = useState<{ typed: string; colour: string } | null>(
    null
  );

  function handleTyped(typed: string) {
    const code = typed.trim();

    if (!HEX_COLOUR.test(code)) {
      setDraft({ typed, colour: value });

      return;
    }

    const colour = `#${code.replace("#", "").toLowerCase()}`;

    setDraft({ typed, colour });
    onChange(colour);
  }

  return (
    <InspectorRow label={label} htmlFor={id}>
      <div
        className={cn(
          inspectorFieldClassName,
          "focus-within:border-ring flex items-center gap-2 pl-1"
        )}
      >
        <input
          type="color"
          name={`${field}-picker`}
          aria-label={`${label} colour`}
          data-field={field}
          value={toSixDigitHex(value)}
          onChange={event => onChange(event.target.value)}
          className="size-6 shrink-0 cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 [&::-moz-color-swatch]:rounded-sm [&::-moz-color-swatch]:border-black/10 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-black/10 dark:[&::-webkit-color-swatch]:border-white/15 [&::-webkit-color-swatch-wrapper]:p-0"
        />
        <input
          id={id}
          name={field}
          aria-label={`${label} colour code`}
          data-field={field}
          value={draft?.colour === value ? draft.typed : value}
          onChange={event => handleTyped(event.target.value)}
          onBlur={() => setDraft(null)}
          spellCheck={false}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent tabular-nums outline-none"
        />
      </div>
    </InspectorRow>
  );
}

// Puts a group's colours back to their defaults, lined up under the fields.
export function ResetColoursButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
      <button
        type="button"
        onClick={onClick}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring relative col-start-2 -mx-1 flex h-6 w-fit items-center gap-1 rounded-md px-1 text-xs outline-none focus-visible:ring-1"
      >
        <IconRestore aria-hidden="true" className="size-3.5 shrink-0" />
        Reset colours
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
        />
      </button>
    </div>
  );
}
