import { useEffect, useEffectEvent } from "react";
import { stepZoom, useCanvasView } from "~/context/canvas-view-context";
import { useEditorUi } from "~/context/editor-ui-context";
import { useInvoicePdf } from "~/hooks/use-invoice-pdf";
import { hasOpenModal, hasOpenOverlay } from "~/utils/open-overlay";
import { hasPrimaryModifier } from "~/utils/shortcut-label";

// True when a key press belongs to a field (typing a "p" into an address must
// not toggle Preview). Read-only fields, like the page in Preview, don't count.
function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest(
      "input:not([readonly]), textarea:not([readonly]), select, [contenteditable='true']"
    ) !== null
  );
}

// The editor's single-key, view and print shortcuts. File shortcuts (⌘S, ⌘O,
// ⇧⌘S) live with the file actions.
export function EditorShortcuts() {
  const {
    mode,
    setMode,
    toggleMode,
    toggleAllPanels,
    isNarrow,
    leftPanelOpen,
    rightPanelOpen,
    closePanels,
    paletteOpen,
    setPaletteOpen
  } = useEditorUi();
  const { setView, zoom } = useCanvasView();
  const { pending, printPdf } = useInvoicePdf();

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const mod = hasPrimaryModifier(event);

    // The palette toggles itself closed, but doesn't open over a dialog or
    // menu, where its actions would stack on whatever that is in the middle of.
    if (mod && event.key.toLowerCase() === "k" && !event.shiftKey) {
      event.preventDefault();

      if (paletteOpen || !hasOpenOverlay()) setPaletteOpen(!paletteOpen);

      return;
    }

    // ⌘P prints the invoice's PDF, never the editor page, so the browser's
    // own print is held back even under a modal dialog, where it does nothing.
    const isPrintKey = event.key.toLowerCase() === "p" || event.code === "KeyP";

    if (mod && isPrintKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();

      if (!hasOpenModal() && !event.repeat && !pending) printPdf();

      return;
    }

    if (mod && event.key === "\\") {
      event.preventDefault();

      if (!hasOpenOverlay()) toggleAllPanels();

      return;
    }

    // ⌘+, ⌘- and ⌘0 zoom the page rather than the whole editor, as the
    // browser would.
    if (mod && !event.altKey && ["=", "+", "-", "0"].includes(event.key)) {
      event.preventDefault();

      if (event.key === "0") {
        setView(1);

        return;
      }

      const step = stepZoom(zoom, event.key === "-" ? "out" : "in");

      if (step !== undefined) setView(step);

      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (hasOpenOverlay()) return;

    // A phone's panel is a sheet over the page, so Escape closes it.
    if (
      event.key === "Escape" &&
      isNarrow &&
      (leftPanelOpen || rightPanelOpen)
    ) {
      closePanels();

      return;
    }

    if (isTypingTarget(event.target)) return;

    if (event.key === "Escape" && mode === "preview") {
      setMode("edit");
    } else if (event.key.toLowerCase() === "p" && !event.shiftKey) {
      event.preventDefault();
      toggleMode();
    } else if (event.shiftKey && event.code === "Digit1") {
      event.preventDefault();
      setView("fit");
    } else if (event.shiftKey && event.code === "Digit0") {
      event.preventDefault();
      setView(1);
    }
  });

  useEffect(() => {
    function listener(event: KeyboardEvent) {
      handleKeyDown(event);
    }

    window.addEventListener("keydown", listener);

    return () => window.removeEventListener("keydown", listener);
  }, []);

  return null;
}
