import { IconPencil, IconPlus, IconX } from "@tabler/icons-react";
import type { ComponentProps, ReactNode } from "react";
import {
  createContext,
  useContext,
  useId,
  useLayoutEffect,
  useRef
} from "react";
import { addAndReveal } from "~/components/editor/form/form-scroll";
import { useNumberField } from "~/components/editor/number-field";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { NativeSelect } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { FIELD_NOTES, PART_NOTES } from "~/consts/form-notes";
import { cn } from "~/lib/utils";
import type { InvoiceNumberFormat } from "~/types";
import { getDecimalSeparator } from "~/utils/format-number";

// The phone's form (issue #213): ordinary labelled fields over the same store
// the page edits. Every field is at least 16px (`text-base`), so iOS doesn't
// zoom in on it, and every control is a 44px tap target.

export const formFieldClassName = "bg-card h-11 text-base md:text-base";

// A field's title, and any heading inside a part (Other ways to pay).
export const formLabelClassName = "text-base/6 font-medium";

// Help and notes under a field: a step under the field titles, still well
// over the 14px captions.
export const formHintClassName =
  "text-muted-foreground text-[0.9375rem]/5.5 text-pretty";

// A line, a way to pay: one of several of the same thing inside a part.
export const formCardClassName =
  "border-border flex flex-col gap-4 rounded-md border p-4";

// A small icon button (remove, move) that's still a 48px tap target.
export const formIconButtonClassName =
  "text-muted-foreground relative size-9 shrink-0 after:absolute after:top-1/2 after:left-1/2 after:size-12 after:-translate-1/2";

// A plain button's press, as the `Button`s give.
export const formPressClassName =
  "transition-[color,scale] duration-150 ease-out active:scale-[0.97]";

// Something added once the form is open (a part, a line, a row) fades and
// rises in; what's there when it opens, or when Edit is picked again, shows
// at once. `PhoneForm` marks itself mounted a frame after it first paints.
export const formEnterClassName =
  "transition-[opacity,translate] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] starting:in-data-mounted:opacity-0 motion-safe:starting:in-data-mounted:translate-y-2";

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
 * One part of the page, under its heading, in the order it prints. The
 * heading stays at the top of the form while the part scrolls under it. A
 * part whose heading the page prints (`label`) says what it is under a
 * heading of its own (`PART_NOTES`), then has the label it prints, renamed
 * where it stands ("Prints as From"), so the part's place on the invoice
 * stays plain however the label is renamed. The titles in it (`labels`, only
 * those that print right now) are renamed the same way. A part that can be
 * hidden has a Remove button beside its heading.
 */
export function FormArea({
  area,
  title,
  label,
  labels = [],
  onRemove,
  removeLabel,
  className,
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
  className?: string;
  children?: ReactNode;
}) {
  const headingId = useId();
  const part = label ? PART_NOTES[area] : undefined;
  const printedLabels = new Map(
    labels.map(printedLabel => [printedLabel.field, printedLabel])
  );
  const labelInput = label && (
    <LabelInput
      label={{ name: title, ...label }}
      prefix={part ? "Prints as" : undefined}
      className={formLabelClassName}
    />
  );

  return (
    <AreaLabelsContext.Provider value={printedLabels}>
      <section
        data-field-area={area}
        aria-labelledby={headingId}
        className={cn(formSectionClassName, formEnterClassName, className)}
      >
        <div className="bg-background/90 sticky top-0 z-10 -mx-[max(1rem,env(safe-area-inset-left))] -my-2 flex items-start gap-2 px-[max(1rem,env(safe-area-inset-left))] py-2 backdrop-blur-sm">
          <h2
            id={headingId}
            className="flex min-h-9 min-w-0 flex-1 items-center text-lg font-semibold"
          >
            {part?.heading ?? (label?.value.trim() || title)}
          </h2>
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
        {part && <p className={cn(formHintClassName, "-mt-4")}>{part.note}</p>}
        {part?.isOneField ? (
          <div className="flex flex-col gap-1">
            {labelInput}
            {children}
          </div>
        ) : (
          <>
            {labelInput}
            {children}
          </>
        )}
      </section>
    </AreaLabelsContext.Provider>
  );
}

// A label the page prints, renamed by typing in it. It reads as a title with
// a pencil after it, not as one of the fields that hold the invoice's
// content, and shows its box only while it's being typed in; the whole row
// is its tap target. Cleared, it shows the name the page prints instead.
// Named "Due Date label" for a screen reader, apart from the Due Date field.
// `prefix` is what goes before it ("Prints as") where a heading already names
// the field, and `unit` what the title adds after the label, like a price's
// currency. The field sizes to its text (an invisible copy sets the width),
// so the pencil sits right after it.
function LabelInput({
  label,
  prefix,
  unit,
  className
}: {
  label: PrintedLabel;
  prefix?: string;
  unit?: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "group/label flex min-h-11 min-w-0 cursor-text items-center gap-1.5",
        className
      )}
    >
      {prefix && (
        <span className="text-muted-foreground mr-0.5 shrink-0 text-sm/5 font-normal">
          {prefix}
        </span>
      )}
      <span
        className={cn(
          "inline-grid min-w-0",
          !prefix && "-ml-[calc(--spacing(1.5)+1px)]"
        )}
      >
        <span
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 overflow-hidden border border-transparent px-1.5 whitespace-pre"
        >
          {label.value || label.name}
        </span>
        <Input
          aria-label={`${label.name} label`}
          size={1}
          data-field={label.field}
          value={label.value}
          placeholder={label.name}
          enterKeyHint="done"
          onChange={event => label.onChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className="focus-visible:border-ring focus-visible:bg-card dark:focus-visible:bg-input/30 col-start-1 row-start-1 h-11 min-w-11 border-transparent bg-transparent px-1.5 text-[length:inherit] shadow-none placeholder:text-inherit md:text-[length:inherit] dark:bg-transparent"
        />
      </span>
      {unit && (
        <span aria-hidden="true" className="text-muted-foreground shrink-0">
          ({unit})
        </span>
      )}
      <IconPencil
        aria-hidden="true"
        className="text-muted-foreground size-4 shrink-0 transition-opacity duration-150 group-focus-within/label:opacity-0"
      />
    </label>
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

  // The row is a 44px tap target but takes the room of a plain title's line,
  // so a renamed title sits as close to its field as any other.
  return (
    <span className="-my-1.5 flex min-w-0 flex-1">
      {htmlFor && (
        <label htmlFor={htmlFor} className="sr-only">
          {title}
        </label>
      )}
      <LabelInput label={label} unit={unit} className={className} />
    </span>
  );
}

// Takes an optional part off the page, under the fields it removes, so they
// keep the form's full width. Worded and drawn like Remove second currency.
export function FormRemoveButton({
  onClick,
  className,
  children
}: {
  onClick: () => void;
  className?: string;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-muted-foreground hover:text-foreground flex h-11 items-center gap-2 self-start text-base",
        formPressClassName,
        className
      )}
    >
      <IconX aria-hidden="true" className="size-5 shrink-0" />
      {children}
    </button>
  );
}

/**
 * A field under its title: the label the field prints under, as it prints.
 * `labelField` is that label's path, for renaming it where it stands, and
 * `unit` what the title adds after it (a price's currency). A field with a
 * note (`FIELD_NOTES`) says what it is, under a heading of its own, then
 * the label it prints as, and takes a grid's whole row.
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
  const labels = useContext(AreaLabelsContext);
  const label = labelField ? labels.get(labelField) : undefined;
  const about = label ? FIELD_NOTES[label.field] : undefined;

  // `children` keeps one place in the tree whether or not it's explained, so
  // a bank field whose label starts printing as it's typed in isn't remounted
  // (and doesn't lose focus) as the heading appears.
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        about ? "col-span-full gap-1" : "gap-2",
        className
      )}
    >
      {label && about ? (
        <>
          <span className="text-base/6 font-semibold">{label.name}</span>
          {about.note && <p className={formHintClassName}>{about.note}</p>}
          <LabelInput
            label={label}
            prefix="Prints as"
            unit={unit}
            className={formLabelClassName}
          />
        </>
      ) : (
        <FormFieldTitle
          htmlFor={id}
          field={labelField}
          unit={unit}
          className={formLabelClassName}
        >
          {title}
        </FormFieldTitle>
      )}
      <div className="flex flex-col">
        {about && (
          <label htmlFor={id} className="sr-only">
            {unit ? `${title} (${unit})` : title}
          </label>
        )}
        {children}
      </div>
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
      className={cn(
        "bg-card resize-none py-2.5 text-base md:text-base",
        className
      )}
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
 * where it prints, from `useAddableParts`, and slides the form to it.
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
        <FormAddButton key={part.id} onClick={() => addAndReveal(part.onAdd)}>
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
        className={cn(
          "whitespace-nowrap",
          isTotal && "text-brand-700 dark:text-brand-300 text-lg font-semibold"
        )}
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
