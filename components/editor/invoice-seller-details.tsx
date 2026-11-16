import {
  ContactSuggestion,
  SuggestionList,
  useFieldSuggestions
} from "~/components/editor/field-suggestions";
import { InvoiceInput } from "~/components/editor/invoice-input";
import { InvoiceTextArea } from "~/components/editor/invoice-textarea";
import { useInvoiceDocument } from "~/context/invoice-document-context";
import { recordHistoryAction } from "~/stores/invoice-history";
import { useSellerSlice, useTheme } from "~/stores/invoice-selectors";
import { useInvoiceStore } from "~/stores/invoice-store";
import { getContactSuggestions } from "~/utils/contact-suggestions";
import { getRoleSettings } from "~/utils/get-role-settings";
import { getTextStyles } from "~/utils/get-text-styles";
import { hasPaymentDetails } from "~/utils/payment-details";

export function InvoiceSellerDetails() {
  return (
    <section data-field-area="seller" className="flex flex-col">
      <SellerLabel />
      <SellerContent />
    </section>
  );
}

function SellerLabel() {
  const { seller, setSeller } = useSellerSlice();
  const theme = useTheme();

  return (
    <InvoiceInput
      aria-label="Seller section label"
      data-field="seller.label"
      value={seller.label}
      className="leading-paper-row font-medium"
      onChange={value => setSeller(prev => ({ ...prev, label: value }))}
      placeholder="From"
      style={getTextStyles({
        settings: getRoleSettings(theme, "sectionLabel")
      })}
    />
  );
}

// While the block is focused and has at most its first line, the user's own
// details from past invoices are offered below it (issue #207), as
// `useFieldSuggestions` describes. A pick also brings that invoice's payment
// details, their labels and whether they're shown, unless some are typed in
// already, so none are ever overwritten. The phone's form offers the same.
export function useSellerSuggestions() {
  const { seller, setSeller } = useSellerSlice();
  const { libraryDocumentId } = useInvoiceDocument();

  return useFieldSuggestions({
    getSuggestions: documents =>
      getContactSuggestions({
        documents,
        contact: "seller",
        typed: seller.content,
        excludeId: libraryDocumentId
      }),
    onPick: ({ content, invoiceDocument }) =>
      recordHistoryAction(seller.label.trim() || "Seller", "seller", () => {
        const { paymentDetails, setPaymentDetails, setSection } =
          useInvoiceStore.getState();

        setSeller(prev => ({ ...prev, content }));

        if (hasPaymentDetails(paymentDetails)) return;

        setPaymentDetails(invoiceDocument.invoiceData.paymentDetails);
        setSection(
          "paymentDetails",
          invoiceDocument.invoiceData.sections.paymentDetails
        );
      })
  });
}

function SellerContent() {
  const { seller, setSeller } = useSellerSlice();
  const theme = useTheme();
  const {
    suggestions,
    isShown,
    activeIndex,
    listId,
    pick,
    onType,
    fieldProps
  } = useSellerSuggestions();

  return (
    <div className="relative w-full max-w-[500px]">
      <InvoiceTextArea
        id="invoice-field-seller"
        aria-label={`${seller.label || "Seller"} details`}
        {...fieldProps}
        data-field="seller.content"
        value={seller.content}
        onChange={value => {
          setSeller(prev => ({ ...prev, content: value }));
          onType();
        }}
        className="field-sizing-content min-h-[5lh] w-full"
        style={getTextStyles({
          settings: getRoleSettings(theme, "sectionContent")
        })}
        placeholder={seller.placeholder}
      />
      {isShown && (
        <SuggestionList
          listId={listId}
          label="Your details from past invoices"
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
