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

// Whether the form's Edit labels switch is on, turning every field's title
// into the label it prints under, to rename.
const EditLabelsContext = createContext(false);

export const EditLabelsProvider = EditLabelsContext.Provider;

export function useIsEditingLabels() {
  return useContext(EditLabelsContext);
}

export const formFieldClassName = "h-11 text-base md:text-base";

/**
 * One part of the page, under its heading, in the order it prints. A heading
 * that prints (From, Notes) is renamed here while Edit labels is on. A part
 * that can be hidden has a Remove button beside it.
 */
export function FormArea({
  area,
  title,
  label,
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
  onRemove?: () => void;
  removeLabel?: string;
  children?: ReactNode;
}) {
  const headingId = useId();
  const isEditingLabels = useIsEditingLabels();

  return (
    <section
      data-field-area={area}
      aria-labelledby={headingId}
      className="bg-background border-border flex scroll-mt-4 flex-col gap-4 rounded-xl border p-4"
    >
      <div className="flex min-h-11 items-center gap-2">
        {label && isEditingLabels ? (
          <Input
            id={headingId}
            aria-label={`${title} label`}
            data-field={label.field}
            value={label.value}
            placeholder={title}
            onChange={event => label.onChange(event.target.value)}
            className={cn(formFieldClassName, "flex-1 font-semibold")}
          />
        ) : (
          <h2 id={headingId} className="min-w-0 flex-1 truncate font-semibold">
            {label?.value.trim() || title}
          </h2>
        )}
        {onRemove && (
          <Button
            variant="ghost"
            aria-label={removeLabel ?? `Remove ${title.toLowerCase()}`}
            onClick={onRemove}
            className="text-muted-foreground size-11 shrink-0"
          >
            <IconX aria-hidden="true" />
          </Button>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * A field under its title. The title is the label the field prints under; with
 * Edit labels on and `rename` given, it becomes an input that renames that
 * label. A cleared label shows (and prints) its default.
 */
export function FormField({
  id,
  title,
  rename,
  hint,
  className,
  children
}: {
  id: string;
  title: string;
  rename?: {
    value: string;
    field: string;
    placeholder: string;
    onChange: (value: string) => void;
  };
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const isEditingLabels = useIsEditingLabels();

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {rename && isEditingLabels ? (
        <Input
          aria-label={`${rename.placeholder} label`}
          data-field={rename.field}
          value={rename.value}
          placeholder={rename.placeholder}
          onChange={event => rename.onChange(event.target.value)}
          className={cn(formFieldClassName, "font-medium")}
        />
      ) : (
        <label
          htmlFor={id}
          className="text-muted-foreground truncate text-sm font-medium"
        >
          {title}
        </label>
      )}
      {children}
      {hint && <div className="text-muted-foreground text-sm">{hint}</div>}
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
export function FormTextArea({
  className,
  onChange,
  value,
  ...props
}: Omit<ComponentProps<"textarea">, "onChange" | "ref"> & {
  onChange?: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

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
      rows={props.rows ?? 2}
      onChange={event => onChange?.(event.target.value)}
      className={cn("min-h-11 resize-none text-base md:text-base", className)}
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
    <div className="flex items-center gap-3">
      <label
        htmlFor={id}
        className="flex min-h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center"
      >
        <span className="text-sm font-medium">{label}</span>
        {description && (
          <span id={descriptionId} className="text-muted-foreground text-sm">
            {description}
          </span>
        )}
      </label>
      <Switch
        id={id}
        data-field={field}
        aria-describedby={description ? descriptionId : undefined}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative after:absolute after:-inset-x-2 after:-inset-y-3.5"
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
      className="h-11 border-dashed text-base font-normal"
    >
      <IconPlus aria-hidden="true" />
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
        "flex flex-col items-end text-right tabular-nums",
        className
      )}
    >
      <span className={cn("whitespace-nowrap", isTotal && "font-semibold")}>
        {amount}
      </span>
      {converted && (
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {converted}
        </span>
      )}
    </span>
  );
}
