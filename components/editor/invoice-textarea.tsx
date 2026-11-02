import { isEqual } from "lodash-es";
import type { ComponentProps } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useIsPreview } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import { useTheme } from "~/stores/invoice-selectors";

export function InvoiceTextArea({
  className,
  onChange,
  ...props
}: Omit<ComponentProps<"textarea">, "onChange" | "ref"> & {
  onChange?: (value: string) => void;
}) {
  // Preview reads like the PDF: no placeholders, no editing highlight.
  const isPreview = useIsPreview();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // The padding it was last fitted with, which focus and blur ease away from.
  const paddingRef = useRef<Padding | null>(null);
  const easeRef = useRef<Animation | null>(null);
  // Read so a new font or text size re-renders the field and refits it.
  useTheme();

  function refit() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    // Mid-ease the padding reads as an in-between value; it refits on landing.
    if (easeRef.current?.playState === "running") return;

    paddingRef.current = fitToContent(textarea);
  }

  // Focus and blur change the padding, and the height with it. Both ease from
  // where they were, as the inputs' padding does. The padding can't be a CSS
  // transition here: the fit reads it, and mid-transition it's still the old
  // value.
  function refitSmoothly(textarea: HTMLTextAreaElement) {
    const isEasing = easeRef.current?.playState === "running";
    const styles = getComputedStyle(textarea);
    const from = {
      height: isEasing ? styles.height : `${textarea.offsetHeight}px`,
      ...(isEasing || !paddingRef.current
        ? readPadding(styles)
        : paddingRef.current)
    };

    easeRef.current?.cancel();
    const padding = fitToContent(textarea);
    paddingRef.current = padding;
    const to = { height: textarea.style.height, ...padding };

    if (isEqual(from, to)) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ease = textarea.animate([from, to], {
      duration: 150,
      easing: "cubic-bezier(0.4, 0, 0.2, 1)"
    });

    easeRef.current = ease;
    ease.finished.then(refit, () => {});
  }

  useLayoutEffect(() => {
    refit();
  });

  // A web font arriving after the first paint changes the line height.
  useEffect(() => {
    document.fonts.addEventListener("loadingdone", refit);

    return () => document.fonts.removeEventListener("loadingdone", refit);
  }, []);

  return (
    <textarea
      {...props}
      ref={textareaRef}
      onFocus={event => {
        refitSmoothly(event.currentTarget);
        props.onFocus?.(event);
      }}
      onBlur={event => {
        refitSmoothly(event.currentTarget);
        props.onBlur?.(event);
      }}
      readOnly={isPreview || props.readOnly}
      placeholder={isPreview ? undefined : props.placeholder}
      value={props.value}
      onChange={({ target: { value } }) => {
        onChange?.(value);
      }}
      className={cn(
        "rounded-surface text-paper-foreground placeholder:text-paper-muted-foreground hover:bg-brand-50 focus:border-brand-500 focus:bg-brand-50 relative w-full cursor-text resize-none overflow-hidden border border-transparent bg-transparent transition-[background-color,border-color] outline-none focus:z-20 focus:p-2 focus:outline-none",
        className,
        isPreview &&
          "pointer-events-none min-h-0 hover:bg-transparent focus:border-transparent focus:bg-transparent focus:p-0"
      )}
      rows={1}
    />
  );
}

// Grows the field to show every line, padding and border included. The fields
// also ask for `field-sizing: content`, but Safari leaves out the border and
// the padding added on focus, which clips the last line. The lines are
// measured with the padding taken off, since Safari's scrollHeight also skips
// the bottom padding. Returns the padding it fitted with.
function fitToContent(textarea: HTMLTextAreaElement): Padding {
  const styles = getComputedStyle(textarea);
  const padding = readPadding(styles);
  const frameY =
    parseFloat(styles.borderTopWidth) +
    parseFloat(styles.borderBottomWidth) +
    parseFloat(styles.paddingTop) +
    parseFloat(styles.paddingBottom);

  textarea.style.height = "auto";
  textarea.style.paddingBlock = "0px";
  const linesHeight = textarea.scrollHeight;

  textarea.style.paddingBlock = "";
  textarea.style.height = `${linesHeight + frameY}px`;

  return padding;
}

type Padding = ReturnType<typeof readPadding>;

function readPadding(styles: CSSStyleDeclaration) {
  return {
    paddingTop: styles.paddingTop,
    paddingRight: styles.paddingRight,
    paddingBottom: styles.paddingBottom,
    paddingLeft: styles.paddingLeft
  };
}
