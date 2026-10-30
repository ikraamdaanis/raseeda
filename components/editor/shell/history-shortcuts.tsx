import { useEffect } from "react";
import {
  noteComposition,
  noteFocusChange,
  notePaste,
  noteSelectionBeforeInput,
  redoInvoiceChange,
  undoInvoiceChange
} from "~/stores/invoice-history";
import { hasOpenModal } from "~/utils/open-overlay";
import { isApplePlatform } from "~/utils/shortcut-label";

// Whether undo here belongs to the browser: a text field that isn't part of
// the invoice (a search box, a dialog's name field) keeps its own undo.
function isOwnEditable(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-field]")) return false;

  return (
    target.closest(
      "input:not([readonly]), textarea:not([readonly]), select, [contenteditable='true']"
    ) !== null
  );
}

// The letter a shortcut was pressed on. Layouts that type another letter there
// (Cyrillic, Greek) report the physical key instead, as the browser's own
// shortcuts do.
function shortcutKey(event: KeyboardEvent) {
  if (/^[a-z]$/i.test(event.key)) return event.key.toLowerCase();
  if (event.code === "KeyZ") return "z";
  if (event.code === "KeyY") return "y";

  return "";
}

// "undo", "redo" or null for a key press: ⌘Z and ⇧⌘Z on Apple devices; Ctrl+Z,
// Ctrl+Y and Ctrl+Shift+Z elsewhere.
export function historyCommand(
  event: KeyboardEvent,
  apple: boolean = isApplePlatform()
): "undo" | "redo" | null {
  if (event.altKey) return null;

  const key = shortcutKey(event);

  if (apple) {
    if (!event.metaKey || event.ctrlKey || key !== "z") return null;

    return event.shiftKey ? "redo" : "undo";
  }

  if (!event.ctrlKey || event.metaKey) return null;
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (key === "y" && !event.shiftKey) return "redo";

  return null;
}

function run(command: "undo" | "redo") {
  if (command === "undo") {
    undoInvoiceChange();
  } else {
    redoInvoiceChange();
  }
}

// The app owns undo and redo for the whole invoice, inside its fields too:
// React-controlled inputs break the browser's own undo, so each field's
// native stack is never used. Keys are caught in the capture phase, before a
// field sees them, and `beforeinput` catches undo from the Edit menu, the
// context menu and iOS's shake or three-finger swipe, which send no key. A
// key pressed while an IME is composing belongs to the composition, and a
// modal dialog keeps native undo in its own fields.
export function HistoryShortcuts() {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.isComposing || event.keyCode === 229) return;

      const command = historyCommand(event);

      if (!command) return;
      if (hasOpenModal() || isOwnEditable(event.target)) return;

      event.preventDefault();
      event.stopPropagation();
      run(command);
    }

    function onBeforeInput(event: InputEvent) {
      const isHistory =
        event.inputType === "historyUndo" || event.inputType === "historyRedo";

      if (!isHistory) {
        noteSelectionBeforeInput(event.target);

        return;
      }

      // Safari sends these to the document rather than the field.
      const target =
        event.target instanceof Element && event.target !== document.body
          ? event.target
          : document.activeElement;

      if (hasOpenModal() || isOwnEditable(target)) return;

      event.preventDefault();

      // Focus is in a field with its own undo (a search box). WebKit keeps one
      // undo stack for the whole page, so its undo can run on past that field
      // into the invoice's; that stray undo is dropped.
      if (isOwnEditable(document.activeElement)) return;

      run(event.inputType === "historyUndo" ? "undo" : "redo");
    }

    function onCompositionStart() {
      noteComposition(true);
    }

    function onCompositionEnd() {
      noteComposition(false);
    }

    window.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("beforeinput", onBeforeInput, { capture: true });
    document.addEventListener("focusin", noteFocusChange, { capture: true });
    document.addEventListener("focusout", noteFocusChange, { capture: true });
    document.addEventListener("paste", notePaste, { capture: true });
    document.addEventListener("compositionstart", onCompositionStart, {
      capture: true
    });
    document.addEventListener("compositionend", onCompositionEnd, {
      capture: true
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      document.removeEventListener("beforeinput", onBeforeInput, {
        capture: true
      });
      document.removeEventListener("focusin", noteFocusChange, {
        capture: true
      });
      document.removeEventListener("focusout", noteFocusChange, {
        capture: true
      });
      document.removeEventListener("paste", notePaste, { capture: true });
      document.removeEventListener("compositionstart", onCompositionStart, {
        capture: true
      });
      document.removeEventListener("compositionend", onCompositionEnd, {
        capture: true
      });
    };
  }, []);

  return null;
}
