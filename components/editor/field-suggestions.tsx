import type { FocusEvent, KeyboardEvent, ReactNode } from "react";
import { useId, useState } from "react";
import { getAllInvoices } from "~/db";
import { useIsPreview } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import type { InvoiceDocument } from "~/types";

// What a field offers from past invoices while it's focused: clients in the
// "To" block (issue #130), the user's own details in the "From" block (issue
// #207), items in a description cell (issue #205). Arrow keys move through
// them and Enter picks one; without one highlighted, Enter does what it
// usually does. Pointing at one only shades it, so Enter never picks one the
// mouse happens to rest on. One is picked on mouse down, which keeps the focus
// in the field, so the list doesn't close under the click. The library is read
// each time the field takes focus. Nothing is offered in Preview.
export function useFieldSuggestions<TSuggestion>({
  getSuggestions,
  onPick
}: {
  getSuggestions: (documents: InvoiceDocument[]) => TSuggestion[];
  onPick: (suggestion: TSuggestion) => void;
}) {
  const isPreview = useIsPreview();
  const listId = useId();
  const [documents, setDocuments] = useState<InvoiceDocument[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const suggestions = isOpen && documents ? getSuggestions(documents) : [];
  const isShown = !isPreview && suggestions.length > 0;
  const activeIndex = highlighted < suggestions.length ? highlighted : -1;

  function pick(suggestion: TSuggestion) {
    onPick(suggestion);
    setIsOpen(false);
  }

  function onFocus(event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.matches("[readonly]")) return;

    // The last read is dropped, so a highlight never lands on a list that
    // changes under it when the new read arrives.
    setDocuments(null);
    setIsOpen(true);
    setHighlighted(-1);
    getAllInvoices().then(
      next => {
        setDocuments(next);
        setHighlighted(-1);
      },
      () => setDocuments([])
    );
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    // Shift+Enter, Alt+arrows and the like keep their usual meaning.
    const hasModifier =
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;

    if (!isShown || hasModifier) return;
    // The Enter that ends an IME composition is the composition's own.
    if (event.nativeEvent.isComposing || event.keyCode === 229) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlighted((activeIndex + 1) % suggestions.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlighted(
          activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1
        );
        break;
      case "Enter": {
        const suggestion =
          activeIndex === -1 ? undefined : suggestions[activeIndex];

        if (!suggestion) return;

        event.preventDefault();
        pick(suggestion);
        break;
      }
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        setIsOpen(false);
        break;
    }
  }

  return {
    suggestions,
    isShown,
    activeIndex,
    listId,
    pick,
    // Typing opens the list again after a pick or Escape.
    onType() {
      setIsOpen(true);
      setHighlighted(-1);
    },
    fieldProps: {
      "aria-autocomplete": "list" as const,
      "aria-controls": isShown ? listId : undefined,
      "aria-activedescendant":
        isShown && activeIndex !== -1 ? `${listId}-${activeIndex}` : undefined,
      onFocus,
      onBlur: () => setIsOpen(false),
      onKeyDown
    }
  };
}

// The list under the field, in the editor's own type rather than the
// invoice's.
export function SuggestionList<TSuggestion>({
  listId,
  label,
  suggestions,
  activeIndex,
  pick,
  getKey,
  renderSuggestion
}: {
  listId: string;
  label: string;
  suggestions: TSuggestion[];
  activeIndex: number;
  pick: (suggestion: TSuggestion) => void;
  getKey: (suggestion: TSuggestion) => string;
  renderSuggestion: (suggestion: TSuggestion) => ReactNode;
}) {
  return (
    <ul
      id={listId}
      role="listbox"
      aria-label={label}
      className="bg-popover text-popover-foreground ring-foreground/10 rounded-surface shadow-menu absolute top-full left-0 z-30 mt-1 flex w-72 max-w-full flex-col p-1 text-left font-sans text-sm font-normal ring-1"
    >
      {suggestions.map((suggestion, index) => (
        <li
          key={getKey(suggestion)}
          id={`${listId}-${index}`}
          role="option"
          aria-selected={index === activeIndex}
          onMouseDown={event => {
            event.preventDefault();
            pick(suggestion);
          }}
          className={cn(
            "rounded-control hover:bg-accent/60 flex cursor-pointer flex-col px-2 py-1.5 pointer-coarse:py-2.5",
            index === activeIndex && "bg-accent text-accent-foreground"
          )}
        >
          {renderSuggestion(suggestion)}
        </li>
      ))}
    </ul>
  );
}

// A contact suggested for the "To" or "From" block: its name, then the rest of
// its lines on one line.
export function ContactSuggestion({
  name,
  content
}: {
  name: string;
  content: string;
}) {
  const rest = content
    .split("\n")
    .slice(1)
    .map(line => line.trim())
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <span className="truncate font-medium">{name}</span>
      {rest && (
        <span className="text-muted-foreground truncate text-xs">{rest}</span>
      )}
    </>
  );
}
