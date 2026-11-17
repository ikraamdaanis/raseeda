import type { RefObject } from "react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { FormDetails } from "~/components/editor/form/form-details";
import { FormDocument } from "~/components/editor/form/form-document";
import { FormFooter } from "~/components/editor/form/form-footer";
import { FormLineItems } from "~/components/editor/form/form-line-items";
import {
  FormClient,
  FormLogo,
  FormSeller,
  FormShipping,
  FormTitle
} from "~/components/editor/form/form-parties";
import { FormPaymentDetails } from "~/components/editor/form/form-payment";
import { FormTotals } from "~/components/editor/form/form-totals";
import { useInvoiceDocument } from "~/context/invoice-document-context";

// A field that brings up the on-screen keyboard.
const TYPING_FIELD_SELECTOR =
  "input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea";

/**
 * The phone's editor (issue #213): the invoice as one long form in the order
 * it prints, over the same store, actions and `data-field` paths as the page,
 * so undo, autosave and suggestions work as they do there. `scrollTopRef`
 * keeps where it was scrolled to while the Page tab shows instead.
 */
export function PhoneForm({
  scrollTopRef
}: {
  scrollTopRef: RefObject<number>;
}) {
  const { status, currentDocumentId } = useInvoiceDocument();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const documentIdRef = useRef(currentDocumentId);
  const canEdit = status === "editing" || status === "unavailable";

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;

    if (!scroller) return;

    scroller.scrollTop = scrollTopRef.current;

    return () => {
      scrollTopRef.current = scroller.scrollTop;
    };
  }, [scrollTopRef]);

  // Another invoice opens at its top, not where the last one was scrolled to.
  useLayoutEffect(() => {
    if (documentIdRef.current === currentDocumentId) return;

    documentIdRef.current = currentDocumentId;
    scrollerRef.current?.scrollTo({ top: 0 });
  }, [currentDocumentId]);

  useRevealAboveKeyboard(scrollerRef);

  return (
    <div
      ref={scrollerRef}
      data-phone-form
      inert={!canEdit}
      className="bg-background min-h-0 flex-1 overflow-y-auto overscroll-contain"
    >
      <form
        aria-label="Invoice"
        onSubmit={event => event.preventDefault()}
        className="bg-border mx-auto flex max-w-xl flex-col gap-px border-b"
      >
        <FormDocument />
        <FormTitle />
        <FormLogo />
        <FormSeller />
        <FormClient />
        <FormShipping />
        <FormDetails />
        <FormLineItems />
        <FormTotals />
        <FormPaymentDetails />
        <FormFooter />
      </form>
    </div>
  );
}

// Keeps a field being typed in clear of the on-screen keyboard. Chrome and
// Firefox shrink the page for it (`interactive-widget=resizes-content`), but
// Safari only shrinks the visual viewport, so the field is scrolled into the
// part of the form still in sight once the keyboard has settled.
function useRevealAboveKeyboard(scrollerRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const scroller = scrollerRef.current;
    const viewport = window.visualViewport;

    if (!scroller) return;

    let timer: number | undefined;

    function reveal() {
      const field = document.activeElement;

      if (
        !scroller ||
        !(field instanceof HTMLElement) ||
        !scroller.contains(field) ||
        !field.matches(TYPING_FIELD_SELECTOR)
      ) {
        return;
      }

      const visibleTop = Math.max(
        scroller.getBoundingClientRect().top,
        viewport?.offsetTop ?? 0
      );
      const visibleBottom = viewport
        ? viewport.offsetTop + viewport.height
        : window.innerHeight;
      const rect = field.getBoundingClientRect();
      const margin = 12;

      if (
        rect.top >= visibleTop + margin &&
        rect.bottom <= visibleBottom - margin
      ) {
        return;
      }

      scroller.scrollBy({
        top: rect.top - (visibleTop + (visibleBottom - visibleTop) * 0.25),
        behavior: "smooth"
      });
    }

    function handleFocusIn(event: FocusEvent) {
      if (!(event.target instanceof HTMLElement)) return;
      if (!event.target.matches(TYPING_FIELD_SELECTOR)) return;

      window.clearTimeout(timer);
      // The keyboard slides in over about a third of a second.
      timer = window.setTimeout(reveal, 350);
    }

    scroller.addEventListener("focusin", handleFocusIn);
    viewport?.addEventListener("resize", reveal);

    return () => {
      window.clearTimeout(timer);
      scroller.removeEventListener("focusin", handleFocusIn);
      viewport?.removeEventListener("resize", reveal);
    };
  }, [scrollerRef]);
}

/**
 * Opens the form at a part the Page tab was tapped on: the field with the same
 * `data-field` path, else the part's first field, else just the part, scrolled
 * into view. Run straight after the form renders, inside the tap, so a phone
 * still brings up its keyboard for the focused field.
 */
export function focusFormTarget(target: { field?: string; area?: string }) {
  const form = document.querySelector<HTMLElement>("[data-phone-form]");

  if (!form) return;

  const field = target.field ? findFormField(form, target.field) : null;
  const area = target.area
    ? form.querySelector<HTMLElement>(
        `[data-field-area="${CSS.escape(target.area)}"]`
      )
    : null;
  const focusable =
    field ??
    area?.querySelector<HTMLElement>(
      `${TYPING_FIELD_SELECTOR}, select, button[aria-haspopup]`
    ) ??
    null;

  if (focusable) {
    focusable.focus({ preventScroll: true });
    scrollFormTo(form, focusable, "center");

    return;
  }

  if (area) scrollFormTo(form, area, "start");
}

// The form's control at a path. A printed label's is shown only while it's
// renamed, so for one of those its pencil is pressed first.
function findFormField(form: HTMLElement, path: string) {
  const selector = `[data-field="${CSS.escape(path)}"]`;
  const renameButton = form.querySelector<HTMLElement>(
    `[data-rename-field="${CSS.escape(path)}"]`
  );

  if (renameButton) flushSync(() => renameButton.click());

  return form.querySelector<HTMLElement>(selector);
}

// Scrolls the form alone. `scrollIntoView` would also scroll the editor's
// shell, which clips the sheets waiting below the screen, and lift them into
// view.
function scrollFormTo(
  form: HTMLElement,
  element: HTMLElement,
  block: "start" | "center"
) {
  const rect = element.getBoundingClientRect();
  const offset =
    block === "center" ? Math.max((form.clientHeight - rect.height) / 2, 0) : 0;

  form.scrollTop += rect.top - form.getBoundingClientRect().top - offset;
}
