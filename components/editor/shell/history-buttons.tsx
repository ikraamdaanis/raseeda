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

const HISTORY_ITEM_CLASS_NAME =
  "min-w-0 flex-1 flex-col items-center justify-center gap-0 py-1.5 max-md:min-h-14";

// Undo and redo for phones, which have no keyboard to press ⌘Z on: a row of
// two buttons at the top of the document menu, like the Cut, Copy and Paste
// row in an iOS menu. The menu stays open as they're tapped, so a change can
// be stepped back through several times, and focus stays in it: the part
// that changed flashes rather than taking focus and raising the keyboard.
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
        <HistoryItemName name={canUndo ? undoName : null} />
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
        <HistoryItemName name={canRedo ? redoName : null} />
      </DropdownMenuItem>
    </div>
  );
}

// What the step changes, under its button, so it's clear before tapping.
function HistoryItemName({ name }: { name: string | null }) {
  if (!name) return null;

  return (
    <span className="text-muted-foreground w-full truncate text-center text-xs">
      {name}
    </span>
  );
}
