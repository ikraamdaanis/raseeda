import { IconArrowBackUp, IconArrowForwardUp } from "@tabler/icons-react";
import { DropdownMenuItem } from "~/components/ui/dropdown-menu";
import {
  redoInvoiceChange,
  undoInvoiceChange,
  useInvoiceHistory
} from "~/stores/invoice-history";

export function undoLabel(label: string | null) {
  return label ? `Undo change to ${label}` : "Undo";
}

export function redoLabel(label: string | null) {
  return label ? `Redo change to ${label}` : "Redo";
}

// Both buttons are an icon over a word at one height, whatever there is to
// undo, so nothing in the menu moves as they're tapped. A button that turns
// disabled under the finger drops its highlight.
const HISTORY_ITEM_CLASS_NAME =
  "h-16 min-w-0 flex-1 flex-col justify-center gap-1 data-disabled:focus:bg-transparent";

// Undo and redo for phones, which have no keyboard to press ⌘Z on: a row of
// two buttons at the top of the document menu, like the Cut, Copy and Paste
// row in an iOS menu. The menu stays open as they're tapped, so a change can
// be stepped back through several times, and focus stays in it: the part
// that changed flashes rather than taking focus and raising the keyboard.
// What each would change is in its accessible name, not on the button.
export function HistoryMenuRow() {
  const {
    canUndo,
    canRedo,
    undoLabel: undoName,
    redoLabel: redoName
  } = useInvoiceHistory();

  return (
    <div className="flex gap-1">
      <DropdownMenuItem
        aria-label={undoLabel(undoName)}
        disabled={!canUndo}
        closeOnClick={false}
        onClick={() => undoInvoiceChange({ movesFocus: false })}
        className={HISTORY_ITEM_CLASS_NAME}
      >
        <IconArrowBackUp aria-hidden="true" />
        Undo
      </DropdownMenuItem>
      <DropdownMenuItem
        aria-label={redoLabel(redoName)}
        disabled={!canRedo}
        closeOnClick={false}
        onClick={() => redoInvoiceChange({ movesFocus: false })}
        className={HISTORY_ITEM_CLASS_NAME}
      >
        <IconArrowForwardUp aria-hidden="true" />
        Redo
      </DropdownMenuItem>
    </div>
  );
}
