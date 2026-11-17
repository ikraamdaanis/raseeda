import { IconPlus, IconX } from "@tabler/icons-react";
import type { ComponentProps, ReactNode } from "react";
import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef
} from "react";
import { useNumberField } from "~/components/editor/number-field";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { NativeSelect } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";
import type { InvoiceNumberFormat } from "~/types";
import { getDecimalSeparator } from "~/utils/format-number";

// The phone's form (issue #213): ordinary labelled fields over the same store
// the page edits. Every field is at least 16px (`text-base`), so iOS doesn't
// zoom in on it, and every control is a 44px tap target.

export const formFieldClassName = "h-11 text-base md:text-base";

// A field's title, and any heading inside a part (Other ways to pay).
export const formLabelClassName = "text-base/6 font-medium";

// Help and notes under a field.
export const formHintClassName =
  "text-muted-foreground text-base/6 text-pretty";

// A line, a way to pay: one of several of the same thing inside a part.
export const formCardClassName =
  "border-border flex flex-col gap-4 rounded-xl border p-4";

// A small icon button (remove, move) that's still a 48px tap target.
export const formIconButtonClassName =
  "text-muted-foreground relative size-9 shrink-0 after:absolute after:top-1/2 after:left-1/2 after:size-12 after:-translate-1/2";

// One part of the form: the form lays them out edge to edge with a line
// between each.
export const formSectionClassName =
  "bg-background flex flex-col gap-5 px-[max(1rem,env(safe-area-inset-left))] py-6";

// A label the page prints: what it's called before it's renamed (the
// placeholder of the field that renames it), what it's renamed to, and the
// `data-field` path the page's own label has.
type PrintedLabel = {
  name: string;
  value: string;
  field: string;
  onChange: (value: string) => void;
};

// The labels a part prints, by path, for its titles to rename.
const AreaLabelsContext = createContext<Map<string, PrintedLabel>>(new Map());

/**
 * One part of the page, under its heading, in the order it prints. The heading
 * and the titles in it read as they print (From, Due Date), and each of those
 * the page prints is a field that renames it where it stands:
 * `label` is the heading's, `labels` the titles' (only those that print right
 * now). A part that can be hidden has a Remove button beside its heading.
 */
export function FormArea({
  area,
  title,
  label,
  labels = [],
  onRemove,
  removeLabel,
  children
}: {
  area: string;
  title: string;
  label?: {
    value: string;
    field: string;
    onChange: (value: string) => void;
  };
  labels?: PrintedLabel[];
  onRemove?: () => void;
  removeLabel?: string;
  children?: ReactNode;
}) {
  const headingId = useId();
  const heading = label?.value.trim() || title;
  const printedLabels = new Map(
    labels.map(printedLabel => [printedLabel.field, printedLabel])
  );

  return (
    <AreaLabelsContext.Provider value={printedLabels}>
      <section
        data-field-area={area}
        aria-labelledby={headingId}
        className={formSectionClassName}
      >
        <div className="flex min-h-9 items-center gap-2">
          {label ? (
            <RenameableHeading
              id={headingId}
              label={{ name: title, ...label }}
            />
          ) : (
            <h2
              id={headingId}
              className="min-w-0 flex-1 truncate text-lg font-semibold"
            >
              {heading}
            </h2>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              aria-label={removeLabel ?? `Remove ${title.toLowerCase()}`}
              onClick={onRemove}
              className={cn(formIconButtonClassName, "-mr-2")}
            >
              <IconX aria-hidden="true" />
            </Button>
          )}
        </div>
        {children}
      </section>
    </AreaLabelsContext.Provider>
  );
}

// A heading the page prints, as the field that renames it. The part's region
// keeps its name from the heading, hidden but read by a screen reader.
function RenameableHeading({ id, label }: { id: string; label: PrintedLabel }) {
  return (
    <div className="flex min-w-0 flex-1">
      <h2 id={id} className="sr-only">
        {label.value.trim() || label.name}
      </h2>
      <LabelInput label={label} className="text-lg font-semibold md:text-lg" />
    </div>
  );
}

// A label the page prints, always a field: typing in it renames what prints.
// Its faint dotted outline sets it apart from the fields that hold the
// invoice's content. Cleared, it shows the name the page prints instead.
// Named "Due Date label" for a screen reader, apart from the Due Date field.
// `unit` is what the title adds after the label, like a price's currency.
function LabelInput({
  label,
  unit,
  className
}: {
  label: PrintedLabel;
  unit?: string;
  className?: string;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Input
        aria-label={`${label.name} label`}
        data-field={label.field}
        value={label.value}
        placeholder={label.name}
        enterKeyHint="done"
        onChange={event => label.onChange(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className={cn(
          formFieldClassName,
          "border-muted-foreground/35 placeholder:text-foreground focus-visible:border-ring border-dotted bg-transparent font-medium shadow-none focus-visible:border-solid dark:bg-transparent",
          unit && "pr-12",
          className
        )}
      />
      {unit && (
        <span
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-base"
        >
          ({unit})
        </span>
      )}
    </div>
  );
}

/**
 * A field's title, the label it prints under. Given that label's `field`
 * path, and while the label prints, the title is the field that renames it,
 * and the field under it keeps the title as its name for a screen reader.
 * `children` is the title as shown, and `unit` what it adds after the label
 * (a price's currency).
 */
export function FormFieldTitle({
  htmlFor,
  field,
  unit,
  className,
  children
}: {
  htmlFor?: string;
  field?: string;
  unit?: string;
  className?: string;
  children: string;
}) {
  const labels = useContext(AreaLabelsContext);
  const label = field ? labels.get(field) : undefined;
  const title = unit ? `${children} (${unit})` : children;
  const Title = htmlFor ? "label" : "span";

  if (!label) {
    return (
      <Title htmlFor={htmlFor} className={cn("min-w-0 truncate", className)}>
        {title}
      </Title>
    );
  }

  return (
    <span className="flex min-w-0 flex-1">
      {htmlFor && (
        <label htmlFor={htmlFor} className="sr-only">
          {title}
        </label>
      )}
      <LabelInput label={label} unit={unit} className={className} />
    </span>
  );
}

/**
 * A field under its title: the label the field prints under, as it prints.
 * `labelField` is that label's path, for renaming it where it stands, and
 * `unit` what the title adds after it (a price's currency).
 */
export function FormField({
  id,
  title,
  labelField,
  unit,
  hint,
  className,
  children
}: {
  id: string;
  title: string;
  labelField?: string;
  unit?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <FormFieldTitle
        htmlFor={id}
        field={labelField}
        unit={unit}
        className={formLabelClassName}
      >
        {title}
      </FormFieldTitle>
      {children}
      {hint && <div className={formHintClassName}>{hint}</div>}
    </div>
  );
}

export function FormInput({
  className,
  onChange,
  ...props
}: Omit<ComponentProps<"input">, "onChange"> & {
  onChange?: (value: string) => void;
}) {
  return (
    <Input
      enterKeyHint="next"
      {...props}
      onChange={event => onChange?.(event.target.value)}
      className={cn(formFieldClassName, className)}
    />
  );
}

// A multi-line field that grows with what's typed. `field-sizing: content`
// does this where it's supported; the height is also set by hand for Safari.
// It never shrinks below its `rows` or its placeholder's lines, whichever is
// more (plus its padding and border), however little is typed: `field-sizing`
// alone would size an empty field by its placeholder, then drop to a line at
// the first letter.
export function FormTextArea({
  className,
  onChange,
  value,
  rows = 2,
  placeholder,
  ...props
}: Omit<ComponentProps<"textarea">, "onChange" | "ref"> & {
  onChange?: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const minRows = Math.max(rows, placeholder?.split("\n").length ?? 0);

  useLayoutEffect(() => {
    const textarea = ref.current;

    if (!textarea) return;

    const styles = getComputedStyle(textarea);
    const border =
      parseFloat(styles.borderTopWidth) + parseFloat(styles.borderBottomWidth);

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight + border}px`;
  }, [value]);

  return (
    <Textarea
      {...props}
      ref={ref}
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={event => onChange?.(event.target.value)}
      className={cn("resize-none py-2.5 text-base md:text-base", className)}
      style={{ minHeight: `calc(${minRows}lh + 1.25rem + 2px)` }}
    />
  );
}

// iOS's decimal keypad offers the separator of the phone's own keyboard, not
// the invoice's (WebKit bug 247242), so on an invoice that writes a decimal
// comma a figure typed with a dot and no comma reads the dot as the decimal
// point: nobody types thousands into a phone field, and a focused field shows
// its figure ungrouped.
export function readKeypadDecimal(
  text: string,
  numberFormat: InvoiceNumberFormat
) {
  const isDecimalComma = getDecimalSeparator(numberFormat) === ",";

  return isDecimalComma && !text.includes(",") ? text.replace(".", ",") : text;
}

/**
 * A number typed in the invoice's number format, through `useNumberField` as
 * on the page, with `readKeypadDecimal` reading the keypad's separator.
 */
export function FormNumberInput({
  value,
  onChange,
  onClear,
  money,
  decimals,
  min,
  max,
  display,
  showMarker,
  className,
  ...props
}: Omit<
  ComponentProps<"input">,
  "value" | "onChange" | "onFocus" | "onBlur" | "min" | "max"
> &
  Parameters<typeof useNumberField>[0]) {
  const field = useNumberField({
    value,
    onChange,
    onClear,
    money,
    decimals,
    min,
    max,
    display,
    showMarker
  });

  return (
    <Input
      type="text"
      inputMode="decimal"
      enterKeyHint="next"
      autoComplete="off"
      {...props}
      value={field.value}
      onFocus={field.onFocus}
      onBlur={field.onBlur}
      onChange={event =>
        field.onChange(
          readKeypadDecimal(event.target.value, money.numberFormat)
        )
      }
      className={cn(formFieldClassName, "tabular-nums", className)}
    />
  );
}

export function FormSelect({
  className,
  ...props
}: ComponentProps<typeof NativeSelect>) {
  return (
    <NativeSelect
      {...props}
      className={cn(formFieldClassName, "leading-11", className)}
    />
  );
}

/**
 * An on/off choice: a switch with its label, the whole row a tap target.
 */
export function FormSwitch({
  label,
  description,
  field,
  checked,
  onCheckedChange
}: {
  label: string;
  description?: string;
  field?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();
  const descriptionId = useId();

  return (
    <div className="flex items-center gap-4">
      <label
        htmlFor={id}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center"
      >
        <span className={formLabelClassName}>{label}</span>
        {description && (
          <span id={descriptionId} className={formHintClassName}>
            {description}
          </span>
        )}
      </label>
      <Switch
        id={id}
        size="lg"
        data-field={field}
        aria-describedby={description ? descriptionId : undefined}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="after:-inset-2 after:-inset-y-3"
      />
    </div>
  );
}

/**
 * The parts of an area that are switched off, each a button that turns it on
 * where it prints, from `useAddableParts`.
 */
export function FormAddParts({
  parts
}: {
  parts: { id: string; label: string; onAdd: () => void }[];
}) {
  if (parts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {parts.map(part => (
        <FormAddButton key={part.id} onClick={part.onAdd}>
          {part.label}
        </FormAddButton>
      ))}
    </div>
  );
}

export function FormAddButton({
  onClick,
  children
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="text-muted-foreground h-11 border-dashed pr-4 pl-3 text-base font-normal"
    >
      <IconPlus aria-hidden="true" className="size-5" />
      {children}
    </Button>
  );
}

// A read-only figure in the form, such as a line's amount or a total, with the
// second currency's under it when the page shows one ("£100.00 / $127.00").
export function FormAmount({
  value,
  isTotal = false,
  className
}: {
  value: string;
  isTotal?: boolean;
  className?: string;
}) {
  const [amount, converted] = value.split(" / ");

  return (
    <span
      className={cn(
        "flex flex-col items-end text-right text-base tabular-nums",
        className
      )}
    >
      <span
        className={cn("whitespace-nowrap", isTotal && "text-lg font-semibold")}
      >
        {amount}
      </span>
      {converted && (
        <span className="text-muted-foreground text-base whitespace-nowrap">
          {converted}
        </span>
      )}
    </span>
  );
}
