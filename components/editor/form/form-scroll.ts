import { flushSync } from "react-dom";

// The phone form's scroller.
function getForm() {
  return document.querySelector<HTMLElement>("[data-phone-form]");
}

// Scrolls the form alone. `scrollIntoView` would also scroll the editor's
// shell, which clips the sheets waiting below the screen, and lift them into
// view.
export function scrollFormTo(
  form: HTMLElement,
  element: HTMLElement,
  block: "start" | "center",
  behavior: ScrollBehavior = "instant"
) {
  const rect = element.getBoundingClientRect();
  const offset =
    block === "center" ? Math.max((form.clientHeight - rect.height) / 2, 0) : 0;

  form.scrollTo({
    top: form.scrollTop + rect.top - form.getBoundingClientRect().top - offset,
    behavior
  });
}

/**
 * Adds a part from its + button and slides the form to it, unless it's
 * already in full view: a detail row appears above the buttons that add it,
 * where it's easy to miss. What appeared is the first element that wasn't
 * there before (the part's own wrapper, since a parent comes before its
 * children). Reduced motion jumps instead.
 */
export function addAndReveal(add: () => void) {
  const form = getForm();
  const before = new Set(form?.querySelectorAll("*") ?? []);

  flushSync(add);

  if (!form) return;

  const added = Array.from(form.querySelectorAll<HTMLElement>("*")).find(
    element => !before.has(element)
  );

  if (!added) return;

  // A frame later, once the browser's scroll anchoring has moved the form to
  // keep what was on screen in place, or it would cut the slide short.
  requestAnimationFrame(() => {
    const rect = added.getBoundingClientRect();
    const view = form.getBoundingClientRect();

    if (rect.top >= view.top && rect.bottom <= view.bottom) return;

    const reducesMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    scrollFormTo(
      form,
      added,
      rect.height > view.height / 2 ? "start" : "center",
      reducesMotion ? "instant" : "smooth"
    );
  });
}
