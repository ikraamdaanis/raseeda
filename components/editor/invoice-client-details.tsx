import type { FocusEvent, KeyboardEvent } from "react";
import { useId, useState } from "react";
import { InvoiceInput } from "~/components/editor/invoice-input";
import { InvoiceTextArea } from "~/components/editor/invoice-textarea";
import { useInvoiceDocument } from "~/context/invoice-document-context";
import { getAllInvoices } from "~/db";
import { useIsPreview } from "~/hooks/use-shown-sections";
import { cn } from "~/lib/utils";
import { recordHistoryAction } from "~/stores/invoice-history";
import { useClientSlice, useTheme } from "~/stores/invoice-selectors";
import type { InvoiceDocument } from "~/types";
import { getClientSuggestions } from "~/utils/client-suggestions";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";

export function InvoiceClientDetails() {
  return (
    <section data-field-area="client" className="flex flex-col">
      <ClientLabel />
      <ClientContent />
    </section>
  );
}

function ClientLabel() {
  const { client, setClient } = useClientSlice();
  const theme = useTheme();

  return (
    <InvoiceInput
      aria-label="Client section label"
      data-field="client.label"
      value={client.label}
      className="leading-paper-row font-medium"
      onChange={value => setClient(prev => ({ ...prev, label: value }))}
      placeholder="To"
      style={getTextStyles({
        settings: getRoleSettings(theme, "sectionLabel")
      })}
    />
  );
}

// While the block is focused and has at most its first line, clients from
// past invoices are offered below it (issue #130). Arrow keys move through
// them and Enter picks one; without one highlighted, Enter starts a new line
// as usual. One is picked on mouse down, which keeps the focus in the field,
// so the list doesn't close under the click. The library is read each time the field takes focus.
function ClientContent() {
  const { client, setClient } = useClientSlice();
  const theme = useTheme();
  const isPreview = useIsPreview();
  const { libraryDocumentId } = useInvoiceDocument();
  const listId = useId();
  const [documents, setDocuments] = useState<InvoiceDocument[] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const suggestions =
    isOpen && documents
      ? getClientSuggestions({
          documents,
          typed: client.content,
          excludeId: libraryDocumentId
        })
      : [];
  const isShown = !isPreview && suggestions.length > 0;
  const activeIndex = highlighted < suggestions.length ? highlighted : -1;

  function handleFocus(event: FocusEvent<HTMLTextAreaElement>) {
    if (event.currentTarget.readOnly) return;

    setIsOpen(true);
    setHighlighted(-1);
    getAllInvoices().then(setDocuments, () => setDocuments([]));
  }

  function pick(suggestion: { name: string; content: string }) {
    recordHistoryAction(client.label.trim() || "Client", "client", () =>
      setClient(prev => ({ ...prev, content: suggestion.content }))
    );
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!isShown) return;

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

  return (
    <div className="relative w-full max-w-[500px]">
      <InvoiceTextArea
        id="invoice-field-client"
        role="combobox"
        aria-label={`${client.label || "Client"} details`}
        aria-autocomplete="list"
        aria-expanded={isShown}
        aria-controls={isShown ? listId : undefined}
        aria-activedescendant={
          isShown && activeIndex !== -1 ? `${listId}-${activeIndex}` : undefined
        }
        data-field="client.content"
        value={client.content}
        onChange={value => {
          setClient(prev => ({ ...prev, content: value }));
          setIsOpen(true);
          setHighlighted(-1);
        }}
        onFocus={handleFocus}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        className="field-sizing-content min-h-[5lh] w-full"
        style={getTextStyles({
          settings: getRoleSettings(theme, "sectionContent")
        })}
        placeholder={client.placeholder}
      />
      {isShown && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Clients from past invoices"
          className="bg-popover text-popover-foreground ring-foreground/10 rounded-surface shadow-menu absolute top-full left-0 z-30 mt-1 flex w-72 max-w-full flex-col p-1 text-sm ring-1"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.name}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={event => {
                event.preventDefault();
                pick(suggestion);
              }}
              onMouseEnter={() => setHighlighted(index)}
              className={cn(
                "rounded-control flex cursor-pointer flex-col px-2 py-1.5 pointer-coarse:py-2.5",
                index === activeIndex && "bg-accent text-accent-foreground"
              )}
            >
              <span className="truncate font-medium">{suggestion.name}</span>
              {suggestion.content.includes("\n") && (
                <span className="text-muted-foreground truncate text-xs">
                  {suggestion.content
                    .split("\n")
                    .slice(1)
                    .map(line => line.trim())
                    .filter(Boolean)
                    .join(", ")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
