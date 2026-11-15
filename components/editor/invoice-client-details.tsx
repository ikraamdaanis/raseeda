import {
  ContactSuggestion,
  SuggestionList,
  useFieldSuggestions
} from "~/components/editor/field-suggestions";
import { InvoiceInput } from "~/components/editor/invoice-input";
import { InvoiceTextArea } from "~/components/editor/invoice-textarea";
import { useInvoiceDocument } from "~/context/invoice-document-context";
import { recordHistoryAction } from "~/stores/invoice-history";
import { useClientSlice, useTheme } from "~/stores/invoice-selectors";
import { getContactSuggestions } from "~/utils/contact-suggestions";
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
// past invoices are offered below it (issue #130), as `useFieldSuggestions`
// describes.
function ClientContent() {
  const { client, setClient } = useClientSlice();
  const theme = useTheme();
  const { libraryDocumentId } = useInvoiceDocument();
  const {
    suggestions,
    isShown,
    activeIndex,
    listId,
    pick,
    onType,
    fieldProps
  } = useFieldSuggestions({
    getSuggestions: documents =>
      getContactSuggestions({
        documents,
        contact: "client",
        typed: client.content,
        excludeId: libraryDocumentId
      }),
    onPick: suggestion =>
      recordHistoryAction(client.label.trim() || "Client", "client", () =>
        setClient(prev => ({ ...prev, content: suggestion.content }))
      )
  });

  return (
    <div className="relative w-full max-w-[500px]">
      <InvoiceTextArea
        id="invoice-field-client"
        aria-label={`${client.label || "Client"} details`}
        {...fieldProps}
        data-field="client.content"
        value={client.content}
        onChange={value => {
          setClient(prev => ({ ...prev, content: value }));
          onType();
        }}
        className="field-sizing-content min-h-[5lh] w-full"
        style={getTextStyles({
          settings: getRoleSettings(theme, "sectionContent")
        })}
        placeholder={client.placeholder}
      />
      {isShown && (
        <SuggestionList
          listId={listId}
          label="Clients from past invoices"
          suggestions={suggestions}
          activeIndex={activeIndex}
          pick={pick}
          getKey={suggestion => suggestion.name}
          renderSuggestion={suggestion => (
            <ContactSuggestion
              name={suggestion.name}
              content={suggestion.content}
            />
          )}
        />
      )}
    </div>
  );
}
